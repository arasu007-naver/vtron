"use client";

import { Plus, X } from "lucide-react";
import { newRow } from "@/lib/playground/client";
import type { KeyValueRow } from "@/types/playground";

/**
 * 쿼리 파라미터 · 헤더 편집기.
 *
 * 행마다 체크박스로 켜고 끌 수 있다. 지우지 않고 꺼두면 프리셋이 알려준
 * 선택 파라미터를 그대로 남겨둔 채 실험할 수 있다.
 */

interface KeyValueEditorProps {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  emptyLabel?: string;
}

export default function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = "이름",
  valuePlaceholder = "값",
  emptyLabel = "행이 없습니다.",
}: KeyValueEditorProps) {
  const patch = (id: string, next: Partial<KeyValueRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...next } : r)));

  return (
    <div className="flex flex-col gap-1">
      {rows.length === 0 && (
        <p className="m-0 py-2 text-[20.7px] text-black">{emptyLabel}</p>
      )}

      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => patch(row.id, { enabled: e.target.checked })}
            title={row.enabled ? "요청에 포함됨" : "제외됨"}
            className="w-3.5 h-3.5 accent-[var(--color-accent)] cursor-pointer flex-shrink-0"
          />
          <input
            className="pg-input flex-[0_0_30%] min-w-0"
            placeholder={keyPlaceholder}
            value={row.key}
            onChange={(e) => patch(row.id, { key: e.target.value })}
            spellCheck={false}
          />
          <input
            className="pg-input flex-1 min-w-0"
            placeholder={valuePlaceholder}
            value={row.value}
            onChange={(e) => patch(row.id, { value: e.target.value })}
            spellCheck={false}
          />
          {row.note && (
            <span
              className="text-[18.9px] text-black whitespace-nowrap max-w-[140px] truncate"
              title={row.note}
            >
              {row.note}
            </span>
          )}
          <button
            type="button"
            onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
            title="행 삭제"
            aria-label="행 삭제"
            className="p-1 rounded text-black hover:text-black hover:bg-[rgba(32,31,29,0.05)] flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...rows, newRow()])}
        className="self-start mt-1 px-2 py-1 text-[20.7px] rounded btn btn-secondary flex items-center gap-1"
      >
        <Plus className="w-3 h-3" />
        <span>행 추가</span>
      </button>
    </div>
  );
}
