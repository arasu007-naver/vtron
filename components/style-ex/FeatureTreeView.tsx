"use client";

/* 37 Features — 관찰 결과(관찰 envelope)의 vision feature 를 계층으로 보는 트리 (/style-ex).
   계층 · 값은 lib/style-ex/feature-tree.ts 가 정한다. 위의 상태 칩을 누르면 그 상태인 feature 만 남긴다. */

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import {
  buildFeatureTree,
  defaultOpen,
  pruneByState,
  type FeatureNode,
  type FeatureState,
} from "@/lib/style-ex/feature-tree";

const STATE_STYLE: Record<FeatureState, string> = {
  OBSERVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ABSENT: "bg-black/5 text-black/60 border-black/10",
  NOT_VISIBLE: "bg-red-50 text-red-700 border-red-200",
  UNKNOWN: "bg-amber-50 text-amber-800 border-amber-200",
};
const STATES: FeatureState[] = ["OBSERVED", "ABSENT", "NOT_VISIBLE", "UNKNOWN"];

/** 모든 노드 키 — 전체 펼치기 */
const allKeys = (nodes: FeatureNode[], out = new Set<string>()) => {
  for (const n of nodes) {
    if (n.children?.length) {
      out.add(n.key);
      allKeys(n.children, out);
    }
  }
  return out;
};

function Row({ n, depth, open, toggle }: { n: FeatureNode; depth: number; open: Set<string>; toggle: (k: string) => void }) {
  const hasKids = Boolean(n.children?.length);
  const isOpen = open.has(n.key);
  return (
    <li>
      <div
        className="flex items-baseline gap-1.5 py-0.5 pr-2 hover:bg-black/[0.03] rounded"
        style={{ paddingLeft: depth * 16 }}
      >
        {hasKids ? (
          <button
            type="button"
            onClick={() => toggle(n.key)}
            className="flex-none self-center text-black/50 hover:text-black"
            aria-label={isOpen ? "접기" : "펼치기"}
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="flex-none w-3.5" />
        )}
        <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
          {n.no != null && <span className="text-[10.5px] text-black/40 font-[family-name:var(--font-mono)]">#{n.no}</span>}
          <span className={`${hasKids && depth < 2 ? "font-semibold" : ""} font-[family-name:var(--font-mono)] text-xs`}>{n.label}</span>
          {n.state && <span className={`px-1.5 rounded border text-[10.5px] font-semibold ${STATE_STYLE[n.state]}`}>{n.state}</span>}
          {n.value && <span className="text-xs text-[var(--color-accent-800)]">{n.value}</span>}
          {n.note && <span className="text-[11.5px] text-black/50 break-words">{n.note}</span>}
        </span>
      </div>
      {hasKids && isOpen && (
        <ul>
          {n.children!.map((c) => (
            <Row key={c.key} n={c} depth={depth + 1} open={open} toggle={toggle} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FeatureTreeView({ envelope, emptyText }: { envelope: unknown; emptyText?: string }) {
  const tree = useMemo(() => buildFeatureTree(envelope), [envelope]);
  const [only, setOnly] = useState<FeatureState | null>(null);
  const [open, setOpen] = useState<Set<string> | null>(null);

  if (!tree) {
    return (
      <p className="p-3 text-xs text-black/50">
        {emptyText ?? "관찰이 끝나면 관찰 결과의 vision feature 가 여기에 계층으로 보입니다."}
      </p>
    );
  }
  const roots = tree.targets.map((t) => t.node);
  const shown = only ? pruneByState(roots, only) : roots;
  // 상태로 거르면 남은 것을 모두 펼쳐 보인다
  const openKeys = only ? allKeys(shown) : (open ?? defaultOpen(tree));
  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev ?? defaultOpen(tree));
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="p-3 text-sm">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {STATES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setOnly(only === s ? null : s)}
            className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATE_STYLE[s]} ${
              only && only !== s ? "opacity-40" : ""
            } ${only === s ? "ring-1 ring-black/30" : ""}`}
            title={only === s ? "거르기 해제" : `${s} 인 feature 만 보기`}
          >
            {s} {tree.counts[s]}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setOnly(null);
              setOpen(allKeys(roots));
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-black/60 hover:bg-black/5"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            모두 펼치기
          </button>
          <button
            type="button"
            onClick={() => {
              setOnly(null);
              setOpen(new Set());
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-black/60 hover:bg-black/5"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" />
            모두 접기
          </button>
        </span>
      </div>
      <p className="mb-2 text-[11.5px] text-black/50">
        {tree.targets
          .map((t) => (t.eligible ? `${t.node.key}: 37개 중 ${t.emitted}개 냄` : `${t.node.key}: 비적격`))
          .join(" · ")}
        {" — "}해당 없음(N/A)으로 생략된 키는 관찰 결과에 없어 트리에도 없습니다.
      </p>
      {shown.length ? (
        <ul>
          {shown.map((n) => (
            <Row key={n.key} n={n} depth={0} open={openKeys} toggle={toggle} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-black/50">{only} 인 feature 가 없습니다.</p>
      )}
    </div>
  );
}
