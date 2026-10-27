"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff, ImagePlus, KeyRound, RefreshCw, ScanSearch, Square } from "lucide-react";

/**
 * API 사용 데모 — 업체에 발급한 API 키(stmx_live_…)로 외부 API `POST /api/v1/style-id` 를 직접 불러 본다.
 * 관리자 세션이 아니라 입력한 키로 부르므로 업체가 부르는 것과 같은 경로를 탄다(호출은 api_call_log 에 남는다).
 * 오른쪽에는 같은 요청을 axios 로 보내는 코드를 입력값 그대로 채워 보여 준다.
 */

const ENDPOINT = "/api/v1/style-id";
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 5 * 1024 * 1024;

type CodeTab = "browser" | "node";

interface CallResult {
  status: number;
  requestId: string | null;
  elapsedMs: number;
  body: unknown;
}

interface StyleBody {
  ok?: boolean;
  style_id?: string;
  style?: { name?: string | null; sub_title?: string | null; definition?: string | null } | null;
  candidates?: { style_id: string; style?: { name?: string | null } | null }[];
  axes?: Record<string, { letter: string | null; letters: string[]; source: string | null }>;
  error?: string;
}

const js = (v: string) => JSON.stringify(v);

function axiosCode(tab: CodeTab, origin: string, token: string, productName: string, file: File | null) {
  const tokenLit = js(token || "stmx_live_…");
  const fileName = file?.name ?? "product.jpg";
  const nameLine = productName.trim() ? `form.append("product_name", ${js(productName.trim())});\n` : "";

  if (tab === "node") {
    return `// Node.js 20+  —  npm i axios
import axios from "axios";
import { openAsBlob } from "node:fs";

const form = new FormData();
form.append("image", await openAsBlob(${js("./" + fileName)}), ${js(fileName)});
${nameLine}
const { data } = await axios.post(${js(origin + ENDPOINT)}, form, {
  headers: { Authorization: \`Bearer \${${tokenLit}}\` },
  timeout: 600_000, // 추출은 수십 초 ~ 수 분 걸린다
});

console.log(data.style_id, data.style?.name, data.candidates);`;
  }

  return `// 브라우저  —  npm i axios
import axios from "axios";

// <input type="file"> 에서 고른 상품 이미지 (${fileName})
const imageFile = document.querySelector("input[type=file]").files[0];

const form = new FormData();
form.append("image", imageFile);
${nameLine}
const { data } = await axios.post(${js(origin + ENDPOINT)}, form, {
  headers: { Authorization: \`Bearer \${${tokenLit}}\` },
  timeout: 600_000, // 추출은 수십 초 ~ 수 분 걸린다
});

console.log(data.style_id, data.style?.name, data.candidates);`;
}

function statusTone(status: number) {
  if (status < 300) return "bg-[#E6F8ED] text-[#0E8A42] border-[#C3EED3]";
  if (status < 500) return "bg-[#FFF6E6] text-[#D97706] border-[#FFE6B3]";
  return "bg-[#FFECEC] text-[#E52E2E] border-[#FFD0D0]";
}

