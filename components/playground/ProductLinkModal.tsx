"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, KeyRound, Link2, Search, X } from "lucide-react";
import { issueNaverToken, sendDraft } from "@/lib/playground/client";
import {
  applyFacets,
  buildCatalogLink,
  facetsOf,
  parseModelPage,
  type CatalogModel,
  type ModelPage,
} from "@/lib/playground/product-link";
import type { NaverTokenResult, RequestDraft } from "@/types/playground";

/**
 * 상품링크 — 플로우를 한 화면에서 돌리는 도구.
 *
 * 세 영역이 곧 플로우의 세 고비다.
 *
 *   1. 액세스 토큰 발급   — 인증
 *   2. 검색어 + 조회      — 카탈로그 모델 목록 (name 이 모델명·브랜드명·제조사명·카테고리명을 함께 훑는다)
 *   3. 토글 버튼 그룹     — 카테고리·브랜드로 걸러 확정
 *
 * 3번이 필요한 이유는 name 검색이 정확 일치가 아니기 때문이다. 토큰 분해 매칭이라
 * 동명이 리프(여성/남성 카디건)나 무관한 항목이 섞여 들어온다. 받아온 뒤 걸러야 한다.
 */

interface ProductLinkModalProps {
  open: boolean;
  onClose: () => void;
  /** 상단 토큰 바와 같은 토큰을 쓴다. */
  token: NaverTokenResult | null;
  onToken: (token: NaverTokenResult | null) => void;
}

/** size 상한은 100 이다(500·1000 은 400). */
const PAGE_SIZE = 100;

const searchDraft = (term: string): RequestDraft => ({
  method: "GET",
  url: "{{baseUrl}}/v1/product-models",
  params: [
    { id: "name", enabled: true, key: "name", value: term },
    { id: "page", enabled: true, key: "page", value: "1" },
    { id: "size", enabled: true, key: "size", value: String(PAGE_SIZE) },
  ],
  headers: [],
  bodyType: "none",
  body: "",
  auth: { mode: "naver", token: "", username: "", password: "" },
});

