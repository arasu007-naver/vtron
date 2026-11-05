"use client";

import { useState } from "react";
import { Eye, ImageOff } from "lucide-react";
import { FeatureTreeView } from "@/components/style-ex/FeatureTreeView";
import { ObservationModal } from "@/components/style-ex/ObservationModal";

/**
 * 대량 Style ID 작업의 상품 카드 — /admin/api-log 와 공개 페이지 /test-demo 가 같이 쓴다.
 *   왼쪽  상품 사진(대표 의복 영역 box) · 상품 정보
 *   오른쪽 Style ID · 축 글자 1줄 + 관찰 요소 트리
 */

export interface Axis {
  letter: string | null;
  letters: string[];
  source: string | null;
}

/**
 * 대표 의복 영역 (api_call_items.prime_region) — box 는 사진 전체를 0–1000 으로 본 좌표, box_px 는 원본 픽셀.
 *   { box: { xmin, ymin, xmax, ymax }, box_px: { x, y, width, height }, image: { width, height }, category, model }
 */
export interface PrimeRegion {
  box?: { xmin: number; ymin: number; xmax: number; ymax: number } | null;
  box_px?: { x: number; y: number; width: number; height: number } | null;
  image?: { width: number; height: number } | null;
  category?: string | null;
  model?: string | null;
}

export interface JobItem {
  seq: number;
  ref: string | null;
  product: { name?: string; whole_category_name?: string; category?: string } & Record<string, unknown>;
  image_src: string | null;
  status: "prime" | "queued" | "running" | "done" | "failed";
  prime_group: "found" | "not_found" | "no_product" | null;
  style_id: string | null;
  result: {
    style?: { name: string | null; sub_title: string | null } | null;
    candidates?: unknown[];
    axes?: Record<string, Axis>;
    vision_model?: string | null;
    observe_prompt_version?: number | null;
  } | null;
  error: string | null;
  error_detail: string | null;
  elapsed_ms: number | null;
  observation: unknown;
  /** 판정 함수 V2 기록 (product_style.scoring 과 같은 모양) */
  scoring: unknown;
  prime_target: { category: string | null; confidence: number | null } | null;
  prime_region?: PrimeRegion | null;
}

export const ITEM_STATUS: Record<JobItem["status"], string> = {
  prime: "대표 의복 대기",
  queued: "관찰 대기",
  running: "관찰 중",
  done: "완료",
  failed: "실패",
};

const clamp = (n: number) => Math.min(Math.max(n, 0), 1000);

/** 0–1000 box → 사진 위 % 위치. 비었거나 뒤집힌 box 는 그리지 않는다 */
function boxStyle(region: PrimeRegion | null | undefined) {
  const b = region?.box;
  if (!b || ![b.xmin, b.ymin, b.xmax, b.ymax].every(Number.isFinite)) return null;
  const [x0, x1] = [clamp(Math.min(b.xmin, b.xmax)), clamp(Math.max(b.xmin, b.xmax))];
  const [y0, y1] = [clamp(Math.min(b.ymin, b.ymax)), clamp(Math.max(b.ymin, b.ymax))];
  if (x1 - x0 < 1 || y1 - y0 < 1) return null;
  return { left: `${x0 / 10}%`, top: `${y0 / 10}%`, width: `${(x1 - x0) / 10}%`, height: `${(y1 - y0) / 10}%` };
}

/**
 * 상품 사진 + 대표 의복 영역 box. 사진은 정사각 칸 안에 object-contain 으로 놓이므로,
 * box 를 사진에 맞추려고 사진의 비율대로 감싼 칸(relative) 위에 % 로 겹친다.
 */
