"use client";

/* 상품 Style ID 목록 — 저장된 product_style 행을 최신 먼저 한 쪽에 12개씩 보여 준다.

   ┌ 상품 Style ID  N건                         [« ‹ 1 2 3 … › »] ┐
   │ ┌ 항목 ┐ ┌ 항목 ┐ ┌ 항목 ┐   ← 항목 하나 = 화면 너비의 1/3, 세로 스크롤 │
   │ │ 상품 사진       │                                          │
   │ │ 상품 정보 (/style-ex 의 상품 정보 칸과 같은 행)           │
   │ │ 판정 결과 (스타일 아이디 카드 + 판정 JSON)                │
   │ │ 관찰 결과 (관찰 envelope JSON)                            │
   └──────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import type { CatalogProduct } from "@/lib/tryon/product-catalog";
import { StyleIdCard, productRows, type LlmJudgement, type StyleIdResult } from "@/components/style-ex/result-cards";

const PAGE_SIZE = 12;

/** /api/product-style 의 행 */
interface ProductStyleRow {
  id: string;
  created_at: string;
  model_id: string;
  image_url: string;
  styleId: StyleIdResult;
  judgement: LlmJudgement | null;
  scoring: unknown;
  observation: unknown;
  vision_model: string | null;
  judge_model: string | null;
  elapsed_ms: number | null;
  product: CatalogProduct | null;
}

const fullDate = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

