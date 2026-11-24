import { z } from "zod";
import { creatorTagAuthorized } from "@/lib/creator-tag/auth";
import { buildResponse, err } from "@/lib/creator-tag/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const Body = z.object({
  brandName: z.string().trim().min(1).max(100),
  productName: opt(300),
  styleCode: opt(64),
  barcode: opt(64),
});

/** POST /api/internal/creator-tag/search — 수정된 텍스트로 재검색. 아무것도 저장하지 않는다. */
export async function POST(req: Request) {
  if (!creatorTagAuthorized(req)) return err("unauthorized", 401);

  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return err("입력값이 올바르지 않습니다.", 400);
  const { brandName, productName, styleCode, barcode } = parsed.data;
  if (!productName && !styleCode && !barcode) return err("productName, styleCode, barcode 중 하나가 필요합니다.", 400);

  return buildResponse({ brandName, productName, styleCode, barcode, confidence: null });
}
