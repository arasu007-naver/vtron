import "server-only";
import { createHash } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/server";
import { defaultPrompt } from "./extract";
import { DEFAULT_JUDGE_PROMPT } from "./judge";

/**
 * style-ex 프롬프트 버전 (supabase/migrations/0015_style_ex_prompt_versions.sql).
 *
 * 관찰(observe) · 판정(judge) 프롬프트를 `style_ex_prompt_versions` 에 버전으로 쌓는다.
 * 종류마다 활성 버전이 하나 있고, 추출은 프롬프트를 따로 받지 않으면 활성 버전을 쓴다.
 * 종류에 행이 없으면 코드의 기본 프롬프트를 v1 로 등록한다. 표를 읽지 못하면(마이그레이션 전 등)
 * 코드 기본 프롬프트로 돌아간다 — 추출은 멈추지 않는다.
 */

export const PROMPT_KINDS = ["observe", "judge"] as const;
export type PromptKind = (typeof PROMPT_KINDS)[number];

export const isPromptKind = (v: unknown): v is PromptKind =>
  typeof v === "string" && (PROMPT_KINDS as readonly string[]).includes(v);

const TABLE = "style_ex_prompt_versions";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PromptVersion {
  id: string;
  kind: PromptKind;
  version: number;
  content: string;
  note: string | null;
  is_active: boolean;
  activated_at: string | null;
  created_by: string | null;
  created_at: string;
}

/** 추출에 쓸 프롬프트 — version 이 null 이면 등록되지 않은 내용(코드 기본값 폴백 또는 화면에서 고친 것) */
export interface ResolvedPrompt {
  content: string;
  version: Pick<PromptVersion, "id" | "version"> | null;
}

/** 코드에 박힌 기본 프롬프트 — 첫 등록(v1)과 DB 폴백에 쓴다 */
export const codeDefaultPrompt = (kind: PromptKind): string =>
  kind === "observe" ? defaultPrompt() : DEFAULT_JUDGE_PROMPT;

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const userIdOf = (userId: string | null | undefined) => (userId && UUID.test(userId) ? userId : null);

/** 종류의 모든 버전, 최신 먼저 */
export async function listPromptVersions(kind: PromptKind): Promise<PromptVersion[]> {
  const { data, error } = await getAdminSupabase()
    .from(TABLE)
    .select("*")
    .eq("kind", kind)
    .order("version", { ascending: false });
  if (error) throw new Error(`${TABLE} 조회 실패: ${error.message}`);
  return data as PromptVersion[];
}

export class PromptVersionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** 새 버전 등록. 같은 내용이 이미 있으면 409. */
export async function createPromptVersion(input: {
  kind: PromptKind;
  content: string;
  note?: string | null;
  activate?: boolean;
  userId?: string | null;
}): Promise<PromptVersion> {
  if (!input.content.trim()) throw new PromptVersionError("프롬프트 내용이 비어 있습니다.", 400);
  const { data, error } = await getAdminSupabase().rpc("create_style_ex_prompt_version", {
    p_kind: input.kind,
    p_content: input.content,
    p_note: input.note ?? null,
    p_activate: input.activate ?? false,
    p_created_by: userIdOf(input.userId),
  });
  if (error) {
    if (error.code === "23505") {
      const existing = await findByContent(input.kind, input.content).catch(() => null);
      throw new PromptVersionError(
        existing ? `같은 내용이 이미 v${existing.version} 으로 등록돼 있습니다.` : "같은 내용이 이미 등록돼 있습니다.",
        409
      );
    }
    throw new Error(`${TABLE} 등록 실패: ${error.message}`);
  }
  return data as PromptVersion;
}

/** 버전 활성화(롤백 포함) */
export async function activatePromptVersion(id: string): Promise<PromptVersion> {
  if (!UUID.test(id)) throw new PromptVersionError("버전 id 가 올바르지 않습니다.", 400);
  const { data, error } = await getAdminSupabase().rpc("activate_style_ex_prompt_version", { p_id: id });
  if (error) {
    if (error.code === "P0002") throw new PromptVersionError("버전을 찾을 수 없습니다.", 404);
    throw new Error(`${TABLE} 활성화 실패: ${error.message}`);
  }
  return data as PromptVersion;
}

async function findByContent(kind: PromptKind, content: string) {
  const { data, error } = await getAdminSupabase()
    .from(TABLE)
    .select("id, version")
    .eq("kind", kind)
    .eq("content_sha256", sha256(content))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Pick<PromptVersion, "id" | "version"> | null;
}

/** 활성 버전. 종류에 행이 하나도 없으면 코드 기본 프롬프트를 v1 로 등록해 활성화한다. */
export async function activePromptVersion(kind: PromptKind): Promise<PromptVersion> {
  const db = getAdminSupabase();
  const { data, error } = await db.from(TABLE).select("*").eq("kind", kind).eq("is_active", true).maybeSingle();
  if (error) throw new Error(`${TABLE} 조회 실패: ${error.message}`);
  if (data) return data as PromptVersion;

  const { count, error: countError } = await db
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("kind", kind);
  if (countError) throw new Error(`${TABLE} 조회 실패: ${countError.message}`);
  if (count) throw new Error(`${kind} 프롬프트에 활성 버전이 없습니다. 버전 하나를 활성화하세요.`);

  try {
    return await createPromptVersion({
      kind,
      content: codeDefaultPrompt(kind),
      note: "코드 기본 프롬프트 (자동 등록)",
      activate: true,
    });
  } catch (e) {
    // 동시에 두 요청이 첫 등록을 하면 하나는 409 — 먼저 등록된 쪽을 읽는다
    if (e instanceof PromptVersionError && e.status === 409) return activePromptVersion(kind);
    throw e;
  }
}

/**
 * 추출에 쓸 프롬프트를 정한다.
 *   - override 가 비어 있으면 활성 버전 (DB 를 못 읽으면 코드 기본값, version null)
 *   - override 가 있으면 그 내용. 등록된 버전과 내용이 같으면 그 버전으로 남긴다.
 */
export async function resolvePrompt(kind: PromptKind, override?: string | null): Promise<ResolvedPrompt> {
  const custom = override?.trim() ? override : null;
  if (custom === null) {
    try {
      const active = await activePromptVersion(kind);
      return { content: active.content, version: { id: active.id, version: active.version } };
    } catch (e) {
      console.warn(`[style-ex] ${kind} 프롬프트 버전을 읽지 못해 코드 기본값을 씁니다:`, e instanceof Error ? e.message : e);
      return { content: codeDefaultPrompt(kind), version: null };
    }
  }
  const found = await findByContent(kind, custom).catch(() => null);
  return { content: custom, version: found };
}
