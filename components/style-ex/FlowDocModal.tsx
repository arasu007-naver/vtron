"use client";

/* 흐름도 보며 프롬프트 고치기 — /style-ex · 인덱스(Full-Look) 가 같이 쓴다.

   ┌ 흐름도 · vN  [vM 의 흐름도 · 물려받음]        [.html 올리기] [새 창] [닫기] ┐
   │ 흐름도 (그 버전의 HTML, 스크립트 막은 iframe) │ 관찰 프롬프트 (페이지와 같은 내용) │
   │                                              │ [변경 메모] [새 버전 저장] [저장 후 활성화] │
   └──────────────────────────────────────────────┴─────────────────────────────────┘

   흐름도는 버전마다 하나다(style_ex_prompt_versions.flow_doc, 0022). 보이는 흐름도는 지금 내용과 같은 버전,
   고치는 중이면 고치기 시작한 버전의 것이다. 새 버전으로 저장하면 그 흐름도를 물려받고 "vN 의 흐름도"로 표시된다 —
   새 버전에 맞게 고친 HTML 을 [.html 올리기]로 넣으면 그 버전의 흐름도가 된다. */

import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, FileUp, Loader2, Save, X } from "lucide-react";
import { authFetch } from "@/lib/auth-client";

interface FlowDoc {
  id: string;
  version: number;
  doc: string | null;
  updated_at: string | null;
  from: { id: string; version: number } | null;
}

