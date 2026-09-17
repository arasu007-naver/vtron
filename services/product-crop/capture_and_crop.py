#!/usr/bin/env python3
"""URL list → capture product images (prefer real Chrome via CDP).

Recommended on Mac when Playwright Chromium is blocked by Naver:

  ./start_chrome_debug.mac.sh
  # log into Naver in that Chrome, confirm a catalog page opens

  .venv/bin/python capture_and_crop.py naver_urls.txt -o ./naver_out \\
    --cdp http://127.0.0.1:9222 --concurrency 1
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    TimeoutError as PlaywrightTimeout,
    async_playwright,
)

from crop_product import crop_and_save, dedupe_boxes, detect_product_boxes, parse_box

MAC_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)

EXTRACT_IMAGE_JS = r"""
() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const src = el.getAttribute('content') || el.getAttribute('src') || el.currentSrc;
    return src && src.startsWith('http') ? src : null;
  };

  const candidates = [];
  const og = pick('meta[property="og:image"]') || pick('meta[name="og:image"]');
  if (og) candidates.push({src: og, score: 1000, w: 0, h: 0});

  const imgs = Array.from(document.images || []);
  for (const img of imgs) {
    const src = img.currentSrc || img.src || '';
    if (!src.startsWith('http')) continue;
    if (/sprite|icon|logo|lazy|blank|data:|avatar|btn_/i.test(src)) continue;
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (w * h < 80 * 80) continue;
    let score = w * h;
    if (/shopping-phinf|shop-phinf|pstatic\.net/i.test(src)) score *= 3;
    if (/main_/i.test(src)) score *= 2;
    candidates.push({src, score, w, h});
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.length ? candidates[0].src : null;
}
"""


def slugify(value: str, max_len: int = 80) -> str:
    value = re.sub(r"[^\w\-]+", "_", value, flags=re.UNICODE).strip("_")
    return (value or "item")[:max_len]


def load_url_list(path: Path) -> list[tuple[str, str]]:
    items: list[tuple[str, str]] = []
    lines = path.read_text(encoding="utf-8").splitlines()
    n = 0
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        explicit_id = None
        if "\t" in line or "," in line:
            row = next(csv.reader([line], delimiter="\t" if "\t" in line else ","))
            if not row:
                continue
            url = row[0].strip().strip('"')
            if url.lower() in {"url", "link", "href"}:
                continue
            if len(row) > 1 and row[1].strip():
                explicit_id = row[1].strip().strip('"')
        else:
            url = line
        if not url.startswith(("http://", "https://")):
            continue
        n += 1
        if explicit_id:
            item_id = slugify(explicit_id)
        else:
            path_tail = slugify(urlparse(url).path.strip("/") or urlparse(url).netloc)
            item_id = f"{n:04d}_{path_tail}" if path_tail else f"{n:04d}_item"
        items.append((url, item_id))
    return items


@dataclass
class ItemResult:
    url: str
    id: str
    ok: bool
    screenshot: str | None = None
    image_url: str | None = None
    crops: list[str] | None = None
    error: str | None = None


async def page_block_reason(page: Page) -> str | None:
    url = page.url.lower()
    if "nid.naver.com" in url:
        return "login_redirect"
    try:
        text = await page.locator("body").inner_text(timeout=3000)
    except Exception:  # noqa: BLE001
        text = ""
    compact = re.sub(r"\s+", " ", text)
    if "접속이 일시적으로 제한" in compact or "쇼핑 서비스 접속이 일시적으로 제한" in compact:
        return "access_restricted_418"
    if "아이디 또는 전화번호" in compact and "일회용번호 로그인" in compact:
        return "login_page"
    return None


def download_image(url: str, dest: Path, referer: str) -> None:
    req = Request(
        url,
        headers={
            "User-Agent": MAC_UA,
            "Referer": referer,
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
    )
    with urlopen(req, timeout=30) as resp:
        dest.write_bytes(resp.read())


def crop_screenshot(
    shot_path: Path,
    crop_dir: Path,
    *,
    min_area: float,
    padding: int,
    preview: bool,
    box: tuple[int, int, int, int] | None,
) -> list[Path]:
    import cv2

    image = cv2.imread(str(shot_path), cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError(f"Failed to read screenshot: {shot_path}")
    boxes = (
        [box]
        if box is not None
        else detect_product_boxes(image, min_area_ratio=min_area, max_results=1)
    )
    boxes = dedupe_boxes(boxes)[:1]
    return [
        p
        for p in crop_and_save(
            image,
            boxes,
            crop_dir,
            stem=shot_path.stem,
            padding=padding,
            draw_preview=preview,
        )
        if not p.name.endswith("_preview.png")
    ]


async def open_context(p, args: argparse.Namespace) -> tuple[Browser | None, BrowserContext]:
    if args.cdp:
        browser = await p.chromium.connect_over_cdp(args.cdp)
        if browser.contexts:
            return browser, browser.contexts[0]
        context = await browser.new_context(locale="ko-KR", user_agent=MAC_UA)
        return browser, context

    launch_kwargs = {
        "locale": "ko-KR",
        "viewport": {"width": args.width, "height": args.height},
        "user_agent": MAC_UA,
        "headless": not args.headed,
    }
    if args.channel:
        launch_kwargs["channel"] = args.channel

    if args.user_data_dir is not None:
        args.user_data_dir.mkdir(parents=True, exist_ok=True)
        context = await p.chromium.launch_persistent_context(
            user_data_dir=str(args.user_data_dir),
            **launch_kwargs,
        )
        return None, context

    browser = await p.chromium.launch(
        headless=not args.headed,
        channel=args.channel if args.channel else None,
    )
    context = await browser.new_context(
        locale="ko-KR",
        viewport={"width": args.width, "height": args.height},
        user_agent=MAC_UA,
    )
    return browser, context


async def capture_one(
    context: BrowserContext,
    url: str,
    item_id: str,
    shot_dir: Path,
    crop_dir: Path,
    args: argparse.Namespace,
) -> ItemResult:
    page = await context.new_page()
    shot = shot_dir / f"{item_id}.png"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=args.timeout_ms)
        if args.wait_selector:
            await page.wait_for_selector(args.wait_selector, timeout=args.timeout_ms)
        if args.wait_ms > 0:
            await page.wait_for_timeout(args.wait_ms)
        try:
            await page.wait_for_load_state("networkidle", timeout=min(5000, args.timeout_ms))
        except PlaywrightTimeout:
            pass

        blocked = await page_block_reason(page)
        if blocked:
            await page.screenshot(path=str(shot), full_page=args.full_page)
            return ItemResult(
                url=url, id=item_id, ok=False, screenshot=str(shot), error=blocked
            )

        image_url = None
        if not args.screenshot_only:
            try:
                image_url = await page.evaluate(EXTRACT_IMAGE_JS)
            except Exception:  # noqa: BLE001
                image_url = None

        if image_url:
            dest = crop_dir / f"{item_id}_product_01.jpg"
            try:
                await asyncio.to_thread(download_image, image_url, dest, page.url)
                if args.keep_screenshot:
                    await page.screenshot(path=str(shot), full_page=args.full_page)
                return ItemResult(
                    url=url,
                    id=item_id,
                    ok=True,
                    screenshot=str(shot) if args.keep_screenshot else None,
                    image_url=image_url,
                    crops=[str(dest)],
                )
            except Exception as exc:  # noqa: BLE001
                # Fall through to screenshot crop.
                dl_err = str(exc)
        else:
            dl_err = None

        await page.screenshot(path=str(shot), full_page=args.full_page)
        try:
            crops = crop_screenshot(
                shot,
                crop_dir,
                min_area=args.min_area,
                padding=args.padding,
                preview=args.preview,
                box=args.box,
            )
        except Exception as exc:  # noqa: BLE001
            return ItemResult(
                url=url,
                id=item_id,
                ok=False,
                screenshot=str(shot),
                image_url=image_url,
                error=f"crop_failed: {exc}" + (f" (dl: {dl_err})" if dl_err else ""),
            )
        if not crops:
            return ItemResult(
                url=url,
                id=item_id,
                ok=False,
                screenshot=str(shot),
                image_url=image_url,
                error="No crops produced"
                + (f" (dl: {dl_err})" if dl_err else ""),
            )
        return ItemResult(
            url=url,
            id=item_id,
            ok=True,
            screenshot=str(shot),
            image_url=image_url,
            crops=[str(c) for c in crops],
        )
    except Exception as exc:  # noqa: BLE001
        return ItemResult(url=url, id=item_id, ok=False, error=str(exc))
    finally:
        await page.close()


async def run_pipeline(args: argparse.Namespace) -> int:
    items = load_url_list(args.input)
    if not items:
        print("No URLs found in list.", file=sys.stderr)
        return 1

    out_root = args.output_dir
    shot_dir = out_root / "screenshots"
    crop_dir = out_root / "crops"
    shot_dir.mkdir(parents=True, exist_ok=True)
    crop_dir.mkdir(parents=True, exist_ok=True)

    if not args.cdp and args.user_data_dir is None:
        print(
            "경고: --cdp 또는 --user-data-dir 권장.\n"
            "Mac: ./start_chrome_debug.mac.sh  후  --cdp http://127.0.0.1:9222",
            file=sys.stderr,
        )

    results: list[ItemResult] = []
    sem = asyncio.Semaphore(max(1, args.concurrency))

    async with async_playwright() as p:
        browser, context = await open_context(p, args)

        async def handle(url: str, item_id: str) -> ItemResult:
            async with sem:
                return await capture_one(context, url, item_id, shot_dir, crop_dir, args)

        tasks = [handle(url, item_id) for url, item_id in items]
        for coro in asyncio.as_completed(tasks):
            result = await coro
            results.append(result)
            status = "ok" if result.ok else "FAIL"
            extra = result.error or (result.image_url or "")
            print(f"[{status}] {result.id} {extra} {result.url}")

        # Don't close the user's Chrome when using CDP.
        if args.cdp:
            await browser.close()  # disconnect only
        else:
            await context.close()
            if browser is not None:
                await browser.close()

    results.sort(key=lambda r: r.id)
    report_path = out_root / "report.json"
    report_path.write_text(
        json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    ok_n = sum(1 for r in results if r.ok)
    fail_n = len(results) - ok_n
    blocked = sum(
        1
        for r in results
        if r.error in {"login_page", "login_redirect", "access_restricted_418"}
    )
    print(f"done: {ok_n} ok, {fail_n} failed -> {out_root}")
    if blocked:
        print(
            f"note: {blocked}건 차단/로그인. 일반 Chrome + --cdp 로 다시 시도하세요.",
            file=sys.stderr,
        )
    print(f"report: {report_path}")
    for r in results:
        if not r.ok:
            print(f"FAIL {r.id}: {r.error}", file=sys.stderr)
    return 0 if fail_n == 0 else 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="URL list → product image capture")
    p.add_argument("input", type=Path, help="URL list file")
    p.add_argument("-o", "--output-dir", type=Path, default=Path("pipeline_out"))
    p.add_argument("--concurrency", type=int, default=1)
    p.add_argument("--width", type=int, default=1280)
    p.add_argument("--height", type=int, default=900)
    p.add_argument("--full-page", action="store_true")
    p.add_argument("--wait-ms", type=int, default=2000)
    p.add_argument("--timeout-ms", type=int, default=45000)
    p.add_argument("--wait-selector", default=None)
    p.add_argument("--min-area", type=float, default=0.02)
    p.add_argument("--padding", type=int, default=0)
    p.add_argument("--preview", action="store_true")
    p.add_argument("--box", type=parse_box, default=None)
    p.add_argument("--user-data-dir", type=Path, default=None)
    p.add_argument("--headed", action="store_true")
    p.add_argument("--channel", default=None, help="e.g. chrome")
    p.add_argument(
        "--cdp",
        default=None,
        help="Attach to existing Chrome, e.g. http://127.0.0.1:9222",
    )
    p.add_argument(
        "--screenshot-only",
        action="store_true",
        help="Skip DOM image URL extraction; screenshot+crop only",
    )
    p.add_argument(
        "--keep-screenshot",
        action="store_true",
        help="Also save full page screenshot when image URL download succeeds",
    )
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.input.is_file():
        print(f"List not found: {args.input}", file=sys.stderr)
        return 1
    return asyncio.run(run_pipeline(args))


if __name__ == "__main__":
    raise SystemExit(main())
