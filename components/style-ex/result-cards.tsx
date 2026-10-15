/* style-ex 결과 카드 — /style-ex 와 /product-style 이 같이 쓴다.
   StyleIdCard: 스타일 아이디 · 축별 글자와 출처 · LLM 근거 / productRows: 상품 정보 칸(과 PDF)의 행 */

import type { CatalogKind, CatalogProduct } from "@/lib/tryon/product-catalog";

export const AXIS_ORDER = ["EI", "TC", "SR", "DM"] as const;
export type AxisKey = (typeof AXIS_ORDER)[number];

/** 축별 글자의 출처 */
export type Source = "ENGINE" | "ENGINE_NEUTRAL_FIXED" | "ENGINE_DIRECTION" | "RULE_DEFAULT" | "LLM" | "LLM_FALLBACK";

export interface AxisResult {
  letter: string | null;
  source: Source | null;
  label: string | null; // 엔진 점수 (예: EI4)
  detail: string | null;
}

/** 서버의 styleId — 대표 의복의 네 글자 조합 */
export interface StyleIdResult {
  ok: boolean;
  style_id?: string;
  style?: { name: string; subTitle: string; definition: string } | null;
  target_id?: string;
  axes?: Record<AxisKey, AxisResult>;
  error?: string;
}

/** 서버의 LLM 판정 — 축별 근거를 보여 줄 때 쓴다 */
export interface LlmJudgement {
  ok: boolean;
  axes?: Record<AxisKey, { letter: string; strength: Strength; evidence: string[]; rationale: string }> & {
    summary: string;
  };
  error?: string;
}

export type Strength = "strong" | "moderate" | "weak";
export const STRENGTH_LABEL: Record<Strength, string> = { strong: "강", moderate: "중", weak: "약" };

export const SOURCE_LABEL: Record<Source, string> = {
  ENGINE: "엔진",
  ENGINE_NEUTRAL_FIXED: "엔진 · 중립 고정",
  ENGINE_DIRECTION: "엔진 방향",
  RULE_DEFAULT: "규칙 기본값",
  LLM: "LLM",
  LLM_FALLBACK: "LLM 대체",
};

export interface Summary {
  styleId: StyleIdResult | null;
  judgement: LlmJudgement | null;
}

export const KIND_LABEL: Record<CatalogKind, string> = { top: "상의", bottom: "하의", etc: "기타" };

/** 상품 정보 — 화면의 상품 정보 칸과 PDF 가 같이 쓴다. 사진은 뺀다. */
export function productRows(product: CatalogProduct): [string, string][] {
  return [
    ["브랜드", product.brandName ?? "브랜드 미상"],
    ["상품명", product.name],
    ["분류", `${KIND_LABEL[product.kind] ?? product.kind} · ${product.path}`],
    ["상품 ID", product.id],
    ["카테고리 ID", product.categoryId],
    ["판매 페이지", product.catalogUrl],
  ];
}

/** 스타일 아이디 요약 — 결과 JSON 위에 보인다. 축마다 글자의 출처(엔진 · LLM)를 함께 표시한다. */
export function StyleIdCard({ summary }: { summary: Summary }) {
  const { styleId, judgement } = summary;
  if (!styleId) return null;
  const llm = judgement?.ok ? judgement.axes : undefined;

  return (
    <div className="p-3 border-b border-[var(--color-divider)] text-sm space-y-2">
      {styleId.ok ? (
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-[0.2em] text-[var(--color-accent-700)]">
            {styleId.style_id}
          </span>
          {styleId.style && (
            <span>
              <span className="font-semibold">{styleId.style.name}</span>
              <span className="ml-2 text-black/60">{styleId.style.subTitle}</span>
            </span>
          )}
          {styleId.target_id && <span className="text-xs text-black/50">기준: {styleId.target_id}</span>}
        </div>
      ) : (
        <p className="text-[var(--color-danger)]">스타일 아이디를 정하지 못했습니다: {styleId.error}</p>
      )}
      {styleId.ok && styleId.style && <p className="text-black/80">{styleId.style.definition}</p>}

      {styleId.axes && (
        <ul className="space-y-1.5">
          {AXIS_ORDER.map((key) => {
            const a = styleId.axes![key];
            const l = llm?.[key];
            const usesLlm = a.source === "LLM" || a.source === "LLM_FALLBACK";
            return (
              <li key={key} className="flex gap-2">
                <span className="flex-none w-10 font-[family-name:var(--font-mono)]">
                  {key} <b>{a.letter ?? "?"}</b>
                </span>
                <span className="flex-none w-32 text-xs pt-0.5">
                  {a.source ? (
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        usesLlm ? "bg-black/5 text-black/70" : "bg-[rgba(182,130,53,0.16)] text-[var(--color-accent-800)]"
                      }`}
                    >
                      {SOURCE_LABEL[a.source]}
                      {a.label && ` ${a.label}`}
                    </span>
                  ) : (
                    <span className="text-[var(--color-danger)]">판정 없음</span>
                  )}
                </span>
                <span className="text-black/80">
                  {usesLlm && l ? (
                    <>
                      {l.rationale}
                      <span className="ml-1 text-xs text-black/50">({STRENGTH_LABEL[l.strength]})</span>
                    </>
                  ) : null}
                  {a.detail && <span className="block text-xs text-black/50">{a.detail}</span>}
                  {usesLlm && l && l.evidence.length > 0 && (
                    <span className="block text-xs text-black/50">{l.evidence.join(" · ")}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {judgement && !judgement.ok && (
        <p className="text-xs text-[var(--color-danger)]">LLM 판정 실패: {judgement.error}</p>
      )}
    </div>
  );
}
