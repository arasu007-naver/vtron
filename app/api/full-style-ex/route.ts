import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  MISSING_KEY_MESSAGE,
  MISSING_GEMINI_KEY_MESSAGE,
  anthropicApiKey,
  anthropicClientOptions,
  geminiApiKey,
} from "@/lib/style-ex/api-key";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { styleIdCandidates, STYLE_IDS } from "@/lib/style-ex/style-ids";
import { resolvePrompt, versionLabel } from "@/lib/style-ex/prompt-versions";
import { saveProductStyle, type SavedProductStyle } from "@/lib/style-ex/product-style";
import {
  fillRegistry,
  isThreeCallPrompt,
  merge as mergeThree,
  parseJsonObject,
  registryOf,
  skipRest,
  threeCallPrompts,
} from "@/lib/full-style-ex/three-call";

/* Full-Look Style ID (/full-style-id-extraction)
   이미지 한 장 → 관찰(Vision 모델 1회, 승인 프롬프트 V2) → Full-Look Vision Extractor(FLV_RC6_FINAL)로 Evidence Packet
   → Full-Look Scoring Engines(EI · TC · SR 방향) → 스타일 아이디.
   판정은 코드(동결 엔진)가 한다 — 판정 프롬프트는 없다. DM 은 Full-Look 엔진이 없어 D/M 양쪽(OR)으로 둔다.
   관찰 프롬프트는 style_ex_prompt_versions 의 target='full' · kind='observe' 활성 버전이 기본이다
   (행이 없으면 승인 V2 원문을 v1 로 등록한다, lib/style-ex/prompt-versions.ts). */

export const runtime = "nodejs";
export const maxDuration = 600;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** 프롬프트 설정(02_PROMPT/PROMPT_AND_MODEL_CONFIGURATION.json)과 같다 */
const MAX_TOKENS = 32_000;
const TIMEOUT_MS = 300_000;
const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_MAX_OUTPUT_TOKENS = 65_536;

const claudeModel = () => process.env.FULL_STYLE_EX_MODEL || DEFAULT_CLAUDE_MODEL;
const geminiModel = () =>
  process.env.FULL_STYLE_EX_GEMINI_MODEL || process.env.STYLE_EX_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

type Obj = Record<string, unknown>;
type Provider = "claude" | "gemini";
type Axis = "EI" | "TC" | "SR";

interface Pipeline {
  prompt(): { text: string; sha256: string; version: string };
  extract(modelText: string, identity: Obj): Obj & { status: string; packet: Obj | null; run_record: Obj | null };
  score(packet: Obj, runRecord: Obj): Record<Axis, Obj & { status: string; direction: string | null; rule?: string }>;
  sha(s: string | Buffer): string;
}

let pipeline: Pipeline | null = null;
/** 동결 엔진은 CommonJS 이고 자기 파일을 해시로 검사하므로 번들하지 않고 런타임에 require 한다 */
function loadPipeline(): Pipeline {
  if (!pipeline) {
    const { createRequire } = process.getBuiltinModule("module") as typeof import("node:module");
    const nodeRequire = createRequire(path.join(process.cwd(), "package.json"));
    pipeline = nodeRequire(path.join(process.cwd(), "lib/full-style-ex/pipeline.cjs")) as Pipeline;
  }
  return pipeline;
}

/** 미디어 타입은 확장자가 아니라 바이트로 판별한다 (입력 계약: JPEG · PNG · WEBP) */
function mediaTypeOf(b: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * 프롬프트를 이미지 앞에 둘지 (개선 #12). 승인 V2 는 검증된 입력 계약(이미지 → 텍스트)을 그대로 지키고,
 * 그 밖의 버전(v1.1 …)은 고정된 프롬프트를 앞에 두어 프롬프트 캐시가 걸리게 한다.
 */
type BlockOrder = "image_first" | "prompt_first";

/** Claude — 이미지 블록 + 프롬프트 텍스트 블록을 한 user 메시지로. system · tools · temperature 없음 */
async function observeClaude(image: Buffer, mediaType: string, prompt: string, order: BlockOrder) {
  const model = claudeModel();
  const client = new Anthropic({ ...anthropicClientOptions(), timeout: TIMEOUT_MS });
  const message = await client.messages
    .stream({
      model,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content:
            order === "image_first"
              ? [
                  { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: image.toString("base64") } },
                  { type: "text", text: prompt },
                ]
              : [
                  { type: "text", text: prompt, cache_control: { type: "ephemeral" } },
                  { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: image.toString("base64") } },
                ],
        },
      ],
    })
    .finalMessage();
  if (message.stop_reason === "max_tokens") throw new Error("관찰 출력이 max_tokens 에서 잘렸습니다.");
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
  return { text, model: message.model, usage: message.usage as unknown as Obj };
}

