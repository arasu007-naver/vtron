"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  BadgeCheck,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import CreatorLooxModal, { Avatar, type CreatorLooxTarget } from "@/components/CreatorLooxModal";

interface ClothingBrand {
  id: string;
  displayName: string;
  aliases?: string[];
  naverBrandId?: number;
  naverBrandName?: string | null;
  clothingQuery?: string | null;
  counts?: {
    top: number;
    bottom: number;
    etc: number;
  };
}

interface Profile {
  id: string;
  nickname: string | null;
  style_code: string | null;
  gender: string | null;
  ages: string | null;
  avatar_url: string | null;
  updated_at: string;
}

interface CreatorRequestItem {
  id: string;
  user_id: string;
  code: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | string;
  etc: any;
  created_at: string;
  updated_at: string;
  profile: Profile | null;
  favoriteBrands: ClothingBrand[];
  favoriteBrandsCount: number;
  favoriteBrandsUpdatedAt: string | null;
}

interface CreatorReqResponse {
  requests: CreatorRequestItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

const STATUS_FILTERS = [
  { value: "all", label: "전체 상태" },
  { value: "pending", label: "대기중 (Pending)" },
  { value: "approved", label: "승인됨 (Approved)" },
  { value: "rejected", label: "반려됨 (Rejected)" },
] as const;

const PAGE_WINDOW = 5;

const pageNumbers = (page: number, totalPages: number) => {
  if (totalPages <= 1) return [1];
  const end = Math.min(
    totalPages,
    Math.max(page - Math.floor(PAGE_WINDOW / 2), 1) + PAGE_WINDOW - 1
  );
  const start = Math.max(1, end - PAGE_WINDOW + 1);
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
};

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
      second: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return dateString;
  }
}

