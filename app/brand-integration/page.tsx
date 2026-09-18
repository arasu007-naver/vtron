"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import BrandCatalogSteps from "@/components/playground/BrandCatalogSteps";
import { issueNaverToken } from "@/lib/playground/client";
import type { NaverTokenResult } from "@/types/playground";

/**
 * 브랜드 내재화 페이지.
 *
 *   ┌ 1줄 ─ 토큰 발급 ─────────────────────────────────────────┐
 *   ├ 2줄 ─ 3단계 브랜드 · 4단계 걸러내기 ──────────────────────┤
 *   ├ ─── '브랜드 등록' ───────────────────────────────────────┤
 *   └ ─── 내재화할 상품 목록 ──────────────────────────────────┘
 *
 * 상품링크(/products-2-link)에서 Loox 쪽을 들어내고 3 · 4단계만 남긴 화면이다. 거기서는
 * 고른 상품을 게시물에 붙이지만, 여기서는 브랜드 → 최상위 카테고리 → 최하위 카테고리 → 상품
 * 계층을 통째로 우리 DB(brand_catalog_*)에 넣는다.
 *
 * 액세스 토큰은 플레이그라운드와 같이 메모리에만 둔다.
 */

const remaining = (token: NaverTokenResult, now: number) => {
  const left = token.issuedAt + token.expiresIn * 1000 - now;
  if (left <= 0) return "만료됨";
  const m = Math.floor(left / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분 남음` : `${m}분 남음`;
};

export default function BrandIntegrationPage() {
  const [token, setToken] = useState<NaverTokenResult | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [token]);

  const expired = token ? token.issuedAt + token.expiresIn * 1000 <= now : false;

  const issue = async () => {
    setIssuing(true);
    setTokenError(null);
    const { token: issued, error } = await issueNaverToken();
    setIssuing(false);
    if (error || !issued) {
      setTokenError(error ?? "토큰을 받지 못했습니다.");
      setToken(null);
      return;
    }
    setToken(issued);
    setNow(Date.now());
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* 1줄 — 토큰 발급 */}
      <section className="flex-none px-4 py-2.5 border-b border-[var(--pg-line)] flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={issue}
          disabled={issuing}
          className="px-3 py-1.5 text-[20.7px] rounded btn btn-primary flex items-center gap-1 disabled:opacity-60"
        >
          <KeyRound className="w-3.5 h-3.5" />
          {issuing ? "발급 중…" : token ? "토큰 재발급" : "토큰 발급"}
        </button>
        {token ? (
          <span className="flex items-center gap-1.5 flex-wrap text-[18.9px]">
            <span className={`pg-status ${expired ? "pg-status-4" : "pg-status-2"}`}>
              {expired ? "만료" : "발급됨"}
            </span>
            <span className="text-black/60">{remaining(token, now)}</span>
          </span>
        ) : (
          <span className="text-[18.9px] text-black/60">
            토큰이 없으면 카탈로그 조회가 401 로 막힙니다.
          </span>
        )}
        <span className="ml-auto text-[18.9px] text-black/55">
          브랜드 → 최상위 카테고리 → 최하위 카테고리 → 상품
        </span>
        {tokenError && (
          <pre className="pg-code w-full m-0 text-black">{tokenError}</pre>
        )}
      </section>

      {/* 2줄 아래 — 3 · 4단계와 '브랜드 등록'. 세로 스크롤은 여기서 한다. */}
      <div className="flex-1 min-h-0 overflow-y-auto vt-scroll flex flex-col">
        <BrandCatalogSteps token={token} />
      </div>
    </div>
  );
}