/** Gemini — Claude 와 같은 모양(이미지 + 프롬프트 한 user 메시지, 순서도 같다). 503 · 429 는 두 번 더 시도한다 */
async function observeGemini(image: Buffer, mediaType: string, prompt: string, order: BlockOrder) {
  const apiKey = geminiApiKey();
  if (!apiKey) throw new Error(MISSING_GEMINI_KEY_MESSAGE);
  const model = geminiModel();
  const payload = {
    contents: [
      {
        role: "user",
        parts:
          order === "image_first"
            ? [{ inline_data: { mime_type: mediaType, data: image.toString("base64") } }, { text: prompt }]
            : [{ text: prompt }, { inline_data: { mime_type: mediaType, data: image.toString("base64") } }],
      },
    ],
    generationConfig: { temperature: 0.0, maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS, responseMimeType: "application/json" },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let res: Response | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok || !(res.status === 503 || res.status === 429) || attempt === 3) break;
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
  if (!res || !res.ok) {
    const body = res ? await res.text().catch(() => "") : "";
    throw new Error(`Gemini API 호출 실패 (${model}, HTTP ${res?.status ?? "?"}): ${body.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
    usageMetadata?: Obj;
  };
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("\n");
  if (!text.trim()) throw new Error(`Gemini API 가 빈 응답을 돌려주었습니다 (finishReason=${cand?.finishReason}).`);
  if (cand?.finishReason === "MAX_TOKENS") throw new Error("관찰 출력이 maxOutputTokens 에서 잘렸습니다.");
  return { text, model, usage: data.usageMetadata ?? null };
}

/** 엔진 방향 → 스타일 아이디 글자 */
const LETTER: Record<Axis, Record<string, string>> = {
  EI: { EXPRESSIVE: "E", INTROVERT: "I" },
  TC: { TRANSFORMATIVE: "T", CLASSIC: "C" },
  SR: { STRUCTURED: "S", RELAXED: "R" },
};
const POLES: Record<Axis | "DM", [string, string]> = { EI: ["E", "I"], TC: ["T", "C"], SR: ["S", "R"], DM: ["D", "M"] };

/** 방향 기록 → 스타일 아이디. 미결 축(엔진 미해결 · DM)은 양쪽 글자(OR)로 두고 후보를 모두 보인다 */
function styleIdOf(scores: ReturnType<Pipeline["score"]>) {
  const axes: Obj = {};
  for (const axis of ["EI", "TC", "SR"] as const) {
    const r = scores[axis];
    const letter = r.direction ? LETTER[axis][r.direction] : undefined;
    axes[axis] = letter
      ? { letter, letters: [letter], source: "ENGINE", label: r.rule ?? null, detail: `${r.direction} · ${r.status}` }
      : {
          letter: POLES[axis][0],
          letters: POLES[axis],
          source: null,
          label: null,
          detail: `엔진 미결 (${[r.status, r.error].filter(Boolean).join(" · ")}) → ${POLES[axis].join(" 또는 ")} (양쪽 모두)`,
        };
  }
  axes.DM = {
    letter: "D",
    letters: POLES.DM,
    source: null,
    label: null,
    detail: "Full-Look DM 스코어링 엔진이 아직 없습니다 → D 또는 M (양쪽 모두). 패킷의 dm_evidence 는 관찰 결과에 있습니다.",
  };
  const candidates = styleIdCandidates(axes as Parameters<typeof styleIdCandidates>[0]);
  const id = candidates[0]?.style_id ?? null;
  return { ok: Boolean(id), style_id: id, style: id ? (STYLE_IDS[id] ?? null) : null, candidates, axes };
}

/**
 * GET /api/full-style-id-extraction — 기본 관찰 프롬프트 = target='full' 활성 버전
 *   응답: { prompt, versions: { prompt: { id, version } | null }, approved: { version, sha256 }, models: { claude, gemini } }
 *         versions.prompt 가 null 이면 버전 표를 읽지 못해 코드 기본값(승인 V2 원문)을 준 것이다.
 *         approved 는 추출 엔진이 검증된 승인 프롬프트 — 화면이 지금 프롬프트가 그것과 같은지 보인다.
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();
  try {
    const observe = await resolvePrompt("observe", null, "full");
    const approved = loadPipeline().prompt();
    return NextResponse.json({
      prompt: observe.content,
      versions: { prompt: observe.version },
      approved: { version: approved.version, sha256: approved.sha256 },
      models: { claude: claudeModel(), gemini: geminiModel() },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/** 공급자에 맞춰 비전 1회 — 3회 프로토타입은 늘 프롬프트를 먼저 두어 캐시를 쓴다 */
const observeOnce = (provider: Provider, image: Buffer, mediaType: string, prompt: string, order: BlockOrder) =>
  provider === "gemini" ? observeGemini(image, mediaType, prompt, order) : observeClaude(image, mediaType, prompt, order);

/** 한 호출의 기록 — 관찰 결과 탭에서 호출마다 무엇을 받았는지 본다 */
interface CallRecord {
  call: "registry" | "appearance" | "construction";
  model: string | null;
  ms: number;
  prompt_chars: number;
  prompt_sha256: string;
  usage: Obj | null;
  output: Obj | null;
  raw_text?: string;
  error?: string;
}

/**
 * 3회 프로토타입 ("3+ vision", lib/full-style-ex/three-call.ts).
 *   ① 등록 → (② 외관 ∥ ③ 구조 · 관계) → 합치기 → 단일 호출과 같은 정리 · 추출 · 채점.
 * 착장이 아니거나 참여 물체가 없으면 ②③ 을 부르지 않는다.
 */
async function observeThree(provider: Provider, image: Buffer, mediaType: string, content: string, sha: (s: string) => string) {
  const calls: CallRecord[] = [];
  const run = async (call: CallRecord["call"], prompt: string) => {
    const started = performance.now();
    const rec: CallRecord = { call, model: null, ms: 0, prompt_chars: prompt.length, prompt_sha256: sha(prompt), usage: null, output: null };
    calls.push(rec);
    try {
      const r = await observeOnce(provider, image, mediaType, prompt, "prompt_first");
      rec.model = r.model;
      rec.usage = r.usage;
      try {
        rec.output = parseJsonObject(r.text);
      } catch (e) {
        rec.raw_text = r.text;
        throw new Error(`${call} 호출의 출력을 JSON 으로 읽지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
      }
      return rec.output;
    } catch (e) {
      rec.error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      rec.ms = Math.round(performance.now() - started);
    }
  };

  const template = threeCallPrompts(content);
  const p1 = template.calls[0];
  let r1: Obj;
  let r2: Obj | null = null;
  let r3: Obj | null = null;
  let skipped: string | null;
  try {
    r1 = await run("registry", p1);
    skipped = skipRest(r1);
    if (!skipped) {
      const registry = registryOf(r1);
      const p2 = fillRegistry(template.calls[1], registry);
      const p3 = fillRegistry(template.calls[2], registry);
      // ②③ 은 서로 기다리지 않는다. 하나가 실패해도 다른 하나의 기록은 남긴다.
      const [a, b] = await Promise.allSettled([run("appearance", p2), run("construction", p3)]);
      if (a.status === "rejected") throw a.reason;
      if (b.status === "rejected") throw b.reason;
      [r2, r3] = [a.value, b.value];
    }
  } catch (e) {
    throw Object.assign(e instanceof Error ? e : new Error(String(e)), { calls });
  }
  const { merged, log } = mergeThree(r1, r2, r3);
  return {
    text: JSON.stringify(merged),
    model: calls.find((c) => c.model)?.model ?? (provider === "gemini" ? geminiModel() : claudeModel()),
    calls,
    merge_log: log,
    skipped,
    // run_record 에는 등록이 채워지기 전의 v1.2 원문 해시를 남긴다 — 이미지마다 같은 값이라 버전을 가리킨다
    prompt_version: template.version,
    prompt_sha256: sha(template.text),
  };
}

