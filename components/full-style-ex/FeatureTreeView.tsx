"use client";

/* 37 Features — 관찰 결과(Evidence Packet)를 vision feature 계층으로 보는 트리 (/full-style-ex).
   계층 · 값은 lib/full-style-ex/feature-tree.ts 가 정한다. 위의 상태 칩을 누르면 그 상태인 feature 만 남긴다. */

import { useMemo, useState } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { buildFeatureTree, type FeatureNode, type FeatureState } from "@/lib/full-style-ex/feature-tree";

const STATE_STYLE: Record<FeatureState, string> = {
  OBSERVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ABSENT: "bg-black/5 text-black/60 border-black/10",
  NOT_VISIBLE: "bg-red-50 text-red-700 border-red-200",
  UNKNOWN: "bg-amber-50 text-amber-800 border-amber-200",
};
const STATES: FeatureState[] = ["OBSERVED", "ABSENT", "NOT_VISIBLE", "UNKNOWN"];
const AXIS_STYLE: Record<string, string> = {
  EI: "text-purple-700 border-purple-300",
  TC: "text-blue-700 border-blue-300",
  SR: "text-emerald-700 border-emerald-300",
  DM: "text-orange-700 border-orange-300",
};

/** 상태로 거른 트리 — 그 상태인 노드와, 그런 노드를 품은 조상만 남긴다 */
function prune(nodes: FeatureNode[], only: FeatureState): FeatureNode[] {
  return nodes.flatMap((n) => {
    const kids = n.children ? prune(n.children, only) : [];
    if (n.state === only || kids.length) return [{ ...n, children: kids.length ? kids : n.state === only ? n.children : [] }];
    return [];
  });
}

function Badge({ state }: { state: FeatureState }) {
  return <span className={`px-1.5 rounded border text-[10.5px] font-semibold ${STATE_STYLE[state]}`}>{state}</span>;
}

function Line({ n }: { n: FeatureNode }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span className={n.children?.length ? "font-semibold" : ""}>{n.label}</span>
      {n.id && <span className="text-[10.5px] text-black/40">{n.id}</span>}
      {n.axes?.map((a) => (
        <span key={a} className={`px-1 rounded border text-[10px] font-bold ${AXIS_STYLE[a] ?? ""}`}>
          {a}
        </span>
      ))}
      {n.state && <Badge state={n.state} />}
      {n.value && <span className="text-black/80">{n.value}</span>}
      {n.limitation?.length ? <span className="text-red-700/80">{n.limitation.join(" · ")}</span> : null}
      {n.note && <span className="text-black/40">— {n.note}</span>}
    </span>
  );
}

function Node({ n, depth, open }: { n: FeatureNode; depth: number; open: boolean | null }) {
  if (!n.children?.length) {
    return (
      <li className="py-0.5 pl-4 relative before:absolute before:left-0 before:top-[0.8em] before:w-3 before:border-t before:border-black/15">
        <Line n={n} />
      </li>
    );
  }
  return (
    <li className="py-0.5 pl-4 relative before:absolute before:left-0 before:top-[0.8em] before:w-3 before:border-t before:border-black/15">
      <details open={open ?? depth < 2}>
        <summary className="cursor-pointer select-none marker:text-black/30">
          <Line n={n} />
        </summary>
        <ul className="m-0 pl-2 border-l border-black/15 list-none">
          {n.children.map((c) => (
            <Node key={c.key} n={c} depth={depth + 1} open={open} />
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function FeatureTreeView({ packet }: { packet: Record<string, unknown> | null }) {
  const tree = useMemo(() => buildFeatureTree(packet), [packet]);
  const [only, setOnly] = useState<FeatureState | null>(null);
  /** null = 기본(두 단계까지 펼침) · true 모두 펼침 · false 모두 접음. 바꿀 때마다 트리를 다시 그린다 */
  const [open, setOpen] = useState<boolean | null>(null);
  const [version, setVersion] = useState(0);

  if (!packet) {
    return <p className="p-3 text-xs text-black/50">관찰 결과에 Evidence Packet 이 없습니다 (관찰 · 변환이 실패하면 생기지 않습니다).</p>;
  }
  const nodes = only ? prune(tree.nodes, only) : tree.nodes;
  const total = STATES.reduce((s, k) => s + tree.counts[k], 0);
  const setAll = (v: boolean) => {
    setOpen(v);
    setVersion((x) => x + 1);
  };

  return (
    <div className="p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2 pb-2 mb-2 border-b border-[var(--color-divider)]">
        <span className="font-semibold">vision features</span>
        <span className="text-black/50">
          {tree.ids.length} / 41 종류 · 상태 {total}개
        </span>
        {STATES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setOnly(only === s ? null : s);
              setOpen(only === s ? null : true);
              setVersion((x) => x + 1);
            }}
            title={only === s ? "거르기 해제" : `${s} 인 feature 만`}
            className={`px-2 py-0.5 rounded-full border text-[11px] ${STATE_STYLE[s]} ${only === s ? "ring-2 ring-offset-1 ring-[var(--color-accent-700)]" : ""}`}
          >
            {s} {tree.counts[s]}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setAll(true)} title="모두 펼치기" className="p-1 rounded hover:bg-black/5">
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setAll(false)} title="모두 접기" className="p-1 rounded hover:bg-black/5">
            <ChevronsDownUp className="w-3.5 h-3.5" />
          </button>
        </span>
      </div>
      <ul key={version} className="m-0 p-0 list-none font-[family-name:var(--font-mono)] leading-relaxed">
        {nodes.map((n) => (
          <Node key={n.key} n={n} depth={0} open={open} />
        ))}
      </ul>
      {only && !nodes.length && <p className="text-black/50">{only} 인 feature 가 없습니다.</p>}
    </div>
  );
}
