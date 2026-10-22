"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Search, X } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { hangulMatchIndex } from "@/lib/hangul";
import {
  ADAPTER_LABEL,
  type BrandModelsResponse,
  type BrandOption,
  type NaverModel,
} from "@/lib/brand-site/types";

/**
 * `/product-details` 왼쪽 — 브랜드(네이버 브랜드와 매칭된 161개 전부)를 고르고 그 브랜드의 상품을 찾는다.
 *
 *   윗줄   브랜드.   초성 · 별칭으로 좁힌다. 고르면 칸 안에 태그로 앉는다.
 *   아랫줄  상품명.   브랜드를 고르기 전에는 잠겨 있다. 비워 두면 브랜드명만으로 찾는다.
 *   목록   브랜드 후보 → (고른 뒤) 상품 목록
 *
 * 내재화 여부와 관계없이 다 고를 수 있도록 상품은 우리 카탈로그가 아니라 네이버 카탈로그 모델을
 * 그때그때 찾는다(`/api/product-details/models`). 그래서 사진 · 가격이 없고, 칠 때마다 부르지
 * 않도록 잠깐 기다렸다 보낸다.
 */

const SEARCH_DEBOUNCE_MS = 400;

/** 브랜드 후보 옆 배지 — 오른쪽에서 자동 검색이 되는지 미리 보인다. */
const ADAPTER_TONE: Record<BrandOption["adapter"], string> = {
  shopify: "bg-emerald-50 text-emerald-700",
  cafe24: "bg-emerald-50 text-emerald-700",
  uniqlo: "bg-emerald-50 text-emerald-700",
  none: "bg-black/5 text-black/45",
};

export interface BrandProductPick {
  brand: BrandOption;
  model: NaverModel;
}

interface ModelsState {
  key: string;
  data: BrandModelsResponse | null;
  error: string | null;
}

