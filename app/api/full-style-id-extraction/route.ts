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

/* Full-Look Style ID (/full-style-id-extraction)
   이미지 한 장 → 관찰(Vision 모델 1회, 승인 프롬프트 V2) → Full-Look Vision Extractor(FLV_RC6_FINAL)로 Evidence Packet
   → Full-Look Scoring Engines(EI · TC · SR 방향) → 스타일 아이디.
   판정은 코드(동결 엔진)가 한다 — 판정 프롬프트는 없다. DM 은 Full-Look 엔진이 없어 D/M 양쪽(OR)으로 둔다. */

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

/** Claude — 이미지 블록 + 프롬프트 텍스트 블록을 한 user 메시지로. system · tools · temperature 없음 */
async function observeClaude(image: Buffer, mediaType: string, prompt: string) {
  const model = claudeModel();
  const client = new Anthropic({ ...anthropicClientOptions(), timeout: TIMEOUT_MS });
  const message = await client.messages
    .stream({
      model,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: image.toString("base64") } },
            { type: "text", text: prompt },
          ],
        },
      ],
    })
    .finalMessage();
  if (message.stop_reason === "max_tokens") throw new Error("관찰 출력이 max_tokens 에서 잘렸습니다.");
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
  return { text, model: message.model, usage: message.usage as unknown as Obj };
}

/** Gemini — Claude 와 같은 모양(이미지 + 프롬프트 한 user 메시지). 503 · 429 는 두 번 더 시도한다 */
async function observeGemini(image: Buffer, mediaType: string, prompt: string) {
  const apiKey = geminiApiKey();
  if (!apiKey) throw new Error(MISSING_GEMINI_KEY_MESSAGE);
  const model = geminiModel();
  const payload = {
    contents: [{ role: "user", parts: [{ inline_data: { mime_type: mediaType, data: image.toString("base64") } }, { text: prompt }] }],
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
 * GET /api/full-style-id-extraction — 관찰 프롬프트(승인 V2 원문)
 *   응답: { prompt, promptVersion, promptSha256, models: { claude, gemini } }
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();
  try {
    const p = loadPipeline().prompt();
    return NextResponse.json({
      prompt: p.text,
      promptVersion: p.version,
      promptSha256: p.sha256,
      models: { claude: claudeModel(), gemini: geminiModel() },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/**
 * POST /api/full-style-id-extraction — multipart/form-data
 *   image    : 이미지 파일 (필수, JPEG · PNG · WEBP, 5MB 이하)
 *   provider : 'claude' | 'gemini' (선택 — 비우면 'claude')
 *
 * 응답: { observation: { status, model_output, packet, validation, run_record, transport, native, ... },
 *        scoring: { EI, TC, SR } (엔진 방향 기록), styleId, provider, visionModel, usage, identity }
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

  try {
    const P = loadPipeline();
    const prompt = P.prompt();
    const observed = provider === "gemini" ? await observeGemini(image, mediaType, prompt.text) : await observeClaude(image, mediaType, prompt.text);
    const identity = {
      image_ref: file.name || "image",
      image_hash: createHash("sha256").update(image).digest("hex"),
      prompt_version: prompt.version,
      prompt_hash: prompt.sha256,
      model_id: observed.model,
      run_id: randomUUID(),
      timestamp: new Date().toISOString(),
      raw_output_sha256: P.sha(observed.text),
    };
    const observation = P.extract(observed.text, identity);
    const base = { provider, visionModel: observed.model, usage: observed.usage, identity };
    if (observation.status !== "PACKET_VALID" || !observation.packet || !observation.run_record) {
      return NextResponse.json({ ...base, observation: { ...observation, raw_text: observed.text }, scoring: null, styleId: null });
    }
    const scoring = P.score(observation.packet, observation.run_record);
    return NextResponse.json({ ...base, observation, scoring, styleId: styleIdOf(scoring) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