export default function ApiDemoPage() {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const [calling, setCalling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<CallResult | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  const [tab, setTab] = useState<CodeTab>("browser");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // origin 은 브라우저에서만 안다 — 첫 렌더(서버)와 맞추려고 마운트 뒤에 채운다
    const t = setTimeout(() => setOrigin(window.location.origin), 0);
    return () => {
      clearTimeout(t);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!calling) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(timer);
  }, [calling]);

  const pickFile = (f: File | null) => {
    setInputError(null);
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) return setInputError("JPG · PNG · WEBP · GIF 이미지만 고를 수 있습니다.");
    if (f.size > MAX_BYTES) return setInputError("5MB 이하 이미지만 보낼 수 있습니다.");
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(f);
    setPreviewUrl(previewRef.current);
    setFile(f);
  };

  const code = useMemo(() => axiosCode(tab, origin, token.trim(), productName, file), [tab, origin, token, productName, file]);

  const blocker = !token.trim() ? "API 키를 입력하세요." : !file ? "상품 이미지를 고르세요." : null;

  const call = async () => {
    if (blocker || !file) return setInputError(blocker);
    setInputError(null);
    setCallError(null);
    setResult(null);
    setElapsed(0);
    setCalling(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const started = performance.now();
    try {
      const form = new FormData();
      form.append("image", file);
      if (productName.trim()) form.append("product_name", productName.trim());
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${token.trim()}` },
        body: form,
        signal: controller.signal,
      });
      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        // JSON 이 아니면 글 그대로 보여 준다
      }
      setResult({
        status: res.status,
        requestId: res.headers.get("x-request-id"),
        elapsedMs: Math.round(performance.now() - started),
        body,
      });
    } catch (err) {
      setCallError(
        err instanceof DOMException && err.name === "AbortError"
          ? "호출을 멈췄습니다. (서버에서는 추출이 끝까지 진행될 수 있습니다)"
          : err instanceof Error
            ? err.message
            : "호출에 실패했습니다."
      );
    } finally {
      abortRef.current = null;
      setCalling(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const styleBody = result && typeof result.body === "object" ? (result.body as StyleBody) : null;

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA] text-[#1D2330] overflow-hidden">
      {/* 상단 — API 키 + Style ID 버튼 한 줄 */}
      <header className="flex-none bg-white border-b border-[#E0E3E8] px-6 py-4">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            call();
          }}
        >
          <div className="relative flex-1 min-w-0">
            <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E96A2]" />
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="API 키 (stmx_live_…)"
              autoComplete="off"
              spellCheck={false}
              className="w-full h-10 pl-9 pr-10 rounded-lg border border-[#E0E3E8] bg-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(151,71,255,0.25)]"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[#F4F5F7] cursor-pointer"
              aria-label={showToken ? "API 키 가리기" : "API 키 보기"}
            >
              {showToken ? <EyeOff className="w-4 h-4 text-[#717680]" /> : <Eye className="w-4 h-4 text-[#717680]" />}
            </button>
          </div>
          {calling ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="h-10 px-4 rounded-lg bg-[#101317] text-white text-[13px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Square className="w-3.5 h-3.5" />
              멈추기 · {elapsed}s
            </button>
          ) : (
            <button
              type="submit"
              disabled={Boolean(blocker)}
              title={blocker ?? undefined}
              className="h-10 px-5 rounded-lg bg-gradient-to-r from-[#9747FF] to-[#FF0099] text-white text-[13px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <ScanSearch className="w-4 h-4" />
              Style ID
            </button>
          )}
        </form>
        {inputError && <p className="mt-2 text-[12px] text-[#E52E2E]">{inputError}</p>}
      </header>

      {/* 본문 — 좌우 1:1 */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-y-auto lg:overflow-hidden">
        {/* 왼쪽 — 이미지 미리보기 + 상품 이름 */}
        <section className="min-h-[420px] lg:min-h-0 flex flex-col bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div
            className="relative flex-1 min-h-0 bg-[#F4F5F7] flex items-center justify-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="상품 이미지 미리보기" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[#8E96A2]">
                <ImagePlus className="w-10 h-10 opacity-60" />
                <span className="text-[13px]">상품 이미지를 선택하거나 끌어놓으세요</span>
                <span className="text-[12px]">JPG · PNG · WEBP · GIF · 5MB 이하</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={calling}
              className="absolute top-3 right-3 h-10 px-4 rounded-full bg-[#101317] text-white text-[13px] font-semibold shadow-lg flex items-center gap-1.5 cursor-pointer hover:bg-[#2A2F37] disabled:opacity-50"
            >
              <ImagePlus className="w-4 h-4" />
              상품 이미지 선택
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />

            {file && (
              <span className="absolute bottom-3 left-3 max-w-[70%] truncate px-2 py-1 rounded-md bg-black/55 text-white text-[12px]">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)}MB
              </span>
            )}
          </div>

          <div className="flex-none p-3 border-t border-[#F0F1F3]">
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="상품 이름 (선택) — 예: 플로럴 퍼프소매 미니 원피스"
              maxLength={200}
              className="w-full h-10 px-3 rounded-lg border border-[#E0E3E8] bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[rgba(151,71,255,0.25)]"
            />
          </div>
        </section>

        {/* 오른쪽 — axios 코드 + 호출 결과 */}
        <section className="min-h-[520px] lg:min-h-0 grid grid-rows-2 gap-4">
          <div className="min-h-0 flex flex-col rounded-2xl bg-[#101317] text-[#E6E8EB] overflow-hidden border border-[#101317]">
            <div className="flex-none flex items-center justify-between px-4 py-2.5 border-b border-white/10">
              <div className="flex items-center gap-1">
                {(["browser", "node"] as CodeTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`px-2.5 py-1 rounded-md text-[12px] font-semibold cursor-pointer ${
                      tab === t ? "bg-white/15 text-white" : "text-white/55 hover:text-white"
                    }`}
                  >
                    {t === "browser" ? "axios · 브라우저" : "axios · Node.js"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="px-2.5 py-1 rounded-md text-[12px] font-semibold text-white/80 hover:bg-white/10 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
            <pre className="flex-1 min-h-0 overflow-auto p-4 text-[12px] leading-relaxed font-mono whitespace-pre vt-scroll">{code}</pre>
          </div>

          <div className="min-h-0 flex flex-col bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="flex-none flex items-center gap-2 px-4 py-2.5 border-b border-[#F0F1F3]">
              <span className="text-[13px] font-bold text-[#101317]">호출 결과</span>
              {result && (
                <>
                  <span className={`px-2 py-0.5 rounded-md text-[12px] font-bold border ${statusTone(result.status)}`}>{result.status}</span>
                  <span className="text-[12px] text-[#717680]">{(result.elapsedMs / 1000).toFixed(1)}s</span>
                  {result.requestId && (
                    <span className="ml-auto text-[11px] font-mono text-[#8E96A2] truncate" title="X-Request-Id — api_call_log.id">
                      {result.requestId}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-4 vt-scroll">
              {calling ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-[#717680]">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#9747FF]" />
                  <span className="text-[13px]">스타일 아이디 추출 중… {elapsed}s</span>
                  <span className="text-[12px] text-[#8E96A2]">보통 30초 ~ 1분 남짓 걸립니다</span>
                </div>
              ) : callError ? (
                <p className="text-[13px] text-[#E52E2E]">{callError}</p>
              ) : !result ? (
                <p className="h-full flex items-center justify-center text-[13px] text-[#8E96A2]">
                  API 키와 이미지를 넣고 Style ID 를 누르면 여기에 응답이 나옵니다.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {styleBody?.ok && styleBody.style_id && (
                    <div className="rounded-xl border border-[#D9CFFF] bg-[#FAF8FF] p-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[28px] font-black tracking-wider bg-gradient-to-r from-[#9747FF] to-[#FF0099] bg-clip-text text-transparent">
                          {styleBody.style_id}
                        </span>
                        {styleBody.style?.name && <span className="text-[15px] font-bold text-[#101317]">{styleBody.style.name}</span>}
                      </div>
                      {styleBody.style?.sub_title && <p className="text-[13px] text-[#555A64] mt-0.5">{styleBody.style.sub_title}</p>}
                      {styleBody.candidates && styleBody.candidates.length > 1 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[12px] text-[#717680]">후보</span>
                          {styleBody.candidates.map((c) => (
                            <span key={c.style_id} className="px-2 py-0.5 rounded-md bg-white border border-[#D9CFFF] text-[12px] font-mono font-bold text-[#7A2CEE]">
                              {c.style_id}
                              {c.style?.name ? <span className="font-sans font-medium text-[#717680]"> {c.style.name}</span> : null}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {styleBody && !styleBody.ok && styleBody.error && (
                    <p className="text-[13px] text-[#E52E2E] font-medium">{styleBody.error}</p>
                  )}
                  <pre className="text-[12px] leading-relaxed font-mono whitespace-pre-wrap break-all bg-[#F8F9FA] border border-[#EBECEF] rounded-lg p-3">
                    {typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