export interface FlowDocModalProps {
  open: boolean;
  onClose: () => void;
  /** 흐름도를 보일 버전 — 지금 내용과 같은 버전, 고치는 중이면 고치기 시작한 버전 */
  versionId: string | null;
  /** 그 버전 번호 (머리에 보인다) */
  versionNumber: number | null;
  /** 지금 내용이 그 버전과 같은지 — 다르면 "고치는 중" */
  edited: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  /** 새 버전 저장 (activate = 저장 후 활성화) — 페이지의 저장과 같다 */
  onSave: (activate: boolean) => void;
  busy: boolean;
  error: string | null;
  /** 흐름도를 올린 뒤 — 페이지가 버전 목록을 다시 읽게 */
  onFlowChanged?: () => void;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

export default function FlowDocModal(props: FlowDocModalProps) {
  const { open, onClose, versionId, versionNumber, edited, prompt, onPromptChange, note, onNoteChange, onSave, busy, error, onFlowChanged } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  /** 마지막으로 읽은 흐름도 — loadedFor 와 versionId 가 다르면 읽는 중 */
  const [loaded, setLoaded] = useState<{ for: string; flow: FlowDoc | null; error: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const current = loaded && loaded.for === versionId ? loaded : null;
  const flow = current?.flow ?? null;
  const flowError = uploadError ?? current?.error ?? null;
  const loading = open && !!versionId && !current;

  // 열려 있는 동안 보일 버전이 바뀌면 그 흐름도를 읽는다. 상태는 응답이 온 뒤에만 바꾼다.
  useEffect(() => {
    if (!open || !versionId) return;
    let stale = false;
    (async () => {
      let next: { flow: FlowDoc | null; error: string | null };
      try {
        const res = await authFetch(`/api/style-ex/prompts/${versionId}/flow`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `흐름도를 읽지 못했습니다 (${res.status})`);
        next = { flow: data.flow, error: null };
      } catch (e) {
        next = { flow: null, error: e instanceof Error ? e.message : String(e) };
      }
      if (!stale) setLoaded({ for: versionId, ...next });
    })();
    return () => {
      stale = true;
    };
  }, [open, versionId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /** 그 버전의 흐름도를 바꾼다 — 고른 .html 파일 그대로 */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !versionId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const html = await file.text();
      const res = await authFetch(`/api/style-ex/prompts/${versionId}/flow`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `흐름도를 올리지 못했습니다 (${res.status})`);
      setLoaded({ for: versionId, flow: data.flow, error: null });
      onFlowChanged?.();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  /** 흐름도만 새 창(탭)에서 크게 */
  const openInNewWindow = () => {
    if (!flow?.doc) return;
    const url = URL.createObjectURL(new Blob([flow.doc], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="흐름도와 관찰 프롬프트" className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)]">
      <input ref={fileRef} type="file" accept=".html,text/html" className="hidden" onChange={handleUpload} />
      <div className="flex-none flex items-center gap-2 px-4 py-2 border-b border-[var(--color-divider)] bg-[var(--color-panel)] text-sm">
        <span className="font-semibold">흐름도</span>
        {versionNumber !== null && <span className="text-black/60">v{versionNumber}</span>}
        {edited && <span className="text-xs text-[var(--color-accent-700)]">• 고치는 중 — v{versionNumber} 에서 시작</span>}
        {flow?.from && (
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"
            title="이 버전용으로 고친 흐름도가 아닙니다. 고친 HTML 을 올리면 이 버전의 흐름도가 됩니다."
          >
            v{flow.from.version} 의 흐름도 · 물려받음
          </span>
        )}
        {flow?.updated_at && <span className="text-xs text-black/40">{shortDate(flow.updated_at)}</span>}
        {(loading || uploading) && <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent-700)]" />}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!versionId || uploading}
            title={versionNumber !== null ? `v${versionNumber} 의 흐름도를 고른 .html 파일로 바꿉니다` : "버전을 먼저 고르세요"}
            className="btn btn-secondary px-3 py-1 rounded-full flex items-center gap-1.5 text-xs disabled:opacity-50"
          >
            <FileUp className="w-3.5 h-3.5" />
            .html 올리기
          </button>
          <button
            type="button"
            onClick={openInNewWindow}
            disabled={!flow?.doc}
            className="btn btn-secondary px-3 py-1 rounded-full flex items-center gap-1.5 text-xs disabled:opacity-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />새 창
          </button>
          <button type="button" onClick={onClose} aria-label="닫기" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[3fr_2fr]">
        {/* 왼쪽 — 흐름도 */}
        <section className="min-h-[50vh] md:min-h-0 border-b md:border-b-0 md:border-r border-[var(--color-divider)] bg-white">
          {flow?.doc ? (
            // 저장된 HTML 은 스크립트를 막고 보인다 — 흐름도 문서는 스크립트가 없다
            <iframe title={`v${flow.version} 흐름도`} srcDoc={flow.doc} sandbox="allow-same-origin" className="w-full h-full border-0" />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 p-6 text-sm text-black/60 text-center">
              {flowError ? (
                <p className="text-[var(--color-danger)]">{flowError}</p>
              ) : loading ? (
                <p>흐름도를 불러오는 중…</p>
              ) : !versionId ? (
                <p>저장된 버전이 아니라 보일 흐름도가 없습니다.</p>
              ) : (
                <>
                  <p>v{versionNumber} 에는 흐름도가 없습니다.</p>
                  <p className="text-xs">[.html 올리기]로 이 버전의 흐름도를 넣으세요.</p>
                </>
              )}
            </div>
          )}
        </section>

        {/* 오른쪽 — 관찰 프롬프트 (페이지와 같은 내용) */}
        <section className="min-h-0 flex flex-col">
          <div className="flex-none flex items-center gap-2 px-4 py-2 text-sm">
            <span className="px-3 py-1 rounded-full bg-[rgba(182,130,53,0.16)] font-semibold">관찰 프롬프트</span>
            <span className="text-xs text-black/50">{prompt.length.toLocaleString()}자</span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            spellCheck={false}
            className="flex-1 min-h-0 mx-4 mb-2 p-3 resize-none rounded border border-[var(--color-divider)] bg-white font-[family-name:var(--font-mono)] text-xs leading-relaxed vt-scroll"
          />
          <div className="flex-none flex items-center gap-2 mx-4 mb-3 text-xs">
            <input
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="변경 메모 (무엇을 왜 바꿨는지)"
              disabled={!edited}
              className="flex-1 min-w-0 rounded border border-[var(--color-divider)] bg-white px-2 py-1 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => onSave(false)}
              disabled={!edited || busy || !prompt.trim()}
              title={edited ? `새 버전으로 저장 — v${versionNumber} 의 흐름도를 물려받습니다` : "고친 내용이 없습니다"}
              className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-divider)] hover:bg-black/5 disabled:opacity-50"
            >
              <Save className="w-3 h-3" />새 버전 저장
            </button>
            <button
              type="button"
              onClick={() => onSave(true)}
              disabled={!edited || busy || !prompt.trim()}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(182,130,53,0.16)] font-semibold hover:bg-[rgba(182,130,53,0.26)] disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              저장 후 활성화
            </button>
            {busy && <Loader2 className="w-3 h-3 animate-spin" />}
          </div>
          {error && <p className="flex-none mx-4 -mt-2 mb-2 text-xs text-[var(--color-danger)]">{error}</p>}
        </section>
      </div>
    </div>
  );
}
