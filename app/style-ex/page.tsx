"use client";

/* Style ID (/style-ex)
   이미지 한 장을 골라 의류 스타일 추출(lib/style-ex)을 호출하고 결과를 본다.

   ┌ 이미지 미리보기  [상품 Style ID 추출] [이미지] [추출] ┬ 프롬프트 [관찰|판정] ┤
   │                                ├ 상품 정보      [PDF 작성] ┤ ← 상품으로 추출했을 때
   │                                ├ 호출 결과 [관찰|판정]          │
   └────────────────────────────────┴────────────────────────────┘

   추출은 두 단계다 — 관찰(이미지 → 37개 파라미터) → 판정(관찰값 → 스타일 아이디).
   두 프롬프트 모두 DB 에 버전으로 쌓인다(style_ex_prompt_versions, lib/style-ex/prompt-versions).
   처음에는 활성 버전을 불러와 채운다. 수정하면 수정한 내용으로 호출하고, 그대로면 서버가 활성 버전을 쓴다.
   버전 목록에서 지난 버전을 불러오거나, 고친 내용을 새 버전으로 저장하거나, 버전을 활성화(롤백)할 수 있다.

   입력 이미지는 파일로 고르거나, [상품 Style ID 추출] 모달(ProductPickModal)에서 등록된 상품을
   찾아 그 상품의 원본 사진을 쓴다. 상품으로 추출하면 프롬프트 아래에 상품 정보가 서고, [PDF 작성] 이
   상품 사진 · 상품 정보 · 호출 결과를 위에서 아래로 담은 PDF 를 내려받게 한다(lib/style-ex/report-pdf). */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Crop, ExternalLink, FileDown, ImagePlus, Loader2, RotateCcw, Save, ScanSearch, ShoppingBag } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import ProductPickModal from "@/components/style-ex/ProductPickModal";
import type { CatalogProduct } from "@/lib/tryon/product-catalog";
import { downloadReportPdf, type ReportBlock } from "@/lib/style-ex/report-pdf";
import {
  AXIS_ORDER,
  SOURCE_LABEL,
  STRENGTH_LABEL,
  StyleIdCard,
  axisLettersText,
  multipleCandidates,
  productRows,
  type Summary,
} from "@/components/style-ex/result-cards";

type Status = "idle" | "running" | "done" | "error";
type PromptKey = "prompt" | "judgePrompt";

// 판정은 코드(엔진 · tc-rules)가 하므로 판정 프롬프트 탭은 두지 않는다. judgePrompt 키는 판정 프롬프트 버전을
// 다시 쓸 때를 위해 남겨 둔다 (LLM 판정 judge.ts · 버전 표는 그대로 있다).
const PROMPT_TABS: { key: PromptKey; label: string }[] = [{ key: "prompt", label: "관찰 프롬프트" }];

/** 호출 결과 탭 — 관찰 프롬프트의 결과 / 판정 프롬프트의 결과 */
type ResultKey = "observe" | "judge";
const RESULT_TABS: { key: ResultKey; label: string }[] = [
  { key: "observe", label: "관찰 결과" },
  { key: "judge", label: "판정 결과" },
];

/** 화면의 프롬프트 칸 → DB 의 프롬프트 종류 (style_ex_prompt_versions.kind) */
const PROMPT_KIND: Record<PromptKey, "observe" | "judge"> = { prompt: "observe", judgePrompt: "judge" };

/** /api/style-ex/prompts 의 프롬프트 버전 */
interface PromptVersion {
  id: string;
  version: number;
  content: string;
  note: string | null;
  is_active: boolean;
  created_at: string;
}

/** 부위 크롭 결과 (/api/style-ex/crops) */
interface CropResult {
  ok: boolean;
  dir?: string;
  error?: string;
  crops?: Array<{
    id: string;
    param: string;
    value: string;
    component: string | null;
    descriptor: string | null;
    found: boolean;
    file: string | null;
    data_url: string | null;
  }>;
  skipped?: Array<{ param: string; value: string; reason: string }>;
}


