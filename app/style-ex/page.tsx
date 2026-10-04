"use client";

/* Style EX (/style-ex)
   이미지 한 장을 골라 의류 스타일 추출(lib/style-ex)을 호출하고 결과를 본다.

   ┌ 버튼 그룹 ─────────────────────────────── [이미지] ┐
   ├ 이미지 미리보기  [추출] ┬ 프롬프트 [관찰|판정]       ┤
   │                        ├ 호출 결과 (스타일 아이디 + JSON)│
   └────────────────────────┴────────────────────────────┘

   추출은 두 단계다 — 관찰(이미지 → 37개 파라미터) → 판정(관찰값 → 스타일 아이디).
   두 프롬프트 모두 기본값을 불러와 채운다. 수정하면 수정한 내용으로 호출하고,
   그대로면 서버가 기본 프롬프트를 쓴다. */

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, RotateCcw, ScanSearch } from "lucide-react";
import { authFetch } from "@/lib/auth-client";

type Status = "idle" | "running" | "done" | "error";
type PromptKey = "prompt" | "judgePrompt";

const PROMPT_TABS: { key: PromptKey; label: string }[] = [
  { key: "prompt", label: "관찰 프롬프트" },
  { key: "judgePrompt", label: "판정 프롬프트" },
];

const AXIS_ORDER = ["EI", "TC", "SR", "DM"] as const;
type AxisKey = (typeof AXIS_ORDER)[number];

/** 축별 글자의 출처 */
type Source = "ENGINE" | "ENGINE_NEUTRAL_FIXED" | "LLM" | "LLM_FALLBACK";

interface AxisResult {
  letter: string | null;
  source: Source | null;
  label: string | null; // 엔진 점수 (예: EI4)
  detail: string | null;
}

/** 서버의 styleId — 대표 의복의 네 글자 조합 */
interface StyleIdResult {
  ok: boolean;
  style_id?: string;
  style?: { name: string; subTitle: string; definition: string } | null;
  target_id?: string;
  axes?: Record<AxisKey, AxisResult>;
  error?: string;
}

/** 서버의 LLM 판정 — 축별 근거를 보여 줄 때 쓴다 */
interface LlmJudgement {
  ok: boolean;
  axes?: Record<AxisKey, { letter: string; strength: Strength; evidence: string[]; rationale: string }> & {
    summary: string;
  };
  error?: string;
}

type Strength = "strong" | "moderate" | "weak";
const STRENGTH_LABEL: Record<Strength, string> = { strong: "강", moderate: "중", weak: "약" };

const SOURCE_LABEL: Record<Source, string> = {
  ENGINE: "엔진",
  ENGINE_NEUTRAL_FIXED: "엔진 · 중립 고정",
  LLM: "LLM",
  LLM_FALLBACK: "LLM 대체",
};

interface Summary {
  styleId: StyleIdResult | null;
  judgement: LlmJudgement | null;
}

const EMPTY_PROMPTS: Record<PromptKey, string> = { prompt: "", judgePrompt: "" };