/** 현재 쪽 주변으로 보일 쪽 번호 — 처음 · 끝은 늘 보이고 사이는 … 로 줄인다 */
function pageWindow(page: number, pages: number): (number | "gap")[] {
  const keep = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((p) => p >= 1 && p <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

const NAV_BUTTON =
  "w-8 h-8 rounded-full flex items-center justify-center text-sm disabled:opacity-40 disabled:cursor-not-allowed";

export default function ProductStylePage() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ProductStyleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 쪽이 바뀌면 그 쪽을 불러온다. loading 은 쪽을 바꾸는 쪽(go)이 켜고, 여기서는 응답이 온 뒤에만 상태를 바꾼다.
  useEffect(() => {
    let stale = false;
    (async () => {
      let next: { rows: ProductStyleRow[]; total: number | null; error: string | null };
      try {
        const res = await authFetch(`/api/product-style?page=${page}&pageSize=${PAGE_SIZE}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        next = { rows: data.rows ?? [], total: data.total ?? 0, error: null };
      } catch (e) {
        next = { rows: [], total: null, error: e instanceof Error ? e.message : String(e) };
      }
      if (stale) return;
      setRows(next.rows);
      if (next.total !== null) setTotal(next.total);
      setError(next.error);
      setLoading(false);
    })();
    return () => {
      stale = true;
    };
  }, [page]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const go = (p: number) => {
    const next = Math.min(Math.max(1, p), pages);
    if (next === page) return;
    setLoading(true);
    setPage(next);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* 한 줄 — 왼쪽 제목 · 건수, 오른쪽 쪽 이동 버튼 */}
      <div className="flex-none flex items-center gap-3 px-4 py-2 border-b border-[var(--color-divider)] bg-[var(--color-panel)]">
        <h1 className="m-0 text-base font-semibold">상품 Style ID</h1>
        <span className="text-sm text-black/60">{total.toLocaleString("ko-KR")}건</span>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent-700)]" />}

        <nav aria-label="쪽 이동" className="ml-auto flex items-center gap-1">
          <button type="button" className={`${NAV_BUTTON} hover:bg-black/5`} onClick={() => go(1)} disabled={page <= 1} aria-label="첫 쪽">
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={`${NAV_BUTTON} hover:bg-black/5`}
            onClick={() => go(page - 1)}
            disabled={page <= 1}
            aria-label="이전 쪽"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {pageWindow(page, pages).map((p, i) =>
            p === "gap" ? (
              <span key={`gap-${i}`} className="w-6 text-center text-black/40">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => go(p)}
                aria-current={p === page ? "page" : undefined}
                className={`${NAV_BUTTON} ${p === page ? "bg-[rgba(182,130,53,0.16)] font-semibold" : "hover:bg-black/5"}`}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            className={`${NAV_BUTTON} hover:bg-black/5`}
            onClick={() => go(page + 1)}
            disabled={page >= pages}
            aria-label="다음 쪽"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={`${NAV_BUTTON} hover:bg-black/5`}
            onClick={() => go(pages)}
            disabled={page >= pages}
            aria-label="마지막 쪽"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </nav>
      </div>

      {/* 이 쪽의 행 — 항목 하나가 화면 너비의 1/3, 세로로 스크롤 */}
      <div className="flex-1 min-h-0 overflow-y-auto vt-scroll">
        {error && <p className="m-4 text-sm text-[var(--color-danger)]">{error}</p>}
        {!loading && !error && rows.length === 0 && (
          <p className="m-4 text-sm text-black/60">
            저장된 상품 Style ID 가 없습니다. Style ID 페이지에서 상품으로 추출하면 여기에 쌓입니다.
          </p>
        )}
        <div className="grid grid-cols-3 gap-4 p-4 items-start">
          {rows.map((row) => (
            <ProductStyleItem key={row.id} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 항목 하나 — 위에서 아래로 상품 사진 · 상품 정보 · 판정 결과 · 관찰 결과 */
function ProductStyleItem({ row }: { row: ProductStyleRow }) {
  const { observation, styleId, judgement, scoring, vision_model, judge_model, elapsed_ms } = row;
  const judged = { styleId, judgement, scoring, vision_model, judge_model, elapsed_ms };
  const productInfo: [string, string][] = row.product
    ? productRows(row.product)
    : [
        ["상품 ID", row.model_id],
        ["상품 정보", "카탈로그에서 찾지 못했습니다"],
      ];

  return (
    <article className="min-w-0 flex flex-col rounded-xl border border-[var(--color-divider)] bg-white overflow-hidden">
      {/* 상품 사진 — 추출에 쓴 원본 */}
      <a
        href={row.image_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-[var(--color-surface)]"
        title="원본 사진 열기"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 외부 상품 사진, 도메인이 정해져 있지 않다 */}
        <img
          src={row.image_url}
          alt={row.product?.name ?? row.model_id}
          loading="lazy"
          className="w-full aspect-square object-contain"
        />
      </a>

      {/* 상품 정보 — /style-ex 의 상품 정보 칸과 같은 행 */}
      <div className="px-3 py-2 border-b border-[var(--color-divider)] bg-[var(--color-panel)]">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs m-0">
          {productInfo.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-black/50">{label}</dt>
              <dd className="m-0 min-w-0 truncate text-black" title={value}>
                {label === "판매 페이지" ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--color-accent-700)] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3 flex-none" />
                    <span className="truncate">{value}</span>
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
          <div className="contents">
            <dt className="text-black/50">추출</dt>
            <dd className="m-0 min-w-0 truncate text-black">
              {fullDate(row.created_at)}
              {elapsed_ms !== null && ` · ${(elapsed_ms / 1000).toFixed(1)}초`}
            </dd>
          </div>
        </dl>
      </div>

      {/* 판정 결과 — 스타일 아이디 카드 + 판정 JSON (관찰 결과를 뺀 나머지) */}
      <section className="border-b border-[var(--color-divider)]">
        <h2 className="m-0 px-3 pt-2 text-sm font-semibold">판정 결과</h2>
        <StyleIdCard summary={{ styleId, judgement }} />
        <pre className="m-0 max-h-64 overflow-auto vt-scroll p-3 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap break-all select-text">
          {JSON.stringify(judged, null, 2)}
        </pre>
      </section>

      {/* 관찰 결과 — 관찰 envelope */}
      <section>
        <h2 className="m-0 px-3 pt-2 text-sm font-semibold">관찰 결과</h2>
        <pre className="m-0 max-h-80 overflow-auto vt-scroll p-3 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap break-all select-text">
          {JSON.stringify(observation, null, 2)}
        </pre>
      </section>
    </article>
  );
}
