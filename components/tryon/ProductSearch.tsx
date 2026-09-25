'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, Search, X, ImageOff, RotateCcw } from 'lucide-react';
import { authFetch } from '@/lib/auth-client';
import { hangulMatchIndex } from '@/lib/hangul';
import { cn } from '@/lib/utils';
import {
  CATALOG_PRODUCT_PAGE,
  type CatalogBrand,
  type CatalogCategory,
  type CatalogProduct,
} from '@/lib/tryon/product-catalog';

/**
 * 착장 상품 찾기 — stmx-web 모바일 앱의 `loox-product-search.tsx` 를 피팅 화면으로 옮긴 것.
 *
 * **위쪽은 붙박이, 그 아래만 스크롤한다.**
 *
 *   윗줄   브랜드.       고른 브랜드는 칸 안에 태그로 앉는다.
 *   아랫줄  상품명.       브랜드를 고르기 전에는 잠겨 있다.
 *   단추   다시 고르기.   브랜드만 두고 카테고리부터 되돌린다.
 *   칩     브랜드.       내재화된 것이 다 선다. 고르면 그 하나만 남는다.
 *   ─── 여기부터 스크롤 ───
 *   카테고리 칩 · 상품 목록
 *
 * 카테고리는 줄 목록이 아니라 `경로 (상품수)` 칩이다. 한 줄에 들어가는 만큼 담다가 넘치면 다음
 * 줄로 내려간다(브랜드 하나에 잎이 40개 안팎이라 줄 목록으로는 화면을 다 먹는다).
 * **고르면 그 칩 하나만 남고** 빈자리가 상품 목록이 된다. 같은 칩을 다시 누르면 풀린다.
 *
 * 찾는 곳은 `/brand-integration` 이 내재화해 둔 카탈로그다(`/api/tryon/catalog/*`). 네이버를
 * 부르지 않으므로 즉답이다. **읽기만 한다.**
 *
 * 검색이 어디서 일어나는지가 갈린다.
 *  - 브랜드 · 카테고리는 목록을 통째로 받아 두고 여기서 [[hangulMatchIndex]] 로 좁힌다.
 *    그래서 "ㄷㅇ" 같은 초성이 걸린다.
 *  - 상품은 한 분류에 900건까지 가 서버가 좁힌다. 그래서 **초성이 안 걸린다** — 낱말 일부를
 *    맞춘다. 칠 때마다 부르지 않도록 잠깐 기다렸다 보낸다.
 *
 * 모바일 앱과 갈리는 곳은 담는 방식이다. 저쪽은 한 벌의 룩에 옷을 여럿 담아 목록으로 쌓지만,
 * 여기서는 **자리(상의 · 하의 · 원피스)마다 사진 한 장**이라 고르면 그 자리의 것이 바뀐다.
 * 그래서 '담은 상품' 목록이 없고, 지금 어느 자리에 담기는지를 칸 아래가 알려 준다.
 */

/** 브랜드 · 상품명 검색을 시작하는 글자 수. 카테고리 칩은 쳐야 나오는 것이 아니라 처음부터 있다. */
const MIN_QUERY = 2;
/** 상품 검색을 보내기 전에 기다리는 시간. 글자마다 부르면 서버가 헛돈다. */
const SEARCH_DEBOUNCE_MS = 300;
/** 브랜드 후보 줄 수. 더 치면 좁혀진다. */
const MAX_BRAND_ROWS = 8;

export interface ProductSearchProps {
  /** 고른 상품이 담길 자리 — "상의" 처럼 사람이 읽는 말. */
  targetLabel: string;
  /** 지금 그 자리에 담긴 상품의 모델 id. 그 줄은 '담김' 으로 표시한다. */
  pickedId?: string | null;
  /** 한 장을 담는다. 자리에 이미 있던 사진은 이것으로 바뀐다. */
  onPick: (product: CatalogProduct) => void;
}

/** 초성 · 별칭까지 훑어 좁힌다. 앞에서 맞을수록 위. */
function narrow<T>(rows: T[], q: string, haystacks: (row: T) => string[]): T[] {
  const query = q.trim();
  if (!query) return rows;
  return rows
    .map((row) => {
      const hits = haystacks(row)
        .map((hay) => hangulMatchIndex(hay, query))
        .filter((index) => index >= 0);
      return { row, rank: hits.length ? Math.min(...hits) : -1 };
    })
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.row);
}

