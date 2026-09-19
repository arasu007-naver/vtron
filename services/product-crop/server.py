#!/usr/bin/env python3
"""HTTP API: product naver_url → cropped image (+ list thumbnail) → Supabase Storage
→ products.image_url / products.thumbnail.

  ./start_chrome_debug.mac.sh          # keep that Chrome open (logged into Naver)
  .venv/bin/uvicorn server:app --host 127.0.0.1 --port 8930

  POST /save-product-image   (image -> Storage, and sale_price from the same page load)
  Authorization: Bearer <API_KEY | Supabase user access token>
  [{"id": "<products.id uuid>", "naverUrl": "https://search.shopping.naver.com/catalog/..."}]
"""

from __future__ import annotations

import logging
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from supabase import acreate_client

from auth import Caller, require_bearer
from browser_session import BLOCK_ERRORS, BrowserSession
from config import Settings, get_settings
from product_store import CLEAR, ProductStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("server")

# Same rule as stmx-web products.naver_url CHECK (https + *.naver.com / naver.me).
NAVER_URL_PATTERN = r"(?i)^https://([a-z0-9-]+\.)*naver\.(com|me)(/|$)"


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        validate_by_name=True,
        validate_by_alias=True,
        serialize_by_alias=True,
    )


class ProductImageRequest(CamelModel):
    id: UUID
    naver_url: str = Field(pattern=NAVER_URL_PATTERN)


class ProductImageResult(CamelModel):
    id: UUID
    naver_url: str
    ok: bool
    image_url: str | None = None
    image_path: str | None = None
    # 200px WebP for product lists (products.thumbnail). None if it couldn't be made —
    # stmx-web then falls back to image_url.
    thumbnail_url: str | None = None
    thumbnail_path: str | None = None
    source_image_url: str | None = None
    # Sale price scraped from the same page load and written to products.sale_price.
    price: int | None = None
    error: str | None = None


class SaveProductImageResponse(CamelModel):
    total: int
    succeeded: int
    failed: int
    results: list[ProductImageResult]


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.store = await ProductStore.create(settings)
    # Separate client for verifying user tokens, so auth calls never touch the
    # service-role client used for Storage / DB writes.
    app.state.auth_client = await acreate_client(
        settings.supabase_url, settings.supabase_service_role_key
    )
    app.state.browser = BrowserSession(settings)
    try:
        await app.state.browser.connect()
    except Exception as exc:  # noqa: BLE001 - reconnect lazily on first request
        log.warning("Chrome not reachable at %s yet: %s", settings.cdp_url, exc)
    try:
        yield
    finally:
        await app.state.browser.close()


app = FastAPI(title="product-crop API", lifespan=lifespan)


async def process_item(
    item: ProductImageRequest,
    browser: BrowserSession,
    store: ProductStore,
    work_dir: Path,
) -> ProductImageResult:
    base = item.model_dump()
    product_id = str(item.id)
    try:
        # Check first so a wrong id doesn't cost a page load or leave an orphan object.
        if not await store.product_exists(product_id):
            return ProductImageResult(**base, ok=False, error="product_not_found")
        captured = await browser.capture(item.naver_url, product_id, work_dir)
        if not captured.ok or not captured.crops:
            # The page may still have given us a price — keep it rather than lose the visit.
            if captured.price is not None:
                await store.update_product(product_id, price=captured.price)
            return ProductImageResult(
                **base,
                ok=False,
                source_image_url=captured.image_url,
                price=captured.price,
                error=captured.error,
            )
        crop = Path(captured.crops[0])
        image = await store.upload_image(crop, f"products/{product_id}")
        # A thumbnail failure must not fail the image. When there is none, clear the
        # column so an older thumbnail never outlives the image it was made from.
        thumb = None
        try:
            thumb = await store.upload_thumbnail(crop, product_id, image.version)
        except Exception:  # noqa: BLE001
            log.exception("thumbnail upload failed: %s", product_id)
        await store.update_product(
            product_id,
            image_url=image.public_url,
            thumbnail=thumb.public_url if thumb else CLEAR,
            price=captured.price,
        )
        return ProductImageResult(
            **base,
            ok=True,
            image_url=image.public_url,
            image_path=image.path,
            thumbnail_url=thumb.public_url if thumb else None,
            thumbnail_path=thumb.path if thumb else None,
            source_image_url=captured.image_url,
            price=captured.price,
        )
    except Exception as exc:  # noqa: BLE001 - one bad item must not fail the batch
        log.exception("save-product-image failed: %s", item.naver_url)
        return ProductImageResult(**base, ok=False, error=f"{type(exc).__name__}: {exc}")


@app.post("/save-product-image", response_model=SaveProductImageResponse)
async def save_product_image(
    items: Annotated[list[ProductImageRequest], Field(min_length=1)],
    settings: Annotated[Settings, Depends(get_settings)],
    caller: Annotated[Caller, Depends(require_bearer)],
) -> SaveProductImageResponse:
    if len(items) > settings.max_items_per_request:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"max {settings.max_items_per_request} items per request",
        )

    browser: BrowserSession = app.state.browser
    store: ProductStore = app.state.store
    try:
        await browser.connect()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"Chrome not reachable at {settings.cdp_url} ({exc}). Run ./start_chrome_debug.mac.sh",
        ) from exc

    results: list[ProductImageResult] = []
    blocked_by: str | None = None
    with tempfile.TemporaryDirectory(prefix="product-crop-") as tmp:
        for item in items:
            if blocked_by:
                results.append(
                    ProductImageResult(
                        **item.model_dump(), ok=False, error=f"skipped_after_{blocked_by}"
                    )
                )
                continue
            result = await process_item(item, browser, store, Path(tmp))
            log.info(
                "[%s] %s %s %s by %s",
                "ok" if result.ok else "FAIL",
                item.id,
                item.naver_url,
                result.error or result.image_url,
                caller,
            )
            results.append(result)
            if settings.stop_on_block and result.error in BLOCK_ERRORS:
                blocked_by = result.error

    succeeded = sum(1 for r in results if r.ok)
    return SaveProductImageResponse(
        total=len(results), succeeded=succeeded, failed=len(results) - succeeded, results=results
    )


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "chromeConnected": app.state.browser.connected}
