"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { normalizeSearch } from "@/lib/hangul";
import { MIN_QUERY_LENGTH, SEARCH_PAGE, type ProductSearchV2Response } from "@/lib/catalog-search/plan";
import type { CatalogBrand, CatalogKind } from "@/lib/tryon/product-catalog";

/**
 * 상품 검색 v2 시험 화면 — `GET /api/product-search-v2`.
 *
 *   ┌ 조회 ─────────────────────────────────────────────────────────┐
 *   │ [검색어            ] [브랜드 ▾] [분류 ▾] [컬럼/메모리 ▾]        │
 *   │ 예시 칩: ㄴㅇㅋ ㅇㅇㅍㅅ · 리바이스 트러커 · 85748-0289 …       │
 *   ├ 풀이 ─────────────────────────────────────────────────────────┤
 *   │ 브랜드 토큰 · 초성 토큰 · 글자 토큰 · 맞춘 곳 · 걸린 시간       │
 *   ├ 목록 ─────────────────────────────────────────────────────────┤
 *   │ 상품 줄(사진 · 브랜드 · 상품명 · 경로 · 열기) … [더 보기]       │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * 설계(stmx-web docs/product-search.md) 8장 '확인할 것' 의 검색어를 예시 칩으로 둔다.
 */

const EXAMPLES = [
  "ㄹㅂㅇㅅ ㅌㄹㅋ",
  "리바이스 트러커",
  "ㅌㄹㅋ",
  "857480289",
  "85748-0289",
  "ck 셔츠",
  "ㄷㅇ ㅈㅋ",
  "루이 비통",
];

const KIND_OPTIONS: { value: "" | CatalogKind; label: string }[] = [
  { value: "", label: "전체 분류" },
  { value: "top", label: "상의" },
  { value: "bottom", label: "하의" },
  { value: "etc", label: "기타" },
];

const DEBOUNCE_MS = 250;

type Mode = "auto" | "memory";

interface Filters {
  q: string;
  brandId: string;
  kind: "" | CatalogKind;
  mode: Mode;
}

const buildParams = (filters: Filters, offset: number) => {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.brandId) params.set("brandId", filters.brandId);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.mode === "memory") params.set("mode", "memory");
  params.set("limit", String(SEARCH_PAGE));
  if (offset) params.set("offset", String(offset));
  return params;
};

