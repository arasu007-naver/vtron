import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { getAllClothingBrands } from "@/lib/playground/brands-service";

/**
 * 상품링크에서 고를 옷 브랜드.
 *
 * `GET` → `{ brands: ClothingBrand[] }` (가나다순)
 *
 * brands 는 scripts/sync-brands.mjs 가 채운다. 네이버 브랜드와 매칭된 것 가운데 옷 묶음
 * (res/clothing-categories.json 의 brandGroups)에 들었거나 옷 모델이 잡힌 브랜드만 돌려준다.
 * 200건 안팎이라 초성 검색은 브라우저가 한다.
 * 만약 DB 조회 결과가 없거나 실패하는 경우 스냅샷(res/brands-naver-snapshot.json)에서 복구하여 반환한다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const brands = await getAllClothingBrands();
    return NextResponse.json({ brands });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


