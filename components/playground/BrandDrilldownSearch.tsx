"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { hangulMatchIndex, startsWithLoose, stripLoosePrefix } from "@/lib/hangul";
import { shortLabel } from "@/components/playground/CatalogFacets";
import type { BrandCatalogSummary } from "@/lib/playground/brand-catalog";
import {
  CLOTHING_KINDS,
  searchBrands,
  type ClothingBrand,
  type ClothingKind,
  type ClothingKindDef,
} from "@/lib/playground/clothing";
import type { Facet } from "@/lib/playground/product-link";

/**
 * 브랜드 → 최상위 카테고리 → 최하위 카테고리 를 입력칸 하나로 파고드는 검색.
 *
 * 한 줄로 계층을 좁혀 결국 상품만 남기는 것이 목적이다. 단계마다 목록이 바뀐다.
 *
 *   ① 2자 이상        브랜드 목록
 *   ② 브랜드 3개 이하  거기에 '브랜드명 + 최상위 카테고리' 를 덧붙인다 — 한 번에 분류까지 고른다
 *   ③ 최상위 고른 뒤   그 분류의 최하위 카테고리 목록
 *   ④ 최하위 고른 뒤   상품만 남고, 이어 적는 글은 그 상품 목록을 훑는다
 *
 * ④ 의 상품 검색은 **보는 것만 좁힌다.** 내재화 대상은 4단계 걸러내기까지로 정해지고
 * 여기서는 바뀌지 않는다 — 상품명을 치다가 '브랜드 등록' 을 눌러 900건이 3건으로 덮이면
 * 안 되기 때문이다. 그래서 검색어를 부모에게 따로 넘긴다(onProductTerm).
 *
 * 고른 것을 다시 입력칸 글에 적어 둔다("디올 상의 "). 그래서 지우면 그만큼 되돌아간다 —
 * `startsWithLoose` 로 글이 아직 그 경로로 시작하는지만 본다. 목록을 맞출 때는
 * `hangulMatchIndex` 라 "ㄷㅇ" · "디올 ㅅ" 처럼 초성으로도 좁혀진다.
 *
 * 최하위 카테고리 후보(`categoryFacets`)는 부모가 준다. 내재화된 브랜드면 우리 DB 에서
 * 바로 오고, 아니면 네이버 조회가 끝나는 대로 채워진다.
 */

/** 브랜드 목록을 보여주기 시작하는 글자 수. */
const MIN_QUERY = 2;
/** 이 수 이하로 좁혀지면 '브랜드명 + 최상위 카테고리' 까지 목록에 깔아 준다. */
const KIND_SUGGEST_AT = 3;

type Suggestion =
  | { level: "brand"; key: string; label: string; hint: string; brand: ClothingBrand }
  | {
      level: "kind";
      key: string;
      label: string;
      hint: string;
      brand: ClothingBrand;
      kind: ClothingKindDef;
      /** 내재화된 분류면 그 상품 수. */
      saved: number | null;
    }
  | {
      level: "category";
      key: string;
      label: string;
      hint: string;
      wholeCategoryName: string;
      count: number;
    };

interface BrandDrilldownSearchProps {
  /** 옷 브랜드 전체. 아직 못 받았으면 null. */
  brands: ClothingBrand[] | null;
  brandsError: string | null;
  onReloadBrands: () => void;
  /** 먼저 내재화하기로 한 브랜드 — 빠른 선택 줄. */
  targets: ClothingBrand[];

  /** 지금 고른 경로. */
  picked: ClothingBrand | null;
  kind: ClothingKind | null;
  /** 고른 최하위 카테고리(wholeCategoryName). 여럿을 켠 상태면 null. */
  category: string | null;

  /** 브랜드 id → 내재화 현황. 최상위 카테고리 줄의 ✓ 를 붙이는 데 쓴다. */
  summaries: Record<number, BrandCatalogSummary | undefined>;
  /** 후보가 좁혀지면 그 브랜드들의 현황을 받아 오라고 부모에게 알린다. */
  onNeedSummaries: (brands: ClothingBrand[]) => void;

  /** 지금 분류에서 고를 수 있는 최하위 카테고리. */
  categoryFacets: Facet[];
  /** 조회 중이면 그 문구. */
  progress: string | null;
  /** 토큰이 없으면 분류를 누를 수 없다. */
  canQuery: boolean;

  onPickBrand: (brand: ClothingBrand) => void;
  onPickKind: (brand: ClothingBrand, kind: ClothingKind) => void;
  /** 최상위 카테고리 선택만 푼다(브랜드는 남긴다). */
  onClearKind: () => void;
  /** 경로 뒤에 이어 적은 글 — 상품 목록을 훑는 검색어. 비면 "". */
  onProductTerm: (term: string) => void;
  onPickCategory: (wholeCategoryName: string | null) => void;
  /** 경로를 통째로 비운다. */
  onReset: () => void;
}

