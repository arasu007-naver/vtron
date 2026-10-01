import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import type { ContractApplicationPayload, ContractFlowType } from "@/types/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLOW_TYPES: ContractFlowType[] = ["stmx_creator", "stmx_brand", "creator_brand"];

const isNonEmpty = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const emailOk = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * GET /api/contracts
 * 계약/신청 목록 (flowType · status 필터, 페이지네이션)
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
    const flowType = url.searchParams.get("flowType")?.trim() || "all";
    const status = url.searchParams.get("status")?.trim() || "all";
    const includeRecipients = url.searchParams.get("includeRecipients") === "1";

    let query = supabase
      .from("stmx_contract_applications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (flowType !== "all" && FLOW_TYPES.includes(flowType as ContractFlowType)) {
      query = query.eq("flow_type", flowType);
    }
    if (status !== "all") {
      query = query.eq("status", status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error("stmx_contract_applications fetch error:", error);
      return NextResponse.json(
        { error: error.message, applications: [], total: 0, page, pageSize, totalPages: 0 },
        { status: 500 }
      );
    }

    let applications = data || [];

    if (includeRecipients && applications.length > 0) {
      const ids = applications.map((a) => a.id);
      const { data: recipients } = await supabase
        .from("stmx_contract_application_recipients")
        .select("*")
        .in("application_id", ids)
        .order("created_at", { ascending: true });

      const byApp = new Map<string, typeof recipients>();
      for (const r of recipients || []) {
        const list = byApp.get(r.application_id) || [];
        list.push(r);
        byApp.set(r.application_id, list);
      }
      applications = applications.map((a) => ({
        ...a,
        recipients: byApp.get(a.id) || [],
      }));
    }

    const total = count || 0;
    return NextResponse.json({
      applications,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("/api/contracts GET error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        applications: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts
 * 계약/신청 제출. creator_brand 이면 notifyRecipients 를 디렉터리에 upsert 하고
 * 신청별 수신자 스냅샷도 저장한다.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as ContractApplicationPayload;
    const flowType = body.flowType;

    if (!FLOW_TYPES.includes(flowType)) {
      return NextResponse.json(
        { error: "flowType 이 올바르지 않습니다. (stmx_creator | stmx_brand | creator_brand)" },
        { status: 400 }
      );
    }

    if (!isNonEmpty(body.applicantName) || !isNonEmpty(body.applicantEmail)) {
      return NextResponse.json(
        { error: "신청자 이름과 이메일은 필수입니다." },
        { status: 400 }
      );
    }

    const applicantEmail = normalizeEmail(body.applicantEmail);
    if (!emailOk(applicantEmail)) {
      return NextResponse.json({ error: "신청자 이메일 형식이 올바르지 않습니다." }, { status: 400 });
    }

    if (flowType === "stmx_creator" || flowType === "creator_brand") {
      if (!isNonEmpty(body.creatorName)) {
        return NextResponse.json({ error: "크리에이터명이 필요합니다." }, { status: 400 });
      }
    }
    if (flowType === "stmx_brand" || flowType === "creator_brand") {
      if (!isNonEmpty(body.brandName)) {
        return NextResponse.json({ error: "브랜드명이 필요합니다." }, { status: 400 });
      }
    }

    let notifyRecipients = Array.isArray(body.notifyRecipients) ? body.notifyRecipients : [];
    if (flowType === "creator_brand") {
      notifyRecipients = notifyRecipients.filter(
        (r) => isNonEmpty(r?.name) && isNonEmpty(r?.email)
      );
      if (notifyRecipients.length === 0) {
        return NextResponse.json(
          { error: "크리에이터↔브랜드 직접 연결은 알림 수신자를 1명 이상 지정해야 합니다." },
          { status: 400 }
        );
      }
      for (const r of notifyRecipients) {
        if (!emailOk(normalizeEmail(r.email))) {
          return NextResponse.json(
            { error: `알림 수신자 이메일이 올바르지 않습니다: ${r.email}` },
            { status: 400 }
          );
        }
      }
    }

    const supabase = getAdminSupabase();
    const submittedBy =
      auth.user.id && !["service-role-admin", "public-client"].includes(auth.user.id)
        ? auth.user.id
        : null;

    const row = {
      flow_type: flowType,
      status: "pending",
      applicant_name: body.applicantName.trim(),
      applicant_email: applicantEmail,
      applicant_phone: body.applicantPhone?.trim() || null,
      applicant_company: body.applicantCompany?.trim() || null,
      creator_name: body.creatorName?.trim() || null,
      creator_sns_url: body.creatorSnsUrl?.trim() || null,
      creator_channel_type: body.creatorChannelType?.trim() || null,
      creator_followers: body.creatorFollowers?.trim() || null,
      brand_name: body.brandName?.trim() || null,
      brand_website: body.brandWebsite?.trim() || null,
      brand_category: body.brandCategory?.trim() || null,
      brand_contact_name: body.brandContactName?.trim() || null,
      proposed_start_date: body.proposedStartDate?.trim() || null,
      proposed_end_date: body.proposedEndDate?.trim() || null,
      budget_range: body.budgetRange?.trim() || null,
      campaign_goal: body.campaignGoal?.trim() || null,
      notes: body.notes?.trim() || null,
      etc: body.etc && typeof body.etc === "object" ? body.etc : {},
      submitted_by: submittedBy,
    };

    const { data: application, error: insertError } = await supabase
      .from("stmx_contract_applications")
      .insert(row)
      .select("*")
      .single();

    if (insertError || !application) {
      console.error("stmx_contract_applications insert error:", insertError);
      return NextResponse.json(
        { error: insertError?.message || "신청 저장에 실패했습니다." },
        { status: 500 }
      );
    }

    let savedRecipients: unknown[] = [];

    if (flowType === "creator_brand" && notifyRecipients.length > 0) {
      const directoryIds: Array<{ email: string; id: string }> = [];

      for (const r of notifyRecipients) {
        const email = normalizeEmail(r.email);
        const upsertRow = {
          name: r.name.trim(),
          email,
          role: r.role?.trim() || null,
          phone: r.phone?.trim() || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        };

        const { data: dirRow, error: dirError } = await supabase
          .from("stmx_contract_notify_directory")
          .upsert(upsertRow, { onConflict: "email" })
          .select("id, email")
          .single();

        if (dirError) {
          console.error("notify directory upsert error:", dirError);
          return NextResponse.json(
            {
              error: `신청은 저장됐지만 알림 수신자 목록 갱신에 실패했습니다: ${dirError.message}`,
              application,
            },
            { status: 500 }
          );
        }
        if (dirRow) directoryIds.push({ email: dirRow.email, id: dirRow.id });
      }

      const recipientRows = notifyRecipients.map((r) => {
        const email = normalizeEmail(r.email);
        const dir = directoryIds.find((d) => d.email === email);
        return {
          application_id: application.id,
          name: r.name.trim(),
          email,
          role: r.role?.trim() || null,
          phone: r.phone?.trim() || null,
          directory_id: dir?.id || r.directoryId || null,
        };
      });

      const { data: recipients, error: recipError } = await supabase
        .from("stmx_contract_application_recipients")
        .insert(recipientRows)
        .select("*");

      if (recipError) {
        console.error("application recipients insert error:", recipError);
        return NextResponse.json(
          {
            error: `신청은 저장됐지만 수신자 스냅샷 저장에 실패했습니다: ${recipError.message}`,
            application,
          },
          { status: 500 }
        );
      }
      savedRecipients = recipients || [];
    }

    return NextResponse.json({
      success: true,
      application: { ...application, recipients: savedRecipients },
    });
  } catch (error) {
    console.error("/api/contracts POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contracts
 * 신청 상태 변경
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const { id, status } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    }
    const allowed = ["pending", "reviewing", "approved", "rejected", "cancelled"];
    if (!status || !allowed.includes(status)) {
      return NextResponse.json(
        { error: `status 는 ${allowed.join(", ")} 중 하나여야 합니다.` },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("stmx_contract_applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, application: data });
  } catch (error) {
    console.error("/api/contracts PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
