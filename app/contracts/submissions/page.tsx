"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  Handshake,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import {
  FLOW_LABELS,
  type ContractApplication,
  type ContractFlowType,
  type ContractStatus,
} from "@/types/contracts";

const FLOW_FILTERS: { value: "all" | ContractFlowType; label: string }[] = [
  { value: "all", label: "전체 유형" },
  { value: "stmx_creator", label: "STMX↔크리에이터" },
  { value: "stmx_brand", label: "STMX↔브랜드" },
  { value: "creator_brand", label: "직접 연결" },
];

const STATUS_FILTERS: { value: "all" | ContractStatus; label: string }[] = [
  { value: "all", label: "전체 상태" },
  { value: "pending", label: "대기" },
  { value: "reviewing", label: "검토중" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "반려" },
];

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return dateString;
  }
}

function statusStyle(status: string) {
  if (status === "approved") return "bg-[#E6F8ED] text-[#0E8A42] border-[#C3EED3]";
  if (status === "rejected" || status === "cancelled")
    return "bg-[#FFECEC] text-[#E52E2E] border-[#FFD0D0]";
  if (status === "reviewing") return "bg-[#EDE8FF] text-[#7A2CEE] border-[#D9CFFF]";
  return "bg-[#FFF6E6] text-[#D97706] border-[#FFE6B3]";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "대기중",
    reviewing: "검토중",
    approved: "승인됨",
    rejected: "반려됨",
    cancelled: "취소됨",
  };
  return map[status] || status;
}

