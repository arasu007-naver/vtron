"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  MousePointerClick,
  X,
  type LucideIcon,
} from "lucide-react";
import LooxImageModal from "@/components/playground/LooxImageModal";
import ProductLinkSteps from "@/components/playground/ProductLinkSteps";
import { issueNaverToken } from "@/lib/playground/client";
import {
  detachFromLoox,
  fetchLoox,
  fetchLooxPage,
  type LooxPage,
  type LooxSort,
} from "@/lib/playground/loox-client";
import type { LooxPost } from "@/lib/playground/stmx-loox";
import type { NaverTokenResult } from "@/types/playground";

/**
 * 상품링크 페이지 — 상품링크 모달을 한 화면에 펼친 것.
 *
 *   ┌ 메뉴 1/6 ──────┬ 본 영역 5/6 ───────────────────────────────┐
 *   │ 토큰 발급       │ 페이지 단추                                │
 *   │ 최근 loox       │ Loox 목록 488px (사진 높이 480px)          │
 *   │ 일주일간 방문자수 ├────────────────────────────────────────────┤
 *   │                │ 붙일 Loox · 상품링크 3단계부터(남은 높이)  │
 *   └────────────────┴────────────────────────────────────────────┘
 *
 * 목록에서 고른 게시물이 'Loox에 붙이기' 의 대상이다. 사진을 누르면 그 게시물을 고르고
 * 화면 너비 · 높이의 80% 모달로 크게 보여준다.
 * 액세스 토큰은 플레이그라운드와 같이 메모리에만 둔다.
 */

const PAGE_SIZE = 12;
/** 페이지 번호 단추를 몇 개까지 늘어놓을지. */
const PAGE_WINDOW = 5;

type ListState =
  | { state: "idle" }
  | { state: "loading"; sort: LooxSort; page: number }
  | { state: "error"; sort: LooxSort; page: number; error: string }
  | { state: "done"; data: LooxPage };

