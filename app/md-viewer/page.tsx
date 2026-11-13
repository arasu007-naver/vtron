"use client";

import { useRef, useState } from "react";
import { BookOpen, Code2, Download, Eye, FileText, FolderOpen, Loader2, RotateCcw } from "lucide-react";
import MarkdownViewer from "@/components/md-viewer/MarkdownViewer";
import { downloadMarkdownPdf } from "@/components/md-viewer/download-pdf";

/**
 * 마크다운 뷰어 (/md-viewer)
 *
 * ┌ 1줄 ─ 버튼 그룹 영역 ([파일 선택] · [뷰어|원문] · [비우기] · [pdf로 다운로드])  파일명 · 줄/글자 수 ┐
 * └ 본문 ─ 선택한 .md 파일 내용을 렌더링하여 보여주는 스크롤 영역                                        ┘
 */

type ViewMode = "rendered" | "raw";

const ACCEPT_MD = ".md,.markdown,.mdx,text/markdown,text/plain";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function MdViewerPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [content, setContent] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("rendered");
  const [dragging, setDragging] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const renderedWrapRef = useRef<HTMLDivElement>(null);

  const loadMarkdownFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      setFileName(file.name);
      setFileSize(file.size);
      setContent(text);
      bodyScrollRef.current?.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? `파일을 읽지 못했습니다: ${e.message}` : "파일을 읽지 못했습니다.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    // 같은 파일을 수정 후 다시 선택해도 onChange 가 동작하도록 초기화
    e.target.value = "";
    if (!picked) return;
    void loadMarkdownFile(picked);
  };

  const handleClear = () => {
    setFileName(null);
    setFileSize(0);
    setContent("");
    setError(null);
  };

  const handleDownloadPdf = async () => {
    if (!fileName || downloadingPdf) return;
    const articleEl = renderedWrapRef.current?.querySelector<HTMLElement>("article.md-viewer-body");
    if (!articleEl) {
      setError("PDF 로 변환할 문서 영역을 찾지 못했습니다.");
      return;
    }
    setError(null);
    setDownloadingPdf(true);
    try {
      await downloadMarkdownPdf(articleEl, fileName);
    } catch (e) {
      setError(e instanceof Error ? `PDF 다운로드 실패: ${e.message}` : "PDF 다운로드에 실패했습니다.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const lineCount = content ? content.replace(/\r\n?/g, "\n").split("\n").length : 0;

  return (
    <div className="h-full min-h-0 flex flex-col bg-[var(--color-bg)]">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_MD}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* 상단 한줄 — 버튼 그룹 영역 */}
      <section
        aria-label="마크다운 뷰어 도구 모음"
        className="flex-none flex items-center gap-2 px-4 py-2 border-b border-[var(--color-divider)] bg-[var(--color-panel)] overflow-x-auto vt-scroll"
      >
        <div role="group" aria-label="파일 및 보기 버튼 그룹" className="flex-none flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={downloadingPdf}
            className="btn btn-primary px-3 py-1.5 rounded-lg text-[15px] flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
          >
            <FolderOpen className="w-4 h-4 flex-none" />
            파일 선택
          </button>

          {fileName !== null && (
            <>
              <div
                role="tablist"
                aria-label="보기 모드"
                className="flex items-center rounded-lg border border-[var(--color-divider)] bg-black/5 p-0.5 text-[13px]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "rendered"}
                  onClick={() => setViewMode("rendered")}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer ${
                    viewMode === "rendered"
                      ? "bg-white font-semibold text-[var(--color-accent-700)] shadow-sm"
                      : "text-black/65 hover:text-black"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  뷰어
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "raw"}
                  onClick={() => setViewMode("raw")}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer ${
                    viewMode === "raw"
                      ? "bg-white font-semibold text-[var(--color-accent-700)] shadow-sm"
                      : "text-black/65 hover:text-black"
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  원문
                </button>
              </div>

              <button
                type="button"
                onClick={handleClear}
                disabled={downloadingPdf}
                title="선택한 파일 닫기"
                className="btn btn-secondary px-2.5 py-1.5 rounded-lg text-[14px] flex items-center gap-1 whitespace-nowrap disabled:opacity-60"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[var(--color-accent-700)]" />
                비우기
              </button>

              <button
                type="button"
                onClick={() => void handleDownloadPdf()}
                disabled={downloadingPdf}
                title="현재 마크다운 문서를 PDF 파일로 다운로드"
                className="btn btn-secondary px-2.5 py-1.5 rounded-lg text-[14px] flex items-center gap-1 whitespace-nowrap disabled:opacity-60"
              >
                {downloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-accent-700)]" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[var(--color-accent-700)]" />
                )}
                pdf로 다운로드
              </button>
            </>
          )}
        </div>

        {fileName !== null && (
          <div className="ml-auto flex-none flex items-center gap-2.5 text-[13px] text-black/65">
            <span className="flex items-center gap-1 font-semibold text-black">
              <FileText className="w-3.5 h-3.5 text-[var(--color-accent-700)]" />
              {fileName}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[12px] text-black/55">
              {formatBytes(fileSize)} · {lineCount.toLocaleString()}줄 · {content.length.toLocaleString()}자
            </span>
          </div>
        )}
      </section>

      {error && (
        <div className="flex-none px-4 py-2 border-b border-[var(--color-divider)] bg-red-50 text-[13px] text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {/* Content Body 영역 */}
      <div
        ref={bodyScrollRef}
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragging) setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) void loadMarkdownFile(dropped);
        }}
        className={`flex-1 min-h-0 overflow-y-auto vt-scroll select-text p-4 md:p-6 transition-colors ${
          dragging ? "bg-[rgba(182,130,53,0.1)]" : ""
        }`}
      >
        {fileName === null ? (
          <div className="h-full min-h-[280px] flex items-center justify-center">
            <div className="max-w-md w-full rounded-2xl border border-dashed border-[var(--color-divider)] bg-white/75 px-6 py-10 text-center flex flex-col items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[rgba(182,130,53,0.14)] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[var(--color-accent-700)]" />
              </div>
              <div className="text-[16px] font-semibold text-black">마크다운(.md) 파일을 선택하세요</div>
              <p className="m-0 text-[14px] text-black/60 leading-relaxed">
                상단 <strong>파일 선택</strong> 버튼을 누르거나 이 영역에 <code>.md</code> 파일을 끌어다 놓으면 내용을 뷰어로 보여줍니다.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 btn btn-primary px-4 py-1.5 rounded-lg text-[15px] flex items-center gap-1.5"
              >
                <FolderOpen className="w-4 h-4" />
                파일 선택
              </button>
            </div>
          </div>
        ) : (
          <>
            {viewMode === "raw" && (
              <div className="max-w-5xl mx-auto rounded-xl border border-[var(--color-divider)] bg-white shadow-sm overflow-hidden">
                <pre className="m-0 p-5 md:p-7 overflow-x-auto vt-scroll font-[family-name:var(--font-mono)] text-[13px] leading-[1.65] whitespace-pre-wrap break-words text-black/90">
                  {content}
                </pre>
              </div>
            )}
            <div
              ref={renderedWrapRef}
              className={
                viewMode === "raw"
                  ? "hidden"
                  : "max-w-5xl mx-auto rounded-xl border border-[var(--color-divider)] bg-white shadow-sm px-6 py-6 md:px-10 md:py-8"
              }
            >
              <MarkdownViewer content={content} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
