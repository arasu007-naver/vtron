"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronsDownUp, ChevronsUpDown, Copy, Download } from "lucide-react";
import JsonTree from "./JsonTree";
import type { ProxyResponsePayload } from "@/types/playground";

/**
 * 응답 뷰어.
 *
 * 상태·소요시간·크기를 헤더에 두고, 본문은 JSON 트리 / 원본 / 헤더 / 요청 정보
 * 네 탭으로 나눈다. 4xx·5xx 도 성공 응답과 같은 자리에 같은 모양으로 보여준다 —
 * 이 페이지에서는 에러 응답 본문이 곧 정보다.
 */

type Tab = "body" | "raw" | "headers" | "meta";

const statusClass = (status: number) => {
  const bucket = Math.floor(status / 100);
  return bucket >= 2 && bucket <= 5 ? `pg-status-${bucket}` : "pg-status-x";
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          // 클립보드 권한이 없으면 조용히 넘어간다.
        }
      }}
      className="px-2 py-1 text-[19.8px] rounded btn btn-secondary flex items-center gap-1"
      title={label}
    >
      {done ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      <span>{done ? "복사됨" : label}</span>
    </button>
  );
}

/** 원본 탭의 검색어 하이라이트 */
function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="pg-json-hit">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface ResponsePanelProps {
  result: ProxyResponsePayload | null;
  error: string | null;
  loading: boolean;
  /** 프록시 왕복 전체 시간(브라우저 기준) */
  roundTripMs: number | null;
}

