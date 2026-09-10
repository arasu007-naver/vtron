"use client";

import { useState } from "react";
import { Check, Copy, Play, Wand2 } from "lucide-react";
import KeyValueEditor from "./KeyValueEditor";
import { VARIABLES } from "@/lib/playground/vars";
import { HTTP_METHODS } from "@/types/playground";
import type {
  BodyType,
  HttpMethod,
  RequestDraft,
} from "@/types/playground";

/**
 * 요청 편집기.
 *
 * URL 과 값에는 `{{변수}}` 를 쓸 수 있고, 시크릿에서 파생되는 변수는 서버가
 * 채운다(변수 탭 참고). 그래서 브라우저에는 애플리케이션 시크릿이 없어도
 * 서명이 필요한 토큰 발급 호출을 여기서 그대로 편집할 수 있다.
 */

type Tab = "params" | "headers" | "body" | "auth" | "vars";

const BODY_TYPES: [BodyType, string][] = [
  ["none", "없음"],
  ["json", "JSON"],
  ["form", "form-urlencoded"],
  ["text", "텍스트"],
];

interface RequestPanelProps {
  draft: RequestDraft;
  onChange: (draft: RequestDraft) => void;
  onSend: () => void;
  loading: boolean;
  curl: string;
  /** 선택한 프리셋의 주석 — 무엇이 막혀 있는지 미리 알려준다. */
  note?: string;
}

