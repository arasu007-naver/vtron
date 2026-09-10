"use client";

import React from "react";
import { Sparkles, FolderOpen, Save } from "lucide-react";

/**
 * 스튜디오 사이드바 헤더.
 *
 * 라우트 이동과 로그아웃은 전역 `NavBar` 가 맡는다. 여기에는 이 페이지에서만
 * 뜻이 있는 동작(세션 목록·저장)만 남긴다.
 */

interface StudioHeaderProps {
  onOpenHistory?: () => void;
  onSaveProject?: () => void;
  onReset?: () => void;
  isSaving?: boolean;
}

export default function StudioHeader({
  onOpenHistory,
  onSaveProject,
  isSaving,
}: StudioHeaderProps) {
  return (
    <header className="p-5 pb-4 border-b border-[var(--color-divider)] bg-[var(--color-panel)] flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="font-[family-name:var(--font-heading)] font-semibold text-[19.8px] tracking-[0.18em] uppercase text-black flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>VTRON STUDIO · SUPABASE</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              title="저장된 프로젝트 불러오기"
              className="px-2.5 py-1 text-[20.7px] rounded-full btn btn-secondary flex items-center gap-1"
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
              className="px-2.5 py-1 text-[20.7px] rounded-full btn btn-primary flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              <span>{isSaving ? "저장 중..." : "저장"}</span>
            </button>
          )}
        </div>
      </div>
      <h1 className="font-[family-name:var(--font-heading)] font-normal text-[54px] leading-tight tracking-[-0.015em] m-0 text-black">
        Virtual Try-On
      </h1>
      <p className="m-0 text-[22.5px] text-black">
        배경 + 실사 캐릭터 + 가먼트(Garments) → FASHN AI 가상 피팅
      </p>
    </header>
  );
}
