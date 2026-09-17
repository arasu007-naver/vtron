"use client";

import { useEffect, useRef } from "react";
import { Info, X } from "lucide-react";
import type { ModelCodeStats } from "@/lib/playground/product-link";

/**
 * '이 브랜드는 품번을 사용하지 않습니다' — 품번 칸이 비어 보이는 까닭을 알리는 모달.
 *
 * 네이버 커머스 API 에는 품번 필드가 없어 상품명에서 뽑는다(`modelCodeOf`). 루이비통 ·
 * 나이키처럼 이름 끝에 품번을 달아 주는 브랜드는 거의 다 뽑히지만, 리바이스(핏 번호 501 ·
 * 505) · 룰루레몬처럼 이름으로만 부르는 브랜드는 대부분 빈다. 그때 목록만 보면 조회가
 * 잘못된 것처럼 보이므로 한 번 알려 준다.
 *
 * 브랜드마다 한 번만 뜬다 — 분류를 옮겨 다닐 때마다 다시 막아서지 않게 부모가 센다.
 * 배경을 누르거나 Esc · 확인으로 닫힌다.
 *
 * 너비는 인라인 스타일로 준다. 임의값 클래스(`w-[460px]`)는 dev 서버의 Tailwind 가 새 파일을
 * 스캔하기 전까지 CSS 에 없어서 상자가 화면 끝까지 퍼진 적이 있다(LooxImageModal 과 같은 이유).
 */
export default function ModelCodeNoticeModal({
  brandName,
  stats,
  onClose,
}: {
  brandName: string;
  stats: ModelCodeStats;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-code-notice-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 520, maxWidth: "92vw" }}
        className="bg-white rounded-xl shadow-2xl border border-[var(--pg-line-strong)] p-4 flex flex-col gap-2.5"
      >
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-1 flex-none text-[var(--color-accent-700)]" />
          <h2
            id="model-code-notice-title"
            className="m-0 text-[21.6px] font-semibold text-black leading-snug"
          >
            이 브랜드는 품번을 사용하지 않습니다
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기 (Esc)"
            className="ml-auto flex-none w-7 h-7 rounded-full hover:bg-black/10 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-black" />
          </button>
        </div>

        <p className="m-0 text-[19.8px] text-black/75 leading-relaxed">
          {brandName} 상품 {stats.total.toLocaleString()}건 가운데 품번이 붙은 것은{" "}
          <b>{stats.withCode.toLocaleString()}건({Math.round(stats.ratio * 100)}%)</b> 뿐입니다.
          목록의 품번 칸은 대부분 비어 있습니다.
        </p>

        <p className="m-0 text-[18.9px] text-black/55 leading-relaxed">
          네이버 커머스 API 는 품번을 따로 주지 않아 상품명에서 뽑습니다. 리바이스의 501 · 505
          처럼 핏 번호나 상품명으로만 부르는 브랜드는 이름에 품번이 없습니다. 조회가 잘못된
          것이 아닙니다.
        </p>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="self-end px-3 py-1 text-[19.8px] rounded btn btn-primary"
        >
          확인
        </button>
      </div>
    </div>
  );
}