export default function CreatorReqPage() {
  const [requests, setRequests] = useState<CreatorRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedItemForModal, setSelectedItemForModal] = useState<CreatorRequestItem | null>(null);
  const [looxTarget, setLooxTarget] = useState<CreatorLooxTarget | null>(null);
  const closeLoox = useCallback(() => setLooxTarget(null), []);

  const [, startTransition] = useTransition();

  const fetchRequests = async (targetPage = page, targetStatus = statusFilter, targetPageSize = pageSize) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(targetPageSize),
        status: targetStatus,
      });

      const res = await authFetch(`/api/creator-req?${params.toString()}`);
      const data: CreatorReqResponse = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setRequests(data.requests || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err: any) {
      console.error("Failed to load creator requests:", err);
      setError(err instanceof Error ? err.message : "요청 목록을 불러오지 못했습니다.");
      setRequests([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(page, statusFilter, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, pageSize]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await authFetch("/api/creator-req", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "상태 변경에 실패했습니다.");
      }

      // Optimistic update local state
      setRequests((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus, updated_at: new Date().toISOString() } : item
        )
      );

      if (selectedItemForModal?.id === id) {
        setSelectedItemForModal((prev) =>
          prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null
        );
      }
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "상태 변경 중 오류가 발생했습니다.");
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Filter client-side search term if user types nickname/email/brand
  const filteredRequests = requests.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nick = (item.profile?.nickname || "").toLowerCase();
    const uid = item.user_id.toLowerCase();
    const reason = item.reason.toLowerCase();
    const style = (item.profile?.style_code || "").toLowerCase();
    const brandsText = (item.favoriteBrands || [])
      .map((b) => `${b.displayName} ${b.naverBrandName || ""}`)
      .join(" ")
      .toLowerCase();

    return (
      nick.includes(term) ||
      uid.includes(term) ||
      reason.includes(term) ||
      style.includes(term) ||
      brandsText.includes(term)
    );
  });

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA] text-[#1D2330] overflow-hidden">
      {/* 1. 상단 타이틀 & 툴바 */}
      <header className="flex-none bg-white border-b border-[#E0E3E8] px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(182,130,53,0.12)] text-[var(--color-accent-700)] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold tracking-tight text-[#101317]">
                  Creator 역할 신청 관리
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EDE8FF] text-[#7A2CEE] text-[12px] font-bold">
                  총 {total}건
                </span>
              </div>
              <p className="text-[13px] text-[#717680] mt-0.5">
                <code>user_biz_request</code> 신청 내역 및 각 사용자의 <code>user_favorite_brands</code> 선호 브랜드 목록 조회
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 상태 필터 */}
            <div className="flex items-center bg-[#F4F5F7] rounded-lg p-0.5 border border-[#E0E3E8]">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(f.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                    statusFilter === f.value
                      ? "bg-white text-[#101317] shadow-xs font-semibold"
                      : "text-[#717680] hover:text-[#101317]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 새로고침 */}
            <button
              type="button"
              onClick={() => fetchRequests(page, statusFilter, pageSize)}
              disabled={isLoading}
              title="새로고침"
              className="px-3 py-1.5 h-9 rounded-lg bg-white border border-[#E0E3E8] hover:bg-[#F4F5F7] text-[13px] font-medium text-[#101317] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>새로고침</span>
            </button>

            {/* 페이지당 건수 */}
            <select
              value={pageSize}
              onChange={(e) => {
                const s = Number(e.target.value);
                setPageSize(s);
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-lg bg-white border border-[#E0E3E8] text-[13px] font-medium text-[#101317] outline-none cursor-pointer"
            >
              <option value={10}>10개씩 보기</option>
              <option value={20}>20개씩 보기</option>
              <option value={50}>50개씩 보기</option>
            </select>
          </div>
        </div>

        {/* 검색 인풋 바 */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E96A2]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="닉네임, 유저 ID, 브랜드명 검색..."
              className="w-full h-8.5 pl-9 pr-8 rounded-lg bg-[#F4F5F7] border border-transparent focus:border-[#101317] focus:bg-white text-[13px] text-[#101317] outline-none transition-all placeholder:text-[#A0A4A8]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E96A2] hover:text-[#101317]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. 본문 컨텐츠 영역 */}
      <main className="flex-1 overflow-y-auto p-6 vt-scroll">
        {error ? (
          <div className="p-6 rounded-2xl bg-[#FFECEC] border border-[#FFD0D0] text-[#E52E2E] flex flex-col items-center justify-center text-center">
            <XCircle className="w-8 h-8 mb-2" />
            <h3 className="font-bold text-[16px]">데이터 로드 실패</h3>
            <p className="text-[13px] mt-1 text-[#C42424]">{error}</p>
            <button
              type="button"
              onClick={() => fetchRequests(page, statusFilter, pageSize)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#E52E2E] text-white text-[13px] font-semibold hover:bg-[#C42424] transition-colors cursor-pointer"
            >
              다시 시도
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-white border border-[#EBECEF] animate-pulse p-4 flex flex-col justify-between"
              >
                <div className="h-4 bg-[#F0F1F3] rounded w-1/4" />
                <div className="h-4 bg-[#F0F1F3] rounded w-3/4" />
                <div className="h-6 bg-[#F0F1F3] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-[#EBECEF]">
            <div className="w-12 h-12 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[#8E96A2] mb-3">
              <UserCheck className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-[16px] font-bold text-[#101317]">등록된 Creator 신청이 없습니다</h3>
            <p className="text-[13px] text-[#717680] mt-1">
              {statusFilter !== "all" ? `'${statusFilter}' 상태의 신청이 없습니다.` : "아직 접수된 역할 요청이 없습니다."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredRequests.map((item) => {
              const isUpdating = updatingId === item.id;
              const statusColor =
                item.status === "approved"
                  ? "bg-[#E6F8ED] text-[#0E8A42] border-[#C3EED3]"
                  : item.status === "rejected"
                  ? "bg-[#FFECEC] text-[#E52E2E] border-[#FFD0D0]"
                  : "bg-[#FFF6E6] text-[#D97706] border-[#FFE6B3]";

              const statusText =
                item.status === "approved"
                  ? "승인됨"
                  : item.status === "rejected"
                  ? "반려됨"
                  : "대기중";

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#D1D5DB] shadow-xs p-5 transition-all flex flex-col lg:flex-row lg:items-start justify-between gap-4"
                >
                  {/* 왼쪽: 신청 정보 & 사용자 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border ${statusColor}`}>
                        {statusText}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#F4F5F7] text-[#555A64] text-[12px] font-mono font-medium">
                        CODE: {item.code}
                      </span>
                      <span className="text-[12px] text-[#8E96A2] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    {/* 유저 프로필 요약 */}
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setLooxTarget({
                            userId: item.user_id,
                            nickname: item.profile?.nickname ?? null,
                            avatarUrl: item.profile?.avatar_url ?? null,
                          })
                        }
                        title="신청자 Loox 보기"
                        aria-label={`${item.profile?.nickname || "신청자"}의 Loox 보기`}
                        className="rounded-full cursor-pointer ring-offset-2 hover:ring-2 hover:ring-[#7A2CEE] transition-shadow shrink-0"
                      >
                        <Avatar nickname={item.profile?.nickname ?? null} avatarUrl={item.profile?.avatar_url ?? null} />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="text-[15px] font-bold text-[#101317]">
                            {item.profile?.nickname || "익명 사용자"}
                          </strong>
                          {item.profile?.style_code && (
                            <span className="px-1.5 py-0.2 rounded bg-[#7A2CEE]/10 text-[#7A2CEE] font-bold text-[11px]">
                              {item.profile.style_code}
                            </span>
                          )}
                          {item.profile?.gender && (
                            <span className="text-[12px] text-[#717680]">
                              ({item.profile.gender === "female" ? "여성" : "남성"}
                              {item.profile.ages ? ` · ${item.profile.ages}` : ""})
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] font-mono text-[#8E96A2] truncate max-w-sm">
                          User ID: {item.user_id}
                        </div>
                      </div>
                    </div>

                    {/* 신청 사유 */}
                    <div className="mt-3 text-[13px] text-[#374151] bg-[#F9FAFB] rounded-xl p-2.5 border border-[#F3F4F6]">
                      <span className="font-semibold text-[#111827]">신청 사유: </span>
                      {item.reason || "creator role 요청"}
                    </div>

                    {/* 선호 브랜드 목록 (user_favorite_brands) */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-bold text-[#101317] flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-[#7A2CEE]" />
                          선호 브랜드 목록 ({item.favoriteBrandsCount}개)
                        </span>
                        {item.favoriteBrandsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedItemForModal(item)}
                            className="text-[12px] text-[#7A2CEE] hover:underline font-medium cursor-pointer"
                          >
                            자세히 보기
                          </button>
                        )}
                      </div>

                      {item.favoriteBrandsCount === 0 ? (
                        <span className="text-[12px] text-[#9CA3AF] italic">
                          등록된 선호 브랜드 정보가 없습니다.
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {item.favoriteBrands.slice(0, 8).map((b, idx) => (
                            <span
                              key={b.id || idx}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#F3F4F6] text-[#1F2937] text-[12px] font-medium border border-[#E5E7EB]"
                            >
                              <span className="font-semibold">{b.displayName}</span>
                              {b.naverBrandName && b.naverBrandName !== b.displayName && (
                                <span className="text-[11px] text-[#6B7280]">({b.naverBrandName})</span>
                              )}
                            </span>
                          ))}
                          {item.favoriteBrandsCount > 8 && (
                            <button
                              type="button"
                              onClick={() => setSelectedItemForModal(item)}
                              className="px-2 py-0.5 rounded-lg bg-[#EDE8FF] text-[#7A2CEE] text-[12px] font-bold hover:bg-[#E0D5FF] cursor-pointer"
                            >
                              +{item.favoriteBrandsCount - 8}개 더보기
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽: 상태 변경 액션 단추 */}
                  <div className="lg:self-center flex flex-row lg:flex-col items-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#F3F4F6]">
                    <span className="text-[11px] text-[#8E96A2] hidden lg:block">상태 변경:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "approved")}
                        disabled={isUpdating || item.status === "approved"}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          item.status === "approved"
                            ? "bg-[#0E8A42] text-white shadow-xs pointer-events-none"
                            : "bg-[#E6F8ED] text-[#0E8A42] hover:bg-[#0E8A42] hover:text-white"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>승인</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "rejected")}
                        disabled={isUpdating || item.status === "rejected"}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          item.status === "rejected"
                            ? "bg-[#E52E2E] text-white shadow-xs pointer-events-none"
                            : "bg-[#FFECEC] text-[#E52E2E] hover:bg-[#E52E2E] hover:text-white"
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>반려</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "pending")}
                        disabled={isUpdating || item.status === "pending"}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          item.status === "pending"
                            ? "bg-[#D97706] text-white shadow-xs pointer-events-none"
                            : "bg-[#FFF6E6] text-[#D97706] hover:bg-[#D97706] hover:text-white"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>대기</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 3. 하단 페이지네이션 바 */}
      {totalPages > 0 && (
        <footer className="flex-none bg-white border-t border-[#E0E3E8] px-6 py-3 flex items-center justify-between">
          <div className="text-[13px] text-[#717680]">
            페이지 <strong className="text-[#101317]">{page}</strong> / {totalPages} (총 {total}건)
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page <= 1 || isLoading}
              title="첫 페이지"
              className="w-8 h-8 rounded-lg border border-[#E0E3E8] bg-white flex items-center justify-center text-[#101317] hover:bg-[#F4F5F7] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              title="이전 페이지"
              className="w-8 h-8 rounded-lg border border-[#E0E3E8] bg-white flex items-center justify-center text-[#101317] hover:bg-[#F4F5F7] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageNumbers(page, totalPages).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                disabled={isLoading}
                className={`w-8 h-8 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                  p === page
                    ? "bg-[#101317] text-white shadow-xs"
                    : "border border-[#E0E3E8] bg-white text-[#101317] hover:bg-[#F4F5F7]"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              title="다음 페이지"
              className="w-8 h-8 rounded-lg border border-[#E0E3E8] bg-white flex items-center justify-center text-[#101317] hover:bg-[#F4F5F7] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || isLoading}
              title="끝 페이지"
              className="w-8 h-8 rounded-lg border border-[#E0E3E8] bg-white flex items-center justify-center text-[#101317] hover:bg-[#F4F5F7] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}

      {/* 4. 브랜드 목록 상세 모달 */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBECEF]">
              <div>
                <h3 className="text-[17px] font-bold text-[#101317]">
                  선호 브랜드 전체 목록
                </h3>
                <p className="text-[12px] text-[#717680] mt-0.5">
                  신청자: {selectedItemForModal.profile?.nickname || selectedItemForModal.user_id} ({selectedItemForModal.favoriteBrandsCount}개)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForModal(null)}
                className="w-8 h-8 rounded-full bg-[#F4F5F7] hover:bg-[#EBECEF] flex items-center justify-center text-[#555A64] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 모달 본문: 브랜드 리스트 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 vt-scroll">
              {selectedItemForModal.favoriteBrands.map((brand, idx) => (
                <div
                  key={brand.id || idx}
                  className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] flex items-center justify-between"
                >
                  <div>
                    <div className="text-[14px] font-bold text-[#111827]">
                      {brand.displayName}
                    </div>
                    {brand.naverBrandName && brand.naverBrandName !== brand.displayName && (
                      <div className="text-[12px] text-[#6B7280]">
                        네이버 등록명: {brand.naverBrandName}
                      </div>
                    )}
                    {brand.aliases && brand.aliases.length > 0 && (
                      <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                        별칭: {brand.aliases.join(", ")}
                      </div>
                    )}
                  </div>

                  <span className="px-2 py-1 rounded bg-white text-[#7A2CEE] font-mono text-[11px] border border-[#E5E7EB]">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-3 border-t border-[#EBECEF] bg-[#F9FAFB] flex items-center justify-between">
              <div className="text-[12px] text-[#6B7280]">
                신청 상태: <strong className="text-[#111827]">{selectedItemForModal.status}</strong>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForModal(null)}
                className="px-4 py-2 rounded-xl bg-[#101317] text-white text-[13px] font-semibold hover:bg-[#101317]/90 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 신청자 Loox 목록 모달 */}
      {looxTarget && (
        <CreatorLooxModal key={looxTarget.userId} target={looxTarget} onClose={closeLoox} />
      )}
    </div>
  );
}
