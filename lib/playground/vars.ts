/**
 * 요청 정의에 쓰는 `{{변수}}` 치환.
 *
 * 두 군데서 치환한다.
 *
 * - **클라이언트** — 발급받은 액세스 토큰, 현재 시각 같은 브라우저가 아는 값.
 * - **서버**(`/api/playground/request`) — 애플리케이션 ID·시크릿에서 파생되는 값.
 *   시크릿은 브라우저로 내려보내지 않으므로 서명(`clientSecretSign`)은 반드시
 *   서버에서 만들어야 한다.
 *
 * 클라이언트가 먼저 치환하고 남은 `{{...}}` 를 서버가 채우는 순서다.
 */

export interface VariableDoc {
  name: string;
  where: "client" | "server";
  description: string;
}

export const VARIABLES: VariableDoc[] = [
  {
    name: "accessToken",
    where: "client",
    description: "상단 토큰 바에서 발급받은 네이버 커머스 액세스 토큰",
  },
  { name: "now", where: "client", description: "현재 시각(epoch ms)" },
  { name: "today", where: "client", description: "오늘 날짜 (YYYY-MM-DD)" },
  { name: "isoNow", where: "client", description: "현재 시각 ISO 8601 (KST 오프셋)" },
  { name: "isoHourAgo", where: "client", description: "1시간 전 ISO 8601" },
  { name: "isoDayAgo", where: "client", description: "24시간 전 ISO 8601" },
  { name: "uuid", where: "client", description: "임의의 UUID v4" },
  { name: "siteUrl", where: "client", description: "이 앱의 오리진 (http://localhost:8920)" },
  {
    name: "baseUrl",
    where: "server",
    description: "네이버 커머스 API 베이스 (https://api.commerce.naver.com/external)",
  },
  { name: "clientId", where: "server", description: "애플리케이션 ID (서버 환경변수)" },
  {
    name: "timestamp",
    where: "server",
    description: "서명에 쓴 timestamp(epoch ms). clientSecretSign 과 같은 값에서 나온다.",
  },
  {
    name: "clientSecretSign",
    where: "server",
    description: "bcrypt(clientId_timestamp, 시크릿) 를 base64 로 인코딩한 서명",
  },
];

export const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** `{{name}}` 을 map 의 값으로 바꾼다. map 에 없는 이름은 그대로 남긴다. */
export function substitute(
  input: string,
  map: Record<string, string | undefined>
): string {
  return input.replace(VARIABLE_PATTERN, (whole, name: string) => {
    const value = map[name];
    return value === undefined ? whole : value;
  });
}

/** 문자열에 남아 있는 `{{변수}}` 이름들 */
export function usedVariables(input: string): string[] {
  return [...input.matchAll(VARIABLE_PATTERN)].map((m) => m[1]);
}

/**
 * KST 오프셋을 붙인 ISO 8601.
 * 네이버 커머스의 주문/문의 조회는 오프셋 없는 시각을 거절하므로 `Z` 대신
 * `+09:00` 형태로 만든다.
 */
export function isoWithOffset(date: Date, offsetMinutes = 9 * 60): string {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${shifted.toISOString().slice(0, -1)}${sign}${hh}:${mm}`;
}

/** 브라우저에서 채울 수 있는 변수들 */
export function clientVars(accessToken: string | null): Record<string, string> {
  const now = new Date();
  return {
    accessToken: accessToken ?? "",
    now: String(now.getTime()),
    today: isoWithOffset(now).slice(0, 10),
    isoNow: isoWithOffset(now),
    isoHourAgo: isoWithOffset(new Date(now.getTime() - 3_600_000)),
    isoDayAgo: isoWithOffset(new Date(now.getTime() - 86_400_000)),
    uuid: globalThis.crypto?.randomUUID?.() ?? `${now.getTime()}`,
    siteUrl:
      typeof window === "undefined" ? "" : window.location.origin,
  };
}
