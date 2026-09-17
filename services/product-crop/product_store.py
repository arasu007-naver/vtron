"""Supabase Storage upload + products.image_url update (stmx-web project)."""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

from PIL import Image
from supabase import AsyncClient, acreate_client

from config import Settings

CONTENT_TYPES = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
    "GIF": ("image/gif", "gif"),
    "AVIF": ("image/avif", "avif"),
}


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
        return UploadedImage(path=path, public_url=f"{public_url}?v={int(time.time())}")

    async def set_image_url(self, product_id: str, image_url: str) -> None:
        resp = await (
            self._client.table(self._table)
            .update({"image_url": image_url})
            .eq("id", product_id)
            .execute()
        )
        if not resp.data:
            raise LookupError(f"product {product_id} not found")
