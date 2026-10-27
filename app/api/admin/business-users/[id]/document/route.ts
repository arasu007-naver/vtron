import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { DOC_BUCKET, SIGNED_URL_TTL_SEC, TABLE, isUuid, jsonError } from "@/lib/business-user/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/business-users/:id/document — 등록증 signed URL(60초) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return jsonError("업체를 찾을 수 없습니다.", 404);

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("doc_path")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("업체를 찾을 수 없습니다.", 404);
  if (!data.doc_path) return jsonError("등록증이 없습니다.", 404);

  const { data: signed, error: signError } = await supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrl(data.doc_path, SIGNED_URL_TTL_SEC);
  if (signError || !signed) return jsonError(signError?.message ?? "signed URL 생성 실패", 500);

  return NextResponse.json(
    {
      url: signed.signedUrl,
      kind: data.doc_path.endsWith(".pdf") ? "pdf" : "image",
      expires_in: SIGNED_URL_TTL_SEC,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
