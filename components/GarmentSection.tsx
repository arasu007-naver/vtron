"use client";

import React, { useRef } from "react";
import { Plus, Trash2, Shirt, Upload, Layers } from "lucide-react";
import { GarmentItem } from "@/types/vton";

export const GARMENT_SLOTS = [
  "상의",
  "하의",
  "아웃터",
  "신발",
  "시계",
  "목걸이",
  "팔찌",
  "반지",
  "발찌",
  "안경",
  "가방",
  "모자",
];

interface GarmentSectionProps {
  garments: GarmentItem[];
  onAddGarment: (slot: string) => void;
  onRemoveGarment: (id: string) => void;
  onUpdateFit: (id: string, fit: number) => void;
  onUploadGarmentImage: (id: string, file: File) => void;
}

export default function GarmentSection({
  garments,
  onAddGarment,
  onRemoveGarment,
  onUpdateFit,
  onUploadGarmentImage,
}: GarmentSectionProps) {
  const activeInputId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = (id: string) => {
    activeInputId.current = id;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeInputId.current) {
      onUploadGarmentImage(activeInputId.current, file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h6 className="m-0 font-[family-name:var(--font-heading)] font-semibold text-[11px] tracking-[0.14em] uppercase text-[rgba(32,31,29,0.55)]">
          4 · Garments & Accessories
        </h6>
        <span className="text-[11.5px] text-[rgba(32,31,29,0.6)] [font-feature-settings:'tnum'] font-medium">
          {garments.length}점 등록됨 · 다중 착장
        </span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* 등록된 가먼트 카드 리스트 */}
      <div className="flex flex-col gap-2.5">
        {garments.length === 0 ? (
          <div className="p-4 border border-dashed border-[rgba(32,31,29,0.2)] rounded text-center text-[12px] text-[rgba(32,31,29,0.5)] bg-white">
            아래 버튼을 눌러 착장할 의류 또는 액세서리를 추가하세요.
          </div>
        ) : (
          garments.map((g, idx) => (
            <div
              key={g.id}
              className="flex flex-col gap-2 p-2.5 px-3 border border-[rgba(32,31,29,0.18)] rounded bg-white shadow-sm transition-all"
            >
              <div className="flex items-center gap-2.5">
                {/* 가먼트 이미지 썸네일 / 업로드 영역 */}
                <button
                  type="button"
                  onClick={() => triggerUpload(g.id)}
                  title="의류/액세서리 사진 업로드"
                  className="w-9 h-11 flex-none border border-[rgba(32,31,29,0.2)] rounded overflow-hidden checker-pattern-sm relative flex items-center justify-center bg-gray-50 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {g.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.imageUrl}
                      alt={g.name}
                      className="w-full h-full object-contain p-0.5"
                    />
                  ) : (
                    <Shirt className="w-4 h-4 text-[rgba(32,31,29,0.35)]" />
                  )}
                </button>

                {/* 가먼트 메타 정보 */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="font-[family-name:var(--font-heading)] font-semibold text-[13.5px] truncate text-[#201f1d]">
                    {g.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] tracking-[0.05em] uppercase text-[var(--color-accent-700)]">
                    <span className="font-medium">{g.slot}</span>
                    <span className="text-[rgba(32,31,29,0.25)]">·</span>
                    <span className="text-[rgba(32,31,29,0.55)]">
                      레이어 {idx + 1}
                    </span>
                  </div>
                </div>

                {/* 사진 업로드 아이콘 버튼 */}
                <button
                  type="button"
                  onClick={() => triggerUpload(g.id)}
                  title="사진 등록/교체"
                  className="w-6 h-6 flex items-center justify-center rounded-full text-[rgba(32,31,29,0.5)] hover:bg-[rgba(32,31,29,0.06)] hover:text-[#201f1d] cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>

                {/* 삭제 버튼 */}
                <button
                  type="button"
                  onClick={() => onRemoveGarment(g.id)}
                  title="가먼트 삭제"
                  className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-danger)] hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 반영도 (Fit) 조절 슬라이더 */}
              <div className="flex items-center gap-2 pt-1 border-t border-[rgba(32,31,29,0.08)]">
                <span className="text-[11.5px] text-[rgba(32,31,29,0.6)] whitespace-nowrap">
                  반영도
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={g.fit}
                  onChange={(e) => onUpdateFit(g.id, Number(e.target.value))}
                  className="flex-1 min-w-0 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[11.5px] text-[var(--color-accent-700)] font-semibold [font-feature-settings:'tnum'] w-8 text-right">
                  {g.fit}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 가먼트 슬롯 추가 버튼 그리드 */}
      <div className="grid grid-cols-4 gap-1.5 pt-1">
        {GARMENT_SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => onAddGarment(slot)}
            className="py-1.5 px-1 border border-dashed border-[rgba(32,31,29,0.3)] rounded-full bg-white text-[rgba(32,31,29,0.75)] font-[family-name:var(--font-body)] text-[11.5px] hover:bg-[rgba(32,31,29,0.05)] hover:border-[#b68235] hover:text-[var(--color-accent-700)] transition-all cursor-pointer flex items-center justify-center gap-0.5 truncate"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>{slot}</span>
          </button>
        ))}
      </div>

      <p className="m-0 text-[11.5px] leading-relaxed text-[rgba(32,31,29,0.5)]">
        의류는 레이어 순서대로 겹쳐 입히고, 액세서리(시계·목걸이·반지 등)는 신체 부위에 맞춰 정밀 배치합니다.
      </p>
    </section>
  );
}