const remaining = (token: NaverTokenResult, now: number) => {
  const left = token.issuedAt + token.expiresIn * 1000 - now;
  if (left <= 0) return "만료됨";
  const m = Math.floor(left / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분 남음` : `${m}분 남음`;
};

/** 지금 페이지를 가운데에 둔 번호들. */
const pageNumbers = (page: number, totalPages: number) => {
  const end = Math.min(totalPages, Math.max(page - Math.floor(PAGE_WINDOW / 2), 1) + PAGE_WINDOW - 1);
  const start = Math.max(1, end - PAGE_WINDOW + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

export default function ProductsToLinkPage() {
  const [token, setToken] = useState<NaverTokenResult | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [list, setList] = useState<ListState>({ state: "idle" });
  /** 상품을 붙일 게시물. */
  const [selected, setSelected] = useState<LooxPost | null>(null);
  /** 떼는 중인 상품 id. */
  const [detaching, setDetaching] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  /** 크게 보고 있는 게시물(이미지 모달). */
  const [viewing, setViewing] = useState<LooxPost | null>(null);
  /** 늦게 온 이전 요청이 새 목록을 덮지 않게. */
  const loadRef = useRef(0);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [token]);

  const expired = token ? token.issuedAt + token.expiresIn * 1000 <= now : false;
  const sort = list.state === "idle" ? null : list.state === "done" ? list.data.sort : list.sort;
  const pageNo = list.state === "idle" ? 1 : list.state === "done" ? list.data.page : list.page;
  const totalPages =
    list.state === "done" ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 0;

  const issue = async () => {
    setIssuing(true);
    setTokenError(null);
    const { token: issued, error } = await issueNaverToken();
    setIssuing(false);
    if (error || !issued) {
      setTokenError(error ?? "토큰을 받지 못했습니다.");
      setToken(null);
      return;
    }
    setToken(issued);
    setNow(Date.now());
  };

  const load = async (nextSort: LooxSort, page: number) => {
    const run = ++loadRef.current;
    setList({ state: "loading", sort: nextSort, page });
    const outcome = await fetchLooxPage(nextSort, page, PAGE_SIZE);
    if (loadRef.current !== run) return;
    if ("error" in outcome) {
      setList({ state: "error", sort: nextSort, page, error: outcome.error });
      return;
    }
    setList({ state: "done", data: outcome.value });
    // 아직 고른 게시물이 없으면 첫 게시물을 붙일 대상으로 둔다.
    setSelected((prev) => prev ?? outcome.value.posts[0] ?? null);
  };

  /** 붙이거나 뗀 뒤 그 게시물만 다시 읽어 선택과 목록에 반영한다. */
  const refreshPost = async (postId: string) => {
    const next = await fetchLoox(postId);
    if (next.state === "error") {
      setPostError(next.error);
      return;
    }
    if (next.state !== "done" || !next.post) return;
    const post = next.post;
    setSelected((prev) => (prev?.id === post.id ? post : prev));
    setList((prev) =>
      prev.state === "done"
        ? {
            ...prev,
            data: {
              ...prev.data,
              posts: prev.data.posts.map((p) => (p.id === post.id ? post : p)),
            },
          }
        : prev
    );
  };

  const detach = async (productId: string) => {
    if (!selected) return;
    setDetaching(productId);
    setPostError(null);
    const failure = await detachFromLoox(selected.id, productId);
    setDetaching(null);
    if (failure) {
      setPostError(failure);
      return;
    }
    await refreshPost(selected.id);
  };

  return (
    <div className="h-full min-h-0 flex">
      {/* 메뉴 — 전체 너비의 1/6 */}
      <aside className="basis-1/6 flex-none min-w-[210px] border-r border-[var(--pg-line)] bg-[var(--color-panel)] p-3 flex flex-col gap-3 overflow-y-auto vt-scroll">
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={issue}
            disabled={issuing}
            className="w-full px-2.5 py-1.5 text-[20.7px] rounded btn btn-primary flex items-center justify-center gap-1 disabled:opacity-60"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {issuing ? "발급 중…" : token ? "토큰 재발급" : "토큰 발급"}
          </button>
          {token ? (
            <span className="flex items-center gap-1.5 flex-wrap text-[18.9px]">
              <span className={`pg-status ${expired ? "pg-status-4" : "pg-status-2"}`}>
                {expired ? "만료" : "발급됨"}
              </span>
              <span className="text-black/60">{remaining(token, now)}</span>
            </span>
          ) : (
            <span className="text-[18.9px] text-black/60">
              토큰이 없으면 상품 조회가 401 로 막힙니다.
            </span>
          )}
          {tokenError && <pre className="pg-code text-black">{tokenError}</pre>}
        </div>

        <div className="border-t border-[var(--pg-line)]" />

        <nav aria-label="Loox 목록" className="flex flex-col gap-1">
          <MenuButton
            icon={CalendarClock}
            label="최근 loox"
            hint="최근 발행 순"
            active={sort === "recent"}
            onClick={() => void load("recent", 1)}
          />
          <MenuButton
            icon={MousePointerClick}
            label="일주일간 방문자수"
            hint="click count 큰 순"
            active={sort === "visits"}
            onClick={() => void load("visits", 1)}
          />
        </nav>
      </aside>

      {/* 본 영역 — 나머지 5/6. 위는 페이지 단추 + 높이 488px 의 Loox 목록, 아래가 남은 높이를 쓴다. */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* 위 — 페이지 단추 · Loox 목록 */}
        <section className="flex-none border-b border-[var(--pg-line)] flex flex-col">
          <div className="px-4 py-2 border-b border-[var(--pg-line)] flex items-center gap-3 flex-wrap">
            <Pagination
              page={pageNo}
              totalPages={totalPages}
              disabled={!sort || list.state === "loading"}
              onPage={(page) => sort && void load(sort, page)}
            />
            <span className="text-[19.8px] text-black/60">
              {list.state === "idle"
                ? "왼쪽에서 '최근 loox' 또는 '일주일간 방문자수' 를 누르세요."
                : list.state === "loading"
                  ? "불러오는 중…"
                  : list.state === "error"
                    ? "불러오지 못했습니다."
                    : `${list.data.sort === "recent" ? "최근 loox" : "일주일간 방문자수"} · 총 ${list.data.total.toLocaleString()}건 · ${list.data.page} / ${totalPages} 페이지${
                        list.data.since
                          ? ` · ${new Date(list.data.since).toLocaleDateString("ko-KR")} 이후 클릭`
                          : ""
                      }`}
            </span>
            {list.state === "done" && list.data.visitsError && (
              <span className="text-[18.9px] text-black/55" title={list.data.visitsError}>
                누적 방문자수 없음 — {list.data.visitsError}
              </span>
            )}
          </div>

          {/* 목록 488px = 사진 480px + 위아래 여백 4px. 크기는 인라인 — 임의값 클래스는 dev 서버가
              새로 스캔하기 전까지 CSS 에 없을 수 있다. */}
          <div
            style={{ height: 488 }}
            className="px-4 py-1 overflow-x-auto overflow-y-hidden vt-scroll"
          >
            {list.state === "error" && (
              <p className="m-0 text-[18.9px] text-[#b42318] whitespace-pre-wrap">{list.error}</p>
            )}
            {list.state === "done" && list.data.posts.length === 0 && (
              <p className="m-0 text-[19.8px] text-black/55">게시물이 없습니다.</p>
            )}
            {list.state === "done" && list.data.posts.length > 0 && (
              <ul className="list-none m-0 p-0 h-full flex gap-2">
                {list.data.posts.map((post) => (
                  <li key={post.id} className="h-full flex-none">
                    <LooxCard
                      post={post}
                      weeklyVisits={list.data.weeklyVisits?.[post.id]}
                      selected={selected?.id === post.id}
                      onSelect={() => {
                        setSelected(post);
                        setPostError(null);
                        setViewing(post);
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 아래 — 붙일 Loox · 상품링크 3단계부터 */}
        <div className="flex-1 min-h-0 overflow-y-auto vt-scroll flex flex-col">
          <TargetPost post={selected} busy={detaching} error={postError} onDetach={detach} />
          <ProductLinkSteps
            token={token}
            post={selected}
            onPostChanged={refreshPost}
            pickPostHint="위 Loox 목록에서 상품을 붙일 게시물을 고르세요."
          />
        </div>
      </div>

      <LooxImageModal
        key={viewing?.id ?? "none"}
        post={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full text-left px-2.5 py-2 rounded border transition-colors ${
        active
          ? "bg-white border-[var(--pg-line-strong)]"
          : "border-transparent hover:bg-[rgba(32,31,29,0.05)]"
      }`}
    >
      <span className="flex items-center gap-1.5">
        <Icon className="w-4 h-4 flex-none text-[var(--color-accent-700)]" />
        <span className={`text-[21.6px] text-black ${active ? "font-semibold" : ""}`}>{label}</span>
      </span>
      <span className="block mt-0.5 pl-[22px] text-[18px] text-black/55">{hint}</span>
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  disabled,
  onPage,
}: {
  page: number;
  totalPages: number;
  disabled: boolean;
  onPage: (page: number) => void;
}) {
  const last = Math.max(totalPages, 1);
  const base =
    "min-w-9 h-9 px-2 text-[19.8px] rounded btn flex items-center justify-center disabled:opacity-40";
  return (
    <div role="group" aria-label="페이지" className="flex items-center gap-1">
      <button
        type="button"
        aria-label="첫 페이지"
        className={`${base} btn-secondary`}
        disabled={disabled || page <= 1}
        onClick={() => onPage(1)}
      >
        <ChevronsLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="이전 페이지"
        className={`${base} btn-secondary`}
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pageNumbers(page, last).map((n) => (
        <button
          key={n}
          type="button"
          aria-current={n === page ? "page" : undefined}
          className={`${base} ${n === page ? "btn-primary" : "btn-secondary"}`}
          disabled={disabled || n === page}
          onClick={() => onPage(n)}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        aria-label="다음 페이지"
        className={`${base} btn-secondary`}
        disabled={disabled || page >= last}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="마지막 페이지"
        className={`${base} btn-secondary`}
        disabled={disabled || page >= last}
        onClick={() => onPage(last)}
      >
        <ChevronsRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * 목록의 게시물 한 장 — 첫 이미지와 발행일 · 스타일 코드 · 착장 상품 수 · 방문자수.
 * 방문자수 = stmx-web 게시물 상세의 좋아요 · 댓글 · 공유 · 관심 버튼 클릭 수.
 */
function LooxCard({
  post,
  weeklyVisits,
  selected,
  onSelect,
}: {
  post: LooxPost;
  /** '일주일간 방문자수' 목록일 때만 온다. */
  weeklyVisits?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const cover = post.images[0];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={post.styleNote ?? `post ${post.id}`}
      aria-label="사진 크게 보기 · 붙일 Loox 로 고르기"
      // 사진 높이를 480px 로 지키려고 테두리 대신 box-shadow(자리를 차지하지 않음)로 선택을 표시한다.
      // 크기 · 선택 표시는 인라인 — 임의값 클래스는 dev 서버가 새로 스캔하기 전까지 CSS 에 없을 수 있다.
      style={{
        width: 360,
        height: 480,
        boxShadow: selected
          ? "0 0 0 3px var(--color-accent)"
          : "0 0 0 1px var(--pg-line)",
      }}
      className="relative block flex-none rounded-md overflow-hidden bg-black/5 text-left"
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover.url}
          alt={`Loox ${post.id}`}
          loading="lazy"
          style={{ width: 360, height: 480 }}
          className="block object-cover"
        />
      ) : (
        <span className="h-full flex items-center justify-center text-[18px] text-black/40">
          이미지 없음
        </span>
      )}
      {/* 정보는 사진 아래쪽에 겹쳐 둔다 — 글줄을 따로 두면 카드가 480px 를 넘는다. */}
      <span
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))" }}
        className="absolute inset-x-0 bottom-0 px-2.5 pt-10 pb-2 flex flex-col gap-0.5 text-white"
      >
        <span className="text-[18px]">
          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("ko-KR") : "발행일 없음"}
        </span>
        <span className="flex items-center gap-1.5 text-[18px] text-white/80">
          {post.styleCode && <span className="font-semibold text-white">{post.styleCode}</span>}
          상품 {post.products.length}
          {post.images.length > 1 && <span>· 사진 {post.images.length}장</span>}
        </span>
        {weeklyVisits !== undefined ? (
          <span className="text-[18px] font-semibold" title="최근 7일 액션 버튼 클릭 수">
            7일 방문 {weeklyVisits.toLocaleString("ko-KR")}
          </span>
        ) : (
          post.visits && (
            <span className="text-[18px] text-white/80" title="누적 액션 버튼 클릭 수">
              방문 {post.visits.visitCount.toLocaleString("ko-KR")}
            </span>
          )
        )}
      </span>
    </button>
  );
}

