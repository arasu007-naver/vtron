"use client";

import React, { useState } from "react";
import { Sparkles, Eye, Layers, Maximize2, Download } from "lucide-react";
import { BackgroundSetting, CharacterSetting, GarmentItem } from "@/types/vton";
import { CSS_BACKGROUND_PRESETS } from "./BackgroundSection";

interface StudioCanvasProps {
  w: number;
  h: number;
  ratioLabel: string;
  sizeLabel: string;
  bgSetting: BackgroundSetting;
  character: CharacterSetting;
  garments: GarmentItem[];
  seed: number;
  resultImageUrl?: string | null;
  isRendering?: boolean;
}

export default function StudioCanvas({
  w,
  h,
  ratioLabel,
  sizeLabel,
  bgSetting,
  character,
  garments,
  seed,
  resultImageUrl,
  isRendering,
}: StudioCanvasProps) {
  const [showResultOnly, setShowResultOnly] = useState(false);

  // CSS Background Class 찾기
  const currentCssPreset = CSS_BACKGROUND_PRESETS.find(
    (p) => p.id === bgSetting.cssBg
  );

  const getBgStyle = (): React.CSSProperties => {
    if (bgSetting.customImageUrl) {
      const bgSize =
        bgSetting.bgFit === "Cover"
          ? "cover"
          : bgSetting.bgFit === "Contain"
          ? "contain"
          : "auto";
      const bgRepeat = bgSetting.bgFit === "반복" ? "repeat" : "no-repeat";
      return {
        backgroundImage: `url(${bgSetting.customImageUrl})`,
        backgroundSize: bgSize,
        backgroundPosition: "center",
        backgroundRepeat: bgRepeat,
      };
    }
    return {};
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#eae9e9] relative">
      {/* 상단 캔버스 컨트롤 툴바 */}
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        {resultImageUrl && (
          <button
            type="button"
            onClick={() => setShowResultOnly(!showResultOnly)}
            className={`px-3 py-1.5 rounded-full text-[21.6px] font-medium shadow-md transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer ${
              showResultOnly
                ? "bg-[var(--color-accent)] text-white"
                : "bg-white/90 text-black hover:bg-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showResultOnly ? "합성 전 레이어 보기" : "최종 결과 보기"}</span>
          </button>
        )}
      </div>

      {/* 메인 캔버스 뷰포트 */}
      <div className="flex-1 flex items-center justify-center p-6 min-w-0 min-h-0">
        <div
          className="relative max-w-full max-h-full box-border border-[6px] border-white outline outline-1 outline-[rgba(32,31,29,0.16)] bg-[#dedbd8] shadow-[0_12px_36px_rgba(32,31,29,0.12)] rounded overflow-hidden flex items-center justify-center transition-all duration-300"
          style={{
            aspectRatio: `${w} / ${h}`,
            width: `min(100%, calc((100vh - 160px) * ${(w / h).toFixed(4)}))`,
          }}
        >
          {/* 1. 기본 체커보드 투명 그리드 */}
          <div className="absolute inset-0 checker-pattern" />

          {/* 2. 배경 레이어 (CSS 배경 or 커스텀 이미지) */}
          <div
            className={`absolute inset-0 transition-all ${
              currentCssPreset?.className || ""
            }`}
            style={getBgStyle()}
          />

          {/* 3. 최종 렌더 결과물이 있고, 결과 보기 모드일 때 */}
          {resultImageUrl && showResultOnly ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resultImageUrl}
              alt="VTON Render Result"
              className="absolute inset-0 w-full h-full object-contain z-10"
            />
          ) : (
            /* 4. 작업 중 레이어 합성 미리보기 */
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* 캐릭터 모델 */}
              {character.imageUrl ? (
                <div
                  className="relative flex items-center justify-center transition-transform duration-200"
                  style={{
                    transform: `scale(${character.scale / 100})`,
                    maxWidth: "85%",
                    maxHeight: "85%",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={character.imageUrl}
                    alt="Character Model"
                    className="max-w-full max-h-full object-contain drop-shadow-xl"
                  />

                  {/* 등록된 가먼트 뱃지 오버레이 */}
                  {garments.length > 0 && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[18.9px] whitespace-nowrap shadow-lg">
                      <Layers className="w-3 h-3 text-[var(--color-accent)]" />
                      <span>{garments.length}개 가먼트 정렬됨</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-black">
                  <Sparkles className="w-8 h-8 mb-2 stroke-[1.2] text-[var(--color-accent)] opacity-60" />
                  <span className="font-[family-name:var(--font-heading)] italic text-[28.8px] text-black/60">
                    실사 캐릭터와 의류를 등록하여 가상 피팅을 시작하세요
                  </span>
                  <span className="text-[20.7px] mt-1 text-black">
                    좌측 패널에서 설정 후 [착장 생성]을 누르면 AI 피팅이 수행됩니다
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 렌더링 중 오버레이 스피너 */}
          {isRendering && (
            <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3 animate-fade-in">
              <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span className="font-[family-name:var(--font-heading)] text-[28.8px] tracking-wide text-black">
                AI 가상 피팅 렌더링 진행 중...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 하단 캔버스 메타 정보 바 */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 py-2.5 px-6 text-[21.6px] text-black [font-feature-settings:'tnum'] bg-[#dedbd8]/60 border-t border-[rgba(32,31,29,0.1)]">
        <span className="font-medium text-black">
          {sizeLabel} ({ratioLabel})
        </span>
        <span className="w-[1px] h-3 bg-[rgba(32,31,29,0.2)]" />
        <span>캐릭터 {character.imageUrl ? "1" : "0"}</span>
        <span className="w-[1px] h-3 bg-[rgba(32,31,29,0.2)]" />
        <span>가먼트 {garments.length}점</span>
        <span className="w-[1px] h-3 bg-[rgba(32,31,29,0.2)]" />
        <span>시드 {seed}</span>
        {resultImageUrl && (
          <>
            <span className="w-[1px] h-3 bg-[rgba(32,31,29,0.2)]" />
            <a
              href={resultImageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-black hover:underline flex items-center gap-1 font-semibold"
            >
              <Download className="w-3 h-3" />
              <span>결과 다운로드</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
