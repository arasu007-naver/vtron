"use client";

import { useEffect, useState } from "react";
import { KeyRound, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { issueNaverToken } from "@/lib/playground/client";
import type { NaverTokenResult } from "@/types/playground";

/**
 * 네이버 커머스 액세스 토큰 바.
 *
 * 시크릿은 브라우저에 두지 않는다. [토큰 발급]은 `/api/playground/naver/token`
 * 을 부르고, 서버가 bcrypt 서명을 만들어 커머스 API 에 요청한다. 다른 스토어의
 * 자격 증명으로 시험해 보고 싶을 때만 '직접 입력'으로 한 번 넘길 수 있다.
 *
 * 받은 토큰은 메모리에만 두고(3시간짜리다), 요청에서는 `{{accessToken}}` 으로 쓴다.
 */

interface NaverTokenBarProps {
  token: NaverTokenResult | null;
  onToken: (token: NaverTokenResult | null) => void;
}

interface ConfigState {
  configured: boolean;
  clientId: string | null;
  baseUrl: string;
}

const remainingLabel = (token: NaverTokenResult, now: number) => {
  const left = token.issuedAt + token.expiresIn * 1000 - now;
  if (left <= 0) return "만료됨";
  const m = Math.floor(left / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분 남음` : `${m}분 남음`;
};

export default function NaverTokenBar({ token, onToken }: NaverTokenBarProps) {
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"SELF" | "SELLER">("SELF");
  const [accountId, setAccountId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    authFetch("/api/playground/naver/token", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data) setConfig(data as ConfigState);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 만료 카운트다운 — 토큰이 있을 때만 30초마다 다시 그린다.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [token]);

  const issue = async () => {
    setLoading(true);
    setError(null);
    const { token: issued, error: failure } = await issueNaverToken({
      type,
      accountId: type === "SELLER" ? accountId.trim() : undefined,
      clientId: clientId.trim() || undefined,
      clientSecret: clientSecret.trim() || undefined,
    });
    setLoading(false);

    if (failure || !issued) {
      setError(failure ?? "토큰을 받지 못했습니다.");
      onToken(null);
      return;
    }
    onToken(issued);
    setNow(Date.now());
  };

  const expired = token ? token.issuedAt + token.expiresIn * 1000 <= now : false;

  return (
    <div className="border-b border-[var(--pg-line)] bg-[var(--color-panel)]">
      <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
        <KeyRound className="w-3.5 h-3.5 text-[var(--color-accent-700)]" />
        <span className="text-[19.8px] font-semibold tracking-[0.1em] uppercase text-black">
          네이버 커머스 인증
        </span>

        <select
          className="pg-select"
          value={type}
          onChange={(e) => setType(e.target.value as "SELF" | "SELLER")}
          title="SELF = 내 스토어, SELLER = 위임받은 판매자"
        >
          <option value="SELF">SELF (자체)</option>
          <option value="SELLER">SELLER (위임)</option>
        </select>

        {type === "SELLER" && (
          <input
            className="pg-input max-w-[180px]"
            placeholder="account_id"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            spellCheck={false}
          />
        )}

        <button
          type="button"
          onClick={issue}
          disabled={loading}
          className="px-2.5 py-1 text-[20.7px] rounded btn btn-primary disabled:opacity-60"
        >
          {loading ? "발급 중…" : token ? "토큰 재발급" : "토큰 발급"}
        </button>

        {token ? (
          <span className="flex items-center gap-1.5 text-[20.7px]">
            <span
              className={`pg-status ${expired ? "pg-status-4" : "pg-status-2"}`}
              title="액세스 토큰"
            >
              {expired ? "만료" : "발급됨"}
            </span>
            <code className="text-[19.8px] text-black">
              {token.accessToken.slice(0, 6)}…{token.accessToken.slice(-4)}
            </code>
            <span className="text-black">{remainingLabel(token, now)}</span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(token.accessToken).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              title="토큰 복사"
              aria-label="토큰 복사"
              className="p-1 rounded text-black hover:text-black"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </span>
        ) : (
          <span className="text-[20.7px] text-black">
            {config === null
              ? "설정 확인 중…"
              : config.configured
                ? `서버 자격 증명 사용 · ${config.clientId}`
                : "서버에 자격 증명이 없습니다 — 아래에서 직접 입력하세요."}
          </span>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto px-2 py-1 text-[20.7px] rounded btn btn-secondary flex items-center gap-1"
        >
          직접 입력
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {open && (
        <div className="px-3 pb-2 flex items-center gap-2 flex-wrap">
          <input
            className="pg-input max-w-[240px]"
            placeholder="애플리케이션 ID (비우면 서버 환경변수)"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            spellCheck={false}
          />
          <input
            className="pg-input max-w-[280px]"
            type="password"
            placeholder="애플리케이션 시크릿 ($2a$04$…)"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            spellCheck={false}
          />
          <span className="text-[18.9px] text-black">
            여기 입력한 값은 저장하지 않고 발급 요청에만 쓴다.
          </span>
        </div>
      )}

      {error && (
        <div className="px-3 pb-2">
          <pre className="pg-code text-black">{error}</pre>
        </div>
      )}

      {token && (
        <div className="px-3 pb-2 text-[18.9px] text-black pg-mono break-all">
          sign: {token.debug.clientSecretSign.slice(0, 24)}… · timestamp:{" "}
          {token.debug.timestamp} · {token.debug.endpoint}
        </div>
      )}
    </div>
  );
}
