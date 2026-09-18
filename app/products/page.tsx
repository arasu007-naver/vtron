"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ExternalLink, RefreshCw, Search } from "lucide-react";
import Pagination from "@/components/playground/Pagination";
import ProductEditModal from "@/components/playground/ProductEditModal";
import {
  fetchProductFacets,
  fetchProducts,
  updateProduct,
  type ProductFacets,
  type ProductFilters,
  type ProductPage,
  type ProductPatch,
  type ProductRow,
  type ProductSort,
} from "@/lib/playground/products-client";

/**
 * 상품 페이지 — stmx-web 상품 마스터(products) 목록.
 *
 *   ┌ 조회 ─────────────────────────────────────────────────────────┐
 *   │ 브랜드 · 카테고리 · 제품명 · 품번                              │
 *   ├ 페이지 ───────────────────────────────────────────────────────┤
 *   │ 페이지 단추                 가장 최근 [번호][이동] 가장 오래된 │
 *   ├ 목록 ─────────────────────────────────────────────────────────┤
 *   │ 상품 카드(이미지 · 상품명 · 가격 · [갱신][열기])               │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * '갱신' 은 상품 정보를 고치는 양식 모달을, '열기' 는 새 탭에 네이버 카탈로그 상품
 * 페이지를 연다. 카테고리 · 품번은 products 에 없고 카탈로그 모델에서 온다.
 */

const PAGE_SIZE = 24;

const EMPTY_FORM = { brand: "", category: "", name: "", modelCode: "" };

const price = (value: number) => `${value.toLocaleString("ko-KR")}원`;

