"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  KeyRound,
  Link2,
  Paperclip,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { issueNaverToken, sendDraft } from "@/lib/playground/client";
import {
  CLOTHING_KINDS,
  brandSearchNames,
  pickClothingModels,
  searchBrands,
  type ClothingBrand,
  type ClothingKind,
} from "@/lib/playground/clothing";
import type { ShopItem } from "@/lib/playground/naver-search";
import type { LooxPost } from "@/lib/playground/stmx-loox";
import {
  applyFacets,
  buildCatalogLink,
  facetsOf,
  parseModelPage,
  type CatalogModel,
  type ModelPage,
} from "@/lib/playground/product-link";
import type { NaverTokenResult, RequestDraft } from "@/types/playground";

/**
 * 상품링크 — 플로우를 한 화면에서 돌리는 도구. 의류(상의 · 하의 · 기타)로 제한한다.
 *
 * 네 영역이 곧 플로우의 네 고비다.
 *
 *   1. 액세스 토큰 발급   — 인증
 *   2. Loox 목록          — stmx-web 의 최근 게시물. 상품을 묶을 대상(COM-002-B01 착장 상품 목록)
 *   3. 브랜드 · 카테고리  — 옷 브랜드를 초성으로 찾아 고르고, 아래 줄의 상의 · 하의 · 기타를 누르면
 *                           그 브랜드 × 분류의 카탈로그 모델을 조회한다
 *   4. 토글 버튼 그룹     — 세부 카테고리로 걸러 확정
 *
 * 브랜드는 brands 테이블(scripts/sync-brands.mjs 가 네이버 브랜드 조회로 채움)에서 옷 브랜드만 온다.
 * 모델 조회는 브랜드 id · 카테고리 id 를 받지 않는다(무시된다). 그래서 "브랜드명 + 옷 키워드" 로
 * 키워드마다 한 번씩 부르고, 섞여 든 다른 브랜드 · 카테고리는 brandCode · categoryId 로 거른다.
 */

interface ProductLinkModalProps {
  open: boolean;
  onClose: () => void;
  /** 상단 토큰 바와 같은 토큰을 쓴다. */
  token: NaverTokenResult | null;
  onToken: (token: NaverTokenResult | null) => void;
}

/** size 상한은 100 이다(500·1000 은 400). */
const PAGE_SIZE = 100;
/** 호출 사이 최소 간격. 이보다 촘촘하면 429 가 난다(sync-brands 와 같은 값). */
const MIN_INTERVAL_MS = 550;
const RETRIES_ON_429 = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 부를 때마다 직전 호출에서 MIN_INTERVAL_MS 가 지날 때까지 기다리는 함수를 만든다. */
function createPacer() {
  let lastCallAt = 0;
  return async () => {
    await sleep(Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now()));
    lastCallAt = Date.now();
  };
}

const searchDraft = (term: string): RequestDraft => ({
  method: "GET",
  url: "{{baseUrl}}/v1/product-models",
  params: [
    { id: "name", enabled: true, key: "name", value: term },
    { id: "page", enabled: true, key: "page", value: "1" },
    { id: "size", enabled: true, key: "size", value: String(PAGE_SIZE) },
  ],
  headers: [],
  bodyType: "none",
  body: "",
  auth: { mode: "naver", token: "", username: "", password: "" },
});

/** 모델 한 페이지. 검색 결과가 없으면 404 라 빈 페이지로 돌린다. 429 는 물러났다 다시 부른다. */
async function fetchModelPage(
  term: string,
  accessToken: string | null
): Promise<{ value: ModelPage } | { error: string }> {
  for (let attempt = 0; ; attempt++) {
    const { result, error } = await sendDraft(searchDraft(term), accessToken);
    if (error) return { error };
    if (!result) return { error: "응답이 없습니다." };
    if (result.status === 429 && attempt < RETRIES_ON_429) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (result.status === 404) return { value: { contents: [], totalElements: 0 } };
    if (!result.ok) return { error: `HTTP ${result.status} · ${result.body.slice(0, 300)}` };
    const page = parseModelPage(result.body);
    return page ? { value: page } : { error: "모델 목록 형식이 아닙니다. 응답 원문을 확인하세요." };
  }
}

/** 3단계 — 옷 브랜드 목록. idle 이면 창이 열릴 때 불러온다. */
type BrandsState =
  | { state: "idle" }
  | { state: "error"; error: string }
  | { state: "done"; brands: ClothingBrand[] };