export default function BrandProductPicker({
  picked,
  onPick,
}: {
  picked: BrandProductPick | null;
  onPick: (pick: BrandProductPick) => void;
}) {
  const [brands, setBrands] = useState<BrandOption[] | null>(null);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [brandQuery, setBrandQuery] = useState("");
  const [brand, setBrand] = useState<BrandOption | null>(null);

  const [productQuery, setProductQuery] = useState("");
  /** 디바운스가 끝나 실제로 보낼 상품 검색어 */
  const [sentQuery, setSentQuery] = useState("");
  const [models, setModels] = useState<ModelsState | null>(null);

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const res = await authFetch("/api/product-details/brands");
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!stale) setBrands(data.brands as BrandOption[]);
      } catch (e) {
        if (!stale) setBrandsError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      stale = true;
    };
  }, []);

  const brandRows = useMemo(() => {
    const all = brands ?? [];
    const q = brandQuery.trim();
    if (!q) return all;
    return all
      .map((b) => {
        const hits = [b.displayName, b.naverBrandName ?? "", ...b.aliases]
          .map((hay) => hangulMatchIndex(hay, q))
          .filter((i) => i >= 0);
        return { b, rank: hits.length ? Math.min(...hits) : -1 };
      })
      .filter((x) => x.rank >= 0)
      .sort((a, b) => a.rank - b.rank)
      .map((x) => x.b);
  }, [brands, brandQuery]);

  // 상품명은 잠깐 멈춘 뒤에 보낸다
  useEffect(() => {
    const timer = setTimeout(() => setSentQuery(productQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [productQuery]);

  const modelsKey = brand ? `${brand.id}\u0000${sentQuery}` : null;
  const modelsLoading = Boolean(modelsKey && models?.key !== modelsKey);
  const shownModels = models && models.key === modelsKey ? models : null;

  useEffect(() => {
    if (!brand || !modelsKey) return;
    let stale = false;
    (async () => {
      const params = new URLSearchParams({ brandId: brand.id });
      if (sentQuery) params.set("q", sentQuery);
      let next: ModelsState;
      try {
        const res = await authFetch(`/api/product-details/models?${params}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        next = { key: modelsKey, data: data as BrandModelsResponse, error: null };
      } catch (e) {
        next = { key: modelsKey, data: null, error: e instanceof Error ? e.message : String(e) };
      }
      if (!stale) setModels(next);
    })();
    return () => {
      stale = true;
    };
  }, [brand, sentQuery, modelsKey]);

  const chooseBrand = (next: BrandOption) => {
    setBrand(next);
    setBrandQuery("");
    setProductQuery("");
    setSentQuery("");
  };

  const clearBrand = () => {
    setBrand(null);
    setProductQuery("");
    setSentQuery("");
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-2">
      {/* 윗줄 — 브랜드 */}
      <div className="flex-none flex items-center gap-2 h-10 px-3 rounded-lg border border-[var(--color-divider)] bg-white">
        <Search className="w-4 h-4 flex-none text-black/40" />
        {brand ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(182,130,53,0.16)] text-sm">
            {brand.displayName}
            <button type="button" onClick={clearBrand} aria-label="브랜드 다시 고르기" className="cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ) : (
          <input
            value={brandQuery}
            onChange={(e) => setBrandQuery(e.target.value)}
            placeholder={brands ? `브랜드 ${brands.length}개 — 이름 · 초성 · 영문` : "브랜드 불러오는 중…"}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none"
          />
        )}
      </div>

      {/* 아랫줄 — 상품명 */}
      <div
        className={`flex-none flex items-center gap-2 h-10 px-3 rounded-lg border border-[var(--color-divider)] ${brand ? "bg-white" : "bg-black/[0.03]"}`}
      >
        <input
          value={productQuery}
          onChange={(e) => setProductQuery(e.target.value)}
          disabled={!brand}
          placeholder={brand ? "상품명 (비우면 브랜드 전체)" : "브랜드를 먼저 고르세요"}
          className="flex-1 min-w-0 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
        />
        {modelsLoading && <Loader2 className="w-4 h-4 flex-none animate-spin text-[var(--color-accent-700)]" />}
      </div>

      {/* 목록 */}
      <div className="flex-1 min-h-0 overflow-y-auto vt-scroll rounded-lg border border-[var(--color-divider)] bg-white">
        {!brand ? (
          brandsError ? (
            <p className="m-3 text-sm text-[var(--color-danger)]">{brandsError}</p>
          ) : !brands ? (
            <p className="m-3 text-sm text-black/50">브랜드를 불러오는 중…</p>
          ) : brandRows.length === 0 ? (
            <p className="m-3 text-sm text-black/50">맞는 브랜드가 없습니다.</p>
          ) : (
            <ul className="m-0 p-0 list-none">
              {brandRows.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => chooseBrand(b)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/[0.04] cursor-pointer"
                  >
                    <span className="truncate">{b.displayName}</span>
                    {b.naverBrandName && b.naverBrandName !== b.displayName && (
                      <span className="truncate text-xs text-black/40">{b.naverBrandName}</span>
                    )}
                    <span className={`ml-auto flex-none px-1.5 py-0.5 rounded text-[11px] ${ADAPTER_TONE[b.adapter]}`}>
                      {b.adapter === "none" ? "링크만" : ADAPTER_LABEL[b.adapter]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : modelsLoading || !shownModels ? (
          <p className="m-3 flex items-center gap-2 text-sm text-black/50">
            <Loader2 className="w-4 h-4 animate-spin" /> 네이버 카탈로그에서 찾는 중…
          </p>
        ) : shownModels.error ? (
          <p className="m-3 text-sm text-[var(--color-danger)]">{shownModels.error}</p>
        ) : shownModels.data!.models.length === 0 ? (
          <p className="m-3 text-sm text-black/50">네이버 카탈로그에서 이 브랜드 상품을 찾지 못했습니다. 상품명을 바꿔 보세요.</p>
        ) : (
          <>
            <p className="m-0 px-3 pt-2 text-xs text-black/40">
              {shownModels.data!.models.length}건 · “{shownModels.data!.usedQuery}”
            </p>
            <ul className="m-0 p-0 list-none">
              {shownModels.data!.models.map((m) => {
                const active = picked?.model.id === m.id;
                return (
                  <li key={m.id} className={active ? "bg-[rgba(182,130,53,0.12)]" : ""}>
                    <div className="flex items-start gap-2 px-3 py-2 hover:bg-black/[0.04]">
                      <button
                        type="button"
                        onClick={() => onPick({ brand, model: m })}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <span className="block text-sm leading-snug">{m.name}</span>
                        <span className="block text-xs text-black/40 truncate">
                          {m.wholeCategoryName.split(">").slice(1).join(">") || m.wholeCategoryName}
                        </span>
                      </button>
                      <a
                        href={m.catalogUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="네이버 카탈로그 열기"
                        className="flex-none mt-0.5 text-black/30 hover:text-[var(--color-accent-700)]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
