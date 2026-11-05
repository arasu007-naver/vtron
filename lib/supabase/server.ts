import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// 서버 전용 service role(secret) 키만 받는다. 공개(publishable/anon) 키로 대신하면
// anon 권한으로 돌아 RLS · revoke 된 테이블(business_user 등)에서 "permission denied" 가 난다.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.STMX_WEB_SUPABASE_SECRET_KEY ||
  "";

export const getAdminSupabase = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase service role credentials: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or STMX_WEB_SUPABASE_SECRET_KEY) in .env.local.",
    );
  }
  return createClient(supabaseUrl, supabaseKey);
};
