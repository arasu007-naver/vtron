"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { formatDateTime } from "./ui";

interface ApiCall {
  id: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  error: string | null;
  response_meta: { style_id?: string } | null;
  ip: string | null;
  token_prefix: string | null;
  created_at: string;
}

const PAGE_SIZE = 10;

function statusTone(code: number) {
  if (code < 300) return "text-[#0E8A42]";
  if (code < 500) return "text-[#D97706]";
  return "text-[#E52E2E]";
}

/** 업체의 외부 API 호출 내역(api_call_log) — 상세 모달 아래에 붙는다 */
export function ApiCallLogList({ businessUserId }: { businessUserId: string }) {
  const [items, setItems] = useState<ApiCall[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 새로고침은 reloadKey 를 올려 다시 부른다. 로딩 표시는 부르는 쪽(새로고침 · 쪽 이동)이 켠다.
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/admin/business-users/${businessUserId}/calls?page=${page}&pageSize=${PAGE_SIZE}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
        if (cancelled) return;
        setError(null);
        setItems(data.items);
        setTotal(data.total);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "호출 내역을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessUserId, page, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mt-5 pt-4 border-t border-[#F0F1F3]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-bold text-[#101317]">
          API 호출 내역 <span className="text-[12px] font-medium text-[#8E96A2]">총 {total}건</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setReloadKey((k) => k + 1);
          }}
          disabled={loading} className="text-[12px] text-[#717680] flex items-center gap-1 cursor-pointer">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </button>
      </div>
      {error ? (
        <p className="text-[12px] text-[#E52E2E]">
          {error} — 마이그레이션 <code>0019_api_call_log.sql</code> 적용 여부를 확인하세요.
        </p>
      ) : items.length === 0 ? (
        <p className="text-[12px] text-[#8E96A2] py-3">{loading ? "불러오는 중…" : "호출 내역이 없습니다."}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#EBECEF]">
          <table className="w-full text-[12px] min-w-[640px]">
            <thead>
              <tr className="text-left text-[#717680] bg-[#F8F9FA]">
                <th className="px-3 py-2 font-semibold">시각</th>
                <th className="px-3 py-2 font-semibold">요청</th>
                <th className="px-3 py-2 font-semibold">상태</th>
                <th className="px-3 py-2 font-semibold">소요</th>
                <th className="px-3 py-2 font-semibold">결과 · 사유</th>
                <th className="px-3 py-2 font-semibold">Request ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-[#F4F5F7] align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-[#555A64]">{formatDateTime(c.created_at)}</td>
                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                    {c.method} {c.path}
                  </td>
                  <td className={`px-3 py-2 font-bold ${statusTone(c.status_code)}`}>{c.status_code}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#555A64]">{(c.duration_ms / 1000).toFixed(1)}s</td>
                  <td className="px-3 py-2 text-[#323843] max-w-[260px]">
                    {c.response_meta?.style_id ? (
                      <span className="font-mono font-bold text-[#7A2CEE]">{c.response_meta.style_id}</span>
                    ) : c.error ? (
                      <span className="text-[#8E96A2] line-clamp-2" title={c.error}>
                        {c.error}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[#8E96A2] select-all">{c.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-2 text-[12px]">
          <button type="button" disabled={page <= 1} onClick={() => {
              setLoading(true);
              setPage((p) => p - 1);
            }} className="px-2 py-1 rounded border border-[#E0E3E8] disabled:opacity-40 cursor-pointer">
            이전
          </button>
          <span className="text-[#717680]">
            {page} / {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => {
              setLoading(true);
              setPage((p) => p + 1);
            }} className="px-2 py-1 rounded border border-[#E0E3E8] disabled:opacity-40 cursor-pointer">
            다음
          </button>
        </div>
      )}
    </div>
  );
}
