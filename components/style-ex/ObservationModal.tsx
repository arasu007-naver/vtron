"use client";

/* 관찰 결과 모달 — 관찰 envelope(원본 JSON)을 본다. /product-style 의 37 Features 트리 옆 [관찰 결과] FAB 가 연다.
   Esc · 바깥 클릭 · [닫기] 로 닫는다. */

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";

export function ObservationModal({
  open,
  onClose,
  title,
  observation,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  observation: unknown;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  const text = JSON.stringify(observation, null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드를 쓸 수 없는 환경 — 본문을 직접 고른다
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl bg-white shadow-2xl overflow-hidden">
        <div className="flex-none flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-divider)]">
          <h2 className="m-0 text-sm font-semibold truncate">{title}</h2>
          <button
            type="button"
            onClick={copy}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-black/60 hover:bg-black/5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "복사됨" : "JSON 복사"}
          </button>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-black/5" aria-label="닫기">
            <X className="w-4 h-4" />
          </button>
        </div>
        <pre className="flex-1 min-h-0 m-0 overflow-auto vt-scroll p-4 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap break-all select-text">
          {text}
        </pre>
      </div>
    </div>
  );
}
