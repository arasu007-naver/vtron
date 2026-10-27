"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileUp, RefreshCw, ScanText } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { formatBizNo, isBizNoFormat, isValidBizNo, normalizeBizNo } from "@/lib/business-user/biz-no";
import {
  BUSINESS_USER_STATUS_LABELS,
  type BusinessUser,
  type BusinessUserStatus,
  type ExtractResponse,
} from "@/types/business-user";
import { CheckBadge, INPUT, LABEL, Modal, PRIMARY_BTN, SECONDARY_BTN, isEmailLike } from "./ui";

const ACCEPT = "image/jpeg,image/png,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;
const CREATE_STATUSES: BusinessUserStatus[] = ["active", "pending_review", "rejected"];

/**
 * 신규 등록 — 등록증 업로드 → 추출 결과 확인 · 수정(체크섬 · 중복 배지) → 확정.
 * 활성으로 확정하면 서버가 토큰을 발급해 onCreated 로 평문을 넘긴다.
 */
export function NewBusinessModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (item: BusinessUser, token: string | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [status, setStatus] = useState<BusinessUserStatus>("active");
  const [reason, setReason] = useState("");
  const [memo, setMemo] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // 미리보기 URL 은 파일을 고를 때 만들고, 바꾸거나 모달을 닫을 때 놓아준다
  const previewRef = useRef<string | null>(null);
  const setPreview = (f: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = f ? URL.createObjectURL(f) : null;
    setPreviewUrl(previewRef.current);
  };
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const pickFile = (f: File | null) => {
    setError(null);
    setResult(null);
    if (f && !ACCEPT.split(",").includes(f.type)) return setError("JPG · PNG · PDF 만 올릴 수 있습니다.");
    if (f && f.size > MAX_BYTES) return setError("10MB 이하 파일만 올릴 수 있습니다.");
    setFile(f);
    setPreview(f);
  };

  const extract = async () => {
    if (!file) return;
    setExtracting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await authFetch("/api/admin/business-users/extract", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      const r = data as ExtractResponse;
      setResult(r);
      setName(r.extraction.business_name ?? "");
      setNumber(formatBizNo(r.extraction.business_number ?? ""));
      setStatus(r.suggested_status);
      setReason(r.reasons.join(" / "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "추출에 실패했습니다.");
    } finally {
      setExtracting(false);
    }
  };

  const digits = normalizeBizNo(number);
  const formatOk = isBizNoFormat(digits);
  const checksumOk = formatOk && isValidBizNo(digits);
  /** 서버 중복 결과는 추출한 번호에 대한 것 — 번호를 고치면 확정 때 다시 본다 */
  const duplicateKnown = result && normalizeBizNo(result.extraction.business_number ?? "") === digits;
  const duplicate = Boolean(duplicateKnown && result?.checks.duplicate);

  const blocker = useMemo(() => {
    if (!name.trim()) return "상호를 입력하세요.";
    if (!formatOk) return "사업자등록번호는 숫자 10자리여야 합니다.";
    if (status === "active" && !email.trim()) return "API 키를 보낼 담당자 이메일을 입력하세요.";
    if (email.trim() && !isEmailLike(email)) return "담당자 이메일 형식을 확인하세요.";
    if (duplicate) return "같은 번호로 등록된 업체가 이미 있습니다.";
    if (status === "active" && !checksumOk) return "검증식을 통과하지 못한 번호는 활성으로 저장할 수 없습니다.";
    return null;
  }, [name, formatOk, email, duplicate, status, checksumOk]);

  const confirm = async () => {
    if (!result || blocker) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch("/api/admin/business-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: name,
          business_number: digits,
          contact_email: email,
          status,
          status_reason: status === "active" ? null : reason,
          doc_path: result.doc_path,
          ocr_raw: result.ocr_raw,
          memo,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      onCreated(data.item, data.token ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="신규 업체 등록"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={SECONDARY_BTN}>
            취소
          </button>
          {result ? (
            <button type="button" onClick={confirm} disabled={saving || Boolean(blocker)} className={PRIMARY_BTN} title={blocker ?? undefined}>
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {status === "active" ? "확정하고 API 키 발급" : `${BUSINESS_USER_STATUS_LABELS[status]}(으)로 저장`}
            </button>
          ) : (
            <button type="button" onClick={extract} disabled={!file || extracting} className={PRIMARY_BTN}>
              {extracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ScanText className="w-3.5 h-3.5" />}
              {extracting ? "추출 중…" : "업로드하고 추출"}
            </button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <label
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer ${
              result ? "border-[#E0E3E8] bg-[#F8F9FA] pointer-events-none opacity-70" : "border-[#D9CFFF] bg-[#FAF8FF] hover:bg-[#F3EEFF]"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!result) pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <FileUp className="w-6 h-6 text-[#9747FF]" />
            <span className="text-[13px] font-semibold text-[#101317]">{file ? file.name : "사업자등록증 파일 선택 또는 끌어놓기"}</span>
            <span className="text-[12px] text-[#717680]">JPG · PNG · PDF(1쪽) · 10MB 이하</span>
            <input type="file" accept={ACCEPT} className="hidden" disabled={Boolean(result)} onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          </label>
          {previewUrl && file && (
            <div className="rounded-xl border border-[#EBECEF] overflow-hidden bg-[#F8F9FA] h-[360px]">
              {file.type === "application/pdf" ? (
                <iframe src={previewUrl} title="등록증 미리보기" className="w-full h-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="등록증 미리보기" className="w-full h-full object-contain" />
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {error && <div className="p-3 rounded-lg bg-[#FFECEC] border border-[#FFD0D0] text-[#C42424] text-[13px]">{error}</div>}

          {!result ? (
            <p className="text-[13px] text-[#717680] leading-relaxed">
              파일을 올리면 CLOVA OCR 로 <strong>사업자등록번호 · 상호</strong>를 뽑고 형식 · 검증식 · 중복을 확인합니다.
              결과는 저장 전에 고칠 수 있습니다.
            </p>
          ) : (
            <>
              {result.ocr_error && (
                <div className="p-3 rounded-lg bg-[#FFF6E6] border border-[#FFE6B3] text-[#B45309] text-[13px]">
                  {result.ocr_error} — 직접 입력해 주세요.
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                <CheckBadge ok={formatOk} label="형식" />
                <CheckBadge ok={checksumOk} label="검증식" />
                {duplicateKnown ? (
                  <CheckBadge ok={!duplicate} label="중복" okLabel="없음" failLabel="있음" />
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[12px] font-semibold border bg-[#F4F5F7] text-[#555A64] border-[#E0E3E8]">
                    중복: 저장 시 확인
                  </span>
                )}
                {result.extraction.confidence !== null && (
                  <span className="px-2 py-0.5 rounded-md text-[12px] font-semibold border bg-[#F4F5F7] text-[#555A64] border-[#E0E3E8]">
                    신뢰도 {Math.round(result.extraction.confidence * 100)}%
                  </span>
                )}
              </div>
              {duplicate && result.checks.duplicate_of && (
                <p className="text-[12px] text-[#E52E2E]">
                  이미 등록됨: {result.checks.duplicate_of.business_name} ({BUSINESS_USER_STATUS_LABELS[result.checks.duplicate_of.status]})
                </p>
              )}

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
                  placeholder="123-45-67890"
                  inputMode="numeric"
                  className={INPUT + " font-mono"}
                />
              </label>
              {(result.extraction.representative || result.extraction.opening_date) && (
                <div className="text-[12px] text-[#717680] flex flex-wrap gap-x-4">
                  {result.extraction.representative && <span>대표자: {result.extraction.representative}</span>}
                  {result.extraction.opening_date && <span>개업일: {result.extraction.opening_date}</span>}
                </div>
              )}
              <label className={LABEL}>
                <span>
                  담당자 이메일
                  {status === "active" ? <span className="text-[#E52E2E]"> *</span> : <span className="font-normal text-[#8E96A2]"> (선택)</span>}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmail((v) => v.trim())}
                  placeholder="api@company.co.kr — API 키 메일 수신 주소"
                  autoComplete="off"
                  className={INPUT}
                />
                {email.trim() && !isEmailLike(email) && <span className="text-[12px] font-normal text-[#E52E2E]">이메일 형식을 확인하세요.</span>}
              </label>
              <label className={LABEL}>
                상태
                <select value={status} onChange={(e) => setStatus(e.target.value as BusinessUserStatus)} className={INPUT}>
                  {CREATE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {BUSINESS_USER_STATUS_LABELS[s]}
                      {s === "active" ? " — API 키 발급" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {status !== "active" && (
                <label className={LABEL}>
                  사유
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={INPUT} />
                </label>
              )}
              <label className={LABEL}>
                메모
                <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className={INPUT} />
              </label>
              {blocker && <p className="text-[12px] text-[#E52E2E]">{blocker}</p>}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
