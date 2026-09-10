"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CallFlowModal from "@/components/playground/CallFlowModal";
import CategoryTreeModal from "@/components/playground/CategoryTreeModal";
import ProductLinkModal from "@/components/playground/ProductLinkModal";
import NaverTokenBar from "@/components/playground/NaverTokenBar";
import PresetSidebar from "@/components/playground/PresetSidebar";
import RequestPanel from "@/components/playground/RequestPanel";
import ResponsePanel from "@/components/playground/ResponsePanel";
import {
  clearHistory,
  draftFromPreset,
  emptyDraft,
  loadDraft,
  loadHistory,
  pushHistory,
  saveDraft,
  sendDraft,
  toCurl,
  uid,
} from "@/lib/playground/client";
import { PRESETS, type Preset } from "@/lib/playground/presets";
import type { CallFlow } from "@/lib/playground/flows";
import { useIsClient } from "@/lib/use-is-client";
import type {
  HistoryEntry,
  NaverTokenResult,
  ProxyResponsePayload,
  RequestDraft,
} from "@/types/playground";

/**
 * API 플레이그라운드.
 *
 * 네이버 커머스 API 호출 시험을 주 용도로 하되, 임의의 REST 엔드포인트도 그대로
 * 부를 수 있는 콘솔이다. 실제 호출은 전부 `/api/playground/request` 프록시를 거친다
 * (CORS 회피 + 시크릿을 서버에 붙잡아 두기 위해).
 *
 * 상태 보관:
 * - 편집 중인 요청과 히스토리는 `localStorage` (브라우저 편의 기능).
 * - 액세스 토큰은 **메모리에만** 둔다. 3시간짜리 자격 증명을 디스크에 남기지 않는다.
 */

export default function ApiPlaygroundPage() {
  const [presetId, setPresetId] = useState<string | null>(null);
  const [token, setToken] = useState<NaverTokenResult | null>(null);
  const [result, setResult] = useState<ProxyResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roundTripMs, setRoundTripMs] = useState<number | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const [flow, setFlow] = useState<CallFlow | null>(null);
  const [productLinkOpen, setProductLinkOpen] = useState(false);

  // 새로고침해도 편집 중이던 요청과 히스토리는 남는다. localStorage 는 서버에
  // 없으므로 이펙트에서 setState 로 채우는 대신 하이드레이션 이후의 파생값으로
  // 계산한다(연쇄 렌더 · 하이드레이션 불일치 회피 — lib/use-is-client.ts 참고).
  const isClient = useIsClient();
  const stored = useMemo(
    () =>
      isClient
        ? { draft: loadDraft() ?? emptyDraft(), history: loadHistory() }
        : { draft: emptyDraft(), history: [] as HistoryEntry[] },
    [isClient]
  );

  const [draftEdit, setDraftEdit] = useState<RequestDraft | null>(null);
  const [historyEdit, setHistoryEdit] = useState<HistoryEntry[] | null>(null);
  const draft = draftEdit ?? stored.draft;
  const history = historyEdit ?? stored.history;

  useEffect(() => {
    if (isClient) saveDraft(draft);
  }, [draft, isClient]);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? null,
    [presetId]
  );

  const curl = useMemo(
    () => toCurl(draft, token?.accessToken ?? null),
    [draft, token]
  );

  const send = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const outcome = await sendDraft(draft, token?.accessToken ?? null);

    setLoading(false);
    setRoundTripMs(outcome.durationMs);
    if (outcome.error) setError(outcome.error);
    if (outcome.result) setResult(outcome.result);

    setHistoryEdit(
      pushHistory({
        id: uid(),
        at: Date.now(),
        method: draft.method,
        url: draft.url,
        status: outcome.result?.status ?? null,
        durationMs: outcome.result?.durationMs ?? outcome.durationMs,
        draft,
      })
    );
  }, [draft, token]);

  // 어느 입력에 포커스가 있든 Ctrl/Cmd+Enter 로 보낸다.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (!loading) void send();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [send, loading]);

  const selectPreset = (next: Preset) => {
    setPresetId(next.id);
    setDraftEdit(draftFromPreset(next));
  };

  const selectHistory = (entry: HistoryEntry) => {
    setPresetId(null);
    setDraftEdit(entry.draft);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      <NaverTokenBar token={token} onToken={setToken} />

      <div className="flex-1 min-h-0 flex">
        <PresetSidebar
          activePresetId={presetId}
          onSelectPreset={selectPreset}
          history={history}
          onSelectHistory={selectHistory}
          onClearHistory={() => setHistoryEdit(clearHistory())}
          onOpenTreeview={() => setTreeOpen(true)}
          onSelectFlow={setFlow}
          onOpenProductLink={() => setProductLinkOpen(true)}
        />

        <main className="flex-1 min-w-0 min-h-0 flex flex-col gap-2 p-2 overflow-y-auto vt-scroll">
          <RequestPanel
            draft={draft}
            // 편집해도 프리셋 선택은 유지한다 — 주석(무엇이 막혀 있는지)이
            // 사라지면 프리셋을 고른 의미가 없다.
            onChange={setDraftEdit}
            onSend={send}
            loading={loading}
            curl={curl}
            note={preset?.note}
          />
          <ResponsePanel
            result={result}
            error={error}
            loading={loading}
            roundTripMs={roundTripMs}
          />
        </main>
      </div>

      <ProductLinkModal
        open={productLinkOpen}
        onClose={() => setProductLinkOpen(false)}
        token={token}
        onToken={setToken}
      />

      <CallFlowModal
        flow={flow}
        onClose={() => setFlow(null)}
        // 플로우의 한 단계를 그대로 편집기로 올린다 — 순서를 보고 바로 눌러볼 수 있게.
        onOpenStep={(presetId) => {
          const step = PRESETS.find((p) => p.id === presetId);
          if (step) selectPreset(step);
          setFlow(null);
        }}
      />

      <CategoryTreeModal
        open={treeOpen}
        onClose={() => setTreeOpen(false)}
        responseBody={result?.bodyEncoding === "text" ? result.body : null}
        // 트리에서 고른 카테고리를 단건 조회 요청으로 열어 준다.
        // 상품 검색의 시작점이 될 id 를 바로 확인해 보라는 뜻이다.
        onUseCategory={(categoryId) => {
          setPresetId("category-detail");
          setDraftEdit({
            ...draft,
            method: "GET",
            url: `{{baseUrl}}/v1/categories/${categoryId}`,
            params: [],
            bodyType: "none",
            body: "",
          });
        }}
      />
    </div>
  );
}
