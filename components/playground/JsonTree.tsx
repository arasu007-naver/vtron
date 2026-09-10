"use client";

import { useState } from "react";

/**
 * 응답 JSON 트리 뷰.
 *
 * 커머스 API 의 카테고리 목록처럼 수만 건짜리 응답이 흔해서, 접기와 부분 렌더링이
 * 필수다. 배열은 한 번에 100개까지만 그리고 나머지는 눌러서 펼친다.
 *
 * 펼침 상태는 각 노드가 들고 있고, 상단의 [모두 펼치기]/[모두 접기]는 `generation`
 * 을 바꿔 트리를 다시 마운트하는 식으로 초기화한다.
 */

const CHUNK = 100;

interface NodeProps {
  label?: string;
  value: unknown;
  depth: number;
  expandDepth: number;
  isLast: boolean;
}

const previewOf = (value: unknown): string => {
  if (Array.isArray(value)) return `[] ${value.length}개`;
  const keys = Object.keys(value as object);
  return `{} ${keys.length}개 · ${keys.slice(0, 3).join(", ")}${
    keys.length > 3 ? " …" : ""
  }`;
};

function Leaf({ value }: { value: unknown }) {
  if (value === null) return <span className="pg-json-null">null</span>;
  switch (typeof value) {
    case "string":
      return <span className="pg-json-string">&quot;{value}&quot;</span>;
    case "number":
      return <span className="pg-json-number">{String(value)}</span>;
    case "boolean":
      return <span className="pg-json-boolean">{String(value)}</span>;
    default:
      return <span className="pg-json-null">{String(value)}</span>;
  }
}

function Node({ label, value, depth, expandDepth, isLast }: NodeProps) {
  const isBranch = value !== null && typeof value === "object";
  const [open, setOpen] = useState(depth < expandDepth);
  const [shown, setShown] = useState(CHUNK);

  const keyPart = label !== undefined && (
    <>
      <span className="pg-json-key">&quot;{label}&quot;</span>
      <span className="pg-json-punct">: </span>
    </>
  );

  if (!isBranch) {
    return (
      <div className="flex items-start" style={{ paddingLeft: depth * 14 }}>
        <span className="pg-toggle invisible">▸</span>
        <span className="break-all">
          {keyPart}
          <Leaf value={value} />
          {!isLast && <span className="pg-json-punct">,</span>}
        </span>
      </div>
    );
  }

  const entries: [string, unknown][] = Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);
  const open3 = Array.isArray(value) ? "[" : "{";
  const close = Array.isArray(value) ? "]" : "}";
  const visible = entries.slice(0, shown);

  return (
    <div>
      <div className="flex items-start" style={{ paddingLeft: depth * 14 }}>
        <span
          className="pg-toggle"
          role="button"
          tabIndex={0}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setOpen((v) => !v);
          }}
          title={open ? "접기" : "펼치기"}
        >
          {open ? "▾" : "▸"}
        </span>
        <span className="break-all">
          {keyPart}
          <span className="pg-json-punct">{open3}</span>
          {!open && (
            <>
              <span className="text-black"> {previewOf(value)} </span>
              <span className="pg-json-punct">{close}</span>
              {!isLast && <span className="pg-json-punct">,</span>}
            </>
          )}
          {open && entries.length === 0 && (
            <>
              <span className="pg-json-punct">{close}</span>
              {!isLast && <span className="pg-json-punct">,</span>}
            </>
          )}
        </span>
      </div>

      {open && entries.length > 0 && (
        <>
          {visible.map(([key, child], i) => (
            <Node
              key={key}
              label={Array.isArray(value) ? undefined : key}
              value={child}
              depth={depth + 1}
              expandDepth={expandDepth}
              isLast={i === entries.length - 1}
            />
          ))}
          {shown < entries.length && (
            <div style={{ paddingLeft: (depth + 1) * 14 + 14 }}>
              <button
                type="button"
                onClick={() => setShown((n) => n + CHUNK * 5)}
                className="text-[19.8px] text-black underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0"
              >
                나머지 {entries.length - shown}개 중 {Math.min(CHUNK * 5, entries.length - shown)}개 더 보기
              </button>
            </div>
          )}
          <div style={{ paddingLeft: depth * 14 + 14 }}>
            <span className="pg-json-punct">{close}</span>
            {!isLast && <span className="pg-json-punct">,</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default function JsonTree({
  value,
  expandDepth = 2,
}: {
  value: unknown;
  expandDepth?: number;
}) {
  return (
    <div className="pg-json">
      <Node value={value} depth={0} expandDepth={expandDepth} isLast />
    </div>
  );
}
