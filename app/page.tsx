"use client";

import React, { useState, useEffect, useCallback } from "react";
import StudioHeader from "@/components/StudioHeader";
import BackgroundSection, {
  CANVAS_PRESETS,
} from "@/components/BackgroundSection";
import CharacterSection from "@/components/CharacterSection";
import GarmentSection from "@/components/GarmentSection";
import StudioCanvas from "@/components/StudioCanvas";
import StudioConsole from "@/components/StudioConsole";
import ProjectHistoryModal from "@/components/ProjectHistoryModal";
import {
  BackgroundSetting,
  CharacterSetting,
  GarmentItem,
  LogEntry,
  VtonProject,
} from "@/types/vton";
import { Sparkles, Play, RefreshCw } from "lucide-react";

export default function VtonStudioPage() {
  // 1. Canvas & Sizing
  const [sizePreset, setSizePreset] = useState(CANVAS_PRESETS[2]); // 1080 × 1350
  const [w, setW] = useState(1080);
  const [h, setH] = useState(1350);

  // 2. Background State
  const [bgSetting, setBgSetting] = useState<BackgroundSetting>({
    mode: "css",
    cssBg: "보케",
    bgFit: "Cover",
    customImageUrl: null,
  });
  const [bgListOpen, setBgListOpen] = useState(false);

  // 3. Character State
  const [character, setCharacter] = useState<CharacterSetting>({
    imageUrl: null,
    scale: 100,
    autoRemoveBg: true,
    preserveFaceHands: true,
  });

  // 4. Garments State
  const [garments, setGarments] = useState<GarmentItem[]>([
    { id: "g-1", name: "linen-shirt-ecru.png", slot: "상의", layer: 1, fit: 82 },
    { id: "g-2", name: "wool-trousers-charcoal.png", slot: "하의", layer: 2, fit: 74 },
    { id: "g-3", name: "trench-coat-camel.png", slot: "아웃터", layer: 3, fit: 66 },
    { id: "g-4", name: "watch-steel-38mm.png", slot: "시계", layer: 4, fit: 90 },
    { id: "g-5", name: "necklace-gold-chain.png", slot: "목걸이", layer: 5, fit: 88 },
  ]);

  // 5. Engine & Render State
  const [seed, setSeed] = useState(4821);
  const [renderMode, setRenderMode] = useState<"performance" | "balanced" | "quality">(
    "balanced"
  );
  const [progress, setProgress] = useState(100);
  const [isRendering, setIsRendering] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  // 6. Logs & Console
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: "00:00.12", level: "info", text: "VTON 스튜디오를 초기화했습니다 (1080×1350)." },
    { time: "00:00.35", level: "info", text: "Supabase 스토리지 및 DB 연동 준비 완료." },
    { time: "00:00.60", level: "info", text: "캐릭터 세그멘테이션 대기 중." },
  ]);

  // 7. Session Modal & Saving
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [projectsList, setProjectsList] = useState<VtonProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 로그 추가 헬퍼
  const addLog = useCallback((level: LogEntry["level"], text: string) => {
    const t = new Date();
    const time =
      String(t.getMinutes() % 100).padStart(2, "0") +
      ":" +
      String(t.getSeconds()).padStart(2, "0") +
      "." +
      String(Math.floor(t.getMilliseconds() / 10)).padStart(2, "0");
    setLogs((prev) => [...prev, { time, level, text }]);
  }, []);

  // 캔버스 크기 프리셋 변경
  const handleSelectPreset = (p: typeof CANVAS_PRESETS[0]) => {
    setSizePreset(p);
    setW(p.w);
    setH(p.h);
    addLog("info", `배경 크기 ${p.label} (${p.ratioLabel}) 적용.`);
  };

  const handleCustomSize = (newW: number, newH: number) => {
    setW(newW);
    setH(newH);
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const d = gcd(newW, newH);
    const ratioLabel = `${newW / d}:${newH / d}`;
    setSizePreset({
      label: `${newW} × ${newH}`,
      w: newW,
      h: newH,
      ratioLabel,
    });
    addLog("info", `사용자 지정 크기 ${newW}×${newH} 적용.`);
  };

  // 배경 이미지 업로드 (Supabase Storage)
  const handleUploadBgImage = async (file: File | null) => {
    if (!file) {
      setBgSetting((prev) => ({ ...prev, customImageUrl: null }));
      addLog("warn", "커스텀 배경 이미지를 제거했습니다.");
      return;
    }

    try {
      addLog("info", `배경 이미지 업로드 중: ${file.name}`);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "backgrounds");

      const res = await fetch("/api/vton/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("업로드 실패");
      const data = await res.json();

      setBgSetting((prev) => ({
        ...prev,
        customImageUrl: data.url,
      }));
      addLog("info", `배경 이미지 Supabase Storage 업로드 완료: ${file.name}`);
    } catch (err: any) {
      addLog("error", `배경 이미지 업로드 오류: ${err.message}`);
    }
  };

  // 캐릭터 이미지 업로드
  const handleUploadCharacter = async (file: File) => {
    try {
      addLog("info", `캐릭터 이미지 업로드 중: ${file.name}`);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "characters");

      const res = await fetch("/api/vton/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("업로드 실패");
      const data = await res.json();

      setCharacter((prev) => ({
        ...prev,
        imageUrl: data.url,
      }));
      addLog("info", `캐릭터 이미지 등록 완료 · 키포인트 감지 준비됨.`);
    } catch (err: any) {
      addLog("error", `캐릭터 이미지 업로드 실패: ${err.message}`);
    }
  };

  // 가먼트 추가
  const handleAddGarment = (slot: string) => {
    const id = `g-${Date.now()}`;
    const newGarment: GarmentItem = {
      id,
      name: `${slot}-untitled-${garments.length + 1}.png`,
      slot,
      layer: garments.length + 1,
      fit: 70,
    };
    setGarments((prev) => [...prev, newGarment]);
    addLog("info", `가먼트 추가: ${slot} 슬롯 · 레이어 ${garments.length + 1}.`);
  };

  // 가먼트 삭제
  const handleRemoveGarment = (id: string) => {
    const target = garments.find((g) => g.id === id);
    setGarments((prev) => prev.filter((g) => g.id !== id));
    addLog("warn", `가먼트 제거: ${target?.name || id}`);
  };

  // 가먼트 핏 업데이트
  const handleUpdateFit = (id: string, fit: number) => {
    setGarments((prev) =>
      prev.map((g) => (g.id === id ? { ...g, fit } : g))
    );
  };

  // 가먼트 이미지 개별 업로드
  const handleUploadGarmentImage = async (id: string, file: File) => {
    try {
      addLog("info", `가먼트 이미지 업로드 중: ${file.name}`);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "garments");

      const res = await fetch("/api/vton/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("업로드 실패");
      const data = await res.json();

      setGarments((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, name: file.name, imageUrl: data.url }
            : g
        )
      );
      addLog("info", `가먼트 이미지 등록 완료: ${file.name}`);
    } catch (err: any) {
      addLog("error", `가먼트 업로드 오류: ${err.message}`);
    }
  };

  // 착장 생성 (Render)
  const handleRender = async () => {
    setIsRendering(true);
    setProgress(15);
    addLog("info", `착장 생성 시작 — ${sizePreset.label} · seed ${seed}.`);

    try {
      const res = await fetch("/api/vton/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size: sizePreset.label,
          seed,
          characterUrl: character.imageUrl,
          garments,
          bgSetting,
          characterSetting: character,
          // FASHN try-on 파라미터
          mode: renderMode,
          segmentationFree: character.autoRemoveBg,
          modelName: "tryon-v1.6",
        }),
      });

      const data = await res.json();

      // 서버가 단계별 로그를 돌려주므로 성공/실패 여부와 무관하게 먼저 반영한다.
      if (Array.isArray(data.logs)) {
        data.logs.forEach((l: LogEntry) => addLog(l.level, l.text));
      }

      if (!res.ok) {
        throw new Error(data.error || "렌더링 실패");
      }

      setProgress(100);
      setResultImageUrl(data.resultImageUrl);
      addLog(
        "info",
        data.simulated
          ? "데모 미리보기를 표시했습니다 (실제 FASHN 인퍼런스 아님)."
          : "FASHN 가상 피팅 완료 — 결과물이 캔버스에 표시됩니다."
      );
    } catch (err: any) {
      setProgress(0);
      addLog("error", `착장 생성 중 오류 발생: ${err.message}`);
    } finally {
      setIsRendering(false);
    }
  };

  // CLI 명령어 실행
  const handleRunCommand = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    addLog("info", `› ${cmd}`);
    const [head, arg] = cmd.split(/\s+/);

    if (head === "help") {
      addLog(
        "info",
        "명령어 안내: help · seed <n> · fit <0-100> · scale <n> · mode <performance|balanced|quality> · render · clear"
      );
    } else if (head === "seed" && arg) {
      setSeed(Number(arg));
      addLog("info", `시드 ${Number(arg)} 적용.`);
    } else if (head === "fit" && arg) {
      const v = Math.max(0, Math.min(100, Number(arg)));
      setGarments((prev) => prev.map((g) => ({ ...g, fit: v })));
      addLog("info", `전체 가먼트 반영도 ${v}% 적용.`);
    } else if (head === "scale" && arg) {
      const s = Number(arg);
      setCharacter((prev) => ({ ...prev, scale: s }));
      addLog("info", `인물 크기 ${s}% 적용.`);
    } else if (head === "mode" && arg) {
      if (arg === "performance" || arg === "balanced" || arg === "quality") {
        setRenderMode(arg);
        addLog("info", `FASHN 렌더 모드 «${arg}» 적용.`);
      } else {
        addLog("error", `알 수 없는 모드: ${arg} (performance | balanced | quality)`);
      }
    } else if (head === "render") {
      handleRender();
    } else if (head === "clear") {
      setLogs([]);
    } else {
      addLog("error", `알 수 없는 명령: ${head}`);
    }
  };

  // 프로젝트 세션 저장 (Supabase DB)
  const handleSaveProject = async () => {
    setIsSaving(true);
    addLog("info", "현재 세션을 Supabase DB에 저장 중...");
    try {
      const res = await fetch("/api/vton/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `VTON Session (${sizePreset.label})`,
          width: w,
          height: h,
          size_label: sizePreset.label,
          bg_type: bgSetting.mode,
          bg_value: bgSetting.cssBg,
          bg_fit: bgSetting.bgFit,
          character_image_url: character.imageUrl,
          character_scale: character.scale,
          auto_remove_bg: character.autoRemoveBg,
          preserve_face_hands: character.preserveFaceHands,
          seed,
          garments,
        }),
      });

      if (!res.ok) throw new Error("저장 실패");
      addLog("info", "세션이 Supabase DB에 성공적으로 저장되었습니다.");
    } catch (err: any) {
      addLog("error", `세션 저장 실패: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 프로젝트 목록 불러오기
  const handleOpenHistory = async () => {
    setHistoryModalOpen(true);
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/vton/projects");
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data.projects || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  // 특정 세션 로드
  const handleSelectProject = (p: VtonProject) => {
    setW(p.width);
    setH(p.height);
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const d = gcd(p.width, p.height);
    setSizePreset({
      label: p.size_label || `${p.width} × ${p.height}`,
      w: p.width,
      h: p.height,
      ratioLabel: `${p.width / d}:${p.height / d}`,
    });

    setBgSetting({
      mode: p.bg_type || "css",
      cssBg: p.bg_value || "보케",
      bgFit: p.bg_fit || "Cover",
    });

    setCharacter({
      imageUrl: p.character_image_url,
      scale: p.character_scale || 100,
      autoRemoveBg: p.auto_remove_bg ?? true,
      preserveFaceHands: p.preserve_face_hands ?? true,
    });

    if (p.garments) {
      setGarments(
        p.garments.map((g: any) => ({
          id: g.id,
          name: g.name,
          slot: g.slot,
          layer: g.layer,
          fit: g.fit,
          imageUrl: g.image_url,
        }))
      );
    }

    setSeed(p.seed || 4821);
    setHistoryModalOpen(false);
    addLog("info", `이전 세션 «${p.title}» 설정을 불러왔습니다.`);
  };

  // 세션 삭제
  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/vton/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjectsList((prev) => prev.filter((p) => p.id !== id));
        addLog("warn", "세션을 삭제했습니다.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const topGarment = garments[garments.length - 1];

  return (
    <div className="flex h-screen min-h-[660px] bg-[var(--color-bg)] text-[#201f1d] overflow-hidden">
      {/* 1. 좌측 컨트롤 사이드바 */}
      <aside className="w-[360px] flex-none flex flex-col border-r border-[var(--color-divider)] bg-[var(--color-panel)] overflow-hidden shadow-sm">
        <StudioHeader
          onOpenHistory={handleOpenHistory}
          onSaveProject={handleSaveProject}
          isSaving={isSaving}
        />

        {/* 스크롤 가능한 에디터 패널 */}
        <div className="vt-scroll flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          <button
            type="button"
            onClick={handleRender}
            disabled={isRendering}
            className="btn btn-primary w-full py-3 text-[14px] rounded-full shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>{isRendering ? "착장 렌더링 중..." : "✦ AI 가상 착장 생성"}</span>
          </button>

          {/* 1) 배경 크기 & 2) 배경 스타일 */}
          <BackgroundSection
            currentSize={sizePreset.label}
            w={w}
            h={h}
            ratioLabel={sizePreset.ratioLabel}
            bgSetting={bgSetting}
            bgListOpen={bgListOpen}
            onSelectSize={handleSelectPreset}
            onCustomSizeChange={handleCustomSize}
            onToggleBgList={() => setBgListOpen(!bgListOpen)}
            onSelectCssBg={(bg) => {
              setBgSetting((prev) => ({ ...prev, cssBg: bg }));
              addLog("info", `CSS 배경 «${bg}» 적용.`);
            }}
            onClearCssBg={() => {
              setBgSetting((prev) => ({ ...prev, cssBg: null }));
              addLog("warn", "CSS 배경을 제거했습니다.");
            }}
            onUploadCustomBg={handleUploadBgImage}
            onSelectBgFit={(fit) => {
              setBgSetting((prev) => ({ ...prev, bgFit: fit }));
              addLog("info", `배경 맞춤: ${fit}.`);
            }}
          />

          <div className="h-[1px] bg-[var(--color-divider)]" />

          {/* 3) 실사 캐릭터 설정 */}
          <CharacterSection
            character={character}
            onChange={(updated) => setCharacter((prev) => ({ ...prev, ...updated }))}
            onUploadImage={handleUploadCharacter}
          />

          <div className="h-[1px] bg-[var(--color-divider)]" />

          {/* 4) 가먼트(Garments) 레이어 관리 */}
          <GarmentSection
            garments={garments}
            onAddGarment={handleAddGarment}
            onRemoveGarment={handleRemoveGarment}
            onUpdateFit={handleUpdateFit}
            onUploadGarmentImage={handleUploadGarmentImage}
          />
        </div>

        {/* 하단 액션 풋터 */}
        <footer className="p-4 border-t border-[var(--color-divider)] bg-[var(--color-panel)] flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setResultImageUrl(null);
                addLog("info", "미리보기 레이어를 새로고침했습니다.");
              }}
              className="btn btn-secondary py-2.5 text-[12.5px] rounded-full"
            >
              미리보기 리셋
            </button>
            <button
              type="button"
              onClick={handleRender}
              disabled={isRendering}
              className="btn btn-primary py-2.5 text-[12.5px] rounded-full flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>착장 생성</span>
            </button>
          </div>
          <span className="text-[11px] text-[rgba(32,31,29,0.45)] italic text-center">
            Supabase Storage & DB 동기화 지원
          </span>
        </footer>
      </aside>

      {/* 2. 중앙 메인 캔버스 뷰포트 */}
      <main className="flex-1 flex min-w-0 min-h-0 relative">
        <StudioCanvas
          w={w}
          h={h}
          ratioLabel={sizePreset.ratioLabel}
          sizeLabel={sizePreset.label}
          bgSetting={bgSetting}
          character={character}
          garments={garments}
          seed={seed}
          resultImageUrl={resultImageUrl}
          isRendering={isRendering}
        />

        {/* 3. 우측 실시간 콘솔 패널 (오버레이 플로팅) */}
        <div className="absolute right-0 top-0 bottom-0 pointer-events-none flex justify-end z-20">
          <div className="pointer-events-auto h-full flex items-start">
            <StudioConsole
              logs={logs}
              progress={progress}
              selName={topGarment ? topGarment.name : "character / layer.base"}
              selBounds={`x 0 · y 0 · ${w}×${h}`}
              selFit={topGarment ? `${topGarment.slot} · ${topGarment.fit}%` : "—"}
              onClearLogs={() => setLogs([])}
              onRunCommand={handleRunCommand}
            />
          </div>
        </div>
      </main>

      {/* 4. 이전 세션 히스토리 모달 */}
      <ProjectHistoryModal
        visible={historyModalOpen}
        projects={projectsList}
        loading={loadingProjects}
        onClose={() => setHistoryModalOpen(false)}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
      />
    </div>
  );
}
