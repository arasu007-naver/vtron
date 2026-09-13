"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Download,
  FileJson,
  Search,
  Upload,
  X,
} from "lucide-react";
import JsonTree from "./JsonTree";
import {
  SCOPE_HINT,
  SCOPE_LABEL,
  buildTree,
  countLeafNodes,
  filterByScope,
  filterTree,
  isCategoryList,
  type CategoryNode,
  type CategoryScope,
} from "@/lib/playground/category-tree";

/**
 * 카테고리 계층 뷰어.
 *
 * `GET /v1/categories` 응답은 5,000건이 넘는 평평한 배열이라 그대로는 읽을 수 없다.
 * 여기서 `wholeCategoryName` 을 계층으로 세우고 패션 계열만 걸러, 운영자가 상품
 * 검색을 시작할 카테고리를 고르게 한다.
 *
 * 입력은 둘 중 하나다.
 * - **마지막 응답** — 플레이그라운드에서 방금 받은 본문.
 * - **JSON 파일** — 상단 [JSON 파일] 로 고른 파일. 카테고리 배열이면 같은 트리로,
 *   아니면 그 파일의 구조를 그대로 보여준다.
 */

interface CategoryTreeModalProps {
  open: boolean;
  onClose: () => void;
  /** 플레이그라운드의 마지막 응답 본문(텍스트일 때만) */
  responseBody: string | null;
  /** 리프를 고르면 카테고리 단건 조회 요청으로 열어준다. */
  onUseCategory: (categoryId: string) => void;
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const formatYYMMDD = (d: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yy}-${mm}-${dd}`;
};

export default function CategoryTreeModal({
  open,
  onClose,
  responseBody,
  onUseCategory,
}: CategoryTreeModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileData, setFileData] = useState<{
    name: string;
    size: number;
    value: unknown;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [scope, setScope] = useState<CategoryScope>("fashion");
  const [query, setQuery] = useState("");
  const [generation, setGeneration] = useState(0);
  const [expandDepth, setExpandDepth] = useState(1);

  // Esc 로 닫기 — 모달이 열려 있는 동안만 듣는다.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // 파일을 고르면 그쪽을 보고, 아니면 마지막 응답을 본다.
  const active = useMemo(() => {
    if (fileData) {
      return {
        source: {
          kind: "file" as const,
          name: fileData.name,
          size: fileData.size,
        },
        value: fileData.value,
      };
    }
    if (responseBody) {
      return { source: { kind: "response" as const }, value: parseJson(responseBody) };
    }
    return { source: { kind: "none" as const }, value: undefined };
  }, [fileData, responseBody]);

  const categories = isCategoryList(active.value) ? active.value : null;

  const tree = useMemo(() => {
    if (!categories) return null;
    return buildTree(filterByScope(categories, scope));
  }, [categories, scope]);

  const visible = useMemo(
    () => (tree ? filterTree(tree, query) : null),
    [tree, query]
  );

  if (!open) return null;

  const pickFile = (file: File) => {
    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const value = parseJson(text);
      if (value === undefined) {
        setFileError(`${file.name} 을 JSON 으로 읽지 못했습니다.`);
        return;
      }
      setFileData({ name: file.name, size: file.size, value });
      setQuery("");
      setGeneration((g) => g + 1);
    };
    reader.onerror = () => setFileError(`${file.name} 을 읽지 못했습니다.`);
    reader.readAsText(file);
  };

  const leafTotal = visible ? countLeafNodes(visible) : 0;

  const handleSaveCategories = () => {
    const dataToSave =
      active.value !== undefined
        ? JSON.stringify(active.value, null, 2)
        : (responseBody ?? "");
    if (!dataToSave) return;

    const blob = new Blob([dataToSave], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `naver-categories-${formatYYMMDD()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="카테고리 계층 뷰어"
        className="pg-app w-[1100px] max-w-full max-h-[88vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[var(--pg-line)]"
      >
        {/* 헤더 — 제목 + 파일 입력 */}
        <header className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-[var(--pg-line)] bg-[var(--color-panel)]">
          <FileJson className="w-4 h-4 text-[var(--color-accent-700)]" />
          <h3 className="m-0 text-[25.2px] font-semibold text-black">
            카테고리 계층
          </h3>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pickFile(file);
              // 같은 파일을 다시 고를 수 있게 값을 비운다.
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-2.5 py-1 text-[20.7px] rounded btn btn-secondary flex items-center gap-1"
            title="JSON 파일을 골라 그 구조를 봅니다"
          >
            <Upload className="w-3.5 h-3.5 text-[var(--color-accent-700)]" />
            JSON 파일
          </button>

          <span className="text-[19.8px] text-black">
            {active.source.kind === "file"
              ? `파일 · ${active.source.name} (${(active.source.size / 1024).toFixed(1)} KB)`
              : active.source.kind === "response"
                ? "마지막 응답"
                : "표시할 데이터가 없습니다"}
          </span>
          {active.source.kind === "response" && (responseBody || active.value !== undefined) && (
            <button
              type="button"
              onClick={handleSaveCategories}
              className="px-2.5 py-1 text-[20.7px] rounded btn btn-secondary flex items-center gap-1"
              title="마지막 응답을 JSON 파일로 저장합니다"
            >
              <Download className="w-3.5 h-3.5 text-[var(--color-accent-700)]" />
              저장
            </button>
          )}
          {fileData && (
            <button
              type="button"
              onClick={() => {
                setFileData(null);
                setFileError(null);
                setGeneration((g) => g + 1);
              }}
              className="px-2 py-1 text-[18.9px] rounded btn btn-secondary"
              title="마지막 응답으로 되돌립니다"
            >
              응답으로
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기 (Esc)"
            className="ml-auto w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4 text-[#201f1d]" />
          </button>
        </header>

        {/* 툴바 — 카테고리 목록일 때만 필터·검색이 뜻이 있다 */}
        {categories && (
          <div className="px-4 py-2 border-b border-[var(--pg-line)] flex items-center gap-2 flex-wrap">
            {(Object.keys(SCOPE_LABEL) as CategoryScope[]).map((id) => (
              <button
                key={id}
                type="button"
                className="pg-tab"
                data-active={scope === id}
                title={SCOPE_HINT[id]}
                onClick={() => {
                  setScope(id);
                  setGeneration((g) => g + 1);
                }}
              >
                {SCOPE_LABEL[id]}
              </button>
            ))}

            <div className="relative ml-2 flex-1 min-w-[220px] max-w-[420px]">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
              <input
                className="pg-input pl-8"
                placeholder="카테고리명 · 경로 · ID 로 찾기"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                spellCheck={false}
              />
            </div>

            <span className="text-[19.8px] text-black whitespace-nowrap">
              리프 {leafTotal.toLocaleString()}개 / 응답 {categories.length.toLocaleString()}개
            </span>

            <button
              type="button"
              className="pg-tab flex items-center gap-1"
              onClick={() => {
                setExpandDepth(99);
                setGeneration((g) => g + 1);
              }}
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              모두 펼치기
            </button>
            <button
              type="button"
              className="pg-tab flex items-center gap-1"
              onClick={() => {
                setExpandDepth(0);
                setGeneration((g) => g + 1);
              }}
            >
              <ChevronsDownUp className="w-3.5 h-3.5" />
              모두 접기
            </button>
          </div>
        )}

        {fileError && (
          <p className="m-0 px-4 py-2 text-[20.7px] text-black bg-[rgba(138,58,42,0.1)] border-b border-[var(--pg-line)]">
            {fileError}
          </p>
        )}

        {/* 본문 */}
        <div className="flex-1 min-h-0 overflow-auto vt-scroll p-4">
          {active.source.kind === "none" && (
            <p className="m-0 text-[22.5px] text-black">
              먼저 <strong>카테고리 목록</strong> 프리셋을 보내거나, 위의{" "}
              <strong>JSON 파일</strong> 로 파일을 고르세요.
            </p>
          )}

          {active.source.kind !== "none" && active.value === undefined && (
            <p className="m-0 text-[22.5px] text-black">
              마지막 응답이 JSON 이 아닙니다. JSON 파일을 골라 보세요.
            </p>
          )}

          {/* 카테고리 배열이 아니면 그 파일/응답의 구조를 그대로 보여준다 */}
          {active.value !== undefined && !categories && (
            <>
              <p className="m-0 mb-2 text-[19.8px] text-black">
                카테고리 목록 형식(`wholeCategoryName`)이 아니어서 구조를 그대로 보여줍니다.
              </p>
              <JsonTree key={generation} value={active.value} expandDepth={2} />
            </>
          )}

          {visible && visible.length === 0 && (
            <p className="m-0 text-[22.5px] text-black">
              조건에 맞는 카테고리가 없습니다.
            </p>
          )}

          {visible && visible.length > 0 && (
            /*
              key 에 검색어를 섞어 트리를 다시 마운트한다. 펼침 상태는 각 행이
              들고 있어서, 이렇게 하지 않으면 검색해도 접혀 있던 가지가 그대로 접혀
              결과가 안 보인다.
            */
            <ul
              key={`${generation}:${query.trim()}`}
              className="list-none m-0 p-0"
            >
              {visible.map((node) => (
                <TreeRow
                  key={node.path}
                  node={node}
                  expandDepth={query.trim() ? 99 : expandDepth}
                  onUseCategory={(id) => {
                    onUseCategory(id);
                    onClose();
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const CHUNK = 200;

function TreeRow({
  node,
  expandDepth,
  onUseCategory,
}: {
  node: CategoryNode;
  expandDepth: number;
  onUseCategory: (id: string) => void;
}) {
  const [open, setOpen] = useState(node.depth < expandDepth);
  const [shown, setShown] = useState(CHUNK);
  const [copied, setCopied] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <li className="list-none">
      <div
        className="flex items-center gap-1.5 py-0.5 rounded hover:bg-[rgba(32,31,29,0.05)]"
        style={{ paddingLeft: node.depth * 22 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            title={open ? "접기" : "펼치기"}
            className="pg-toggle bg-transparent border-0 p-0 text-[20.7px]"
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="pg-toggle invisible text-[20.7px]">▸</span>
        )}

        <span className="text-[21.6px] text-black">{node.name}</span>

        {hasChildren && (
          <span className="text-[18.9px] text-black/45">
            {node.leafCount.toLocaleString()}
          </span>
        )}

        {node.id && (
          <>
            <code className="text-[18.9px] text-black/55 pg-mono">{node.id}</code>
            <button
              type="button"
              title="카테고리 ID 복사"
              aria-label="카테고리 ID 복사"
              onClick={async () => {
                await navigator.clipboard.writeText(node.id as string).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="p-1 rounded text-black/45 hover:text-black hover:bg-black/5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onUseCategory(node.id as string)}
              title={`GET /v1/categories/${node.id} 요청으로 열기`}
              className="px-2 py-0.5 text-[18.9px] rounded btn btn-secondary"
            >
              조회
            </button>
          </>
        )}
      </div>

      {open && hasChildren && (
        <ul className="list-none m-0 p-0">
          {node.children.slice(0, shown).map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              expandDepth={expandDepth}
              onUseCategory={onUseCategory}
            />
          ))}
          {shown < node.children.length && (
            <li style={{ paddingLeft: (node.depth + 1) * 22 }}>
              <button
                type="button"
                onClick={() => setShown((n) => n + CHUNK * 5)}
                className="text-[19.8px] text-black underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer"
              >
                나머지 {node.children.length - shown}개 더 보기
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
