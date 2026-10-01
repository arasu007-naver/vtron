"use client";

import Link from "next/link";
import {
  Building2,
  FileText,
  Handshake,
  List,
  Sparkles,
  UserRound,
} from "lucide-react";

const CARDS = [
  {
    href: "/contracts/creator",
    title: "STMX ↔ 크리에이터",
    description:
      "플랫폼(스티믹스)이 크리에이터와 계약할 때 쓰는 신청서입니다. SNS·팔로워·협업 목적을 수집합니다.",
    icon: UserRound,
    accent: "bg-[rgba(122,44,238,0.12)] text-[#7A2CEE]",
  },
  {
    href: "/contracts/brand",
    title: "STMX ↔ 브랜드",
    description:
      "플랫폼(스티믹스)이 브랜드와 계약할 때 쓰는 신청서입니다. 브랜드 정보·예산·캠페인 목표를 수집합니다.",
    icon: Building2,
    accent: "bg-[rgba(182,130,53,0.14)] text-[var(--color-accent-700)]",
  },
  {
    href: "/contracts/creator-brand",
    title: "크리에이터 ↔ 브랜드 직접 연결",
    description:
      "크리에이터와 브랜드가 직접 연결될 때 쓰는 신청서입니다. 제출 시 알림 수신자 목록을 함께 저장·유지합니다.",
    icon: Handshake,
    accent: "bg-[rgba(14,138,66,0.12)] text-[#0E8A42]",
  },
] as const;

export default function ContractsHubPage() {
  return (
    <div className="h-full flex flex-col bg-[#F8F9FA] text-[#1D2330] overflow-hidden">
      <header className="flex-none bg-white border-b border-[#E0E3E8] px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(182,130,53,0.12)] text-[var(--color-accent-700)] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold tracking-tight text-[#101317]">
                  STMX 계약 / 신청
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EDE8FF] text-[#7A2CEE] text-[12px] font-bold">
                  스티믹스
                </span>
              </div>
              <p className="text-[13px] text-[#717680] mt-0.5">
                플랫폼–크리에이터 · 플랫폼–브랜드 · 크리에이터–브랜드 직접 연결 신청서
              </p>
            </div>
          </div>

          <Link
            href="/contracts/submissions"
            className="px-3 py-1.5 h-9 rounded-lg bg-white border border-[#E0E3E8] hover:bg-[#F4F5F7] text-[13px] font-medium text-[#101317] inline-flex items-center gap-1.5 transition-colors"
          >
            <List className="w-3.5 h-3.5" />
            제출 내역
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 vt-scroll">
        <div className="max-w-5xl mx-auto w-full space-y-4">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold text-[#101317] m-0">
                용도에 맞는 신청서를 선택하세요
              </p>
              <p className="text-[13px] text-[#717680] mt-1 m-0">
                제출 내용은 Supabase <code>stmx_contract_applications</code> 에 저장됩니다.
                크리에이터↔브랜드 직접 연결은 알림 수신자 디렉터리(
                <code>stmx_contract_notify_directory</code>)도 함께 유지합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CARDS.map(({ href, title, description, icon: Icon, accent }) => (
              <Link
                key={href}
                href={href}
                className="group bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#D1D5DB] shadow-xs p-5 transition-all no-underline text-inherit flex flex-col gap-3"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-[16px] font-bold text-[#101317] m-0 group-hover:text-[var(--color-accent-700)]">
                  {title}
                </h2>
                <p className="text-[13px] text-[#717680] m-0 leading-relaxed flex-1">
                  {description}
                </p>
                <span className="text-[13px] font-semibold text-[var(--color-accent-700)]">
                  신청서 열기 →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
