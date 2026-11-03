"use client";

/* 관찰 결과 · 판정 결과 JSON 모달 — /product-style 에서 원본 JSON 또는 JSON 트리를 모달로 본다.
   Esc · 바깥 클릭 · [닫기] 로 닫는다. */

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Copy, X } from "lucide-react";

const CHUNK = 100;

const previewOf = (value: unknown): string => {
  if (Array.isArray(value)) return `[] ${value.length}개`;
  const keys = Object.keys(value as object);
  return `{} ${keys.length}개${keys.length > 0 ? ` · ${keys.slice(0, 3).join(", ")}${keys.length > 3 ? " …" : ""}` : ""}`;
};

function JsonLeaf({ value }: { value: unknown }) {
  if (value === null) return <span className="text-black/45">null</span>;
  switch (typeof value) {
    case "string":
      return <span className="text-[#2f6f43]">&quot;{value}&quot;</span>;
    case "number":
      return <span className="text-[#2a5b8a]">{String(value)}</span>;
    case "boolean":
      return <span className="text-[#8a5a15]">{String(value)}</span>;
    default:
      return <span className="text-black/45">{String(value)}</span>;
  }
}

function JsonTreeNode({
  label,
  value,
  depth,
  expandDepth,
  isLast,
}: {
  label?: string;
  value: unknown;
  depth: number;
  expandDepth: number;
  isLast: boolean;
}) {
  const isBranch = value !== null && typeof value === "object";
  const [open, setOpen] = useState(depth < expandDepth);
  const [shown, setShown] = useState(CHUNK);

  const keyPart = label !== undefined && (
    <>
      <span className="text-[#6b4a8a]">&quot;{label}&quot;</span>
      <span className="text-black/40">: </span>
    </>
  );

  if (!isBranch) {
    return (
      <div className="flex items-start py-0.5" style={{ paddingLeft: depth * 16 }}>
        <span className="w-4 flex-none" />
        <span className="break-all">
          {keyPart}
          <JsonLeaf value={value} />
          {!isLast && <span className="text-black/40">,</span>}
        </span>
      </div>
    );
  }

  const entries: [string, unknown][] = Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);
  const openBracket = Array.isArray(value) ? "[" : "{";
  const closeBracket = Array.isArray(value) ? "]" : "}";
  const visible = entries.slice(0, shown);

  return (
    <div>
      <div className="flex items-start py-0.5 hover:bg-black/[0.03] rounded" style={{ paddingLeft: depth * 16 }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-4 h-4 mt-0.5 flex-none flex items-center justify-center text-black/50 hover:text-black cursor-pointer"
          title={open ? "접기" : "펼치기"}
          aria-label={open ? "접기" : "펼치기"}
        >
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <span className="break-all">
          {keyPart}
          <span className="text-black/40">{openBracket}</span>
          {!open && (
            <>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="px-1 text-black/60 hover:text-black cursor-pointer"
              >
                {previewOf(value)}
              </button>
              <span className="text-black/40">{closeBracket}</span>
              {!isLast && <span className="text-black/40">,</span>}
            </>
          )}
          {open && entries.length === 0 && (
            <>
              <span className="text-black/40">{closeBracket}</span>
              {!isLast && <span className="text-black/40">,</span>}
            </>
          )}
        </span>
      </div>

      {open && entries.length > 0 && (
        <>
          {visible.map(([key, child], i) => (
            <JsonTreeNode
              key={key}
              label={Array.isArray(value) ? undefined : key}
              value={child}
              depth={depth + 1}
              expandDepth={expandDepth}
              isLast={i === entries.length - 1}
            />
          ))}
          {shown < entries.length && (
            <div style={{ paddingLeft: (depth + 1) * 16 + 16 }}>
              <button
                type="button"
                onClick={() => setShown((n) => n + CHUNK * 5)}
                className="text-xs text-[var(--color-accent-700)] underline underline-offset-2 cursor-pointer"
              >
                나머지 {entries.length - shown}개 중 {Math.min(CHUNK * 5, entries.length - shown)}개 더 보기
              </button>
            </div>
          )}
          <div style={{ paddingLeft: depth * 16 + 16 }}>
            <span className="text-black/40">{closeBracket}</span>
            {!isLast && <span className="text-black/40">,</span>}
          </div>
        </>
      )}
    </div>
  );
}

export function ObservationModal({
  open,
  onClose,
  title,
  observation,
  defaultView = "raw",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  observation: unknown;
  defaultView?: "raw" | "tree";
}) {
  const [copied, setCopied] = useState(false);
  const [expandDepth, setExpandDepth] = useState(3);
  const [generation, setGeneration] = useState(0);

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
          <div className="ml-auto flex items-center gap-1">
            {defaultView === "tree" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setExpandDepth(99);
                    setGeneration((g) => g + 1);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-black/60 hover:bg-black/5 cursor-pointer"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                  모두 펼치기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpandDepth(1);
                    setGeneration((g) => g + 1);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-black/60 hover:bg-black/5 cursor-pointer"
                >
                  <ChevronsDownUp className="w-3.5 h-3.5" />
                  모두 접기
                </button>
              </>
            )}
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-black/60 hover:bg-black/5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "복사됨" : "JSON 복사"}
            </button>
            <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-black/5 cursor-pointer" aria-label="닫기">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {defaultView === "tree" ? (
          <div className="flex-1 min-h-0 overflow-auto vt-scroll p-4 font-[family-name:var(--font-mono)] text-xs leading-relaxed select-text">
            <JsonTreeNode key={generation} value={observation} depth={0} expandDepth={expandDepth} isLast />
          </div>
        ) : (
          <pre className="flex-1 min-h-0 m-0 overflow-auto vt-scroll p-4 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap break-all select-text">
            {text}
          </pre>
        )}
      </div>
    </div>
  );
}
