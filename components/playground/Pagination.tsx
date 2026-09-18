"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * 페이지 단추 — 처음 · 이전 · 번호들 · 다음 · 마지막.
 * /products-2-link 의 Loox 목록과 /products 의 상품 목록이 같이 쓴다.
 */

/** 번호 단추를 몇 개까지 늘어놓을지. */
const PAGE_WINDOW = 5;

/** 지금 페이지를 가운데에 둔 번호들. */
export const pageNumbers = (page: number, totalPages: number) => {
  const end = Math.min(totalPages, Math.max(page - Math.floor(PAGE_WINDOW / 2), 1) + PAGE_WINDOW - 1);
  const start = Math.max(1, end - PAGE_WINDOW + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

export default function Pagination({
  page,
  totalPages,
  disabled,
  onPage,
}: {
  page: number;
  totalPages: number;
  disabled: boolean;
  onPage: (page: number) => void;
}) {
  const last = Math.max(totalPages, 1);
  const base =
    "min-w-9 h-9 px-2 text-[19.8px] rounded btn flex items-center justify-center disabled:opacity-40";
  return (
    <div role="group" aria-label="페이지" className="flex items-center gap-1">
      <button
        type="button"
        aria-label="첫 페이지"
        className={`${base} btn-secondary`}
        disabled={disabled || page <= 1}
        onClick={() => onPage(1)}
      >
        <ChevronsLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="이전 페이지"
        className={`${base} btn-secondary`}
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pageNumbers(page, last).map((n) => (
        <button
          key={n}
          type="button"
          aria-current={n === page ? "page" : undefined}
          className={`${base} ${n === page ? "btn-primary" : "btn-secondary"}`}
          disabled={disabled || n === page}
          onClick={() => onPage(n)}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        aria-label="다음 페이지"
        className={`${base} btn-secondary`}
        disabled={disabled || page >= last}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="마지막 페이지"
        className={`${base} btn-secondary`}
        disabled={disabled || page >= last}
        onClick={() => onPage(last)}
      >
        <ChevronsRight className="w-4 h-4" />
      </button>
    </div>
  );
}
