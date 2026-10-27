import { NextResponse } from "next/server";
import { withBusinessApi } from "@/lib/business-user/api-call";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/me — 외부 업체 API 키 확인용.
 *   curl -H "Authorization: Bearer stmx_live_…" https://…/api/v1/me
 * 401 = 키 형식이 틀리거나 없는(폐기 · 재발급 전) 키, 403 = 정지된 업체. 호출은 api_call_log 에 남는다.
 */
export const GET = withBusinessApi(async (_req, ctx) =>
  NextResponse.json({
    request_id: ctx.request_id,
    business_user_id: ctx.business_user_id,
    business_name: ctx.business_name,
  })
);
