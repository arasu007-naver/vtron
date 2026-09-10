"use client";

import React, { useRef } from "react";
import { ChevronDown, ChevronRight, Image as ImageIcon, X } from "lucide-react";
import { CanvasPreset, BgFitType, BackgroundSetting } from "@/types/vton";

export const CANVAS_PRESETS: CanvasPreset[] = [
  { label: "720 × 1280", w: 720, h: 1280, ratioLabel: "9:16" },
  { label: "1080 × 1920", w: 1080, h: 1920, ratioLabel: "9:16" },
  { label: "1080 × 1350", w: 1080, h: 1350, ratioLabel: "4:5" },
  { label: "1080 × 1080", w: 1080, h: 1080, ratioLabel: "1:1" },
  { label: "1280 × 720", w: 1280, h: 720, ratioLabel: "16:9" },
  { label: "1920 × 1080", w: 1920, h: 1080, ratioLabel: "16:9" },
];

export const CSS_BACKGROUND_PRESETS = [
  { id: "오로라", label: "오로라", className: "bg-preset-aurora" },
  { id: "선셋 글로우", label: "선셋 글로우", className: "bg-preset-sunset" },
  { id: "컬러 메시", label: "컬러 메시", className: "bg-preset-color-mesh" },
  { id: "보케", label: "보케", className: "bg-preset-bokeh" },
  { id: "네온 그리드", label: "네온 그리드", className: "bg-preset-neon-grid" },
  { id: "웨이브", label: "웨이브", className: "bg-preset-wave" },
  { id: "스포트라이트", label: "스포트라이트", className: "bg-preset-spotlight" },
  { id: "컬러 블롭", label: "컬러 블롭", className: "bg-preset-color-blob" },
  { id: "더스크", label: "더스크", className: "bg-preset-dusk" },
  { id: "스타필드", label: "스타필드", className: "bg-preset-starfield" },
  { id: "대각 스트라이프", label: "대각 스트라이프", className: "bg-preset-diagonal-stripe" },
  { id: "하프톤 도트", label: "하프톤 도트", className: "bg-preset-halftone-dot" },
  { id: "라이트 빔", label: "라이트 빔", className: "bg-preset-light-beam" },
  { id: "필름 그레인", label: "필름 그레인", className: "bg-preset-film-grain" },
];

interface BackgroundSectionProps {
  currentSize: string;
  w: number;
  h: number;
  ratioLabel: string;
  bgSetting: BackgroundSetting;
  bgListOpen: boolean;
  onSelectSize: (preset: CanvasPreset) => void;
  onCustomSizeChange: (w: number, h: number) => void;
  onToggleBgList: () => void;
  onSelectCssBg: (bgName: string) => void;
  onClearCssBg: () => void;
  onUploadCustomBg: (file: File) => void;
  onSelectBgFit: (fit: BgFitType) => void;
}

