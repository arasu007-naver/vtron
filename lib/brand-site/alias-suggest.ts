import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicClientOptions, anthropicApiKey, MISSING_KEY_MESSAGE } from "@/lib/style-ex/api-key";
import { normalizeSearch } from "@/lib/hangul";

/**
 * 브랜드 별칭 찾기 — Claude 가 웹을 검색해 그 브랜드를 사람들이 부르는 다른 이름을 모은다.
 *
 * 별칭은 착장 상품 검색이 브랜드를 알아보는 데 쓴다(`lib/catalog-search/plan.ts`,
 * stmx-web `@stmx/core/catalog-search`). 영문 표기("LOUIS VUITTON"), 한글 표기 변형("셀린느" ·
 * "셀린"), 줄임말("LV", "CK"), 예전 이름 같은 것이다. 여기서는 **제안만** 한다 — 관리자 화면
 * (`/admin/brands`)에서 사람이 고르고 저장한다.
 *
 * **웹에서 찾은 것만** 내놓는다. 모델이 아는 것으로 채우지 않도록, 별칭마다 그 이름이 나온 검색
 * 결과의 URL 과 그 페이지의 문구를 받고, 서버가 두 가지를 확인해 못 넘으면 버린다.
 *  - URL 이 이번 웹 검색이 실제로 돌려준 결과(또는 인용) 중 하나인가
 *  - 문구 안에 그 별칭이 들어 있는가(대소문자 · 공백 · 구두점 무시)
 *
 * 웹 검색은 서버 도구(web_search)가 하고, 결과는 엄격한 사용자 도구 `submit_aliases` 의 입력으로
 * 받는다. 이 모델은 도구를 강제할 수 없어(tool_choice any/tool 은 400) 프롬프트로 부르게 하고,
 * 끝내 안 부르면 오류로 돌려준다.
 */

const MODEL = "claude-opus-5-5";
const MAX_TURNS = 4;
const MAX_ALIASES = 15;
const MAX_ALIAS_LENGTH = 60;

export interface AliasSuggestion {
  alias: string;
  /** 왜 이 이름인가 — 한 줄. */
  reason: string;
  /** 이 별칭이 나온 웹 검색 결과. */
  source: { title: string; url: string };
  /** 그 페이지에서 별칭이 쓰인 문구. */
  evidence: string;
}

export interface AliasSuggestResult {
  suggestions: AliasSuggestion[];
  /** 모델이 읽은 웹 페이지 — 관리자가 근거를 확인할 수 있게. */
  sources: { title: string; url: string }[];
  /** 근거(검색 결과 URL · 문구)를 대지 못해 버린 제안 수. */
  droppedCount: number;
  model: string;
}

export interface AliasSuggestInput {
  displayName: string;
  naverBrandName: string | null;
  websiteUrl: string | null;
}

export class AliasSuggestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const SUBMIT_TOOL = {
  name: "submit_aliases",
  description:
    "Submit the final list of aliases for the brand. Call this exactly once, after searching the web.",
  strict: true,
  input_schema: {
    type: "object" as const,
    properties: {
      aliases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            alias: { type: "string", description: "The alias exactly as people write it." },
            reason: {
              type: "string",
              description: "One short Korean sentence: what kind of name this is and where it is used.",
            },
            source_url: {
              type: "string",
              description: "URL of a web_search result from this conversation in which the alias appears.",
            },
            evidence: {
              type: "string",
              description: "The exact short phrase from that search result in which the alias appears.",
            },
          },
          required: ["alias", "reason", "source_url", "evidence"],
          additionalProperties: false,
        },
      },
    },
    required: ["aliases"],
    additionalProperties: false,
  },
};

const SYSTEM = `You help a Korean fashion commerce admin fill in brand aliases.
Aliases let shoppers find a brand in a search box, so collect the names people in Korea actually type for this brand:
- the official English name and its common spellings (e.g. "LOUIS VUITTON")
- Korean spellings and common variants (e.g. "셀린느", "셀린")
- widely used abbreviations and nicknames (e.g. "LV", "CK")
- former names, or the parent name when shoppers use it for this brand
Do not include: names of other brands, product lines or collections, slogans, category words, or names nobody uses.
Only report aliases you saw in web_search results in this conversation. Do not add anything from your own knowledge, even if you are sure of it: if no search result shows a name, leave it out.
For each alias give source_url (the URL of the search result where it appears) and evidence (the exact short phrase from that result containing the alias).
Run several searches, not one. At least: the Korean name with "영문" (English name), the English name with "한글" or "한국" (Korean spellings), and the brand name with "약자" or "줄임말" (abbreviations). Prefer the brand's official site, Korean shopping malls (Musinsa, 29CM, W Concept, SSG, Lotte ON), and Korean fashion press.
A search result's title counts as evidence too.
When you are done, call submit_aliases exactly once. An empty list is fine. Write each reason in Korean.`;

