"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, ScrollText, XCircle } from "lucide-react";
import { ItemCard, type JobItem } from "@/components/api-log/ItemCard";

const ITEM_PAGE_SIZE = 20;
const POLL_MS = 5000;

type JobStatus = "queued" | "priming" | "running" | "done" | "partial" | "failed";

interface Job {
  id: string;
  job_status: JobStatus;
  item_total: number;
  item_done: number;
  item_failed: number;
  request_meta: { file_name?: string; format?: string } | null;
  created_at: string;
  finished_at: string | null;
}

const JOB_STATUS: Record<JobStatus, { label: string; tone: string }> = {
  queued: { label: "대기", tone: "bg-[#F4F5F7] text-[#555A64]" },
  priming: { label: "대표 의복", tone: "bg-[#EDE8FF] text-[#7A2CEE]" },
  running: { label: "관찰 중", tone: "bg-[#EDE8FF] text-[#7A2CEE]" },
  done: { label: "완료", tone: "bg-[#E6F8ED] text-[#0E8A42]" },
  partial: { label: "일부 실패", tone: "bg-[#FFF6E6] text-[#D97706]" },
  failed: { label: "실패", tone: "bg-[#FFECEC] text-[#E52E2E]" },
};
const ACTIVE_JOB: JobStatus[] = ["queued", "priming", "running"];

type ItemFilter = "ok" | "failed";

const jobLabel = (j: Job) =>
  j.request_meta?.file_name || (j.request_meta?.format === "csv" ? "CSV (파일 이름 없음)" : `${j.request_meta?.format ?? "작업"} 요청`);

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

