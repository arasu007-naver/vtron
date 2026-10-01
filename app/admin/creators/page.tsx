"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  UserRound,
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

const FLOW_FILTERS: { value: "stmx_creator" | "creator_brand" | "all"; label: string }[] = [
  { value: "stmx_creator", label: "STMX↔크리에이터" },
  { value: "creator_brand", label: "직접 연결" },
  { value: "all", label: "전체" },
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

export default function AdminCreatorsPage() {
  const [items, setItems] = useState<ContractApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [flowFilter, setFlowFilter] = useState<"stmx_creator" | "creator_brand" | "all">(
    "stmx_creator"
  );
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>("all");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
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
      });
      if (q) params.set("q", q);
      const res = await authFetch(`/api/admin/creators?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(data.creators || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, flowFilter, statusFilter, q]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const changeStatus = async (id: string, status: ContractStatus) => {
    setUpdatingId(id);
    try {
      const res = await authFetch("/api/admin/creators", {
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

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA] text-[#1D2330] overflow-hidden">
      <header className="flex-none bg-white border-b border-[#E0E3E8] px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(122,44,238,0.12)] text-[#7A2CEE] flex items-center justify-center">
              <UserRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold tracking-tight text-[#101317]">
                  크리에이터 관리
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EDE8FF] text-[#7A2CEE] text-[12px] font-bold">
                  총 {total}건
                </span>
              </div>
              <p className="text-[13px] text-[#717680] mt-0.5">
                계약 신청(<code>stmx_contract_applications</code>) 기반 ·{" "}
                <Link href="/creator-req" className="text-[#7A2CEE] underline">
                  Creator 요청
                </Link>
                은 stmx-web 프로필/승인
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                setQ(qInput.trim());
              }}
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E96A2]" />
                <input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  placeholder="이름 · 이메일 · 크리에이터"
                  className="pl-8 pr-3 py-1.5 h-9 rounded-lg border border-[#E0E3E8] bg-white text-[13px] w-52 focus:outline-none focus:ring-2 focus:ring-[rgba(122,44,238,0.2)]"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 h-9 rounded-lg bg-[#101317] text-white text-[13px] font-medium cursor-pointer"
              >
                검색
              </button>
            </form>

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
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-white border border-[#EBECEF] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-[#EBECEF]">
            <UserRound className="w-8 h-8 text-[#8E96A2] mb-3 opacity-60" />
            <h3 className="text-[16px] font-bold text-[#101317]">크리에이터 신청이 없습니다</h3>
            <p className="text-[13px] text-[#717680] mt-1">
              <Link href="/contracts/creator" className="text-[#7A2CEE] font-medium underline">
                STMX↔크리에이터 신청서
              </Link>
              에서 새 신청을 받거나 필터를 바꿔 보세요.
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
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border ${statusStyle(
                          item.status
                        )}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#F4F5F7] text-[#555A64] text-[12px] font-medium">
                        {FLOW_LABELS[item.flow_type as ContractFlowType] || item.flow_type}
                      </span>
                      <span className="text-[12px] text-[#8E96A2] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <div>
                      <strong className="text-[15px] font-bold text-[#101317]">
                        {item.creator_name || item.applicant_name}
                      </strong>
                      <span className="text-[13px] text-[#717680] ml-2">
                        {item.applicant_email}
                      </span>
                    </div>

                    <div className="text-[13px] text-[#374151] space-y-0.5">
                      {item.creator_channel_type && (
                        <div>
                          채널: <strong>{item.creator_channel_type}</strong>
                          {item.creator_followers ? ` · 팔로워 ${item.creator_followers}` : ""}
                        </div>
                      )}
                      {item.creator_sns_url && (
                        <a
                          href={item.creator_sns_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#7A2CEE] underline"
                        >
                          SNS 링크 <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {item.brand_name && (
                        <div>
                          브랜드: <strong>{item.brand_name}</strong>
                        </div>
                      )}
                      {item.campaign_goal && (
                        <div className="text-[#6B7280] line-clamp-2">{item.campaign_goal}</div>
                      )}
                      {item.notes && (
                        <div className="text-[#9CA3AF] text-[12px]">메모: {item.notes}</div>
                      )}
                    </div>
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-[#E0E3E8] text-[13px] disabled:opacity-40 cursor-pointer"
                >
                  이전
                </button>
                <span className="text-[13px] text-[#717680]">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-[#E0E3E8] text-[13px] disabled:opacity-40 cursor-pointer"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