export default function StyleExPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [defaults, setDefaults] = useState(EMPTY_PROMPTS);
  const [prompts, setPrompts] = useState(EMPTY_PROMPTS);
  const [tab, setTab] = useState<PromptKey>("prompt");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  // 기본 프롬프트 (관찰 · 판정)
  useEffect(() => {
    let cancelled = false;
    authFetch("/api/style-ex")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || typeof data.prompt !== "string") return;
        const loaded = { prompt: data.prompt, judgePrompt: data.judgePrompt ?? "" };
        setDefaults(loaded);
        setPrompts(loaded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 미리보기 URL 은 새 파일을 고를 때와 페이지를 떠날 때 해제한다
  const previewUrlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 골라도 change 가 뜨도록
    if (!picked) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(picked);
    setPreviewUrl(previewUrlRef.current);
    setFile(picked);
    setResult("");
    setSummary(null);
    setStatus("idle");
    setElapsed(null);
  };

  const handleExtract = async () => {
    if (!file || status === "running") return;
    setStatus("running");
    setResult("");
    setSummary(null);
    const started = performance.now();

    const body = new FormData();
    body.append("image", file);
    for (const { key } of PROMPT_TABS) {
      if (prompts[key] !== defaults[key]) body.append(key, prompts[key]);
    }

    try {
      const res = await authFetch("/api/style-ex", { method: "POST", body });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      setSummary({ styleId: data.styleId ?? null, judgement: data.judgement ?? null });
      setStatus(res.ok && data.observation?.ok !== false && data.styleId?.ok ? "done" : "error");
    } catch (e) {
      setResult(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setElapsed((performance.now() - started) / 1000);
    }
  };

  const prompt = prompts[tab];
  const isEdited = (key: PromptKey) => defaults[key] !== "" && prompts[key] !== defaults[key];

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)] select-text">
      {/* 상단 버튼 그룹 */}
      <div className="flex-none flex items-center gap-2 px-4 py-2 border-b border-[var(--color-divider)] bg-[var(--color-panel)]">
        <span className="text-sm text-black/60 truncate">
          {file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : "이미지를 선택하세요"}
        </span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="ml-auto btn btn-secondary px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm"
        >
          <ImagePlus className="w-4 h-4 text-[var(--color-accent-700)]" />
          이미지
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handlePick}
        />
      </div>

      {/* 본문: 좌 미리보기 / 우 프롬프트 + 결과 */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2">
        {/* 왼쪽 — 이미지 미리보기 */}
        <section className="relative min-h-[320px] md:min-h-0 border-b md:border-b-0 md:border-r border-[var(--color-divider)] flex items-center justify-center p-4 checker-pattern">
          {previewUrl && file ? (
            // blob: URL 이라 next/image 최적화를 쓸 수 없다
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={file.name} className="max-w-full max-h-full object-contain shadow" />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 text-black/50 hover:text-black/70"
            >
              <ImagePlus className="w-10 h-10" />
              <span className="text-sm">이미지를 선택하세요</span>
            </button>
          )}

          {/* 추출 FAB — 미리보기 영역 오른쪽 위 */}
          <button
            type="button"
            onClick={handleExtract}
            disabled={!file || status === "running"}
            title={file ? "의류 스타일 추출" : "먼저 이미지를 선택하세요"}
            className="absolute top-4 right-4 btn btn-primary rounded-full shadow-lg px-5 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "running" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ScanSearch className="w-5 h-5" />
            )}
            {status === "running" ? "추출 중…" : "추출"}
          </button>
        </section>

        {/* 오른쪽 — 위: 프롬프트 / 아래: 결과 */}
        <section className="min-h-0 grid grid-rows-2">
          <div className="min-h-0 flex flex-col border-b border-[var(--color-divider)]">
            <div className="flex-none flex items-center gap-1 px-4 py-2 text-sm">
              {PROMPT_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-3 py-1 rounded-full ${
                    tab === key ? "bg-[rgba(182,130,53,0.16)] font-semibold" : "hover:bg-black/5"
                  }`}
                >
                  {label}
                  {isEdited(key) && <span className="ml-1 text-[var(--color-accent-700)]">•</span>}
                </button>
              ))}
              <span className="ml-2 text-xs text-black/50">{prompt.length.toLocaleString()}자</span>
              {isEdited(tab) && (
                <button
                  type="button"
                  onClick={() => setPrompts((p) => ({ ...p, [tab]: defaults[tab] }))}
                  className="ml-auto flex items-center gap-1 text-xs text-black/60 hover:text-black"
                >
                  <RotateCcw className="w-3 h-3" />
                  기본값 복원
                </button>
              )}
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompts((p) => ({ ...p, [tab]: e.target.value }))}
              spellCheck={false}
              placeholder="프롬프트를 불러오는 중…"
              className="flex-1 min-h-0 mx-4 mb-1 p-3 resize-none rounded border border-[var(--color-divider)] bg-white font-[family-name:var(--font-mono)] text-xs leading-relaxed vt-scroll"
            />
            <p className="flex-none mx-4 mb-3 text-xs text-black/50">
              {tab === "prompt"
                ? "이미지와 함께 Vision 모델에 보냅니다."
                : "관찰값 JSON 이 이 프롬프트 뒤에 자동으로 붙어 판정 모델에 보내집니다."}
            </p>
          </div>

          <div className="min-h-0 flex flex-col">
            <div className="flex-none flex items-center gap-2 px-4 py-2 text-sm font-semibold">
              호출 결과
              {elapsed !== null && (
                <span className="text-xs font-normal text-black/50">{elapsed.toFixed(1)}초</span>
              )}
              {status === "error" && (
                <span className="text-xs font-normal text-[var(--color-danger)]">실패</span>
              )}
            </div>
            <div className="flex-1 min-h-0 mx-4 mb-4 overflow-auto rounded border border-[var(--color-divider)] bg-white vt-scroll">
              {summary?.styleId && <StyleIdCard summary={summary} />}
              <pre className="p-3 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap break-all">
                {status === "running"
                  ? "관찰 → 스코어링 → 판정 중… (수십 초~수 분 걸릴 수 있습니다)"
                  : result || "추출 결과가 여기에 표시됩니다."}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


/** 스타일 아이디 요약 — 결과 JSON 위에 보인다. 축마다 글자의 출처(엔진 · LLM)를 함께 표시한다. */
function StyleIdCard({ summary }: { summary: Summary }) {
  const { styleId, judgement } = summary;
  if (!styleId) return null;
  const llm = judgement?.ok ? judgement.axes : undefined;

  return (
    <div className="p-3 border-b border-[var(--color-divider)] text-sm space-y-2">
      {styleId.ok ? (
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-[0.2em] text-[var(--color-accent-700)]">
            {styleId.style_id}
          </span>
          {styleId.style && (
            <span>
              <span className="font-semibold">{styleId.style.name}</span>
              <span className="ml-2 text-black/60">{styleId.style.subTitle}</span>
            </span>
          )}
          {styleId.target_id && <span className="text-xs text-black/50">기준: {styleId.target_id}</span>}
        </div>
      ) : (
        <p className="text-[var(--color-danger)]">스타일 아이디를 정하지 못했습니다: {styleId.error}</p>
      )}
      {styleId.ok && styleId.style && <p className="text-black/80">{styleId.style.definition}</p>}

      {styleId.axes && (
        <ul className="space-y-1.5">
          {AXIS_ORDER.map((key) => {
            const a = styleId.axes![key];
            const l = llm?.[key];
            const usesLlm = a.source === "LLM" || a.source === "LLM_FALLBACK";
            return (
              <li key={key} className="flex gap-2">
                <span className="flex-none w-10 font-[family-name:var(--font-mono)]">
                  {key} <b>{a.letter ?? "?"}</b>
                </span>
                <span className="flex-none w-32 text-xs pt-0.5">
                  {a.source ? (
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        usesLlm ? "bg-black/5 text-black/70" : "bg-[rgba(182,130,53,0.16)] text-[var(--color-accent-800)]"
                      }`}
                    >
                      {SOURCE_LABEL[a.source]}
                      {a.label && ` ${a.label}`}
                    </span>
                  ) : (
                    <span className="text-[var(--color-danger)]">판정 없음</span>
                  )}
                </span>
                <span className="text-black/80">
                  {usesLlm && l ? (
                    <>
                      {l.rationale}
                      <span className="ml-1 text-xs text-black/50">({STRENGTH_LABEL[l.strength]})</span>
                    </>
                  ) : null}
                  {a.detail && <span className="block text-xs text-black/50">{a.detail}</span>}
                  {usesLlm && l && l.evidence.length > 0 && (
                    <span className="block text-xs text-black/50">{l.evidence.join(" · ")}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {judgement && !judgement.ok && (
        <p className="text-xs text-[var(--color-danger)]">LLM 판정 실패: {judgement.error}</p>
      )}
    </div>
  );
}
