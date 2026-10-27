"use client";

import { useCallback, useEffect, useState } from "react";
import { KeySquare, Plus, RefreshCw, Search, XCircle } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { formatBizNo } from "@/lib/business-user/biz-no";
import { BusinessDetailModal } from "@/components/api-mng/BusinessDetailModal";
import { NewBusinessModal } from "@/components/api-mng/NewBusinessModal";
import { PRIMARY_BTN, SECONDARY_BTN, StatusBadge, TokenModal, formatDateTime } from "@/components/api-mng/ui";
import {
  BUSINESS_USER_STATUSES,
  BUSINESS_USER_STATUS_LABELS,
  type BusinessUser,
  type BusinessUserStatus,
} from "@/types/business-user";

const PAGE_SIZE = 20;
const STATUS_FILTERS: { value: "all" | BusinessUserStatus; label: string }[] = [
  { value: "all", label: "전체" },
  ...BUSINESS_USER_STATUSES.map((s) => ({ value: s, label: BUSINESS_USER_STATUS_LABELS[s] })),
];

/**
 * API 키 관리 — 외부 업체(business_user) 등록 · 조회 · 수정 · 정지 · 키 발급/재발급/폐기 · 삭제.
 * specs/stmx-api-mng-spec.md
 */
export default function ApiMngPage() {
  const [items, setItems] = useState<BusinessUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BusinessUserStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ token: string; item: BusinessUser } | null>(null);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), status: statusFilter });
      if (q) params.set("q", q);
      const res = await authFetch(`/api/admin/business-users?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, q]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const upsert = (item: BusinessUser) => setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...item } : x)));

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA] text-[#1D2330] overflow-hidden">
      <header className="flex-none bg-white border-b border-[#E0E3E8] px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(151,71,255,0.12)] text-[#9747FF] flex items-center justify-center">
              <KeySquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold tracking-tight text-[#101317]">API 키 관리</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EDE8FF] text-[#7A2CEE] text-[12px] font-bold">총 {total}건</span>
              </div>
              <p className="text-[13px] text-[#717680] mt-0.5">
                사업자등록증으로 업체를 확인하고 STMX API 키(<code>stmx_live_…</code>)를 발급합니다
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
                  placeholder="상호 · 사업자번호 검색"
                  className="pl-8 pr-3 py-1.5 h-9 rounded-lg border border-[#E0E3E8] bg-white text-[13px] w-48 focus:outline-none focus:ring-2 focus:ring-[rgba(151,71,255,0.25)]"
                />
              </div>
              <button type="submit" className="px-3 py-1.5 h-9 rounded-lg bg-[#101317] text-white text-[13px] font-medium cursor-pointer">
                검색
              </button>
            </form>

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
                    statusFilter === f.value ? "bg-white text-[#101317] shadow-xs font-semibold" : "text-[#717680] hover:text-[#101317]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button type="button" onClick={fetchList} disabled={isLoading} className={SECONDARY_BTN}>
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </button>
            <button type="button" onClick={() => setCreating(true)} className={PRIMARY_BTN}>
              <Plus className="w-3.5 h-3.5" />
              신규 등록
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
              마이그레이션 <code>0017_business_user.sql</code> 적용 여부를 확인하세요.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-x-auto">
            <table className="w-full text-[13px] min-w-[860px]">
              <thead>
                <tr className="text-left text-[12px] text-[#717680] border-b border-[#F0F1F3]">
                  <th className="px-4 py-3 font-semibold">상호</th>
                  <th className="px-4 py-3 font-semibold">사업자번호</th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  <th className="px-4 py-3 font-semibold">토큰</th>
                  <th className="px-4 py-3 font-semibold">발급일</th>
                  <th className="px-4 py-3 font-semibold">최근 사용</th>
                  <th className="px-4 py-3 font-semibold text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && items.length === 0 ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-3">
                        <div className="h-6 rounded bg-[#F4F5F7] animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-[#717680]">
                      등록된 업체가 없습니다. <strong>신규 등록</strong>으로 사업자등록증을 올려 보세요.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className="border-b border-[#F4F5F7] last:border-0 hover:bg-[#FAFAFB]">
                      <td className="px-4 py-3 font-semibold text-[#101317]">
                        {it.business_name}
                        {it.status_reason && it.status !== "active" && (
                          <div className="text-[12px] font-normal text-[#8E96A2] truncate max-w-[260px]" title={it.status_reason}>
                            {it.status_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#323843]">{formatBizNo(it.business_number)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={it.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-[#555A64]">{it.token_prefix ? `${it.token_prefix}…` : "—"}</td>
                      <td className="px-4 py-3 text-[#555A64]">{formatDateTime(it.token_issued_at)}</td>
                      <td className="px-4 py-3 text-[#555A64]">{formatDateTime(it.token_last_used_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailId(it.id)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#E0E3E8] hover:bg-[#F4F5F7] text-[13px] font-medium cursor-pointer"
                        >
                          상세 · 관리
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
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
      </main>

      {creating && (
        <NewBusinessModal
          onClose={() => setCreating(false)}
          onCreated={(item, token) => {
            setCreating(false);
            if (token) setIssued({ token, item });
            setPage(1);
            fetchList();
          }}
        />
      )}

      {detailId && (
        <BusinessDetailModal
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={upsert}
          onDeleted={(id) => {
            setDetailId(null);
            setItems((prev) => prev.filter((x) => x.id !== id));
            setTotal((t) => Math.max(0, t - 1));
          }}
          onToken={(token, item) => setIssued({ token, item })}
        />
      )}

      {issued && <TokenModal token={issued.token} item={issued.item} onClose={() => setIssued(null)} />}
    </div>
  );
}
