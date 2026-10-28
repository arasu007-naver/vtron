"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCheck, Users } from "lucide-react";

/**
 * Creator 요청 · 크리에이터 계약 관리를 하나로 묶는 탭.
 * 상단 NavBar 에는 "Creator 요청" 하나만 두고(nav-links.ts NAVBAR_LINKS), 두 페이지 맨 위의 이 탭으로 오간다.
 */
const TABS = [
  { href: "/creator-req", label: "Creator 요청", icon: UserCheck, title: "Creator 역할 신청(user_biz_request) 및 선호 브랜드 목록" },
  { href: "/admin/creators", label: "크리에이터 계약", icon: Users, title: "크리에이터 계약 신청 관리 (STMX↔크리에이터 · 직접 연결)" },
] as const;

export default function CreatorTabs() {
  const pathname = usePathname();
  return (
    <div role="tablist" aria-label="크리에이터" className="flex-none flex items-center gap-1 px-6 pt-3 bg-white">
      {TABS.map(({ href, label, icon: Icon, title }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            role="tab"
            aria-selected={active}
            title={title}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[14px] transition-colors ${
              active ? "bg-[rgba(182,130,53,0.16)] font-semibold text-black" : "text-black/60 hover:bg-black/5 hover:text-black"
            }`}
          >
            <Icon className={`w-4 h-4 ${active ? "text-[var(--color-accent-700)]" : ""}`} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
