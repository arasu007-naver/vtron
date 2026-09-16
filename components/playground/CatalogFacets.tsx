"use client";

import type { Facet } from "@/lib/playground/product-link";

/**
 * 상품링크 3·4단계의 공통 조각 — 단계 번호표와 토글 버튼 줄.
 * 상품링크(`ProductLinkSteps`)와 브랜드 내재화(`BrandCatalogSteps`)가 같이 쓴다.
 */

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
export const shortLabel = (value: string) => {
  const parts = value.split(">");
  return parts.length <= 2 ? value : `…>${parts.slice(-2).join(">")}`;
};

export function FacetRow({
  label,
  facets,
  selected,
  onToggle,
}: {
  label: string;
  facets: Facet[];
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
