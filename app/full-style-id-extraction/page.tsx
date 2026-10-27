"use client";

/* Full-Look Style ID (/full-style-id-extraction)
   개별 의복이 아니라 착장 전체(Full-Look)로 스타일 아이디를 정한다. 구성은 /style-ex 와 같다.

   ┌ 이미지 미리보기        [이미지] [추출] ┬ [관찰 프롬프트]     [클로드|Gemini] ┤
   │                                      ├ 호출 결과 [관찰 결과|판정 결과]          │
   └──────────────────────────────────────┴───────────────────────────────────┘

   관찰 = Vision 모델 1회 → Full-Look Vision Extractor(FLV_RC6_FINAL)가 Evidence Packet 으로 구조화.
   판정 = Full-Look Scoring Engines(EI · TC · SR 방향, 동결 코드)에 패킷을 넘긴다 — 판정 프롬프트는 없다.
   관찰 프롬프트는 /style-ex 와 같은 표(style_ex_prompt_versions)에 target='full' 로 버전이 쌓인다.
   처음에는 활성 버전(없으면 승인 V2 원문이 v1)을 채우고, 고치면 고친 내용으로 호출한다.
   추출 엔진은 승인 V2 로 검증됐으므로 지금 프롬프트가 V2 와 다르면 표시한다. */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, RotateCcw, Save, ScanSearch } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { StyleIdCard, type StyleIdResult } from "@/components/style-ex/result-cards";

type Status = "idle" | "running" | "done" | "error";
type Provider = "claude" | "gemini";
type ResultKey = "observe" | "judge";

const RESULT_TABS: { key: ResultKey; label: string }[] = [
  { key: "observe", label: "관찰 결과" },
  { key: "judge", label: "판정 결과" },
];

/** 엔진 방향 기록 (축별) */
interface AxisRecord {
  axis?: string;
  status: string;
  direction: string | null;
  rule?: string;
  error?: string;
}

/** /api/style-ex/prompts 의 프롬프트 버전 (target='full', kind='observe') */
interface PromptVersion {
  id: string;
  version: number;
  content: string;
  note: string | null;
  is_active: boolean;
  created_at: string;
}

const VERSIONS_URL = "/api/style-ex/prompts?target=full&kind=observe";

