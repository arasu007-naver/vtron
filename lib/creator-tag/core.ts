/**
 * 크리에이터 태그 — 요청 검증 · 인증 · 브랜드 매칭 순수 로직 (server-only / 외부 호출 없음).
 */
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { brandKey } from "./rank.ts";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Authorization 헤더 값이 Bearer <secret> 과 일치하는지. secret 이 없으면 항상 false. */
export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  const want = secret?.trim();
  const got = /^Bearer\s+(.+)$/i.exec(header ?? "")?.[1]?.trim();
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

const IMAGE_TYPES: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

export type ImageCheck =
  | { ok: true; mediaType: "image/jpeg" | "image/png" | "image/webp" }
  | { ok: false; status: 400 | 413 | 415; error: string };

export function checkImage(file: { size: number; type: string }): ImageCheck {
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, status: 413, error: "이미지가 너무 큽니다 (5MB 이하)." };
  const mediaType = IMAGE_TYPES[file.type.toLowerCase()];
  if (!mediaType) return { ok: false, status: 415, error: "JPG/PNG/WEBP 만 지원합니다." };
  if (file.size === 0) return { ok: false, status: 400, error: "빈 이미지입니다." };
  return { ok: true, mediaType };
}

export const isUnreadable = (t: {
  brandName: string | null;
  productName: string | null;
  styleCode: string | null;
  barcode: string | null;
}): boolean => !t.brandName && !t.productName && !t.styleCode && !t.barcode;

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const SearchBody = z.object({
  brandName: z.string().trim().min(1).max(100),
  productName: opt(300),
  styleCode: opt(64),
  barcode: opt(64),
});

export type SearchInput = z.infer<typeof SearchBody>;

export function parseSearchBody(raw: unknown): { ok: true; data: SearchInput } | { ok: false; error: string } {
  const parsed = SearchBody.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "입력값이 올바르지 않습니다." };
  const { productName, styleCode, barcode } = parsed.data;
  if (!productName && !styleCode && !barcode) {
    return { ok: false, error: "productName, styleCode, barcode 중 하나가 필요합니다." };
  }
  return { ok: true, data: parsed.data };
}

export interface BrandRow {
  id: string;
  display_name: string;
  naver_brand_name?: string | null;
  aliases?: string[] | null;
}

/** display_name · naver_brand_name · aliases 와 정규화 완전 일치. is_active 는 보지 않는다. */
export function matchBrand(
  rows: BrandRow[],
  name: string
): { id: string; displayName: string; names: string[] } | null {
  const key = brandKey(name);
  if (!key) return null;
  for (const b of rows) {
    const names = [b.display_name, b.naver_brand_name, ...(b.aliases ?? [])].filter(
      (n): n is string => typeof n === "string" && n.trim() !== ""
    );
    if (names.some((n) => brandKey(n) === key)) return { id: b.id, displayName: b.display_name, names };
  }
  return null;
}
