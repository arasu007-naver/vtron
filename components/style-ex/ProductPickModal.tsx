"use client";

import { useEffect } from "react";
import { Loader2, X } from "lucide-react";
import ProductSearch from "@/components/tryon/ProductSearch";
import type { CatalogProduct } from "@/lib/tryon/product-catalog";

/**
 * 상품 Style ID 추출 — 등록된 상품을 찾아 그 상품 사진을 /style-ex 의 입력 이미지로 쓴다.
 *
 * 바디는 stmx-web 모바일 앱의 상품 추가 모달(`loox-product-search.tsx`)을 옮긴
 * [[ProductSearch]] 를 그대로 쓴다 — 브랜드 → 카테고리 → 상품명 순서로 좁히고,
 * 사진을 누르면 원본을 크게 본다. 모바일 앱과 달리 한 장만 고르므로 자리 단추는 끄고,
 * 줄을 누르면 곧바로 [[onPick]] 이다. 사진을 받는 동안은 모달을 열어 두고, 받으면 부모가 닫는다.
 */
export default function ProductPickModal({
  open,
  loading,
  error,
  onPick,
  onClose,
}: {
  open: boolean;
  /** 고른 상품의 사진을 받는 중. 그동안 다른 상품을 고르지 못하게 덮는다. */
  loading: string | null;
  error: string | null;
  onPick: (product: CatalogProduct) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={() => !loading && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="상품 Style ID 추출"
        className="relative w-[520px] max-w-full h-[min(720px,85vh)] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[rgba(32,31,29,0.14)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex-none flex items-center justify-between gap-3 px-5 py-3 border-b border-[var(--color-divider)] bg-[var(--color-panel)]">
          <div className="min-w-0">
            <h3 className="m-0 font-semibold text-base text-black">상품 Style ID 추출</h3>
            <p className="m-0 text-xs text-black/50">상품을 고르면 그 상품 사진이 추출할 이미지가 됩니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(loading)}
            aria-label="닫기"
            className="w-7 h-7 flex-none rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 text-[#201f1d]" />
          </button>
        </header>

        <div className="flex-1 min-h-0 p-4">
          <ProductSearch slotButtons={false} onPick={onPick} />
        </div>

        {error && (
          <p className="flex-none m-0 px-5 py-2 text-xs text-[var(--color-danger)] border-t border-[var(--color-divider)]">
            {error}
          </p>
        )}

        {loading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2 text-sm text-black/70">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="max-w-[80%] truncate">{loading}</span>
            <span className="text-xs text-black/50">상품 사진을 불러오는 중…</span>
          </div>
        )}
      </div>
    </div>
  );
}
