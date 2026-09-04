"use client";

import React from "react";
import { X, Calendar, Layers, Trash2, ArrowRight } from "lucide-react";
import { VtonProject } from "@/types/vton";

interface ProjectHistoryModalProps {
  visible: boolean;
  projects: VtonProject[];
  loading: boolean;
  onClose: () => void;
  onSelectProject: (project: VtonProject) => void;
  onDeleteProject: (projectId: string) => void;
}

export default function ProjectHistoryModal({
  visible,
  projects,
  loading,
  onClose,
  onSelectProject,
  onDeleteProject,
}: ProjectHistoryModalProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-[480px] max-w-full bg-white rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-[rgba(32,31,29,0.14)]">
        {/* 헤더 */}
        <header className="flex items-center justify-between p-4 px-5 border-b border-[var(--color-divider)] bg-[var(--color-panel)]">
          <div className="flex flex-col">
            <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[18px] m-0 text-[#201f1d]">
              저장된 VTON 세션 목록
            </h3>
            <span className="text-[12px] text-[rgba(32,31,29,0.5)]">
              Supabase DB에 기록된 작업 세션입니다.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4 text-[#201f1d]" />
          </button>
        </header>

        {/* 바디 리스트 */}
        <div className="vt-scroll flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[rgba(32,31,29,0.5)]">
              <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-[12px]">세션 불러오는 중...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center text-[rgba(32,31,29,0.45)] text-[13px]">
              저장된 이전 세션이 없습니다.
            </div>
          ) : (
            projects.map((p) => (
              <div
                key={p.id}
                className="p-3 px-4 border border-[rgba(32,31,29,0.16)] rounded-lg hover:border-[var(--color-accent)] hover:shadow-sm transition-all flex items-center justify-between gap-3 bg-[var(--color-panel)]"
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] text-[#201f1d] truncate">
                      {p.title || "Untitled Session"}
                    </span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-amber-100 text-[var(--color-accent-800)] font-medium">
                      {p.size_label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11.5px] text-[rgba(32,31,29,0.5)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{p.created_at?.slice(0, 10) || "최근"}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>가먼트 {p.garments?.length || 0}점</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectProject(p)}
                    className="btn btn-primary py-1 px-3 text-[12px] rounded-full flex items-center gap-1"
                  >
                    <span>열기</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteProject(p.id)}
                    title="세션 삭제"
                    className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-danger)] hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