/** 붙일 대상 게시물과 거기 걸린 착장 상품. 떼기는 여기서 한다. */
function TargetPost({
  post,
  busy,
  error,
  onDetach,
}: {
  post: LooxPost | null;
  busy: string | null;
  error: string | null;
  onDetach: (productId: string) => void;
}) {
  return (
    <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[20.7px] font-semibold text-black">붙일 Loox</span>
        {post ? (
          <>
            {post.styleCode && <span className="pg-status pg-status-2">{post.styleCode}</span>}
            <span className="text-[19.8px] text-black">
              {post.publishedAt ? new Date(post.publishedAt).toLocaleString("ko-KR") : "발행일 없음"}
            </span>
            <span className="text-[19.8px] text-black/55">착장 상품 {post.products.length}개</span>
            <code className="text-[18px] text-black/45">post {post.id}</code>
          </>
        ) : (
          <span className="text-[19.8px] text-black/60">위 목록에서 게시물을 고르세요.</span>
        )}
      </div>
      {post && post.products.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {post.products.map((product) => (
            <span
              key={product.id}
              className="flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full border border-[var(--pg-line)] bg-white text-[18.9px]"
            >
              <span className="font-semibold text-black">{product.brandName}</span>
              <span className="text-black max-w-[260px] truncate" title={product.name}>
                {product.name}
              </span>
              <button
                type="button"
                onClick={() => onDetach(product.id)}
                disabled={busy !== null}
                aria-label={`${product.name} 떼기`}
                title="이 게시물에서 떼기 (상품 마스터는 남긴다)"
                className="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center disabled:opacity-40"
              >
                {busy === product.id ? "…" : <X className="w-3 h-3" />}
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <p className="m-0 text-[18.9px] text-[#b42318] whitespace-pre-wrap">{error}</p>}
    </section>
  );
}