export default function ProductsPage() {
  /** 입력 중인 조회 조건. '조회' 를 눌러야 [[filters]] 에 반영된다. */
  const [form, setForm] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [sort, setSort] = useState<ProductSort>("recent");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<ProductFacets | null>(null);
  const [facetsError, setFacetsError] = useState<string | null>(null);
  /** 페이지 번호 입력 — '이동' 으로만 적용한다. */
  const [gotoPage, setGotoPage] = useState("");
  /** 갱신 모달에 띄운 상품. */
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 늦게 온 이전 요청이 새 목록을 덮지 않게. */
  const loadRef = useRef(0);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  useEffect(() => {
    let live = true;
    void (async () => {
      const outcome = await fetchProductFacets();
      if (!live) return;
      if ("error" in outcome) setFacetsError(outcome.error);
      else setFacets(outcome.value);
    })();
    return () => {
      live = false;
    };
  }, []);

  // 조회 조건 · 정렬 · 페이지가 바뀔 때마다 다시 읽는다.
  useEffect(() => {
    const run = ++loadRef.current;
    void (async () => {
      setLoading(true);
      setError(null);
      const outcome = await fetchProducts(filters, sort, page, PAGE_SIZE);
      if (loadRef.current !== run) return;
      setLoading(false);
      if ("error" in outcome) setError(outcome.error);
      else setData(outcome.value);
    })();
  }, [filters, sort, page]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({
      brand: form.brand || undefined,
      category: form.category || undefined,
      name: form.name.trim() || undefined,
      modelCode: form.modelCode.trim() || undefined,
    });
    setPage(1);
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setFilters({});
    setPage(1);
  };

  /** 번호 입력 → 그 페이지로. 마지막 페이지를 넘으면 마지막으로 붙인다. */
  const move = () => {
    const n = Number(gotoPage);
    if (!Number.isInteger(n) || n < 1) return;
    setPage(Math.min(n, totalPages));
  };

  const orderBy = (next: ProductSort) => {
    setSort(next);
    setPage(1);
  };

  const save = async (patch: ProductPatch) => {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    const outcome = await updateProduct(editing.id, patch);
    setSaving(false);
    if ("error" in outcome) {
      setSaveError(outcome.error);
      return;
    }
    const saved = outcome.value;
    setData((prev) =>
      prev ? { ...prev, products: prev.products.map((p) => (p.id === saved.id ? saved : p)) } : prev
    );
    setEditing(null);
  };

  const sortButton =
    "px-2.5 h-9 text-[19.8px] rounded btn flex items-center gap-1 disabled:opacity-40";

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* 첫째 줄 — 조회 */}
      <form
        onSubmit={search}
        className="flex-none px-4 py-2.5 border-b border-[var(--pg-line)] bg-[var(--color-panel)] flex items-end gap-2 flex-wrap"
      >
        <label className="flex flex-col gap-1">
          <span className="text-[18.9px] text-black/70">브랜드</span>
          <select
            className="pg-select"
            style={{ minWidth: 160 }}
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          >
            <option value="">전체</option>
            {facets?.brands.map((brand) => (
              <option key={brand.value} value={brand.value}>
                {brand.value} ({brand.count.toLocaleString("ko-KR")})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[18.9px] text-black/70">카테고리</span>
          <select
            className="pg-select"
            style={{ minWidth: 260, maxWidth: 420 }}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">전체</option>
            {facets?.categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.value} ({category.count.toLocaleString("ko-KR")})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[18.9px] text-black/70">제품명</span>
          <input
            className="pg-input"
            style={{ width: 220 }}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="부분 일치"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[18.9px] text-black/70">품번</span>
          <input
            className="pg-input"
            style={{ width: 180 }}
            value={form.modelCode}
            onChange={(e) => setForm({ ...form, modelCode: e.target.value })}
            placeholder="예: A8783-0001"
          />
        </label>

        <button
          type="submit"
          className="px-3 h-9 text-[19.8px] rounded btn btn-primary flex items-center gap-1"
        >
          <Search className="w-4 h-4" />
          조회
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-3 h-9 text-[19.8px] rounded btn btn-secondary"
        >
          초기화
        </button>
        {facetsError && (
          <span className="text-[18px] text-[#b42318]" title={facetsError}>
            브랜드 · 카테고리 목록을 불러오지 못했습니다.
          </span>
        )}
      </form>

      {/* 둘째 줄 — 페이지 단추와 이동 · 정렬 */}
      <div className="flex-none px-4 py-2 border-b border-[var(--pg-line)] flex items-center gap-3 flex-wrap">
        <Pagination
          page={page}
          totalPages={totalPages}
          disabled={loading}
          onPage={(next) => setPage(next)}
        />
        <span className="text-[19.8px] text-black/60">
          {loading
            ? "불러오는 중…"
            : error
              ? "불러오지 못했습니다."
              : data
                ? `총 ${data.total.toLocaleString("ko-KR")}건 · ${data.page} / ${totalPages} 페이지 · ${
                    data.sort === "recent" ? "가장 최근 순" : "가장 오래된 순"
                  }`
                : ""}
        </span>

        <div role="group" aria-label="페이지 이동" className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-pressed={sort === "recent"}
            title="가장 최근에 등록된 상품부터"
            className={`${sortButton} ${sort === "recent" ? "btn-primary" : "btn-secondary"}`}
            disabled={loading}
            onClick={() => orderBy("recent")}
          >
            <ArrowDownWideNarrow className="w-4 h-4" />
            가장 최근
          </button>
          <input
            className="pg-input"
            style={{ width: 84 }}
            inputMode="numeric"
            aria-label="페이지 번호"
            placeholder={String(page)}
            value={gotoPage}
            onChange={(e) => setGotoPage(e.target.value.replace(/[^\d]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                move();
              }
            }}
          />
          <button
            type="button"
            className={`${sortButton} btn-secondary`}
            disabled={loading || gotoPage === ""}
            onClick={move}
          >
            이동
          </button>
          <button
            type="button"
            aria-pressed={sort === "oldest"}
            title="가장 먼저 등록된 상품부터"
            className={`${sortButton} ${sort === "oldest" ? "btn-primary" : "btn-secondary"}`}
            disabled={loading}
            onClick={() => orderBy("oldest")}
          >
            <ArrowUpWideNarrow className="w-4 h-4" />
            가장 오래된
          </button>
        </div>
      </div>

      {/* 본문 — 상품 목록 */}
      <div className="flex-1 min-h-0 overflow-y-auto vt-scroll p-4">
        {error && <p className="m-0 text-[19.8px] text-[#b42318] whitespace-pre-wrap">{error}</p>}
        {!error && data && data.products.length === 0 && !loading && (
          <p className="m-0 text-[19.8px] text-black/55">조건에 드는 상품이 없습니다.</p>
        )}
        {!error && data && data.products.length > 0 && (
          <ul
            className="list-none m-0 p-0 grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
          >
            {data.products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} onEdit={() => setEditing(product)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProductEditModal
        key={editing?.id ?? "none"}
        product={editing}
        saving={saving}
        error={saveError}
        onSave={(patch) => void save(patch)}
        onClose={() => {
          setEditing(null);
          setSaveError(null);
        }}
      />
    </div>
  );
}

/** 상품 한 장 — 이미지 · 상품명 · 가격, 그 아래 한 줄로 갱신 · 열기. */
function ProductCard({ product, onEdit }: { product: ProductRow; onEdit: () => void }) {
  return (
    <div className="h-full rounded-md border border-[var(--pg-line)] bg-white overflow-hidden flex flex-col">
      <div className="relative bg-black/5" style={{ aspectRatio: "1 / 1" }}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="block w-full h-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[18.9px] text-black/40">
            이미지 없음
          </span>
        )}
        {(product.isSoldOut || !product.isActive) && (
          <span className="absolute left-1.5 top-1.5 flex gap-1">
            {product.isSoldOut && <span className="pg-status pg-status-5">품절</span>}
            {!product.isActive && <span className="pg-status pg-status-x">미노출</span>}
          </span>
        )}
      </div>

      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <span className="text-[18.9px] text-black/55 truncate" title={product.category ?? undefined}>
          {product.brandName}
          {product.modelCode ? ` · ${product.modelCode}` : ""}
        </span>
        <span className="text-[19.8px] text-black line-clamp-2" title={product.name}>
          {product.name}
        </span>
        <span className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[21.6px] font-semibold text-black">{price(product.salePrice)}</span>
          {product.originalPrice !== null && product.originalPrice > product.salePrice && (
            <>
              <span className="text-[18.9px] text-black/45 line-through">
                {price(product.originalPrice)}
              </span>
              {product.discountRate !== null && (
                <span className="text-[18.9px] font-semibold text-[#b42318]">
                  {product.discountRate}%
                </span>
              )}
            </>
          )}
        </span>

        <div className="mt-auto pt-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            title="상품 정보를 고친다"
            className="flex-1 h-9 text-[19.8px] rounded btn btn-secondary flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            갱신
          </button>
          <a
            href={product.naverUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="새 탭에서 상품 페이지 열기"
            className="flex-1 h-9 text-[19.8px] rounded btn btn-secondary flex items-center justify-center gap-1 no-underline"
          >
            <ExternalLink className="w-4 h-4" />
            열기
          </a>
        </div>
      </div>
    </div>
  );
}
