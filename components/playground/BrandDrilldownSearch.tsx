"use client";

import { useEffect, useMemo, useRef } from "react";
import { RefreshCw, Search, Sparkles, X } from "lucide-react";
import { hangulMatchIndex } from "@/lib/hangul";
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
 * 고른 레벨은 **입력칸 안에 태그로** 앉고, 그 뒤를 이어 친 글이 다음 레벨을 좁힌다.
 * 태그 끝의 X 는 '이 레벨부터 다시 고르기' — 그 아래 레벨까지 같이 물린다.
 *
 *   [입력칸]  디올 ✕  상의 ✕ | 티...        ← 태그 둘, 그 뒤에 치는 중인 글
 *
 *   ① 2자 이상        브랜드 후보
 *   ② 브랜드 3개 이하  거기에 '브랜드명 + 최상위 카테고리' 를 덧붙인다 — 한 번에 분류까지 고른다
 *   ③ 최상위 고른 뒤   그 분류의 최하위 카테고리 후보
 *   ④ 최하위 고른 뒤   상품만 남고, 치는 글이 그 상품 목록을 훑는다
 *
 * ④ 의 상품 검색은 **보는 것만 좁힌다.** 내재화 대상은 4단계 걸러내기까지로 정해지고
 * 여기서는 바뀌지 않는다 — 상품명을 치다가 '브랜드 등록' 을 눌러 900건이 3건으로 덮이면
 * 안 되기 때문이다.
 *
 * 글도 선택도 모두 부모가 든다(controlled). 고른 레벨을 물릴 때 글을 같이 비워야 하는데,
 * 둘을 나눠 들면 4단계 토글처럼 부모만 아는 길로 선택이 바뀔 때 글이 남아 어긋난다.
 *
 * 최하위 카테고리 후보(`categoryFacets`)는 부모가 준다. 내재화된 브랜드면 우리 DB 에서
 * 바로 오고, 아니면 네이버 조회가 끝나는 대로 채워진다.
 */

/** 브랜드 후보를 보여주기 시작하는 글자 수. */
const MIN_QUERY = 2;
/** 이 수 이하로 좁혀지면 '브랜드명 + 최상위 카테고리' 까지 후보에 깔아 준다. */
const KIND_SUGGEST_AT = 3;

type Suggestion =
  | {
      level: "brand";
      key: string;
      label: string;
      /** 글과 맞춰 볼 것들. */
      hays: string[];
      /** 태그 뒤에 흐리게 붙는 글 — 네이버 등록명. */
      note: string;
      brand: ClothingBrand;
    }
  | {
      level: "kind";
      key: string;
      label: string;
      hays: string[];
      brand: ClothingBrand;
      kind: ClothingKindDef;
      /** 내재화된 분류면 그 상품 수. */
      saved: number | null;
    }
  | {
      level: "category";
      key: string;
      label: string;
      hays: string[];
      wholeCategoryName: string;
      count: number;
    };

/** 태그로 앉은 레벨. 'brand' 를 물리면 그 아래가 다 딸려 온다. */
type Level = "brand" | "kind" | "category";

interface BrandDrilldownSearchProps {
  /** 옷 브랜드 전체. 아직 못 받았으면 null. */
  brands: ClothingBrand[] | null;
  brandsError: string | null;
  onReloadBrands: () => void;
  /** 먼저 내재화하기로 한 브랜드 — 빠른 선택 줄. */
  targets: ClothingBrand[];

  /** 태그 뒤에 치는 중인 글. 부모가 든다. */
  query: string;
  onQueryChange: (next: string) => void;

  /** 지금 고른 경로 — 그대로 태그가 된다. */
  picked: ClothingBrand | null;
  kind: ClothingKind | null;
  /** 고른 최하위 카테고리(wholeCategoryName). 여럿을 켠 상태면 null. */
  category: string | null;

