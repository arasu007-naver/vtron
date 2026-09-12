"use client";

import { useEffect, useMemo, useState } from "react";
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
 * 상품링크 — 플로우를 한 화면에서 돌리는 도구.
 *
 * 네 영역이 곧 플로우의 네 고비다.
 *
 *   1. 액세스 토큰 발급   — 인증
 *   2. Loox 목록          — stmx-web 의 최근 게시물. 상품을 묶을 대상(COM-002-B01 착장 상품 목록)
 *   3. 검색어 + 조회      — 카탈로그 모델 목록 (name 이 모델명·브랜드명·제조사명·카테고리명을 함께 훑는다)
 *   4. 토글 버튼 그룹     — 카테고리·브랜드로 걸러 확정
 *
 * 4번이 필요한 이유는 name 검색이 정확 일치가 아니기 때문이다. 토큰 분해 매칭이라
 * 동명이 리프(여성/남성 카디건)나 무관한 항목이 섞여 들어온다. 받아온 뒤 걸러야 한다.
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
  | { state: "done"; post: LooxPost | null };

/** postId 가 없으면 가장 최근 공개 게시물. */
async function fetchLoox(postId?: string): Promise<LooxState> {
  const query = postId ? `postId=${encodeURIComponent(postId)}` : "limit=1";
  try {
    const res = await authFetch(`/api/playground/stmx/loox?${query}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.posts)) {
      return { state: "error", error: data?.error ?? `HTTP ${res.status}` };
    }
    return { state: "done", post: (data.posts[0] as LooxPost | undefined) ?? null };
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
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<ModelPage | null>(null);
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<Set<string>>(new Set());
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

  const models: CatalogModel[] = useMemo(() => page?.contents ?? [], [page]);
  const categoryFacets = useMemo(() => facetsOf(models, "wholeCategoryName"), [models]);
  const brandFacets = useMemo(() => facetsOf(models, "brandName"), [models]);
  const visible = useMemo(
    () => applyFacets(models, categories, brands),
    [models, categories, brands]
  );

  if (!open) return null;

  const expired = token ? token.issuedAt + token.expiresIn * 1000 <= now : false;

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

  const search = async () => {
    const query = term.trim();
    if (!query) {
      setError("검색어를 입력하세요. name 은 필수라 비우면 400 이 돌아옵니다.");
      return;
    }
    setSearching(true);
    setError(null);
    setPage(null);
    setCategories(new Set());
    setBrands(new Set());

    const { result, error: failure } = await sendDraft(
      searchDraft(query),
      token?.accessToken ?? null
    );
    setSearching(false);

    if (failure) {
      setError(failure);
      return;
    }
    if (!result) return;
    if (!result.ok) {
      setError(`HTTP ${result.status} · ${result.body.slice(0, 300)}`);
      return;
    }
    const parsed = parseModelPage(result.body);
    if (!parsed) {
      setError("모델 목록 형식이 아닙니다. 응답 원문을 확인하세요.");
      return;
    }
    setPage(parsed);
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
            카탈로그 모델을 찾아 링크로 옮긴다
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

        {/* 3 · 검색어 + 조회 */}
        <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex items-center gap-2 flex-wrap">
          <Step n={3} label="검색어" />
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
            <input
              className="pg-input pl-8"
              placeholder="카테고리명 · 브랜드명 · 모델명 (예: 풀오버 · 나이키 · 에어맥스)"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  void search();
                }
              }}
              spellCheck={false}
            />
          </div>
          <button
            type="button"
            onClick={search}
            disabled={searching}
            className="px-3 py-1 text-[20.7px] rounded btn btn-primary disabled:opacity-60"
          >
            {searching ? "조회 중…" : "조회"}
          </button>
          {page && (
            <span className="text-[19.8px] text-black/60 whitespace-nowrap">
              전체 {page.totalElements?.toLocaleString() ?? "-"}건 중 {models.length}건
              (size {PAGE_SIZE})
            </span>
          )}
        </section>

        {/* 4 · 토글 버튼 그룹 */}
        <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Step n={4} label="걸러내기" />
            <span className="text-[19.8px] text-black/60">
              끈 것이 없으면 전체입니다. 이름 검색이 정확 일치가 아니라 무관한 항목이 섞입니다.
            </span>
            {(categories.size > 0 || brands.size > 0) && (
              <button
                type="button"
                onClick={() => {
                  setCategories(new Set());
                  setBrands(new Set());
                }}
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
          <FacetRow
            label="브랜드"
            facets={brandFacets}
            selected={brands}
            onToggle={(v) => toggle(brands, setBrands, v)}
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
              토큰을 발급하고 검색어로 조회하세요.
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
                  걸러낸 결과가 없습니다. 위 토글을 확인하세요.
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
