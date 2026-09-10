"use client";

import { useEffect } from "react";
import { ArrowDown, Check, Link2, Play, X } from "lucide-react";
import { PRESET_STATUS_LABEL } from "@/lib/playground/presets";
import type { CallFlow, FlowStep } from "@/lib/playground/flows";

/**
 * API 호출 플로우 뷰어.
 *
 * 프리셋은 엔드포인트를 하나씩만 보여준다. 이 API 들을 두드려 보는 목적은 결국
 * 상품 링크를 뽑는 것이고, 그러려면 **어떤 순서로 무엇을 무엇에 넘기는지**가
 * 필요하다. 단계마다 얻는 것(`produces`)과 다음으로 넘기는 것(`feeds`)을 같이
 * 세워 두고, 각 단계를 그대로 편집기로 열 수 있게 한다.
 */

interface CallFlowModalProps {
  flow: CallFlow | null;
  onClose: () => void;
  /** 그 단계의 프리셋을 요청 편집기로 올린다. */
  onOpenStep: (presetId: string) => void;
}

export default function CallFlowModal({
  flow,
  onClose,
  onOpenStep,
}: CallFlowModalProps) {
  useEffect(() => {
    if (!flow) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flow, onClose]);

  if (!flow) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${flow.name} 호출 플로우`}
        className="pg-app w-[980px] max-w-full max-h-[88vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[var(--pg-line)]"
      >
        <header className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-[var(--pg-line)] bg-[var(--color-panel)]">
          <Link2 className="w-4 h-4 text-[var(--color-accent-700)]" />
          <h3 className="m-0 text-[25.2px] font-semibold text-black">
            API CALL FLOW · {flow.name}
          </h3>
          <span className="text-[19.8px] text-black">→ {flow.goal}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기 (Esc)"
            className="ml-auto w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4 text-[#201f1d]" />
          </button>
        </header>

        <p className="m-0 px-4 py-2 text-[20.7px] leading-relaxed text-black bg-[rgba(182,130,53,0.09)] border-b border-[var(--pg-line)]">
          {flow.summary}
        </p>

        <div className="flex-1 min-h-0 overflow-auto vt-scroll p-4">
          <ol className="list-none m-0 p-0 flex flex-col">
            {flow.steps.map((step, index) => (
              <li key={step.id} className="flex flex-col">
                <Step step={step} index={index + 1} onOpenStep={onOpenStep} />
                {index < flow.steps.length - 1 && (
                  <div className="flex items-center gap-2 pl-[18px] py-1">
                    <ArrowDown className="w-4 h-4 text-black/30" />
                    {step.feeds && (
                      <span className="text-[18.9px] text-black/60 pg-mono">
                        {step.feeds}
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

const DOT: Record<string, string> = {
  ok: "pg-dot-ok",
  params: "pg-dot-params",
  scope: "pg-dot-scope",
  data: "pg-dot-data",
  unknown: "pg-dot-unknown",
};

function Step({
  step,
  index,
  onOpenStep,
}: {
  step: FlowStep;
  index: number;
  onOpenStep: (presetId: string) => void;
}) {
  // 마지막 조립 단계는 호출이 아니라 앞 결과를 합치는 자리 — 눈에 띄게 구분한다.
  const isDerive = step.kind === "derive";

  return (
    <div
      className={`rounded-md border p-3 flex flex-col gap-1.5 ${
        isDerive
          ? "border-[var(--color-accent)] bg-[rgba(182,130,53,0.07)]"
          : "border-[var(--pg-line)] bg-[var(--color-panel)]"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-7 h-7 flex-none rounded-full bg-black/10 flex items-center justify-center text-[19.8px] font-bold text-black">
          {index}
        </span>
        <span className="text-[22.5px] font-semibold text-black">{step.title}</span>

        {step.optional && <span className="text-[18.9px] text-black/55">선택</span>}

        {step.status && (
          <span className="flex items-center gap-1 text-[18.9px] text-black/60">
            <span className={`pg-dot ${DOT[step.status]}`} />
            {PRESET_STATUS_LABEL[step.status]}
          </span>
        )}

        {step.presetId && (
          <button
            type="button"
            onClick={() => onOpenStep(step.presetId as string)}
            title="이 단계를 요청 편집기로 올립니다"
            className="ml-auto px-2.5 py-1 text-[19.8px] rounded btn btn-secondary flex items-center gap-1"
          >
            <Play className="w-3.5 h-3.5 text-[var(--color-accent-700)]" />
            편집기로 열기
          </button>
        )}
      </div>

      {step.method && step.path && (
        <div className="flex items-center gap-2 pl-9">
          <span className={`pg-method pg-method-${step.method}`}>{step.method}</span>
          <code className="text-[19.8px] text-black break-all">{step.path}</code>
        </div>
      )}

      <div className="pl-9 flex flex-col gap-1">
        <p className="m-0 text-[20.7px] text-black flex items-start gap-1.5">
          <Check className="w-3.5 h-3.5 mt-1 flex-none text-[var(--color-accent-700)]" />
          <span>
            <strong>얻는 것</strong> — {step.produces}
          </span>
        </p>

        {step.sample && <code className="pg-code text-[18.9px]">{step.sample}</code>}

        {step.note && (
          <p className="m-0 text-[19.8px] leading-relaxed text-black/70">{step.note}</p>
        )}
      </div>
    </div>
  );
}