const remaining = (token: NaverTokenResult, now: number) => {
  const left = token.issuedAt + token.expiresIn * 1000 - now;
  if (left <= 0) return "만료됨";
  const m = Math.floor(left / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분 남음` : `${m}분 남음`;
};

export default function ProductLinkModal({
  open,
  onClose,
  token,
  onToken,
}: ProductLinkModalProps) {
  const [term, setTerm] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<ModelPage | null>(null);
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!token || !open) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [token, open]);

  const models: CatalogModel[] = useMemo(() => page?.contents ?? [], [page]);
  const categoryFacets = useMemo(() => facetsOf(models, "wholeCategoryName"), [models]);
  const brandFacets = useMemo(() => facetsOf(models, "brandName"), [models]);
  const visible = useMemo(
    () => applyFacets(models, categories, brands),
    [models, categories, brands]
  );

  if (!open) return null;

  const expired = token ? token.issuedAt + token.expiresIn * 1000 <= now : false;

  const issue = async () => {
    setIssuing(true);
    setError(null);
    const { token: issued, error: failure } = await issueNaverToken();
    setIssuing(false);
    if (failure || !issued) {
      setError(failure ?? "토큰을 받지 못했습니다.");
      onToken(null);
      return;
    }
    onToken(issued);
    setNow(Date.now());
  };

  const search = async () => {
    const query = term.trim();
    if (!query) {
      setError("검색어를 입력하세요. name 은 필수라 비우면 400 이 돌아옵니다.");
      return;
    }
    setSearching(true);
    setError(null);
    setPage(null);
    setCategories(new Set());
    setBrands(new Set());

    const { result, error: failure } = await sendDraft(
      searchDraft(query),
      token?.accessToken ?? null
    );
    setSearching(false);

    if (failure) {
      setError(failure);
      return;
    }
    if (!result) return;
    if (!result.ok) {
      setError(`HTTP ${result.status} · ${result.body.slice(0, 300)}`);
      return;
    }
    const parsed = parseModelPage(result.body);
    if (!parsed) {
      setError("모델 목록 형식이 아닙니다. 응답 원문을 확인하세요.");
      return;
    }
    setPage(parsed);
  };

  const toggle = (set: Set<string>, setter: (next: Set<string>) => void, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const links = visible.map((m) => buildCatalogLink(m.id));

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
        aria-label="상품링크"
        className="pg-app w-[1100px] max-w-full max-h-[88vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[var(--pg-line)]"
      >
        <header className="flex items-center gap-2 px-4 py-3 border-b border-[var(--pg-line)] bg-[var(--color-panel)]">
          <Link2 className="w-4 h-4 text-[var(--color-accent-700)]" />
          <h3 className="m-0 text-[25.2px] font-semibold text-black">상품링크</h3>
          <span className="text-[19.8px] text-black">
            카탈로그 모델을 찾아 링크로 옮긴다
          </span>
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

        {/* 1 · 액세스 토큰 발급 */}
        <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex items-center gap-2 flex-wrap">
          <Step n={1} label="액세스 토큰" />
          <button
            type="button"
            onClick={issue}
            disabled={issuing}
            className="px-2.5 py-1 text-[20.7px] rounded btn btn-primary flex items-center gap-1 disabled:opacity-60"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {issuing ? "발급 중…" : token ? "토큰 재발급" : "액세스 토큰 발급"}
          </button>
          {token ? (
            <span className="flex items-center gap-1.5 text-[20.7px]">
              <span className={`pg-status ${expired ? "pg-status-4" : "pg-status-2"}`}>
                {expired ? "만료" : "발급됨"}
              </span>
              <code className="text-[19.8px] text-black">
                {token.accessToken.slice(0, 6)}…{token.accessToken.slice(-4)}
              </code>
              <span className="text-black/60">{remaining(token, now)}</span>
            </span>
          ) : (
            <span className="text-[19.8px] text-black/60">
              토큰이 없으면 조회가 401 로 막힙니다.
            </span>
          )}
        </section>

        {/* 2 · 검색어 + 조회 */}
        <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex items-center gap-2 flex-wrap">
          <Step n={2} label="검색어" />
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
            <input
              className="pg-input pl-8"
              placeholder="카테고리명 · 브랜드명 · 모델명 (예: 풀오버 · 나이키 · 에어맥스)"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  void search();
                }
              }}
              spellCheck={false}
            />
          </div>
          <button
            type="button"
            onClick={search}
            disabled={searching}
            className="px-3 py-1 text-[20.7px] rounded btn btn-primary disabled:opacity-60"
          >
            {searching ? "조회 중…" : "조회"}
          </button>
          {page && (
            <span className="text-[19.8px] text-black/60 whitespace-nowrap">
              전체 {page.totalElements?.toLocaleString() ?? "-"}건 중 {models.length}건
              (size {PAGE_SIZE})
            </span>
          )}
        </section>

        {/* 3 · 토글 버튼 그룹 */}
        <section className="px-4 py-2.5 border-b border-[var(--pg-line)] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Step n={3} label="걸러내기" />
            <span className="text-[19.8px] text-black/60">
              끈 것이 없으면 전체입니다. 이름 검색이 정확 일치가 아니라 무관한 항목이 섞입니다.
            </span>
            {(categories.size > 0 || brands.size > 0) && (
              <button
                type="button"
                onClick={() => {
                  setCategories(new Set());
                  setBrands(new Set());
                }}
                className="ml-auto px-2 py-0.5 text-[18.9px] rounded btn btn-secondary"
              >
                초기화
              </button>
            )}
          </div>

          <FacetRow
            label="카테고리"
            facets={categoryFacets}
            selected={categories}
            onToggle={(v) => toggle(categories, setCategories, v)}
          />
          <FacetRow
            label="브랜드"
            facets={brandFacets}
            selected={brands}
            onToggle={(v) => toggle(brands, setBrands, v)}
          />
        </section>

        {error && (
          <pre className="pg-code m-4 mb-0 text-black">{error}</pre>
        )}

        {/* 결과 — 링크 */}
        <div className="flex-1 min-h-0 overflow-auto vt-scroll p-4">
          {!page && !error && (
            <p className="m-0 text-[22.5px] text-black/60">
              토큰을 발급하고 검색어로 조회하세요.
            </p>
          )}

          {page && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[20.7px] text-black">
                  링크 {visible.length.toLocaleString()}건
                </span>
                {visible.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(links.join("\n")).catch(() => {});
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    }}
                    className="px-2 py-0.5 text-[18.9px] rounded btn btn-secondary flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    링크 전체 복사
                  </button>
                )}
              </div>

              {visible.length === 0 ? (
                <p className="m-0 text-[20.7px] text-black/60">
                  걸러낸 결과가 없습니다. 위 토글을 확인하세요.
                </p>
              ) : (
                <ul className="list-none m-0 p-0 flex flex-col">
                  {visible.map((model) => (
                    <li
                      key={String(model.id)}
                      className="py-1.5 border-b border-[var(--pg-line)] flex flex-col gap-0.5"
                    >
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-[21.6px] text-black">{model.name}</span>
                        {model.brandName && (
                          <span className="text-[18.9px] text-black/55">
                            {model.brandName}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard
                              .writeText(buildCatalogLink(model.id))
                              .catch(() => {});
                            setCopiedId(String(model.id));
                            setTimeout(() => setCopiedId(null), 1200);
                          }}
                          title="이 상품 링크 복사"
                          className="ml-auto px-2 py-0.5 text-[18.9px] rounded btn btn-secondary flex items-center gap-1"
                        >
                          {copiedId === String(model.id) ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedId === String(model.id) ? "복사됨" : "복사"}
                        </button>
                        <a
                          href={buildCatalogLink(model.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 text-[18.9px] rounded btn btn-secondary flex items-center gap-1"
                          title="새 탭에서 열기"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          열기
                        </a>
                      </span>
                      <span className="text-[18px] text-black/45">
                        {model.wholeCategoryName}
                      </span>
                      <code className="text-[18.9px] text-black/70 break-all">
                        {buildCatalogLink(model.id)}
                      </code>
                    </li>
                  ))}
                </ul>
              )}

              <p className="m-0 mt-3 text-[18.9px] text-black/55 leading-relaxed">
                링크 형식(<code>search.shopping.naver.com/catalog/&#123;id&#125;</code>)은 아직
                검증되지 않았습니다. 다르면{" "}
                <code>lib/playground/product-link.ts</code> 의 CATALOG_LINK_BASE 만 고치면 됩니다.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const Step = ({ n, label }: { n: number; label: string }) => (
  <span className="flex items-center gap-1.5 flex-none">
    <span className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-[19.8px] font-bold text-black">
      {n}
    </span>
    <span className="text-[20.7px] font-semibold text-black">{label}</span>
  </span>
);

/**
 * 카테고리 경로는 `패션의류>여성의류>니트>풀오버` 처럼 길다. 버튼에는 끝 두 마디만
 * 보이고 전체 경로는 title 로 둔다 — 토글이 한 줄을 다 잡아먹지 않도록.
 */
const shortLabel = (value: string) => {
  const parts = value.split(">");
  return parts.length <= 2 ? value : `…>${parts.slice(-2).join(">")}`;
};

function FacetRow({
  label,
  facets,
  selected,
  onToggle,
}: {
  label: string;
  facets: { value: string; count: number }[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[19.8px] text-black/60 w-[72px] flex-none pt-1">{label}</span>
      <div className="flex items-center gap-1 flex-wrap min-h-[30px]">
        {facets.length === 0 ? (
          <span className="text-[18.9px] text-black/40 pt-1">조회 결과가 없습니다.</span>
        ) : (
          facets.map((facet) => (
            <button
              key={facet.value}
              type="button"
              className="pg-tab"
              data-active={selected.has(facet.value)}
              aria-pressed={selected.has(facet.value)}
              onClick={() => onToggle(facet.value)}
              title={facet.value}
            >
              {shortLabel(facet.value)}
              <span className="ml-1 text-black/45">{facet.count}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
