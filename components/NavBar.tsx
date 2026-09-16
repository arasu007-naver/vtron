"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Database,
  Film,
  LayoutDashboard,
  Link2,
  LogOut,
  Shirt,
  Sparkles,
  TerminalSquare,
  UserCheck,
} from "lucide-react";
import { logout } from "@/lib/auth-client";

/**
 * 전역 상단 내비게이션.
 *
 * 루트 레이아웃에 한 번만 붙어 모든 페이지 위에 뜬다. 이전에는 스튜디오 헤더에만
 * 라우트 링크가 있어서 `/tryon` · `/mov` 로 넘어가면 돌아올 길이 없었다.
 *
 * `/login` 에서는 렌더하지 않는다 — 유일한 공개 라우트이고, 세션이 없는 화면에
 * 보호된 라우트 목록과 로그아웃 버튼을 띄울 이유가 없다.
 */

const LINKS = [
  {
    href: "/",
    label: "스튜디오",
    icon: LayoutDashboard,
    title: "배경 + 캐릭터 + 가먼트 조합 가상 피팅",
  },
  {
    href: "/tryon",
    label: "FASHN Try-On",
    icon: Shirt,
    title: "FASHN 단일 가먼트 try-on 데모",
  },
  {
    href: "/mov",
    label: "Portrait Studio",
    icon: Film,
    title: "배경 애니메이션 + 캐릭터 등장 영상",
  },
  {
    href: "/api-playground",
    label: "API 플레이그라운드",
    icon: TerminalSquare,
    title: "네이버 커머스 등 REST API 호출 테스트",
  },
  {
    href: "/products-2-link",
    label: "상품링크",
    icon: Link2,
    title: "Loox 목록에서 게시물을 고르고 옷 브랜드 × 분류의 카탈로그 상품을 붙인다",
  },
  {
    href: "/brand-integration",
    label: "브랜드 내재화",
    icon: Database,
    title: "브랜드 → 최상위 카테고리 → 최하위 카테고리 → 상품 계층을 우리 DB 에 넣는다",
  },
  {
    href: "/creator-req",
    label: "Creator 요청",
    icon: UserCheck,
    title: "Creator 역할 신청(user_biz_request) 및 선호 브랜드 목록 조회",
  },
] as const;

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (pathname === "/login" || pathname.startsWith("/login/")) return null;

  // 세션을 끊으면 프록시 가드가 /login 으로 돌려보낸다.
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <nav
      aria-label="주 메뉴"
      className="flex-none flex items-center gap-2 px-3 py-1.5 border-b border-[var(--color-divider)] bg-[var(--color-panel)] select-none"
    >
      <Link
        href="/"
        className="flex items-center gap-1.5 pr-2 mr-1 no-underline"
        title="VTON 스튜디오"
      >
        <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
        <span className="font-[family-name:var(--font-heading)] font-semibold text-[19.8px] tracking-[0.18em] uppercase text-black">
          STMX Studio
        </span>
      </Link>

      <div className="flex items-center gap-1 min-w-0 overflow-x-auto vt-scroll">
        {LINKS.map(({ href, label, icon: Icon, title }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={title}
              aria-current={active ? "page" : undefined}
              className={`px-2.5 py-1 text-[20.7px] rounded-full flex items-center gap-1 whitespace-nowrap transition-colors ${active
                  ? "bg-[rgba(182,130,53,0.16)] text-black font-semibold"
                  : "text-black hover:bg-[rgba(32,31,29,0.06)] hover:text-black"
                }`}
            >
              <Icon
                className={`w-3 h-3 flex-none ${active ? "text-[var(--color-accent-700)]" : ""
                  }`}
              />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        title="로그아웃"
        aria-label="로그아웃"
        className="ml-auto flex-none px-2 py-1 text-[20.7px] rounded-full btn btn-secondary flex items-center gap-1 disabled:opacity-60"
      >
        <LogOut className="w-3 h-3 text-[var(--color-accent-700)]" />
        <span className="hidden md:inline">로그아웃</span>
      </button>
    </nav>
  );
}
