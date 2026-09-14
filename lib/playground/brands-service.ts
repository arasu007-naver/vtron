import { getAdminSupabase } from "@/lib/supabase/server";
import {
  CLOTHING_BRAND_GROUPS,
  CLOTHING_KIND_KEYS,
  isClothingKind,
  type ClothingBrand,
  type ClothingKind,
} from "@/lib/playground/clothing";
import snapshot from "@/res/brands-naver-snapshot.json";
import clothingCategories from "@/res/clothing-categories.json";

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

const UNDEFINED_COLUMN = "42703";

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

export function getSnapshotBrands(): ClothingBrand[] {
  const kindOf = new Map<string, ClothingKind>();
  for (const [kind, def] of Object.entries(clothingCategories.kinds)) {
    if (isClothingKind(kind)) {
      for (const id of def.categoryIds) {
        kindOf.set(String(id), kind);
      }
    }
  }

  const brands: ClothingBrand[] = [];
  for (const b of (snapshot.brands as Array<{
    naverBrandId?: number;
    displayName: string;
    aliases?: string[];
    naverBrandName?: string | null;
    groups?: Array<{ section: string; key: string }>;
    clothing?: { query?: string; categories?: Array<{ id: string | number; count?: number }> };
  }>) ?? []) {
    if (!b.naverBrandId) continue;

    const counts = Object.fromEntries(CLOTHING_KIND_KEYS.map((kind) => [kind, 0])) as Record<
      ClothingKind,
      number
    >;

    for (const c of b.clothing?.categories ?? []) {
      const kind = kindOf.get(String(c.id));
      if (kind && isClothingKind(kind)) {
        counts[kind] += c.count ?? 0;
      }
    }

    const inClothingGroup = (b.groups ?? []).some((g) =>
      CLOTHING_BRAND_GROUPS.has(`${g.section}/${g.key}`)
    );
    const hasClothing = CLOTHING_KIND_KEYS.some((kind) => counts[kind] > 0);

    if (!inClothingGroup && !hasClothing) continue;

    brands.push({
      id: String(b.naverBrandId),
      displayName: b.displayName,
      aliases: b.aliases ?? [],
      naverBrandId: b.naverBrandId,
      naverBrandName: b.naverBrandName ?? null,
      clothingQuery: b.clothing?.query ?? null,
      counts,
    });
  }

  return brands.sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
}

export async function getAllClothingBrands(): Promise<ClothingBrand[]> {
  try {
    const supabase = getAdminSupabase();
    let { data, error } = await supabase
      .from("brands")
      .select(COLUMNS.join(", "))
      .eq("is_active", true)
      .not("naver_brand_id", "is", null);

    if (error?.code === UNDEFINED_COLUMN) {
      ({ data, error } = await supabase
        .from("brands")
        .select(COLUMNS.filter((c) => c !== "clothing_query").join(", "))
        .eq("is_active", true)
        .not("naver_brand_id", "is", null));
    }

    if (error || !data || data.length === 0) {
      return getSnapshotBrands();
    }

    const brands = (data as unknown as BrandRow[])
      .map(toBrand)
      .filter((brand): brand is ClothingBrand => brand !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));

    if (brands.length === 0) {
      return getSnapshotBrands();
    }

    return brands;
  } catch {
    return getSnapshotBrands();
  }
}