const EMPTY_PROMPTS: Record<PromptKey, string> = { prompt: "", judgePrompt: "" };
const EMPTY_VERSIONS: Record<PromptKey, PromptVersion[]> = { prompt: [], judgePrompt: [] };

const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

/** 서버(/api/style-ex)의 이미지 한도와 같다 — Anthropic 이미지 입력 한도 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;



const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export default function StyleExPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [defaults, setDefaults] = useState(EMPTY_PROMPTS);
  const [prompts, setPrompts] = useState(EMPTY_PROMPTS);
  const [tab, setTab] = useState<PromptKey>("prompt");
  const [versions, setVersions] = useState(EMPTY_VERSIONS);
  const [versionNote, setVersionNote] = useState("");
  const [versionBusy, setVersionBusy] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [provider, setProvider] = useState<"claude" | "gemini">("claude");
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [result, setResult] = useState("");
  /** 호출 결과를 단계별로 나눈 것 — 관찰 envelope / 그 밖(판정 · 스코어링 · 스타일 아이디) */
  const [resultParts, setResultParts] = useState<{ observe: string; judge: string } | null>(null);
  const [resultTab, setResultTab] = useState<ResultKey>("judge");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  // 부위 크롭 — 추출 결과의 관찰 envelope 가 있어야 할 수 있다
  const [envelope, setEnvelope] = useState<unknown>(null);
  const [cropping, setCropping] = useState(false);
  const [crops, setCrops] = useState<CropResult | null>(null);
  // 상품 Style ID 추출 — 고른 상품의 사진이 입력 이미지가 된다
  const [productModal, setProductModal] = useState(false);
  const [productLoading, setProductLoading] = useState<string | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  /** 상품 사진으로 추출했을 때 product_style 저장 결과 */
  const [saved, setSaved] = useState<{ id: string } | { error: string } | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  /** 한 종류의 버전 목록을 다시 읽는다 */
  const loadVersions = useCallback(async (key: PromptKey) => {
    const res = await authFetch(`/api/style-ex/prompts?kind=${PROMPT_KIND[key]}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `버전 목록을 읽지 못했습니다 (${res.status})`);
    setVersions((v) => ({ ...v, [key]: data.versions ?? [] }));
  }, []);

  // 기본 프롬프트 (관찰 · 판정) = 활성 버전. 버전 목록은 그 뒤에 읽는다 — 첫 호출이 v1 을 등록할 수 있다.
  // 기본 프롬프트를 못 받아도 버전 목록은 읽고, 실패는 화면에 보인다.
  useEffect(() => {
    let cancelled = false;
    const fail = (e: unknown) => {
      if (!cancelled) setVersionError(e instanceof Error ? e.message : String(e));
    };
    (async () => {
      try {
        const res = await authFetch("/api/style-ex");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (typeof data.prompt !== "string") throw new Error(data.error ?? `기본 프롬프트를 받지 못했습니다 (${res.status})`);
        const loaded = { prompt: data.prompt, judgePrompt: data.judgePrompt ?? "" };
        setDefaults(loaded);
        setPrompts(loaded);
        if (!data.versions?.prompt) {
          fail(new Error("프롬프트 버전 표를 읽지 못해 코드 기본 프롬프트를 불러왔습니다. 서버 로그의 [style-ex] 경고를 확인하세요."));
        }
      } catch (e) {
        fail(e);
      }
      if (cancelled) return;
      await Promise.all(PROMPT_TABS.map(({ key }) => loadVersions(key))).catch(fail);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadVersions]);

  // 미리보기 URL 은 새 파일을 고를 때와 페이지를 떠날 때 해제한다
  const previewUrlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  /** 새 입력 이미지 — 파일 선택과 상품 선택이 같이 쓴다. 이전 결과는 모두 비운다. */
  const applyImage = useCallback((picked: File, from: CatalogProduct | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(picked);
    setPreviewUrl(previewUrlRef.current);
    setFile(picked);
    setProduct(from);
    setSaved(null);
    setResult("");
    setResultParts(null);
    setSummary(null);
    setEnvelope(null);
    setCrops(null);
    setStatus("idle");
    setElapsed(null);
    setPdfError(null);
  }, []);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 골라도 change 가 뜨도록
    if (picked) applyImage(picked, null);
  };

  /**
   * 상품을 고르면 그 상품의 원본 사진을 받아 입력 이미지로 쓴다.
   * 목록의 사진은 200px 축소본이라 관찰에 쓰면 디테일이 뭉개진다 — 원본(originalImageUrl)을 받는다.
   */
  const pickProduct = useCallback(
    async (picked: CatalogProduct) => {
      const url = picked.originalImageUrl ?? picked.imageUrl;
      if (!url) {
        setProductError("이 상품에는 등록된 사진이 없습니다.");
        return;
      }
      setProductLoading(picked.name);
      setProductError(null);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`상품 사진을 내려받지 못했습니다 (HTTP ${res.status}).`);
        const blob = await res.blob();
        const type = blob.type || "image/jpeg";
        if (!EXTENSION[type]) throw new Error(`지원하지 않는 이미지 형식입니다 (${type}).`);
        if (blob.size > MAX_IMAGE_BYTES) {
          throw new Error(`상품 사진이 5MB 를 넘습니다 (${(blob.size / 1024 / 1024).toFixed(1)}MB).`);
        }
        applyImage(new File([blob], `${picked.id}.${EXTENSION[type]}`, { type }), picked);
        setProductModal(false);
      } catch (e) {
        setProductError(e instanceof Error ? e.message : String(e));
      } finally {
        setProductLoading(null);
      }
    },
    [applyImage]
  );

  const closeProductModal = useCallback(() => {
    setProductModal(false);
    setProductError(null);
  }, []);

  const handleExtract = async () => {
    if (!file || status === "running") return;
    setStatus("running");
    setResult("");
    setUsedModel(null);
    setResultParts(null);
    setSummary(null);
    setEnvelope(null);
    setCrops(null);
    setSaved(null);
    const started = performance.now();

    const body = new FormData();
    body.append("image", file);
    body.append("provider", provider);
    for (const { key } of PROMPT_TABS) {
      if (prompts[key] !== defaults[key]) body.append(key, prompts[key]);
    }
    // 상품 사진이면 서버가 결과를 product_style 에 저장한다
    const productImageUrl = product && (product.originalImageUrl ?? product.imageUrl);
    if (product && productImageUrl) {
      body.append("modelId", product.id);
      body.append("imageUrl", productImageUrl);
    }

    try {
      const res = await authFetch("/api/style-ex", { method: "POST", body });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      setUsedModel(data.visionModel ?? (provider === "gemini" ? "gemini 3.8 flash" : "Claude"));
      if (data.observation) {
        const { observation, ...judged } = data;
        setResultParts({ observe: JSON.stringify(observation, null, 2), judge: JSON.stringify(judged, null, 2) });
        // 관찰이 실패하면 판정은 없다 — 관찰 결과를 먼저 보인다
        setResultTab(observation.ok === false ? "observe" : "judge");
      }
      setSummary({ styleId: data.styleId ?? null, judgement: data.judgement ?? null });
      setEnvelope(data.observation?.ok ? data.observation.envelope : null);
      setSaved(data.saved ?? null);
      setStatus(res.ok && data.observation?.ok !== false && data.styleId?.ok ? "done" : "error");
    } catch (e) {
      setResult(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setElapsed((performance.now() - started) / 1000);
    }
  };

  const handleCrop = async () => {
    if (!file || !envelope || cropping) return;
    setCropping(true);
    setCrops(null);
    const body = new FormData();
    body.append("image", file);
    body.append("envelope", JSON.stringify(envelope));
    try {
      const res = await authFetch("/api/style-ex/crops", { method: "POST", body });
      setCrops(await res.json());
    } catch (e) {
      setCrops({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setCropping(false);
    }
  };

  /** 상품 사진 → 상품 정보 → 호출 결과 순서의 PDF 를 내려받는다. */
  const handlePdf = async () => {
    if (!product || !file || !result || pdfBusy) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      const now = new Date();
      const stamp = now.toLocaleString("ko-KR", { hour12: false });
      const callRows: [string, string][] = [
        ["상태", status === "done" ? "성공" : "실패"],
        ...(elapsed !== null ? [["소요 시간", `${elapsed.toFixed(1)}초`] as [string, string]] : []),
        [
          "프롬프트",
          PROMPT_TABS.map(({ key, label }) => {
            const v = versionOf(key);
            return `${label} ${v ? `v${v.version}` : "저장 안 한 내용"}`;
          }).join(" · "),
        ],
      ];
      const blocks: ReportBlock[] = [
        { kind: "title", text: "상품 Style ID 추출 결과", sub: stamp },
        { kind: "image", src: await readAsDataUrl(file), alt: product.name },
        { kind: "heading", text: "상품 정보" },
        { kind: "rows", rows: productRows(product) },
        { kind: "pageBreak" },
        { kind: "heading", text: "호출 결과" },
        { kind: "rows", rows: callRows },
        ...(summary ? summaryBlocks(summary) : []),
        { kind: "pageBreak" },
        { kind: "code", text: withoutSaved(result) },
      ];
      const pad = (n: number) => String(n).padStart(2, "0");
      const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      const name = [product.brandName, product.name].filter(Boolean).join("_").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 60);
      await downloadReportPdf(blocks, `style-id_${name}_${day}.pdf`);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : String(e));
    } finally {
      setPdfBusy(false);
    }
  };

  const prompt = prompts[tab];
  const isEdited = (key: PromptKey) => defaults[key] !== "" && prompts[key] !== defaults[key];
  const versionOf = (key: PromptKey) => versions[key].find((v) => v.content === prompts[key]) ?? null;
  const currentVersion = versionOf(tab);
  const activeVersion = versions[tab].find((v) => v.is_active) ?? null;

  /** 버전 API 호출 — 실패하면 오류를 보여 주고, 성공하면 그 종류의 목록을 다시 읽는다 */
  const versionRequest = async (url: string, method: "POST" | "PATCH", payload: unknown, onDone: () => void) => {
    if (versionBusy) return;
    setVersionBusy(true);
    setVersionError(null);
    try {
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `요청이 실패했습니다 (${res.status})`);
      onDone();
      await loadVersions(tab);
    } catch (e) {
      setVersionError(e instanceof Error ? e.message : String(e));
    } finally {
      setVersionBusy(false);
    }
  };

  /** 지금 칸의 내용을 새 버전으로 저장한다 (activate 면 바로 활성화) */
  const handleSaveVersion = (activate: boolean) => {
    if (!prompt.trim()) return;
    const content = prompt;
    return versionRequest(
      "/api/style-ex/prompts",
      "POST",
      { kind: PROMPT_KIND[tab], content, note: versionNote, activate },
      () => {
        if (activate) setDefaults((d) => ({ ...d, [tab]: content }));
        setVersionNote("");
      }
    );
  };

  /** 버전을 활성화한다 — 이후 추출의 기본 프롬프트가 된다 (지난 버전이면 롤백) */
  const handleActivate = (v: PromptVersion) =>
    versionRequest(`/api/style-ex/prompts/${v.id}`, "PATCH", { active: true }, () =>
      setDefaults((d) => ({ ...d, [tab]: v.content }))
    );

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)] select-text">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handlePick}
      />

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

          {/* 고른 상품 — 입력 이미지가 상품 사진일 때 */}
          {product && file && (
            <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
              <span className="max-w-full truncate rounded-full bg-white/95 shadow px-3 py-1 text-xs text-black/70">
                {[product.brandName, product.name].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}

          {/* 상단 FAB 그룹 (상품 선택 + 이미지 선택 + 스타일 추출) */}
          <div className="absolute top-4 right-4 flex flex-wrap justify-end items-center gap-2 z-10">
            <button
              type="button"
              onClick={() => setProductModal(true)}
              disabled={status === "running"}
              title="등록된 상품을 찾아 그 상품 사진으로 Style ID 를 추출"
              className="btn btn-secondary bg-white/95 hover:bg-white rounded-full shadow-lg px-4 py-3 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-5 h-5 text-[var(--color-accent-700)]" />
              <span>상품 Style ID 추출</span>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title={file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB (클릭하여 변경)` : "이미지 선택"}
              className="btn btn-secondary bg-white/95 hover:bg-white rounded-full shadow-lg px-4 py-3 flex items-center gap-2 text-sm"
            >
              <ImagePlus className="w-5 h-5 text-[var(--color-accent-700)]" />
              <span>이미지</span>
            </button>
            <button
              type="button"
              onClick={handleExtract}
              disabled={!file || status === "running"}
              title={file ? "의류 스타일 추출" : "먼저 이미지를 선택하세요"}
              className="btn btn-primary rounded-full shadow-lg px-5 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "running" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ScanSearch className="w-5 h-5" />
              )}
              {status === "running" ? "추출 중…" : "추출"}
            </button>
          </div>
        </section>

        {/* 오른쪽 — 위: 프롬프트 / 가운데: 상품 정보(상품으로 추출했을 때) / 아래: 결과 */}
        <section className="min-h-0 grid grid-rows-[1fr_auto_1fr]">
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
              {/* 모델 선택 토글 (클로드 / gemini) — 관찰프롬프트 선택 인풋 바로 왼쪽 */}
              <div className="ml-auto flex items-center rounded-lg border border-[var(--color-divider)] bg-black/5 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setProvider("claude")}
                  className={`rounded-md px-2.5 py-0.5 font-medium transition-colors ${
                    provider === "claude"
                      ? "bg-white font-semibold text-[var(--color-accent-700)] shadow-sm"
                      : "text-black/60 hover:text-black"
                  }`}
                  title="Claude (기본: claude-opus-4-8)"
                >
                  클로드
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("gemini")}
                  className={`rounded-md px-2.5 py-0.5 font-medium transition-colors ${
                    provider === "gemini"
                      ? "bg-white font-semibold text-emerald-600 shadow-sm"
                      : "text-black/60 hover:text-black"
                  }`}
                  title="Google Gemini (gemini 3.8 flash)"
                >
                  gemini
                </button>
              </div>
              <select
                value={currentVersion?.id ?? ""}
                onChange={(e) => {
                  const v = versions[tab].find((x) => x.id === e.target.value);
                  if (v) setPrompts((p) => ({ ...p, [tab]: v.content }));
                }}
                disabled={!versions[tab].length}
                title="버전을 고르면 그 내용을 불러옵니다"
                className="max-w-[16rem] truncate rounded border border-[var(--color-divider)] bg-white px-2 py-0.5 text-xs"
              >
                {!currentVersion && <option value="">{versions[tab].length ? "저장 안 한 내용" : "버전 없음"}</option>}
                {versions[tab].map((v) => (
                  <option key={v.id} value={v.id}>
                    {`v${v.version}${v.is_active ? " (활성)" : ""} · ${shortDate(v.created_at)}${v.note ? ` · ${v.note}` : ""}`}
                  </option>
                ))}
              </select>
              {isEdited(tab) && (
                <button
                  type="button"
                  onClick={() => setPrompts((p) => ({ ...p, [tab]: defaults[tab] }))}
                  className="flex items-center gap-1 text-xs text-black/60 hover:text-black"
                >
                  <RotateCcw className="w-3 h-3" />
                  활성 버전 복원
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
            <p className="flex-none mx-4 mb-1 text-xs text-black/50">
              {tab === "prompt"
                ? `이미지와 함께 Vision 모델(${provider === "gemini" ? "gemini 3.8 flash" : "클로드 Opus"})에 보냅니다.`
                : "관찰값 JSON 이 이 프롬프트 뒤에 자동으로 붙어 판정 모델에 보내집니다."}
            </p>
            {/* 버전 관리 — 저장 안 한 내용이면 새 버전으로 저장, 활성이 아닌 버전이면 활성화 */}
            <div className="flex-none flex items-center gap-2 mx-4 mb-3 text-xs">
              {currentVersion ? (
                <>
                  <span className="text-black/60">
                    v{currentVersion.version}
                    {currentVersion.is_active
                      ? " · 활성 버전"
                      : activeVersion
                        ? ` · 활성 버전은 v${activeVersion.version}`
                        : ""}
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
            {versionError && <p className="flex-none mx-4 -mt-2 mb-2 text-xs text-red-600">{versionError}</p>}
          </div>

          {/* 상품 정보 — 상품을 고르고 추출을 누른 뒤에 선다. 사진은 왼쪽에 있으니 뺀다. */}
          {product && status !== "idle" ? (
            <div className="flex items-start gap-3 px-4 py-3 border-b border-[var(--color-divider)] bg-[var(--color-panel)]">
              <dl className="flex-1 min-w-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs m-0">
                {productRows(product).map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-black/50">{label}</dt>
                    <dd className="m-0 min-w-0 truncate text-black" title={value}>
                      {label === "판매 페이지" ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--color-accent-700)] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3 flex-none" />
                          <span className="truncate">{value}</span>
                        </a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="flex-none flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={handlePdf}
                  disabled={!result || status === "running" || pdfBusy}
                  title={status === "running" ? "추출이 끝나면 만들 수 있습니다" : "상품 사진 · 상품 정보 · 호출 결과를 PDF 로"}
                  className="btn btn-primary px-4 py-2 rounded-full flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  {pdfBusy ? "작성 중…" : "PDF 작성"}
                </button>
                {pdfError && (
                  <span className="max-w-[160px] truncate text-xs text-[var(--color-danger)]" title={pdfError}>
                    {pdfError}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div />
          )}

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
              {elapsed !== null && (
                <span className="text-xs font-normal text-black/50">{elapsed.toFixed(1)}초</span>
              )}
              {usedModel && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-black/5 text-black/70">
                  {usedModel}
                </span>
              )}
              {status === "error" && (
                <span className="text-xs font-normal text-[var(--color-danger)]">실패</span>
              )}
              {saved &&
                ("id" in saved ? (
                  <span className="text-xs font-normal text-emerald-700" title={`product_style.id = ${saved.id}`}>
                    DB 저장됨
                  </span>
                ) : (
                  <span className="text-xs font-normal text-[var(--color-danger)] truncate" title={saved.error}>
                    DB 저장 실패
                  </span>
                ))}
              <button
                type="button"
                onClick={handleCrop}
                disabled={!envelope || cropping || status === "running"}
                title={envelope ? "부위가 정해진 관찰값마다 256×256 크롭을 저장" : "먼저 추출하세요"}
                className="ml-auto btn btn-secondary px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-normal disabled:opacity-50"
              >
                {cropping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crop className="w-3.5 h-3.5" />}
                {cropping ? "크롭 중…" : "부위 크롭"}
              </button>
            </div>
            <div className="flex-1 min-h-0 mx-4 mb-4 overflow-auto rounded border border-[var(--color-divider)] bg-white vt-scroll">
              {/* 관찰 결과 = 관찰 envelope (+ 그 관찰값으로 만든 부위 크롭) · 판정 결과 = 스타일 아이디 · 판정 · 스코어링 */}
              {resultTab === "judge" && summary?.styleId && <StyleIdCard summary={summary} />}
              {resultTab === "observe" && crops && <CropGrid result={crops} />}
              <pre className="p-3 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap break-all">
                {status === "running"
                  ? "관찰 → 스코어링 → 판정 중… (수십 초~수 분 걸릴 수 있습니다)"
                  : (resultParts?.[resultTab] ?? result) ||
                    (resultTab === "observe"
                      ? "관찰 프롬프트의 결과(관찰 envelope)가 여기에 표시됩니다."
                      : "판정 프롬프트의 결과(스타일 아이디 · 판정 · 스코어링)가 여기에 표시됩니다.")}
              </pre>
            </div>
          </div>
        </section>
      </div>

      <ProductPickModal
        open={productModal}
        loading={productLoading}
        error={productError}
        onPick={pickProduct}
        onClose={closeProductModal}
      />
    </div>
  );
}


/** PDF 에는 DB 저장 결과를 넣지 않는다 — 결과 JSON 에서 saved 를 뺀다. JSON 이 아니면 그대로. */
function withoutSaved(json: string): string {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== "object" || !("saved" in data)) return json;
    delete data.saved;
    return JSON.stringify(data, null, 2);
  } catch {
    return json;
  }
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(blob);
  });
}

