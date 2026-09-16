"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Database, ExternalLink, RefreshCw, Search } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { hangulMatchIndex } from "@/lib/hangul";
import { FacetRow, Step, shortLabel } from "@/components/playground/CatalogFacets";
import BrandDrilldownSearch from "@/components/playground/BrandDrilldownSearch";
import {
  BRAND_INTEGRATION_TARGETS,
  buildBrandCatalogPayload,
  fetchBrandCatalog,
  fetchBrandCatalogKind,
  saveBrandCatalog,
  type BrandCatalogSummary,
} from "@/lib/playground/brand-catalog";
import { CATALOG_PAGE_SIZE, searchBrandKindModels } from "@/lib/playground/catalog-search";
import {
  CLOTHING_KINDS,
  type ClothingBrand,
  type ClothingKind,
  type ClothingKindDef,
} from "@/lib/playground/clothing";
import {
  applyFacets,
  buildCatalogLink,
  facetsOf,
  type CatalogModel,
  type ModelPage,
} from "@/lib/playground/product-link";
import type { NaverTokenResult } from "@/types/playground";

/**
 * 브랜드 내재화 — 상품링크의 3 · 4단계를 그대로 쓰고, 그 결과를 우리 DB 에 넣는다.
 *
 *   3. 브랜드         — 입력칸 하나로 브랜드 → 최상위 카테고리 → 최하위 카테고리 를 파고든다
 *   4. 걸러내기       — 최하위 카테고리 토글. 3단계의 드릴다운과 같은 값을 본다
 *   브랜드 등록       — 확정한 것을 brand_catalog_* 에 넣는다
 *
 * 넣는 계층은 브랜드 → 최상위 카테고리(상의 · 하의 · 기타) → 최하위 카테고리 → 상품이다.
 * 한 번에 다루는 것은 브랜드 × 최상위 카테고리 하나. 분류를 바꿔 다시 누르면 그 분류가 더해진다.
 *
 * 분류를 고르면 **내재화한 것이 있는지 먼저 본다.** 있으면 우리 DB 에서 바로 내려주고
 * (토큰도 필요 없다), 없을 때만 네이버를 부른다. 내재화의 값어치가 여기서 나온다 —
 * 네이버 조회는 키워드마다 0.55 초를 쉬어 한 분류에 3~6 초가 걸린다.
 *
 * 상품링크(`ProductLinkSteps`)와 달리 Loox · 가격 · 이미지는 다루지 않는다. 여기서 만드는 것은
 * 계층이지 판매 상품이 아니다.
 */