/** 지금 경로를 사람이 읽는 한 줄로. 입력칸 글과 맞춰 두는 값이기도 하다. */
const pathLabel = (
  brand: ClothingBrand | null,
  kind: ClothingKindDef | null,
  category: string | null
) =>
  [brand?.displayName, kind?.label, category ? category.split(">").pop() : null]
    .filter(Boolean)
    .join(" ");

export default function BrandDrilldownSearch({
  brands,
  brandsError,
  onReloadBrands,
  targets,
  picked,
  kind,
  category,
  summaries,
  onNeedSummaries,
  categoryFacets,
  progress,
  canQuery,
  onPickBrand,
  onPickKind,
  onClearKind,
  onProductTerm,
  onPickCategory,
  onReset,
}: BrandDrilldownSearchProps) {
  const [query, setQuery] = useState("");
  /** 경로 뒤에 이어 적은 글. 부모에게도 넘기지만 경로 줄에 보여 주려고 여기서도 든다. */
  const [productTerm, setProductTerm] = useState("");
  const kindDef = CLOTHING_KINDS.find((def) => def.key === kind) ?? null;

  /** 상품 검색어는 부모(목록)와 경로 줄이 같이 봐야 한다. */
  const emitProductTerm = (term: string) => {
    setProductTerm(term);
    onProductTerm(term);
  };

  /**
   * 글에서 브랜드에 해당하는 부분을 집어낸다.
   *
   * "디올" 은 그대로 걸리지만 "디올 상" 은 브랜드명으로는 안 걸린다 — 뒤에 분류가 붙었기
   * 때문이다. 그래서 뒤 낱말부터 하나씩 떼어 보며 처음 걸리는 것을 브랜드로 본다. 덕분에
   * 브랜드명과 분류를 한 번에 쳐도 목록이 나온다.
   */
  const brandMatches = useMemo(() => {
    if (!brands) return [];
    const q = query.trim();
    if (q.length < MIN_QUERY) return [];
    const tokens = q.split(/\s+/);
    for (let take = tokens.length; take >= 1; take--) {
      const prefix = tokens.slice(0, take).join(" ");
      if (prefix.length < MIN_QUERY) break;
      const found = searchBrands(brands, prefix);
      if (found.length > 0) return found;
    }
    return [];
  }, [brands, query]);

  /** 글과 맞춰 볼 것들 — 별칭 · 네이버 등록명까지 본다("dior 상" → 'DIOR 상의'). */
  const haystacksOf = (s: Suggestion): string[] => {
    if (s.level === "brand") return [s.label, s.hint, ...s.brand.aliases];
    if (s.level === "kind") {
      return [s.label, `${s.brand.naverBrandName ?? ""} ${s.kind.label}`];
    }
    return [s.label, s.hint];
  };

  /**
   * 무엇을 고를 차례인가. 고른 것이 깊을수록 다음 단계를 보여준다.
   * 최하위까지 골랐으면(product) 이어 적는 글이 상품 검색어가 된다.
   */
  const stage: "brand" | "kind" | "category" | "product" = !picked
    ? "brand"
    : !kind
      ? "kind"
      : !category
        ? "category"
        : "product";

  /** 후보가 KIND_SUGGEST_AT 이하로 좁혀지면 그 브랜드들의 내재화 현황이 필요하다. */
  useEffect(() => {
    if (stage !== "brand") return;
    if (brandMatches.length === 0 || brandMatches.length > KIND_SUGGEST_AT) return;
    onNeedSummaries(brandMatches);
  }, [stage, brandMatches, onNeedSummaries]);

  /**
   * 글을 지우면 그만큼 되돌아간다. 깊은 것부터 본다 — 최하위가 떨어져 나가도 분류는 남을 수 있다.
   * 고를 때마다 입력칸에 경로를 적어 두므로, 글이 그 경로로 시작하는 동안은 선택을 지킨다.
   */
  const changeQuery = (next: string) => {
    setQuery(next);

    // 최하위까지 골랐다면 경로 뒤에 남은 글이 상품 검색어다.
    const rest = category ? stripLoosePrefix(next, pathLabel(picked, kindDef, category)) : null;
    emitProductTerm(rest?.trim() ?? "");

    if (category && rest === null) onPickCategory(null);
    if (kind && !startsWithLoose(next, pathLabel(picked, kindDef, null))) onClearKind();
    if (picked && !startsWithLoose(next, picked.displayName)) onReset();
  };

  /** 고른 것을 입력칸 글로 되돌려 적는다 — 다음 단계의 접두사가 된다. */
  const commit = (label: string) => {
    setQuery(`${label} `);
    emitProductTerm("");
  };

  const suggestions: Suggestion[] = useMemo(() => {
    if (stage === "category" || stage === "product") {
      return categoryFacets.map((facet) => ({
        level: "category" as const,
        key: facet.value,
        label: pathLabel(picked, kindDef, facet.value),
        hint: facet.value,
        wholeCategoryName: facet.value,
        count: facet.count,
      }));
    }
    if (stage === "kind" && picked) {
      return CLOTHING_KINDS.map((def) => ({
        level: "kind" as const,
        key: `${picked.id}:${def.key}`,
        label: `${picked.displayName} ${def.label}`,
        hint: def.keywords.join(" · "),
        brand: picked,
        kind: def,
        saved: summaries[picked.naverBrandId]?.kinds.find((k) => k.kind === def.key)?.modelCount ?? null,
      }));
    }
    // 브랜드 단계 — 후보가 적으면 분류까지 붙인 줄을 덧붙인다.
    const rows: Suggestion[] = brandMatches.map((brand) => ({
      level: "brand" as const,
      key: brand.id,
      label: brand.displayName,
      hint: brand.naverBrandName ?? "",
      brand,
    }));
    if (brandMatches.length === 0 || brandMatches.length > KIND_SUGGEST_AT) return rows;
    for (const brand of brandMatches) {
      for (const def of CLOTHING_KINDS) {
        rows.push({
          level: "kind",
          key: `${brand.id}:${def.key}`,
          label: `${brand.displayName} ${def.label}`,
          hint: def.keywords.join(" · "),
          brand,
          kind: def,
          saved: summaries[brand.naverBrandId]?.kinds.find((k) => k.kind === def.key)?.modelCount ?? null,
        });
      }
    }
    return rows;
  }, [stage, picked, kindDef, categoryFacets, brandMatches, summaries]);

  /**
   * 글로 목록을 좁힌다. 경로 전체를 맞추므로 "디올 상" 은 '디올 상의' 에 걸리고,
   * 그때 브랜드 줄('디올')은 스스로 떨어져 나간다 — 이미 분류까지 친 셈이기 때문이다.
   */
  const visible = useMemo(() => {
    // 상품 단계의 글 뒤쪽은 상품 검색어다. 그걸로 최하위 목록까지 좁히면 갈아탈 길이 막힌다.
    const q = stage === "product" ? "" : query.trim();
    if (!q) return suggestions;
    return suggestions
      .map((s) => {
        const hits = haystacksOf(s)
          .map((hay) => hangulMatchIndex(hay, q))
          .filter((index) => index >= 0);
        return { s, rank: hits.length ? Math.min(...hits) : -1 };
      })
      .filter((entry) => entry.rank >= 0)
      .map((entry) => entry.s);
  }, [suggestions, query, stage]);

  const choose = (suggestion: Suggestion) => {
    commit(suggestion.label);
    if (suggestion.level === "brand") {
      onPickBrand(suggestion.brand);
      return;
    }
    if (suggestion.level === "kind") {
      if (picked?.id !== suggestion.brand.id) onPickBrand(suggestion.brand);
      onPickKind(suggestion.brand, suggestion.kind.key);
      return;
    }
    onPickCategory(suggestion.wholeCategoryName);
  };

  /** 빠른 선택 · 되돌리기는 입력칸 글도 같이 맞춰 준다. */
  const quickPick = (brand: ClothingBrand) => {
    commit(brand.displayName);
    onPickBrand(brand);
  };
  const clearAll = () => {
    setQuery("");
    emitProductTerm("");
    onReset();
  };

  const placeholder =
    stage === "brand"
      ? "브랜드명 · 초성 (2자 이상 — 예: ㄷㅇ · 디올 · dior)"
      : stage === "kind"
        ? `${picked?.displayName} 뒤에 상의 · 하의 · 기타 를 이어 적으세요`
        : stage === "category"
          ? "이어서 최하위 카테고리를 적거나 아래에서 고르세요"
          : "이어서 상품명을 적으면 아래 목록을 훑습니다";

  const tooShort = stage === "brand" && query.trim().length < MIN_QUERY;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[320px]">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
          <input
            className="pg-input pl-8 pr-8"
            placeholder={placeholder}
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter 는 맨 위 후보를 고른다. 한글 조합 중의 Enter 는 무시한다.
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
              e.preventDefault();
              const first = visible[0];
              if (first) choose(first);
            }}
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={clearAll}
              aria-label="검색어 · 선택 비우기"
              title="비우기"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5 text-black" />
            </button>
          )}
        </div>
        {brands === null && !brandsError && (
          <span className="text-[19.8px] text-black/60 whitespace-nowrap">브랜드 불러오는 중…</span>
        )}
        {brands && (
          <span className="text-[19.8px] text-black/60 whitespace-nowrap">
            {tooShort
              ? `${MIN_QUERY}자 이상 입력하세요 · 옷 브랜드 ${brands.length.toLocaleString()}`
              : `후보 ${visible.length.toLocaleString()}`}
          </span>
        )}
        {brandsError && (
          <button
            type="button"
            onClick={onReloadBrands}
            className="px-2.5 py-1 text-[20.7px] rounded btn btn-secondary flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            다시 불러오기
          </button>
        )}
      </div>

      {brandsError && (
        <p className="m-0 text-[18.9px] text-[#b42318] whitespace-pre-wrap">{brandsError}</p>
      )}

      {/* 고른 경로 — 어디까지 내려왔는지 */}
      {picked && (
        <div className="flex items-center gap-1 flex-wrap text-[19.8px]">
          <span className="text-black/60 w-[72px] flex-none">경로</span>
          <span className="font-semibold text-black">{picked.displayName}</span>
          {kindDef && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-black/35" />
              <span className="font-semibold text-black">{kindDef.label}</span>
            </>
          )}
          {category && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-black/35" />
              <span className="font-semibold text-black" title={category}>
                {category.split(">").pop()}
              </span>
            </>
          )}
          {!kindDef && <span className="text-black/50">— 최상위 카테고리를 고르세요</span>}
          {kindDef && !category && (
            <span className="text-black/50">— 최하위 카테고리를 고르면 상품만 남습니다</span>
          )}
          {category &&
            (productTerm ? (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-black/35" />
                <span className="text-black/70">
                  상품 검색 &lsquo;<span className="font-semibold text-black">{productTerm}</span>&rsquo;
                </span>
              </>
            ) : (
              <span className="text-black/50">— 이어서 상품명을 적으면 목록을 훑습니다</span>
            ))}
          <button
            type="button"
            onClick={clearAll}
            className="ml-2 px-2 py-0.5 text-[18.9px] rounded btn btn-secondary"
          >
            처음부터
          </button>
        </div>
      )}

      {/* 먼저 내재화하기로 한 브랜드 — 아무것도 고르지 않았을 때만 */}
      {!picked && targets.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-[19.8px] text-black/60 w-[72px] flex-none pt-1">먼저</span>
          <div className="flex items-center gap-1 flex-wrap">
            {targets.map((brand) => (
              <button
                key={brand.id}
                type="button"
                className="pg-tab"
                onClick={() => quickPick(brand)}
                title={`먼저 내재화하기로 한 브랜드 · 네이버 id ${brand.naverBrandId}`}
              >
                <Sparkles className="w-3 h-3 inline-block mr-1 text-[var(--color-accent-700)]" />
                {brand.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 후보 목록 */}
      {!tooShort && (
        <div className="flex items-start gap-2">
          <span className="text-[19.8px] text-black/60 w-[72px] flex-none pt-1">
            {stage === "brand" ? "브랜드" : stage === "kind" ? "최상위" : "최하위"}
          </span>
          <div className="flex items-center gap-1 flex-wrap min-h-[30px] max-h-[176px] overflow-y-auto vt-scroll">
            {visible.length === 0 ? (
              <span className="text-[18.9px] text-black/40 pt-1">
                {stage === "category"
                  ? (progress ?? "이 분류에서 나온 카테고리가 없습니다.")
                  : "맞는 것이 없습니다."}
              </span>
            ) : (
              visible.map((s) => (
                <button
                  key={`${s.level}:${s.key}`}
                  type="button"
                  className="pg-tab disabled:opacity-50"
                  data-active={
                    s.level === "category"
                      ? category === s.wholeCategoryName
                      : s.level === "kind"
                        ? picked?.id === s.brand.id && kind === s.kind.key
                        : picked?.id === s.brand.id
                  }
                  disabled={s.level === "kind" && !canQuery && s.saved === null}
                  onClick={() => choose(s)}
                  title={
                    s.level === "kind" && !canQuery && s.saved === null
                      ? "토큰을 먼저 발급하세요 (내재화된 분류는 토큰 없이도 열립니다)"
                      : s.level === "category"
                        ? s.hint
                        : `${s.label}${s.hint ? ` · ${s.hint}` : ""}`
                  }
                >
                  {s.level === "category" ? shortLabel(s.wholeCategoryName) : s.label}
                  {s.level === "category" && <span className="ml-1 text-black/45">{s.count}</span>}
                  {s.level === "kind" && s.saved !== null && (
                    <span
                      className="ml-1 text-[var(--color-accent-700)]"
                      title="내재화됨 — 우리 DB 에서 바로 내려갑니다"
                    >
                      ✓ {s.saved}
                    </span>
                  )}
                  {s.level === "brand" && s.hint && s.hint !== s.label && (
                    <span className="ml-1 text-black/45">{s.hint}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
