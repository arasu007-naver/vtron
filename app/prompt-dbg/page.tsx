"use client";

/* 프롬프트 디버그 (/prompt-dbg) — 관찰 프롬프트 버전의 흐름도와 프롬프트 원문을 나란히 놓고 맞춰 본다.

   ┌ [item|full]  [v1] [v2] [v3★] [v4]   [찾기 ______ ⏎]                 L123 · 177,145자 ┐
   ├ 흐름도 (그 버전의 flow_doc)             │ 프롬프트 원문 (textarea, 줄바꿈 없음)           │
   │  STAGE 2 · B ← 누르면 오른쪽 커서가      │  [NOT APPLICABLE — OMIT THE KEY]  ← 여기로       │
   │  그 단계의 프롬프트 절로 간다            │                                                │
   └─────────────────────────────────────────┴────────────────────────────────────────────────┘

   단계 표지(.phase > b, 부록 .psec > h3) → 프롬프트 자리는 lib/prompt-dbg/anchors.ts 가 정한다. 프롬프트에 대응하는
   절이 없는 설명 단계(계층 · 엔진 · 점검 …)는 누를 수 없다. 흐름도는 스크립트를 막은 iframe 으로 보이고, 누르기는
   이 페이지가 iframe 문서에 붙인다(allow-same-origin). 오른쪽 textarea 는 고쳐 볼 수 있지만 저장하지 않는다 —
   버전 저장은 /style-ex · 인덱스의 [흐름도] 화면에서 한다. */

import { useCallback, useEffect, useRef, useState } from "react";
import { Bug, CornerDownLeft, ExternalLink, Loader2, RotateCcw, Search } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { anchorForHeading, anchorForPhase, type Anchor } from "@/lib/prompt-dbg/anchors";

type Target = "item" | "full";

interface PromptVersion {
  id: string;
  version: number;
  content: string;
  note: string | null;
  is_active: boolean;
  created_at: string;
  flow_doc_updated_at?: string | null;
  flow_doc_from?: string | null;
}

interface FlowDoc {
  id: string;
  version: number;
  doc: string | null;
  updated_at: string | null;
  from: { id: string; version: number } | null;
}

const TARGETS: { key: Target; label: string; title: string }[] = [
  { key: "item", label: "item", title: "/style-ex 의복별 관찰 프롬프트" },
  { key: "full", label: "full", title: "인덱스(Full-Look) 착장 전체 관찰 프롬프트" },
];

/** iframe 문서에 넣는 표시 — 누를 수 있는 단계 표지 */
const TAG_STYLE = `
  [data-dbg] { cursor: pointer; outline: 2px solid transparent; outline-offset: 2px; transition: outline-color .12s; }
  [data-dbg]:hover { outline-color: #b68235; }
  [data-dbg].dbg-on { outline-color: #b68235; box-shadow: 0 0 0 4px rgba(182,130,53,.25); }
  [data-dbg-none] { opacity: .55; cursor: not-allowed; }
`;

const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length;