function prompt(input: AliasSuggestInput) {
  const lines = [
    `Brand display name (Korean admin name): ${input.displayName}`,
    `Name on Naver Shopping: ${input.naverBrandName ?? "(unknown)"}`,
    `Official website: ${input.websiteUrl ?? "(unknown)"}`,
    "",
    "Search the web for this brand's aliases and report only what the search results show.",
  ];
  return lines.join("\n");
}

interface RawAlias {
  alias: string;
  reason: string;
  source_url: string;
  evidence: string;
}

/** 같은 페이지를 가리키는 URL 은 같게 — 끝의 / 와 #조각, 대소문자 차이를 무시한다. */
const urlKey = (url: string) =>
  url.trim().replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();

/** 대소문자 · 공백 · 구두점만 다른 것은 같은 별칭으로 본다(검색이 그렇게 맞추기 때문). */
export function cleanAliases(values: string[], displayName: string): string[] {
  const seen = new Set([normalizeSearch(displayName)]);
  const out: string[] = [];
  for (const raw of values) {
    const alias = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_ALIAS_LENGTH);
    const key = normalizeSearch(alias);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
  }
  return out;
}

export async function suggestBrandAliases(input: AliasSuggestInput): Promise<AliasSuggestResult> {
  if (!anthropicApiKey()) throw new AliasSuggestError(MISSING_KEY_MESSAGE, 503);

  const client = new Anthropic({ ...anthropicClientOptions(), timeout: 120_000 });
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt(input) }];
  const sources = new Map<string, { title: string; url: string }>();

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const message = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: SYSTEM,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }, SUBMIT_TOOL],
        messages,
      })
      .finalMessage();

    // 이번 검색이 실제로 돌려준 페이지들 — 제안의 근거는 이 안에 있어야 한다.
    for (const block of message.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const result of block.content) {
          if (result.type === "web_search_result" && !sources.has(urlKey(result.url))) {
            sources.set(urlKey(result.url), { url: result.url, title: result.title });
          }
        }
      }
      if (block.type === "text") {
        for (const cite of block.citations ?? []) {
          if (cite.type === "web_search_result_location" && !sources.has(urlKey(cite.url))) {
            sources.set(urlKey(cite.url), { url: cite.url, title: cite.title ?? cite.url });
          }
        }
      }
    }

    if (message.stop_reason === "refusal") {
      throw new AliasSuggestError("모델이 이 요청을 거절했습니다.", 502);
    }

    const submit = message.content.find(
      (block): block is Anthropic.Beta.BetaToolUseBlock =>
        block.type === "tool_use" && block.name === SUBMIT_TOOL.name
    );
    if (submit) {
      if (message.stop_reason === "max_tokens") {
        throw new AliasSuggestError("별칭 목록이 잘렸습니다. 다시 시도해 주세요.", 502);
      }
      const raw = (submit.input as { aliases?: RawAlias[] }).aliases ?? [];
      // 근거가 맞는 것만 남긴다 — 검색 결과에 없는 URL, 별칭이 안 들어간 문구는 버린다.
      const grounded = raw.filter((item) => {
        const key = normalizeSearch(item.alias ?? "");
        return (
          key.length > 0 &&
          sources.has(urlKey(item.source_url ?? "")) &&
          normalizeSearch(item.evidence ?? "").includes(key)
        );
      });
      const byKey = new Map(grounded.map((item) => [normalizeSearch(item.alias), item]));
      const aliases = cleanAliases(
        grounded.map((item) => item.alias),
        input.displayName
      ).slice(0, MAX_ALIASES);
      return {
        suggestions: aliases.map((alias) => {
          const item = byKey.get(normalizeSearch(alias))!;
          return {
            alias,
            reason: item.reason ?? "",
            source: sources.get(urlKey(item.source_url))!,
            evidence: item.evidence.slice(0, 200),
          };
        }),
        sources: [...sources.values()].slice(0, 12),
        droppedCount: raw.length - grounded.length,
        model: message.model,
      };
    }

    // 서버 도구가 한 턴에 다 못 끝내면 pause_turn — 그대로 돌려보내 이어 가게 한다.
    messages.push({ role: "assistant", content: message.content });
    if (message.stop_reason !== "pause_turn") {
      messages.push({
        role: "user",
        content: "Call submit_aliases now with the aliases you found.",
      });
    }
  }

  throw new AliasSuggestError("모델이 별칭 목록을 내지 않았습니다. 다시 시도해 주세요.", 502);
}
