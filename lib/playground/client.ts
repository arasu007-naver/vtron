"use client";

import { authFetch } from "@/lib/auth-client";
import { clientVars, substitute } from "@/lib/playground/vars";
import type { Preset } from "@/lib/playground/presets";
import type {
  HistoryEntry,
  KeyValueRow,
  NaverTokenResult,
  ProxyResponsePayload,
  RequestDraft,
} from "@/types/playground";

/** 플레이그라운드 화면이 쓰는 클라이언트 유틸 — 요청 조립 · 전송 · 히스토리. */

let seq = 0;
export const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const newRow = (row: Partial<KeyValueRow> = {}): KeyValueRow => ({
  id: uid(),
  enabled: row.enabled ?? true,
  key: row.key ?? "",
  value: row.value ?? "",
  note: row.note,
});

export const emptyDraft = (): RequestDraft => ({
  method: "GET",
  url: "{{baseUrl}}/v1/seller/channels",
  params: [],
  headers: [],
  bodyType: "none",
  body: "",
  auth: { mode: "naver", token: "", username: "", password: "" },
});

export function draftFromPreset(preset: Preset): RequestDraft {
  return {
    method: preset.method,
    url: preset.url,
    params: (preset.params ?? []).map(newRow),
    headers: (preset.headers ?? []).map(newRow),
    bodyType: preset.bodyType ?? "none",
    body: preset.body ?? "",
    auth: {
      mode: preset.auth ?? "naver",
      token: "",
      username: "",
      password: "",
    },
  };
}

const activeRows = (rows: KeyValueRow[]) =>
  rows.filter((r) => r.enabled && r.key.trim());

/**
 * 인증 모드에 따른 Authorization 헤더.
 * 사용자가 직접 Authorization 헤더를 넣었다면 그쪽을 존중한다.
 */
function authHeader(draft: RequestDraft): Record<string, string> {
  const manual = activeRows(draft.headers).some(
    (r) => r.key.trim().toLowerCase() === "authorization"
  );
  if (manual) return {};

  switch (draft.auth.mode) {
    case "naver":
      return { Authorization: "Bearer {{accessToken}}" };
    case "bearer":
      return draft.auth.token.trim()
        ? { Authorization: `Bearer ${draft.auth.token.trim()}` }
        : {};
    case "basic": {
      const bytes = new TextEncoder().encode(
        `${draft.auth.username}:${draft.auth.password}`
      );
      const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
      return { Authorization: `Basic ${btoa(binary)}` };
    }
    default:
      return {};
  }
}

export interface IssueTokenInput {
  type?: "SELF" | "SELLER";
  accountId?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * 네이버 커머스 액세스 토큰 발급.
 *
 * 서명(bcrypt)은 서버가 만든다 — 시크릿을 브라우저로 내리지 않기 위해서다.
 * 실패하면 커머스 API 원문까지 붙여 돌려준다. 무엇이 잘못됐는지는 그 본문에 있다.
 */
export async function issueNaverToken(
  input: IssueTokenInput = {}
): Promise<{ token?: NaverTokenResult; error?: string }> {
  try {
    const res = await authFetch("/api/playground/naver/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.accessToken) {
      const detail = data?.response
        ? typeof data.response === "string"
          ? data.response
          : JSON.stringify(data.response)
        : "";
      return {
        error: [data?.error ?? `HTTP ${res.status}`, detail].filter(Boolean).join(" · "),
      };
    }
    return { token: data as NaverTokenResult };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export interface SendOutcome {
  result?: ProxyResponsePayload;
  error?: string;
  durationMs: number;
}

/**
 * 요청을 프록시로 보낸다.
 *
 * 브라우저가 아는 변수(`{{accessToken}}` · 시각 · `{{siteUrl}}`)만 여기서 채우고,
 * 시크릿에서 파생되는 변수는 손대지 않은 채 넘겨 서버가 채우게 한다.
 */
export async function sendDraft(
  draft: RequestDraft,
  accessToken: string | null,
  timeoutMs = 30_000
): Promise<SendOutcome> {
  const vars = clientVars(accessToken);
  const fill = (value: string) => substitute(value, vars);

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(authHeader(draft))) {
    headers[key] = fill(value);
  }
  for (const row of activeRows(draft.headers)) {
    headers[row.key.trim()] = fill(row.value);
  }

  const startedAt = performance.now();
  try {
    const res = await authFetch("/api/playground/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: draft.method,
        url: fill(draft.url.trim()),
        params: activeRows(draft.params).map((r) => ({
          key: r.key.trim(),
          value: fill(r.value),
        })),
        headers,
        bodyType: draft.bodyType,
        body: draft.bodyType === "none" ? undefined : fill(draft.body),
        timeoutMs,
      }),
    });

