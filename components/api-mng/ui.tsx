"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Check, Copy, Mail, RefreshCw, X } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import {
  BUSINESS_USER_STATUS_LABELS,
  type BusinessUser,
  type BusinessUserStatus,
} from "@/types/business-user";

/** 화면용 이메일 형식 검사(서버도 같은 식으로 다시 본다) */
export const isEmailLike = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** STMX 브랜드 그라데이션 버튼 */
export const PRIMARY_BTN =
  "px-3.5 py-1.5 h-9 rounded-lg bg-gradient-to-r from-[#9747FF] to-[#FF0099] text-white text-[13px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50";
export const SECONDARY_BTN =
  "px-3 py-1.5 h-9 rounded-lg bg-white border border-[#E0E3E8] hover:bg-[#F4F5F7] text-[13px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50";
export const DANGER_BTN =
  "px-3 py-1.5 h-9 rounded-lg bg-white border border-[#FFD0D0] text-[#E52E2E] hover:bg-[#FFECEC] text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50";
export const INPUT =
  "px-3 py-2 rounded-lg border border-[#E0E3E8] text-[13px] font-normal text-[#101317] bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(151,71,255,0.25)]";
export const LABEL = "flex flex-col gap-1 text-[12px] font-semibold text-[#555A64]";

export function statusStyle(status: BusinessUserStatus) {
  if (status === "active") return "bg-[#E6F8ED] text-[#0E8A42] border-[#C3EED3]";
  if (status === "suspended") return "bg-[#FFF6E6] text-[#D97706] border-[#FFE6B3]";
  if (status === "rejected") return "bg-[#FFECEC] text-[#E52E2E] border-[#FFD0D0]";
  return "bg-[#EDE8FF] text-[#7A2CEE] border-[#D9CFFF]";
}

export function StatusBadge({ status }: { status: BusinessUserStatus }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border whitespace-nowrap ${statusStyle(status)}`}>
      {BUSINESS_USER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** 검증 결과 배지 — ok 면 초록, 아니면 빨강 */
export function CheckBadge({ ok, label, okLabel, failLabel }: { ok: boolean; label: string; okLabel?: string; failLabel?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold border ${
        ok ? "bg-[#E6F8ED] text-[#0E8A42] border-[#C3EED3]" : "bg-[#FFECEC] text-[#E52E2E] border-[#FFD0D0]"
      }`}
    >
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label} {ok ? okLabel ?? "통과" : failLabel ?? "실패"}
    </span>
  );
}

export function formatDateTime(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
  dismissable = true,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** false 면 바깥 클릭 · X 로 닫지 않는다(토큰 모달처럼 확인 버튼으로만) */
  dismissable?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-4xl" : "max-w-lg"} max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F1F3]">
          <h2 className="text-[16px] font-bold text-[#101317]">{title}</h2>
          {dismissable && (
            <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-[#F4F5F7] cursor-pointer" aria-label="닫기">
              <X className="w-4 h-4 text-[#717680]" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 vt-scroll">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[#F0F1F3] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={
        <span className="flex items-center gap-2 text-[#E52E2E]">
          <AlertTriangle className="w-4 h-4" />
          {title}
        </span>
      }
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={SECONDARY_BTN}>
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-3 py-1.5 h-9 rounded-lg bg-[#E52E2E] hover:bg-[#C42424] text-white text-[13px] font-bold cursor-pointer disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-[13px] text-[#323843] leading-relaxed">{message}</div>
    </Modal>
  );
}

/** 평문 토큰 — 이 모달을 닫으면 다시 볼 수 없다. 닫기 전에 담당자 이메일로 보낼 수 있다. */
export function TokenModal({ token, item, onClose }: { token: string; item: BusinessUser; onClose: () => void }) {
  const businessName = item.business_name;
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState(item.contact_email ?? "");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [mailError, setMailError] = useState<string | null>(null);

  const send = async () => {
    const address = to.trim();
    if (!isEmailLike(address)) return setMailError("이메일 주소를 확인하세요.");
    if (sentTo.includes(address) && !confirm(`${address} 로 이미 보냈습니다. 다시 보낼까요?`)) return;
    setSending(true);
    setMailError(null);
    try {
      const res = await authFetch(`/api/admin/business-users/${item.id}/send-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, to: address }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setSentTo((prev) => [...prev, address]);
    } catch (err) {
      setMailError(err instanceof Error ? err.message : "메일을 보내지 못했습니다.");
    } finally {
      setSending(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      setCopied(false);
      alert("복사하지 못했습니다. 직접 선택해 복사하세요.");
    }
  };
  return (
    <Modal
      title={`API 키 발급 — ${businessName}`}
      onClose={onClose}
      dismissable={false}
      footer={
        <button type="button" onClick={onClose} className={PRIMARY_BTN}>
          저장했습니다, 닫기
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="p-3 rounded-xl bg-[#FFF6E6] border border-[#FFE6B3] text-[#B45309] text-[13px] flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            이 키는 <strong>지금 한 번만</strong> 보입니다. 창을 닫으면 다시 볼 수 없고, 잃어버리면 재발급해야 합니다.
          </span>
        </div>
        <div className="flex items-stretch gap-2">
          <code className="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-[#101317] text-[#F8F9FA] text-[13px] font-mono break-all select-all">
            {token}
          </code>
          <button type="button" onClick={copy} className={SECONDARY_BTN + " h-auto"}>
            {copied ? <Check className="w-3.5 h-3.5 text-[#0E8A42]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
        <p className="text-[12px] text-[#717680]">
          요청 헤더: <code>Authorization: Bearer {token.slice(0, 14)}…</code>
        </p>

        <div className="pt-3 border-t border-[#F0F1F3] flex flex-col gap-2">
          <span className="text-[12px] font-semibold text-[#555A64]">담당자에게 메일로 보내기</span>
          <div className="flex items-stretch gap-2">
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="담당자 이메일"
              className={INPUT + " flex-1 min-w-0"}
            />
            <button type="button" onClick={send} disabled={sending || !to.trim()} className={SECONDARY_BTN + " h-auto"}>
              {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              보내기
            </button>
          </div>
          {sentTo.length > 0 && (
            <p className="text-[12px] text-[#0E8A42] flex items-center gap-1">
              <Check className="w-3 h-3" />
              {sentTo.join(", ")} 로 보냈습니다.
            </p>
          )}
          {mailError && <p className="text-[12px] text-[#E52E2E]">{mailError}</p>}
          <p className="text-[12px] text-[#8E96A2]">키가 메일 본문에 그대로 실립니다. 받는 주소를 꼭 확인하세요.</p>
        </div>
      </div>
    </Modal>
  );
}
