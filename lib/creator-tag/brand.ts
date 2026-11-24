import "server-only";
import { getAdminSupabase } from "@/lib/supabase/server";
import { brandKey } from "./rank";
import { matchBrand, type BrandRow } from "./core";

export interface FoundBrand {
  id: string;
  displayName: string;
  /** 표시명 · 네이버 브랜드명 · 별칭 */
  names: string[];
}

const PAGE = 1000;

/** display_name · naver_brand_name · aliases 와 정규화 완전 일치. is_active=false 도 대상. 읽기 전용. */
export async function findBrand(name: string): Promise<FoundBrand | null> {
  const key = brandKey(name);
  if (!key) return null;
  const db = getAdminSupabase();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("brands")
      .select("id, display_name, naver_brand_name, aliases")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const found = matchBrand((data ?? []) as BrandRow[], name);
    if (found) return found;
    if (!data || data.length < PAGE) return null;
  }
}