async function fetchResult(requestId: string, filter: ItemFilter, offset: number, limit: number): Promise<{ job: Job; items: JobItem[] }> {
  const params = new URLSearchParams({ requestId, filter, offset: String(offset), limit: String(limit) });
  const res = await fetch(`/api/public/test-demo?${params}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return { job: data.job, items: data.items || [] };
}

/**
 * 공개 결과 페이지 — /test-demo?requestId=<api_call_log.id>. 로그인 없이 본다(proxy.ts 의 OPEN_PATHS).
 * /admin/api-log 의 [링크] 아이콘이 연다. 상품마다 왼쪽 1/2 사진(대표 의복 영역 box) · 상품 정보 | 오른쪽 1/2 Style ID · 관찰 결과.
 */
export default function TestDemoPage() {
  return (
    <Suspense fallback={null}>
      <TestDemo />
    </Suspense>
  );
}

function TestDemo() {
  const requestId = useSearchParams().get("requestId")?.trim() ?? "";
  const [filter, setFilter] = useState<ItemFilter>("ok");
  const [job, setJob] = useState<Job | null>(null);
  const polling = Boolean(job && ACTIVE_JOB.includes(job.job_status));
  const st = job ? JOB_STATUS[job.job_status] : null;

  const filterBtn = (f: ItemFilter, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setFilter(f)}
      aria-pressed={filter === f}
      className={`px-2.5 py-0.5 rounded-full border cursor-pointer tabular-nums ${
        filter === f
          ? f === "ok"
            ? "bg-[#E6F8ED] text-[#0E8A42] border-[#C3EED3] font-semibold"
            : "bg-[#FFECEC] text-[#E52E2E] border-[#FFD0D0] font-semibold"
          : "bg-white border-[#E0E3E8] hover:bg-[#F4F5F7]"
      }`}
    >
      {label} {count}
    </button>
  );

  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#1D2330] select-text">
      <header className="sticky top-0 z-10 bg-white border-b border-[#E0E3E8] px-6 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-9 h-9 rounded-xl bg-[rgba(151,71,255,0.12)] text-[#9747FF] flex items-center justify-center">
            <ScrollText className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-[#101317] leading-tight">STMX Style ID 결과</h1>
            {job && (
              <p className="text-[12px] text-[#717680]">
                {jobLabel(job)} · {formatDateTime(job.created_at)}
              </p>
            )}
          </div>
        </div>
        {job && (
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#555A64]">
            {st && <span className={`px-1.5 rounded font-semibold ${st.tone}`}>{st.label}</span>}
            {filterBtn("ok", "완료", job.item_done)}
            {filterBtn("failed", "실패", job.item_failed)}
            <span>전체 {job.item_total}</span>
            {polling && (
              <span className="flex items-center gap-1 text-[#7A2CEE]">
                <RefreshCw className="w-3 h-3 animate-spin" /> 진행 중 — {POLL_MS / 1000}초마다 갱신
              </span>
            )}
          </div>
        )}
        {job && <span className="ml-auto font-mono text-[11px] text-[#8E96A2]">{job.id}</span>}
      </header>

      <main className="max-w-[1440px] mx-auto p-4 md:p-6">
        {!requestId ? (
          <Notice text="requestId 가 없습니다. 결과 링크를 다시 확인하세요." />
        ) : (
          <Results key={`${requestId}:${filter}`} requestId={requestId} filter={filter} polling={polling} onJob={setJob} />
        )}
      </main>
    </div>
  );
}

/** 거른 상품 목록 — requestId · 거르기가 바뀌면 key 로 새로 만든다 */
function Results({
  requestId,
  filter,
  polling,
  onJob,
}: {
  requestId: string;
  filter: ItemFilter;
  polling: boolean;
  onJob: (job: Job) => void;
}) {
  const [items, setItems] = useState<JobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(
    (job: Job) => {
      onJob(job);
      // 이 거르기로 보일 상품 수 — 완료 쪽은 아직 처리 중인 상품도 포함한다
      setTotal(filter === "failed" ? job.item_failed : job.item_total - job.item_failed);
    },
    [filter, onJob]
  );
  const fail = (err: unknown) => setError(err instanceof Error ? err.message : "결과를 불러오지 못했습니다.");

  useEffect(() => {
    let cancelled = false;
    fetchResult(requestId, filter, 0, ITEM_PAGE_SIZE)
      .then((r) => {
        if (cancelled) return;
        apply(r.job);
        setItems(r.items);
      })
      .catch((err) => !cancelled && fail(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [requestId, filter, apply]);

  // 진행 중이면 지금까지 불러온 만큼을 다시 읽는다
  const loaded = useRef(ITEM_PAGE_SIZE);
  useEffect(() => {
    loaded.current = Math.max(ITEM_PAGE_SIZE, items.length);
  }, [items.length]);
  useEffect(() => {
    if (!polling) return;
    const t = setInterval(() => {
      fetchResult(requestId, filter, 0, loaded.current)
        .then((r) => {
          apply(r.job);
          setItems(r.items);
        })
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
  }, [polling, requestId, filter, apply]);

  const loadMore = () => {
    setLoading(true);
    fetchResult(requestId, filter, items.length, ITEM_PAGE_SIZE)
      .then((r) => {
        apply(r.job);
        setItems((prev) => [...prev, ...r.items]);
      })
      .catch(fail)
      .finally(() => setLoading(false));
  };

  if (error) return <Notice text={error} />;
  return (
    <>
      {!loading && items.length === 0 && (
        <p className="py-16 text-center text-[13px] text-[#717680]">
          {filter === "failed" ? "실패한 상품이 없습니다." : "아직 결과가 있는 상품이 없습니다."}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {items.map((it) => (
          <ItemCard key={it.seq} it={it} details />
        ))}
      </ul>
      {loading && <div className="mt-4 h-60 rounded-2xl bg-[#F4F5F7] animate-pulse" />}
      {!loading && items.length < total && (
        <div className="flex justify-center pt-5">
          <button
            type="button"
            onClick={loadMore}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[#E0E3E8] bg-white text-[13px] font-medium text-[#323843] hover:bg-[#F4F5F7] cursor-pointer"
          >
            더 보기 ({items.length} / {total})
          </button>
        </div>
      )}
    </>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="p-6 rounded-2xl bg-[#FFECEC] border border-[#FFD0D0] text-[#E52E2E] flex flex-col items-center text-center">
      <XCircle className="w-8 h-8 mb-2" />
      <h3 className="font-bold text-[16px]">결과를 볼 수 없습니다</h3>
      <p className="text-[13px] mt-1 text-[#C42424]">{text}</p>
    </div>
  );
}