export function ProductImage({ src, alt, region }: { src: string | null; alt: string; region?: PrimeRegion | null }) {
  const [broken, setBroken] = useState(false);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const size = natural ?? (region?.image?.width && region.image.height ? { w: region.image.width, h: region.image.height } : null);
  const box = boxStyle(region);
  const label = region?.category ?? null;

  if (!src || broken) {
    return (
      <div className="aspect-square flex flex-col items-center justify-center gap-1 text-[#8E96A2] text-[12px]">
        <ImageOff className="w-6 h-6" />
        사진 없음
      </div>
    );
  }
  const wide = !size || size.w >= size.h;
  return (
    <div className="aspect-square flex items-center justify-center overflow-hidden">
      <div
        className="relative"
        style={size ? { aspectRatio: `${size.w} / ${size.h}`, [wide ? "width" : "height"]: "100%" } : { width: "100%", height: "100%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          onError={() => setBroken(true)}
        />
        {/* 사진 비율을 모르면(아직 안 읽힘) box 가 어긋나므로 그리지 않는다 */}
        {box && size && (
          <div
            className="absolute border-2 border-[#9747FF] rounded-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.8)] pointer-events-none"
            style={box}
            title={region?.model ? `대표 의복 영역 · ${region.model}` : "대표 의복 영역"}
          >
            {label && (
              <span className="absolute -top-[1px] left-[-2px] -translate-y-full px-1.5 py-[1px] rounded-t-[3px] bg-[#9747FF] text-white text-[10.5px] font-semibold whitespace-nowrap">
                {label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 상품 정보 표 — 상품 행(product)의 값 중 글자 · 숫자로 보일 수 있는 것만 */
function ProductFields({ product }: { product: JobItem["product"] }) {
  const rows = Object.entries(product).filter(
    ([, v]) => (typeof v === "string" && v.trim() !== "") || typeof v === "number" || typeof v === "boolean"
  );
  if (!rows.length) return null;
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 mt-2 text-[12px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[#8E96A2] font-mono">{k}</dt>
          <dd className="text-[#323843] break-all select-text">
            {typeof v === "string" && /^https?:\/\//.test(v) ? (
              <a href={v} target="_blank" rel="noreferrer" className="text-[#7A2CEE] hover:underline">
                {v}
              </a>
            ) : (
              String(v)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * 상품 하나 — 왼쪽 사진 | 오른쪽 Style ID · 축 글자 1줄 + 관찰 요소 트리.
 * details 면 왼쪽 아래에 상품 정보 전체를 표로 보인다(/test-demo).
 */
export function ItemCard({ it, details = false }: { it: JobItem; details?: boolean }) {
  const [judgementOpen, setJudgementOpen] = useState(false);
  const axes = it.result?.axes ?? {};
  // /product-style 의 판정 결과 모달과 같다 — 판정 결과 · 판정 기록(scoring)을 JSON 트리로
  const judged = {
    style_id: it.style_id,
    style: it.result?.style ?? null,
    candidates: it.result?.candidates ?? [],
    axes: it.result?.axes ?? null,
    scoring: it.scoring ?? null,
    prime_target: it.prime_target,
    prime_region: it.prime_region ?? null,
    vision_model: it.result?.vision_model ?? null,
    observe_prompt_version: it.result?.observe_prompt_version ?? null,
    elapsed_ms: it.elapsed_ms,
    ...(it.error && { error: it.error, error_detail: it.error_detail }),
  };
  const category = it.product.whole_category_name ?? it.product.category;
  return (
    <li className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs grid grid-cols-2 overflow-hidden">
      <div className="bg-[#F4F5F7] flex flex-col">
        <ProductImage src={it.image_src} alt={it.product.name ?? `상품 ${it.seq + 1}`} region={it.prime_region} />
        <div className={`px-3 py-2 bg-white border-t border-[#F0F1F3] text-[12px] ${details ? "flex-1" : ""}`}>
          <div className="font-semibold text-[#101317] truncate" title={it.product.name}>
            <span className="text-[#8E96A2] font-normal mr-1">#{it.seq + 1}</span>
            {it.product.name ?? "(상품명 없음)"}
          </div>
          <div className="text-[#8E96A2] truncate">
            {[it.ref && `ref ${it.ref}`, category].filter(Boolean).join(" · ") || "—"}
          </div>
          {details && <ProductFields product={it.product} />}
        </div>
      </div>

      <div className="min-w-0 flex flex-col border-l border-[#F0F1F3]">
        <div className="flex-none flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 border-b border-[#F0F1F3]">
          {it.style_id ? (
            <>
              <span className="font-mono text-[16px] font-bold tracking-wider text-[#101317]">{it.style_id}</span>
              <JudgementButton onClick={() => setJudgementOpen(true)} />
              {it.result?.style?.name && <span className="text-[13px] text-[#555A64]">{it.result.style.name}</span>}
              <span className="flex items-center gap-1">
                {Object.entries(axes).map(([k, a]) => (
                  <span
                    key={k}
                    title={a.source ? `${k} · ${a.source}` : k}
                    className={`px-1.5 rounded border text-[11px] font-mono ${
                      a.letters.length > 1 ? "bg-[#FFF6E6] text-[#D97706] border-[#FFE6B3]" : "bg-[#F5F0FF] text-[#7A2CEE] border-[#E4D8FF]"
                    }`}
                  >
                    {k} {a.letters.length > 1 ? a.letters.join("/") : a.letter ?? "?"}
                  </span>
                ))}
              </span>
            </>
          ) : (
            <>
              <span className={`text-[13px] font-semibold ${it.status === "failed" ? "text-[#E52E2E]" : "text-[#7A2CEE]"}`}>
                {ITEM_STATUS[it.status]}
              </span>
              {it.status === "failed" && <JudgementButton onClick={() => setJudgementOpen(true)} />}
            </>
          )}
          <span className="ml-auto text-[11px] text-[#8E96A2] tabular-nums">
            {it.prime_target?.category && `${it.prime_target.category} · `}
            {it.elapsed_ms != null && `${(it.elapsed_ms / 1000).toFixed(1)}s`}
          </span>
          {it.error && (
            <p className="basis-full text-[12px] text-[#E52E2E] break-words" title={it.error_detail ?? undefined}>
              {it.error}
            </p>
          )}
        </div>
        {/* /product-style 의 Features 와 같다 — 관찰 결과(observation)의 envelope 를 vision feature 트리로.
            카드 높이는 왼쪽(사진 · 상품 정보)이 정하고, 트리는 판정 결과 줄 아래를 남김없이 채운 채 그 안에서 스크롤한다 */}
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 overflow-y-auto vt-scroll">
            <FeatureTreeView
              envelope={(it.observation as { envelope?: unknown } | null)?.envelope ?? null}
              emptyText={it.observation ? "이 결과에는 관찰 envelope 가 없습니다 (관찰 실패 등)." : "관찰 결과가 아직 없습니다."}
            />
          </div>
        </div>
      </div>
      <ObservationModal
        open={judgementOpen}
        onClose={() => setJudgementOpen(false)}
        title={`판정 결과 — ${it.product.name ?? `#${it.seq + 1}`}`}
        observation={judged}
        defaultView="tree"
      />
    </li>
  );
}

function JudgementButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="판정 결과 JSON 트리 보기"
      aria-label="판정 결과 JSON 트리 보기"
      className="w-7 h-7 -ml-1 flex items-center justify-center rounded-full text-[#717680] hover:text-[#101317] hover:bg-[#F4F5F7] cursor-pointer"
    >
      <Eye className="w-4 h-4" />
    </button>
  );
}
