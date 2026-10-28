import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getAdminSupabase } from "@/lib/supabase/server";
import { defaultPrompt } from "./extract";
import { DEFAULT_JUDGE_PROMPT } from "./judge";

/**
 * style-ex 프롬프트 버전 (supabase/migrations/0015_style_ex_prompt_versions.sql · 0020_style_ex_prompt_target.sql).
 *
 * 관찰(observe) · 판정(judge) 프롬프트를 `style_ex_prompt_versions` 에 버전으로 쌓는다.
 * 대상(target)은 item = /style-ex 의복별 · full = /full-style-id-extraction 착장 전체(관찰만).
 * (target, kind) 마다 활성 버전이 하나 있고, 추출은 프롬프트를 따로 받지 않으면 활성 버전을 쓴다.
 * (target, kind) 에 행이 없으면 코드의 기본 프롬프트를 v1 로 등록한다. 표를 읽지 못하면(마이그레이션 전 등)
 * 코드 기본 프롬프트로 돌아간다 — 추출은 멈추지 않는다.
 */

export const PROMPT_KINDS = ["observe", "judge"] as const;
export type PromptKind = (typeof PROMPT_KINDS)[number];

export const isPromptKind = (v: unknown): v is PromptKind =>
  typeof v === "string" && (PROMPT_KINDS as readonly string[]).includes(v);

/** item = /style-ex 의복별 · full = /full-style-id-extraction 착장 전체 */
export const PROMPT_TARGETS = ["item", "full"] as const;
export type PromptTarget = (typeof PROMPT_TARGETS)[number];

export const isPromptTarget = (v: unknown): v is PromptTarget =>
  typeof v === "string" && (PROMPT_TARGETS as readonly string[]).includes(v);

/** 대상마다 쓰는 프롬프트 종류 — full 은 판정을 엔진 코드가 하므로 관찰만 있다 */
export const isTargetKind = (target: PromptTarget, kind: PromptKind) => target === "item" || kind === "observe";

const TABLE = "style_ex_prompt_versions";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PromptVersion {
  id: string;
  target: PromptTarget;
  kind: PromptKind;
  version: number;
  content: string;
  note: string | null;
  is_active: boolean;
  activated_at: string | null;
  created_by: string | null;
  created_at: string;
  /** 흐름도(0022)를 마지막으로 넣은 때 — null 이면 흐름도 없음. 0022 전이면 없다 */
  flow_doc_updated_at?: string | null;
  /** 흐름도를 물려받은 버전 id — 이 버전용 흐름도면 null */
  flow_doc_from?: string | null;
}

/** 버전 행에서 읽는 열 — 흐름도 본문(flow_doc)은 커서 목록에 싣지 않는다 */
const BASE_COLUMNS = "id, target, kind, version, content, note, is_active, activated_at, created_by, created_at";
const VERSION_COLUMNS = `${BASE_COLUMNS}, flow_doc_updated_at, flow_doc_from`;
/** 0022 전이면 흐름도 열이 없다 — 그 열 없이 다시 읽는다 */
const missingFlowColumns = (e: { message: string } | null) => !!e && /flow_doc/.test(e.message);
/** rpc 가 돌려준 행(전 열)에서 흐름도 본문을 뺀다 */
const withoutFlowDoc = (row: Record<string, unknown>) => {
  const { flow_doc, ...rest } = row;
  void flow_doc;
  return rest as unknown as PromptVersion;
};

/** 추출에 쓸 프롬프트 — version 이 null 이면 등록되지 않은 내용(코드 기본값 폴백 또는 화면에서 고친 것) */
export interface ResolvedPrompt {
  content: string;
  version: Pick<PromptVersion, "id" | "version"> | null;
}

/** Full-Look Vision Extractor 의 승인 관찰 프롬프트 V2 원문 (lib/full-style-ex/pipeline.cjs 와 같은 파일) */
const FULL_PROMPT_FILE = path.join(
  process.cwd(),
  "business_logic/FULL_LOOK_VISION_EXTRACTOR_FINAL_20261017/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/02_PROMPT/STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V2.txt"
);

/**
 * 추출 기록(product_style.version)에 남기는 버전 레이블.
 *   프롬프트 머리에 prompt_version: FULL_LOOK_OBSERVE_V1_1(…) 처럼 버전을 밝혔으면 그것 → "v1.1"
 *   아니면 버전 표의 번호 → "v2", 등록되지 않은 내용(화면에서 고친 것)이면 "custom"
 */
export function versionLabel(content: string, version: Pick<PromptVersion, "version"> | null): string {
  const declared = /^prompt_version:\s*FULL_LOOK_OBSERVE_V(\d+)_(\d+)/m.exec(content);
  if (declared) return `v${declared[1]}.${declared[2]}`;
  return version ? `v${version.version}` : "custom";
}

