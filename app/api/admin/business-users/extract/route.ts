import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { LOW_CONFIDENCE, OcrError, extractBizLicense } from "@/lib/business-user/clova-ocr";
import { DOC_BUCKET, audit, checkBizNo, jsonError } from "@/lib/business-user/server";
import type { BusinessUserStatus, ExtractResponse } from "@/types/business-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/**
 * POST /api/admin/business-users/extract  (multipart: file)
 * 사업자등록증 → business-docs 버킷에 보관 → CLOVA OCR 추출 → 형식 · 체크섬 · 중복 검증.
 * 저장(business_user insert)은 하지 않는다 — 관리자가 확인 · 수정한 뒤 POST /api/admin/business-users 로 확정한다.
 * OCR 이 실패해도 문서는 보관하고 `pending_review` 를 권해 수동 입력으로 이어간다.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("file 이 필요합니다.", 400);
  if (!EXT_BY_MIME[file.type]) return jsonError("JPG · PNG · PDF 만 올릴 수 있습니다.", 415);
  if (file.size > MAX_BYTES) return jsonError("10MB 이하 파일만 올릴 수 있습니다.", 413);

  const data = Buffer.from(await file.arrayBuffer());
  if (file.type === "application/pdf" && countPdfPages(data) > 1) {
    return jsonError("PDF 는 1쪽짜리만 올릴 수 있습니다.", 422);
  }

  try {
    const supabase = getAdminSupabase();
    const docPath = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${EXT_BY_MIME[file.type]}`;
    const { error: uploadError } = await supabase.storage
      .from(DOC_BUCKET)
      .upload(docPath, data, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("[api-mng] doc upload failed:", uploadError.message);
      return jsonError(`등록증 보관 실패: ${uploadError.message}`, 500);
    }

    const reasons: string[] = [];
    let ocrError: string | null = null;
    let extraction: ExtractResponse["extraction"] = {
      business_number: null,
      business_name: null,
      representative: null,
      opening_date: null,
      confidence: null,
    };
    let ocrRaw: unknown = null;

    try {
      const out = await extractBizLicense(data, file.type);
      const { business_number, business_name, representative, opening_date, confidence } = out.extraction;
      extraction = { business_number, business_name, representative, opening_date, confidence };
      ocrRaw = out.raw;
    } catch (err) {
      ocrError = err instanceof OcrError ? err.message : "OCR 처리 중 오류가 났습니다.";
      if (!(err instanceof OcrError)) console.error("[api-mng] OCR unexpected error:", (err as Error)?.message);
      ocrRaw = { engine: "clova-biz-license", error: ocrError, extracted_at: new Date().toISOString() };
      reasons.push(`추출 실패: ${ocrError}`);
    }

    if (!ocrError) {
      if (!extraction.business_number) reasons.push("사업자등록번호를 찾지 못했습니다.");
      if (!extraction.business_name) reasons.push("상호를 찾지 못했습니다.");
      if (extraction.confidence !== null && extraction.confidence < LOW_CONFIDENCE) {
        reasons.push(`추출 신뢰도가 낮습니다 (${Math.round(extraction.confidence * 100)}%).`);
      }
    }

    const checks = await checkBizNo(supabase, extraction.business_number ?? "");
    if (extraction.business_number) {
      if (!checks.format) reasons.push("사업자등록번호가 10자리가 아닙니다.");
      else if (!checks.checksum) reasons.push("사업자등록번호 검증식을 통과하지 못했습니다.");
      if (checks.duplicate) reasons.push("같은 번호로 등록된 업체가 이미 있습니다.");
    }

    const suggested: BusinessUserStatus = reasons.length ? "pending_review" : "active";

    await audit(supabase, auth, "extract", null, {
      doc_path: docPath,
      ocr_ok: !ocrError,
      confidence: extraction.confidence,
      checks: { format: checks.format, checksum: checks.checksum, duplicate: checks.duplicate },
    });

    const body: ExtractResponse = {
      doc_path: docPath,
      extraction,
      ocr_raw: ocrRaw,
      ocr_error: ocrError,
      checks,
      suggested_status: suggested,
      reasons,
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error("/api/admin/business-users/extract error:", (error as Error)?.message);
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}

/** PDF 쪽 수 어림 — `/Type /Page` 객체 수. 못 세면 1 로 본다. */
function countPdfPages(data: Buffer): number {
  const text = data.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page(?![s\w])/g);
  return matches?.length || 1;
}
