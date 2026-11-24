import "server-only";
import { getNaverSearchCredentials, searchShopping } from "@/lib/playground/naver-search";
import { collectCandidates, type TagCandidate } from "./rank";

export class NaverNotConfiguredError extends Error {}

export interface FindCandidatesInput {
  brandName: string;
  productName: string | null;
  styleCode: string | null;
  barcode: string | null;
  /** 등록 브랜드의 이름들. 비면 입력 브랜드명을 쓴다. */
  brandNames?: string[];
}

export async function findCandidates(input: FindCandidatesInput): Promise<TagCandidate[]> {
  const creds = getNaverSearchCredentials();
  if (!creds) throw new NaverNotConfiguredError("네이버 검색 API 설정이 없습니다.");
  const brandTerms = input.brandNames?.length ? input.brandNames : [input.brandName];
  return collectCandidates({ ...input, brandTerms }, (q) => searchShopping(creds, q));
}
