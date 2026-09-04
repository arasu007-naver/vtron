"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { login } from "@/lib/auth-client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

/**
 * `next` 파라미터는 사용자가 조작할 수 있으므로 같은 오리진의 경로만 허용한다.
 * (`//evil.com` 같은 프로토콜 상대 URL 로의 오픈 리다이렉트 방지)
 */
const safeNextPath = (raw: string | null): string => {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = safeNextPath(searchParams.get("next"));
  const isConfigError = searchParams.get("error") === "config" || !hasSupabaseEnv;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // 브라우저는 Supabase SDK 를 직접 호출하지 않는다.
      // /api/auth/login 이 대신 로그인하고 세션 쿠키 + access token 을 돌려준다.
      await login(email.trim(), password);

      // 세션 쿠키가 반영된 상태로 원래 가려던 경로를 다시 렌더링한다.
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--color-divider)] bg-[var(--color-panel)] shadow-[0_10px_36px_rgba(32,31,29,0.08)] p-8">
      {/* 브랜드 헤더 */}
      <header className="flex flex-col gap-2 text-center">
        <div className="font-[family-name:var(--font-heading)] font-semibold text-[11px] tracking-[0.18em] uppercase text-[var(--color-accent-700)] flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>VTON STUDIO</span>
        </div>
        <h1 className="font-[family-name:var(--font-heading)] font-normal text-[32px] leading-tight tracking-[-0.015em] m-0 text-[#201f1d]">
          로그인
        </h1>
        <p className="m-0 text-[12.5px] text-[rgba(32,31,29,0.6)]">
          가상 피팅 스튜디오를 이용하려면 계정으로 로그인하세요.
        </p>
      </header>

      {isConfigError ? (
        <p
          role="alert"
          className="mt-7 m-0 flex items-start gap-1.5 rounded-md border border-[rgba(138,58,42,0.28)] bg-[rgba(138,58,42,0.07)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--color-danger)]"
        >
          <AlertCircle className="w-3.5 h-3.5 mt-[2px] flex-none" />
          <span>
            Supabase 환경 변수가 설정되지 않아 로그인할 수 없습니다.
            <br />
            <code className="font-[family-name:var(--font-mono)] text-[11px]">
              NEXT_PUBLIC_SUPABASE_URL
            </code>
            {" 과 "}
            <code className="font-[family-name:var(--font-mono)] text-[11px]">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
            {" 를 .env.local 에 지정한 뒤 서버를 다시 시작하세요."}
          </span>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          {/* 이메일 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-[11.5px] font-semibold tracking-[0.06em] uppercase text-[rgba(32,31,29,0.62)]"
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isSubmitting}
              className="input w-full py-2.5 text-[13.5px] disabled:opacity-60"
            />
          </div>

          {/* 비밀번호 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-[11.5px] font-semibold tracking-[0.06em] uppercase text-[rgba(32,31,29,0.62)]"
            >
              비밀번호
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
                className="input w-full py-2.5 pr-10 text-[13.5px] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[rgba(32,31,29,0.45)] hover:text-[var(--color-accent-700)] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* 오류 메시지 */}
          {error && (
            <p
              role="alert"
              className="m-0 flex items-start gap-1.5 rounded-md border border-[rgba(138,58,42,0.28)] bg-[rgba(138,58,42,0.07)] px-3 py-2 text-[12px] text-[var(--color-danger)]"
            >
              <AlertCircle className="w-3.5 h-3.5 mt-[1px] flex-none" />
              <span>{error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full py-3 text-[14px] rounded-full shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? "로그인 중..." : "로그인"}</span>
          </button>
        </form>
      )}
    </section>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full grid place-items-center bg-[var(--color-bg)] px-5 py-10 select-text">
      <main className="w-full max-w-[400px]">
        {/* useSearchParams 는 Suspense 경계를 요구한다. */}
        <Suspense
          fallback={
            <section className="rounded-2xl border border-[var(--color-divider)] bg-[var(--color-panel)] shadow-[0_10px_36px_rgba(32,31,29,0.08)] p-8 h-[392px]" />
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-4 m-0 text-center text-[11px] italic text-[rgba(32,31,29,0.45)]">
          Supabase Auth 로 보호되는 세션
        </p>
      </main>
    </div>
  );
}
