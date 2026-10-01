import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const emailOk = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * GET /api/contracts/notify-directory
 * 알림 수신자 마스터 목록 (기본: 활성만, ?all=1 이면 전체)
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const supabase = getAdminSupabase();
    const all = req.nextUrl.searchParams.get("all") === "1";

    let query = supabase
      .from("stmx_contract_notify_directory")
      .select("*")
      .order("name", { ascending: true });

    if (!all) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message, recipients: [] }, { status: 500 });
    }
    return NextResponse.json({ recipients: data || [] });
  } catch (error) {
    console.error("/api/contracts/notify-directory GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error), recipients: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/notify-directory
 * 수신자 추가 또는 이메일 기준 upsert
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const emailRaw = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(emailRaw);
    const role = typeof body.role === "string" ? body.role.trim() || null : null;
    const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;

    if (!name || !email) {
      return NextResponse.json({ error: "이름과 이메일은 필수입니다." }, { status: 400 });
    }
    if (!emailOk(email)) {
      return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("stmx_contract_notify_directory")
      .upsert(
        {
          name,
          email,
          role,
          phone,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, recipient: data });
  } catch (error) {
    console.error("/api/contracts/notify-directory POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contracts/notify-directory
 * 수신자 수정 / 활성·비활성
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const { id } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.email === "string") {
      const email = normalizeEmail(body.email);
      if (!emailOk(email)) {
        return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
      }
      patch.email = email;
    }
    if (typeof body.role === "string") patch.role = body.role.trim() || null;
    if (typeof body.phone === "string") patch.phone = body.phone.trim() || null;
    if (typeof body.isActive === "boolean") patch.is_active = body.isActive;

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("stmx_contract_notify_directory")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, recipient: data });
  } catch (error) {
    console.error("/api/contracts/notify-directory PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contracts/notify-directory?id=...
 * 소프트 삭제(is_active=false). ?hard=1 이면 행 삭제.
 */
export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const id = req.nextUrl.searchParams.get("id")?.trim();
    const hard = req.nextUrl.searchParams.get("hard") === "1";
    if (!id) {
      return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    if (hard) {
      const { error } = await supabase
        .from("stmx_contract_notify_directory")
        .delete()
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase
        .from("stmx_contract_notify_directory")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/contracts/notify-directory DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