/** 코드에 박힌 기본 프롬프트 — 첫 등록(v1)과 DB 폴백에 쓴다 */
export const codeDefaultPrompt = (kind: PromptKind, target: PromptTarget = "item"): string => {
  if (target === "full") {
    if (kind !== "observe") throw new PromptVersionError("full 대상에는 판정 프롬프트가 없습니다.", 400);
    return readFileSync(FULL_PROMPT_FILE, "utf8");
  }
  return kind === "observe" ? defaultPrompt() : DEFAULT_JUDGE_PROMPT;
};

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const userIdOf = (userId: string | null | undefined) => (userId && UUID.test(userId) ? userId : null);

/** (target, kind) 의 모든 버전, 최신 먼저 */
export async function listPromptVersions(kind: PromptKind, target: PromptTarget = "item"): Promise<PromptVersion[]> {
  const query = (columns: string) =>
    getAdminSupabase().from(TABLE).select(columns).eq("target", target).eq("kind", kind).order("version", { ascending: false });
  let { data, error } = await query(VERSION_COLUMNS);
  if (missingFlowColumns(error)) ({ data, error } = await query(BASE_COLUMNS));
  if (error) throw new Error(`${TABLE} 조회 실패: ${error.message}`);
  return data as unknown as PromptVersion[];
}

export class PromptVersionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** 새 버전 등록. 같은 내용이 이미 있으면 409. */
export async function createPromptVersion(input: {
  target?: PromptTarget;
  kind: PromptKind;
  content: string;
  note?: string | null;
  activate?: boolean;
  userId?: string | null;
  /** 고치기 시작한 버전 — 그 버전의 흐름도를 물려받는다 (없거나 흐름도가 없으면 흐름도 없이) */
  flowFrom?: string | null;
}): Promise<PromptVersion> {
  const target = input.target ?? "item";
  if (!isTargetKind(target, input.kind)) throw new PromptVersionError("full 대상에는 판정 프롬프트가 없습니다.", 400);
  if (!input.content.trim()) throw new PromptVersionError("프롬프트 내용이 비어 있습니다.", 400);
  const { data, error } = await getAdminSupabase().rpc("create_style_ex_prompt_version", {
    p_target: target,
    p_kind: input.kind,
    p_content: input.content,
    p_note: input.note ?? null,
    p_activate: input.activate ?? false,
    p_created_by: userIdOf(input.userId),
  });
  if (error) {
    if (error.code === "23505") {
      const existing = await findByContent(input.kind, input.content, target).catch(() => null);
      throw new PromptVersionError(
        existing ? `같은 내용이 이미 v${existing.version} 으로 등록돼 있습니다.` : "같은 내용이 이미 등록돼 있습니다.",
        409
      );
    }
    throw new Error(`${TABLE} 등록 실패: ${error.message}`);
  }
  const created = withoutFlowDoc(data as Record<string, unknown>);
  if (input.flowFrom && UUID.test(input.flowFrom)) {
    // 흐름도 물려받기는 등록과 따로 한다 — 실패해도 버전 등록은 그대로 둔다
    await inheritFlowDoc(created.id, input.flowFrom).catch((e) =>
      console.warn("[style-ex] 흐름도를 물려받지 못했습니다:", e instanceof Error ? e.message : e)
    );
  }
  return created;
}

/** 흐름도 하나 — 그 버전의 흐름도가 없으면 doc null. from = 물려받은 버전 { id, version } */
export interface FlowDoc {
  id: string;
  version: number;
  doc: string | null;
  updated_at: string | null;
  from: { id: string; version: number } | null;
}

export async function getFlowDoc(id: string): Promise<FlowDoc> {
  if (!UUID.test(id)) throw new PromptVersionError("버전 id 가 올바르지 않습니다.", 400);
  const db = getAdminSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select("id, version, flow_doc, flow_doc_updated_at, flow_doc_from")
    .eq("id", id)
    .maybeSingle();
  if (missingFlowColumns(error)) throw new PromptVersionError("흐름도 열이 없습니다. supabase/migrations/0022_prompt_flow_doc.sql 을 실행하세요.", 503);
  if (error) throw new Error(`${TABLE} 조회 실패: ${error.message}`);
  if (!data) throw new PromptVersionError("버전을 찾을 수 없습니다.", 404);
  let from: FlowDoc["from"] = null;
  if (data.flow_doc_from) {
    const src = await db.from(TABLE).select("id, version").eq("id", data.flow_doc_from).maybeSingle();
    if (src.data) from = { id: String(src.data.id), version: Number(src.data.version) };
  }
  return { id: String(data.id), version: Number(data.version), doc: data.flow_doc ?? null, updated_at: data.flow_doc_updated_at ?? null, from };
}