/** 응답이 오류면 본문의 error 를 말로 옮긴다. */
async function readJson<T>(res: Response, fallback: string): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { error?: string } | null)?.error || fallback);
  return data as T;
}

const message = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

export default function ProductSearch({ targetLabel, pickedId, onPick }: ProductSearchProps) {
  /** 윗줄 — 브랜드를 고르기 전에는 브랜드 이름, 고른 뒤에는 카테고리 칩 좁히기. */
  const [topQuery, setTopQuery] = useState('');
  const [brands, setBrands] = useState<CatalogBrand[] | null>(null);
  const [brand, setBrand] = useState<CatalogBrand | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[] | null>(null);
  const [category, setCategory] = useState<CatalogCategory | null>(null);
  /** 크게 보는 중인 상품 사진(원본). */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /** 아랫줄 — 상품명. */
  const [productQuery, setProductQuery] = useState('');
  /**
   * 마지막으로 돌아온 검색 결과 — 그것이 **어느 조건의 답인지**(`key`)를 같이 들고 있는다.
   *
   * 목록과 '찾는 중' 을 따로 두면 조건이 바뀔 때마다 비우고 켜야 해서, 조건이 바뀐 것을 보고
   * 상태를 되돌리는 효과가 생긴다. 대신 지금 조건의 key 와 맞는지만 보면 둘 다 계산으로 나온다 —
   * key 가 다르면 아직 답이 안 온 것이니 '찾는 중' 이고 보일 목록은 비어 있다.
   */
  const [result, setResult] = useState<{
    key: string;
    products: CatalogProduct[];
    total: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  /** 늦게 온 이전 검색이 새 결과를 덮지 않게. */
  const runRef = useRef(0);

  // 브랜드 목록은 한 번만 받는다.
  useEffect(() => {
    let cancelled = false;
    authFetch('/api/tryon/catalog/brands')
      .then((res) => readJson<{ brands: CatalogBrand[] }>(res, '브랜드를 불러오지 못했습니다.'))
      .then((data) => {
        if (!cancelled) setBrands(data.brands);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setBrands([]);
        setError(message(cause, '브랜드를 불러오지 못했습니다.'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 브랜드를 고르면 그 브랜드의 잎을 받아 둔다(최상위 + 최하위를 한 칩으로 고르게).
  useEffect(() => {
    if (!brand) return;
    let cancelled = false;
    authFetch(`/api/tryon/catalog/categories?brandId=${encodeURIComponent(brand.id)}`)
      .then((res) =>
        readJson<{ categories: CatalogCategory[] }>(res, '카테고리를 불러오지 못했습니다.')
      )
      .then((data) => {
        if (!cancelled) setCategories(data.categories);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setCategories([]);
        setError(message(cause, '카테고리를 불러오지 못했습니다.'));
      });
    return () => {
      cancelled = true;
    };
  }, [brand]);

  const trimmedQuery = productQuery.trim();
  const narrowing = trimmedQuery.length >= MIN_QUERY;

  /**
   * 지금 찾아야 할 조건. 찾을 것이 없으면 null 이다.
   *
   *  - 카테고리를 골랐으면 **치지 않아도** 그 카테고리의 상품이 쭉 나온다. 상품명은 거기서
   *    좁히는 칸이다.
   *  - 카테고리 없이 브랜드만 골랐으면 2자 이상 쳐야 브랜드 전체에서 찾는다(900건을 그냥
   *    내려보낼 수 없다).
   */
  const searchKey =
    brand && (category || narrowing)
      ? `${brand.id}|${category?.categoryId ?? ''}|${narrowing ? trimmedQuery : ''}`
      : null;

  /** 지금 조건의 답이 와 있을 때만 보여 준다. 아직이면 '찾는 중' 이다. */
  const answered = result?.key === searchKey ? result : null;
  const products = answered?.products ?? [];
  const total = answered?.total ?? 0;
  const searching = searchKey !== null && answered === null;

  useEffect(() => {
    if (!searchKey || !brand) return;
    const run = ++runRef.current;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        brandId: brand.id,
        limit: String(CATALOG_PRODUCT_PAGE),
      });
      if (category) params.set('categoryId', category.categoryId);
      if (narrowing) params.set('q', trimmedQuery);

      authFetch(`/api/tryon/catalog/products?${params}`)
        .then((res) =>
          readJson<{ products: CatalogProduct[]; total: number }>(res, '상품을 찾지 못했습니다.')
        )
        .then((data) => {
          if (runRef.current !== run) return;
          setResult({ key: searchKey, products: data.products, total: data.total });
        })
        .catch((cause: unknown) => {
          if (runRef.current !== run) return;
          setError(message(cause, '상품을 찾지 못했습니다.'));
          // 답이 온 셈 치고 빈 목록으로 둔다 — 아니면 영영 '찾는 중' 으로 돈다.
          setResult({ key: searchKey, products: [], total: 0 });
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchKey, brand, category, narrowing, trimmedQuery]);

  /** 윗줄이 내놓는 브랜드 후보. 브랜드를 고르고 나면 사라진다. */
  const brandRows = useMemo(
    () =>
      brand || !brands || topQuery.trim().length < MIN_QUERY
        ? []
        : narrow(brands, topQuery, (b) => [
            b.displayName,
            b.naverBrandName ?? '',
            ...b.aliases,
          ]).slice(0, MAX_BRAND_ROWS),
    [brand, brands, topQuery]
  );

  /** 칩으로 낼 브랜드. 고른 뒤에는 그 하나만 남는다(카테고리 칩과 같은 규칙). */
  const brandChips = !brands ? [] : brand ? [brand] : brands;

  /** 칩으로 낼 카테고리. 고른 뒤에는 그 하나만 남는다. */
  const categoryChips = useMemo(
    () =>
      !brand || !categories
        ? []
        : category
          ? [category]
          : narrow(categories, topQuery, (c) => [`${c.kindLabel} ${c.path}`, c.path, c.kindLabel]),
    [brand, categories, category, topQuery]
  );

  /**
   * 브랜드를 잡는다 — 칩을 누르든 후보 줄을 누르든 같은 일이다.
   *
   * 받아 둔 카테고리도 비운다. 브랜드가 바뀌면 잎도 바뀌는데, 새것이 올 때까지 옛 브랜드의 칩이
   * 남아 있으면 그것을 누를 수 있다.
   */
  const pickBrand = useCallback((row: CatalogBrand) => {
    setBrand(row);
    setCategories(null);
    setCategory(null);
    setTopQuery('');
    setProductQuery('');
    setResult(null);
    setError(null);
  }, []);

  const clearBrand = useCallback(() => {
    setBrand(null);
    setCategories(null);
    setCategory(null);
    setTopQuery('');
    setProductQuery('');
    setResult(null);
    setError(null);
  }, []);

  /**
   * '카테고리부터 다시 고르기' — 브랜드만 남기고 되돌린다.
   *
   * 받아 둔 카테고리 목록(`categories`)은 그대로 둔다. 브랜드가 그대로니 다시 받을 것이 없고,
   * 고른 칩만 풀면 칩이 전부 돌아와 곧바로 다음 분류를 고를 수 있다. 브랜드는 두 칸 중 고르기
   * 가장 비싼 값이고(2자 이상 쳐야 후보가 나온다) 한 벌을 같은 브랜드로 채우는 일이 흔하다.
   */
  const nextProduct = useCallback(() => {
    setCategory(null);
    setTopQuery('');
    setProductQuery('');
    setResult(null);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 붙박이 — 아래가 아무리 길어져도 여기는 늘 보인다. */}
      <div className="space-y-1.5 flex-shrink-0">
        {/* 윗줄 — 브랜드. 고른 것은 칸 안에 태그로 앉는다. */}
        <div className="flex flex-wrap items-center gap-1 min-h-7 px-1.5 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-1 focus-within:ring-gray-400">
          <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
          {brand && (
            <span className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full bg-gray-900 dark:bg-gray-100 max-w-[60%]">
              <span className="text-[8px] font-semibold text-white dark:text-gray-900 truncate">
                {brand.displayName}
              </span>
              <button
                type="button"
                onClick={clearBrand}
                title={`${brand.displayName} 다시 고르기`}
                className="text-white/80 dark:text-gray-900/80 hover:text-white dark:hover:text-black cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          <input
            type="text"
            value={topQuery}
            onChange={(e) => setTopQuery(e.target.value)}
            disabled={Boolean(category)}
            spellCheck={false}
            autoComplete="off"
            placeholder={
              brand
                ? category
                  ? '카테고리를 바꾸려면 아래 칩을 다시 누르세요'
                  : '카테고리 좁히기 (예: 티셔츠 · ㅌㅅㅊ)'
                : '브랜드 (2자 이상 — 예: ㄷㅇ · 디올)'
            }
            className="flex-1 min-w-[90px] bg-transparent text-[8.5px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed"
          />
        </div>

        {/* 아랫줄 — 상품명. 브랜드를 고르기 전에는 잠겨 있다. */}
        <div
          className={cn(
            'flex items-center gap-1 min-h-7 px-1.5 py-1 rounded-md border',
            brand
              ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-1 focus-within:ring-gray-400'
              : 'border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40'
          )}
        >
          <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            disabled={!brand}
            spellCheck={false}
            autoComplete="off"
            placeholder={
              brand
                ? category
                  ? '상품명으로 좁히기'
                  : `${brand.displayName} 상품명 (2자 이상)`
                : '브랜드를 먼저 고르세요'
            }
            className="flex-1 min-w-0 bg-transparent text-[8.5px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed"
          />
          {searching && <Loader2 className="w-3 h-3 text-gray-400 animate-spin flex-shrink-0" />}
        </div>

        {/*
         * 되돌아오는 자리. 상품을 집고 나면 눈이 목록(바로 아래)에 있고, 그 손이 그대로 닿는
         * 곳에서 다음 한 바퀴가 시작된다. 브랜드를 고르기 전에는 되돌릴 것이 없어 잠가 둔다.
         */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={!brand}
            onClick={nextProduct}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[8px] font-medium transition-colors',
              brand
                ? 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
                : 'border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed'
            )}
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>카테고리부터 다시 고르기</span>
          </button>

          <span className="text-[8px] text-gray-500 dark:text-gray-400 truncate">
            고른 상품은{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{targetLabel}</span>
            에 담깁니다
          </span>
        </div>
      </div>

      {/*
       * 브랜드 — 고를 수 있는 것이 칩으로 다 선다. 윗줄에 2자 이상 쳐야 후보가 나오던 것과 달리,
       * 무엇을 고를 수 있는지가 처음부터 보인다(브랜드 이름을 모르면 칠 수도 없다).
       *
       * **여기 없는 브랜드는 아직 못 고른다** — 내재화된 것만 내려온다. 고르면 그 칩만 남고
       * 빈자리는 아래 목록에 내준다. 같은 칩을 다시 누르면 풀려 전부 돌아온다.
       */}
      {brandChips.length > 0 && (
        <div
          className={cn(
            'mt-2 flex flex-wrap gap-1 overflow-y-auto vt-scroll flex-shrink-0',
            brand ? 'max-h-6' : 'max-h-16'
          )}
        >
          {brandChips.map((row) => {
            const on = brand?.id === row.id;
            return (
              <button
                key={row.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => (on ? clearBrand() : pickBrand(row))}
                className={cn(
                  'px-1.5 py-0.5 rounded-full border text-[8px] font-medium truncate max-w-full transition-all cursor-pointer',
                  on
                    ? 'bg-gray-900 border-gray-900 text-white dark:bg-gray-100 dark:border-gray-100 dark:text-gray-900'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {row.displayName}
              </button>
            );
          })}
        </div>
      )}

      {brands === null && (
        <div className="mt-2 flex items-center gap-1 text-[8px] text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>브랜드를 불러오는 중…</span>
        </div>
      )}
      {brands?.length === 0 && !error && (
        <p className="mt-2 text-[8px] text-gray-400 leading-relaxed">
          내재화된 브랜드가 없습니다. /brand-integration 에서 브랜드를 먼저 등록하세요.
        </p>
      )}

      {/* 여기부터 스크롤 — 칩이 여러 줄이 되거나 상품이 서른 건이어도 위 두 칸은 자리를 지킨다. */}
      <div className="flex-1 min-h-0 overflow-y-auto vt-scroll mt-2 pr-1">
        {brandRows.map((row) => (
          <Row
            key={row.id}
            title={row.displayName}
            hint={`${row.naverBrandName ?? ''}  상품 ${row.modelCount.toLocaleString()}`}
            onPick={() => pickBrand(row)}
          />
        ))}

        {categoryChips.length > 0 && (
          <div className="flex flex-wrap gap-1 pb-2">
            {categoryChips.map((chip) => {
              const on = category?.categoryId === chip.categoryId;
              return (
                <button
                  key={chip.categoryId}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => {
                    setCategory(on ? null : chip);
                    setTopQuery('');
                  }}
                  className={cn(
                    'px-1.5 py-0.5 rounded-full border text-[8px] font-medium max-w-full truncate transition-all cursor-pointer',
                    on
                      ? 'bg-gray-900 border-gray-900 text-white dark:bg-gray-100 dark:border-gray-100 dark:text-gray-900'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  {chip.path} ({chip.modelCount.toLocaleString()})
                </button>
              );
            })}
          </div>
        )}

        {products.map((row) => (
          <Row
            key={row.id}
            title={row.name}
            // 카테고리를 골랐으면 모든 줄이 같은 경로라 적어 봐야 눈만 어지럽다.
            hint={category ? '' : row.path}
            thumb={row.imageUrl}
            // 사진이 없으면 피팅에 넣을 것이 없다. 줄은 두되 고르지 못하게 막는다.
            disabled={!row.originalImageUrl}
            picked={pickedId === row.id}
            onPick={() => onPick(row)}
            onPreview={() => setPreviewUrl(row.originalImageUrl ?? row.imageUrl)}
          />
        ))}

        {brand && !searching && products.length === 0 && (category || narrowing) && (
          <p className="pt-1.5 text-[8px] text-gray-400">
            {!narrowing
              ? '이 카테고리에 상품이 없습니다.'
              : `'${productQuery.trim()}' 에 맞는 상품이 없습니다.`}
          </p>
        )}
        {total > products.length && (
          <p className="pt-1.5 text-[8px] text-gray-400">
            {`${total.toLocaleString()}건 중 ${products.length}건 — 더 치면 좁혀집니다.`}
          </p>
        )}

        {error && <p className="pt-1.5 text-[8px] text-red-500">{error}</p>}
      </div>

      {/* 담기 전에 이 옷이 맞는지 원본으로 보는 자리. */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white rounded-full p-2.5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <Image
            src={previewUrl}
            alt="상품 원본 사진"
            width={800}
            height={800}
            unoptimized
            className="w-auto h-auto max-w-[min(680px,90vw)] max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 한 줄 — 왼쪽에 줄인 사진, 오른쪽에 이름과 경로.
 *
 * 사진과 글줄은 누르는 일이 다르다. **사진은 원본을 크게 본다** — 담기 전에 이 옷이 맞는지
 * 보는 자리다. 글줄은 담는다. 이미 담은 상품도 사진은 볼 수 있다. 사진이 없는 상품은 빈
 * 네모만 두고 고르지 못하게 막는다(사진 없이는 피팅할 것이 없다). 브랜드 줄처럼 사진이 없는
 * 목록은 `thumb` 를 넘기지 않아 사진 자리 자체가 없다.
 */
function Row({
  title,
  hint,
  thumb,
  onPick,
  onPreview,
  disabled = false,
  picked = false,
}: {
  title: string;
  hint: string;
  /** 줄인 사진. `null` 이면 빈 네모, 넘기지 않으면 사진 자리 없음. */
  thumb?: string | null;
  onPick: () => void;
  onPreview?: () => void;
  disabled?: boolean;
  picked?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 py-1 border-b border-gray-100 dark:border-gray-800">
      {thumb !== undefined &&
        (thumb ? (
          <button
            type="button"
            onClick={onPreview}
            title={`${title} — 크게 보기`}
            className="w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-zoom-in"
          >
            <Image
              src={thumb}
              alt={title}
              width={32}
              height={32}
              unoptimized
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className="w-8 h-8 flex-shrink-0 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <ImageOff className="w-3 h-3 text-gray-300 dark:text-gray-600" />
          </div>
        ))}

      <button
        type="button"
        disabled={disabled}
        onClick={onPick}
        className={cn(
          'flex-1 min-w-0 text-left px-1 py-0.5 rounded transition-colors',
          disabled
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
        )}
      >
        <span className="flex items-center gap-1">
          <span className="block truncate text-[8.5px] font-medium text-gray-900 dark:text-gray-100">
            {title}
          </span>
          {picked && (
            <span className="flex-shrink-0 text-[7px] font-medium px-1 py-px rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              담김
            </span>
          )}
        </span>
        {hint && <span className="block truncate text-[7.5px] text-gray-400">{hint}</span>}
      </button>
    </div>
  );
}
