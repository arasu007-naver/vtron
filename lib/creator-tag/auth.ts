import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Authorization: Bearer $CREATOR_TAG_INTERNAL_SECRET. 환경변수가 없으면 늘 false. */
export function creatorTagAuthorized(req: Request): boolean {
  const want = process.env.CREATOR_TAG_INTERNAL_SECRET?.trim();
  const got = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1]?.trim();
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
