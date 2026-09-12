import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * stmx-web 의 LOOX 게시물 — 착장 상품 목록(COM-002-B01)을 붙일 대상.
 *
 * stmx-web 은 vtron 과 **다른 Supabase 프로젝트**다. 그래서 vtron 의 세션/키로는 읽을
 * 수 없고, stmx-web 의 URL · 키를 따로 받는다(`STMX_WEB_SUPABASE_*`).
 *
 * 읽기는 로그인 없이 publishable 키로 한다. stmx-web 의 RLS(`sqls/phase2/02_posts.sql`
 * "posts read")가 `status='published' and visibility='public'` 인 게시물과 그 이미지는
 * 누구에게나 열어 두고, `loox` 버킷은 public 이라 이미지도 공개 URL 로 바로 뜬다.
 *
 * 쓰기(상품 붙이기 · 떼기)는 secret 키(`sb_secret_…`)로만 한다. `11_products.sql` 이
 * products · post_products 에 쓰기 정책을 주지 않았다 — "쓰기는 운영(서비스 롤)만 한다".
 * secret 키는 예전 service_role 키를 대신하는 새 형식이고, 똑같이 RLS 를 건너뛴다.
 * stmx-web 은 post_products 에 행이 생기면 게시물 상세에 '착장 확인하기' 단추를 띄운다.
 */

export interface StmxWebCredentials {
  url: string;
  key: string;
}

export function getStmxWebCredentials(): StmxWebCredentials | null {
  const url = process.env.STMX_WEB_SUPABASE_URL?.trim();
  const key = process.env.STMX_WEB_SUPABASE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

/**
 * 쓰기 전용. 서버 밖으로 나가면 안 된다.
 *
 * `STMX_WEB_SUPABASE_SECRET_KEY`(sb_secret_…)를 쓴다. 예전 service_role JWT 를 넣어 둔
 * 환경을 위해 `STMX_WEB_SUPABASE_SERVICE_ROLE_KEY` 도 받는다. publishable 키를 잘못
 * 넣으면 RLS 에 막혀 알기 어려운 오류가 나므로 여기서 없는 것으로 본다.
 */
export function getStmxWebAdminCredentials(): StmxWebCredentials | null {
  const url = process.env.STMX_WEB_SUPABASE_URL?.trim();
  const key =
    process.env.STMX_WEB_SUPABASE_SECRET_KEY?.trim() ||
    process.env.STMX_WEB_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || key.startsWith("sb_publishable_")) return null;
  return { url, key };
}

const connect = ({ url, key }: StmxWebCredentials) =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export interface LooxImage {
  url: string;
  position: number;
  width: number | null;
  height: number | null;
}

/** 게시물에 걸린 착장 상품 — stmx-web 의 OutfitProduct 에서 모달이 쓰는 만큼. */
export interface LooxProduct {
  id: string;
  position: number;
  brandName: string;
  name: string;
  imageUrl: string | null;
  salePrice: number;
  naverUrl: string;
  naverProductId: string | null;
}

export interface LooxPost {
  id: string;
  styleNote: string | null;
  location: string | null;
  styleCode: string | null;
  publishedAt: string | null;
  images: LooxImage[];
  products: LooxProduct[];
}

interface ProductRow {
  id: string;
  brand_name: string;
  name: string;
  image_url: string | null;
  sale_price: number;
  naver_url: string;
  naver_product_id: string | null;
}

interface PostRow {
  id: string;
  style_note: string | null;
  location: string | null;
  style_code: string | null;
  published_at: string | null;
  post_images: {
    storage_path: string;
    position: number;
    width: number | null;
    height: number | null;
  }[];
  post_products: { position: number; product: ProductRow | null }[] | null;
}

const POST_SELECT = `
  id, style_note, location, style_code, published_at,
  post_images(storage_path, position, width, height),
  post_products(position, product:products(id, brand_name, name, image_url, sale_price, naver_url, naver_product_id))
`;

/**
 * 공개 게시물을 최근 발행 순으로 `limit` 건. `postId` 를 주면 그 한 건만.
 * 이미지 · 착장 상품은 position 순.
 */