interface BrandCatalogStepsProps {
  /** 커머스 API 토큰. 없으면 아직 내재화하지 않은 분류의 조회가 잠긴다. */
  token: NaverTokenResult | null;
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

/** 지금 목록이 어디서 왔는지. */
type Source = "catalog" | "naver";

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR") : null);

export default function BrandCatalogSteps({ token }: BrandCatalogStepsProps) {
  const [brandsState, setBrandsState] = useState<BrandsState>({ state: "idle" });
  /** 고른 브랜드. */
  const [picked, setPicked] = useState<ClothingBrand | null>(null);
  /** 누른 최상위 카테고리(상의 · 하의 · 기타). */
  const [kind, setKind] = useState<ClothingKind | null>(null);
  /** 조회 중이면 진행 문구. */
  const [progress, setProgress] = useState<string | null>(null);
  /** 조회를 시작하거나 브랜드를 바꿀 때마다 늘린다 — 도중에 바뀌면 이전 조회의 결과를 버린다. */
  const runRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<ModelPage | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  /** 네이버에서 모델이 실제로 걸린 브랜드 검색어. 우리 DB 에서 온 목록이면 null. */
  const [searchName, setSearchName] = useState<string | null>(null);
  /** 켠 최하위 카테고리(wholeCategoryName). 3단계 드릴다운과 4단계 토글이 같이 본다. */
  const [categories, setCategories] = useState<Set<string>>(new Set());
  /**
   * 드릴다운 입력칸에서 태그 뒤에 치는 중인 글.
   *
   * 선택과 같이 부모가 든다 — 레벨을 물릴 때 글도 같이 비워야 하는데, 둘을 나눠 들면
   * 4단계 토글처럼 드릴다운이 모르는 길로 선택이 바뀔 때 글만 남아 어긋난다.
   */
  const [query, setQuery] = useState("");
  /** 등록 결과 문구. */
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** 네이버 브랜드 id → 내재화 현황. 드릴다운의 ✓ 도 이걸 본다. */
  const [summaries, setSummaries] = useState<Record<number, BrandCatalogSummary>>({});
  const [catalogError, setCatalogError] = useState<string | null>(null);
  /** 이미 받았거나 받는 중인 브랜드 — 같은 것을 두 번 부르지 않게. */
  const askedRef = useRef<Set<number>>(new Set());

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
  /** 먼저 내재화하기로 한 브랜드 — 목록에 있는 것만. */
  const targets = useMemo(
    () =>
      BRAND_INTEGRATION_TARGETS.map((name) =>
        allBrands?.find((brand) => brand.displayName === name)
      ).filter((brand): brand is ClothingBrand => Boolean(brand)),
    [allBrands]
  );

  const models: CatalogModel[] = useMemo(() => page?.contents ?? [], [page]);
  const categoryFacets = useMemo(() => facetsOf(models, "wholeCategoryName"), [models]);
  /** 4단계에서 걸러 남은 것 — 이것이 그대로 내재화 대상이다. */
  const visible = useMemo(() => applyFacets(models, categories), [models, categories]);
  /** 드릴다운이 보는 '고른 최하위 카테고리'. 여럿을 켠 상태면 없는 것으로 본다. */
  const pickedCategory = categories.size === 1 ? [...categories][0] : null;
  /**
   * 최하위까지 고른 뒤의 글이 상품 검색어다.
   * **보는 것만 좁힌다** — 내재화 대상(visible)은 4단계 걸러내기까지로 정해진다.
   */
  const productTerm = pickedCategory ? query.trim() : "";
  /** 거기서 상품명 검색까지 건 것 — 화면에 뿌리는 목록. 등록에는 쓰지 않는다. */
  const shown = useMemo(
    () =>
      productTerm
        ? visible.filter((model) => hangulMatchIndex(model.name, productTerm) >= 0)
        : visible,
    [visible, productTerm]
  );

  const kindDef = CLOTHING_KINDS.find((def) => def.key === kind) ?? null;
  const catalog = picked ? (summaries[picked.naverBrandId] ?? null) : null;

  /**
   * 브랜드의 내재화 현황을 받아 둔다. `force` 면 이미 받았어도 다시 읽는다.
   * `withCategories` 면 세 분류의 최하위 카테고리까지 — 브랜드를 고른 뒤에만 쓴다(치는 중에는 무겁다).
   */
  const loadSummaries = useCallback(
    async (list: ClothingBrand[], { force = false, withCategories = false } = {}) => {
      const missing = list.filter((b) => force || !askedRef.current.has(b.naverBrandId));
      if (missing.length === 0) return;
      missing.forEach((b) => askedRef.current.add(b.naverBrandId));
      await Promise.all(
        missing.map(async (brand) => {
          const outcome = await fetchBrandCatalog(brand.naverBrandId, withCategories);
          if ("error" in outcome) {
            // 다음에 다시 시도할 수 있게 표시를 물린다.
            askedRef.current.delete(brand.naverBrandId);
            setCatalogError(outcome.error);
            return;
          }
          setCatalogError(null);
          setSummaries((prev) => ({ ...prev, [brand.naverBrandId]: outcome.value }));
        })
      );
    },
    []
  );

  /** 드릴다운이 후보를 좁혔을 때 부르는 것 — 렌더 중에 상태를 건드리지 않게 비동기로만. */
  const needSummaries = useCallback(
    (list: ClothingBrand[]) => void loadSummaries(list),
    [loadSummaries]
  );

  /** 브랜드 · 분류가 바뀌면 이전 조회 결과는 더 이상 맞지 않는다. */
  const clearModels = () => {
    setPage(null);
    setSource(null);
    setSearchName(null);
    setCategories(new Set());
  };

  const pickBrand = (brand: ClothingBrand) => {
    runRef.current++;
    setQuery("");
    setPicked(brand);
    setKind(null);
    setProgress(null);
    setError(null);
    setNotice(null);
    clearModels();
    void loadSummaries([brand], { force: true, withCategories: true });
  };

  const reset = () => {
    runRef.current++;
    setQuery("");
    setPicked(null);
    setKind(null);
    setProgress(null);
    setError(null);
    setNotice(null);
    clearModels();
  };

  const clearKind = () => {
    runRef.current++;
    setQuery("");
    setKind(null);
    setProgress(null);
    clearModels();
  };

  /** 네이버 카탈로그에서 조회. 아직 내재화하지 않았거나 '다시 조회' 를 누른 경우다. */
  const loadFromNaver = async (brand: ClothingBrand, def: ClothingKindDef, run: number) => {
    setSource("naver");
    const outcome = await searchBrandKindModels(brand, def, token?.accessToken ?? null, {
      onProgress: setProgress,
      onPartial: (partial, name) => {
        setPage(partial);
        setSearchName(name);
      },
      isStale: () => runRef.current !== run,
    });
    if (outcome.state === "stale") return;
    setProgress(null);
    if (outcome.state === "error") {
      setError(outcome.error);
      return;
    }
    setSearchName(outcome.searchName);
  };

  /**
   * 브랜드 × 최상위 카테고리의 상품.
   * 내재화한 것이 있으면 우리 DB 에서 바로, 없으면 네이버에서.
   *
   * `startCategory` 는 최상위 · 최하위를 한 줄로 골랐을 때 온다 — 목록을 받자마자 그
   * 최하위로 좁혀 보여준다. 등록 대상과는 무관하다(등록은 브랜드 전체다).
   */
  const loadKind = async (
    brand: ClothingBrand,
    next: ClothingKind,
    startCategory?: string
  ) => {
    const def = CLOTHING_KINDS.find((k) => k.key === next);
    if (!def) return;
    const run = ++runRef.current;
    setQuery("");
    setKind(next);
    setError(null);
    setNotice(null);
    clearModels();
    if (startCategory) setCategories(new Set([startCategory]));
    setProgress("내재화한 것이 있는지 보는 중…");

    const saved = await fetchBrandCatalogKind(brand.naverBrandId, next);
    if (runRef.current !== run) return;
    if (!("error" in saved)) {
      askedRef.current.add(brand.naverBrandId);
      // 한 분류만 담긴 categories 로 세 분류 전부를 덮어쓰면 드릴다운의 '한 번에 고르기' 가
      // 그 분류만 보게 된다. 이미 받아 둔 전체 목록을 지킨다.
      setSummaries((prev) => ({
        ...prev,
        [brand.naverBrandId]: {
          ...saved.value,
          categories: prev[brand.naverBrandId]?.categories ?? saved.value.categories,
        },
      }));
      if (saved.value.models.length > 0) {
        setProgress(null);
        setSource("catalog");
        setPage({
          contents: saved.value.models,
          totalElements: saved.value.models.length,
        });
        return;
      }
    }
    if (!token) {
      setProgress(null);
      setError(
        `${brand.displayName} · ${def.label} 은 아직 내재화하지 않았습니다.` +
          " 네이버에서 조회하려면 위에서 토큰을 발급하세요."
      );
      return;
    }
    await loadFromNaver(brand, def, run);
  };

  /** 우리 DB 목록을 보다가 네이버의 지금 값으로 바꿔 본다. */
  const refetchFromNaver = async () => {
    if (!picked || !kindDef) return;
    const run = ++runRef.current;
    setError(null);
    setNotice(null);
    clearModels();
    await loadFromNaver(picked, kindDef, run);
  };

  /** 4단계 토글 — 드릴다운이 모르는 길이라 글을 같이 비운다. */
  const toggleCategory = (value: string) => {
    const next = new Set(categories);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setCategories(next);
    setQuery("");
  };

  /**
   * 브랜드 등록 — 그 브랜드의 **모든 상품**을 내재화한다.
   *
   * 상의 · 하의 · 기타를 차례로 네이버에서 조회해 분류마다 한 번씩 올린다. 화면의 드릴다운과
   * 4단계 걸러내기는 보는 것만 좁히므로 여기에 아무 영향이 없다 — 잎 하나를 보고 있다가
   * 눌러도 브랜드 전체가 들어간다.
   *
   * 네이버 조회는 키워드마다 0.55 초를 쉬므로 세 분류에 15~20 초쯤 걸린다. 그래서 진행 문구를
   * 계속 갈아 준다. 한 분류가 비면(그 브랜드에 그 분류 상품이 없으면) 건너뛴다.
   */
  const registerBrand = async () => {
    if (!picked) return;
    if (!token) {
      setError("브랜드 전체를 조회하려면 토큰을 먼저 발급하세요.");
      return;
    }
    const brand = picked;
    const run = ++runRef.current;
    setSaving(true);
    setError(null);
    setNotice(null);

    const lines: string[] = [];
    let total = 0;
    for (const [index, def] of CLOTHING_KINDS.entries()) {
      setProgress(`${brand.displayName} · ${def.label} 조회 중… ${index + 1}/${CLOTHING_KINDS.length}`);
      const found = await searchBrandKindModels(brand, def, token.accessToken, {
        onProgress: (text) => setProgress(`${def.label} — ${text}`),
        onPartial: () => {},
        isStale: () => runRef.current !== run,
      });
      if (runRef.current !== run) return;
      if (found.state === "stale") return;
      if (found.state === "error") {
        setProgress(null);
        setSaving(false);
        setError(`${def.label} 조회에서 멈췄습니다 — ${found.error}`);
        return;
      }
      if (found.page.contents.length === 0) {
        lines.push(`${def.label} — 상품이 없어 건너뜁니다.`);
        continue;
      }

      setProgress(`${brand.displayName} · ${def.label} 등록 중… (상품 ${found.page.contents.length}건)`);
      const names = [found.searchName, brand.clothingQuery, brand.displayName]
        .filter((name): name is string => Boolean(name))
        .filter((name, i, all) => all.indexOf(name) === i);
      const { payload, skipped } = buildBrandCatalogPayload(brand, def, found.page.contents, names);
      const outcome = await saveBrandCatalog(payload);
      if (runRef.current !== run) return;
      if (outcome.error) {
        setProgress(null);
        setSaving(false);
        setError(`${def.label} 등록에서 멈췄습니다 — ${outcome.error}`);
        return;
      }
      total += outcome.modelCount ?? 0;
      lines.push(
        `${def.label} — 최하위 카테고리 ${outcome.categoryCount}개 · 상품 ${outcome.modelCount}건` +
          (outcome.removedCount ? ` (없어져 지운 것 ${outcome.removedCount}건)` : "") +
          (skipped.length ? ` (카테고리 경로가 없어 뺀 것 ${skipped.length}건)` : "") +
          outcome.warnings.map((w) => `\n  ${w}`).join("")
      );
    }

    setProgress(null);
    setSaving(false);
    setNotice([`${brand.displayName} 전체 ${total.toLocaleString()}건을 내재화했습니다.`, ...lines].join("\n"));
    await loadSummaries([picked], { force: true, withCategories: true });
  };

  return (
    <>
      {/* 3 · 브랜드 → 최상위 카테고리 → 최하위 카테고리 드릴다운 */}
      <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Step n={3} label="브랜드" />
          <span className="text-[19.8px] text-black/60">
            브랜드명을 치면 최상위 · 최하위 카테고리까지 이어서 좁혀집니다.
          </span>
          {picked && kindDef && (
            <span className="ml-auto flex items-center gap-1.5 text-[18.9px]">
              {source === "catalog" ? (
                <>
                  <span className="pg-status pg-status-2">내재화됨</span>
                  <span className="text-black/60">우리 DB 에서 읽었습니다.</span>
                  <button
                    type="button"
                    onClick={() => void refetchFromNaver()}
                    disabled={!token || progress !== null}
                    title={token ? "네이버 카탈로그의 지금 값으로 다시 조회한다" : "토큰을 먼저 발급하세요"}
                    className="px-2 py-0.5 rounded btn btn-secondary flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    네이버에서 다시 조회
                  </button>
                </>
              ) : source === "naver" ? (
                <>
                  <span className="pg-status pg-status-3">네이버 조회</span>
                  <span className="text-black/60">
                    검색 {page?.totalElements?.toLocaleString() ?? "-"}건 중 일치 {models.length}건
                    (키워드당 size {CATALOG_PAGE_SIZE})
                  </span>
                </>
              ) : null}
            </span>
          )}
        </div>

        <BrandDrilldownSearch
          brands={allBrands}
          brandsError={brandsState.state === "error" ? brandsState.error : null}
          onReloadBrands={() => setBrandsState({ state: "idle" })}
          targets={targets}
          picked={picked}
          kind={kind}
          category={pickedCategory}
          summaries={summaries}
          onNeedSummaries={needSummaries}
          query={query}
          onQueryChange={setQuery}
          categoryFacets={categoryFacets}
          progress={progress}
          canQuery={Boolean(token)}
          onPickBrand={pickBrand}
          onPickKind={(brand, next, startCategory) => void loadKind(brand, next, startCategory)}
          savedCategories={catalog?.categories ?? null}
          onClearKind={clearKind}
          onPickCategory={(value) => {
            setCategories(value ? new Set([value]) : new Set());
            setQuery("");
          }}
          onReset={reset}
        />

        {progress && <p className="m-0 text-[19.8px] text-black/60">{progress}</p>}
      </section>

      {/* 4 · 최하위 카테고리 토글 — 드릴다운과 같은 값을 본다 */}
      <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Step n={4} label="걸러내기" />
          <span className="text-[19.8px] text-black/60">
            보는 것만 좁힙니다 — 등록은 늘 브랜드 전체입니다. 켠 것이 없으면 전체를 봅니다.
          </span>
          {categories.size > 0 && (
            <button
              type="button"
              onClick={() => {
                setCategories(new Set());
                setQuery("");
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
          onToggle={toggleCategory}
        />
      </section>

      {/* 브랜드 등록 — 확정한 계층을 우리 DB 에 넣는다 */}
      <section className="px-4 py-3 border-b border-[var(--pg-line)] flex flex-col gap-2 bg-[var(--color-panel)]">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void registerBrand()}
            disabled={!picked || !token || saving || progress !== null}
            title={
              !picked
                ? "브랜드를 먼저 고르세요"
                : !token
                  ? "토큰을 먼저 발급하세요"
                  : `${picked.displayName} 의 상의 · 하의 · 기타를 모두 조회해 우리 DB 에 넣는다`
            }
            className="px-3 py-1.5 text-[21.6px] rounded btn btn-primary flex items-center gap-1.5 disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            {saving ? "등록 중…" : "브랜드 등록"}
          </button>
          <span className="text-[19.8px] text-black/70">
            {!picked
              ? "3단계에서 브랜드를 고르세요."
              : !token
                ? "브랜드 전체를 조회하려면 토큰이 필요합니다."
                : saving
                  ? (progress ?? "등록 중…")
                  : `${picked.displayName} 의 상의 · 하의 · 기타 전부 — 네이버 조회에 15~20초쯤 걸립니다.`}
          </span>
          <span className="text-[18.9px] text-black/55">
            아래에서 무엇을 보고 있든 등록되는 것은 브랜드 전체입니다.
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-[18.9px]">
          <span className="text-black/60">내재화 현황</span>
          {!picked ? (
            <span className="text-black/45">브랜드를 고르면 보입니다.</span>
          ) : catalog === null ? (
            <span className="text-black/45">읽는 중…</span>
          ) : catalog.kinds.length === 0 ? (
            <span className="text-black/45">아직 내재화한 분류가 없습니다.</span>
          ) : (
            catalog.kinds.map((saved) => (
              <span
                key={saved.kind}
                className="px-2 py-0.5 rounded-full border border-[var(--pg-line)] bg-white flex items-center gap-1"
                title={`마지막 등록 ${formatDate(saved.syncedAt) ?? "-"}`}
              >
                <Check className="w-3 h-3 text-[var(--color-accent-700)]" />
                <span className="font-semibold text-black">{saved.label}</span>
                <span className="text-black/60">
                  카테고리 {saved.categoryCount} · 상품 {saved.modelCount}
                </span>
              </span>
            ))
          )}
          {catalog?.catalogSyncedAt && (
            <span className="text-black/45">마지막 등록 {formatDate(catalog.catalogSyncedAt)}</span>
          )}
          {catalog && catalog.kinds.length > 0 && (
            <span className="text-black/55">— 다시 등록하면 분류마다 네이버의 지금 값으로 갈아끼웁니다.</span>
          )}
        </div>

        {catalogError && (
          <p className="m-0 text-[18.9px] text-[#b42318] whitespace-pre-wrap">{catalogError}</p>
        )}
        {error && <pre className="pg-code m-0 text-black">{error}</pre>}
        {notice && !error && (
          <p className="m-0 text-[19.8px] text-black/70 whitespace-pre-line">{notice}</p>
        )}
      </section>

      {/* 상품 — 걸러 남은 것 */}
      <div className="p-4">
        {!page && !error && (
          <p className="m-0 text-[22.5px] text-black/60">
            {progress ??
              "브랜드명을 2자 이상 치고, 이어서 최상위 · 최하위 카테고리까지 좁히세요."}
          </p>
        )}

        {page && (
          <>
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <span className="text-[20.7px] text-black">
                상품 {shown.length.toLocaleString()}건
                {productTerm && (
                  <span className="ml-1 text-black/55">
                    / 등록 대상 {visible.length.toLocaleString()}건
                  </span>
                )}
              </span>
              {productTerm && (
                // 지우는 자리는 입력칸 하나로 모은다 — 여기에 또 두면 입력칸 글과 어긋난다.
                <span
                  className="px-2 py-0.5 rounded-full border border-[var(--pg-line)] bg-white text-[18.9px] flex items-center gap-1"
                  title="입력칸의 글을 지우면 지워집니다"
                >
                  <Search className="w-3 h-3 text-[var(--color-accent-700)]" />
                  <span className="text-black">{productTerm}</span>
                </span>
              )}
              {searchName && (
                <span className="text-[18.9px] text-black/55">
                  네이버 검색어 &lsquo;{searchName}&rsquo;
                </span>
              )}
            </div>

            {shown.length === 0 ? (
              <p className="m-0 text-[20.7px] text-black/60">
                {productTerm && visible.length > 0
                  ? `'${productTerm}' 에 맞는 상품이 없습니다. 입력칸의 글을 지우면 ${visible.length.toLocaleString()}건이 다시 보입니다.`
                  : models.length > 0
                    ? "걸러낸 결과가 없습니다. 위 토글을 확인하세요."
                    : progress
                      ? "찾는 중…"
                      : "이 브랜드 · 분류에 맞는 상품이 없습니다."}
              </p>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col">
                {shown.map((model) => (
                  <li
                    key={String(model.id)}
                    className="py-1.5 border-b border-[var(--pg-line)] flex items-center gap-2 flex-wrap"
                  >
                    <span className="text-[21.6px] text-black">{model.name}</span>
                    <span className="text-[18px] text-black/50" title={model.wholeCategoryName}>
                      {shortLabel(model.wholeCategoryName ?? "")}
                    </span>
                    <a
                      href={buildCatalogLink(model.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="판매 페이지 열기"
                      className="ml-auto px-2 py-0.5 text-[18.9px] rounded btn btn-secondary flex items-center gap-1 no-underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      열기
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}
