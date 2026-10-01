"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  RefreshCw,
  Save,
  Search,
  XCircle,
} from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import {
  COMMERCE_STATUS_LABELS,
  STYLE_CODE_OPTIONS,
  type AdminBrand,
  type BrandCommerceStatus,
} from "@/types/admin";

const STATUS_FILTERS: { value: "all" | BrandCommerceStatus; label: string }[] = [
  { value: "all", label: "전체 상태" },
  { value: "draft", label: "초안" },
  { value: "active", label: "운영중" },
  { value: "paused", label: "일시중지" },
  { value: "archived", label: "보관" },
];

function bpsToPercent(bps: number | null | undefined) {
  if (bps === null || bps === undefined) return "—";
  return `${(bps / 100).toFixed(2)}%`;
}

function statusStyle(status: string) {
  if (status === "active") return "bg-[#E6F8ED] text-[#0E8A42] border-[#C3EED3]";
  if (status === "paused") return "bg-[#FFF6E6] text-[#D97706] border-[#FFE6B3]";
  if (status === "archived") return "bg-[#F4F5F7] text-[#555A64] border-[#E0E3E8]";
  return "bg-[#EDE8FF] text-[#7A2CEE] border-[#D9CFFF]";
}

export default function AdminBrandsPage() {
  const [items, setItems] = useState<AdminBrand[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BrandCommerceStatus>("all");
  const [affiliateOnly, setAffiliateOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AdminBrand>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "30",
        commerceStatus: statusFilter,
        affiliateReady: affiliateOnly ? "1" : "all",
      });
      if (q) params.set("q", q);
      const res = await authFetch(`/api/admin/brands?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(data.brands || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, affiliateOnly, q]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const startEdit = (brand: AdminBrand) => {
    setEditingId(brand.id);
    setDraft({
      slug: brand.slug,
      commerce_status: brand.commerce_status,
      affiliate_ready: brand.affiliate_ready,
      default_commission_rate_bps: brand.default_commission_rate_bps,
      default_platform_cut_bps: brand.default_platform_cut_bps,
      preferred_style_codes: [...(brand.preferred_style_codes || [])],
      website_url: brand.website_url,
      contact_email: brand.contact_email,
      contact_name: brand.contact_name,
      commerce_notes: brand.commerce_notes,
      is_active: brand.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const toggleStyle = (code: string) => {
    const cur = new Set(draft.preferred_style_codes || []);
    if (cur.has(code)) cur.delete(code);
    else cur.add(code);
    setDraft((d) => ({ ...d, preferred_style_codes: Array.from(cur) }));
  };

  const save = async (id: string) => {
    setSavingId(id);
    try {
      const res = await authFetch("/api/admin/brands", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...draft }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "저장 실패");
      setItems((prev) => prev.map((b) => (b.id === id ? { ...b, ...data.brand } : b)));
      cancelEdit();
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장 중 오류");
    } finally {
      setSavingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA] text-[#1D2330] overflow-hidden">
      <header className="flex-none bg-white border-b border-[#E0E3E8] px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(182,130,53,0.12)] text-[var(--color-accent-700)] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold tracking-tight text-[#101317]">
                  브랜드 관리
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EDE8FF] text-[#7A2CEE] text-[12px] font-bold">
                  총 {total}건
                </span>
              </div>
              <p className="text-[13px] text-[#717680] mt-0.5">
                <code>brands</code> ShopMy 제휴 메타 · 수수료율 · 스타일 코드
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
                  placeholder="브랜드명 · 슬러그 검색"
                  className="pl-8 pr-3 py-1.5 h-9 rounded-lg border border-[#E0E3E8] bg-white text-[13px] w-48 focus:outline-none focus:ring-2 focus:ring-[rgba(182,130,53,0.25)]"
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
              onClick={() => {
                setAffiliateOnly((v) => !v);
                setPage(1);
              }}
              className={`px-3 py-1.5 h-9 rounded-lg border text-[13px] font-medium cursor-pointer ${
                affiliateOnly
                  ? "bg-[#E6F8ED] border-[#C3EED3] text-[#0E8A42]"
                  : "bg-white border-[#E0E3E8] text-[#555A64]"
              }`}
            >
              제휴 준비만
            </button>

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
              마이그레이션 <code>0008_brands_shopmy.sql</code> 적용 여부를 확인하세요.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-white border border-[#EBECEF] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-[#EBECEF]">
            <Building2 className="w-8 h-8 text-[#8E96A2] mb-3 opacity-60" />
            <h3 className="text-[16px] font-bold text-[#101317]">브랜드가 없습니다</h3>
            <p className="text-[13px] text-[#717680] mt-1">
              <Link href="/brand-integration" className="text-[#7A2CEE] font-medium underline">
                브랜드 내재화
              </Link>
              에서 브랜드를 등록하거나 필터를 바꿔 보세요.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((brand) => {
              const editing = editingId === brand.id;
              const saving = savingId === brand.id;
              return (
                <div
                  key={brand.id}
                  className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-[16px] font-bold text-[#101317]">
                          {brand.display_name}
                        </strong>
                        {brand.naver_brand_name && (
                          <span className="text-[13px] text-[#717680]">
                            ({brand.naver_brand_name})
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border ${statusStyle(
                            brand.commerce_status
                          )}`}
                        >
                          {COMMERCE_STATUS_LABELS[brand.commerce_status] || brand.commerce_status}
                        </span>
                        {brand.affiliate_ready && (
                          <span className="px-2 py-0.5 rounded-full bg-[#E6F8ED] text-[#0E8A42] text-[12px] font-bold border border-[#C3EED3]">
                            제휴 준비
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[#8E96A2] flex flex-wrap gap-x-3 gap-y-1">
                        <span>slug: {brand.slug || "—"}</span>
                        <span>커미션: {bpsToPercent(brand.default_commission_rate_bps)}</span>
                        <span>플랫폼컷: {bpsToPercent(brand.default_platform_cut_bps)}</span>
                        <span>
                          스타일:{" "}
                          {(brand.preferred_style_codes || []).length
                            ? brand.preferred_style_codes.join(", ")
                            : "—"}
                        </span>
                        <span>카탈로그 모델: {brand.catalog_model_count ?? 0}</span>
                      </div>
                    </div>

                    {!editing && (
                      <button
                        type="button"
                        onClick={() => startEdit(brand)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#E0E3E8] hover:bg-[#F4F5F7] text-[13px] font-medium cursor-pointer shrink-0"
                      >
                        편집
                      </button>
                    )}
                  </div>

                  {editing && (
                    <div className="mt-4 pt-4 border-t border-[#F0F1F3] grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#555A64]">
                        슬러그
                        <input
                          value={draft.slug ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                          className="px-3 py-2 rounded-lg border border-[#E0E3E8] text-[13px] font-normal text-[#101317]"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#555A64]">
                        제휴 상태
                        <select
                          value={draft.commerce_status || "draft"}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              commerce_status: e.target.value as BrandCommerceStatus,
                            }))
                          }
                          className="px-3 py-2 rounded-lg border border-[#E0E3E8] text-[13px] font-normal text-[#101317]"
                        >
                          {(Object.keys(COMMERCE_STATUS_LABELS) as BrandCommerceStatus[]).map(
                            (s) => (
                              <option key={s} value={s}>
                                {COMMERCE_STATUS_LABELS[s]}
                              </option>
                            )
                          )}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#555A64]">
                        기본 커미션 (bps)
                        <input
                          type="number"
                          min={0}
                          max={10000}
                          value={draft.default_commission_rate_bps ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              default_commission_rate_bps:
                                e.target.value === "" ? null : Number(e.target.value),
                            }))
                          }
                          placeholder="예: 1500 = 15%"
                          className="px-3 py-2 rounded-lg border border-[#E0E3E8] text-[13px] font-normal text-[#101317]"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#555A64]">
                        플랫폼 컷 (bps)
                        <input
                          type="number"
                          min={0}
                          max={10000}
                          value={draft.default_platform_cut_bps ?? 1800}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              default_platform_cut_bps: Number(e.target.value),
                            }))
                          }
                          className="px-3 py-2 rounded-lg border border-[#E0E3E8] text-[13px] font-normal text-[#101317]"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#555A64]">
                        웹사이트
                        <input
                          value={draft.website_url ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, website_url: e.target.value }))
                          }
                          className="px-3 py-2 rounded-lg border border-[#E0E3E8] text-[13px] font-normal text-[#101317]"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#555A64]">
                        담당자 이메일
                        <input
                          value={draft.contact_email ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, contact_email: e.target.value }))
                          }
                          className="px-3 py-2 rounded-lg border border-[#E0E3E8] text-[13px] font-normal text-[#101317]"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#555A64] md:col-span-2">
                        메모
                        <textarea
                          value={draft.commerce_notes ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, commerce_notes: e.target.value }))
                          }
                          rows={2}
                          className="px-3 py-2 rounded-lg border border-[#E0E3E8] text-[13px] font-normal text-[#101317]"
                        />
                      </label>

                      <div className="md:col-span-2">
                        <div className="text-[12px] font-semibold text-[#555A64] mb-1.5">
                          선호 스타일 코드
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {STYLE_CODE_OPTIONS.map((code) => {
                            const on = (draft.preferred_style_codes || []).includes(code);
                            return (
                              <button
                                key={code}
                                type="button"
                                onClick={() => toggleStyle(code)}
                                className={`px-2 py-1 rounded-md text-[12px] font-mono font-bold cursor-pointer border ${
                                  on
                                    ? "bg-[#EDE8FF] border-[#D9CFFF] text-[#7A2CEE]"
                                    : "bg-white border-[#E0E3E8] text-[#717680]"
                                }`}
                              >
                                {code}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-1">
                        <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!draft.affiliate_ready}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, affiliate_ready: e.target.checked }))
                            }
                          />
                          제휴 준비 완료
                        </label>
                        <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draft.is_active !== false}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, is_active: e.target.checked }))
                            }
                          />
                          활성 (is_active)
                        </label>
                        <div className="ml-auto flex gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg border border-[#E0E3E8] text-[13px] font-medium cursor-pointer"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => save(brand.id)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg bg-[#101317] text-white text-[13px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {saving ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            저장
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
