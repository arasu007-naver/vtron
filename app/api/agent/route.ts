import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicClientOptions, anthropicApiKey, MISSING_KEY_MESSAGE } from "@/lib/style-ex/api-key";
import { authenticate, unauthorized } from "@/lib/supabase/route";
import { NAV_LINKS } from "@/components/nav-links";

/**
 * POST /api/agent — 전역 채팅 도우미(`components/ChatAgent.tsx`).
 *   요청: { messages: [{ role: "user" | "assistant", content: string }] } (마지막은 user)
 *   응답: { reply: string, links: string[] } — links 는 NAV_LINKS 의 href 중 답과 관련된 것
 *
 * 앱의 페이지 목록(NavBar 와 같은 NAV_LINKS)을 알려 주고, 어느 페이지에서 무엇을 하는지 안내한다.
 */

export const runtime = "nodejs";

const MODEL = process.env.AGENT_MODEL || "claude-opus-5-5";
/** 대화가 길어져도 요청이 커지지 않게 최근 메시지만 보낸다 */
const MAX_MESSAGES = 20;
const MAX_CHARS = 4000;

const pageLines = NAV_LINKS.map(({ href, label, title }) => `- ${label} (${href}): ${title}`).join("\n");

const SYSTEM = `너는 STMX Studio 웹앱의 도우미다. 사용자가 원하는 일을 어느 페이지에서 할 수 있는지 안내하고, 앱 사용법 질문에 답한다.

[페이지 목록] — 레이블 (경로): 하는 일
${pageLines}

[답하는 법]
- 한국어로 짧게(두세 문장) 답한다. 페이지를 부를 때는 위의 레이블을 그대로 쓴다.
- links 에는 답과 관련된 페이지의 경로만 넣는다(관련 페이지가 없으면 빈 배열). 목록에 없는 경로는 만들지 않는다.
- 목록과 설명만으로 알 수 없는 기능은 추측하지 말고 모른다고 말한다.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    links: { type: "array", items: { type: "string", enum: NAV_LINKS.map((l) => l.href) } },
  },
  required: ["reply", "links"],
  additionalProperties: false,
};

type ChatMessage = { role: "user" | "assistant"; content: string };

const isChatMessage = (m: unknown): m is ChatMessage =>
  typeof m === "object" &&
  m !== null &&
  ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
  typeof (m as ChatMessage).content === "string" &&
  (m as ChatMessage).content.trim().length > 0;

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();
  if (!anthropicApiKey()) return NextResponse.json({ error: MISSING_KEY_MESSAGE }, { status: 500 });

  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
  const all = Array.isArray(body?.messages) ? body.messages.filter(isChatMessage) : [];
  // 첫 메시지는 user 여야 한다
  let messages = all.slice(-MAX_MESSAGES).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (messages.length && messages[0].role !== "user") messages = messages.slice(1);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "마지막 메시지는 사용자 질문이어야 합니다." }, { status: 400 });
  }

  const client = new Anthropic(anthropicClientOptions());
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // 거절 시 서버가 권장 모델로 다시 실행한다
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      system: SYSTEM,
      messages,
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json({ reply: "이 질문에는 답할 수 없습니다.", links: [] });
    }
    if (response.stop_reason === "max_tokens") {
      return NextResponse.json({ error: "답이 너무 길어 잘렸습니다." }, { status: 502 });
    }
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const parsed = JSON.parse(text) as { reply?: unknown; links?: unknown };
    const known = new Set<string>(NAV_LINKS.map((l) => l.href));
    return NextResponse.json({
      reply: typeof parsed.reply === "string" ? parsed.reply : "",
      links: Array.isArray(parsed.links) ? parsed.links.filter((h): h is string => typeof h === "string" && known.has(h)) : [],
    });
  } catch (e) {
    const message = e instanceof Anthropic.APIError ? `Anthropic ${e.status ?? ""}: ${e.message}` : e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
