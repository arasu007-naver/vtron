"use client";

import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

interface ContractFormShellProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
  badge?: string;
}

export default function ContractFormShell({
  title,
  description,
  icon: Icon,
  children,
  badge,
}: ContractFormShellProps) {
  return (
    <div className="h-full flex flex-col bg-[#F8F9FA] text-[#1D2330] overflow-hidden">
      <header className="flex-none bg-white border-b border-[#E0E3E8] px-6 py-4">
        <div className="flex items-start gap-3 max-w-3xl mx-auto w-full">
          <Link
            href="/contracts"
            className="mt-1 w-9 h-9 rounded-xl border border-[#E0E3E8] bg-white hover:bg-[#F4F5F7] flex items-center justify-center text-[#555A64] transition-colors"
            title="계약 신청 목록으로"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-[rgba(182,130,53,0.12)] text-[var(--color-accent-700)] flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[20px] font-bold tracking-tight text-[#101317]">{title}</h1>
              {badge && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#EDE8FF] text-[#7A2CEE] text-[12px] font-bold">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#717680] mt-0.5">{description}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 vt-scroll">
        <div className="max-w-3xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