  /** 브랜드 id → 내재화 현황. 최상위 후보의 ✓ 를 붙이는 데 쓴다. */
  summaries: Record<number, BrandCatalogSummary | undefined>;
  /** 후보가 좁혀지면 그 브랜드들의 현황을 받아 오라고 부모에게 알린다. */
  onNeedSummaries: (brands: ClothingBrand[]) => void;

  /** 지금 분류에서 고를 수 있는 최하위 카테고리. */
  categoryFacets: Facet[];
  /** 조회 중이면 그 문구. */
  progress: string | null;
  /** 토큰이 없으면 아직 내재화하지 않은 분류를 열 수 없다. */
  canQuery: boolean;

  /** 아래 넷은 모두 글도 같이 비운다(부모가 한다). */
  onPickBrand: (brand: ClothingBrand) => void;
  onPickKind: (brand: ClothingBrand, kind: ClothingKind) => void;
  /** 최상위 카테고리만 물린다(브랜드는 남긴다). */
  onClearKind: () => void;
  onPickCategory: (wholeCategoryName: string | null) => void;
  /** 경로를 통째로 비운다. */
  onReset: () => void;
}

export default function BrandDrilldownSearch({
  brands,
  brandsError,
  onReloadBrands,
  targets,
  query,
  onQueryChange,
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
  onPickCategory,
  onReset,
}: BrandDrilldownSearchProps) {
  /** X 로 레벨을 물린 뒤 바로 이어 칠 수 있게 커서를 돌려준다. */
  const inputRef = useRef<HTMLInputElement>(null);
  const kindDef = CLOTHING_KINDS.find((def) => def.key === kind) ?? null;

  /** 무엇을 고를 차례인가. 태그가 깊을수록 다음 단계다. */
  const stage: "brand" | "kind" | "category" | "product" = !picked
    ? "brand"
    : !kind
      ? "kind"
      : !category
        ? "category"
        : "product";

  /**
   * 글에서 브랜드에 해당하는 부분을 집어낸다.
   *
   * 태그가 생기면 글은 그 아래 레벨의 것만 남으니 보통은 글 전체가 브랜드명이다. 다만
   * 아직 아무 태그도 없을 때 "디올 상의" 처럼 한 번에 치는 경우가 있다 — 그때는 브랜드명
   * 으로 안 걸리므로 뒤 낱말부터 하나씩 떼어 보며 처음 걸리는 것을 브랜드로 본다.
   */
  const brandMatches = useMemo(() => {
    if (!brands || stage !== "brand") return [];
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
  }, [brands, query, stage]);

  /** 후보가 KIND_SUGGEST_AT 이하로 좁혀지면 그 브랜드들의 내재화 현황이 필요하다. */
  useEffect(() => {
    if (brandMatches.length === 0 || brandMatches.length > KIND_SUGGEST_AT) return;
    onNeedSummaries(brandMatches);
  }, [brandMatches, onNeedSummaries]);

  const kindRow = (brand: ClothingBrand, def: ClothingKindDef, withBrand: boolean): Suggestion => ({
    level: "kind",
    key: `${brand.id}:${def.key}`,
    label: withBrand ? `${brand.displayName} ${def.label}` : def.label,
    hays: withBrand
      ? [`${brand.displayName} ${def.label}`, `${brand.naverBrandName ?? ""} ${def.label}`]
      : [def.label, ...def.keywords],
    brand,
    kind: def,
    saved: summaries[brand.naverBrandId]?.kinds.find((k) => k.kind === def.key)?.modelCount ?? null,
  });

  const suggestions: Suggestion[] = useMemo(() => {
    // 상품 단계의 글은 상품 검색어다. 고를 것은 없다 — 목록이 바로 아래에 있다.
    if (stage === "product") return [];

    if (stage === "category") {
      return categoryFacets.map((facet) => ({
        level: "category" as const,
        key: facet.value,
        label: shortLabel(facet.value),
        hays: [facet.value],
        wholeCategoryName: facet.value,
        count: facet.count,
      }));
    }
    if (stage === "kind" && picked) {
      // 브랜드는 이미 태그로 앉았으니 후보에는 분류 이름만 둔다.
      return CLOTHING_KINDS.map((def) => kindRow(picked, def, false));
    }

    // 브랜드 단계 — 후보가 적으면 분류까지 붙인 줄을 덧붙인다.
    const rows: Suggestion[] = brandMatches.map((brand) => ({
      level: "brand" as const,
      key: brand.id,
      label: brand.displayName,
      hays: [brand.displayName, brand.naverBrandName ?? "", ...brand.aliases],
      note: brand.naverBrandName && brand.naverBrandName !== brand.displayName ? brand.naverBrandName : "",
      brand,
    }));
    if (brandMatches.length === 0 || brandMatches.length > KIND_SUGGEST_AT) return rows;
    for (const brand of brandMatches) {
      for (const def of CLOTHING_KINDS) rows.push(kindRow(brand, def, true));
    }
    return rows;
    // kindRow 는 summaries · picked 만 본다 — 아래 deps 로 충분하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, picked, categoryFacets, brandMatches, summaries]);

  /** 친 글로 후보를 좁힌다. 초성 · 대소문자는 가리지 않는다. */
  const visible = useMemo(() => {
    const q = query.trim();
    if (!q) return suggestions;
    return suggestions
      .map((s) => {
        const hits = s.hays.map((hay) => hangulMatchIndex(hay, q)).filter((index) => index >= 0);
        return { s, rank: hits.length ? Math.min(...hits) : -1 };
      })
      .filter((entry) => entry.rank >= 0)
      .map((entry) => entry.s);
  }, [suggestions, query]);

  const choose = (suggestion: Suggestion) => {
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

  /** 그 레벨부터 다시 고른다 — 태그 끝의 X. 아래 레벨은 부모가 같이 물린다. */
  const removeFrom = (level: Level) => {
    if (level === "brand") onReset();
    else if (level === "kind") onClearKind();
    else onPickCategory(null);
    inputRef.current?.focus();
  };

  /** 지금 가장 깊은 태그. 글이 빈 채로 Backspace 를 치면 이것부터 물린다. */
  const deepest: Level | null = category ? "category" : kind ? "kind" : picked ? "brand" : null;

  const placeholder =
    stage === "brand"
      ? "브랜드명 · 초성 (2자 이상 — 예: ㄷㅇ · 디올 · dior)"
      : stage === "kind"
        ? "상의 · 하의 · 기타"
        : stage === "category"
          ? "최하위 카테고리 (예: 티셔츠 · ㅌㅅㅊ)"
          : "상품명으로 목록 훑기";

  const tooShort = stage === "brand" && query.trim().length < MIN_QUERY;
  const hint =
    stage === "brand"
      ? null
      : stage === "kind"
        ? "최상위 카테고리를 고르세요"
        : stage === "category"
          ? "최하위 카테고리를 고르면 상품만 남습니다"
          : "치는 글이 아래 상품 목록을 훑습니다 — 등록 대상은 그대로입니다";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* 입력칸 — 고른 레벨이 안에 태그로 앉는다 */}
        <div
          className="pg-input-tags flex-1 min-w-[360px]"
          onClick={(e) => {
            // 태그의 X 를 누른 것까지 가로채지 않게 빈자리만 본다.
            if (e.target === e.currentTarget) inputRef.current?.focus();
          }}
        >
          <Search className="w-3.5 h-3.5 flex-none text-black/40" />
          {picked && (
            <PathTag
              label={picked.displayName}
              title={`브랜드 ${picked.displayName}${picked.naverBrandName ? ` · ${picked.naverBrandName}` : ""}`}
              clearLabel="브랜드부터 다시 고르기"
              onClear={() => removeFrom("brand")}
            />
          )}
          {kindDef && (
            <PathTag
              label={kindDef.label}
              title={`최상위 카테고리 ${kindDef.label}`}
              clearLabel="최상위 카테고리부터 다시 고르기"
              onClear={() => removeFrom("kind")}
            />
          )}
          {category && (
            <PathTag
              label={category.split(">").pop() ?? category}
              title={category}
              clearLabel="최하위 카테고리부터 다시 고르기"
              onClear={() => removeFrom("category")}
            />
          )}
          <input
            ref={inputRef}
            placeholder={placeholder}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              // 글이 빈 채로 Backspace — 가장 깊은 태그를 물린다(태그 입력칸의 관례).
              if (e.key === "Backspace" && query === "" && deepest) {
                e.preventDefault();
                removeFrom(deepest);
                return;
              }
              // Enter 는 맨 위 후보를 고른다. 한글 조합 중의 Enter 는 무시한다.
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
              e.preventDefault();
              const first = visible[0];
              if (first) choose(first);
            }}
            spellCheck={false}
          />
          {(picked || query) && (
            <button
              type="button"
              onClick={() => {
                onReset();
                inputRef.current?.focus();
              }}
              aria-label="전부 비우기"
              title="전부 비우기"
              className="w-6 h-6 flex-none rounded-full hover:bg-black/10 flex items-center justify-center"
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
              : stage === "product"
                ? "상품 검색 중"
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
                onClick={() => onPickBrand(brand)}
                title={`먼저 내재화하기로 한 브랜드 · 네이버 id ${brand.naverBrandId}`}
              >
                <Sparkles className="w-3 h-3 inline-block mr-1 text-[var(--color-accent-700)]" />
                {brand.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 후보 */}
      {!tooShort && stage !== "product" && (
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
                  disabled={s.level === "kind" && !canQuery && s.saved === null}
                  onClick={() => choose(s)}
                  title={
                    s.level === "kind" && !canQuery && s.saved === null
                      ? "토큰을 먼저 발급하세요 (내재화된 분류는 토큰 없이도 열립니다)"
                      : s.level === "category"
                        ? s.wholeCategoryName
                        : s.label
                  }
                >
                  {s.label}
                  {s.level === "category" && <span className="ml-1 text-black/45">{s.count}</span>}
                  {s.level === "kind" && s.saved !== null && (
                    <span
                      className="ml-1 text-[var(--color-accent-700)]"
                      title="내재화됨 — 우리 DB 에서 바로 내려갑니다"
                    >
                      ✓ {s.saved}
                    </span>
                  )}
                  {s.level === "brand" && s.note && (
                    <span className="ml-1 text-black/45">{s.note}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {hint && <p className="m-0 pl-[80px] text-[18.9px] text-black/50">{hint}</p>}
    </div>
  );
}

/**
 * 입력칸 안에 앉는 레벨 하나 — 끝의 X 는 '이 레벨부터 다시 고르기' 다.
 * 전부 비우기(입력칸 오른쪽 끝 X)와 달리 위 레벨은 남는다.
 */
function PathTag({
  label,
  title,
  clearLabel,
  onClear,
}: {
  label: string;
  title: string;
  /** X 의 접근성 이름 · 툴팁. */
  clearLabel: string;
  onClear: () => void;
}) {
  return (
    <span
      title={title}
      className="flex-none pl-2 pr-0.5 py-0.5 rounded-full border border-[var(--pg-line-strong)] bg-[rgba(182,130,53,0.10)] flex items-center gap-1 max-w-[240px] text-[19.8px]"
    >
      <span className="font-semibold text-black truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={clearLabel}
        title={clearLabel}
        className="w-6 h-6 flex-none rounded-full hover:bg-black/15 flex items-center justify-center"
      >
        <X className="w-3 h-3 text-black" />
      </button>
    </span>
  );
}
