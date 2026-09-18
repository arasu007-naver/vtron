#!/usr/bin/env python3
"""Crop product-like image regions from screenshot files — single or batch.

Modes:
  --auto          Detect large rectangular image regions and crop them
  --box x,y,w,h   Crop one or more explicit regions (repeatable)
  --best-only     Keep only the top auto/manual crop per screenshot (batch-friendly)

Input can be:
  - one image file
  - a directory of images
  - a text/CSV list of paths (one path per line; CSV uses first column)
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from pathlib import Path

import cv2
import numpy as np

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}


def parse_box(value: str) -> tuple[int, int, int, int]:
    parts = [p.strip() for p in value.replace("x", ",").split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("box must be x,y,w,h")
    x, y, w, h = map(int, parts)
    if w <= 0 or h <= 0:
        raise argparse.ArgumentTypeError("width/height must be positive")
    return x, y, w, h


def clamp_box(
    x: int, y: int, w: int, h: int, width: int, height: int
) -> tuple[int, int, int, int] | None:
    x2 = min(width, max(0, x) + max(0, w))
    y2 = min(height, max(0, y) + max(0, h))
    x1 = min(max(0, x), width)
    y1 = min(max(0, y), height)
    if x2 <= x1 or y2 <= y1:
        return None
    return x1, y1, x2 - x1, y2 - y1


def iou(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    x1, y1 = max(ax, bx), max(ay, by)
    x2, y2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    if inter == 0:
        return 0.0
    union = aw * ah + bw * bh - inter
    return inter / union if union else 0.0


def nms(
    boxes: list[tuple[int, int, int, int]], scores: list[float], thresh: float = 0.35
) -> list[tuple[int, int, int, int]]:
    order = sorted(range(len(boxes)), key=lambda i: scores[i], reverse=True)
    keep: list[tuple[int, int, int, int]] = []
    while order:
        i = order.pop(0)
        keep.append(boxes[i])
        order = [j for j in order if iou(boxes[i], boxes[j]) < thresh]
    return keep


def detect_product_boxes(
    image: np.ndarray,
    min_area_ratio: float = 0.02,
    max_area_ratio: float = 0.55,
    min_aspect: float = 0.45,
    max_aspect: float = 2.2,
    max_results: int = 8,
) -> list[tuple[int, int, int, int]]:
    """Find large rectangular regions that often correspond to product photos."""
    height, width = image.shape[:2]
    img_area = float(width * height)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 40, 120)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)
    closed = cv2.dilate(closed, kernel, iterations=1)

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates: list[tuple[int, int, int, int]] = []
    scores: list[float] = []
    cx0, cy0 = width / 2.0, height / 2.0

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        area_ratio = area / img_area
        if area_ratio < min_area_ratio or area_ratio > max_area_ratio:
            continue

        aspect = w / float(h)
        if aspect < min_aspect or aspect > max_aspect:
            continue
        if h < height * 0.08 or w < width * 0.08:
            continue
        if y < height * 0.03 and h < height * 0.18:
            continue

        roi = gray[y : y + h, x : x + w]
        if roi.size == 0:
            continue
        texture = float(np.std(roi))
        if texture < 12:
            continue

        bx, by = x + w / 2.0, y + h / 2.0
        dist = ((bx - cx0) / width) ** 2 + ((by - cy0) / height) ** 2
        score = area_ratio * 2.0 + texture / 80.0 - dist
        candidates.append((x, y, w, h))
        scores.append(score)

    if not candidates:
        side = int(min(width, height) * 0.45)
        x = max(0, (width - side) // 2)
        y = max(0, int(height * 0.18))
        return [(x, y, side, min(side, height - y))]

    kept = nms(candidates, scores)
    ranked = sorted(
        kept,
        key=lambda b: scores[candidates.index(b)] if b in candidates else 0,
        reverse=True,
    )
    return ranked[:max_results]


def crop_and_save(
    image: np.ndarray,
    boxes: list[tuple[int, int, int, int]],
    output_dir: Path,
    stem: str,
    padding: int = 0,
    draw_preview: bool = False,
) -> list[Path]:
    height, width = image.shape[:2]
    output_dir.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []
    preview = image.copy() if draw_preview else None

    for i, (x, y, w, h) in enumerate(boxes, start=1):
        if padding:
            x -= padding
            y -= padding
            w += padding * 2
            h += padding * 2
        clamped = clamp_box(x, y, w, h, width, height)
        if not clamped:
            continue
        x, y, w, h = clamped
        crop = image[y : y + h, x : x + w]
        out = output_dir / f"{stem}_product_{i:02d}.png"
        cv2.imwrite(str(out), crop)
        saved.append(out)
        if preview is not None:
            cv2.rectangle(preview, (x, y), (x + w, y + h), (0, 200, 80), 3)
            cv2.putText(
                preview,
                str(i),
                (x + 8, y + 28),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                (0, 200, 80),
                2,
                cv2.LINE_AA,
            )

    if preview is not None and saved:
        preview_path = output_dir / f"{stem}_preview.png"
        cv2.imwrite(str(preview_path), preview)
        saved.append(preview_path)
    return saved


def dedupe_boxes(
    boxes: list[tuple[int, int, int, int]],
) -> list[tuple[int, int, int, int]]:
    unique: list[tuple[int, int, int, int]] = []
    for box in boxes:
        if all(iou(box, u) < 0.8 for u in unique):
            unique.append(box)
    return unique


def collect_inputs(path: Path, recursive: bool) -> list[Path]:
    if path.is_file():
        if path.suffix.lower() in IMAGE_SUFFIXES:
            return [path]
        # Treat as a list file: txt/csv of paths.
        rows: list[Path] = []
        text = path.read_text(encoding="utf-8").splitlines()
        for line in text:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # CSV: take first column
            cell = next(csv.reader([line]))[0].strip().strip('"')
            if not cell or cell.lower() in {"path", "file", "filename", "image"}:
                continue
            candidate = Path(cell).expanduser()
            if not candidate.is_absolute():
                candidate = (path.parent / candidate).resolve()
            if candidate.suffix.lower() in IMAGE_SUFFIXES:
                rows.append(candidate)
        return rows

    if path.is_dir():
        pattern = "**/*" if recursive else "*"
        files = [
            p
            for p in sorted(path.glob(pattern))
            if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES
        ]
        return files

    raise FileNotFoundError(f"Input not found: {path}")


@dataclass
class JobResult:
    input: str
    ok: bool
    crops: list[str]
    error: str | None = None


def process_one(
    input_path: Path,
    output_root: Path,
    *,
    auto: bool,
    boxes: list[tuple[int, int, int, int]],
    padding: int,
    max_results: int,
    min_area: float,
    preview: bool,
    best_only: bool,
    flat: bool,
) -> JobResult:
    try:
        image = cv2.imread(str(input_path), cv2.IMREAD_COLOR)
        if image is None:
            return JobResult(str(input_path), False, [], f"Failed to read: {input_path}")

        found = list(boxes)
        if auto:
            found.extend(
                detect_product_boxes(
                    image,
                    min_area_ratio=min_area,
                    max_results=max_results,
                )
            )
        unique = dedupe_boxes(found)
        if best_only and unique:
            unique = unique[:1]

        out_dir = output_root if flat else output_root / input_path.stem
        saved = crop_and_save(
            image,
            unique,
            out_dir,
            stem=input_path.stem,
            padding=padding,
            draw_preview=preview,
        )
        crop_paths = [str(p) for p in saved if not p.name.endswith("_preview.png")]
        if not crop_paths:
            return JobResult(str(input_path), False, [], "No crops produced")
        return JobResult(str(input_path), True, crop_paths)
    except Exception as exc:  # noqa: BLE001 - batch should never die on one file
        return JobResult(str(input_path), False, [], str(exc))


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Crop product image regions from screenshot file(s)."
    )
    p.add_argument(
        "input",
        type=Path,
        help="Image file, directory of images, or txt/csv list of paths",
    )
    p.add_argument(
        "-o",
        "--output-dir",
        type=Path,
        default=None,
        help="Output directory (default: <input>_crops or ./crops for lists/dirs)",
    )
    p.add_argument("--auto", action="store_true", help="Auto-detect product-like regions")
    p.add_argument(
        "--box",
        action="append",
        type=parse_box,
        default=[],
        help="Manual crop box x,y,w,h (repeatable; applied to every image)",
    )
    p.add_argument("--padding", type=int, default=0, help="Extra pixels around each box")
    p.add_argument(
        "--max-results",
        type=int,
        default=5,
        help="Max auto-detected crops per image (default: 5)",
    )
    p.add_argument(
        "--min-area",
        type=float,
        default=0.02,
        help="Min box area as fraction of image (auto)",
    )
    p.add_argument(
        "--preview",
        action="store_true",
        help="Also write a preview image with boxes drawn",
    )
    p.add_argument(
        "--best-only",
        action="store_true",
        help="Keep only the top crop per screenshot (good for large lists)",
    )
    p.add_argument(
        "--recursive",
        action="store_true",
        help="When input is a directory, include subfolders",
    )
    p.add_argument(
        "--flat",
        action="store_true",
        help="Write all crops directly into output-dir (no per-file subfolders)",
    )
    p.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Parallel workers for batch mode (default: 4)",
    )
    p.add_argument(
        "--report",
        type=Path,
        default=None,
        help="Write JSON report path (default: <output>/report.json for batch)",
    )
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.auto and not args.box:
        print("Specify --auto and/or one or more --box x,y,w,h", file=sys.stderr)
        return 2

    try:
        inputs = collect_inputs(args.input, recursive=args.recursive)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if not inputs:
        print("No image files found.", file=sys.stderr)
        return 1

    if args.output_dir is not None:
        output_root = args.output_dir
    elif args.input.is_file() and args.input.suffix.lower() in IMAGE_SUFFIXES:
        output_root = args.input.with_name(f"{args.input.stem}_crops")
    else:
        output_root = Path("crops")

    output_root.mkdir(parents=True, exist_ok=True)

    results: list[JobResult] = []
    workers = max(1, args.workers)

    def run(path: Path) -> JobResult:
        return process_one(
            path,
            output_root,
            auto=args.auto,
            boxes=list(args.box),
            padding=args.padding,
            max_results=args.max_results,
            min_area=args.min_area,
            preview=args.preview,
            best_only=args.best_only,
            flat=args.flat or (len(inputs) == 1 and args.input.is_file()),
        )

    if len(inputs) == 1 or workers == 1:
        for path in inputs:
            results.append(run(path))
    else:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(run, path): path for path in inputs}
            for fut in as_completed(futures):
                results.append(fut.result())

    # Stable order by input path for the report.
    results.sort(key=lambda r: r.input)
    ok_n = sum(1 for r in results if r.ok)
    fail_n = len(results) - ok_n
    crop_n = sum(len(r.crops) for r in results)

    report_path = args.report
    if report_path is None and len(inputs) > 1:
        report_path = output_root / "report.json"
    if report_path is not None:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(
            json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    print(f"done: {ok_n} ok, {fail_n} failed, {crop_n} crops -> {output_root}")
    if report_path is not None:
        print(f"report: {report_path}")
    for r in results:
        if not r.ok:
            print(f"FAIL {r.input}: {r.error}", file=sys.stderr)
        elif len(inputs) == 1:
            for crop in r.crops:
                print(crop)

    return 0 if fail_n == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
