"use client";

import { useMemo, useState } from "react";
import { History, Link2, ListTree, Search, Trash2 } from "lucide-react";
import { FLOWS, type CallFlow } from "@/lib/playground/flows";
import {
  PRESETS,
  PRESET_GROUPS,
  PRESET_STATUS_LABEL,
  type Preset,
} from "@/lib/playground/presets";
import type { HistoryEntry } from "@/types/playground";

/**
 * 왼쪽 사이드바 — 프리셋 카탈로그와 히스토리.
 *
 * 프리셋 옆의 점은 이 저장소에서 실제로 호출해 본 결과다(확인됨 · 파라미터 필요 ·
 * 권한 필요 · 데이터 필요 · 미확인). 무엇이 막혀 있는지 미리 알고 들어가라고 둔 것.
 */

interface PresetSidebarProps {
  activePresetId: string | null;
  onSelectPreset: (preset: Preset) => void;
  history: HistoryEntry[];
  onSelectHistory: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
  /** 카테고리 계층 뷰어 열기 */
  onOpenTreeview: () => void;
  /** 호출 플로우 보기 */
  onSelectFlow: (flow: CallFlow) => void;
  /** 상품링크 도구 열기 */
  onOpenProductLink: () => void;
}

const relativeTime = (at: number) => {
  const diff = Date.now() - at;
  if (diff < 60_000) return "방금";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return new Date(at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
};

const shortPath = (url: string) =>
  url.replace("{{baseUrl}}", "").replace(/^https?:\/\/[^/]+/, "") || url;

export default function PresetSidebar({
  activePresetId,
  onSelectPreset,
  history,
  onSelectHistory,
  onClearHistory,
  onOpenTreeview,
  onSelectFlow,
  onOpenProductLink,
}: PresetSidebarProps) {
  const [tab, setTab] = useState<"presets" | "history">("presets");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PRESETS;
    return PRESETS.filter((p) =>
      `${p.name} ${p.group} ${p.url} ${p.description ?? ""}`.toLowerCase().includes(q)
    );
  }, [query]);

  const flows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FLOWS;
    return FLOWS.filter((f) =>
      `${f.name} ${f.goal} ${f.summary}`.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <aside className="w-[440px] flex-shrink-0 flex flex-col min-h-0 border-r border-[var(--pg-line)] bg-[var(--color-panel)]">
      <div className="p-2 flex items-center gap-1 border-b border-[var(--pg-line)]">
        <button
          type="button"
          className="pg-tab flex-1"
          data-active={tab === "presets"}
          onClick={() => setTab("presets")}
        >
          프리셋
        </button>
        <button
          type="button"
          className="pg-tab flex-1 flex items-center justify-center gap-1"
          data-active={tab === "history"}
          onClick={() => setTab("history")}
        >
          <History className="w-3 h-3" />
          히스토리 {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      {tab === "presets" && (
        <>
          <div className="p-2 border-b border-[var(--pg-line)] relative">
            <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--pg-faint)] pointer-events-none" />
            <input
              className="pg-input pl-7"
              placeholder="프리셋 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto vt-scroll p-2 flex flex-col gap-3">
            {/*
              플로우는 엔드포인트 하나가 아니라 호출 순서를 담은 항목이라
              프리셋 그룹보다 위에 따로 세운다. 눌러도 요청이 실리는 게 아니라
              플로우 모달이 열린다.
            */}
            {flows.length > 0 && (
              <div>
                <h3 className="m-0 mb-1 px-1 text-[18px] font-semibold tracking-[0.14em] uppercase text-black">
                  플로우
                </h3>
                <div className="flex flex-col">
                  {flows.map((flow) => (
                    <button
                      key={flow.id}
                      type="button"
                      onClick={() => onSelectFlow(flow)}
                      title={flow.summary}
                      className="text-left px-2 py-1.5 rounded hover:bg-[rgba(32,31,29,0.05)]"
                    >
                      <span className="flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 flex-none text-[var(--color-accent-700)]" />
                        <span className="text-[21.6px] truncate">{flow.name}</span>
                        <span className="text-[18px] text-black/50 whitespace-nowrap">
                          {flow.steps.length}단계
                        </span>
                      </span>
                      <span className="block mt-0.5 pl-[22px] text-[18.9px] text-black/55 truncate">
                        → {flow.goal}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 도구 — 요청 하나가 아니라 플로우를 한 화면에서 돌리는 항목 */}
            {"상품링크".includes(query.trim()) || query.trim() === "" ? (
              <div>
                <h3 className="m-0 mb-1 px-1 text-[18px] font-semibold tracking-[0.14em] uppercase text-black">
                  도구
                </h3>
                <button
                  type="button"
                  onClick={onOpenProductLink}
                  title="토큰 발급 → 검색어 조회 → 카테고리·브랜드로 걸러 링크 뽑기"
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-[rgba(32,31,29,0.05)]"
                >
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 flex-none text-[var(--color-accent-700)]" />
                    <span className="text-[21.6px] truncate">상품링크</span>
                  </span>
                  <span className="block mt-0.5 pl-[22px] text-[18.9px] text-black/55 truncate">
                    → 카탈로그 모델 검색 후 링크 추출
                  </span>
                </button>
              </div>
            ) : null}

            {PRESET_GROUPS.map((group) => {
              const items = filtered.filter((p) => p.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <h3 className="m-0 mb-1 px-1 text-[18px] font-semibold tracking-[0.14em] uppercase text-black">
                    {group}
                  </h3>
                  <div className="flex flex-col">
                    {items.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onSelectPreset(preset)}
                        title={preset.description}
                        className={`text-left px-2 py-1.5 rounded transition-colors ${
                          activePresetId === preset.id
                            ? "bg-[rgba(182,130,53,0.14)]"
                            : "hover:bg-[rgba(32,31,29,0.05)]"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`pg-dot pg-dot-${preset.status ?? "unknown"}`}
                            title={PRESET_STATUS_LABEL[preset.status ?? "unknown"]}
                          />
                          <span
                            className={`pg-method pg-method-${preset.method} scale-90 origin-left`}
                          >
                            {preset.method}
                          </span>
                          <span className="text-[21.6px] truncate">{preset.name}</span>
                        </span>
                        <span className="block mt-0.5 pl-[7px] text-[18.9px] text-black pg-mono truncate">
                          {shortPath(preset.url)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && flows.length === 0 && (
              <p className="m-0 p-2 text-[20.7px] text-black">
                일치하는 프리셋이 없습니다.
              </p>
            )}
          </div>
        </>
      )}

      {tab === "history" && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto vt-scroll p-2 flex flex-col">
            {history.length === 0 && (
              <p className="m-0 p-2 text-[20.7px] text-black">
                보낸 요청이 여기에 쌓입니다. 브라우저에만 저장됩니다.
              </p>
            )}
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectHistory(entry)}
                className="text-left px-2 py-1.5 rounded hover:bg-[rgba(32,31,29,0.05)]"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`pg-method pg-method-${entry.method} scale-90 origin-left`}
                  >
                    {entry.method}
                  </span>
                  <span
                    className={`text-[19.8px] pg-mono font-bold ${
                      entry.status && entry.status < 400
                        ? "text-black"
                        : "text-black"
                    }`}
                  >
                    {entry.status ?? "ERR"}
                  </span>
                  <span className="text-[18.9px] text-black ml-auto">
                    {relativeTime(entry.at)}
                  </span>
                </span>
                <span className="block mt-0.5 text-[18.9px] text-black pg-mono truncate">
                  {shortPath(entry.url)}
                </span>
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <div className="p-2 border-t border-[var(--pg-line)]">
              <button
                type="button"
                onClick={onClearHistory}
                className="w-full px-2 py-1 text-[20.7px] rounded btn btn-secondary flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                히스토리 비우기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 목록 영역 아래 고정 푸터 — 어느 탭에 있든 닿을 수 있게 둔다. */}
      <div className="p-2 border-t border-[var(--pg-line)]">
        <button
          type="button"
          onClick={onOpenTreeview}
          title="카테고리 목록 응답(또는 JSON 파일)을 계층으로 봅니다"
          className="w-full px-2 py-1.5 text-[20.7px] rounded btn btn-secondary flex items-center justify-center gap-1.5"
        >
          <ListTree className="w-4 h-4 text-[var(--color-accent-700)]" />
          Treeview
        </button>
      </div>
    </aside>
  );
}