/** [[StyleIdCard]] 를 PDF 조각으로 — 같은 내용을 글로 옮긴다. */
function summaryBlocks({ styleId, judgement }: Summary): ReportBlock[] {
  if (!styleId) return [];
  if (!styleId.ok) return [{ kind: "text", tone: "danger", text: `스타일 아이디를 정하지 못했습니다: ${styleId.error ?? ""}` }];
  const llm = judgement?.ok ? judgement.axes : undefined;
  const blocks: ReportBlock[] = [{ kind: "text", tone: "accent", text: styleId.style_id ?? "" }];
  if (styleId.style) {
    blocks.push({ kind: "text", text: `${styleId.style.name}  ${styleId.style.subTitle}` });
    blocks.push({ kind: "text", tone: "muted", text: styleId.style.definition });
  }
  if (multipleCandidates(styleId)) {
    blocks.push({
      kind: "text",
      text: `중립 축 → 스타일 아이디 후보 (OR): ${styleId.candidates!
        .map((c) => (c.style ? `${c.style_id} ${c.style.name}` : c.style_id))
        .join(" · ")}`,
    });
  }
  if (styleId.target_id) blocks.push({ kind: "text", tone: "muted", text: `기준 의복: ${styleId.target_id}` });
  if (styleId.axes) {
    blocks.push({
      kind: "rows",
      rows: AXIS_ORDER.map((key) => {
        const a = styleId.axes![key];
        const l = llm?.[key];
        const usesLlm = a.source === "LLM" || a.source === "LLM_FALLBACK";
        const lines = [
          a.source ? `[${SOURCE_LABEL[a.source]}${a.label ? ` ${a.label}` : ""}]` : "[판정 없음]",
          usesLlm && l ? `${l.rationale} (${STRENGTH_LABEL[l.strength]})` : "",
          a.detail ?? "",
          usesLlm && l && l.evidence.length > 0 ? l.evidence.join(" · ") : "",
        ].filter(Boolean);
        return [`${key}  ${axisLettersText(a)}`, lines.join("\n")];
      }),
    });
  }
  if (judgement && !judgement.ok) blocks.push({ kind: "text", tone: "danger", text: `LLM 판정 실패: ${judgement.error ?? ""}` });
  return blocks;
}

