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

/**
 * 게시물 상세(COM-002) 액션 줄 버튼을 누른 횟수 — stmx-web `12_post_action_clicks.sql` 의
 * post_visit_stats. 좋아요 · 관심을 눌렀다 풀어도 두 번으로 센다.
 */
export interface LooxVisitStats {
  likeClicks: number;
  commentClicks: number;
  shareClicks: number;
  bookmarkClicks: number;
  /** 네 버튼 클릭의 합 — 방문자수. */
  visitCount: number;
  lastClickedAt: string | null;
}

export interface LooxPost {
  id: string;
  styleNote: string | null;
  location: string | null;
  styleCode: string | null;
  publishedAt: string | null;
  images: LooxImage[];
  products: LooxProduct[];
  /** 읽지 못했으면 null(secret 키 없음 · 12 단계 전 DB). [[fetchVisitStats]] 로 채운다. */
  visits: LooxVisitStats | null;
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

type StmxClient = ReturnType<typeof connect>;

/** 공개(발행 · 전체 공개) 게시물 쿼리의 시작. */
const publicPosts = (
  client: StmxClient,
  columns: string,
  options?: { count?: "exact"; head?: boolean }
) =>
  client
    .from("posts")
    .select(columns, options)
    .eq("status", "published")
    .eq("visibility", "public");

/**
 * 공개 게시물을 최근 발행 순으로 `limit` 건. `postId` 를 주면 그 한 건만.
 * 이미지 · 착장 상품은 position 순.
 */
export async function fetchLoox(
  creds: StmxWebCredentials,
  { limit = 1, postId }: { limit?: number; postId?: string } = {}
): Promise<LooxPost[]> {
  const client = connect(creds);

  let query = publicPosts(client, POST_SELECT);
  if (postId) query = query.eq("id", postId);

  const { data, error } = await query
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(`stmx-web 게시물 조회 실패: ${error.message}`);
  return ((data ?? []) as unknown as PostRow[]).map((row) => toPost(client, row));
}

/** 행 → LooxPost. 방문자수는 비워 두고 [[fetchVisitStats]] 로 채운다. */
function toPost(client: StmxClient, row: PostRow): LooxPost {
  // stmx-web 의 resolveLooxImageUrl 과 같은 규칙 — 이미 절대 URL 이면 그대로 쓴다.
  const toUrl = (path: string) =>
    /^https?:\/\//.test(path)
      ? path
      : client.storage.from("loox").getPublicUrl(path).data.publicUrl;

  return {
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
    visits: null,
  };
}

/** 목록 정렬 — recent: 최근 발행 순 · visits: 최근 7일 방문자수(액션 버튼 클릭) 큰 순. */
export type LooxSort = "recent" | "visits";

export interface LooxPageResult {
  posts: LooxPost[];
  /** 공개 게시물 전체 수. */
  total: number;
}

/** PostgREST 가 한 번에 돌려주는 최대 행 수(기본 max-rows). 넘으면 range 로 나눠 읽는다. */
const READ_BATCH = 1000;
/** PostgREST — offset 이 전체 수를 넘었다(Requested range not satisfiable). */
const RANGE_NOT_SATISFIABLE = "PGRST103";
/** PostgREST — 테이블이 없다(stmx-web 에 12_post_action_clicks.sql 을 아직 안 돌렸다). */
const TABLE_NOT_FOUND = "PGRST205";
/** 주간 클릭 로그를 이만큼까지만 읽어 센다. 넘으면 DB 쪽 집계(RPC)로 옮길 때다. */
const MAX_WEEKLY_CLICKS = 200_000;

/**
 * 공개 게시물 한 페이지(page 는 1부터), 최근 발행 순.
 * 같은 시각이면 id 순으로 고정해 페이지를 넘길 때 겹치거나 빠지지 않게 한다.
 */
export async function fetchLooxPage(
  creds: StmxWebCredentials,
  { page, pageSize }: { page: number; pageSize: number }
): Promise<LooxPageResult> {
  const client = connect(creds);
  const from = (page - 1) * pageSize;

  const { data, error, count } = await publicPosts(client, POST_SELECT, { count: "exact" })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, from + pageSize - 1);

  if (error?.code === RANGE_NOT_SATISFIABLE) {
    // 마지막 페이지 너머 — 빈 페이지와 실제 전체 수를 돌려 화면이 페이지 수를 바로잡게 한다.
    const head = await publicPosts(client, "id", { count: "exact", head: true });
    return { posts: [], total: head.count ?? 0 };
  }
  if (error) throw new Error(`stmx-web 게시물 조회 실패: ${error.message}`);

  return {
    posts: ((data ?? []) as unknown as PostRow[]).map((row) => toPost(client, row)),
    total: count ?? 0,
  };
}

/**
 * `since` 이후 게시물별 액션 버튼 클릭 수 — 12_post_action_clicks.sql 의 클릭 로그를 센다.
 * 누적 집계(post_visit_stats)에는 시각이 없어 '일주일간' 을 알 수 없다. secret 키로만 읽힌다.
 * 한 번도 눌리지 않은 게시물은 맵에 없다(= 0).
 */