/** 이 버전의 흐름도를 넣거나 바꾼다 — 이 버전용이므로 물려받음 표시(flow_doc_from)를 지운다 */
export async function setFlowDoc(id: string, html: string): Promise<FlowDoc> {
  if (!UUID.test(id)) throw new PromptVersionError("버전 id 가 올바르지 않습니다.", 400);
  if (!/<html[\s>]/i.test(html)) throw new PromptVersionError("HTML 문서(<html> …)가 아닙니다.", 400);
  if (html.length > 2_000_000) throw new PromptVersionError("흐름도는 2MB 이하만 됩니다.", 400);
  const { data, error } = await getAdminSupabase()
    .from(TABLE)
    .update({ flow_doc: html, flow_doc_updated_at: new Date().toISOString(), flow_doc_from: null })
    .eq("id", id)
    .select("id");
  if (missingFlowColumns(error)) throw new PromptVersionError("흐름도 열이 없습니다. supabase/migrations/0022_prompt_flow_doc.sql 을 실행하세요.", 503);
  if (error) throw new Error(`${TABLE} 흐름도 저장 실패: ${error.message}`);
  if (!data?.length) throw new PromptVersionError("버전을 찾을 수 없습니다.", 404);
  return getFlowDoc(id);
}

/** 새 버전이 고치기 시작한 버전의 흐름도를 물려받는다. 그 버전도 물려받은 것이면 원래 버전을 가리킨다. */
async function inheritFlowDoc(id: string, fromId: string) {
  const db = getAdminSupabase();
  const src = await db.from(TABLE).select("id, flow_doc, flow_doc_updated_at, flow_doc_from").eq("id", fromId).maybeSingle();
  if (src.error) throw new Error(src.error.message);
  if (!src.data?.flow_doc) return;
  const { error } = await db
    .from(TABLE)
    .update({
      flow_doc: src.data.flow_doc,
      flow_doc_updated_at: src.data.flow_doc_updated_at,
      flow_doc_from: src.data.flow_doc_from ?? src.data.id,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** 버전 활성화(롤백 포함) */
export async function activatePromptVersion(id: string): Promise<PromptVersion> {
  if (!UUID.test(id)) throw new PromptVersionError("버전 id 가 올바르지 않습니다.", 400);
  const { data, error } = await getAdminSupabase().rpc("activate_style_ex_prompt_version", { p_id: id });
  if (error) {
    if (error.code === "P0002") throw new PromptVersionError("버전을 찾을 수 없습니다.", 404);
    throw new Error(`${TABLE} 활성화 실패: ${error.message}`);
  }
  return withoutFlowDoc(data as Record<string, unknown>);
}

async function findByContent(kind: PromptKind, content: string, target: PromptTarget) {
  const { data, error } = await getAdminSupabase()
    .from(TABLE)
    .select("id, version")
    .eq("target", target)
    .eq("kind", kind)
    .eq("content_sha256", sha256(content))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Pick<PromptVersion, "id" | "version"> | null;
}

/** 활성 버전. (target, kind) 에 행이 하나도 없으면 코드 기본 프롬프트를 v1 로 등록해 활성화한다. */
export async function activePromptVersion(kind: PromptKind, target: PromptTarget = "item"): Promise<PromptVersion> {
  const db = getAdminSupabase();
  const query = (columns: string) =>
    db.from(TABLE).select(columns).eq("target", target).eq("kind", kind).eq("is_active", true).maybeSingle();
  let { data, error } = await query(VERSION_COLUMNS);
  if (missingFlowColumns(error)) ({ data, error } = await query(BASE_COLUMNS));
  if (error) throw new Error(`${TABLE} 조회 실패: ${error.message}`);
  if (data) return data as unknown as PromptVersion;

  const { count, error: countError } = await db
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("target", target)
    .eq("kind", kind);
  if (countError) throw new Error(`${TABLE} 조회 실패: ${countError.message}`);
  if (count) throw new Error(`${target} ${kind} 프롬프트에 활성 버전이 없습니다. 버전 하나를 활성화하세요.`);

  try {
    return await createPromptVersion({
      target,
      kind,
      content: codeDefaultPrompt(kind, target),
      note: "코드 기본 프롬프트 (자동 등록)",
      activate: true,
    });
  } catch (e) {
    // 동시에 두 요청이 첫 등록을 하면 하나는 409 — 먼저 등록된 쪽을 읽는다
    if (e instanceof PromptVersionError && e.status === 409) return activePromptVersion(kind, target);
    throw e;
  }
}

/**
 * 추출에 쓸 프롬프트를 정한다.
 *   - override 가 비어 있으면 활성 버전 (DB 를 못 읽으면 코드 기본값, version null)
 *   - override 가 있으면 그 내용. 등록된 버전과 내용이 같으면 그 버전으로 남긴다.
 */
export async function resolvePrompt(
  kind: PromptKind,
  override?: string | null,
  target: PromptTarget = "item"
): Promise<ResolvedPrompt> {
  const custom = override?.trim() ? override : null;
  if (custom === null) {
    try {
      const active = await activePromptVersion(kind, target);
      return { content: active.content, version: { id: active.id, version: active.version } };
    } catch (e) {
      console.warn(`[style-ex] ${target} ${kind} 프롬프트 버전을 읽지 못해 코드 기본값을 씁니다:`, e instanceof Error ? e.message : e);
      return { content: codeDefaultPrompt(kind, target), version: null };
    }
  }
  const found = await findByContent(kind, custom, target).catch(() => null);
  return { content: custom, version: found };
}
