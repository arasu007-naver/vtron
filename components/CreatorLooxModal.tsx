"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Heart,
  Images,
  MessageCircle,
  RefreshCw,
  Share2,
  User,
  X,
  XCircle,
} from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import type { LooxPost } from "@/lib/playground/stmx-loox";
import LooxImageModal from "@/components/playground/LooxImageModal";

/**
 * Creator 신청자의 Loox 목록 — 최근 발행 순 페이지네이션.
 * 카드를 누르면 LooxImageModal 로 크게 본다. Esc 는 크게 보기가 열려 있으면 그것만 닫는다.
 */

export interface CreatorLooxTarget {
  userId: string;
  nickname: string | null;
  avatarUrl: string | null;
}

const PAGE_SIZE = 12;
const PAGE_WINDOW = 5;

const pageNumbers = (page: number, totalPages: number) => {
  if (totalPages <= 1) return [1];
  const end = Math.min(totalPages, Math.max(page - Math.floor(PAGE_WINDOW / 2), 1) + PAGE_WINDOW - 1);
  const start = Math.max(1, end - PAGE_WINDOW + 1);
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
};

export default function CreatorLooxModal({
  target,
  onClose,
}: {
  target: CreatorLooxTarget;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<LooxPost | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // 응답은 요청 키와 같이 둔다. 키가 다르면 읽는 중 — 그동안 이전 페이지를 흐리게 보여 준다.
  const requestKey = `${target.userId}:${page}:${reloadKey}`;
  const [result, setResult] = useState<{
    key: string;
    posts: LooxPost[];
    total: number;
    error: string | null;
  } | null>(null);
  const isLoading = result?.key !== requestKey;
  const posts = result?.posts ?? [];
  const total = result?.total ?? 0;
  const error = isLoading ? null : result.error;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      userId: target.userId,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    authFetch(`/api/creator-req/loox?${params}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.posts)) {
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        if (cancelled) return;
        const nextTotal = Number(data.total) || 0;
        setResult({ key: requestKey, posts: data.posts, total: nextTotal, error: null });
        // 마지막 페이지 너머면 실제 마지막 페이지로 되돌린다.
        const last = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
        if (page > last) setPage(last);
      })
      .catch((e) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          posts: [],
          total: 0,
          error: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, target.userId, page]);

  useEffect(() => {
    if (viewing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewing, onClose]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const navBtn =
    "w-8 h-8 rounded-lg border border-[#E0E3E8] bg-white flex items-center justify-center text-[#101317] hover:bg-[#F4F5F7] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer";

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="신청자 Loox 목록"
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* 헤더 */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[#EBECEF]">
            <Avatar nickname={target.nickname} avatarUrl={target.avatarUrl} size={40} />
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-bold text-[#101317] flex items-center gap-2">
                {target.nickname || "익명 사용자"}의 Loox
                <span className="px-2 py-0.5 rounded-full bg-[#EDE8FF] text-[#7A2CEE] text-[12px] font-bold">
                  {total}개
                </span>
              </h3>
              <p className="text-[12px] font-mono text-[#8E96A2] truncate">User ID: {target.userId}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={isLoading}
              title="새로고침"
              className="w-8 h-8 rounded-full bg-[#F4F5F7] hover:bg-[#EBECEF] flex items-center justify-center text-[#555A64] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              title="닫기 (Esc)"
              className="w-8 h-8 rounded-full bg-[#F4F5F7] hover:bg-[#EBECEF] flex items-center justify-center text-[#555A64] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto p-6 vt-scroll">
            {error ? (
              <div className="p-6 rounded-2xl bg-[#FFECEC] border border-[#FFD0D0] text-[#E52E2E] flex flex-col items-center text-center">
                <XCircle className="w-8 h-8 mb-2" />
                <h4 className="font-bold text-[15px]">Loox 를 불러오지 못했습니다</h4>
                <p className="text-[13px] mt-1 text-[#C42424]">{error}</p>
              </div>
            ) : isLoading && posts.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-xl bg-[#F0F1F3] animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[#8E96A2] mb-3">
                  <Images className="w-6 h-6 opacity-60" />
                </div>
                <h4 className="text-[15px] font-bold text-[#101317]">발행한 Loox 가 없습니다</h4>
              </div>
            ) : (
              <div
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 transition-opacity ${
                  isLoading ? "opacity-50" : ""
                }`}
              >
                {posts.map((post) => (
                  <LooxTile key={post.id} post={post} onOpen={() => setViewing(post)} />
                ))}
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          <div className="px-6 py-3 border-t border-[#EBECEF] bg-[#F9FAFB] flex items-center justify-between gap-3">
            <div className="text-[13px] text-[#717680]">
              페이지 <strong className="text-[#101317]">{page}</strong> / {totalPages} (총 {total}개)
            </div>
            <div className="flex items-center gap-1">
              <button type="button" title="첫 페이지" onClick={() => setPage(1)} disabled={page <= 1 || isLoading} className={navBtn}>
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button type="button" title="이전 페이지" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading} className={navBtn}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pageNumbers(page, totalPages).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  disabled={isLoading}
                  aria-current={n === page ? "page" : undefined}
                  className={`w-8 h-8 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                    n === page
                      ? "bg-[#101317] text-white shadow-xs"
                      : "border border-[#E0E3E8] bg-white text-[#101317] hover:bg-[#F4F5F7]"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button type="button" title="다음 페이지" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading} className={navBtn}>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button type="button" title="끝 페이지" onClick={() => setPage(totalPages)} disabled={page >= totalPages || isLoading} className={navBtn}>
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <LooxImageModal key={viewing?.id ?? "none"} post={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

/**
 * 게시물 한 장 — 첫 이미지(발행일 · 스타일 코드 · 사진 수를 겹쳐 둠), 그 아래 좋아요 · 댓글 · 공유 수와
 * 연동 상품 링크(네이버 판매 페이지, 새 탭).
 */
function LooxTile({ post, onOpen }: { post: LooxPost; onOpen: () => void }) {
  const cover = post.images[0];
  const counts = [
    { icon: Heart, label: "좋아요", value: post.counts.like },
    { icon: MessageCircle, label: "댓글", value: post.counts.comment },
    { icon: Share2, label: "공유", value: post.counts.share },
  ];
  return (
    <div className="flex flex-col rounded-xl overflow-hidden bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors">
      <button
        type="button"
        onClick={onOpen}
        title={post.styleNote ?? `post ${post.id}`}
        aria-label="사진 크게 보기"
        className="relative block aspect-[3/4] overflow-hidden bg-[#F0F1F3] text-left cursor-zoom-in group"
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={`Loox ${post.id}`}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[12px] text-[#9CA3AF]">
            이미지 없음
          </span>
        )}
        <span
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))" }}
          className="absolute inset-x-0 bottom-0 px-2.5 pt-8 pb-2 flex flex-col gap-0.5 text-white"
        >
          <span className="text-[12px] font-semibold">
            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("ko-KR") : "발행일 없음"}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-white/80">
            {post.styleCode && <span className="font-bold text-white">{post.styleCode}</span>}
            <span>사진 {post.images.length}</span>
          </span>
        </span>
      </button>

      {/* 좋아요 · 댓글 · 공유 */}
      <div className="flex items-center gap-3 px-2.5 py-2 border-b border-[#F3F4F6]">
        {counts.map(({ icon: Icon, label, value }) => (
          <span
            key={label}
            title={`${label} ${value.toLocaleString("ko-KR")}`}
            aria-label={`${label} ${value}`}
            className="flex items-center gap-1 text-[12px] font-semibold text-[#374151]"
          >
            <Icon className="w-3.5 h-3.5 text-[#8E96A2]" />
            {value.toLocaleString("ko-KR")}
          </span>
        ))}
      </div>

      {/* 연동 상품 링크 */}
      <div className="px-2.5 py-2 flex flex-col gap-1">
        <span className="text-[11px] font-bold text-[#6B7280]">연동 상품 {post.products.length}개</span>
        {post.products.length === 0 ? (
          <span className="text-[11px] text-[#9CA3AF] italic">연동된 상품이 없습니다.</span>
        ) : (
          post.products.map((product) => (
            <a
              key={product.id}
              href={product.naverUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`${product.brandName} ${product.name} — 판매 페이지 열기`}
              className="flex items-center gap-1.5 p-1 -mx-1 rounded-lg hover:bg-[#F4F5F7] min-w-0 group/link"
            >
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded object-cover bg-[#F0F1F3] shrink-0"
                />
              ) : (
                <span className="w-7 h-7 rounded bg-[#F0F1F3] shrink-0" />
              )}
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[11px] text-[#6B7280] truncate">{product.brandName}</span>
                <span className="block text-[12px] text-[#111827] truncate group-hover/link:underline">
                  {product.name}
                </span>
              </span>
              <ExternalLink className="w-3 h-3 text-[#9CA3AF] shrink-0" />
            </a>
          ))
        )}
      </div>
    </div>
  );
}

export function Avatar({
  nickname,
  avatarUrl,
  size = 36,
}: {
  nickname: string | null;
  avatarUrl: string | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      style={{ width: size, height: size }}
      className="rounded-full overflow-hidden bg-gradient-to-br from-[#EAE6FF] to-[#D5CBFF] text-[#7A2CEE] flex items-center justify-center font-bold text-[14px] shrink-0"
    >
      {avatarUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        nickname?.[0]?.toUpperCase() || <User className="w-4 h-4" />
      )}
    </span>
  );
}
