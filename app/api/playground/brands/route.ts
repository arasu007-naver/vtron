import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { getAdminSupabase } from "@/lib/supabase/server";
import {
  CLOTHING_BRAND_GROUPS,
  CLOTHING_KIND_KEYS,
  isClothingKind,
  type ClothingBrand,
  type ClothingKind,
} from "@/lib/playground/clothing";

/**
 * 상품링크에서 고를 옷 브랜드.
 *
 * `GET` → `{ brands: ClothingBrand[] }` (가나다순)
 *
 * brands 는 scripts/sync-brands.mjs 가 채운다. 네이버 브랜드와 매칭된 것 가운데 옷 묶음
 * (res/clothing-categories.json 의 brandGroups)에 들었거나 옷 모델이 잡힌 브랜드만 돌려준다.
 * 200건 안팎이라 초성 검색은 브라우저가 한다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = [
  "id",
  "display_name",
  "aliases",
  "naver_brand_id",
  "naver_brand_name",
  "clothing_query",
  "brand_group_members(brand_groups(section, key))",
  "brand_clothing_categories(clothing_kind, model_count)",
];

/** Postgres undefined_column — 0004 를 아직 실행하지 않아 clothing_query 가 없을 때. */
const UNDEFINED_COLUMN = "42703";

const selectBrands = (columns: string[]) =>
  getAdminSupabase()
    .from("brands")
    .select(columns.join(", "))
    .eq("is_active", true)
    .not("naver_brand_id", "is", null);

interface GroupRef {
  section: string;
  key: string;
}

interface BrandRow {
  id: string;
  display_name: string;
  aliases: string[] | null;
  naver_brand_id: number;
  naver_brand_name: string | null;
  /** 0004 실행 전이면 없다. */
  clothing_query?: string | null;
  brand_group_members: { brand_groups: GroupRef | GroupRef[] | null }[] | null;
  brand_clothing_categories: { clothing_kind: string; model_count: number }[] | null;
}

function toBrand(row: BrandRow): ClothingBrand | null {
  const counts = Object.fromEntries(CLOTHING_KIND_KEYS.map((kind) => [kind, 0])) as Record<
    ClothingKind,
    number
  >;
  for (const c of row.brand_clothing_categories ?? []) {
    if (isClothingKind(c.clothing_kind)) counts[c.clothing_kind] += c.model_count;
  }

  const inClothingGroup = (row.brand_group_members ?? []).some((member) => {
    const group = Array.isArray(member.brand_groups)
      ? member.brand_groups[0]
      : member.brand_groups;
    return group ? CLOTHING_BRAND_GROUPS.has(`${group.section}/${group.key}`) : false;
  });
  const hasClothing = CLOTHING_KIND_KEYS.some((kind) => counts[kind] > 0);
  if (!inClothingGroup && !hasClothing) return null;

  return {
    id: row.id,
    displayName: row.display_name,
    aliases: row.aliases ?? [],
    naverBrandId: row.naver_brand_id,
    naverBrandName: row.naver_brand_name,
    clothingQuery: row.clothing_query ?? null,
    counts,
  };
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    let { data, error } = await selectBrands(COLUMNS);
    if (error?.code === UNDEFINED_COLUMN) {
      // 검색어 컬럼 없이도 표시명 · 네이버 등록명으로 찾을 수 있다.
      ({ data, error } = await selectBrands(COLUMNS.filter((c) => c !== "clothing_query")));
    }

    if (error) {
      return NextResponse.json(
        {
          error:
            `brands 를 읽지 못했습니다(${error.message}). supabase/migrations 의 0002 ~ 0004 를 ` +
            "SQL Editor 에서 실행하고 npm run sync:brands 로 채웠는지 확인하세요.",
        },
        { status: 502 }
      );
    }

    const brands = (data as unknown as BrandRow[])
      .map(toBrand)
      .filter((brand): brand is ClothingBrand => brand !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
    return NextResponse.json({ brands });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