export default function BackgroundSection({
  currentSize,
  w,
  h,
  ratioLabel,
  bgSetting,
  bgListOpen,
  onSelectSize,
  onCustomSizeChange,
  onToggleBgList,
  onSelectCssBg,
  onClearCssBg,
  onUploadCustomBg,
  onSelectBgFit,
}: BackgroundSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCustomBg(file);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. 배경 크기 섹션 */}
      <section className="flex flex-col gap-2.5">
        <h6 className="m-0 font-[family-name:var(--font-heading)] font-semibold text-[19.8px] tracking-[0.14em] uppercase text-black">
          1 · 배경 크기
        </h6>
        <div className="flex items-baseline gap-2.5 p-3 px-3.5 border border-[rgba(32,31,29,0.2)] rounded bg-white">
          <span className="font-[family-name:var(--font-heading)] text-[39.6px] font-medium [font-feature-settings:'tnum'] text-black">
            {currentSize}
          </span>
          <span className="text-[18.9px] tracking-[0.1em] text-black border border-[rgba(182,130,53,0.55)] rounded px-1.5 py-0.5 [font-feature-settings:'tnum']">
            {ratioLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {CANVAS_PRESETS.map((p) => {
            const isSelected = p.label === currentSize;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onSelectSize(p)}
                className={`py-2 px-1.5 border rounded-full text-[21.6px] [font-feature-settings:'tnum'] cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#b68235] bg-[rgba(182,130,53,0.08)] text-black font-semibold"
                    : "border-[rgba(32,31,29,0.2)] bg-transparent text-black hover:bg-[rgba(32,31,29,0.05)]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1 text-[19.8px] tracking-[0.1em] uppercase text-black">
            W (px)
            <input
              type="number"
              className="input [font-feature-settings:'tnum']"
              value={w}
              onChange={(e) => onCustomSizeChange(Number(e.target.value) || 100, h)}
            />
          </label>
          <label className="flex flex-col gap-1 text-[19.8px] tracking-[0.1em] uppercase text-black">
            H (px)
            <input
              type="number"
              className="input [font-feature-settings:'tnum']"
              value={h}
              onChange={(e) => onCustomSizeChange(w, Number(e.target.value) || 100)}
            />
          </label>
        </div>
      </section>

      <div className="h-[1px] bg-[var(--color-divider)]" />

      {/* 2. 배경 이미지 & CSS 배경 섹션 */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h6 className="m-0 font-[family-name:var(--font-heading)] font-semibold text-[19.8px] tracking-[0.14em] uppercase text-black">
            2 · 배경 스타일{" "}
            <span className="text-black tracking-[0.08em] font-normal">
              선택 사항
            </span>
          </h6>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
          <div className="min-w-0 border border-[rgba(32,31,29,0.2)] rounded bg-white overflow-hidden">
            <button
              type="button"
              onClick={onToggleBgList}
              className="flex items-center gap-2 w-full p-2.5 text-left text-[22.5px] text-black hover:bg-[rgba(32,31,29,0.05)] cursor-pointer"
            >
              <span className="flex items-center justify-center w-5 h-5 flex-none border border-[rgba(32,31,29,0.18)] rounded-full text-[18px] text-[rgba(32,31,29,0.6)]">
                {bgListOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </span>
              <span className="flex-1 truncate">
                CSS 배경 · {bgSetting.cssBg || "없음"}
              </span>
            </button>

            {bgListOpen && (
              <div className="flex flex-col gap-2 p-2.5 border-t border-[rgba(32,31,29,0.12)] bg-[var(--color-panel)]">
                <div className="vt-scroll max-h-[190px] overflow-y-auto grid grid-cols-2 gap-1.5 pt-1">
                  {CSS_BACKGROUND_PRESETS.map((b) => {
                    const isSelected = bgSetting.cssBg === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onSelectCssBg(b.id)}
                        className={`p-2 px-2.5 border rounded-full text-[20.7px] text-left transition-all ${
                          isSelected
                            ? "border-[#b68235] bg-[rgba(182,130,53,0.12)] text-black font-semibold"
                            : "border-[rgba(32,31,29,0.16)] bg-white text-black hover:bg-[rgba(32,31,29,0.05)]"
                        }`}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={onClearCssBg}
                  className="w-full py-1.5 border border-[rgba(32,31,29,0.18)] rounded-full bg-white text-black text-[20.7px] hover:bg-red-50 hover:text-black hover:border-red-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>CSS 배경 제거</span>
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-none py-2.5 px-3.5 border border-dashed border-[rgba(32,31,29,0.3)] rounded-full bg-white text-black font-[family-name:var(--font-heading)] font-semibold text-[21.6px] whitespace-nowrap hover:bg-[rgba(32,31,29,0.05)] cursor-pointer flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[var(--color-accent-700)]" />
            <span>{bgSetting.customImageUrl ? "배경 교체" : "이미지 선택"}</span>
          </button>
        </div>

        {bgSetting.customImageUrl && (
          <div className="flex items-center justify-between p-2 border border-amber-200 bg-amber-50/50 rounded text-[20.7px]">
            <span className="truncate max-w-[200px] text-black">
              🖼 커스텀 배경 이미지 적용됨
            </span>
            <button
              type="button"
              onClick={() => onUploadCustomBg(null as any)}
              className="text-black hover:underline text-[19.8px]"
            >
              제거
            </button>
          </div>
        )}

        <p className="m-0 text-[20.7px] leading-relaxed text-black">
          이미지를 올리면 CSS 배경 위에 덮입니다. 둘 다 비우면 단색 스튜디오 배경으로 합성합니다.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {(["Cover", "Contain", "반복"] as BgFitType[]).map((fit) => {
            const isSelected = bgSetting.bgFit === fit;
            return (
              <button
                key={fit}
                type="button"
                onClick={() => onSelectBgFit(fit)}
                className={`py-1.5 px-1 border rounded-full text-[21.6px] cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#b68235] bg-[rgba(182,130,53,0.1)] text-black font-semibold"
                    : "border-[rgba(32,31,29,0.18)] bg-white text-black hover:bg-[rgba(32,31,29,0.05)]"
                }`}
              >
                {fit}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
