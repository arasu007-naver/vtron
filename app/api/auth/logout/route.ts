import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";

/** 세션 쿠키를 정리한다. 이후 페이지 요청은 proxy.ts 가 /login 으로 돌려보낸다. */
export async function POST() {
  const supabase = await createRouteClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
