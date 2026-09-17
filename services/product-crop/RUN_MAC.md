# Naver product images on Mac (automation blocked)

Playwright's own Chromium is blocked by Naver. Use your real Chrome via CDP.

## 0. Setup (한 번)

이 서비스는 vtron 저장소 안에 있지만 구현은 완전히 별개다 — Python 가상환경과
`.env` 를 이 디렉터리 안에서 따로 둔다(`.venv` 는 커밋하지 않는다).

```bash
cd services/product-crop
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/playwright install chromium
cp .env.example .env   # SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 채우기
```

## 1. Start debug Chrome
```bash
cd services/product-crop
./start_chrome_debug.mac.sh
```
In that Chrome window:
- log into Naver if needed
- open one catalog URL and confirm the product page loads
- leave Chrome open

## 2. Sample (attach to that Chrome)
```bash
.venv/bin/python capture_and_crop.py naver_urls_sample.txt -o ./naver_sample \
  --cdp http://127.0.0.1:9222 --concurrency 1 --wait-ms 1500
```

## 3. Full list
```bash
.venv/bin/python capture_and_crop.py naver_urls.txt -o ./naver_out \
  --cdp http://127.0.0.1:9222 --concurrency 1 --wait-ms 1500
```

The script prefers downloading the page's main/og:image URL into `crops/`.
If that fails, it falls back to screenshot + crop.

If you still see `access_restricted_418`, stop for a while — do not keep retrying.

## 4. HTTP API (`save-product-image`)

stmx-web `products` 행의 `naver_url` 을 열어 이미지를 crop → Supabase Storage
(`product-images/products/<id>.jpg`) 업로드 → 그 행의 `image_url` 을 public URL 로 갱신.
vtron `/products-2-link` 페이지의 **등록** 버튼이 이 API 를 부른다.

1. stmx-web Supabase SQL editor 에서 `supabase/schema.sql` 실행 (버킷 생성).
2. `.env`: `SUPABASE_URL` = stmx-web 프로젝트 URL, `SUPABASE_SERVICE_ROLE_KEY` = 그 프로젝트의 secret 키.
3. debug Chrome(1단계)을 띄운 뒤:
```bash
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8930
```

```bash
curl -X POST http://127.0.0.1:8930/save-product-image \
  -H "Authorization: Bearer $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '[{"id": "<products.id uuid>", "naverUrl": "https://search.shopping.naver.com/catalog/43050313618"}]'
```

Response (HTTP 200; 항목별 `ok` 확인):
```json
{
  "total": 1, "succeeded": 1, "failed": 0,
  "results": [{
    "id": "<uuid>",
    "naverUrl": "https://search.shopping.naver.com/catalog/43050313618",
    "ok": true,
    "imageUrl": "https://<ref>.supabase.co/storage/v1/object/public/product-images/products/<uuid>.jpg?v=1757770000",
    "imagePath": "products/<uuid>.jpg",
    "sourceImageUrl": "https://shopping-phinf.pstatic.net/...",
    "error": null
  }]
}
```

- `naverUrl` 은 stmx-web 의 CHECK 와 같은 규칙(https + `*.naver.com` / `naver.me`)만 받는다(422).
- 없는 id 는 `error: "product_not_found"` — 페이지를 열지 않는다.
- 다시 등록하면 같은 object 를 덮어쓰고 `?v=` 만 바뀐다(캐시된 옛 이미지 방지).
- 페이지는 한 번에 하나씩 연다(공유 Chrome, 네이버 차단). 요청 1회 최대 `MAX_ITEMS_PER_REQUEST` 건.
- `login_page` / `access_restricted_418` 이면 남은 항목은 `skipped_after_<reason>` (`STOP_ON_BLOCK=false` 로 끔).
- 인증: `Authorization: Bearer <token>` 필수. token 은 `.env` 의 `API_KEY`(curl · 스크립트) 또는
  같은 Supabase 프로젝트의 로그인 사용자 access token(vtron 이 넘긴다). 없거나 틀리면 `401`.
- `503`: Chrome 연결 불가.
- Docs: http://127.0.0.1:8930/docs
