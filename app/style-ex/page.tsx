"use client";

/* Style ID (/style-ex)
   이미지 한 장을 골라 의류 스타일 추출(lib/style-ex)을 호출하고 결과를 본다.

   ┌ 이미지 미리보기  [상품 Style ID 추출] [이미지] [추출] ┬ 프롬프트 [관찰|판정] ┤
   │                                ├ 상품 정보      [PDF 작성] ┤ ← 상품으로 추출했을 때
   │                                ├ 호출 결과 (스타일 아이디 + JSON)│
   └────────────────────────────────┴────────────────────────────┘

   추출은 두 단계다 — 관찰(이미지 → 37개 파라미터) → 판정(관찰값 → 스타일 아이디).
   두 프롬프트 모두 기본값을 불러와 채운다. 수정하면 수정한 내용으로 호출하고,
   그대로면 서버가 기본 프롬프트를 쓴다.

   입력 이미지는 파일로 고르거나, [상품 Style ID 추출] 모달(ProductPickModal)에서 등록된 상품을
   찾아 그 상품의 원본 사진을 쓴다. 상품으로 추출하면 프롬프트 아래에 상품 정보가 서고, [PDF 작성] 이
   상품 사진 · 상품 정보 · 호출 결과를 위에서 아래로 담은 PDF 를 내려받게 한다(lib/style-ex/report-pdf). */

import { useCallback, useEffect, useRef, useState } from "react";
import { Crop, ExternalLink, FileDown, ImagePlus, Loader2, RotateCcw, ScanSearch, ShoppingBag } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import ProductPickModal from "@/components/style-ex/ProductPickModal";
import type { CatalogKind, CatalogProduct } from "@/lib/tryon/product-catalog";
import { downloadReportPdf, type ReportBlock } from "@/lib/style-ex/report-pdf";

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

interface Summary {
  styleId: StyleIdResult | null;
  judgement: LlmJudgement | null;
}

const EMPTY_PROMPTS: Record<PromptKey, string> = { prompt: "", judgePrompt: "" };

/** 서버(/api/style-ex)의 이미지 한도와 같다 — Anthropic 이미지 입력 한도 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const KIND_LABEL: Record<CatalogKind, string> = { top: "상의", bottom: "하의", etc: "기타" };

/** 상품 정보 — 화면의 상품 정보 칸과 PDF 가 같이 쓴다. 사진은 뺀다. */
function productRows(product: CatalogProduct): [string, string][] {
  return [
    ["브랜드", product.brandName ?? "브랜드 미상"],
    ["상품명", product.name],
    ["분류", `${KIND_LABEL[product.kind] ?? product.kind} · ${product.path}`],
    ["상품 ID", product.id],
    ["카테고리 ID", product.categoryId],
    ["판매 페이지", product.catalogUrl],
  ];
}

const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

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

  /** 새 입력 이미지 — 파일 선택과 상품 선택이 같이 쓴다. 이전 결과는 모두 비운다. */
  const applyImage = useCallback((picked: File, from: CatalogProduct | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(picked);
    setPreviewUrl(previewUrlRef.current);
    setFile(picked);
    setProduct(from);
    setSaved(null);
    setResult("");
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
    setSummary(null);
    setEnvelope(null);
    setCrops(null);
    setSaved(null);
    const started = performance.now();

    const body = new FormData();
    body.append("image", file);
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
        ["프롬프트", PROMPT_TABS.map(({ key, label }) => `${label} ${isEdited(key) ? "수정함" : "기본값"}`).join(" · ")],
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
              {elapsed !== null && (
                <span className="text-xs font-normal text-black/50">{elapsed.toFixed(1)}초</span>
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
              {summary?.styleId && <StyleIdCard summary={summary} />}
              {crops && <CropGrid result={crops} />}
              <pre className="p-3 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap break-all">
                {status === "running"
                  ? "관찰 → 스코어링 → 판정 중… (수십 초~수 분 걸릴 수 있습니다)"
                  : result || "추출 결과가 여기에 표시됩니다."}
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
        return [`${key}  ${a.letter ?? "?"}`, lines.join("\n")];
      }),
    });
  }
  if (judgement && !judgement.ok) blocks.push({ kind: "text", tone: "danger", text: `LLM 판정 실패: ${judgement.error ?? ""}` });
  return blocks;
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
