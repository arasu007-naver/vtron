"""Long-lived Chrome (CDP) session shared by API requests.

Reuses `open_context` / `capture_one` from capture_and_crop.py so the API
captures images exactly like the CLI does.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from pathlib import Path

from playwright.async_api import Browser, BrowserContext, Playwright, async_playwright

from capture_and_crop import ItemResult, capture_one, open_context
from config import Settings

log = logging.getLogger(__name__)

BLOCK_ERRORS = {"login_page", "login_redirect", "access_restricted_418"}


@dataclass
class CaptureOptions:
    """Duck-typed stand-in for the CLI's argparse.Namespace."""

    cdp: str | None
    width: int = 1280
    height: int = 900
    wait_ms: int = 1500
    timeout_ms: int = 45000
    wait_selector: str | None = None
    full_page: bool = False
    min_area: float = 0.02
    padding: int = 0
    preview: bool = False
    box: tuple[int, int, int, int] | None = None
    screenshot_only: bool = False
    keep_screenshot: bool = False
    headed: bool = False
    channel: str | None = None
    user_data_dir: Path | None = None


class BrowserSession:
    def __init__(self, settings: Settings) -> None:
        self.options = CaptureOptions(
            cdp=settings.cdp_url,
            width=settings.viewport_width,
            height=settings.viewport_height,
            wait_ms=settings.wait_ms,
            timeout_ms=settings.timeout_ms,
        )
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        # Naver blocks aggressive access: one page at a time across all requests.
        self._lock = asyncio.Lock()

    @property
    def connected(self) -> bool:
        return self._browser is not None and self._browser.is_connected()

    async def _ensure_context(self) -> BrowserContext:
        if self._context is not None and self.connected:
            return self._context
        if self._playwright is None:
            self._playwright = await async_playwright().start()
        log.info("connecting to Chrome at %s", self.options.cdp)
        self._browser, self._context = await open_context(self._playwright, self.options)
        return self._context

    async def connect(self) -> None:
        async with self._lock:
            await self._ensure_context()

    async def capture(self, url: str, item_id: str, work_dir: Path) -> ItemResult:
        shot_dir = work_dir / "screenshots"
        crop_dir = work_dir / "crops"
        shot_dir.mkdir(parents=True, exist_ok=True)
        crop_dir.mkdir(parents=True, exist_ok=True)
        async with self._lock:
            context = await self._ensure_context()
            return await capture_one(context, url, item_id, shot_dir, crop_dir, self.options)

    async def close(self) -> None:
        # With CDP, browser.close() only disconnects; the user's Chrome stays open.
        if self._browser is not None:
            try:
                await self._browser.close()
            except Exception:  # noqa: BLE001
                pass
        if self._playwright is not None:
            await self._playwright.stop()
        self._browser = self._context = self._playwright = None
