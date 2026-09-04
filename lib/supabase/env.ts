/**
 * 브라우저/프록시에서 공유하는 Supabase 공개 자격증명.
 *
 * 프로젝트마다 anon 키 이름이 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 또는
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 로 섞여 있어 양쪽을 모두 받는다.
 * `process.env.NEXT_PUBLIC_*` 는 빌드 시 인라인되므로 반드시 리터럴로 참조한다.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

/** 인증을 수행할 수 있는 환경인지 여부 */
export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY);