/** 추출 한 번의 응답 — POST 가 상품 사진이면 product_style 에 저장한 뒤 돌려준다 */
interface Extracted {
  status: number;
  body: Obj & {
    observation?: Obj;
    styleId?: Obj | null;
    scoring?: unknown;
    visionModel?: string;
    promptVersion?: { id: string } | null;
    /** 관찰 프롬프트 버전 레이블 (versionLabel) — product_style.version */
    promptLabel?: string;
  };
}

/** brand_catalog_models.id — 네이버 카탈로그 모델 id (/api/style-ex 와 같다) */
const MODEL_ID = /^[\w-]{1,40}$/;

/**
 * 상품 사진으로 추출한 결과를 product_style 에 target='full' 로 남긴다 (/style-ex 는 'item').
 * 실패한 추출도 남긴다 — 관찰 결과가 있는 응답이면. 저장이 실패해도 추출 결과는 돌려준다.
 */
async function saveFull(
  out: Extracted,
  product: { modelId: string; imageUrl: string },
  extra: { customPrompt: boolean; elapsedMs: number; userId: string }
): Promise<Extracted> {
  const { body } = out;
  if (out.status !== 200 || !body.observation) return out;
  const observation = body.observation;
  const styleId =
    body.styleId ??
    ({
      ok: false,
      error: `${String(observation.status ?? "관찰 실패")}${observation.error ? `: ${String(observation.error)}` : ""}`,
    } as Obj);
  let saved: SavedProductStyle | { error: string };
  try {
    saved = await saveProductStyle({
      // 인덱스 = 착장 전체 추출 → target full, 관찰 프롬프트 버전 레이블(v1 · v1.1 · v1.2 · custom)
      target: "full",
      version: body.promptLabel ?? null,
      modelId: product.modelId,
      imageUrl: product.imageUrl,
      result: {
        customPrompt: extra.customPrompt,
        promptVersions: { prompt: body.promptVersion ?? null, judgePrompt: null },
        styleId,
        scoring: body.scoring ?? null,
        judgement: null,
        observation,
      },
      visionModel: String(body.visionModel ?? ""),
      elapsedMs: extra.elapsedMs,
      userId: extra.userId,
    });
  } catch (e) {
    saved = { error: e instanceof Error ? e.message : String(e) };
  }
  return { status: out.status, body: { ...body, saved } };
}

