"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { LooxPost } from "@/lib/playground/stmx-loox";

/**
 * Loox 이미지 크게 보기 — 화면 너비 · 높이의 80% 모달.
 *
 * 여러 장이면 좌우 단추 · ← → 키 · 아래 썸네일로 넘긴다. 모달 어디를 눌러도(사진 포함) 닫히고,
 * Esc 로도 닫힌다. 넘기기 단추 · 썸네일은 클릭이 닫기로 번지지 않게 막는다.
 * 게시물이 바뀌면 첫 장부터 보이도록 부모가 `key={post.id}` 로 새로 마운트한다.
 *
 * 크기(80vw × 80vh)는 인라인 스타일로 준다. 임의값 클래스(`w-[80vw]`)는 dev 서버의 Tailwind 가
 * 새 파일을 스캔하기 전까지 CSS 에 없어서, 그동안 상자가 원본 사진 크기로 커져 화면을 덮었다.
 */
export default function LooxImageModal({
  post,
  onClose,
}: {
  post: LooxPost | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const count = post?.images.length ?? 0;

  useEffect(() => {
    if (!post) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && count > 1) setIndex((i) => (i - 1 + count) % count);
      else if (e.key === "ArrowRight" && count > 1) setIndex((i) => (i + 1) % count);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [post, count, onClose]);

  if (!post) return null;
  const image = post.images[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Loox 이미지 — 누르면 닫힘"
        title="누르면 닫힙니다"
        // 모달을 눌러도 닫는다. 이벤트는 바깥(배경)의 onClose 로 올라간다.
        style={{ width: "80vw", height: "80vh" }}
        className="bg-[#141312] rounded-xl shadow-2xl overflow-hidden flex flex-col cursor-zoom-out"
      >
        <header className="flex items-center gap-2 px-4 py-2 text-[19.8px] text-white">
          {post.styleCode && <span className="pg-status pg-status-2">{post.styleCode}</span>}
          <span>
            {post.publishedAt ? new Date(post.publishedAt).toLocaleString("ko-KR") : "발행일 없음"}
          </span>
          {count > 0 && (
            <span className="text-white/60">
              {index + 1} / {count}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기 (Esc)"
            className="ml-auto w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </header>

        <div className="relative flex-1 min-h-0 flex items-center justify-center px-4">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={`Loox 이미지 ${index + 1}`}
              className="block max-w-full max-h-full object-contain"
            />
          ) : (
            <span className="text-[19.8px] text-white/60">이미지가 없는 게시물입니다.</span>
          )}
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + count) % count);
                }}
                aria-label="이전 이미지"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % count);
                }}
                aria-label="다음 이미지"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
        </div>

        {count > 1 && (
          <div className="flex gap-1.5 px-4 py-2 overflow-x-auto vt-scroll justify-center cursor-default">
            {post.images.map((thumb, i) => (
              <button
                key={thumb.position}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                aria-label={`${i + 1}번째 이미지`}
                aria-current={i === index}
                className={`flex-none rounded overflow-hidden border-2 ${
                  i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb.url}
                  alt=""
                  loading="lazy"
                  className="block w-12 h-16 object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
