"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { NAV_LINKS } from "./nav-links";

/**
 * 전역 채팅 도우미.
 *
 * 루트 레이아웃에 한 번만 붙어 모든 페이지의 오른쪽 아래에 토글 버튼으로 뜬다. 패널에는
 * NavBar 의 모든 링크가 같은 레이블의 버튼으로 있고, 질문하면 `/api/agent` 가 답과 함께
 * 관련 페이지를 골라 준다. `/login` 에서는 렌더하지 않는다(NavBar 와 같은 이유).
 */

type Message = { role: "user" | "assistant"; content: string; links?: string[] };

const linkOf = new Map<string, (typeof NAV_LINKS)[number]>(NAV_LINKS.map((l) => [l.href, l]));

function LinkButton({ href, onNavigate }: { href: string; onNavigate: () => void }) {
  const link = linkOf.get(href);
  if (!link) return null;
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      title={link.title}
      onClick={onNavigate}
      className="btn btn-secondary px-2.5 py-1 text-[14px] rounded-full flex items-center gap-1 whitespace-nowrap no-underline"
    >
      <Icon className="w-3.5 h-3.5 flex-none text-[var(--color-accent-700)]" />
      {link.label}
    </Link>
  );
}

export default function ChatAgent() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending, open]);

  if (pathname === "/login" || pathname.startsWith("/login/")) return null;

  const close = () => setOpen(false);

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;
    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setError(null);
    setSending(true);
    try {
      const res = await authFetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; links?: string[]; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error || `응답 실패 (${res.status})`);
      setMessages([...next, { role: "assistant", content: data.reply, links: data.links ?? [] }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2 select-text">
      {open && (
        <section
          aria-label="채팅 도우미"
          className="w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-6rem))] flex flex-col rounded-2xl border border-[var(--color-divider)] bg-[var(--color-panel)] shadow-xl overflow-hidden"
        >
          <header className="flex-none flex items-center gap-2 px-3 py-2 border-b border-[var(--color-divider)]">
            <MessageCircle className="w-4 h-4 text-[var(--color-accent)]" />
            <span className="font-semibold text-[15px]">STMX 도우미</span>
            <button
              type="button"
              onClick={close}
              aria-label="채팅 닫기"
              className="ml-auto p-1 rounded-full hover:bg-[rgba(32,31,29,0.06)]"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div className="flex-none px-3 py-2 border-b border-[var(--color-divider)]">
            <div className="text-[12px] text-black/60 mb-1.5">바로가기</div>
            <div className="flex flex-wrap gap-1.5">
              {NAV_LINKS.map((l) => (
                <LinkButton key={l.href} href={l.href} onNavigate={close} />
              ))}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto vt-scroll px-3 py-2 flex flex-col gap-2">
            {messages.length === 0 && (
              <p className="text-[14px] text-black/60">하고 싶은 일을 물어보세요. 해당 페이지로 안내해 드립니다.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-[14px] whitespace-pre-wrap ${
                    m.role === "user" ? "bg-[rgba(182,130,53,0.16)]" : "bg-[var(--color-surface)]"
                  }`}
                >
                  {m.content}
                </div>
                {m.links && m.links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.links.map((href) => (
                      <LinkButton key={href} href={href} onNavigate={close} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent-700)]" />}
            {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
          </div>

          <form
            className="flex-none flex items-end gap-2 px-3 py-2 border-t border-[var(--color-divider)]"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="질문을 입력하세요 (Enter 전송 · Shift+Enter 줄바꿈)"
              aria-label="질문"
              className="flex-1 resize-none rounded-xl border border-[var(--color-divider)] bg-white px-2.5 py-1.5 text-[14px] outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="보내기"
              className="btn btn-primary p-2 rounded-full disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "채팅 도우미 닫기" : "채팅 도우미 열기"}
        aria-expanded={open}
        title="STMX 도우미"
        className="w-12 h-12 rounded-full btn btn-primary shadow-lg flex items-center justify-center"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </div>
  );
}