/** 부위 크롭 썸네일 — 각 크롭이 어느 관찰값에서 나왔는지 함께 보여 준다 */
function CropGrid({ result }: { result: CropResult }) {
  if (!result.ok) {
    return (
      <div className="p-3 border-b border-[var(--color-divider)] text-sm text-[var(--color-danger)]">
        부위 크롭 실패: {result.error}
      </div>
    );
  }
  const found = result.crops?.filter((c) => c.found) ?? [];
  const missed = result.crops?.filter((c) => !c.found) ?? [];
  const where = (c: { component: string | null; descriptor: string | null }) =>
    [c.component, c.descriptor].filter(Boolean).join("/");
  return (
    <div className="p-3 border-b border-[var(--color-divider)] text-sm space-y-2">
      <p className="text-xs text-black/60">
        저장 위치: <span className="font-[family-name:var(--font-mono)] select-all">{result.dir}</span>
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-2">
        {found.map((c) => (
          <figure key={c.id} className="space-y-1">
            {/* data: URL 이라 next/image 최적화를 쓸 수 없다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.data_url ?? ""} alt={`${c.param} = ${c.value}`} className="w-full aspect-square object-contain border border-[var(--color-divider)] rounded" />
            <figcaption className="text-xs leading-tight">
              <span className="font-semibold">{c.param}</span> = {c.value}
              {where(c) && <span className="text-black/50"> @ {where(c)}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
      {missed.length > 0 && (
        <p className="text-xs text-black/50">
          이미지에서 찾지 못함: {missed.map((c) => `${c.param}=${c.value}${where(c) ? "@" + where(c) : ""}`).join(" · ")}
        </p>
      )}
      {(result.skipped?.length ?? 0) > 0 && (
        <p className="text-xs text-black/50">
          부위 없음(건너뜀): {result.skipped!.map((c) => `${c.param}=${c.value}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