/** 서버(/api/full-style-id-extraction)의 이미지 한도와 같다 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

const sha256Hex = async (text: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export default function FullStyleIdExtractionPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  /** 활성 버전의 내용 — 이것과 다르면 고친 것이다 */
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [approved, setApproved] = useState<{ version: string; sha256: string } | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [versionNote, setVersionNote] = useState("");
  const [versionBusy, setVersionBusy] = useState(false);
  const [models, setModels] = useState<Record<Provider, string> | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("claude");
  const [status, setStatus] = useState<Status>("idle");
  const [resultTab, setResultTab] = useState<ResultKey>("judge");
  const [parts, setParts] = useState<{ observe: string; judge: string } | null>(null);
  const [message, setMessage] = useState("");
  const [packetStatus, setPacketStatus] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<StyleIdResult | null>(null);
  const [scoring, setScoring] = useState<Record<string, AxisRecord> | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const loadVersions = useCallback(async () => {
    const res = await authFetch(VERSIONS_URL);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `버전 목록을 읽지 못했습니다 (${res.status})`);
    setVersions(data.versions ?? []);
  }, []);

  // 기본 관찰 프롬프트 = target='full' 활성 버전. 버전 목록은 그 뒤에 읽는다 — 첫 호출이 v1 을 등록할 수 있다.
  useEffect(() => {
    let cancelled = false;
    const fail = (e: unknown) => {
      if (!cancelled) setPromptError(e instanceof Error ? e.message : String(e));
    };
    (async () => {
      try {
        const res = await authFetch("/api/full-style-id-extraction");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (typeof data.prompt !== "string") throw new Error(data.error ?? `관찰 프롬프트를 받지 못했습니다 (${res.status})`);
        setPrompt(data.prompt);
        setDefaultPrompt(data.prompt);
        setApproved(data.approved ?? null);
        setModels(data.models ?? null);
        if (!data.versions?.prompt) {
          fail(new Error("프롬프트 버전 표를 읽지 못해 코드 기본 프롬프트(승인 V2)를 불러왔습니다. 0020 마이그레이션을 확인하세요."));
        }
      } catch (e) {
        fail(e);
      }
      if (!cancelled) await loadVersions().catch(fail);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadVersions]);

  // 지금 프롬프트가 추출 엔진이 검증된 승인 원문과 같은지
  useEffect(() => {
    if (!approved || !prompt) return;
    let cancelled = false;
    sha256Hex(prompt).then((h) => {
      if (!cancelled) setIsApproved(h === approved.sha256);
    });
    return () => {
      cancelled = true;
    };
  }, [prompt, approved]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const resetResult = () => {
    setParts(null);
    setMessage("");
    setPacketStatus(null);
    setStyleId(null);
    setScoring(null);
    setUsedModel(null);
    setElapsed(null);
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 골라도 change 가 뜨도록
    if (!picked) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(picked);
    setPreviewUrl(previewUrlRef.current);
    setFile(picked);
    resetResult();
    setStatus(picked.size > MAX_IMAGE_BYTES ? "error" : "idle");
    if (picked.size > MAX_IMAGE_BYTES) setMessage(`이미지가 5MB 를 넘습니다 (${(picked.size / 1024 / 1024).toFixed(1)}MB).`);
  };

  const handleExtract = async () => {
    if (!file || status === "running" || file.size > MAX_IMAGE_BYTES) return;
    setStatus("running");
    resetResult();
    const started = performance.now();
    const body = new FormData();
    body.append("image", file);
    body.append("provider", provider);
    // 관찰 프롬프트는 고친 경우에만 보낸다 — 그대로면 서버가 활성 버전을 쓴다
    if (prompt !== defaultPrompt) body.append("prompt", prompt);
    try {
      const res = await authFetch("/api/full-style-id-extraction", { method: "POST", body });
      const data = await res.json();
      setUsedModel(data.visionModel ?? null);
      if (data.observation) {
        const { observation, ...judged } = data;
        setParts({ observe: JSON.stringify(observation, null, 2), judge: JSON.stringify(judged, null, 2) });
        setPacketStatus(observation.status ?? null);
        setResultTab(observation.status === "PACKET_VALID" ? "judge" : "observe");
      } else {
        setMessage(JSON.stringify(data, null, 2));
      }
      setStyleId(data.styleId ?? null);
      setScoring(data.scoring ?? null);
      setStatus(res.ok && data.styleId?.ok ? "done" : "error");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setElapsed((performance.now() - started) / 1000);
    }
  };

  const modelLabel = (p: Provider) => models?.[p] ?? (p === "claude" ? "Claude" : "Gemini");
  const isEdited = defaultPrompt !== "" && prompt !== defaultPrompt;
  const currentVersion = versions.find((v) => v.content === prompt) ?? null;
  const activeVersion = versions.find((v) => v.is_active) ?? null;

  /** 버전 API 호출 — 실패하면 오류를 보여 주고, 성공하면 목록을 다시 읽는다 */
  const versionRequest = async (url: string, method: "POST" | "PATCH", payload: unknown, onDone: () => void) => {
    if (versionBusy) return;
    setVersionBusy(true);
    setPromptError(null);
    try {
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `요청이 실패했습니다 (${res.status})`);
      onDone();
      await loadVersions();
    } catch (e) {
      setPromptError(e instanceof Error ? e.message : String(e));
    } finally {
      setVersionBusy(false);
    }
  };

  /** 지금 칸의 내용을 target='full' 새 버전으로 저장한다 (activate 면 바로 활성화) */
  const handleSaveVersion = (activate: boolean) => {
    if (!prompt.trim()) return;
    const content = prompt;
    return versionRequest(
      "/api/style-ex/prompts",
      "POST",
      { target: "full", kind: "observe", content, note: versionNote, activate },
      () => {
        if (activate) setDefaultPrompt(content);
        setVersionNote("");
      }
    );
  };

  /** 버전을 활성화한다 — 이후 추출의 기본 프롬프트가 된다 (지난 버전이면 롤백) */
  const handleActivate = (v: PromptVersion) =>
    versionRequest(`/api/style-ex/prompts/${v.id}`, "PATCH", { active: true }, () => setDefaultPrompt(v.content));

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)] select-text">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePick} />

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
              <span className="text-sm">착장 전체가 보이는 이미지를 선택하세요</span>
            </button>
          )}

          {/* 상단 FAB 그룹 (이미지 선택 + 추출) */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={status === "running"}
              title={file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB (클릭하여 변경)` : "이미지 선택"}
              className="btn btn-secondary bg-white/95 hover:bg-white rounded-full shadow-lg px-4 py-3 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <ImagePlus className="w-5 h-5 text-[var(--color-accent-700)]" />
              <span>이미지</span>
            </button>
            <button
              type="button"
              onClick={handleExtract}
              disabled={!file || status === "running" || !prompt}
              title={file ? "Full-Look 스타일 아이디 추출" : "먼저 이미지를 선택하세요"}
              className="btn btn-primary rounded-full shadow-lg px-5 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "running" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanSearch className="w-5 h-5" />}
              {status === "running" ? "추출 중…" : "추출"}
            </button>
          </div>
        </section>

        {/* 오른쪽 — 위: 관찰 프롬프트 / 아래: 호출 결과 */}
        <section className="min-h-0 grid grid-rows-[1fr_1fr]">
          <div className="min-h-0 flex flex-col border-b border-[var(--color-divider)]">
            <div className="flex-none flex items-center gap-1 px-4 py-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-[rgba(182,130,53,0.16)] font-semibold">
                관찰 프롬프트
                {isEdited && <span className="ml-1 text-[var(--color-accent-700)]">•</span>}
              </span>
              <span className="ml-2 text-xs text-black/50">{prompt.length.toLocaleString()}자</span>
              {approved && isApproved !== null && (
                <span
                  className={`ml-2 text-xs ${isApproved ? "text-emerald-700" : "text-amber-700"}`}
                  title={`승인 ${approved.version} sha256 ${approved.sha256}`}
                >
                  {isApproved ? `승인 ${approved.version} 원문` : `승인 ${approved.version} 과 다름`}
                </span>
              )}
              {/* 모델 선택 토글 (클로드 / Gemini) */}
              <div className="ml-auto flex items-center rounded-lg border border-[var(--color-divider)] bg-black/5 p-0.5 text-xs">
                {(["claude", "gemini"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    disabled={status === "running"}
                    title={modelLabel(p)}
                    className={`rounded-md px-2.5 py-0.5 font-medium transition-colors ${
                      provider === p
                        ? `bg-white font-semibold shadow-sm ${p === "claude" ? "text-[var(--color-accent-700)]" : "text-emerald-600"}`
                        : "text-black/60 hover:text-black"
                    }`}
                  >
                    {p === "claude" ? "클로드" : "Gemini"}
                  </button>
                ))}
              </div>
              <select
                value={currentVersion?.id ?? ""}
                onChange={(e) => {
                  const v = versions.find((x) => x.id === e.target.value);
                  if (v) setPrompt(v.content);
                }}
                disabled={!versions.length}
                title="버전을 고르면 그 내용을 불러옵니다"
                className="max-w-[16rem] truncate rounded border border-[var(--color-divider)] bg-white px-2 py-0.5 text-xs"
              >
                {!currentVersion && <option value="">{versions.length ? "저장 안 한 내용" : "버전 없음"}</option>}
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {`v${v.version}${v.is_active ? " (활성)" : ""} · ${shortDate(v.created_at)}${v.note ? ` · ${v.note}` : ""}`}
                  </option>
                ))}
              </select>
              {isEdited && (
                <button
                  type="button"
                  onClick={() => setPrompt(defaultPrompt)}
                  className="flex items-center gap-1 text-xs text-black/60 hover:text-black"
                >
                  <RotateCcw className="w-3 h-3" />
                  활성 버전 복원
                </button>
              )}
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              spellCheck={false}
              placeholder={promptError ?? "프롬프트를 불러오는 중…"}
              className="flex-1 min-h-0 mx-4 mb-1 p-3 resize-none rounded border border-[var(--color-divider)] bg-white font-[family-name:var(--font-mono)] text-xs leading-relaxed vt-scroll"
            />
            <p className="flex-none mx-4 mb-1 text-xs text-black/50">
              이미지와 함께 {modelLabel(provider)} 에 보내고, 응답은 Evidence Packet 으로 구조화된 뒤 Full-Look Scoring
              Engine(EI · TC · SR)이 판정합니다. 추출 엔진은 승인 {approved?.version ?? "V2"} 원문으로 검증됐습니다.
            </p>
            {/* 버전 관리 (target='full') — 저장 안 한 내용이면 새 버전으로 저장, 활성이 아닌 버전이면 활성화 */}
            <div className="flex-none flex items-center gap-2 mx-4 mb-3 text-xs">
              {currentVersion ? (
                <>
                  <span className="text-black/60">
                    v{currentVersion.version}
                    {currentVersion.is_active ? " · 활성 버전" : activeVersion ? ` · 활성 버전은 v${activeVersion.version}` : ""}
                  </span>
                  {!currentVersion.is_active && (
                    <button
                      type="button"
                      onClick={() => handleActivate(currentVersion)}
                      disabled={versionBusy}
                      className="ml-auto flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-divider)] hover:bg-black/5 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />v{currentVersion.version} 활성화
                    </button>
                  )}
                </>
              ) : (
                <>
                  <input
                    value={versionNote}
                    onChange={(e) => setVersionNote(e.target.value)}
                    placeholder="변경 메모 (무엇을 왜 바꿨는지)"
                    className="flex-1 min-w-0 rounded border border-[var(--color-divider)] bg-white px-2 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveVersion(false)}
                    disabled={versionBusy || !prompt.trim()}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-divider)] hover:bg-black/5 disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" />새 버전 저장
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveVersion(true)}
                    disabled={versionBusy || !prompt.trim()}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(182,130,53,0.16)] font-semibold hover:bg-[rgba(182,130,53,0.26)] disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    저장 후 활성화
                  </button>
                </>
              )}
              {versionBusy && <Loader2 className="w-3 h-3 animate-spin" />}
            </div>
            {promptError && <p className="flex-none mx-4 -mt-2 mb-2 text-xs text-[var(--color-danger)]">{promptError}</p>}
          </div>

          <div className="min-h-0 flex flex-col">
            <div className="flex-none flex items-center gap-2 px-4 py-2 text-sm font-semibold">
              호출 결과
              <span className="flex items-center gap-1 font-normal">
                {RESULT_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setResultTab(key)}
                    className={`px-3 py-1 rounded-full ${
                      resultTab === key ? "bg-[rgba(182,130,53,0.16)] font-semibold" : "hover:bg-black/5"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </span>
              {elapsed !== null && <span className="text-xs font-normal text-black/50">{elapsed.toFixed(1)}초</span>}
              {usedModel && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-black/5 text-black/70">{usedModel}</span>
              )}
              {packetStatus && (
                <span
                  className={`text-xs font-normal ${packetStatus === "PACKET_VALID" ? "text-emerald-700" : "text-[var(--color-danger)]"}`}
                >
                  {packetStatus}
                </span>
              )}
              {status === "error" && <span className="text-xs font-normal text-[var(--color-danger)]">실패</span>}
            </div>
            <div className="flex-1 min-h-0 mx-4 mb-4 overflow-auto rounded border border-[var(--color-divider)] bg-white vt-scroll">
              {resultTab === "judge" && styleId && (
                <>
                  <StyleIdCard summary={{ styleId, judgement: null }} />
                  {scoring && <DirectionRows scoring={scoring} />}
                </>
              )}
              <pre className="p-3 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap break-all">
                {status === "running"
                  ? "관찰 → Evidence Packet → EI · TC · SR 판정 중… (수십 초~수 분 걸릴 수 있습니다)"
                  : parts?.[resultTab] ||
                    message ||
                    (resultTab === "observe"
                      ? "관찰 프롬프트의 결과(모델 출력 · Evidence Packet · run_record · 검증)가 여기에 표시됩니다."
                      : "관찰 결과를 Scoring Engine 에 넣은 결과(EI · TC · SR 방향 · 스타일 아이디)가 여기에 표시됩니다.")}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** 엔진별 방향 · 규칙 · 상태 한 줄씩 */
function DirectionRows({ scoring }: { scoring: Record<string, AxisRecord> }) {
  return (
    <ul className="p-3 border-b border-[var(--color-divider)] text-xs space-y-1">
      {(["EI", "TC", "SR"] as const).map((axis) => {
        const r = scoring[axis];
        if (!r) return null;
        return (
          <li key={axis} className="flex gap-2 font-[family-name:var(--font-mono)]">
            <span className="w-8 font-semibold">{axis}</span>
            <span className={r.status === "RESOLVED" ? "text-emerald-700" : "text-[var(--color-danger)]"}>{r.status}</span>
            <span className="font-semibold">{r.direction ?? "—"}</span>
            {r.rule && <span className="text-black/50">{r.rule}</span>}
            {r.error && <span className="text-[var(--color-danger)] truncate">{r.error}</span>}
          </li>
        );
      })}
    </ul>
  );
}