export default function ResponsePanel({
  result,
  error,
  loading,
  roundTripMs,
}: ResponsePanelProps) {
  const [tab, setTab] = useState<Tab>("body");
  const [query, setQuery] = useState("");
  const [generation, setGeneration] = useState(0);
  const [expandDepth, setExpandDepth] = useState(2);

  const parsed = useMemo(() => {
    if (!result || result.bodyEncoding !== "text") return { ok: false, value: null };
    try {
      return { ok: true, value: JSON.parse(result.body) as unknown };
    } catch {
      return { ok: false, value: null };
    }
  }, [result]);

  const prettyBody = useMemo(() => {
    if (!result) return "";
    return parsed.ok ? JSON.stringify(parsed.value, null, 2) : result.body;
  }, [result, parsed]);

  const imagePreview =
    result?.bodyEncoding === "base64" && result.contentType?.startsWith("image/")
      ? `data:${result.contentType};base64,${result.body}`
      : null;

  if (loading) {
    return (
      <Shell>
        <p className="m-0 p-6 text-[22.5px] text-black">요청 중…</p>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="pg-status pg-status-5">실패</span>
            {roundTripMs != null && (
              <span className="text-[20.7px] text-black">
                {roundTripMs} ms
              </span>
            )}
          </div>
          <pre className="pg-code text-black">{error}</pre>
        </div>
      </Shell>
    );
  }

  if (!result) {
    return (
      <Shell>
        <p className="m-0 p-6 text-[22.5px] text-black">
          아직 보낸 요청이 없습니다. 왼쪽에서 프리셋을 고르거나 URL 을 입력하고{" "}
          <kbd className="pg-mono text-[19.8px]">Ctrl</kbd> +{" "}
          <kbd className="pg-mono text-[19.8px]">Enter</kbd> 로 보내세요.
        </p>
      </Shell>
    );
  }

  const headerEntries = Object.entries(result.headers);

  return (
    <Shell>
      {/* 상태 줄 */}
      <div className="px-3 py-2 border-b border-[var(--pg-line)] flex items-center gap-2 flex-wrap">
        <span className={`pg-status ${statusClass(result.status)}`}>
          {result.status}
        </span>
        <span className="text-[21.6px] text-black">
          {result.statusText || (result.ok ? "OK" : "")}
        </span>
        <span className="text-[20.7px] text-black">
          {result.durationMs} ms
          {roundTripMs != null && ` (왕복 ${roundTripMs} ms)`}
        </span>
        <span className="text-[20.7px] text-black">
          {formatBytes(result.sizeBytes)}
        </span>
        {result.contentType && (
          <span className="text-[20.7px] text-black pg-mono truncate max-w-[220px]">
            {result.contentType.split(";")[0]}
          </span>
        )}
        {result.redirected && (
          <span className="text-[19.8px] text-black">리다이렉트됨</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <CopyButton text={prettyBody} label="본문 복사" />
        </div>
      </div>

      {/* 탭 */}
      <div className="px-3 py-1.5 border-b border-[var(--pg-line)] flex items-center gap-1 flex-wrap">
        {(
          [
            ["body", parsed.ok ? "JSON" : "본문"],
            ["raw", "원본"],
            ["headers", `헤더 (${headerEntries.length})`],
            ["meta", "요청 정보"],
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

        {tab === "body" && parsed.ok && (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="pg-tab flex items-center gap-1"
              title="모두 펼치기"
              onClick={() => {
                setExpandDepth(Infinity);
                setGeneration((g) => g + 1);
              }}
            >
              <ChevronsUpDown className="w-3 h-3" />
              모두 펼치기
            </button>
            <button
              type="button"
              className="pg-tab flex items-center gap-1"
              title="모두 접기"
              onClick={() => {
                setExpandDepth(0);
                setGeneration((g) => g + 1);
              }}
            >
              <ChevronsDownUp className="w-3 h-3" />
              모두 접기
            </button>
          </div>
        )}

        {tab === "raw" && (
          <input
            className="pg-input ml-auto max-w-[220px]"
            placeholder="원본에서 찾기"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 min-h-0 overflow-auto vt-scroll p-3">
        {tab === "body" &&
          (imagePreview ? (
            <div className="flex flex-col gap-2 items-start">
              <Image
                src={imagePreview}
                alt="응답 이미지"
                width={420}
                height={420}
                unoptimized
                className="max-w-full h-auto border border-[var(--pg-line)] rounded"
              />
              <a
                href={imagePreview}
                download="response"
                className="px-2 py-1 text-[19.8px] rounded btn btn-secondary flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                내려받기
              </a>
            </div>
          ) : parsed.ok ? (
            <JsonTree key={generation} value={parsed.value} expandDepth={expandDepth} />
          ) : (
            <pre className="pg-code">{result.body || "(본문 없음)"}</pre>
          ))}

        {tab === "raw" && (
          <pre className="pg-code">
            <Highlighted text={result.body || "(본문 없음)"} query={query} />
          </pre>
        )}

        {tab === "headers" && (
          <table className="w-full text-[20.7px] pg-mono border-collapse">
            <tbody>
              {headerEntries.map(([key, value]) => (
                <tr key={key} className="border-b border-[var(--pg-line)]">
                  <td className="py-1 pr-3 align-top text-black whitespace-nowrap">
                    {key}
                  </td>
                  <td className="py-1 align-top break-all">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "meta" && (
          <div className="flex flex-col gap-3 text-[20.7px]">
            <Meta label="최종 URL" value={result.finalUrl} />
            <Meta label="본문 인코딩" value={result.bodyEncoding} />
            <Meta label="크기" value={`${result.sizeBytes} bytes`} />
            <Meta
              label="서버 소요시간"
              value={`${result.durationMs} ms${
                roundTripMs != null ? ` / 왕복 ${roundTripMs} ms` : ""
              }`}
            />
            {result.resolvedVars && (
              <div>
                <p className="m-0 mb-1 text-[19.8px] text-black">
                  서버가 채운 변수 (서명은 앞뒤만 표시)
                </p>
                <table className="w-full pg-mono border-collapse">
                  <tbody>
                    {Object.entries(result.resolvedVars).map(([key, value]) => (
                      <tr key={key} className="border-b border-[var(--pg-line)]">
                        <td className="py-1 pr-3 align-top text-black whitespace-nowrap">
                          {"{{"}
                          {key}
                          {"}}"}
                        </td>
                        <td className="py-1 align-top break-all">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

const Meta = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-2">
    <span className="text-black w-[92px] flex-shrink-0">{label}</span>
    <span className="pg-mono break-all">{value}</span>
  </div>
);

const Shell = ({ children }: { children: React.ReactNode }) => (
  <section className="flex flex-col min-h-0 flex-none h-[var(--pg-response-h)] bg-[var(--color-panel)] border border-[var(--pg-line)] rounded-md overflow-hidden">
    {children}
  </section>
);
