"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, ExternalLink, KeyRound, RefreshCw, Save, Trash2 } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { formatBizNo, isBizNoFormat, isValidBizNo, normalizeBizNo } from "@/lib/business-user/biz-no";
import {
  BUSINESS_USER_STATUSES,
  BUSINESS_USER_STATUS_LABELS,
  type BusinessUser,
  type BusinessUserStatus,
} from "@/types/business-user";
import { ApiCallLogList } from "./ApiCallLogList";
import {
  CheckBadge,
  ConfirmDialog,
  DANGER_BTN,
  INPUT,
  LABEL,
  Modal,
  PRIMARY_BTN,
  SECONDARY_BTN,
  StatusBadge,
  formatDateTime,
  isEmailLike,
} from "./ui";

type Danger = "rotate" | "revoke" | "delete" | null;

/** 상세 / 수정 — 등록증 미리보기(signed URL), 필드 수정, 상태 변경, 재발급 · 폐기 · 삭제 */
export function BusinessDetailModal({
  id,
  onClose,
  onChanged,
  onDeleted,
  onToken,
}: {
  id: string;
  onClose: () => void;
  onChanged: (item: BusinessUser) => void;
  onDeleted: (id: string) => void;
  onToken: (token: string, item: BusinessUser) => void;
}) {
  const [item, setItem] = useState<BusinessUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<{ url: string; kind: "pdf" | "image" } | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<BusinessUserStatus>("active");
  const [reason, setReason] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [danger, setDanger] = useState<Danger>(null);

  const fill = (it: BusinessUser) => {
    setItem(it);
    setName(it.business_name);
    setNumber(formatBizNo(it.business_number));
    setEmail(it.contact_email ?? "");
    setStatus(it.status);
    setReason(it.status_reason ?? "");
    setMemo(it.memo ?? "");
  };

  const loadDoc = useCallback(async () => {
    setDocError(null);
    try {
      const res = await authFetch(`/api/admin/business-users/${id}/document`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setDoc({ url: data.url, kind: data.kind });
    } catch (err) {
      setDoc(null);
      setDocError(err instanceof Error ? err.message : "등록증을 불러오지 못했습니다.");
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`/api/admin/business-users/${id}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
        fill(data.item);
        if (data.item.doc_path) loadDoc();
      } catch (err) {
        setError(err instanceof Error ? err.message : "불러오지 못했습니다.");
      }
    })();
  }, [id, loadDoc]);

  const call = async (path: string, init: RequestInit) => {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(path, init);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const data = await call(`/api/admin/business-users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: name,
        business_number: normalizeBizNo(number),
        contact_email: email,
        status,
        status_reason: reason,
        memo,
      }),
    });
    if (data?.item) {
      fill(data.item);
      onChanged(data.item);
    }
  };

  const runDanger = async () => {
    if (!item || !danger) return;
    if (danger === "delete") {
      const data = await call(`/api/admin/business-users/${id}`, { method: "DELETE" });
      setDanger(null);
      if (data) onDeleted(id);
      return;
    }
    const data = await call(`/api/admin/business-users/${id}/${danger === "rotate" ? "rotate-token" : "revoke-token"}`, {
      method: "POST",
    });
    setDanger(null);
    if (data?.item) {
      fill(data.item);
      onChanged(data.item);
    }
    if (data?.token) onToken(data.token, data.item);
  };

  /** 토큰이 없을 때의 첫 발급은 확인 없이 바로 */
  const issueFirst = async () => {
    const data = await call(`/api/admin/business-users/${id}/rotate-token`, { method: "POST" });
    if (data?.item) {
      fill(data.item);
      onChanged(data.item);
    }
    if (data?.token) onToken(data.token, data.item);
  };

  const digits = normalizeBizNo(number);
  const dirty =
    item &&
    (name.trim() !== item.business_name ||
      digits !== item.business_number ||
      (email.trim() || null) !== (item.contact_email ?? null) ||
      status !== item.status ||
      (reason.trim() || null) !== (item.status_reason ?? null) ||
      (memo.trim() || null) !== (item.memo ?? null));
  const hasToken = Boolean(item?.token_prefix);

  return (
    <>
      <Modal
        title={item ? item.business_name : "업체 상세"}
        onClose={onClose}
        wide
        footer={
          item && (
            <>
              <button type="button" onClick={() => setDanger("delete")} disabled={busy} className={DANGER_BTN + " mr-auto"}>
                <Trash2 className="w-3.5 h-3.5" />
                삭제
              </button>
              {hasToken && (
                <button type="button" onClick={() => setDanger("revoke")} disabled={busy} className={DANGER_BTN}>
                  <Ban className="w-3.5 h-3.5" />
                  토큰 폐기
                </button>
              )}
              <button
                type="button"
                onClick={() => (hasToken ? setDanger("rotate") : issueFirst())}
                disabled={busy || item.status !== "active" || Boolean(dirty)}
                title={item.status !== "active" ? "활성 업체에만 발급합니다." : dirty ? "먼저 변경 사항을 저장하세요." : undefined}
                className={hasToken ? DANGER_BTN : SECONDARY_BTN}
              >
                <KeyRound className="w-3.5 h-3.5" />
                {hasToken ? "재발급" : "토큰 발급"}
              </button>
              <button type="button" onClick={save} disabled={busy || !dirty || Boolean(email.trim() && !isEmailLike(email))} className={PRIMARY_BTN}>
                {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                저장
              </button>
            </>
          )
        }
      >
        {!item ? (
          error ? (
            <div className="p-3 rounded-lg bg-[#FFECEC] border border-[#FFD0D0] text-[#C42424] text-[13px]">{error}</div>
          ) : (
            <div className="h-60 rounded-xl bg-[#F4F5F7] animate-pulse" />
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#555A64]">사업자등록증</span>
                {item.doc_path && (
                  <div className="flex items-center gap-2">
                    {doc && (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-[12px] text-[#7A2CEE] flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />새 창
                      </a>
                    )}
                    <button type="button" onClick={loadDoc} className="text-[12px] text-[#717680] flex items-center gap-1 cursor-pointer">
                      <RefreshCw className="w-3 h-3" />
                      링크 갱신(60초 만료)
                    </button>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-[#EBECEF] overflow-hidden bg-[#F8F9FA] h-[420px] flex items-center justify-center">
                {!item.doc_path ? (
                  <span className="text-[13px] text-[#8E96A2]">등록증 없음</span>
                ) : docError ? (
                  <span className="text-[13px] text-[#E52E2E] px-4 text-center">{docError}</span>
                ) : !doc ? (
                  <RefreshCw className="w-5 h-5 text-[#8E96A2] animate-spin" />
                ) : doc.kind === "pdf" ? (
                  <iframe src={doc.url} title="등록증" className="w-full h-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.url} alt="등록증" className="w-full h-full object-contain" />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {error && <div className="p-3 rounded-lg bg-[#FFECEC] border border-[#FFD0D0] text-[#C42424] text-[13px]">{error}</div>}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                <CheckBadge ok={isBizNoFormat(digits)} label="형식" />
                <CheckBadge ok={isBizNoFormat(digits) && isValidBizNo(digits)} label="검증식" />
              </div>

              <div className="rounded-xl bg-[#F8F9FA] border border-[#EBECEF] p-3 text-[12px] text-[#555A64] grid grid-cols-2 gap-y-1 gap-x-3">
                <span>토큰</span>
                <code className="font-mono text-[#101317]">{item.token_prefix ? `${item.token_prefix}…` : "없음"}</code>
                <span>발급</span>
                <span>{formatDateTime(item.token_issued_at)}</span>
                <span>최근 사용</span>
                <span>{formatDateTime(item.token_last_used_at)}</span>
                <span>등록</span>
                <span>{formatDateTime(item.created_at)}</span>
              </div>

              <label className={LABEL}>
                상호(회사명)
                <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
              </label>
              <label className={LABEL}>
                사업자등록번호
                <input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  onBlur={() => setNumber((v) => formatBizNo(v))}
                  inputMode="numeric"
                  className={INPUT + " font-mono"}
                />
              </label>
              <label className={LABEL}>
                <span>
                  담당자 이메일
                  {status === "active" && <span className="text-[#E52E2E]"> *</span>}
                </span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="API 키 메일 수신 주소" className={INPUT} />
                {email.trim() && !isEmailLike(email) && <span className="text-[12px] font-normal text-[#E52E2E]">이메일 형식을 확인하세요.</span>}
                {status === "active" && !email.trim() && (
                  <span className="text-[12px] font-normal text-[#E52E2E]">활성 업체는 담당자 이메일이 필요합니다.</span>
                )}
              </label>
              <label className={LABEL}>
                상태
                <select value={status} onChange={(e) => setStatus(e.target.value as BusinessUserStatus)} className={INPUT}>
                  {BUSINESS_USER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {BUSINESS_USER_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                {status !== item.status && (status === "pending_review" || status === "rejected") && hasToken && (
                  <span className="text-[12px] font-normal text-[#E52E2E]">저장하면 토큰이 폐기됩니다.</span>
                )}
                {status !== item.status && status === "suspended" && (
                  <span className="text-[12px] font-normal text-[#D97706]">정지하면 이 업체의 API 호출이 403 으로 막힙니다.</span>
                )}
              </label>
              <label className={LABEL}>
                상태 사유
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={INPUT} />
              </label>
              <label className={LABEL}>
                메모
                <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className={INPUT} />
              </label>
            </div>
            <div className="md:col-span-2">
              <ApiCallLogList businessUserId={item.id} />
            </div>
          </div>
        )}
      </Modal>

      {danger && item && (
        <ConfirmDialog
          title={danger === "rotate" ? "API 키 재발급" : danger === "revoke" ? "API 키 폐기" : "업체 삭제"}
          confirmLabel={danger === "rotate" ? "재발급" : danger === "revoke" ? "폐기" : "삭제"}
          busy={busy}
          onCancel={() => setDanger(null)}
          onConfirm={runDanger}
          message={
            danger === "rotate" ? (
              <>
                <strong>{item.business_name}</strong> 의 기존 키(<code>{item.token_prefix}…</code>)는 <strong>즉시 무효</strong>가 되고 새 키가
                발급됩니다. 업체가 새 키로 바꾸기 전까지 API 호출이 실패합니다.
              </>
            ) : danger === "revoke" ? (
              <>
                <strong>{item.business_name}</strong> 의 키(<code>{item.token_prefix}…</code>)를 폐기합니다. 이후 호출은 401 이 됩니다.
              </>
            ) : (
              <>
                <strong>{item.business_name}</strong> ({formatBizNo(item.business_number)}) 를 삭제하고 키를 폐기합니다. 등록증 원본은
                보관됩니다. 삭제 후 같은 번호로 다시 등록할 수 있습니다.
              </>
            )
          }
        />
      )}
    </>
  );

}
