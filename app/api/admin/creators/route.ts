import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import type { ContractStatus } from "@/types/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: ContractStatus[] = [
  "pending",
  "reviewing",
  "approved",
  "rejected",
  "cancelled",
];

/**
 * GET /api/admin/creators
 * 크리에이터 관리 목록 — stmx_contract_applications 중 크리에이터 관련 플로우.
 * flowType=stmx_creator|creator_brand|all (기본 stmx_creator)
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const supabase = getAdminSupabase();
    const url = req.nextUrl;
    const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page") ?? "1")) || 1);
    const rawPageSize = Math.trunc(Number(url.searchParams.get("pageSize") ?? "20")) || 20;
    const pageSize = Math.min(Math.max(1, rawPageSize), 100);
    const status = url.searchParams.get("status")?.trim() || "all";
    const flowType = url.searchParams.get("flowType")?.trim() || "stmx_creator";
    const q = url.searchParams.get("q")?.trim() || "";

    let query = supabase
      .from("stmx_contract_applications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (flowType === "stmx_creator" || flowType === "creator_brand") {
      query = query.eq("flow_type", flowType);
    } else if (flowType === "all") {
      query = query.in("flow_type", ["stmx_creator", "creator_brand"]);
    } else {
      query = query.eq("flow_type", "stmx_creator");
    }

    if (status !== "all" && STATUSES.includes(status as ContractStatus)) {
      query = query.eq("status", status);
    }
    if (q) {
      query = query.or(
        `applicant_name.ilike.%${q}%,applicant_email.ilike.%${q}%,creator_name.ilike.%${q}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error("admin creators fetch error:", error);
      return NextResponse.json(
        { error: error.message, creators: [], total: 0, page, pageSize, totalPages: 0 },
        { status: 500 }
      );
    }

    const total = count || 0;
    return NextResponse.json({
      creators: data || [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("/api/admin/creators GET error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        creators: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/creators
 * 크리에이터 계약 신청 상태 변경.
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const { id, status, notes } = body as {
      id?: string;
      status?: string;
      notes?: string | null;
    };

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id 가 필요합니다." }, { status: 400 });
    }
    if (!status || !STATUSES.includes(status as ContractStatus)) {
      return NextResponse.json(
        { error: "status 가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = { status };
    if (typeof notes === "string") {
      patch.notes = notes.trim() || null;
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("stmx_contract_applications")
      .update(patch)
      .eq("id", id)
      .in("flow_type", ["stmx_creator", "creator_brand"])
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("admin creators update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "크리에이터 신청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ creator: data });
  } catch (error) {
    console.error("/api/admin/creators PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
