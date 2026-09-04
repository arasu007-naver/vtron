"use client";

import React, { useRef } from "react";
import { User, Upload, Check } from "lucide-react";
import { CharacterSetting } from "@/types/vton";

interface CharacterSectionProps {
  character: CharacterSetting;
  onChange: (updated: Partial<CharacterSetting>) => void;
  onUploadImage: (file: File) => void;
}

export default function CharacterSection({
  character,
  onChange,
  onUploadImage,
}: CharacterSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <h6 className="m-0 font-[family-name:var(--font-heading)] font-semibold text-[11px] tracking-[0.14em] uppercase text-[rgba(32,31,29,0.55)]">
        3 · 실사 캐릭터{" "}
        <span className="text-[var(--color-danger)] tracking-[0.08em] font-normal">
          필수
        </span>
      </h6>

      <div className="flex gap-3">
        {/* 캐릭터 썸네일 박스 */}
        <div className="w-[78px] h-[104px] flex-none border-4 border-white outline outline-1 outline-[rgba(32,31,29,0.16)] rounded overflow-hidden checker-pattern-sm relative flex items-center justify-center bg-white shadow-sm">
          {character.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.imageUrl}
              alt="Character Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[rgba(32,31,29,0.3)]">
              <User className="w-6 h-6 stroke-[1.5]" />
              <span className="text-[9px] mt-1">미선택</span>
            </div>
          )}
        </div>

        {/* 업로드 버튼 및 가이드 */}
        <div className="flex flex-col gap-2 min-w-0 flex-1 justify-center">
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
            className="btn btn-secondary w-full py-2 text-[12.5px] rounded-full flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-[var(--color-accent-700)]" />
            <span>{character.imageUrl ? "인물 사진 교체" : "인물 사진 업로드"}</span>
          </button>
          <div className="text-[11.5px] text-[rgba(32,31,29,0.5)] leading-relaxed">
            전신 정면, 1024px 이상 권장. 포즈와 얼굴은 자연스럽게 유지됩니다.
          </div>
        </div>
      </div>

      {/* 옵션 체크박스 */}
      <div className="flex flex-col gap-2 pt-1">
        <label className="flex gap-2 items-center text-[12.5px] text-[rgba(32,31,29,0.85)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={character.autoRemoveBg}
            onChange={(e) => onChange({ autoRemoveBg: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
          />
          <span>배경 자동 제거 후 합성</span>
        </label>

        <label className="flex gap-2 items-center text-[12.5px] text-[rgba(32,31,29,0.85)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={character.preserveFaceHands}
            onChange={(e) => onChange({ preserveFaceHands: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
          />
          <span>얼굴·손 보존 강화</span>
        </label>
      </div>

      {/* 인물 크기 스케일 조절 */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex justify-between text-[12px] text-[rgba(32,31,29,0.65)]">
          <span>인물 크기</span>
          <span className="text-[var(--color-accent-700)] font-semibold [font-feature-settings:'tnum']">
            {character.scale}%
          </span>
        </div>
        <input
          type="range"
          min="40"
          max="140"
          value={character.scale}
          onChange={(e) => onChange({ scale: Number(e.target.value) })}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </section>
  );
}
