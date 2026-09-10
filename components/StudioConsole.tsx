"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Terminal, Trash2, Send } from "lucide-react";
import { LogEntry } from "@/types/vton";

interface StudioConsoleProps {
  logs: LogEntry[];
  progress: number;
  selName: string;
  selBounds: string;
  selFit: string;
  onClearLogs: () => void;
  onRunCommand: (command: string) => void;
}

export default function StudioConsole({
  logs,
  progress,
  selName,
  selBounds,
  selFit,
  onClearLogs,
  onRunCommand,
}: StudioConsoleProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [cmd, setCmd] = useState("");
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    onRunCommand(cmd);
    setCmd("");
  };

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "warn":
        return "text-black";
      case "error":
        return "text-black";
      case "info":
      default:
        return "text-black";
    }
  };

  return (
    <section className="w-[320px] max-w-[360px] flex flex-col border border-[rgba(32,31,29,0.2)] rounded bg-[rgba(248,244,244,0.9)] backdrop-blur-md shadow-lg m-4 overflow-hidden self-start flex-none">
      {/* 콘솔 헤더 */}
      <header className="flex items-center gap-2.5 px-3 h-9 border-b border-[rgba(32,31,29,0.14)] bg-white/70">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-5 h-5 border border-[rgba(32,31,29,0.2)] rounded-full text-[rgba(32,31,29,0.6)] hover:bg-black/5 cursor-pointer"
        >
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <span className="font-[family-name:var(--font-heading)] font-semibold text-[21.6px] tracking-[0.12em] uppercase text-black flex items-center gap-1">
          <Terminal className="w-3.5 h-3.5 text-[var(--color-accent-700)]" />
          <span>콘솔 로그</span>
        </span>
        <span className="w-[1px] h-3.5 bg-[rgba(32,31,29,0.16)]" />
        <span className="text-[19.8px] text-black [font-feature-settings:'tnum']">
          {logs.length}줄
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onClearLogs}
          title="로그 비우기"
          className="p-1 px-2 border border-[rgba(32,31,29,0.18)] rounded-full text-[19.8px] text-black hover:bg-black/5 flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-2.5 h-2.5" />
          <span>비우기</span>
        </button>
      </header>

      {isOpen && (
        <div className="flex flex-col min-h-0">
          {/* 진행률 바 */}
          <div className="p-2.5 px-3 border-b border-[rgba(32,31,29,0.12)] flex flex-col gap-1 bg-white/40">
            <div className="flex justify-between text-[18.9px] tracking-[0.1em] uppercase text-black">
              <span>진행률</span>
              <span className="text-black font-semibold [font-feature-settings:'tnum']">
                {progress}%
              </span>
            </div>
            <div className="h-1 bg-[rgba(32,31,29,0.1)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 선택 영역 상태 */}
          <div className="p-2 px-3 border-b border-[rgba(32,31,29,0.12)] grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[19.8px] font-mono bg-white/30">
            <span className="text-black">target</span>
            <span className="truncate text-black">{selName}</span>
            <span className="text-black">bounds</span>
            <span className="text-black">{selBounds}</span>
            <span className="text-black">fit</span>
            <span className="text-black">{selFit}</span>
          </div>

          {/* 로그 리스트 */}
          <div
            ref={logContainerRef}
            className="vt-scroll min-h-[120px] max-h-[220px] overflow-y-auto p-2.5 px-3 flex flex-col gap-1 font-mono text-[19.8px] leading-relaxed bg-[#f8f4f4]"
          >
            {logs.length === 0 ? (
              <span className="text-black italic">
                기록된 콘솔 로그가 없습니다.
              </span>
            ) : (
              logs.map((l, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-[48px_38px_minmax(0,1fr)] gap-1.5 ${getLevelColor(
                    l.level
                  )}`}
                >
                  <span className="text-black">{l.time}</span>
                  <span className="text-[17.1px] uppercase font-bold tracking-wider pt-0.5">
                    {l.level}
                  </span>
                  <span className="break-all">{l.text}</span>
                </div>
              ))
            )}
          </div>

          {/* CLI 커맨드 인풋 */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-1.5 p-2 px-2.5 border-t border-[rgba(32,31,29,0.14)] bg-white"
          >
            <span className="text-black font-mono text-[21.6px] font-bold">
              ›
            </span>
            <input
              type="text"
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder="help · seed 4821 · fit 80 · render"
              className="flex-1 min-w-0 border-0 bg-transparent text-black font-mono text-[19.8px] outline-none"
            />
            <button
              type="submit"
              className="btn btn-primary p-1 px-2.5 text-[18.9px] rounded-full flex items-center gap-1"
            >
              <Send className="w-2.5 h-2.5" />
              <span>실행</span>
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