/** 비전 3회로 추출 → 정리 · 추출 엔진 · 채점 엔진은 1회와 같다 */
async function extractThree(
  P: Pipeline,
  provider: Provider,
  image: Buffer,
  mediaType: string,
  fileName: string,
  prompt: Awaited<ReturnType<typeof resolvePrompt>>
): Promise<Extracted> {
  const mode = "three";
  try {
    const three = await observeThree(provider, image, mediaType, prompt.content, P.sha);
    const identity = {
      image_ref: fileName || "image",
      image_hash: createHash("sha256").update(image).digest("hex"),
      prompt_version: three.prompt_version,
      prompt_hash: three.prompt_sha256,
      model_id: three.model,
      run_id: randomUUID(),
      timestamp: new Date().toISOString(),
      raw_output_sha256: P.sha(three.text),
    };
    const observation = P.extract(three.text, identity);
    const threeCall = { calls: three.calls, merge_log: three.merge_log, skipped: three.skipped };
    const usage = three.calls.map((c) => ({ call: c.call, ms: c.ms, usage: c.usage }));
    const base = { mode, provider, visionModel: three.model, visionCalls: three.calls.length, usage, identity, promptVersion: prompt.version, promptLabel: versionLabel(prompt.content, prompt.version), promptApproved: false, blockOrder: "prompt_first" };
    if (observation.status !== "PACKET_VALID" || !observation.packet || !observation.run_record) {
      return { status: 200, body: { ...base, observation: { ...observation, three_call: threeCall }, scoring: null, styleId: null } };
    }
    const scoring = P.score(observation.packet, observation.run_record);
    return { status: 200, body: { ...base, observation: { ...observation, three_call: threeCall }, scoring, styleId: styleIdOf(scoring) } };
  } catch (e) {
    const calls = (e as { calls?: CallRecord[] }).calls;
    return { status: 500, body: { mode, error: e instanceof Error ? e.message : String(e), ...(calls ? { three_call: { calls } } : {}) } };
  }
}