export default function PromptDebugPage() {
  const [target, setTarget] = useState<Target>("item");
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [flow, setFlow] = useState<{ for: string; flow: FlowDoc | null; error: string | null } | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cursorLine, setCursorLine] = useState(1);
  const [jump, setJump] = useState<{ text: string; ok: boolean } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** iframe 의 누르기 처리기가 늘 지금 프롬프트를 보게 */
  const promptRef = useRef(prompt);
  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  const selected = versions.find((v) => v.id === selectedId) ?? null;

  // 대상이 바뀌면 그 대상의 관찰 프롬프트 버전 목록 — 처음에는 활성 버전을 고른다
  useEffect(() => {
    let stale = false;
    (async () => {
      let next: { versions: PromptVersion[]; error: string | null };
      try {
        const res = await authFetch(`/api/style-ex/prompts?target=${target}&kind=observe`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `버전 목록을 읽지 못했습니다 (${res.status})`);
        next = { versions: data.versions ?? [], error: null };
      } catch (e) {
        next = { versions: [], error: e instanceof Error ? e.message : String(e) };
      }
      if (stale) return;
      setVersions(next.versions);
      setListError(next.error);
      const pick = next.versions.find((v) => v.is_active) ?? next.versions[0] ?? null;
      setSelectedId(pick?.id ?? null);
      setPrompt(pick?.content ?? "");
      setJump(null);
    })();
    return () => {
      stale = true;
    };
  }, [target]);

  // 고른 버전의 흐름도
  useEffect(() => {
    if (!selectedId) return;
    let stale = false;
    (async () => {
      let next: { flow: FlowDoc | null; error: string | null };
      try {
        const res = await authFetch(`/api/style-ex/prompts/${selectedId}/flow`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `흐름도를 읽지 못했습니다 (${res.status})`);
        next = { flow: data.flow, error: null };
      } catch (e) {
        next = { flow: null, error: e instanceof Error ? e.message : String(e) };
      }
      if (!stale) setFlow({ for: selectedId, ...next });
    })();
    return () => {
      stale = true;
    };
  }, [selectedId]);

  const currentFlow = flow && flow.for === selectedId ? flow : null;
  const flowLoading = !!selectedId && !currentFlow;

  const pickVersion = (v: PromptVersion) => {
    setSelectedId(v.id);
    setPrompt(v.content);
    setJump(null);
    setCursorLine(1);
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  };

  /** 프롬프트의 한 자리로 커서를 옮기고 그 줄이 보이게 한다 */
  const moveCursor = useCallback((index: number, length: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(index, index + length);
    const line = lineOf(ta.value, index);
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 18;
    ta.scrollTop = Math.max(0, (line - 4) * lineHeight);
    ta.scrollLeft = 0;
    setCursorLine(line);
  }, []);

  /** 흐름도가 뜨면 단계 표지마다 누르기를 붙인다 — 프롬프트에 대응하는 절이 있는 것만 */
  const wireDiagram = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    const style = doc.createElement("style");
    style.textContent = TAG_STYLE;
    doc.head.appendChild(style);

    type Tag = { el: HTMLElement; label: string; find: (p: string) => Anchor | null };
    const tags: Tag[] = [];
    doc.querySelectorAll<HTMLElement>(".phase").forEach((phase) => {
      const b = phase.querySelector<HTMLElement>("b");
      const h2 = phase.querySelector<HTMLElement>("h2");
      if (!b) return;
      const tag = b.textContent ?? "";
      const title = h2?.textContent ?? "";
      tags.push({ el: b, label: tag, find: (p) => anchorForPhase(p, tag, title) });
    });
    doc.querySelectorAll<HTMLElement>(".psec > h3").forEach((h3) => {
      const heading = h3.textContent ?? "";
      tags.push({ el: h3, label: heading, find: (p) => anchorForHeading(p, heading) });
    });

    for (const t of tags) {
      if (!t.find(promptRef.current)) {
        t.el.setAttribute("data-dbg-none", "");
        t.el.title = "프롬프트에 대응하는 절이 없는 설명 단계입니다";
        continue;
      }
      t.el.setAttribute("data-dbg", "");
      t.el.title = "누르면 오른쪽 프롬프트의 그 절로 커서가 갑니다";
      t.el.addEventListener("click", (e) => {
        e.preventDefault();
        doc.querySelectorAll(".dbg-on").forEach((x) => x.classList.remove("dbg-on"));
        t.el.classList.add("dbg-on");
        // 누를 때 다시 찾는다 — 오른쪽에서 고쳐 자리가 바뀌었을 수 있다
        const p = promptRef.current;
        const a = t.find(p);
        if (!a) {
          setJump({ text: `${t.label.trim()} — 고친 프롬프트에서 찾지 못했습니다`, ok: false });
          return;
        }
        moveCursor(a.index, a.length);
        setJump({ text: `${t.label.trim()} → ${lineOf(p, a.index)}행 · ${a.via}`, ok: true });
      });
    }
  }, [moveCursor]);

  /** 찾기 — 지금 버전 원문에서 다음 자리로 (Enter) */
  const findNext = () => {
    const ta = textareaRef.current;
    if (!ta || !query) return;
    const from = ta.selectionEnd ?? 0;
    const hay = ta.value.toLowerCase();
    const needle = query.toLowerCase();
    let i = hay.indexOf(needle, from);
    if (i < 0) i = hay.indexOf(needle);
    if (i < 0) {
      setJump({ text: `"${query}" — 이 버전에 없습니다`, ok: false });
      return;
    }
    moveCursor(i, query.length);
    setJump({ text: `"${query}" → ${lineOf(ta.value, i)}행`, ok: true });
  };

  const matches = (v: PromptVersion) => !query || v.content.toLowerCase().includes(query.toLowerCase()) || (v.note ?? "").toLowerCase().includes(query.toLowerCase());
  const edited = !!selected && prompt !== selected.content;

  const openFlowInNewWindow = () => {
    const html = currentFlow?.flow?.doc;
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* 한 줄 — 대상 · 버전 · 찾기 */}
      <div className="flex-none flex items-center gap-2 px-4 py-2 border-b border-[var(--color-divider)] bg-[var(--color-panel)] text-sm overflow-x-auto vt-scroll">
        <Bug className="w-4 h-4 flex-none text-[var(--color-accent-700)]" />
        <div className="flex-none flex items-center rounded-lg border border-[var(--color-divider)] bg-black/5 p-0.5 text-xs" role="tablist" aria-label="대상">
          {TARGETS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={target === t.key}
              onClick={() => setTarget(t.key)}
              title={t.title}
              className={`rounded-md px-2.5 py-0.5 font-[family-name:var(--font-mono)] ${
                target === t.key ? "bg-white font-semibold text-[var(--color-accent-700)] shadow-sm" : "text-black/60 hover:text-black"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-none flex items-center gap-1" role="tablist" aria-label="버전">
          {versions.map((v) => {
            const on = v.id === selectedId;
            const hit = matches(v);
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => pickVersion(v)}
                title={[
                  `v${v.version}${v.is_active ? " (활성)" : ""} · ${v.content.length.toLocaleString()}자`,
                  v.note ?? "",
                  v.flow_doc_updated_at ? (v.flow_doc_from ? "흐름도: 물려받음" : "흐름도 있음") : "흐름도 없음",
                ]
                  .filter(Boolean)
                  .join("\n")}
                className={`relative px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-[family-name:var(--font-mono)] transition-opacity ${
                  on ? "bg-[rgba(182,130,53,0.16)] font-semibold text-black" : "hover:bg-black/5 text-black/70"
                } ${hit ? "" : "opacity-30"}`}
              >
                v{v.version}
                {v.is_active && <span className="text-[var(--color-accent-700)]">★</span>}
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    v.flow_doc_updated_at ? (v.flow_doc_from ? "bg-amber-500" : "bg-emerald-600") : "bg-black/20"
                  }`}
                />
              </button>
            );
          })}
          {!versions.length && !listError && <Loader2 className="w-4 h-4 animate-spin text-black/40" />}
        </div>

        <form
          className="flex-none flex items-center gap-1 rounded-full border border-[var(--color-divider)] bg-white px-2 py-0.5"
          onSubmit={(e) => {
            e.preventDefault();
            findNext();
          }}
        >
          <Search className="w-3.5 h-3.5 text-black/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="프롬프트 찾기 — 버전 걸러 보기 · Enter 다음 자리"
            className="w-64 bg-transparent text-xs outline-none"
          />
          <button type="submit" disabled={!query} title="다음 자리 (Enter)" className="text-black/40 hover:text-black disabled:opacity-30">
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
        {query && <span className="flex-none text-xs text-black/50">{versions.filter(matches).length}개 버전에 있음</span>}

        <div className="ml-auto flex-none flex items-center gap-3 text-xs text-black/50">
          {jump && <span className={jump.ok ? "text-emerald-700" : "text-[var(--color-danger)]"}>{jump.text}</span>}
          {edited && (
            <button
              type="button"
              onClick={() => selected && setPrompt(selected.content)}
              className="flex items-center gap-1 text-[var(--color-accent-700)] hover:underline"
              title="고친 내용을 버리고 저장된 원문으로"
            >
              <RotateCcw className="w-3 h-3" />
              원문으로
            </button>
          )}
          <span className="font-[family-name:var(--font-mono)]">
            L{cursorLine} · {prompt.length.toLocaleString()}자
          </span>
        </div>
      </div>
      {listError && <p className="flex-none px-4 py-1 text-xs text-[var(--color-danger)]">{listError}</p>}

      {/* 좌 흐름도 / 우 프롬프트 원문 */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2">
        <section className="relative min-h-[50vh] md:min-h-0 border-b md:border-b-0 md:border-r border-[var(--color-divider)] bg-white">
          {currentFlow?.flow?.doc ? (
            <>
              {/* 스크립트는 막고, 이 페이지가 단계 표지에 누르기를 붙인다 (allow-same-origin) */}
              <iframe
                ref={iframeRef}
                key={currentFlow.for}
                title={`v${currentFlow.flow.version} 흐름도`}
                srcDoc={currentFlow.flow.doc}
                sandbox="allow-same-origin"
                onLoad={wireDiagram}
                className="w-full h-full border-0"
              />
              <div className="absolute top-2 right-3 flex items-center gap-2">
                {currentFlow.flow.from && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shadow-sm" title="이 버전용으로 고친 흐름도가 아닙니다">
                    v{currentFlow.flow.from.version} 의 흐름도 · 물려받음
                  </span>
                )}
                <button
                  type="button"
                  onClick={openFlowInNewWindow}
                  title="흐름도만 새 창에서"
                  className="w-7 h-7 rounded-full bg-white/95 shadow flex items-center justify-center hover:bg-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-6 text-sm text-black/60 text-center">
              {flowLoading
                ? "흐름도를 불러오는 중…"
                : currentFlow?.error
                  ? <span className="text-[var(--color-danger)]">{currentFlow.error}</span>
                  : selected
                    ? `v${selected.version} 에는 흐름도가 없습니다. /style-ex · 인덱스의 [흐름도 → .html 올리기]로 넣으세요.`
                    : "버전을 고르세요."}
            </div>
          )}
        </section>

        <section className="min-h-0 flex flex-col">
          <div className="flex-none flex items-center gap-2 px-4 py-1.5 text-xs text-black/60">
            <span className="font-semibold text-black">관찰 프롬프트{selected ? ` v${selected.version}` : ""}</span>
            {selected?.is_active && <span className="text-[var(--color-accent-700)]">활성</span>}
            {selected?.note && <span className="truncate" title={selected.note}>· {selected.note}</span>}
            {edited && <span className="flex-none text-[var(--color-accent-700)]">• 고침 (저장 안 함)</span>}
          </div>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onSelect={(e) => setCursorLine(lineOf(e.currentTarget.value, e.currentTarget.selectionStart))}
            spellCheck={false}
            wrap="off"
            placeholder={versions.length ? "" : "버전을 불러오는 중…"}
            className="flex-1 min-h-0 mx-4 mb-4 p-3 resize-none rounded border border-[var(--color-divider)] bg-white font-[family-name:var(--font-mono)] text-xs leading-[18px] whitespace-pre overflow-auto vt-scroll selection:bg-[rgba(182,130,53,0.35)]"
          />
        </section>
      </div>
    </div>
  );
}
