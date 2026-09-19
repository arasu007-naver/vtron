"""Supabase Storage upload + products.image_url / thumbnail / sale_price update (stmx-web project)."""

from __future__ import annotations

import io
import logging
import time
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps
from supabase import AsyncClient, acreate_client

from config import Settings

CONTENT_TYPES = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
    "GIF": ("image/gif", "gif"),
    "AVIF": ("image/avif", "avif"),
}

log = logging.getLogger("product_store")

# List thumbnail — same format as vtron scripts/backfill-product-thumbnails.mjs, so rows
# written here and rows backfilled there look identical to stmx-web
# (supabase/migrations/12_product_thumbnails.sql).
# The largest product photo slot in the app is 58dp (174px @3x); 200px is sharp enough.
THUMB_MAX_EDGE = 200
THUMB_WEBP_QUALITY = 72
THUMB_CONTENT_TYPE = "image/webp"
# The thumbnail URL carries `?v=`, so a new image means a new URL — safe to cache for a year.
THUMB_CACHE_CONTROL = "31536000"

# Sentinel for update_product: "set this column to NULL" (None means "leave it alone").
CLEAR = object()


def make_thumbnail(file: Path) -> bytes | None:
    """Shrink to THUMB_MAX_EDGE on the long side as WebP. None if the image can't be read."""
    try:
        with Image.open(file) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA" if "transparency" in img.info or "A" in img.mode else "RGB")
            # thumbnail() never enlarges, like sharp's withoutEnlargement.
            img.thumbnail((THUMB_MAX_EDGE, THUMB_MAX_EDGE), Image.Resampling.LANCZOS)
            out = io.BytesIO()
            img.save(out, format="WEBP", quality=THUMB_WEBP_QUALITY, method=6)
            return out.getvalue()
    except Exception as exc:  # noqa: BLE001 - the list falls back to image_url
        log.warning("thumbnail failed for %s: %s", file, exc)
        return None


def sniff_image(path: Path) -> tuple[str, str]:
    """Return (content_type, extension) from the file bytes, not its name.

    Downloaded og:image files are saved as .jpg but may actually be webp/png.
    """
    try:
        with Image.open(path) as img:
            fmt = img.format or ""
    except Exception:  # noqa: BLE001
        fmt = ""
    return CONTENT_TYPES.get(fmt, ("application/octet-stream", path.suffix.lstrip(".") or "bin"))


@dataclass
class UploadedImage:
    path: str
    public_url: str
    version: str


class ProductStore:
    def __init__(self, client: AsyncClient, settings: Settings) -> None:
        self._client = client
        self._bucket = settings.supabase_bucket
        self._table = settings.supabase_table

    @classmethod
    async def create(cls, settings: Settings) -> "ProductStore":
        client = await acreate_client(settings.supabase_url, settings.supabase_service_role_key)
        return cls(client, settings)

    async def product_exists(self, product_id: str) -> bool:
        resp = await (
            self._client.table(self._table).select("id").eq("id", product_id).limit(1).execute()
        )
        return bool(resp.data)

    async def upload_image(self, file: Path, object_key: str) -> UploadedImage:
        content_type, ext = sniff_image(file)
        path = f"{object_key}.{ext}"
        bucket = self._client.storage.from_(self._bucket)
        await bucket.upload(
            path,
            file.read_bytes(),
            {"content-type": content_type, "upsert": "true"},
        )
        public_url = await bucket.get_public_url(path)
        # Re-registering overwrites the same object; a version query keeps CDN/browser
        # caches from serving the old image.
        version = str(int(time.time()))
        return UploadedImage(path=path, public_url=f"{public_url}?v={version}", version=version)

    async def upload_thumbnail(
        self, file: Path, product_id: str, version: str
    ) -> UploadedImage | None:
        """Upload `products/thumb/<id>.webp`. None if the image couldn't be shrunk.

        The URL reuses the original's `?v=` (same rule as the backfill script), so the
        thumbnail's cache is invalidated exactly when the original changes.
        """
        data = make_thumbnail(file)
        if data is None:
            return None
        path = f"products/thumb/{product_id}.webp"
        bucket = self._client.storage.from_(self._bucket)
        await bucket.upload(
            path,
            data,
            {
                "content-type": THUMB_CONTENT_TYPE,
                "cache-control": THUMB_CACHE_CONTROL,
                "upsert": "true",
            },
        )
        public_url = await bucket.get_public_url(path)
        return UploadedImage(path=path, public_url=f"{public_url}?v={version}", version=version)

    async def set_image_url(self, product_id: str, image_url: str) -> None:
        await self.update_product(product_id, image_url=image_url)

    async def update_product(
        self,
        product_id: str,
        *,
        image_url: str | None = None,
        thumbnail: str | object | None = None,
        price: int | None = None,
    ) -> None:
        """Write what the page gave us. Values left as None are not touched;
        `thumbnail=CLEAR` sets the column to NULL.

        `price` lands in sale_price. stmx-web's CHECK wants sale_price >= 0 and
        original_price null-or-greater, so a scraped price is only ever written when
        it is a sane positive integer (see EXTRACT_PAGE_JS) and original_price is
        left alone.
        """
        changes: dict[str, object] = {}
        if image_url is not None:
            changes["image_url"] = image_url
        if thumbnail is CLEAR:
            changes["thumbnail"] = None
        elif thumbnail is not None:
            changes["thumbnail"] = thumbnail
        if price is not None and price >= 0:
            changes["sale_price"] = price
        if not changes:
            return
        resp = await (
            self._client.table(self._table).update(changes).eq("id", product_id).execute()
        )
        if not resp.data:
            raise LookupError(f"product {product_id} not found")