export async function fetchLoox(
  creds: StmxWebCredentials,
  { limit = 1, postId }: { limit?: number; postId?: string } = {}
): Promise<LooxPost[]> {
  const client = connect(creds);

  let query = client
    .from("posts")
    .select(POST_SELECT)
    .eq("status", "published")
    .eq("visibility", "public");
  if (postId) query = query.eq("id", postId);

  const { data, error } = await query
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(`stmx-web 게시물 조회 실패: ${error.message}`);

  // stmx-web 의 resolveLooxImageUrl 과 같은 규칙 — 이미 절대 URL 이면 그대로 쓴다.
  const toUrl = (path: string) =>
    /^https?:\/\//.test(path)
      ? path
      : client.storage.from("loox").getPublicUrl(path).data.publicUrl;

  return ((data ?? []) as unknown as PostRow[]).map((row) => ({
    id: row.id,
    styleNote: row.style_note,
    location: row.location,
    styleCode: row.style_code,
    publishedAt: row.published_at,
    images: [...(row.post_images ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((image) => ({
        url: toUrl(image.storage_path),
        position: image.position,
        width: image.width,
        height: image.height,
      })),
    // 비활성 상품은 RLS 가 가려 product 가 null 로 온다 — stmx-web 화면처럼 뺀다.
    products: [...(row.post_products ?? [])]
      .sort((a, b) => a.position - b.position)
      .flatMap(({ position, product }) =>
        product
          ? [
              {
                id: product.id,
                position,
                brandName: product.brand_name,
                name: product.name,
                imageUrl: product.image_url,
                salePrice: product.sale_price,
                naverUrl: product.naver_url,
                naverProductId: product.naver_product_id,
              },
            ]
          : []
      ),
  }));
}

export class StmxWebWriteError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "StmxWebWriteError";
  }
}

const failed = (step: string, error: { message: string }) =>
  new StmxWebWriteError(502, `${step}: ${error.message}`);

export interface AttachProductInput {
  postId: string;
  /** 카탈로그 모델 id. products.naver_product_id(UNIQUE) 로 들어간다. */
  naverProductId: string;
  naverUrl: string;
  brandName: string;
  name: string;
  imageUrl: string | null;
  salePrice: number;
}

export interface AttachProductResult {
  productId: string;
  /** 이미 이 게시물에 걸려 있었다 — 아무것도 쓰지 않았다. */
  alreadyAttached: boolean;
  /** 상품 마스터에 같은 카탈로그가 있어 그 행을 썼다. */
  reusedProduct: boolean;
}

/**
 * 게시물에 상품을 건다. 상품 마스터(products) → 연결(post_products) 순.
 *
 * 같은 카탈로그는 상품 마스터 한 행을 여러 룩이 같이 쓴다(11_products.sql 설계 (1)).
 * 이미 있으면 덮어쓰지 않는다 — 운영이 손본 정가 · 품절 값을 지우지 않게.
 * 새 카드는 목록 맨 아래(position 최댓값 + 1)에 붙는다.
 */
export async function attachProduct(
  creds: StmxWebCredentials,
  input: AttachProductInput
): Promise<AttachProductResult> {
  const client = connect(creds);

  const post = await client.from("posts").select("id").eq("id", input.postId).maybeSingle();
  if (post.error) throw failed("게시물 확인 실패", post.error);
  if (!post.data) throw new StmxWebWriteError(404, "stmx-web 에 그 게시물이 없습니다.");

  const findProduct = () =>
    client
      .from("products")
      .select("id")
      .eq("naver_product_id", input.naverProductId)
      .maybeSingle();

  const found = await findProduct();
  if (found.error) throw failed("상품 확인 실패", found.error);
  let productId = (found.data?.id as string | undefined) ?? null;
  const reusedProduct = productId !== null;

  if (!productId) {
    const created = await client
      .from("products")
      .insert({
        brand_name: input.brandName,
        name: input.name,
        image_url: input.imageUrl,
        sale_price: input.salePrice,
        naver_url: input.naverUrl,
        naver_product_id: input.naverProductId,
      })
      .select("id")
      .single();

    if (created.error?.code === "23505") {
      // 동시에 누가 같은 카탈로그를 먼저 넣었다 — 그 행을 쓴다.
      const again = await findProduct();
      if (again.error || !again.data) throw failed("상품 등록 실패", created.error);
      productId = again.data.id as string;
    } else if (created.error) {
      throw failed("상품 등록 실패", created.error);
    } else {
      productId = created.data.id as string;
    }
  }

  const linked = await client
    .from("post_products")
    .select("product_id, position")
    .eq("post_id", input.postId);
  if (linked.error) throw failed("연결 확인 실패", linked.error);

  const rows = (linked.data ?? []) as { product_id: string; position: number }[];
  if (rows.some((row) => row.product_id === productId)) {
    return { productId, alreadyAttached: true, reusedProduct };
  }

  const position = rows.length ? Math.max(...rows.map((row) => row.position)) + 1 : 0;
  const inserted = await client
    .from("post_products")
    .insert({ post_id: input.postId, product_id: productId, position });
  if (inserted.error) throw failed("게시물 연결 실패", inserted.error);

  return { productId, alreadyAttached: false, reusedProduct };
}

/** 게시물에서 상품을 뗀다. 상품 마스터는 남긴다 — 다른 룩이 쓰고 있을 수 있다. */
export async function detachProduct(
  creds: StmxWebCredentials,
  postId: string,
  productId: string
): Promise<void> {
  const { error } = await connect(creds)
    .from("post_products")
    .delete()
    .eq("post_id", postId)
    .eq("product_id", productId);
  if (error) throw failed("연결 해제 실패", error);
}
