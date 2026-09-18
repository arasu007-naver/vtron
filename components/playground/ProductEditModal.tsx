"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ProductPatch, ProductRow } from "@/lib/playground/products-client";

/**
 * 상품 정보 갱신 양식 — 상품 페이지(/products) 카드의 '갱신'.
 *
 * 브랜드 · 상품명 · 가격 · 이미지 · 품절 · 노출을 고친다. 카테고리 · 품번은 카탈로그
 * 모델(brand_catalog_models)에서 온 값이라 여기서 못 고친다 — 보여만 준다.
 * 할인율은 DB 가 정가 · 판매가로 계산하므로 입력받지 않는다.
 *
 * 저장은 부모가 한다(`onSave`). 상품이 바뀌면 부모가 `key={product.id}` 로 새로 마운트해
 * 입력칸이 새 값으로 채워지게 한다.
 */

const won = (value: number | null) => (value === null ? "" : String(value));

export default function ProductEditModal({
  product,
  saving,
  error,
  onSave,
  onClose,
}: {
  product: ProductRow | null;
  saving: boolean;
  error: string | null;
  onSave: (patch: ProductPatch) => void;
  onClose: () => void;
}) {
  const [brandName, setBrandName] = useState(product?.brandName ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [salePrice, setSalePrice] = useState(won(product?.salePrice ?? null));
  const [originalPrice, setOriginalPrice] = useState(won(product?.originalPrice ?? null));
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [isSoldOut, setIsSoldOut] = useState(product?.isSoldOut ?? false);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [invalid, setInvalid] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [product, saving, onClose]);

  if (!product) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sale = Number(salePrice);
    if (!brandName.trim()) return setInvalid("브랜드를 입력하세요.");
    if (!name.trim()) return setInvalid("상품명을 입력하세요.");
    if (!Number.isInteger(sale) || sale < 0) return setInvalid("판매가는 0 이상의 정수여야 합니다.");
    let original: number | null = null;
    if (originalPrice.trim() !== "") {
      original = Number(originalPrice);
      if (!Number.isInteger(original) || original < 0) {
        return setInvalid("정가는 0 이상의 정수이거나 비어 있어야 합니다.");
      }
      if (original < sale) return setInvalid("정가는 판매가보다 작을 수 없습니다.");
    }
    setInvalid(null);
    onSave({
      brandName: brandName.trim(),
      name: name.trim(),
      salePrice: sale,
      originalPrice: original,
      imageUrl: imageUrl.trim() === "" ? null : imageUrl.trim(),
      isSoldOut,
      isActive,
    });
  };

  const label = "text-[19.8px] text-black/70";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => !saving && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label="상품 정보 갱신"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        // 크기는 인라인으로 — 임의값 클래스는 dev 서버가 새 파일을 스캔하기 전까지 CSS 에 없을 수 있다.
        style={{ width: "min(760px, 96vw)", maxHeight: "90vh" }}
        className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        <header className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--pg-line)]">
          <span className="text-[21.6px] font-semibold text-black">상품 정보 갱신</span>
          {product.modelCode && (
            <span className="pg-status pg-status-3" title="카탈로그 품번">
              {product.modelCode}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="닫기"
            title="닫기 (Esc)"
            className="ml-auto w-8 h-8 rounded-full hover:bg-black/10 flex items-center justify-center disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto vt-scroll p-4 flex gap-4">
          {/* 지금 이미지 */}
          <div className="flex-none flex flex-col gap-1.5" style={{ width: 180 }}>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                referrerPolicy="no-referrer"
                style={{ width: 180, height: 180 }}
                className="rounded object-cover bg-black/5"
              />
            ) : (
              <span
                style={{ width: 180, height: 180 }}
                className="rounded bg-black/5 flex items-center justify-center text-[18.9px] text-black/40"
              >
                이미지 없음
              </span>
            )}
            <span className="text-[18px] text-black/55 break-all">
              {product.category ?? "카테고리 모름 — 카탈로그에 모델이 없습니다"}
            </span>
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            <label className="flex flex-col gap-1">
              <span className={label}>브랜드</span>
              <input
                className="pg-input"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                maxLength={100}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={label}>상품명</span>
              <input
                className="pg-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={300}
              />
            </label>

            <div className="flex gap-2.5">
              <label className="flex-1 flex flex-col gap-1">
                <span className={label}>판매가 (원)</span>
                <input
                  className="pg-input"
                  inputMode="numeric"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value.replace(/[^\d]/g, ""))}
                />
              </label>
              <label className="flex-1 flex flex-col gap-1">
                <span className={label}>정가 (원) — 비우면 할인 없음</span>
                <input
                  className="pg-input"
                  inputMode="numeric"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value.replace(/[^\d]/g, ""))}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className={label}>이미지 URL — 비우면 이미지 없음</span>
              <input
                className="pg-input"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </label>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-[19.8px] text-black">
                <input
                  type="checkbox"
                  checked={isSoldOut}
                  onChange={(e) => setIsSoldOut(e.target.checked)}
                />
                품절
              </label>
              <label className="flex items-center gap-1.5 text-[19.8px] text-black">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                노출
              </label>
              <a
                href={product.naverUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-[18.9px] text-[var(--color-accent-700)] underline"
              >
                카탈로그 열기
              </a>
            </div>

            <code className="text-[18px] text-black/45 break-all">
              product {product.id}
              {product.naverProductId ? ` · 카탈로그 ${product.naverProductId}` : ""}
            </code>
          </div>
        </div>

        <footer className="px-4 py-2.5 border-t border-[var(--pg-line)] flex items-center gap-2">
          {(invalid || error) && (
            <p className="m-0 text-[18.9px] text-[#b42318] whitespace-pre-wrap">
              {invalid ?? error}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="ml-auto px-3 py-1.5 text-[19.8px] rounded btn btn-secondary disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1.5 text-[19.8px] rounded btn btn-primary disabled:opacity-60"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </footer>
      </form>
    </div>
  );
}
