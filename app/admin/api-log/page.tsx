"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileUp, Link2, RefreshCw, RotateCcw, ScrollText, Search, XCircle } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { ItemCard, type JobItem } from "@/components/api-log/ItemCard";
import { PRIMARY_BTN, SECONDARY_BTN, StatusBadge, formatDateTime } from "@/components/api-mng/ui";
import type { BusinessUser } from "@/types/business-user";

const BIZ_PAGE_SIZE = 10;
const JOB_PAGE_SIZE = 50;
const ITEM_PAGE_SIZE = 20;
const POLL_MS = 5000;

type JobStatus = "queued" | "priming" | "running" | "done" | "partial" | "failed";

interface Job {
  id: string;
  path: string;
  job_status: JobStatus;
  item_total: number;
  item_done: number;
  item_failed: number;
  request_meta: { file_name?: string; format?: string; via?: string } | null;
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


const jobLabel = (j: Job) =>
  j.request_meta?.file_name || (j.request_meta?.format === "csv" ? "CSV (파일 이름 없음)" : `${j.request_meta?.format ?? "작업"} 요청`);

/**
 * API 로그 — API 키를 발급한 업체별 대량 Style ID 호출(api_call_log 작업)과 상품마다 결과 · 추출 요소.
 *   위   업체 페이지 · 검색 · 업체 칩, [CSV 입력]은 선택 업체로 작업을 넣는다 (POST /api/admin/business-users/:id/jobs)
 *   왼쪽 1/4  선택 업체의 호출(CSV 파일 이름 · 호출 시각 최근 순)
 *   오른쪽 3/4 선택 호출의 상품 — 사진 | Style ID · 축 글자 + 관찰 요소 트리
 */
export default function ApiLogPage() {
  // 업체 ---------------------------------------------------------------
  const [bizItems, setBizItems] = useState<BusinessUser[]>([]);
  const [bizTotal, setBizTotal] = useState(0);
  const [bizPage, setBizPage] = useState(1);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [bizLoading, setBizLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bizId, setBizId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBizLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(bizPage), pageSize: String(BIZ_PAGE_SIZE), hasToken: "1" });
        if (q) params.set("q", q);
        const res = await authFetch(`/api/admin/business-users?${params}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
        if (cancelled) return;
        const list: BusinessUser[] = data.items || [];
        setBizItems(list);
        setBizTotal(data.total || 0);
        setBizId((prev) => (prev && list.some((b) => b.id === prev) ? prev : list[0]?.id ?? null));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "업체 목록을 불러오지 못했습니다.");
        setBizItems([]);
        setBizTotal(0);
      } finally {
        if (!cancelled) setBizLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bizPage, q]);

  const bizPages = Math.max(1, Math.ceil(bizTotal / BIZ_PAGE_SIZE));
  const biz = bizItems.find((b) => b.id === bizId) ?? null;

  // 호출(작업) ------------------------------------------------------------
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsReload, setJobsReload] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  const applyJobs = (list: Job[]) => {
    setJobs(list);
    setJobId((prev) => (prev && list.some((j) => j.id === prev) ? prev : list[0]?.id ?? null));
  };

  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchJobList(bizId);
        if (!cancelled) applyJobs(list);
      } catch (err) {
        if (cancelled) return;
        applyJobs([]);
        setError(err instanceof Error ? err.message : "호출 목록을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bizId, jobsReload]);

  /** 새로고침 · 진행 중 갱신 — silent 면 로딩 표시 · 오류를 띄우지 않는다 */
  const fetchJobs = useCallback(
    (silent = false) => {
      if (!silent) setJobsLoading(true);
      setJobsReload((n) => n + 1);
    },
    []
  );

  const job = jobs.find((j) => j.id === jobId) ?? null;

  // 진행 중인 작업이면 호출 목록을 주기적으로 다시 읽는다 (상품은 JobItems 가 다시 읽는다)
  const polling = Boolean(job && ACTIVE_JOB.includes(job.job_status));
  useEffect(() => {
    if (!polling) return;
    const t = setInterval(() => fetchJobs(true), POLL_MS);
    return () => clearInterval(t);
  }, [polling, fetchJobs]);

  // CSV 입력 -----------------------------------------------------------
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const canUpload = Boolean(biz && biz.status === "active" && biz.token_prefix);

  const uploadCsv = async (file: File) => {
    if (!biz) return;
    setUploading(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append("csv", file, file.name);
      const res = await authFetch(`/api/admin/business-users/${biz.id}/jobs`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setNotice({ ok: true, text: `${file.name} — 상품 ${data.total}개를 ${biz.business_name} 작업으로 넣었습니다.` });
      setJobId(data.job_id);
      fetchJobs(true);
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "CSV 를 보내지 못했습니다." });
    } finally {
      setUploading(false);
    }
  };

  // 재개 -------------------------------------------------------------
  const [resuming, setResuming] = useState<string | null>(null);
  const resumeJob = async (j: Job) => {
    if (!bizId) return;
    setResuming(j.id);
    setNotice(null);
    try {
      const res = await authFetch(`/api/admin/business-users/${bizId}/jobs/${j.id}/resume`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      const back = data.reprimed + data.requeued;
      setNotice({
        ok: true,
        text: `${jobLabel(j)} — ${back ? `상품 ${back}개를 다시 진행합니다` : "큐를 다시 돌립니다"}${data.skipped ? ` (업로드 사진이 지워진 ${data.skipped}개 제외)` : ""}.`,
      });
      setJobId(j.id);
      fetchJobs(true);
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "재개하지 못했습니다." });
    } finally {
      setResuming(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA] text-[#1D2330] overflow-hidden">
      <header className="flex-none bg-white border-b border-[#E0E3E8] px-6 py-3 flex flex-col gap-2.5">
        {/* 1줄 — CSV 입력 | 업체 페이지 · 검색 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <div className="w-9 h-9 rounded-xl bg-[rgba(151,71,255,0.12)] text-[#9747FF] flex items-center justify-center">
              <ScrollText className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-[18px] font-bold tracking-tight text-[#101317]">API 로그</h1>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) uploadCsv(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!canUpload || uploading}
            className={PRIMARY_BTN}
            title={canUpload ? `${biz?.business_name} 의 API 키(${biz?.token_prefix}…)로 Style ID 추출 작업을 넣습니다` : "API 키가 활성인 업체를 고르세요"}
          >
            {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
            CSV 입력
          </button>
          {notice && (
            <span className={`text-[12px] truncate max-w-[420px] ${notice.ok ? "text-[#0E8A42]" : "text-[#E52E2E]"}`} title={notice.text}>
              {notice.text}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center bg-[#F4F5F7] rounded-lg p-0.5 border border-[#E0E3E8]">
              <button
                type="button"
                disabled={bizPage <= 1}
                onClick={() => setBizPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white disabled:opacity-40 cursor-pointer"
                aria-label="이전 업체 페이지"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-[12px] text-[#555A64] tabular-nums">
                {bizPage} / {bizPages}
              </span>
              <button
                type="button"
                disabled={bizPage >= bizPages}
                onClick={() => setBizPage((p) => p + 1)}
                className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white disabled:opacity-40 cursor-pointer"
                aria-label="다음 업체 페이지"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                setBizPage(1);
                setQ(qInput.trim());
              }}
            >
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="업체 검색"
                className="px-3 py-1.5 h-9 rounded-lg border border-[#E0E3E8] bg-white text-[13px] w-48 focus:outline-none focus:ring-2 focus:ring-[rgba(151,71,255,0.25)]"
              />
              <button type="submit" className="w-9 h-9 rounded-lg bg-[#101317] text-white flex items-center justify-center cursor-pointer" aria-label="검색">
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* 2줄 — 이 페이지의 업체 칩 */}
        <div className="flex flex-wrap items-center gap-1.5 min-h-8">
          {bizLoading && bizItems.length === 0 ? (
            [1, 2, 3].map((i) => <div key={i} className="h-7 w-24 rounded-full bg-[#F4F5F7] animate-pulse" />)
          ) : bizItems.length === 0 ? (
            <span className="text-[13px] text-[#717680]">API 키를 발급한 업체가 없습니다.</span>
          ) : (
            bizItems.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  if (b.id === bizId) return;
                  setJobs([]);
                  setJobsLoading(true);
                  setBizId(b.id);
                }}
                title={`${b.token_prefix ?? ""}… · ${b.status}`}
                className={`px-3 h-7 rounded-full text-[12.5px] font-medium border cursor-pointer transition-colors ${
                  b.id === bizId
                    ? "bg-[#101317] text-white border-[#101317]"
                    : "bg-white text-[#323843] border-[#E0E3E8] hover:bg-[#F4F5F7]"
                } ${b.status !== "active" ? "opacity-60" : ""}`}
              >
                {b.business_name}
              </button>
            ))
          )}
          {biz && biz.status !== "active" && (
            <span className="ml-1">
              <StatusBadge status={biz.status} />
            </span>
          )}
        </div>
      </header>

      {error ? (
        <div className="m-6 p-6 rounded-2xl bg-[#FFECEC] border border-[#FFD0D0] text-[#E52E2E] flex flex-col items-center text-center">
          <XCircle className="w-8 h-8 mb-2" />
          <h3 className="font-bold text-[16px]">데이터 로드 실패</h3>
          <p className="text-[13px] mt-1 text-[#C42424]">{error}</p>
        </div>
      ) : (
        <main className="flex-1 min-h-0 grid grid-cols-4">
          {/* 왼쪽 1/4 — 호출 목록 */}
          <aside className="col-span-1 min-h-0 flex flex-col border-r border-[#E0E3E8] bg-white">
            <div className="flex-none flex items-center justify-between px-4 py-2.5 border-b border-[#F0F1F3]">
              <span className="text-[12px] font-semibold text-[#717680]">호출 {jobs.length}건</span>
              <button type="button" onClick={() => fetchJobs()} disabled={!bizId || jobsLoading} className={`${SECONDARY_BTN} !h-7 !px-2`}>
                <RefreshCw className={`w-3.5 h-3.5 ${jobsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto vt-scroll">
              {bizId && jobsLoading && jobs.length === 0 ? (
                [1, 2, 3].map((i) => (
                  <li key={i} className="px-4 py-3">
                    <div className="h-9 rounded bg-[#F4F5F7] animate-pulse" />
                  </li>
                ))
              ) : jobs.length === 0 ? (
                <li className="px-4 py-10 text-center text-[13px] text-[#717680]">{bizId ? "호출 내역이 없습니다." : "업체를 고르세요."}</li>
              ) : (
                jobs.map((j) => {
                  const st = JOB_STATUS[j.job_status];
                  return (
                    <li key={j.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setJobId(j.id)}
                        className={`w-full text-left px-4 py-2.5 border-b border-[#F4F5F7] cursor-pointer ${
                          j.id === jobId ? "bg-[#F5F0FF] border-l-2 border-l-[#9747FF]" : "hover:bg-[#FAFAFB]"
                        }`}
                      >
                        <div className={`text-[13px] font-semibold text-[#101317] truncate ${j.job_status !== "done" ? "pr-14" : "pr-7"}`} title={jobLabel(j)}>
                          {jobLabel(j)}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#717680]">
                          <span className="tabular-nums">{formatDateTime(j.created_at)}</span>
                          <span className={`px-1.5 rounded font-semibold ${st?.tone ?? ""}`}>{st?.label ?? j.job_status}</span>
                          <span className="tabular-nums ml-auto">
                            {j.item_done + j.item_failed}/{j.item_total}
                          </span>
                        </div>
                      </button>
                      {/* 버튼 안에 버튼을 둘 수 없어 겹쳐 놓는다 —
                          공개 결과 링크(/test-demo, 로그인 없이 본다) · 끝나지 않은 작업이면 재개(실패한 상품을 큐로 되돌려 다시 진행) */}
                      <div className="absolute right-3 top-2 flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => window.open(`/test-demo?requestId=${encodeURIComponent(j.id)}`)}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[#555A64] hover:text-[#7A2CEE] hover:bg-[#EDE8FF] cursor-pointer"
                          title="공개 결과 페이지 열기 — 로그인 없이 이 호출의 결과를 봅니다"
                          aria-label={`${jobLabel(j)} 공개 결과 페이지 열기`}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                        {j.job_status !== "done" && (
                          <button
                            type="button"
                            onClick={() => resumeJob(j)}
                            disabled={resuming === j.id}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[#7A2CEE] hover:bg-[#EDE8FF] disabled:opacity-50 cursor-pointer"
                            title="재개 — 실패한 상품을 다시 진행합니다"
                            aria-label={`${jobLabel(j)} 재개`}
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${resuming === j.id ? "animate-spin [animation-direction:reverse]" : ""}`} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          {/* 오른쪽 3/4 — 상품 목록 */}
          <section className="col-span-3 min-h-0 overflow-y-auto vt-scroll p-4">
            {!job || !bizId ? (
              <p className="py-16 text-center text-[13px] text-[#717680]">호출을 고르면 상품별 Style ID 가 여기에 보입니다.</p>
            ) : (
              <JobItems key={job.id} bizId={bizId} job={job} polling={polling} />
            )}
          </section>
        </main>
      )}
    </div>
  );
}

async function fetchJobList(bizId: string): Promise<Job[]> {
  const res = await authFetch(`/api/admin/business-users/${bizId}/jobs?pageSize=${JOB_PAGE_SIZE}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data.items || [];
}

/** 상품 목록 거르기 — ok = 실패하지 않은 상품(기본), failed = 실패한 상품 */
type ItemFilter = "ok" | "failed";

async function fetchJobItems(bizId: string, jobId: string, filter: ItemFilter, offset: number, limit: number): Promise<JobItem[]> {
  const res = await authFetch(`/api/admin/business-users/${bizId}/jobs/${jobId}?offset=${offset}&limit=${limit}&filter=${filter}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data.items || [];
}

/** 선택한 호출의 상품 목록 — 호출이 바뀌면 key 로 새로 만든다. [완료] · [실패] 레이블로 거른다 */
function JobItems({ bizId, job, polling }: { bizId: string; job: Job; polling: boolean }) {
  const [filter, setFilter] = useState<ItemFilter>("ok");
  const filterBtn = (f: ItemFilter, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setFilter(f)}
      aria-pressed={filter === f}
      title={f === "ok" ? "실패하지 않은 상품 보기" : "실패한 상품만 보기"}
      className={`px-2 py-0.5 rounded-full border cursor-pointer tabular-nums ${
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
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-[#555A64]">
        <span className="font-semibold text-[#101317]">{jobLabel(job)}</span>
        <span>·</span>
        {filterBtn("ok", "완료", job.item_done)}
        {filterBtn("failed", "실패", job.item_failed)}
        <span>전체 {job.item_total}</span>
        {job.request_meta?.via === "admin" && <span className="px-1.5 rounded bg-[#F4F5F7] text-[11px]">관리자 입력</span>}
        {polling && (
          <span className="flex items-center gap-1 text-[#7A2CEE]">
            <RefreshCw className="w-3 h-3 animate-spin" /> 진행 중 — {POLL_MS / 1000}초마다 갱신
          </span>
        )}
        <span className="ml-auto font-mono text-[11px] text-[#8E96A2]">{job.id}</span>
      </div>
      <ItemList key={filter} bizId={bizId} job={job} filter={filter} polling={polling} />
    </>
  );
}

/** 거른 상품 목록 — 거르기가 바뀌면 key 로 새로 만든다 */
function ItemList({ bizId, job, filter, polling }: { bizId: string; job: Job; filter: ItemFilter; polling: boolean }) {
  const [items, setItems] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (offset: number, limit: number, replace: boolean) => {
      const next = await fetchJobItems(bizId, job.id, filter, offset, limit);
      setItems((prev) => (replace ? next : [...prev, ...next]));
    },
    [bizId, job.id, filter]
  );
  const fail = (err: unknown) => setError(err instanceof Error ? err.message : "상품을 불러오지 못했습니다.");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchJobItems(bizId, job.id, filter, 0, ITEM_PAGE_SIZE);
        if (!cancelled) setItems(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "상품을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bizId, job.id, filter]);

  // 진행 중이면 지금까지 불러온 만큼을 다시 읽는다
  const loaded = useRef(ITEM_PAGE_SIZE);
  useEffect(() => {
    loaded.current = Math.max(ITEM_PAGE_SIZE, items.length);
  }, [items.length]);
  useEffect(() => {
    if (!polling) return;
    const t = setInterval(() => load(0, loaded.current, true).catch(() => {}), POLL_MS);
    return () => clearInterval(t);
  }, [polling, load]);

  /** 이 거르기로 보일 상품 수 — 완료 쪽은 아직 처리 중인 상품도 포함한다 */
  const shown = filter === "failed" ? job.item_failed : job.item_total - job.item_failed;

  const loadMore = () => {
    setLoading(true);
    load(items.length, ITEM_PAGE_SIZE, false)
      .catch(fail)
      .finally(() => setLoading(false));
  };

  return (
    <>
      {error && <p className="mb-3 text-[13px] text-[#E52E2E]">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="py-16 text-center text-[13px] text-[#717680]">
          {filter === "failed" ? "실패한 상품이 없습니다." : "아직 결과가 있는 상품이 없습니다."}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {items.map((it) => (
          <ItemCard key={it.seq} it={it} />
        ))}
      </ul>
      {loading && <div className="mt-3 h-40 rounded-2xl bg-[#F4F5F7] animate-pulse" />}
      {!loading && items.length < shown && (
        <div className="flex justify-center pt-4">
          <button type="button" onClick={loadMore} className={SECONDARY_BTN}>
            더 보기 ({items.length} / {shown})
          </button>
        </div>
      )}
    </>
  );
}
