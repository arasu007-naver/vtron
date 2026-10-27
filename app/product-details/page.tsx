"use client";

/* 상품 상세 — 브랜드의 상품을 고르면 그 브랜드 공식 사이트에서 같은 상품을 찾아 보여 준다.

   ┌ 상품 찾기 (1) ─────────┬ 브랜드 사이트 검색 결과 (2) ─────────────────────┐
   │ [[BrandProductPicker]] │ 고른 상품 (이름 · 경로 · 네이버 카탈로그 링크)      │
   │ 브랜드(161개 전부)      │ 브랜드 api · 확인 상태 · 검색 방식                  │
   │ → 상품명(네이버 카탈로그)│ [검색어          ] [찾기]                          │
   │                        │ ┌결과┐ ┌결과┐ ┌결과┐ ┌결과┐   ← 브랜드 사이트 상품   │
   └────────────────────────┴────────────────────────────────────────────────────┘

   왼쪽 브랜드는 네이버 브랜드와 매칭된 161개 전부다(내재화 여부와 무관). 상품은 네이버 카탈로그
   모델을 그때그때 찾는다. 오른쪽 검색은 `/api/product-details/brand-search` 가 `brands.api` 로
   한다. Shopify · Cafe24 · 유니클로만 자동으로 찾고, 나머지(봇 차단 · 그룹몰)는 브랜드 상품 페이지
   링크만 띄운다. */

import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink, ImageOff, Loader2, Search } from "lucide-react";
import BrandProductPicker, { type BrandProductPick } from "@/components/product-details/BrandProductPicker";
import { authFetch } from "@/lib/auth-client";
import {
  ADAPTER_LABEL,
  BRAND_API_STATUS_LABEL,
  type BrandApiStatus,
  type BrandSiteSearchResponse,
} from "@/lib/brand-site/types";

const STATUS_TONE: Record<BrandApiStatus, string> = {
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
  homepage: "bg-amber-50 text-amber-700 border-amber-200",
  unverified: "bg-amber-50 text-amber-700 border-amber-200",
  fallback: "bg-black/5 text-black/60 border-black/10",
};

/** 지금 보이는 결과가 어느 상품 · 검색어의 답인지 같이 든다. 다르면 아직 답이 안 온 것이다. */
interface SearchState {
  key: string;
  data: BrandSiteSearchResponse | null;
  error: string | null;
}

const keyOf = (pick: BrandProductPick, q: string | null) => `${pick.brand.id}\u0000${pick.model.id}\u0000${q ?? ""}`;