export default function ContractSubmissionsPage() {
  const [items, setItems] = useState<ContractApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [flowFilter, setFlowFilter] = useState<"all" | ContractFlowType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        flowType: flowFilter,
        status: statusFilter,
        includeRecipients: "1",
      });
      const res = await authFetch(`/api/contracts?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(data.applications || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, flowFilter, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const changeStatus = async (id: string, status: ContractStatus) => {
    setUpdatingId(id);
    try {
      const res = await authFetch("/api/contracts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "상태 변경 실패");
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, status, updated_at: new Date().toISOString() } : it
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "상태 변경 중 오류");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA] text-[#1D2330] overflow-hidden">
      <header className="flex-none bg-white border-b border-[#E0E3E8] px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/contracts"
              className="w-9 h-9 rounded-xl border border-[#E0E3E8] bg-white hover:bg-[#F4F5F7] flex items-center justify-center text-[#555A64]"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-[rgba(182,130,53,0.12)] text-[var(--color-accent-700)] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold tracking-tight text-[#101317]">
                  계약 / 신청 제출 내역
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EDE8FF] text-[#7A2CEE] text-[12px] font-bold">
                  총 {total}건
                </span>
              </div>
              <p className="text-[13px] text-[#717680] mt-0.5">
                <code>stmx_contract_applications</code> · 직접 연결 건은 수신자 스냅샷 포함
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#F4F5F7] rounded-lg p-0.5 border border-[#E0E3E8]">
              {FLOW_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setFlowFilter(f.value);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium cursor-pointer ${
                    flowFilter === f.value
                      ? "bg-white text-[#101317] shadow-xs font-semibold"
                      : "text-[#717680] hover:text-[#101317]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center bg-[#F4F5F7] rounded-lg p-0.5 border border-[#E0E3E8]">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(f.value);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium cursor-pointer ${
                    statusFilter === f.value
                      ? "bg-white text-[#101317] shadow-xs font-semibold"
                      : "text-[#717680] hover:text-[#101317]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={fetchList}
              disabled={isLoading}
              className="px-3 py-1.5 h-9 rounded-lg bg-white border border-[#E0E3E8] hover:bg-[#F4F5F7] text-[13px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 vt-scroll">
        {error ? (
          <div className="p-6 rounded-2xl bg-[#FFECEC] border border-[#FFD0D0] text-[#E52E2E] flex flex-col items-center text-center">
            <XCircle className="w-8 h-8 mb-2" />
            <h3 className="font-bold text-[16px]">데이터 로드 실패</h3>
            <p className="text-[13px] mt-1 text-[#C42424]">{error}</p>
            <p className="text-[12px] mt-2 text-[#717680]">
              마이그레이션 <code>0007_stmx_contracts.sql</code> 을 Supabase SQL Editor에서 실행했는지 확인하세요.
            </p>
            <button
              type="button"
              onClick={fetchList}
              className="mt-4 px-4 py-2 rounded-xl bg-[#E52E2E] text-white text-[13px] font-semibold cursor-pointer"
            >
              다시 시도
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-white border border-[#EBECEF] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-[#EBECEF]">
            <FileText className="w-8 h-8 text-[#8E96A2] mb-3 opacity-60" />
            <h3 className="text-[16px] font-bold text-[#101317]">제출 내역이 없습니다</h3>
            <p className="text-[13px] text-[#717680] mt-1">
              <Link href="/contracts" className="text-[#7A2CEE] font-medium underline">
                계약 신청 허브
              </Link>
              에서 새 신청서를 작성하세요.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const isUpdating = updatingId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border ${statusStyle(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#F4F5F7] text-[#555A64] text-[12px] font-medium">
                        {FLOW_LABELS[item.flow_type]}
                      </span>
                      <span className="text-[12px] text-[#8E96A2] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <div>
                      <strong className="text-[15px] font-bold text-[#101317]">
                        {item.applicant_name}
                      </strong>
                      <span className="text-[13px] text-[#717680] ml-2">{item.applicant_email}</span>
                    </div>

                    <div className="text-[13px] text-[#374151] space-y-0.5">
                      {item.creator_name && (
                        <div>
                          크리에이터: <strong>{item.creator_name}</strong>
                          {item.creator_channel_type ? ` · ${item.creator_channel_type}` : ""}
                        </div>
                      )}
                      {item.brand_name && (
                        <div>
                          브랜드: <strong>{item.brand_name}</strong>
                          {item.brand_category ? ` · ${item.brand_category}` : ""}
                        </div>
                      )}
                      {item.campaign_goal && (
                        <div className="text-[#6B7280] line-clamp-2">{item.campaign_goal}</div>
                      )}
                    </div>

                    {item.flow_type === "creator_brand" && (
                      <div className="mt-2 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] p-2.5">
                        <div className="text-[12px] font-bold text-[#101317] flex items-center gap-1 mb-1">
                          <Handshake className="w-3.5 h-3.5 text-[#0E8A42]" />
                          알림 수신자 ({item.recipients?.length || 0})
                        </div>
                        {(item.recipients || []).length === 0 ? (
                          <span className="text-[12px] text-[#9CA3AF]">없음</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {(item.recipients || []).map((r) => (
                              <span
                                key={r.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-[#E5E7EB] text-[12px]"
                              >
                                <strong>{r.name}</strong>
                                <span className="text-[#6B7280]">{r.email}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isUpdating || item.status === "approved"}
                      onClick={() => changeStatus(item.id, "approved")}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-bold flex items-center gap-1 cursor-pointer ${
                        item.status === "approved"
                          ? "bg-[#0E8A42] text-white pointer-events-none"
                          : "bg-[#E6F8ED] text-[#0E8A42] hover:bg-[#0E8A42] hover:text-white"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      승인
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating || item.status === "rejected"}
                      onClick={() => changeStatus(item.id, "rejected")}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-bold flex items-center gap-1 cursor-pointer ${
                        item.status === "rejected"
                          ? "bg-[#E52E2E] text-white pointer-events-none"
                          : "bg-[#FFECEC] text-[#E52E2E] hover:bg-[#E52E2E] hover:text-white"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      반려
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating || item.status === "pending"}
                      onClick={() => changeStatus(item.id, "pending")}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-bold flex items-center gap-1 cursor-pointer ${
                        item.status === "pending"
                          ? "bg-[#D97706] text-white pointer-events-none"
                          : "bg-[#FFF6E6] text-[#D97706] hover:bg-[#D97706] hover:text-white"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      대기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
