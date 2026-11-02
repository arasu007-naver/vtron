import "server-only";
import { MAX_IMAGE_BYTES, sniffImage } from "./extract";

/**
 * POST /api/v1/style-id/jobs 의 입력 → 상품 목록. 상품 하나 = { product, image(바이트) | image_url }.
 *
 *   application/json        { "items": [ … ] } 또는 [ … ]
 *                           item = { "product": {…} 또는 그 JSON 문자열, "image_url": "https://…" }
 *                                  또는 { "product": …, "image": "data:image/jpeg;base64,…" | base64 }
 *                           product 키가 없으면 item 자체를 상품 정보로 본다 (image_url 은 그 안에서 찾는다)
 *   text/csv                머리 줄 + 한 줄에 상품 하나 (아래 CSV 열)
 *   multipart/form-data     csv   = CSV 파일
 *                           items = 위 JSON 과 같은 글
 *                           product · image 를 같은 수만큼 반복 — n 번째 product(JSON 문자열)와 n 번째 image(파일 또는 URL)가 한 쌍
 *
 *   상품 정보(product) — 내부 상품 정보(brand_catalog_models)와 같은 이름을 쓴다
 *     id                        업체 쪽 상품 id (선택 — 결과에 ref 로 돌려준다)
 *     name                      상품명 (선택이지만 권장 — 사진에 옷이 여럿일 때 대표 의복을 고른다)
 *     whole_category_name       분류 (예: 패션의류>여성의류>아우터>재킷). category 도 받는다
 *     image_url · original_image_url   상품 사진 주소 (item.image_url 이 없을 때)
 *     그 밖의 키는 그대로 보관한다 (8KB 까지)
 *
 *   CSV 열 — product(상품 정보 JSON 문자열) 또는 id · name · whole_category_name(category) 열, 그리고 image_url 열
 */

export const MAX_ITEMS = Math.max(1, Number(process.env.STYLE_ID_JOB_MAX_ITEMS) || 1000);
const MAX_PRODUCT_JSON = 8 * 1024;
const MAX_TEXT = 200;

type Obj = Record<string, unknown>;

export interface JobItemInput {
  ref: string | null;
  product: Obj;
  /** 관찰에 넘길 상품 정보 — 상품명이 없으면 null(이미지만으로 대표 의복을 고른다) */
  name: string | null;
  category: string | null;
  image: { bytes: Buffer; mime: string } | null;
  image_url: string | null;
}

export class JobInputError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).replace(/\s+/g, " ").trim() : "");

/** 업체가 준 사진 주소 — https(또는 http)만, 사내망 · localhost 는 받지 않는다 */
export function checkImageUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".internal") ||
    h.endsWith(".local") ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) ||
    h === "::1" ||
    /^f[cd]|^fe80:/.test(h)
  ) {
    return null;
  }
  return u.toString();
}

/** base64 · data URI 사진 */
function decodeImage(raw: string, where: string) {
  const m = /^data:([\w/+.-]+);base64,([\s\S]*)$/.exec(raw.trim());
  const bytes = Buffer.from(m ? m[2] : raw.trim(), "base64");
  if (!bytes.length) throw new JobInputError(`${where}: image 가 비어 있습니다.`);
  return checkBytes(bytes, where);
}

function checkBytes(bytes: Buffer, where: string) {
  if (bytes.length > MAX_IMAGE_BYTES) throw new JobInputError(`${where}: 이미지는 5MB 이하만 지원합니다.`, 413);
  const mime = sniffImage(bytes);
  if (!mime) throw new JobInputError(`${where}: JPG · PNG · WEBP · GIF 이미지만 지원합니다.`, 415);
  return { bytes, mime };
}

function parseProduct(raw: unknown, where: string): Obj {
  if (raw == null || raw === "") return {};
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new JobInputError(`${where}: product 가 JSON 이 아닙니다.`);
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) throw new JobInputError(`${where}: product 는 JSON 객체여야 합니다.`);
  if (JSON.stringify(raw).length > MAX_PRODUCT_JSON) throw new JobInputError(`${where}: product 는 8KB 이하만 받습니다.`);
  return raw as Obj;
}

/** item 하나 → 상품. image 는 이미 디코드한 바이트(multipart 파일)를 받을 수도 있다 */
function toItem(
  product: Obj,
  where: string,
  image: { bytes: Buffer; mime: string } | null,
  imageUrlRaw: unknown
): JobItemInput {
  const urlText = text(imageUrlRaw) || text(product.image_url) || text(product.original_image_url) || text(product.originalImageUrl) || text(product.imageUrl);
  let image_url: string | null = null;
  if (!image) {
    if (!urlText) throw new JobInputError(`${where}: image 또는 image_url 이 필요합니다.`);
    image_url = checkImageUrl(urlText);
    if (!image_url) throw new JobInputError(`${where}: image_url 은 외부 http(s) 주소여야 합니다.`);
  }
  const name = text(product.name).slice(0, MAX_TEXT) || null;
  const category = (text(product.whole_category_name) || text(product.category)).slice(0, MAX_TEXT) || null;
  return { ref: text(product.id).slice(0, MAX_TEXT) || null, product, name, category, image, image_url };
}

