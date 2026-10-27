/**
 * 외부 API 라우트 래퍼 — 업체 API 키 인증 + 호출 내역(api_call_log) 기록.
 *
 *   export const POST = withBusinessApi(async (req, ctx) => {
 *     ctx.log.request = { image_bytes: 1234 };     // 남길 요약(원문 · 이미지 · 토큰 금지)
 *     ctx.log.response = { style_id: "ETSM" };
 *     return NextResponse.json({ request_id: ctx.request_id, … });
 *   });
 *
 * 모든 응답에 `X-Request-Id` 를 붙인다 — api_call_log.id 와 같아 업체 문의 때 이 값으로 찾는다.
 * 인증 실패(401 · 403)도 남긴다. 기록이 실패해도 응답은 그대로 돌려준다.
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticateBusiness, type BusinessAuthContext } from "./api-auth";

export const API_CALL_LOG_TABLE = "api_call_log";

export interface ApiCallLog {
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  /** 서버 쪽 사유 — 업체에게 돌려주는 문구와 달라도 된다 */
  error?: string;
}

export interface BusinessApiContext extends BusinessAuthContext {
  request_id: string;
  log: ApiCallLog;
}

const clip = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null);

function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return clip(fwd || req.headers.get("x-real-ip"), 64);
}

export function withBusinessApi<A extends unknown[]>(
  handler: (req: Request, ctx: BusinessApiContext, ...rest: A) => Promise<Response> | Response
) {
  return async (req: Request, ...rest: A): Promise<Response> => {
    const started = performance.now();
    const requestId = randomUUID();
    const log: ApiCallLog = {};
    let businessUserId: string | null = null;
    let tokenPrefix: string | null = null;
    let res: Response;

    const auth = await authenticateBusiness(req);
    if (!auth.ok) {
      businessUserId = auth.business_user_id;
      tokenPrefix = auth.token_prefix;
      log.error = auth.reason;
      res = auth.response;
    } else {
      businessUserId = auth.context.business_user_id;
      tokenPrefix = auth.context.token_prefix;
      try {
        res = await handler(req, { ...auth.context, request_id: requestId, log }, ...rest);
      } catch (err) {
        log.error = err instanceof Error ? err.message : String(err);
        console.error(`[api-call] ${requestId} handler error:`, log.error);
        res = NextResponse.json({ request_id: requestId, error: "서버 오류가 발생했습니다." }, { status: 500 });
      }
    }

    res.headers.set("X-Request-Id", requestId);

    const { error } = await getAdminSupabase()
      .from(API_CALL_LOG_TABLE)
      .insert({
        id: requestId,
        business_user_id: businessUserId,
        token_prefix: tokenPrefix,
        method: req.method,
        path: new URL(req.url).pathname,
        status_code: res.status,
        duration_ms: Math.round(performance.now() - started),
        error: clip(log.error, 2000),
        request_meta: log.request ?? null,
        response_meta: log.response ?? null,
        ip: clientIp(req),
        user_agent: clip(req.headers.get("user-agent"), 300),
      })
      .then(
        (r) => r,
        (e: unknown) => ({ error: { message: e instanceof Error ? e.message : String(e) } })
      );
    if (error) console.error(`[api-call] ${requestId} log insert failed:`, error.message);

    return res;
  };
}