export async function fetchWeeklyVisitCounts(
  creds: StmxWebCredentials,
  since: Date
): Promise<Map<string, number>> {
  const client = connect(creds);
  const counts = new Map<string, number>();

  for (let from = 0; ; from += READ_BATCH) {
    if (from >= MAX_WEEKLY_CLICKS) {
      throw new Error(
        `최근 클릭 로그가 ${MAX_WEEKLY_CLICKS.toLocaleString("ko-KR")}건을 넘습니다 — stmx-web 에 기간 집계 RPC 를 두고 그것을 읽어야 합니다.`
      );
    }
    const { data, error } = await client
      .from("post_action_clicks")
      .select("post_id")
      .gte("created_at", since.toISOString())
      .order("id", { ascending: true })
      .range(from, from + READ_BATCH - 1);

    if (error?.code === TABLE_NOT_FOUND) {
      throw new Error(
        "stmx-web DB 에 클릭 로그(post_action_clicks)가 없습니다. stmx-web 의 sqls/phase2/12_post_action_clicks.sql 을 먼저 실행하세요."
      );
    }
    if (error) throw new Error(`stmx-web 클릭 로그 조회 실패: ${error.message}`);

    const rows = (data ?? []) as { post_id: string }[];
    for (const row of rows) counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
    if (rows.length < READ_BATCH) return counts;
  }
}

/**
 * 공개 게시물 한 페이지, 최근 7일 방문자수 큰 순. 같으면 최근 발행 순, 그다음 id 순.
 *
 * 클릭은 로그에서 세고(`admin` — secret 키) 게시물은 공개 읽기(`creds`)로 id · 발행일만 훑어
 * 정렬한 뒤, 그 페이지의 게시물만 이미지 · 착장 상품까지 읽는다.
 * `weeklyVisits` 는 이 페이지 게시물의 기간 내 클릭 수.
 */
export async function fetchLooxPageByWeeklyVisits(
  creds: StmxWebCredentials,
  admin: StmxWebCredentials,
  { page, pageSize, since }: { page: number; pageSize: number; since: Date }
): Promise<LooxPageResult & { weeklyVisits: Record<string, number> }> {
  const weekly = await fetchWeeklyVisitCounts(admin, since);
  const client = connect(creds);

  const all: { id: string; published_at: string | null }[] = [];
  for (let from = 0; ; from += READ_BATCH) {
    const { data, error } = await publicPosts(client, "id, published_at")
      .order("id", { ascending: true })
      .range(from, from + READ_BATCH - 1);
    if (error?.code === RANGE_NOT_SATISFIABLE) break;
    if (error) throw new Error(`stmx-web 게시물 조회 실패: ${error.message}`);
    const rows = (data ?? []) as unknown as { id: string; published_at: string | null }[];
    all.push(...rows);
    if (rows.length < READ_BATCH) break;
  }

  const publishedAt = (value: string | null) => (value ? Date.parse(value) : 0);
  all.sort(
    (a, b) =>
      (weekly.get(b.id) ?? 0) - (weekly.get(a.id) ?? 0) ||
      publishedAt(b.published_at) - publishedAt(a.published_at) ||
      a.id.localeCompare(b.id)
  );

  const from = (page - 1) * pageSize;
  const ids = all.slice(from, from + pageSize).map((post) => post.id);

  let posts: LooxPost[] = [];
  if (ids.length > 0) {
    const { data, error } = await publicPosts(client, POST_SELECT).in("id", ids);
    if (error) throw new Error(`stmx-web 게시물 조회 실패: ${error.message}`);
    const byId = new Map(
      ((data ?? []) as unknown as PostRow[]).map((row) => [row.id, toPost(client, row)])
    );
    // 정렬한 순서대로. 그 사이 비공개로 바뀐 게시물은 빠진다.
    posts = ids.flatMap((id) => byId.get(id) ?? []);
  }

  return {
    posts,
    total: all.length,
    weeklyVisits: Object.fromEntries(ids.map((id) => [id, weekly.get(id) ?? 0])),
  };
}

interface VisitStatsRow {
  post_id: string;
  like_clicks: number;
  comment_clicks: number;
  share_clicks: number;
  bookmark_clicks: number;
  visit_count: number | string;
  last_clicked_at: string | null;
}

/**
 * 게시물별 방문자수(액션 버튼 클릭 합계). `postIds` 전부를 키로 돌려준다.
 *
 * secret 키로만 읽힌다 — `12_post_action_clicks.sql` 이 post_visit_stats 에 사용자 읽기
 * 정책을 주지 않았다(관리자 · 서비스 롤만). 한 번도 눌리지 않은 게시물은 행이 없어 0 이다.
 */
export async function fetchVisitStats(
  creds: StmxWebCredentials,
  postIds: string[]
): Promise<Map<string, LooxVisitStats>> {
  const stats = new Map<string, LooxVisitStats>(
    postIds.map((id) => [
      id,
      { likeClicks: 0, commentClicks: 0, shareClicks: 0, bookmarkClicks: 0, visitCount: 0, lastClickedAt: null },
    ])
  );
  if (postIds.length === 0) return stats;

  const { data, error } = await connect(creds)
    .from("post_visit_stats")
    .select("post_id, like_clicks, comment_clicks, share_clicks, bookmark_clicks, visit_count, last_clicked_at")
    .in("post_id", postIds);
  if (error) throw new Error(`stmx-web 방문자수 조회 실패: ${error.message}`);

  for (const row of (data ?? []) as VisitStatsRow[]) {
    stats.set(row.post_id, {
      likeClicks: row.like_clicks,
      commentClicks: row.comment_clicks,
      shareClicks: row.share_clicks,
      bookmarkClicks: row.bookmark_clicks,
      // bigint 열이다. PostgREST 가 숫자로 주지만 문자열로 와도 받는다.
      visitCount: Number(row.visit_count),
      lastClickedAt: row.last_clicked_at,
    });
  }
  return stats;
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
