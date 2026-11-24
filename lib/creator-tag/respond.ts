import "server-only";
import { NextResponse } from "next/server";
import { findBrand } from "./brand";
import { findCandidates, NaverNotConfiguredError } from "./candidates";
import { AnthropicNotConfiguredError } from "./extract";

export const err = (error: string, status: number) => NextResponse.json({ error }, { status });

export interface Extracted {
  brandName: string | null;
  productName: string | null;
  styleCode: string | null;
  barcode: string | null;
  confidence: number | null;
}

/** 브랜드 조회 + 후보 검색 → 두 API 공통 200 응답. 사진·원문은 로그에 남기지 않는다. */
export async function buildResponse(extracted: Extracted) {
  try {
    const brand = extracted.brandName ? await findBrand(extracted.brandName) : null;
    const candidates = extracted.brandName
      ? await findCandidates({
          brandName: brand?.displayName ?? extracted.brandName,
          productName: extracted.productName,
          styleCode: extracted.styleCode,
          barcode: extracted.barcode,
          brandNames: brand?.names,
        })
      : [];
    return NextResponse.json({
      extracted,
      brand: brand ? { id: brand.id, displayName: brand.displayName } : null,
      candidates,
    });
  } catch (e) {
    console.error("[creator-tag] 후보 검색 실패:", e instanceof Error ? e.name : "error");
    if (e instanceof NaverNotConfiguredError || e instanceof AnthropicNotConfiguredError) return err(e.message, 503);
    return err("후보 검색에 실패했습니다.", 503);
  }
}