export default function ProductDetailsPage() {
  const [product, setProduct] = useState<BrandProductPick | null>(null);
  /** 사람이 친 검색어. null 이면 서버가 상품명에서 만든다. */
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<SearchState | null>(null);

  const currentKey = product ? keyOf(product, submitted) : null;
  const loading = Boolean(currentKey && result?.key !== currentKey);
  const shown = result && result.key === currentKey ? result : null;

  useEffect(() => {
    if (!product || !currentKey) return;
    let stale = false;
    (async () => {
      const params = new URLSearchParams({ brandId: product.brand.id, name: product.model.name });
      if (submitted) params.set("q", submitted);
      let next: SearchState;
      try {
        const res = await authFetch(`/api/product-details/brand-search?${params}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        next = { key: currentKey, data: data as BrandSiteSearchResponse, error: null };
        // 서버가 만든 검색어를 입력칸에 채워 고쳐 쓸 수 있게 한다
        if (!submitted) setDraft((data as BrandSiteSearchResponse).usedQuery ?? (data as BrandSiteSearchResponse).query);
      } catch (e) {
        next = { key: currentKey, data: null, error: e instanceof Error ? e.message : String(e) };
      }
      if (!stale) setResult(next);
    })();
    return () => {
      stale = true;
    };
  }, [product, submitted, currentKey]);

  const pick = (next: BrandProductPick) => {
    setProduct(next);
    setSubmitted(null);
    setDraft("");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (product && q) setSubmitted(q);
  };

  return (
    <div className="h-full grid grid-cols-3 bg-[var(--color-bg)]">
      {/* 왼쪽 1 — 상품 찾기 */}
      <section className="col-span-1 min-h-0 flex flex-col border-r border-[var(--color-divider)] bg-[var(--color-panel)]">
        <header className="flex-none px-4 py-2 border-b border-[var(--color-divider)]">
          <h1 className="m-0 text-base font-semibold">상품 상세</h1>
          <p className="m-0 text-xs text-black/50">상품을 고르면 그 브랜드 공식 사이트에서 같은 상품을 찾습니다.</p>
        </header>
        <div className="flex-1 min-h-0 p-4">
          <BrandProductPicker picked={product} onPick={pick} />
        </div>
      </section>

      {/* 오른쪽 2 — 브랜드 사이트 검색 결과 */}
      <section className="col-span-2 min-h-0 overflow-y-auto vt-scroll">
        {!product ? (
          <p className="m-6 text-sm text-black/50">왼쪽에서 브랜드를 고르고 상품을 고르세요.</p>
        ) : (
          <div className="p-5 flex flex-col gap-4">
            <PickedProduct product={product} />

            <BrandApiBar data={shown?.data ?? null} loading={loading} />

            <form onSubmit={onSubmit} className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="브랜드 사이트에서 찾을 검색어"
                className="flex-1 h-9 px-3 rounded-lg border border-[var(--color-divider)] bg-white text-sm outline-none focus:border-[var(--color-accent-700)]"
              />
              <button
                type="submit"
                disabled={!draft.trim() || loading}
                className="h-9 px-4 rounded-lg bg-[var(--color-accent-700)] text-white text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                찾기
              </button>
            </form>

            <Results state={shown} loading={loading} />
          </div>
        )}
      </section>
    </div>
  );
}

/** 고른 상품 — 네이버 카탈로그 모델에는 사진 · 가격이 없어 이름 · 경로 · 링크만 둔다. */
function PickedProduct({ product }: { product: BrandProductPick }) {
  const { brand, model } = product;
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-white border border-[var(--color-divider)]">
      <span className="text-xs text-black/50">
        {brand.displayName}
        {brand.naverBrandName && brand.naverBrandName !== brand.displayName ? ` · ${brand.naverBrandName}` : ""}
      </span>
      <h2 className="m-0 text-base font-semibold break-words">{model.name}</h2>
      <span className="text-xs text-black/50">{model.wholeCategoryName}</span>
      <a
        href={model.catalogUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-1 w-fit inline-flex items-center gap-1 text-xs text-[var(--color-accent-700)] hover:underline"
      >
        네이버 카탈로그 <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

function BrandApiBar({ data, loading }: { data: BrandSiteSearchResponse | null; loading: boolean }) {
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-black/50">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        브랜드 사이트 정보를 불러오는 중…
      </div>
    );
  }
  const { brand, adapter } = data;
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--color-panel)] border border-[var(--color-divider)] text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{brand.displayName}</span>
        {brand.apiStatus && (
          <span className={`px-2 py-0.5 rounded-full border text-xs ${STATUS_TONE[brand.apiStatus]}`}>
            {BRAND_API_STATUS_LABEL[brand.apiStatus]}
          </span>
        )}
        <span className="px-2 py-0.5 rounded-full bg-black/5 text-xs text-black/60">{ADAPTER_LABEL[adapter]}</span>
      </div>
      {brand.api ? (
        <a
          href={brand.api}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-accent-700)] hover:underline break-all"
        >
          {brand.api} <ExternalLink className="w-3 h-3 flex-none" />
        </a>
      ) : (
        <span className="text-xs text-black/50">brands.api 없음</span>
      )}
      {brand.apiStatusNote && <span className="text-xs text-black/50">{brand.apiStatusNote}</span>}
    </div>
  );
}

function Results({ state, loading }: { state: SearchState | null; loading: boolean }) {
  if (loading || !state) {
    return (
      <div className="flex items-center gap-2 text-sm text-black/60">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent-700)]" />
        브랜드 사이트에서 찾는 중…
      </div>
    );
  }
  if (state.error) return <p className="m-0 text-sm text-[var(--color-danger)]">{state.error}</p>;

  const data = state.data!;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">브랜드 사이트 결과 {data.items.length}건</span>
        {data.usedQuery && <span className="text-black/50">검색어 “{data.usedQuery}”</span>}
        {data.searchPageUrl && (
          <a
            href={data.searchPageUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--color-accent-700)] hover:underline"
          >
            사이트에서 검색 결과 보기 <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      {data.note && <p className="m-0 text-sm text-black/60">{data.note}</p>}

      <div className="grid grid-cols-4 gap-3">
        {data.items.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col rounded-xl overflow-hidden bg-white border border-[var(--color-divider)] hover:border-[var(--color-accent-700)] transition-colors"
          >
            <div className="aspect-[3/4] bg-black/5 flex items-center justify-center overflow-hidden">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <ImageOff className="w-6 h-6 text-black/30" />
              )}
            </div>
            <div className="p-2 flex flex-col gap-0.5">
              <span className="text-xs leading-snug line-clamp-2 group-hover:underline">{item.title}</span>
              {item.price && <span className="text-xs font-semibold">{item.price}</span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
