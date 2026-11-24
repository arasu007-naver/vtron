import "server-only";
import { bearerMatches } from "./core";

/** Authorization: Bearer $CREATOR_TAG_INTERNAL_SECRET. 환경변수가 없으면 늘 false. */
export function creatorTagAuthorized(req: Request): boolean {
  return bearerMatches(req.headers.get("authorization"), process.env.CREATOR_TAG_INTERNAL_SECRET);
}
