import "server-only";

/**
 * style-ex 가 쓰는 Anthropic API 키. ANTHROPIC_API_KEY 를 우선하고, 없으면 CLAUDE_API_KEY 를 쓴다.
 * 키는 환경 변수로만 받는다 — 파일이나 응답에 남기지 않는다.
 */
export const anthropicApiKey = (): string | null =>
  process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim() || null;

/**
 * 워크스페이스에 묶이지 않은 키는 요청마다 anthropic-workspace-id 헤더가 있어야 한다.
 * ANTHROPIC_WORKSPACE_ID 를 설정하면 모든 style-ex 호출에 그 헤더를 붙인다.
 */
export const anthropicClientOptions = () => {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  return {
    apiKey: anthropicApiKey(),
    ...(workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {}),
  };
};

export const MISSING_KEY_MESSAGE =
  "Anthropic API 키가 없습니다. .env.local 에 ANTHROPIC_API_KEY 또는 CLAUDE_API_KEY 를 넣고 서버를 다시 시작하세요.";