async function fetchBrands(): Promise<Exclude<BrandsState, { state: "idle" }>> {
  try {
    const res = await authFetch("/api/playground/brands");
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.brands)) {
      return { state: "error", error: data?.error ?? `HTTP ${res.status}` };
    }
    return { state: "done", brands: data.brands as ClothingBrand[] };
  } catch (e) {
    return { state: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

/** 펼친 카드 아래에 보여줄 쇼핑 검색 결과. */
type Preview =
  | { state: "loading" }
  | { state: "error"; error: string }
  | { state: "done"; items: ShopItem[] };

/** 모델명에 브랜드가 빠져 있으면 붙인다 — 검색이 엉뚱한 브랜드로 새지 않게. */
const previewQuery = (model: CatalogModel) => {
  const brand = model.brandName?.trim();
  return brand && !model.name.includes(brand) ? `${brand} ${model.name}` : model.name;
};

async function fetchPreview(model: CatalogModel): Promise<Preview> {
  const params = new URLSearchParams({ query: previewQuery(model), id: String(model.id) });
  try {
    const res = await authFetch(`/api/playground/naver/shopping?${params}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.items)) {
      return { state: "error", error: data?.error ?? `HTTP ${res.status}` };
    }
    return { state: "done", items: data.items as ShopItem[] };
  } catch (e) {
    return { state: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

/** 2단계 — stmx-web 의 Loox. */
type LooxState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; error: string }
  | { state: "done"; post: LooxPost | null; visitsError: string | null };

/** postId 가 없으면 가장 최근 공개 게시물. */
async function fetchLoox(postId?: string): Promise<LooxState> {
  const query = postId ? `postId=${encodeURIComponent(postId)}` : "limit=1";
  try {
    const res = await authFetch(`/api/playground/stmx/loox?${query}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.posts)) {
      return { state: "error", error: data?.error ?? `HTTP ${res.status}` };
    }
    return {
      state: "done",
      post: (data.posts[0] as LooxPost | undefined) ?? null,
      visitsError: typeof data.visitsError === "string" ? data.visitsError : null,
    };
  } catch (e) {
    return { state: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

interface AttachOutcome {
  error?: string;
  alreadyAttached?: boolean;
  warnings: string[];
}

/** 카탈로그 모델을 stmx-web 게시물에 건다 — '착장 확인하기' 목록에 나온다. */
async function attachToLoox(postId: string, model: CatalogModel): Promise<AttachOutcome> {
  try {
    const res = await authFetch("/api/playground/stmx/loox/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        model: {
          id: model.id,
          name: model.name,
          brandName: model.brandName,
          manufacturerName: model.manufacturerName,
        },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: data?.error ?? `HTTP ${res.status}`, warnings: [] };
    return {
      alreadyAttached: Boolean(data?.alreadyAttached),
      warnings: Array.isArray(data?.warnings) ? (data.warnings as string[]) : [],
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), warnings: [] };
  }
}

/** 실패하면 오류 문구, 성공하면 null. */
async function detachFromLoox(postId: string, productId: string): Promise<string | null> {
  const params = new URLSearchParams({ postId, productId });
  try {
    const res = await authFetch(`/api/playground/stmx/loox/products?${params}`, {
      method: "DELETE",
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error ?? `HTTP ${res.status}`;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

const remaining = (token: NaverTokenResult, now: number) => {
  const left = token.issuedAt + token.expiresIn * 1000 - now;
  if (left <= 0) return "만료됨";
  const m = Math.floor(left / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분 남음` : `${m}분 남음`;
};

export default function ProductLinkModal({
  open,
  onClose,
  token,
  onToken,
}: ProductLinkModalProps) {
  const [term, setTerm] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [brandsState, setBrandsState] = useState<BrandsState>({ state: "idle" });
  /** 고른 브랜드. */
  const [picked, setPicked] = useState<ClothingBrand | null>(null);
  /** 누른 분류(상의 · 하의 · 기타). */
  const [kind, setKind] = useState<ClothingKind | null>(null);
  /** 조회 중이면 진행 문구. */
  const [progress, setProgress] = useState<string | null>(null);
  /** 조회를 시작하거나 브랜드를 바꿀 때마다 늘린다 — 도중에 바뀌면 이전 조회의 결과를 버린다. */
  const runRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<ModelPage | null>(null);
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [loox, setLoox] = useState<LooxState>({ state: "idle" });
  /** 붙이는 중인 모델 id 또는 떼는 중인 상품 id. */
  const [attaching, setAttaching] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!token || !open) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [token, open]);

  // 브랜드 목록은 토큰이 없어도 된다(우리 DB). 창이 열리면 한 번 받아 둔다.
  useEffect(() => {
    if (!open || brandsState.state !== "idle") return;
    let cancelled = false;
    void fetchBrands().then((next) => {
      if (!cancelled) setBrandsState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open, brandsState.state]);

  const allBrands = brandsState.state === "done" ? brandsState.brands : null;
  const brandMatches = useMemo(
    () => (allBrands ? searchBrands(allBrands, term) : []),
    [allBrands, term]
  );
  const models: CatalogModel[] = useMemo(() => page?.contents ?? [], [page]);
  const categoryFacets = useMemo(() => facetsOf(models, "wholeCategoryName"), [models]);
  const visible = useMemo(() => applyFacets(models, categories), [models, categories]);

  if (!open) return null;

  const expired = token ? token.issuedAt + token.expiresIn * 1000 <= now : false;
  const kindLabel = CLOTHING_KINDS.find((def) => def.key === kind)?.label;

  const loadLoox = async () => {
    setLoox({ state: "loading" });
    setLoox(await fetchLoox());
  };

  /** 상품을 붙이는 대상 — 2단계에 떠 있는 게시물. */
  const currentPost = loox.state === "done" ? loox.post : null;
  const attachedIds = new Set(currentPost?.products.map((p) => p.naverProductId) ?? []);

  const attach = async (model: CatalogModel) => {
    if (!currentPost) {
      setError("먼저 2단계에서 Loox 를 불러오세요.");
      return;
    }
    setAttaching(String(model.id));
    setError(null);
    setNotice(null);
    const outcome = await attachToLoox(currentPost.id, model);
    setAttaching(null);
    if (outcome.error) {
      setError(outcome.error);
      return;
    }
    setNotice(
      [
        outcome.alreadyAttached
          ? "이미 이 Loox 에 붙어 있는 상품입니다."
          : `'${model.name}' 을(를) Loox 에 붙였습니다. stmx-web 게시물의 '착장 확인하기'에서 보입니다.`,
        ...outcome.warnings,
      ].join("\n")
    );
    // 가장 최근 것이 아니라 붙인 그 게시물을 다시 읽는다 — 그 사이 새 글이 올라와도 어긋나지 않게.
    setLoox(await fetchLoox(currentPost.id));
  };

  const detach = async (productId: string) => {
    if (!currentPost) return;
    setAttaching(productId);
    setError(null);
    setNotice(null);
    const failure = await detachFromLoox(currentPost.id, productId);
    setAttaching(null);
    if (failure) {
      setError(failure);
      return;
    }
    setLoox(await fetchLoox(currentPost.id));
  };

  const issue = async () => {
    setIssuing(true);
    setError(null);
    const { token: issued, error: failure } = await issueNaverToken();
    setIssuing(false);
    if (failure || !issued) {
      setError(failure ?? "토큰을 받지 못했습니다.");
      onToken(null);
      return;
    }
    onToken(issued);
    setNow(Date.now());
    // 토큰이 서면 다음 단계(Loox 목록)를 바로 채운다.
    void loadLoox();
  };

  /** 브랜드 · 분류가 바뀌면 이전 조회 결과는 더 이상 맞지 않는다. */
  const clearModels = () => {
    setPage(null);
    setCategories(new Set());
  };

  /** 같은 브랜드를 다시 누르면 선택을 푼다. 진행 중인 조회는 버린다. */
  const pickBrand = (brand: ClothingBrand) => {
    runRef.current++;
    setPicked(picked?.id === brand.id ? null : brand);
    setKind(null);
    setProgress(null);
    setError(null);
    clearModels();
  };

  /**
   * 브랜드 × 분류의 모델 — 분류의 키워드마다 `name=<브랜드명> <키워드>` 로 한 번씩, 차례로 부른다
   * (한꺼번에 쏘면 429). 받는 대로 목록에 더한다. 브랜드 이름으로 하나도 안 걸리면 다음 이름
   * (네이버 등록명 등)으로 다시 찾는다.
   */
  const loadKind = async (brand: ClothingBrand, next: ClothingKind) => {
    const def = CLOTHING_KINDS.find((k) => k.key === next);
    if (!def) return;
    const run = ++runRef.current;
    setKind(next);
    setError(null);
    setNotice(null);
    clearModels();

    const accessToken = token?.accessToken ?? null;
    const pace = createPacer();
    for (const name of brandSearchNames(brand)) {
      const seen = new Set<string>();
      const found: CatalogModel[] = [];
      let total = 0;
      for (const [index, keyword] of def.keywords.entries()) {
        setProgress(`'${name} ${keyword}' 조회 중… ${index + 1}/${def.keywords.length}`);
        await pace();
        const outcome = await fetchModelPage(`${name} ${keyword}`, accessToken);
        if (runRef.current !== run) return;
        if ("error" in outcome) {
          setProgress(null);
          setError(`${name} ${keyword} · ${outcome.error}`);
          return;
        }
        total += outcome.value.totalElements ?? 0;
        found.push(...pickClothingModels(outcome.value.contents, brand.naverBrandId, def, seen));
        setPage({ contents: [...found], totalElements: total });
      }
      if (found.length > 0) break;
    }
    setProgress(null);
  };

  const toggle = (set: Set<string>, setter: (next: Set<string>) => void, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  /** 한 번 받은 결과는 접었다 펴도 다시 부르지 않는다. 실패했으면 다시 부른다. */
  const togglePreview = async (model: CatalogModel) => {
    const key = String(model.id);
    const next = new Set(expanded);
    if (next.has(key)) {
      next.delete(key);
      setExpanded(next);
      return;
    }
    next.add(key);
    setExpanded(next);

    const cached = previews[key];
    if (cached && cached.state !== "error") return;
    setPreviews((prev) => ({ ...prev, [key]: { state: "loading" } }));
    const preview = await fetchPreview(model);
    setPreviews((prev) => ({ ...prev, [key]: preview }));
  };

  const links = visible.map((m) => buildCatalogLink(m.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="상품링크"
        className="pg-app w-[1100px] max-w-full max-h-[88vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[var(--pg-line)]"
      >
        <header className="flex items-center gap-2 px-4 py-3 border-b border-[var(--pg-line)] bg-[var(--color-panel)]">
          <Link2 className="w-4 h-4 text-[var(--color-accent-700)]" />
          <h3 className="m-0 text-[25.2px] font-semibold text-black">상품링크</h3>
          <span className="text-[19.8px] text-black">
            의류 브랜드 × 상의 · 하의 · 기타의 카탈로그 링크
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기 (Esc)"
            className="ml-auto w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4 text-[#201f1d]" />
          </button>
        </header>

        {/* 1 · 액세스 토큰 발급 */}
        <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex items-center gap-2 flex-wrap">
          <Step n={1} label="액세스 토큰" />
          <button
            type="button"
            onClick={issue}
            disabled={issuing}
            className="px-2.5 py-1 text-[20.7px] rounded btn btn-primary flex items-center gap-1 disabled:opacity-60"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {issuing ? "발급 중…" : token ? "토큰 재발급" : "액세스 토큰 발급"}
          </button>
          {token ? (
            <span className="flex items-center gap-1.5 text-[20.7px]">
              <span className={`pg-status ${expired ? "pg-status-4" : "pg-status-2"}`}>
                {expired ? "만료" : "발급됨"}
              </span>
              <code className="text-[19.8px] text-black">
                {token.accessToken.slice(0, 6)}…{token.accessToken.slice(-4)}
              </code>
              <span className="text-black/60">{remaining(token, now)}</span>
            </span>
          ) : (
            <span className="text-[19.8px] text-black/60">
              토큰이 없으면 조회가 401 로 막힙니다.
            </span>
          )}
        </section>

        {/* 2 · Loox 목록 — stmx-web 의 최근 게시물 */}
        <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Step n={2} label="Loox 목록" />
            <button
              type="button"
              onClick={loadLoox}
              disabled={!token || loox.state === "loading"}
              title={token ? "stmx-web 에서 가장 최근 공개 게시물을 읽는다" : "토큰을 먼저 발급하세요"}
              className="px-2.5 py-1 text-[20.7px] rounded btn btn-secondary flex items-center gap-1 disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loox.state === "loading" ? "animate-spin" : ""}`}
              />
              {loox.state === "loading"
                ? "불러오는 중…"
                : loox.state === "idle"
                  ? "최근 Loox 불러오기"
                  : "다시 불러오기"}
            </button>
            <span className="text-[19.8px] text-black/60">
              {token
                ? "stmx-web 의 가장 최근 공개 게시물 — 아래 상품의 'Loox에 붙이기'로 이 게시물에 건다."
                : "토큰을 발급하면 stmx-web 의 최근 게시물을 불러옵니다."}
            </span>
          </div>
          {loox.state !== "idle" && (
            <LooxPreview loox={loox} busy={attaching} onDetach={detach} />
          )}
        </section>

        {/* 3 · 브랜드(초성 검색) → 카테고리(상의 · 하의 · 기타) */}
        <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Step n={3} label="브랜드" />
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
              <input
                className="pg-input pl-8"
                placeholder="브랜드명 · 초성 (예: ㄴㅇㅋ · 나이키 · nike)"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  // Enter 는 맨 위 브랜드를 고른다. 한글 조합 중의 Enter 는 무시한다.
                  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  const first = brandMatches[0];
                  if (first && picked?.id !== first.id) pickBrand(first);
                }}
                spellCheck={false}
              />
            </div>
            {brandsState.state === "idle" && (
              <span className="text-[19.8px] text-black/60 whitespace-nowrap">
                브랜드 불러오는 중…
              </span>
            )}
            {brandsState.state === "done" && (
              <span className="text-[19.8px] text-black/60 whitespace-nowrap">
                옷 브랜드 {brandMatches.length.toLocaleString()} /{" "}
                {brandsState.brands.length.toLocaleString()}
              </span>
            )}
            {brandsState.state === "error" && (
              <button
                type="button"
                onClick={() => setBrandsState({ state: "idle" })}
                className="px-2.5 py-1 text-[20.7px] rounded btn btn-secondary flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                다시 불러오기
              </button>
            )}
          </div>

          {brandsState.state === "error" && (
            <p className="m-0 text-[18.9px] text-[#b42318] whitespace-pre-wrap">
              {brandsState.error}
            </p>
          )}

          {brandsState.state === "done" && (
            <div className="flex items-start gap-2">
              <span className="text-[19.8px] text-black/60 w-[72px] flex-none pt-1">고르기</span>
              <div className="flex items-center gap-1 flex-wrap min-h-[30px] max-h-[132px] overflow-y-auto vt-scroll">
                {brandMatches.length === 0 ? (
                  <span className="text-[18.9px] text-black/40 pt-1">찾은 브랜드가 없습니다.</span>
                ) : (
                  brandMatches.map((brand) => (
                    <button
                      key={brand.id}
                      type="button"
                      className="pg-tab"
                      data-active={picked?.id === brand.id}
                      aria-pressed={picked?.id === brand.id}
                      onClick={() => pickBrand(brand)}
                      title={`네이버 브랜드 ${brand.naverBrandName ?? "-"} · id ${brand.naverBrandId}`}
                    >
                      {brand.displayName}
                      {brand.naverBrandName && brand.naverBrandName !== brand.displayName && (
                        <span className="ml-1 text-black/45">{brand.naverBrandName}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {picked && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[19.8px] text-black/60 w-[72px] flex-none">카테고리</span>
              {CLOTHING_KINDS.map((def) => (
                <button
                  key={def.key}
                  type="button"
                  className="pg-tab disabled:opacity-60"
                  data-active={kind === def.key}
                  aria-pressed={kind === def.key}
                  disabled={!token}
                  onClick={() => void loadKind(picked, def.key)}
                  title={
                    token
                      ? `${picked.displayName} ${def.label} — 검색어: ${def.keywords.join(" · ")}`
                      : "토큰을 먼저 발급하세요"
                  }
                >
                  {def.label}
                  {picked.counts[def.key] > 0 && (
                    <span className="ml-1 text-black/45" title="동기화 표본에서 센 모델 수">
                      {picked.counts[def.key]}
                    </span>
                  )}
                </button>
              ))}
              <span className="text-[19.8px] text-black/60">
                {!token
                  ? "토큰을 발급하면 조회할 수 있습니다."
                  : (progress ??
                    (page
                      ? `검색 ${page.totalElements?.toLocaleString() ?? "-"}건 중 ${picked.displayName} · ${kindLabel} 일치 ${models.length}건 (키워드당 size ${PAGE_SIZE})`
                      : "누르면 이 브랜드의 해당 분류 상품 링크를 조회합니다."))}
              </span>
            </div>
          )}
        </section>

        {/* 4 · 토글 버튼 그룹 */}
        <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Step n={4} label="걸러내기" />
            <span className="text-[19.8px] text-black/60">
              끈 것이 없으면 전체입니다. 분류 안의 세부 카테고리로 좁힙니다.
            </span>
            {categories.size > 0 && (
              <button
                type="button"
                onClick={() => setCategories(new Set())}
                className="ml-auto px-2 py-0.5 text-[18.9px] rounded btn btn-secondary"
              >
                초기화
              </button>
            )}
          </div>

          <FacetRow
            label="카테고리"
            facets={categoryFacets}
            selected={categories}
            onToggle={(v) => toggle(categories, setCategories, v)}
          />
        </section>

        {error && (
          <pre className="pg-code m-4 mb-0 text-black">{error}</pre>
        )}
        {notice && !error && (
          <p className="m-4 mb-0 text-[19.8px] text-black/70 whitespace-pre-line">{notice}</p>
        )}

        {/* 결과 — 링크 */}
        <div className="flex-1 min-h-0 overflow-auto vt-scroll p-4">
          {!page && !error && (
            <p className="m-0 text-[22.5px] text-black/60">
              {progress ?? "토큰을 발급하고 브랜드를 고른 뒤 상의 · 하의 · 기타 중 하나를 누르세요."}
            </p>
          )}

          {page && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[20.7px] text-black">
                  링크 {visible.length.toLocaleString()}건
                </span>
                {visible.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(links.join("\n")).catch(() => {});
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    }}
                    className="px-2 py-0.5 text-[18.9px] rounded btn btn-secondary flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    링크 전체 복사
                  </button>
                )}
              </div>

              {visible.length === 0 ? (
                <p className="m-0 text-[20.7px] text-black/60">
                  {models.length > 0
                    ? "걸러낸 결과가 없습니다. 위 토글을 확인하세요."
                    : progress
                      ? "찾는 중…"
                      : "이 브랜드 · 분류에 맞는 상품이 없습니다."}
                </p>
              ) : (
                <ul className="list-none m-0 p-0 flex flex-col">
                  {visible.map((model) => (
                    <li
                      key={String(model.id)}
                      className="py-1.5 border-b border-[var(--pg-line)] flex flex-col gap-0.5"
                    >
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-[21.6px] text-black">{model.name}</span>
                        {model.brandName && (
                          <span className="text-[18.9px] text-black/55">
                            {model.brandName}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard
                              .writeText(buildCatalogLink(model.id))
                              .catch(() => {});
                            setCopiedId(String(model.id));
                            setTimeout(() => setCopiedId(null), 1200);
                          }}
                          title="이 상품 링크 복사"
                          className="ml-auto px-2 py-0.5 text-[18.9px] rounded btn btn-secondary flex items-center gap-1"
                        >
                          {copiedId === String(model.id) ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedId === String(model.id) ? "복사됨" : "복사"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void attach(model)}
                          disabled={
                            !currentPost ||
                            attaching !== null ||
                            attachedIds.has(String(model.id))
                          }
                          title={
                            currentPost
                              ? "2단계의 Loox 에 이 상품을 건다 — stmx-web '착장 확인하기'에 나온다"
                              : "2단계에서 Loox 를 먼저 불러오세요"
                          }
                          className="px-2 py-0.5 text-[18.9px] rounded btn btn-secondary flex items-center gap-1 disabled:opacity-60"
                        >
                          {attachedIds.has(String(model.id)) ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Paperclip className="w-3.5 h-3.5" />
                          )}
                          {attachedIds.has(String(model.id))
                            ? "붙음"
                            : attaching === String(model.id)
                              ? "붙이는 중…"
                              : "Loox에 붙이기"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // 열 때만 새 창도 띄운다. await 앞에서 불러야 팝업 차단에 걸리지 않는다.
                            if (!expanded.has(String(model.id))) {
                              window.open(
                                buildCatalogLink(model.id),
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }
                            void togglePreview(model);
                          }}
                          aria-expanded={expanded.has(String(model.id))}
                          title="새 창에서 열고 상품 이미지 · 제목 펼치기"
                          className="px-2 py-0.5 text-[18.9px] rounded btn btn-secondary flex items-center gap-1"
                        >
                          {expanded.has(String(model.id)) ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                          {expanded.has(String(model.id)) ? "닫기" : "열기"}
                        </button>
                      </span>
                      <span className="text-[18px] text-black/45">
                        {model.wholeCategoryName}
                      </span>
                      <code className="text-[18.9px] text-black/70 break-all">
                        {buildCatalogLink(model.id)}
                      </code>
                      {expanded.has(String(model.id)) && (
                        <ProductPreview preview={previews[String(model.id)]} />
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <p className="m-0 mt-3 text-[18.9px] text-black/55 leading-relaxed">
                링크 형식(<code>search.shopping.naver.com/catalog/&#123;id&#125;</code>)은 아직
                검증되지 않았습니다. 다르면{" "}
                <code>lib/playground/product-link.ts</code> 의 CATALOG_LINK_BASE 만 고치면 됩니다.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 펼친 카드 아래 — 테두리 없는 표. 윗줄은 상품 이미지를 가로로, 아랫줄은 그 제목.
 * 열이 많으면 표만 가로로 스크롤한다.
 */
function ProductPreview({ preview }: { preview?: Preview }) {
  if (!preview || preview.state === "loading") {
    return <p className="m-0 mt-1.5 text-[18.9px] text-black/55">상품 정보를 읽는 중…</p>;
  }
  if (preview.state === "error") {
    return (
      <p className="m-0 mt-1.5 text-[18.9px] text-[#b42318] whitespace-pre-wrap">
        {preview.error}
      </p>
    );
  }
  if (preview.items.length === 0) {
    return <p className="m-0 mt-1.5 text-[18.9px] text-black/55">검색된 상품이 없습니다.</p>;
  }

  return (
    <div className="mt-1.5 overflow-x-auto vt-scroll">
      <table className="border-collapse border-0">
        <tbody>
          <tr>
            {preview.items.map((item, i) => (
              <td key={`img-${i}`} className="border-0 p-1 align-top">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="block w-[140px] h-[140px] object-cover rounded bg-black/5"
                />
              </td>
            ))}
          </tr>
          <tr>
            {preview.items.map((item, i) => (
              <td key={`title-${i}`} className="border-0 p-1 align-top">
                <div
                  className="w-[140px] text-[18px] leading-snug text-black line-clamp-3"
                  title={item.title}
                >
                  {item.title}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * 2단계 — 게시물 한 건. 이미지(최대 9장)를 가로로 늘어놓고 옆에 발행 정보 · STYLE NOTE,
 * 그 아래에 붙은 착장 상품(stmx-web '착장 확인하기'에 나오는 것과 같은 순서).
 * 이미지가 많으면 이 줄만 가로로 스크롤한다.
 */
function LooxPreview({
  loox,
  busy,
  onDetach,
}: {
  loox: Exclude<LooxState, { state: "idle" }>;
  busy: string | null;
  onDetach: (productId: string) => void;
}) {
  if (loox.state === "loading") {
    return <p className="m-0 text-[18.9px] text-black/55">stmx-web 게시물을 읽는 중…</p>;
  }
  if (loox.state === "error") {
    return (
      <p className="m-0 text-[18.9px] text-[#b42318] whitespace-pre-wrap">{loox.error}</p>
    );
  }
  const { post } = loox;
  if (!post) {
    return <p className="m-0 text-[18.9px] text-black/55">공개된 게시물이 없습니다.</p>;
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="flex gap-1.5 overflow-x-auto vt-scroll min-w-0 flex-none max-w-[60%]">
        {post.images.length === 0 ? (
          <span className="text-[18.9px] text-black/55">이미지가 없는 게시물입니다.</span>
        ) : (
          post.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.position}
              src={image.url}
              alt={`Loox 이미지 ${image.position}`}
              loading="lazy"
              className="block w-[120px] h-[160px] object-cover rounded bg-black/5 flex-none"
            />
          ))
        )}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="flex items-center gap-2 flex-wrap text-[19.8px] text-black">
          {post.styleCode && <span className="pg-status pg-status-2">{post.styleCode}</span>}
          {post.publishedAt && new Date(post.publishedAt).toLocaleString("ko-KR")}
          <span className="text-black/55">이미지 {post.images.length}장</span>
        </span>
        {post.location && (
          <span className="text-[18.9px] text-black/55">{post.location}</span>
        )}
        {post.styleNote && (
          <p className="m-0 text-[18.9px] text-black leading-snug line-clamp-3 whitespace-pre-line">
            {post.styleNote}
          </p>
        )}
        <code className="text-[18px] text-black/45 break-all">post {post.id}</code>

        {/* 방문자수 = stmx-web 게시물 상세의 좋아요 · 댓글 · 공유 · 관심 버튼 클릭 합 */}
        {post.visits ? (
          <span
            className="flex items-center gap-2 flex-wrap text-[19.8px] text-black"
            title={
              post.visits.lastClickedAt
                ? `마지막 클릭 ${new Date(post.visits.lastClickedAt).toLocaleString("ko-KR")}`
                : "아직 눌린 적이 없습니다"
            }
          >
            <span className="font-semibold">
              방문자수 {post.visits.visitCount.toLocaleString("ko-KR")}
            </span>
            <span className="text-black/55">
              좋아요 {post.visits.likeClicks.toLocaleString("ko-KR")} · 댓글{" "}
              {post.visits.commentClicks.toLocaleString("ko-KR")} · 공유{" "}
              {post.visits.shareClicks.toLocaleString("ko-KR")} · 관심{" "}
              {post.visits.bookmarkClicks.toLocaleString("ko-KR")}
            </span>
          </span>
        ) : (
          <span className="text-[18.9px] text-black/55 whitespace-pre-wrap">
            방문자수 — {loox.visitsError ?? "읽지 못했습니다."}
          </span>
        )}

        <div className="mt-1 flex flex-col gap-1">
          <span className="text-[19.8px] font-semibold text-black">
            착장 상품 {post.products.length}개
            {post.products.length === 0 && (
              <span className="ml-1 font-normal text-black/55">
                — 없으면 stmx-web 에 &apos;착장 확인하기&apos; 단추가 나오지 않습니다.
              </span>
            )}
          </span>
          {post.products.map((product) => (
            <span key={product.id} className="flex items-center gap-2 min-w-0 text-[18.9px]">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="block w-9 h-9 object-cover rounded bg-black/5 flex-none"
                />
              ) : (
                <span className="w-9 h-9 rounded bg-black/5 flex-none" />
              )}
              <span className="font-semibold text-black flex-none">{product.brandName}</span>
              <span className="text-black truncate min-w-0" title={product.name}>
                {product.name}
              </span>
              <span className="text-black/55 flex-none">
                {product.salePrice.toLocaleString("ko-KR")}원
              </span>
              <button
                type="button"
                onClick={() => onDetach(product.id)}
                disabled={busy !== null}
                title="이 게시물에서 떼기 (상품 마스터는 남긴다)"
                className="ml-auto px-1.5 py-0.5 text-[18px] rounded btn btn-secondary flex items-center gap-1 flex-none disabled:opacity-60"
              >
                <X className="w-3 h-3" />
                {busy === product.id ? "떼는 중…" : "떼기"}
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const Step = ({ n, label }: { n: number; label: string }) => (
  <span className="flex items-center gap-1.5 flex-none">
    <span className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-[19.8px] font-bold text-black">
      {n}
    </span>
    <span className="text-[20.7px] font-semibold text-black">{label}</span>
  </span>
);

/**
 * 카테고리 경로는 `패션의류>여성의류>니트>풀오버` 처럼 길다. 버튼에는 끝 두 마디만
 * 보이고 전체 경로는 title 로 둔다 — 토글이 한 줄을 다 잡아먹지 않도록.
 */
const shortLabel = (value: string) => {
  const parts = value.split(">");
  return parts.length <= 2 ? value : `…>${parts.slice(-2).join(">")}`;
};

function FacetRow({
  label,
  facets,
  selected,
  onToggle,
}: {
  label: string;
  facets: { value: string; count: number }[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[19.8px] text-black/60 w-[72px] flex-none pt-1">{label}</span>
      <div className="flex items-center gap-1 flex-wrap min-h-[30px]">
        {facets.length === 0 ? (
          <span className="text-[18.9px] text-black/40 pt-1">조회 결과가 없습니다.</span>
        ) : (
          facets.map((facet) => (
            <button
              key={facet.value}
              type="button"
              className="pg-tab"
              data-active={selected.has(facet.value)}
              aria-pressed={selected.has(facet.value)}
              onClick={() => onToggle(facet.value)}
              title={facet.value}
            >
              {shortLabel(facet.value)}
              <span className="ml-1 text-black/45">{facet.count}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