function fromJsonItems(list: unknown): JobItemInput[] {
  const arr = Array.isArray(list) ? list : (list as Obj | null)?.items;
  if (!Array.isArray(arr)) throw new JobInputError('JSON 은 상품 배열이거나 { "items": [ … ] } 여야 합니다.');
  checkCount(arr.length);
  return arr.map((raw, i) => {
    const where = `items[${i}]`;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new JobInputError(`${where}: 객체여야 합니다.`);
    const it = raw as Obj;
    const product = "product" in it ? parseProduct(it.product, where) : parseProduct({ ...it, image: undefined }, where);
    const image = typeof it.image === "string" && it.image ? decodeImage(it.image, where) : null;
    return toItem(product, where, image, it.image_url);
  });
}

function checkCount(n: number) {
  if (n === 0) throw new JobInputError("상품이 없습니다.");
  if (n > MAX_ITEMS) throw new JobInputError(`한 번에 ${MAX_ITEMS}개까지 받습니다 (${n}개).`, 413);
}

/** RFC 4180 CSV — 따옴표 · 따옴표 안 줄바꿈 · "" 를 받는다 */
export function parseCsv(src: string): string[][] {
  const s = src.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new JobInputError("CSV 의 따옴표가 닫히지 않았습니다.");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function fromCsv(src: string): JobItemInput[] {
  const [header, ...rows] = parseCsv(src);
  if (!header) throw new JobInputError("CSV 가 비어 있습니다.");
  const cols = header.map((h) => h.trim().toLowerCase());
  if (!cols.includes("image_url") && !cols.includes("product")) {
    throw new JobInputError("CSV 머리 줄에 image_url 열(또는 image_url 이 든 product 열)이 필요합니다.");
  }
  checkCount(rows.length);
  return rows.map((r, i) => {
    const where = `CSV ${i + 2}행`;
    const cell = Object.fromEntries(cols.map((c, j) => [c, r[j]?.trim() ?? ""]));
    const product: Obj = cell.product ? parseProduct(cell.product, where) : {};
    for (const k of ["id", "name", "whole_category_name", "category"]) {
      if (cell[k] && product[k] == null) product[k] = cell[k];
    }
    return toItem(product, where, null, cell.image_url);
  });
}

async function fromMultipart(form: FormData): Promise<JobItemInput[]> {
  const csv = form.get("csv") ?? form.get("file");
  if (csv instanceof File) return fromCsv(await csv.text());
  const items = form.get("items");
  if (typeof items === "string" && items.trim()) return fromJsonItems(parseJson(items));

  const products = form.getAll("product");
  const images = form.getAll("image");
  if (!images.length) throw new JobInputError("csv · items · 또는 product + image 쌍이 필요합니다.");
  if (products.length && products.length !== images.length) {
    throw new JobInputError(`product(${products.length}개)와 image(${images.length}개)의 수가 같아야 합니다.`);
  }
  checkCount(images.length);
  return Promise.all(
    images.map(async (img, i) => {
      const where = `${i + 1}번째 상품`;
      const product = parseProduct(typeof products[i] === "string" ? products[i] : null, where);
      if (img instanceof File) {
        if (img.size === 0) throw new JobInputError(`${where}: image 파일이 비어 있습니다.`);
        if (img.size > MAX_IMAGE_BYTES) throw new JobInputError(`${where}: 이미지는 5MB 이하만 지원합니다.`, 413);
        return toItem(product, where, checkBytes(Buffer.from(await img.arrayBuffer()), where), null);
      }
      return toItem(product, where, null, img);
    })
  );
}

function parseJson(src: string) {
  try {
    return JSON.parse(src);
  } catch {
    throw new JobInputError("JSON 을 읽지 못했습니다.");
  }
}

/** 요청 → 상품 목록. 하나라도 틀리면 전체를 받지 않는다(JobInputError) */
export async function readJobInput(req: Request): Promise<{ items: JobItemInput[]; format: "json" | "csv" | "multipart" }> {
  const type = (req.headers.get("content-type") ?? "").toLowerCase();
  if (type.startsWith("application/json")) return { items: fromJsonItems(parseJson(await req.text())), format: "json" };
  if (type.startsWith("text/csv")) return { items: fromCsv(await req.text()), format: "csv" };
  if (type.startsWith("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) throw new JobInputError("multipart 본문을 읽지 못했습니다.");
    const csv = form.get("csv") ?? form.get("file");
    return { items: await fromMultipart(form), format: csv instanceof File ? "csv" : "multipart" };
  }
  throw new JobInputError("application/json · text/csv · multipart/form-data 로 보내 주세요.", 415);
}
