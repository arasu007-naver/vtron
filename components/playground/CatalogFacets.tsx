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
 * 카테고리 경로는 `패션의류>여성의류>니트>풀오버` 처럼 길다. 첫 마디만 떼고 보여준다.
 *
 * 첫 마디는 옷 카테고리에서 늘 `패션의류` 라 아무것도 구분해 주지 않는다. 반대로 끝 두
 * 마디만 남기면 서로 다른 것이 같아 보인다 — 디올의 `베스트` 는 여성 · 남성 아우터와
 * 여성 · 남성 니트 밑에 넷이 있어 `…>아우터>베스트` 가 둘씩 겹친다. 첫 마디만 떼면
 * 한 브랜드 안에서 경로가 유일하므로 라벨도 유일하다. 전체 경로는 title 로 둔다.
 */
export const shortLabel = (value: string) => {
  const parts = value.split(">");
  return parts.length <= 2 ? value : parts.slice(1).join(">");
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
