"use client";

import React from "react";
import { Sparkles, FolderOpen, Save, RefreshCw } from "lucide-react";

interface StudioHeaderProps {
  onOpenHistory?: () => void;
  onSaveProject?: () => void;
  onReset?: () => void;
  isSaving?: boolean;
}

export default function StudioHeader({
  onOpenHistory,
  onSaveProject,
  onReset,
  isSaving,
}: StudioHeaderProps) {
  return (
    <header className="p-5 pb-4 border-b border-[var(--color-divider)] bg-[var(--color-panel)] flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="font-[family-name:var(--font-heading)] font-semibold text-[11px] tracking-[0.18em] uppercase text-[var(--color-accent-700)] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>VTRON STUDIO · SUPABASE</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              title="저장된 프로젝트 불러오기"
              className="px-2.5 py-1 text-[11.5px] rounded-full btn btn-secondary flex items-center gap-1"
            >
              <FolderOpen className="w-3 h-3 text-[var(--color-accent-700)]" />
              <span>세션 목록</span>
            </button>
          )}
          {onSaveProject && (
            <button
              type="button"
              onClick={onSaveProject}
              disabled={isSaving}
              title="현재 세션 DB에 저장"
              className="px-2.5 py-1 text-[11.5px] rounded-full btn btn-primary flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              <span>{isSaving ? "저장 중..." : "저장"}</span>
            </button>
          )}
        </div>
      </div>
      <h1 className="font-[family-name:var(--font-heading)] font-normal text-[30px] leading-tight tracking-[-0.015em] m-0 text-[#201f1d]">
        Virtual Try-On
      </h1>
      <p className="m-0 text-[12.5px] text-[rgba(32,31,29,0.6)]">
        배경 + 실사 캐릭터 + 가먼트(Garments) → Supabase AI 가상 피팅
      </p>
    </header>
  );
}
