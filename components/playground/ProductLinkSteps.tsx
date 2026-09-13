"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Paperclip,
  RefreshCw,
  Search,
} from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { sendDraft } from "@/lib/playground/client";
import {
  CLOTHING_KINDS,
  brandSearchNames,
  pickClothingModels,
  searchBrands,
  type ClothingBrand,
  type ClothingKind,
} from "@/lib/playground/clothing";
import { attachToLoox } from "@/lib/playground/loox-client";
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
 * 상품링크의 3단계부터 — 옷 브랜드 · 분류로 카탈로그 모델을 찾고(3), 세부 카테고리로 걸러(4),
 * 링크를 뽑거나 Loox 에 붙인다. 상품링크 모달과 /products-2-link 페이지가 같이 쓴다.
 *
 *   3. 브랜드 · 카테고리  — 옷 브랜드를 초성으로 찾아 고르고, 아래 줄의 상의 · 하의 · 기타를 누르면
 *                           그 브랜드 × 분류의 카탈로그 모델을 조회한다
 *   4. 토글 버튼 그룹     — 세부 카테고리로 걸러 확정
 *
 * 브랜드는 brands 테이블(scripts/sync-brands.mjs 가 네이버 브랜드 조회로 채움)에서 옷 브랜드만 온다.
 * 모델 조회는 브랜드 id · 카테고리 id 를 받지 않는다(무시된다). 그래서 "브랜드명 + 옷 키워드" 로
 * 키워드마다 한 번씩 부르고, 섞여 든 다른 브랜드 · 카테고리는 brandCode · categoryId 로 거른다.
 */

interface ProductLinkStepsProps {
  /** 커머스 API 토큰. 없으면 분류 조회가 잠긴다. */
  token: NaverTokenResult | null;
  /** 상품을 붙일 Loox. 없으면 'Loox에 붙이기' 가 잠긴다. */
  post: LooxPost | null;
  /** 붙인 뒤 그 게시물을 다시 읽게 한다. */
  onPostChanged: (postId: string) => Promise<void>;
  /** 붙일 Loox 가 없을 때의 안내. */
  pickPostHint: string;
  /** true 면 결과 목록이 남은 높이 안에서 스스로 스크롤한다(모달). 페이지는 바깥이 스크롤한다. */
  scrollResults?: boolean;
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

/** 옷 브랜드 목록. idle 이면 마운트될 때 불러온다. */
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

export default function ProductLinkSteps({
  token,
  post,
  onPostChanged,
  pickPostHint,
  scrollResults = false,
}: ProductLinkStepsProps) {
  const [term, setTerm] = useState("");
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  /** 붙이는 중인 모델 id. */
  const [attaching, setAttaching] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 브랜드 목록은 토큰이 없어도 된다(우리 DB). 한 번 받아 둔다.
  useEffect(() => {
    if (brandsState.state !== "idle") return;
    let cancelled = false;
    void fetchBrands().then((next) => {
      if (!cancelled) setBrandsState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [brandsState.state]);

  const allBrands = brandsState.state === "done" ? brandsState.brands : null;
  const brandMatches = useMemo(
    () => (allBrands ? searchBrands(allBrands, term) : []),
    [allBrands, term]
  );
  const models: CatalogModel[] = useMemo(() => page?.contents ?? [], [page]);
  const categoryFacets = useMemo(() => facetsOf(models, "wholeCategoryName"), [models]);
  const visible = useMemo(() => applyFacets(models, categories), [models, categories]);

  const kindLabel = CLOTHING_KINDS.find((def) => def.key === kind)?.label;
  const attachedIds = new Set(post?.products.map((p) => p.naverProductId) ?? []);

  const attach = async (model: CatalogModel) => {
    if (!post) {
      setError(pickPostHint);
      return;
    }
    setAttaching(String(model.id));
    setError(null);
    setNotice(null);
    const outcome = await attachToLoox(post.id, model);
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
    await onPostChanged(post.id);
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
    <>
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

      {error && <pre className="pg-code m-4 mb-0 text-black">{error}</pre>}
      {notice && !error && (
        <p className="m-4 mb-0 text-[19.8px] text-black/70 whitespace-pre-line">{notice}</p>
      )}

      {/* 결과 — 링크 */}
      <div className={scrollResults ? "flex-1 min-h-0 overflow-auto vt-scroll p-4" : "p-4"}>
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
                        <span className="text-[18.9px] text-black/55">{model.brandName}</span>
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
                        disabled={!post || attaching !== null || attachedIds.has(String(model.id))}
                        title={
                          post
                            ? "고른 Loox 에 이 상품을 건다 — stmx-web '착장 확인하기'에 나온다"
                            : pickPostHint
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
                            window.open(buildCatalogLink(model.id), "_blank", "noopener,noreferrer");
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
                    <span className="text-[18px] text-black/45">{model.wholeCategoryName}</span>
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
              검증되지 않았습니다. 다르면 <code>lib/playground/product-link.ts</code> 의
              CATALOG_LINK_BASE 만 고치면 됩니다.
            </p>
          </>
        )}
      </div>
    </>
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

export const Step = ({ n, label }: { n: number; label: string }) => (
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