export default function RequestPanel({
  draft,
  onChange,
  onSend,
  loading,
  curl,
  note,
}: RequestPanelProps) {
  const [tab, setTab] = useState<Tab>("params");
  const [copied, setCopied] = useState(false);

  const patch = (next: Partial<RequestDraft>) => onChange({ ...draft, ...next });

  const activeCount = {
    params: draft.params.filter((r) => r.enabled && r.key.trim()).length,
    headers: draft.headers.filter((r) => r.enabled && r.key.trim()).length,
  };

  const formatJson = () => {
    try {
      patch({ body: JSON.stringify(JSON.parse(draft.body), null, 2) });
    } catch {
      // 유효한 JSON 이 아니면 그대로 둔다 — 변수가 섞여 있을 수 있다.
    }
  };

  return (
    <section className="flex flex-col flex-none bg-[var(--color-panel)] border border-[var(--pg-line)] rounded-md overflow-hidden">
      {/* URL 바 */}
      <div className="p-2 flex items-center gap-1.5 border-b border-[var(--pg-line)]">
        <select
          className={`pg-select pg-mono font-bold pg-method-${draft.method}`}
          value={draft.method}
          onChange={(e) => patch({ method: e.target.value as HttpMethod })}
          aria-label="HTTP 메서드"
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <input
          className="pg-input flex-1"
          value={draft.url}
          onChange={(e) => patch({ url: e.target.value })}
          // URL 바에서는 그냥 Enter 로도 보낸다. Ctrl/Cmd+Enter 는 페이지 전역
          // 리스너가 처리하므로 여기서 건드리면 두 번 나간다.
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="{{baseUrl}}/v1/seller/channels"
          spellCheck={false}
        />

        <button
          type="button"
          onClick={onSend}
          disabled={loading}
          title="보내기 (Ctrl+Enter)"
          className="px-3 py-1.5 text-[21.6px] rounded btn btn-primary flex items-center gap-1 disabled:opacity-60"
        >
          <Play className="w-3 h-3" />
          {loading ? "보내는 중…" : "보내기"}
        </button>

        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(curl).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          title="cURL 로 복사 (서버 변수는 그대로 남는다)"
          className="px-2 py-1.5 text-[20.7px] rounded btn btn-secondary flex items-center gap-1"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          cURL
        </button>
      </div>

      {note && (
        <p className="m-0 px-3 py-1.5 text-[20.7px] leading-relaxed text-black bg-[rgba(182,130,53,0.09)] border-b border-[var(--pg-line)]">
          {note}
        </p>
      )}

      {/* 탭 */}
      <div className="px-2 py-1.5 flex items-center gap-1 border-b border-[var(--pg-line)] flex-wrap">
        {(
          [
            ["params", `파라미터${activeCount.params ? ` (${activeCount.params})` : ""}`],
            ["headers", `헤더${activeCount.headers ? ` (${activeCount.headers})` : ""}`],
            ["body", `바디${draft.bodyType !== "none" ? " ●" : ""}`],
            ["auth", "인증"],
            ["vars", "변수"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="pg-tab"
            data-active={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-3 max-h-[38vh] overflow-y-auto vt-scroll">
        {tab === "params" && (
          <KeyValueEditor
            rows={draft.params}
            onChange={(params) => patch({ params })}
            keyPlaceholder="파라미터"
            emptyLabel="쿼리 파라미터가 없습니다. URL 에 직접 써도 됩니다."
          />
        )}

        {tab === "headers" && (
          <KeyValueEditor
            rows={draft.headers}
            onChange={(headers) => patch({ headers })}
            keyPlaceholder="헤더"
            emptyLabel="추가 헤더가 없습니다. Content-Type 은 바디 형식에 맞춰 자동으로 붙습니다."
          />
        )}

        {tab === "body" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              {BODY_TYPES.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="pg-tab"
                  data-active={draft.bodyType === id}
                  onClick={() => patch({ bodyType: id })}
                >
                  {label}
                </button>
              ))}
              {draft.bodyType === "json" && (
                <button
                  type="button"
                  onClick={formatJson}
                  className="ml-auto px-2 py-1 text-[19.8px] rounded btn btn-secondary flex items-center gap-1"
                >
                  <Wand2 className="w-3 h-3" />
                  정렬
                </button>
              )}
            </div>

            {draft.bodyType === "none" ? (
              <p className="m-0 text-[20.7px] text-black">
                본문 없이 보냅니다.
              </p>
            ) : (
              <>
                <textarea
                  className="pg-input min-h-[140px]"
                  value={draft.body}
                  onChange={(e) => patch({ body: e.target.value })}
                  spellCheck={false}
                  placeholder={
                    draft.bodyType === "form"
                      ? "key=value 를 한 줄에 하나씩"
                      : "{\n  \n}"
                  }
                />
                {draft.bodyType === "form" && (
                  <p className="m-0 text-[18.9px] text-black">
                    한 줄에 <code>key=value</code> 하나. 값의 변수를 채운{" "}
                    <em>뒤에</em> 서버가 인코딩하므로 서명의 <code>+ / =</code> 가
                    깨지지 않습니다.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {tab === "auth" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  ["naver", "네이버 토큰 자동"],
                  ["bearer", "Bearer 직접 입력"],
                  ["basic", "Basic"],
                  ["none", "없음"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="pg-tab"
                  data-active={draft.auth.mode === id}
                  onClick={() => patch({ auth: { ...draft.auth, mode: id } })}
                >
                  {label}
                </button>
              ))}
            </div>

            {draft.auth.mode === "naver" && (
              <p className="m-0 text-[20.7px] text-black">
                상단에서 발급한 토큰을{" "}
                <code>Authorization: Bearer {"{{accessToken}}"}</code> 로 붙입니다.
                헤더 탭에 Authorization 을 직접 넣으면 그쪽이 우선합니다.
              </p>
            )}

            {draft.auth.mode === "bearer" && (
              <input
                className="pg-input"
                placeholder="토큰"
                value={draft.auth.token}
                onChange={(e) =>
                  patch({ auth: { ...draft.auth, token: e.target.value } })
                }
                spellCheck={false}
              />
            )}

            {draft.auth.mode === "basic" && (
              <div className="flex items-center gap-1.5">
                <input
                  className="pg-input"
                  placeholder="사용자"
                  value={draft.auth.username}
                  onChange={(e) =>
                    patch({ auth: { ...draft.auth, username: e.target.value } })
                  }
                  spellCheck={false}
                />
                <input
                  className="pg-input"
                  type="password"
                  placeholder="비밀번호"
                  value={draft.auth.password}
                  onChange={(e) =>
                    patch({ auth: { ...draft.auth, password: e.target.value } })
                  }
                />
              </div>
            )}
          </div>
        )}

        {tab === "vars" && (
          <table className="w-full text-[20.7px] border-collapse">
            <thead>
              <tr className="text-black text-left">
                <th className="font-normal pb-1 pr-3">변수</th>
                <th className="font-normal pb-1 pr-3 whitespace-nowrap">채우는 곳</th>
                <th className="font-normal pb-1">설명</th>
              </tr>
            </thead>
            <tbody>
              {VARIABLES.map((v) => (
                <tr key={v.name} className="border-t border-[var(--pg-line)]">
                  <td className="py-1 pr-3 align-top pg-mono text-black whitespace-nowrap">
                    {"{{"}
                    {v.name}
                    {"}}"}
                  </td>
                  <td className="py-1 pr-3 align-top text-black whitespace-nowrap">
                    {v.where === "client" ? "브라우저" : "서버"}
                  </td>
                  <td className="py-1 align-top text-black">
                    {v.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