export default function ProductSearchPage() {
  const [filters, setFilters] = useState<Filters>({ q: "", brandId: "", kind: "", mode: "auto" });
  /** 디바운스가 끝나 실제로 보낸 조건. */
  const [sent, setSent] = useState<Filters | null>(null);
  const [brands, setBrands] = useState<CatalogBrand[]>([]);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  /** 마지막으로 받은 응답. `url` 이 지금 보낼 주소와 같아야 화면에 낸다. */
  const [page, setPage] = useState<{ url: string; data: ProductSearchV2Response | null; error: string | null } | null>(
    null
  );
  /** '더 보기' 로 덧붙여 받는 중. */
  const [moreLoading, setMoreLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await authFetch("/api/tryon/catalog/brands");
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (live) setBrands(data.brands as CatalogBrand[]);
      } catch (e) {
        if (live) setBrandsError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // 조건이 바뀌면 잠깐 기다렸다 보낸다.
  useEffect(() => {
    const timer = setTimeout(() => setSent(filters), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters]);

  // 너무 짧으면 보내지 않는다(라우트가 400 을 준다). 화면은 tooShort 로 안내한다.
  const tooShort = sent !== null && !sent.brandId && normalizeSearch(sent.q).length < MIN_QUERY_LENGTH;
  const requestUrl = sent && !tooShort ? `/api/product-search-v2?${buildParams(sent, 0)}` : "";

  useEffect(() => {
    if (!requestUrl) return;
    let live = true;
    void (async () => {
      try {
        const res = await authFetch(requestUrl);
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (live) setPage({ url: requestUrl, data: data as ProductSearchV2Response, error: null });
      } catch (e) {
        if (live) setPage({ url: requestUrl, data: null, error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      live = false;
    };
  }, [requestUrl]);

  // 지금 조건의 응답만 낸다 — 늦게 온 지난 응답이나 짧은 검색어일 때의 지난 결과는 내리지 않고 감춘다.
  const current = requestUrl && page?.url === requestUrl ? page : null;
  const result = current?.data ?? null;
  const error = current?.error ?? null;
  const loading = (requestUrl !== "" && current === null) || moreLoading;

  const loadMore = async () => {
    if (!sent || !result) return;
    const url = `/api/product-search-v2?${buildParams(sent, result.products.length)}`;
    setMoreLoading(true);
    try {
      const res = await authFetch(url);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const more = data as ProductSearchV2Response;
      setPage((prev) =>
        prev && prev.url === requestUrl && prev.data
          ? { ...prev, data: { ...more, products: [...prev.data.products, ...more.products] } }
          : prev
      );
    } catch (e) {
      setPage((prev) =>
        prev && prev.url === requestUrl ? { ...prev, error: e instanceof Error ? e.message : String(e) } : prev
      );
    } finally {
      setMoreLoading(false);
    }
  };

  const brandName = (id: string) => brands.find((brand) => brand.id === id)?.displayName ?? id;

  const pick = (q: string) => {
    setFilters((prev) => ({ ...prev, q }));
    inputRef.current?.focus();
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* 첫째 줄 — 조회 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSent(filters);
        }}
        className="flex-none px-4 py-2.5 border-b border-[var(--pg-line)] bg-[var(--color-panel)] flex flex-col gap-2"
      >
        <div className="flex items-end gap-2 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="text-[18.9px] text-black/70">검색어</span>
            <input
              ref={inputRef}
              className="pg-input"
              style={{ width: 360 }}
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="브랜드 · 상품명 · 품번으로 찾기"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[18.9px] text-black/70">브랜드 (선택)</span>
            <select
              className="pg-select"
              style={{ minWidth: 180 }}
              value={filters.brandId}
              onChange={(e) => setFilters({ ...filters, brandId: e.target.value })}
            >
              <option value="">전체 브랜드</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.displayName} ({brand.modelCount.toLocaleString("ko-KR")})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[18.9px] text-black/70">분류</span>
            <select
              className="pg-select"
              value={filters.kind}
              onChange={(e) => setFilters({ ...filters, kind: e.target.value as Filters["kind"] })}
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[18.9px] text-black/70">맞추는 곳</span>
            <select
              className="pg-select"
              value={filters.mode}
              onChange={(e) => setFilters({ ...filters, mode: e.target.value as Mode })}
              title="자동: 검색 컬럼이 있으면 컬럼, 없으면 메모리. 메모리: 컬럼을 건너뛰고 서버 메모리에서 맞춘다."
            >
              <option value="auto">자동 (컬럼 → 메모리)</option>
              <option value="memory">메모리 강제</option>
            </select>
          </label>

          <button type="submit" className="px-3 h-9 text-[19.8px] rounded btn btn-primary flex items-center gap-1">
            <Search className="w-4 h-4" />
            검색
          </button>
          {brandsError && (
            <span className="text-[18px] text-[#b42318]" title={brandsError}>
              브랜드 목록을 불러오지 못했습니다.
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap" aria-label="예시 검색어">
          <span className="text-[18px] text-black/55 mr-1">예시</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => pick(example)}
              className={`px-2.5 h-8 text-[18px] rounded-full border ${
                filters.q === example
                  ? "border-[var(--color-accent,#2563eb)] bg-[var(--color-accent,#2563eb)] text-white"
                  : "border-[var(--pg-line)] bg-white hover:bg-black/5"
              }`}
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {/* 둘째 줄 — 검색어를 어떻게 풀었나 */}
      <div className="flex-none px-4 py-2 border-b border-[var(--pg-line)] flex flex-col gap-1 text-[18.9px]">
        <div className="flex items-center gap-3 flex-wrap text-black/60">
          <span>
            {loading
              ? "찾는 중…"
              : error
                ? "찾지 못했습니다."
                : tooShort
                  ? `브랜드 없이 찾으려면 ${MIN_QUERY_LENGTH}자 이상 치세요.`
                  : result
                    ? `총 ${result.total.toLocaleString("ko-KR")}건 · ${result.products.length}건 보임`
                    : ""}
          </span>
          {result && !loading && (
            <>
              <span
                className={`pg-status ${result.mode === "columns" ? "pg-status-2" : "pg-status-4"}`}
                title={
                  result.mode === "columns"
                    ? "DB 의 search_text · search_choseong 컬럼으로 맞췄다"
                    : "검색 컬럼이 없거나(0026 마이그레이션 전) 메모리를 골라 서버 메모리에서 맞췄다"
                }
              >
                {result.mode === "columns" ? "컬럼" : "메모리"}
              </span>
              <span>{result.tookMs}ms</span>
            </>
          )}
          {requestUrl && <code className="text-[17px] text-black/45 break-all">GET {requestUrl}</code>}
        </div>

        {result && (
          <div className="flex items-center gap-2 flex-wrap">
            <PlanGroup
              label="브랜드"
              items={
                result.plan.brandIds === null
                  ? ["전체"]
                  : result.plan.brandTokens.length > 0
                    ? result.plan.brandTokens.map(
                        (token) => `${token.token} → ${token.brands.map((b) => b.displayName).join(", ")}`
                      )
                    : result.plan.brandIds.map(brandName)
              }
            />
            <PlanGroup label="초성" items={result.plan.choseongTokens} mono />
            <PlanGroup label="글자 · 품번" items={result.plan.textTokens} mono />
          </div>
        )}
      </div>

      {/* 본문 — 상품 목록 */}
      <div className="flex-1 min-h-0 overflow-y-auto vt-scroll p-4">
        {error && <p className="m-0 text-[19.8px] text-[#b42318] whitespace-pre-wrap">{error}</p>}
        {!error && result && result.products.length === 0 && !loading && (
          <p className="m-0 text-[19.8px] text-black/55">조건에 드는 상품이 없습니다.</p>
        )}
        {!error && result && result.products.length > 0 && (
          <>
            <ul className="list-none m-0 p-0 flex flex-col divide-y divide-[var(--pg-line)] rounded-md border border-[var(--pg-line)] bg-white">
              {result.products.map((product) => (
                <li key={product.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-none w-14 h-14 rounded bg-black/5 overflow-hidden">
                    {product.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="block w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <span className="text-[18px] text-black/55 truncate">
                      {product.brandName ?? "브랜드 없음"} · {product.path}
                    </span>
                    <span className="text-[19.8px] text-black truncate" title={product.name}>
                      {product.name}
                    </span>
                  </div>
                  <a
                    href={product.catalogUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-none px-2.5 h-8 text-[18px] rounded btn btn-secondary flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    열기
                  </a>
                </li>
              ))}
            </ul>
            {result.products.length < result.total && sent && (
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadMore()}
                  className="px-3 h-9 text-[19.8px] rounded btn btn-secondary disabled:opacity-40"
                >
                  더 보기 ({result.products.length} / {result.total.toLocaleString("ko-KR")})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PlanGroup({ label, items, mono }: { label: string; items: string[]; mono?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-black/55">{label}</span>
      {items.length === 0 ? (
        <span className="text-black/35">—</span>
      ) : (
        items.map((item) => (
          <span
            key={item}
            className={`px-2 rounded bg-black/5 text-black/80 ${mono ? "font-mono" : ""}`}
          >
            {item}
          </span>
        ))
      )}
    </span>
  );
}