    const data = await res.json().catch(() => null);
    const durationMs = Math.round(performance.now() - startedAt);

    if (!res.ok || !data || typeof data.status !== "number") {
      return {
        error: data?.error ?? `프록시 오류 (HTTP ${res.status})`,
        durationMs,
      };
    }
    return { result: data as ProxyResponsePayload, durationMs };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      durationMs: Math.round(performance.now() - startedAt),
    };
  }
}

/**
 * 같은 요청을 터미널에서 재현하는 cURL.
 * 브라우저가 아는 변수만 채우고 서버 변수(`{{clientSecretSign}}` 등)는 그대로 둔다 —
 * 복사한 명령에 시크릿이 섞여 나가지 않게 하려는 것이다.
 */
export function toCurl(draft: RequestDraft, accessToken: string | null): string {
  const vars = clientVars(accessToken);
  const fill = (value: string) => substitute(value, vars);
  const q = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

  let url = fill(draft.url.trim());
  const params = activeRows(draft.params)
    .map(
      (r) =>
        `${encodeURIComponent(r.key.trim())}=${encodeURIComponent(fill(r.value))}`
    )
    .join("&");
  if (params) url += (url.includes("?") ? "&" : "?") + params;

  const lines = [`curl -i -X ${draft.method} ${q(url)}`];

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(authHeader(draft))) {
    headers[key] = fill(value);
  }
  for (const row of activeRows(draft.headers)) headers[row.key.trim()] = fill(row.value);
  if (draft.bodyType === "json" && !("Content-Type" in headers)) {
    headers["Content-Type"] = "application/json";
  }
  if (draft.bodyType === "form" && !("Content-Type" in headers)) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  for (const [key, value] of Object.entries(headers)) {
    lines.push(`  -H ${q(`${key}: ${value}`)}`);
  }

  if (draft.bodyType !== "none" && draft.body.trim()) {
    const body =
      draft.bodyType === "form"
        ? draft.body
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .join("&")
        : fill(draft.body);
    lines.push(`  -d ${q(body)}`);
  }

  return lines.join(" \\\n");
}

// ── 로컬 저장 ──────────────────────────────────────────────────────────────

const HISTORY_KEY = "vton.playground.history";
const DRAFT_KEY = "vton.playground.draft";
const HISTORY_LIMIT = 40;

const read = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과 등은 무시한다 — 히스토리는 편의 기능일 뿐이다.
  }
};

export const loadHistory = (): HistoryEntry[] => read<HistoryEntry[]>(HISTORY_KEY, []);

export const pushHistory = (entry: HistoryEntry): HistoryEntry[] => {
  const next = [entry, ...loadHistory()].slice(0, HISTORY_LIMIT);
  write(HISTORY_KEY, next);
  return next;
};

export const clearHistory = (): HistoryEntry[] => {
  write(HISTORY_KEY, []);
  return [];
};

export const loadDraft = (): RequestDraft | null =>
  read<RequestDraft | null>(DRAFT_KEY, null);

export const saveDraft = (draft: RequestDraft) => write(DRAFT_KEY, draft);
