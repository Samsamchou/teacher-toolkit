"""Extract teacher-reviewed scan/PDF regions without changing their contents.

Input coordinates are pixels AFTER EXIF orientation (PNG/JPG), or AFTER PDF
page rendering at render_dpi. Every region must provide the expected page
dimensions and source SHA-256. All regions are preflighted before any writes.
Original files remain read-only; outputs are limited to this project.

Usage:
  python scripts/extract_student_art_regions.py --manifest PATH [--output-dir PATH]

This is literal document extraction, not enhancement: it does not sharpen,
denoise, replace handwriting, remove a red annotation frame, or square images.
Transparent pixels are composited on white; their policy is recorded. PDF
support requires PyMuPDF; no dependency is automatically installed.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
from io import BytesIO
import json
from pathlib import Path
import re
import sys

from PIL import Image, ImageOps

ROOT = Path.cwd().resolve()
ID_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}\Z")
HASH_PATTERN = re.compile(r"[0-9a-f]{64}\Z")
WINDOWS_RESERVED = {"CON", "PRN", "AUX", "NUL"} | {
    f"{prefix}{number}" for prefix in ("COM", "LPT") for number in range(1, 10)
}


def sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def resolve_input(value: str) -> Path:
    path = Path(value).expanduser()
    return (path if path.is_absolute() else ROOT / path).resolve()


def integers(value, count: int, label: str) -> list[int]:
    if (not isinstance(value, list) or len(value) != count or
            any(type(item) is not int for item in value)):
        raise ValueError(f"{label} must be a list of {count} integers.")
    return value


def text_value(value, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be a non-empty string.")
    return value


def load_raster(path: Path) -> tuple[Image.Image, dict]:
    with Image.open(path) as original:
        original.load()
        original_dimensions = list(original.size)
        exif_orientation = int(original.getexif().get(274, 1))
        oriented = ImageOps.exif_transpose(original)
        has_alpha = "A" in oriented.getbands() or "transparency" in oriented.info
        if has_alpha:
            rgba = oriented.convert("RGBA")
            white = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
            result = Image.alpha_composite(white, rgba).convert("RGB")
        else:
            result = oriented.convert("RGB")
        metadata = {
            "coordinate_space": "exif_oriented_raster_pixels",
            "original_dimensions": original_dimensions,
            "exif_orientation": exif_orientation,
            "alpha_policy": "composite_on_white" if has_alpha else "not_present",
        }
        return result, metadata


def load_pdf(path: Path, page: int, render_dpi: int) -> tuple[Image.Image, dict]:
    try:
        import fitz
    except ImportError as error:
        raise ValueError(
            "PDF extraction requires PyMuPDF (import fitz). This Python runtime "
            "does not have it; use a runtime with PyMuPDF. No files were written."
        ) from error
    with fitz.open(path) as document:
        if document.needs_pass:
            raise ValueError(f"Encrypted PDF needs local unlocking before extraction: {path.name}")
        if not 1 <= page <= len(document):
            raise ValueError(f"PDF page {page} is outside 1..{len(document)}: {path.name}")
        pdf_page = document.load_page(page - 1)
        pixmap = pdf_page.get_pixmap(dpi=render_dpi, colorspace=fitz.csRGB, alpha=False)
        result = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
        return result, {
            "coordinate_space": "rendered_pdf_page_pixels",
            "pdf_page_1based": page,
            "render_dpi": render_dpi,
            "page_rotation_degrees": pdf_page.rotation,
            "alpha_policy": "render_on_white",
        }


def dump_new(path: Path, value) -> None:
    with path.open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def extract(manifest_path: Path, output_override: str | None) -> dict:
    specification = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    if not isinstance(specification, dict) or specification.get("schema_version") != 1:
        raise ValueError("Manifest must be an object with schema_version: 1.")
    regions = specification.get("regions")
    if not isinstance(regions, list) or not regions:
        raise ValueError("Manifest must contain a non-empty regions list.")
    output = resolve_input(text_value(
        output_override or specification.get("output_dir"), "output_dir"))
    if not output.is_relative_to(ROOT):
        raise ValueError("output_dir must resolve inside this project, including symlink targets.")
    raw_dir = output / "raw"
    for directory in (output, raw_dir):
        if directory.exists() and not directory.is_dir():
            raise ValueError(f"Output directory is occupied by a file: {directory}")
    targets = [output / "crop-manifest.json"]
    source_hashes: dict[Path, str] = {}
    images: dict[tuple, tuple[Image.Image, dict]] = {}
    prepared = []
    seen_ids = set()

    # Validation and encoding complete for ALL regions before any output write.
    for number, region in enumerate(regions, 1):
        if not isinstance(region, dict):
            raise ValueError(f"Region {number} must be an object.")
        region_id = text_value(region.get("id"), f"Region {number} id")
        if not ID_PATTERN.fullmatch(region_id) or region_id.upper() in WINDOWS_RESERVED:
            raise ValueError(f"Unsafe output id: {region_id!r}")
        if region_id.casefold() in seen_ids:
            raise ValueError(f"Duplicate id (case insensitive): {region_id}")
        seen_ids.add(region_id.casefold())
        source = resolve_input(text_value(region.get("source"), f"{region_id} source"))
        if not source.is_file():
            raise ValueError(f"Source file not found: {source}")
        expected_hash = text_value(region.get("source_sha256"), f"{region_id} source_sha256").lower()
        if not HASH_PATTERN.fullmatch(expected_hash):
            raise ValueError(f"{region_id} source_sha256 must have 64 hexadecimal characters.")
        if source not in source_hashes:
            source_hashes[source] = sha(source)
        if source_hashes[source] != expected_hash:
            raise ValueError(f"Source SHA-256 mismatch: {region_id}; review the source before updating coordinates.")
        dimensions = integers(region.get("expected_page_dimensions"), 2,
                              f"{region_id} expected_page_dimensions")
        if min(dimensions) <= 0:
            raise ValueError(f"{region_id} expected_page_dimensions must be positive.")
        extension = source.suffix.lower()
        if extension == ".pdf":
            page = region.get("pdf_page_1based")
            dpi = region.get("render_dpi", 300)
            if type(page) is not int or page < 1:
                raise ValueError(f"{region_id} PDF requires pdf_page_1based >= 1.")
            if type(dpi) is not int or not 1 <= dpi <= 1200:
                raise ValueError(f"{region_id} render_dpi must be an integer from 1 to 1200.")
            cache_key = (source, page, dpi)
            if cache_key not in images:
                images[cache_key] = load_pdf(source, page, dpi)
        elif extension in {".png", ".jpg", ".jpeg"}:
            if "pdf_page_1based" in region or "render_dpi" in region:
                raise ValueError(f"{region_id} PDF page/DPI fields are only valid for PDF sources.")
            cache_key = (source,)
            if cache_key not in images:
                images[cache_key] = load_raster(source)
        else:
            raise ValueError(f"Unsupported source type {extension!r}; use PNG, JPG, JPEG, or PDF.")
        image, metadata = images[cache_key]
        if list(image.size) != dimensions:
            raise ValueError(f"Page dimensions mismatch for {region_id}: expected {dimensions}, "
                             f"actual {list(image.size)}. Coordinates were not applied.")
        box = integers(region.get("bbox_xyxy_exclusive"), 4, f"{region_id} bbox_xyxy_exclusive")
        x0, y0, x1, y1 = box
        if not (0 <= x0 < x1 <= image.width and 0 <= y0 < y1 <= image.height):
            raise ValueError(f"Out-of-bounds or empty region: {region_id}, bbox {box}, page {dimensions}")
        target = raw_dir / f"{region_id}.png"
        targets.extend([target, target.with_suffix(".source.json")])
        crop = image.crop(tuple(box))
        buffer = BytesIO()
        crop.save(buffer, format="PNG")
        payload = buffer.getvalue()
        with Image.open(BytesIO(payload)) as decoded:
            decoded.load()
            equal = decoded.size == crop.size and decoded.convert("RGB").tobytes() == crop.tobytes()
        if not equal:
            raise RuntimeError(f"Lossless PNG encoding check failed: {region_id}")
        record = {
            "id": region_id,
            "weekday": region.get("weekday"),
            "vocabulary_label_for_mapping": region.get("vocabulary_label_for_mapping"),
            "source": str(source),
            "source_sha256": expected_hash,
            "expected_page_dimensions": dimensions,
            "crop_bbox_xyxy_exclusive": box,
            "raw_output": str(target),
            "raw_dimensions": list(crop.size),
            "sha256": hashlib.sha256(payload).hexdigest(),
            "source_pixels_equal": True,
            "source_pixels_equal_basis": "RGB source after recorded orientation/alpha/PDF rendering normalization",
            "source_preparation": metadata,
            "contains": region.get("contains", ["student drawing", "student handwriting", "printed weekday"]),
            "enhancement_status": "not_applied_literal_extraction_only",
            "handwriting_policy": "Preserve literal writing and colors; mapping label does not replace handwriting.",
        }
        prepared.append((target, payload, record))
    for target in targets:
        if target.exists():
            raise FileExistsError(f"Refusing to overwrite an existing output: {target}")
        if not target.resolve().is_relative_to(ROOT):
            raise ValueError(f"Output resolves outside the project: {target}")
    # Confirm sources did not change during decoding and preflight.
    for source, source_hash in source_hashes.items():
        if sha(source) != source_hash:
            raise ValueError(f"Source changed during preflight; no files were written: {source.name}")

    raw_dir.mkdir(parents=True, exist_ok=True)
    for target, payload, record in prepared:
        with target.open("xb") as handle:
            handle.write(payload)
        with Image.open(target) as decoded:
            decoded.load()
            if decoded.format != "PNG" or list(decoded.size) != record["raw_dimensions"]:
                raise RuntimeError(f"Saved image decode check failed: {target}")
        if sha(target) != record["sha256"]:
            raise RuntimeError(f"Saved image hash check failed: {target}")
        dump_new(target.with_suffix(".source.json"), record)
    items = [record for _, _, record in prepared]
    manifest = {
        "schema_version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "stage": "literal_document_extraction",
        "input_manifest": {"path": str(manifest_path), "sha256": sha(manifest_path)},
        "sources": [{"path": str(source), "sha256": source_hash}
                    for source, source_hash in source_hashes.items()],
        "output_dir": str(output),
        "count": len(items),
        "items": items,
        "paid_api_calls": 0,
        "enhancement_complete": False,
        "qa": {
            "all_regions_preflighted_before_write": True,
            "raw_crop_decode_pass": len(items),
            "exact_normalized_source_pixel_match_pass": len(items),
            "teacher_crop_acceptance": "pending",
        },
    }
    if len(source_hashes) == 1:
        source, source_hash = next(iter(source_hashes.items()))
        manifest["source"] = {"path": str(source), "sha256": source_hash}
        if len(images) == 1:
            manifest["source"]["dimensions"] = list(next(iter(images.values()))[0].size)
    dump_new(output / "crop-manifest.json", manifest)
    return {"count": len(items), "output_dir": str(output),
            "source_pixel_match_pass": len(items), "paid_api_calls": 0,
            "teacher_crop_acceptance": "pending"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--manifest", required=True, help="UTF-8 JSON region specification; relative paths use the project root.")
    parser.add_argument("--output-dir", help="Override the manifest output_dir; must resolve inside this project.")
    parser.add_argument("--project", type=Path, default=Path.cwd())
    args = parser.parse_args()
    global ROOT
    ROOT = args.project.resolve()
    try:
        result = extract(resolve_input(args.manifest), args.output_dir)
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"Extraction failed: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