/**
 * POST /api/full-style-id-extraction — multipart/form-data
 *   image    : 이미지 파일 (필수, JPEG · PNG · WEBP, 5MB 이하)
 *   provider : 'claude' | 'gemini' (선택 — 비우면 'claude')
 *   prompt   : 관찰 프롬프트 (선택 — 비우면 target='full' 활성 버전).
 *              3회 방식 프롬프트(v1.2 "비전 호출 3+", =====[ CALL n ]===== 구분)면 비전 3회 — ① 등록 → ② 외관 ∥ ③ 구조 · 관계
 *   modelId  : 상품 사진으로 추출할 때 그 상품의 카탈로그 모델 id (선택 — 있으면 결과를 product_style 에 target='full' 로 저장)
 *   imageUrl : 그 상품 사진의 원본 https URL (modelId 와 함께)
 *
 * 응답: { observation: { status, model_output, packet, validation, run_record, transport, native, ... },
 *        scoring: { EI, TC, SR } (엔진 방향 기록), styleId, provider, visionModel, usage, identity,
 *        promptVersion: 쓴 버전 { id, version } (등록되지 않은 내용이면 null), promptApproved: 승인 V2 원문과 같은지 }
 */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const form = await request.formData().catch(() => null);
  const provider: Provider = String(form?.get("provider") ?? "").toLowerCase() === "gemini" ? "gemini" : "claude";
  if (provider === "gemini" ? !geminiApiKey() : !anthropicApiKey()) {
    return NextResponse.json({ error: provider === "gemini" ? MISSING_GEMINI_KEY_MESSAGE : MISSING_KEY_MESSAGE }, { status: 500 });
  }

  const file = form?.get("image");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "image 파일이 필요합니다." }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "이미지는 5MB 이하만 지원합니다." }, { status: 400 });
  const image = Buffer.from(await file.arrayBuffer());
  const mediaType = mediaTypeOf(image);
  if (!mediaType) return NextResponse.json({ error: "JPEG · PNG · WEBP 이미지만 지원합니다." }, { status: 400 });

  const text = (key: string) => {
    const v = form?.get(key);
    return typeof v === "string" ? v.trim() : "";
  };
  const modelId = text("modelId");
  const imageUrl = text("imageUrl");
  if (modelId && (!MODEL_ID.test(modelId) || !/^https:\/\//i.test(imageUrl))) {
    return NextResponse.json({ error: "modelId 와 함께 상품 사진의 https imageUrl 이 필요합니다." }, { status: 400 });
  }
  // 관찰 프롬프트는 화면에서 고친 경우에만 온다 — 공백만 지우지 않고 그대로 쓴다
  const rawPrompt = form?.get("prompt");
  const custom = typeof rawPrompt === "string" && rawPrompt.trim() ? rawPrompt : null;
  const started = performance.now();
  const out = await extractOne(provider, image, mediaType, file.name, custom);
  const finished = modelId
    ? await saveFull(out, { modelId, imageUrl }, { customPrompt: custom !== null, elapsedMs: performance.now() - started, userId: auth.user.id })
    : out;
  return NextResponse.json(finished.body, { status: finished.status });
}

/** 관찰 프롬프트 버전에 따라 비전 1회 또는 3회로 추출 → 정리 · 추출 엔진 · 채점 엔진 */
async function extractOne(
  provider: Provider,
  image: Buffer,
  mediaType: string,
  fileName: string,
  custom: string | null
): Promise<Extracted> {
  try {
    const P = loadPipeline();
    const prompt = await resolvePrompt("observe", custom, "full");
    // 3회 방식 프롬프트(v1.2 "비전 호출 3+")면 비전 3회로 돈다 — 버전을 고르는 것이 방식을 고르는 것이다
    if (isThreeCallPrompt(prompt.content)) return await extractThree(P, provider, image, mediaType, fileName, prompt);
    const mode = "single";
    const promptSha = P.sha(prompt.content);
    const promptApproved = promptSha === P.prompt().sha256;
    const order: BlockOrder = promptApproved ? "image_first" : "prompt_first";
    const observed =
      provider === "gemini"
        ? await observeGemini(image, mediaType, prompt.content, order)
        : await observeClaude(image, mediaType, prompt.content, order);
    const identity = {
      image_ref: fileName || "image",
      image_hash: createHash("sha256").update(image).digest("hex"),
      // 승인 V2 원문이면 V2, 아니면 프롬프트 머리의 prompt_version 줄(예: FULL_LOOK_OBSERVE_V1_1), 그것도 없으면 버전 표의 번호
      prompt_version: promptApproved
        ? P.prompt().version
        : (/^prompt_version:\s*(\S+)/m.exec(prompt.content)?.[1] ??
          (prompt.version ? `full-observe v${prompt.version.version}` : "UNREGISTERED")),
      prompt_hash: promptSha,
      model_id: observed.model,
      run_id: randomUUID(),
      timestamp: new Date().toISOString(),
      raw_output_sha256: P.sha(observed.text),
    };
    const observation = P.extract(observed.text, identity);
    const base = { mode, provider, visionModel: observed.model, visionCalls: 1, usage: observed.usage, identity, promptVersion: prompt.version, promptLabel: versionLabel(prompt.content, prompt.version), promptApproved, blockOrder: order };
    if (observation.status !== "PACKET_VALID" || !observation.packet || !observation.run_record) {
      return { status: 200, body: { ...base, observation: { ...observation, raw_text: observed.text }, scoring: null, styleId: null } };
    }
    const scoring = P.score(observation.packet, observation.run_record);
    return { status: 200, body: { ...base, observation, scoring, styleId: styleIdOf(scoring) } };
  } catch (e) {
    return { status: 500, body: { error: e instanceof Error ? e.message : String(e) } };
  }
}
