"""Prepare an ImageGen raster asset at an exact project size without stretching.

The source is never modified and an existing output is never overwritten.
Landscape and evidence assets use proportional cover scaling plus a centered
crop. Transparent cutouts can instead use ``--alpha-box`` to fit the visible
alpha bounds inside a safe fraction of the destination canvas.
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

from PIL import Image, ImageOps


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def prepare_cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Scale proportionally and center-crop to *size*."""

    return ImageOps.fit(
        image,
        size,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def prepare_alpha_box(
    image: Image.Image,
    size: tuple[int, int],
    box_fraction: float,
) -> Image.Image:
    """Fit visible alpha content inside a centered transparent safe box."""

    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit("Alpha-box preparation failed: image has no visible pixels")
    visible = rgba.crop(bbox)
    max_size = (
        max(1, round(size[0] * box_fraction)),
        max(1, round(size[1] * box_fraction)),
    )
    visible.thumbnail(max_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    offset = ((size[0] - visible.width) // 2, (size[1] - visible.height) // 2)
    canvas.alpha_composite(visible, offset)
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    parser.add_argument(
        "--alpha-box",
        type=float,
        help="Fit visible alpha inside this 0–1 fraction of the canvas.",
    )
    args = parser.parse_args()

    if not args.source.is_file():
        raise SystemExit(f"Source does not exist: {args.source}")
    if args.output.exists():
        raise SystemExit(f"Refusing to overwrite: {args.output}")
    if args.width <= 0 or args.height <= 0:
        raise SystemExit("Width and height must be positive")
    if args.alpha_box is not None and not 0 < args.alpha_box <= 1:
        raise SystemExit("--alpha-box must be greater than 0 and at most 1")

    source = Image.open(args.source)
    size = (args.width, args.height)
    if args.alpha_box is None:
        prepared = prepare_cover(source.convert("RGB"), size)
    else:
        prepared = prepare_alpha_box(source, size, args.alpha_box)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    prepared.save(args.output, format="PNG", optimize=True)
    alpha = prepared.getchannel("A") if "A" in prepared.getbands() else None
    print(f"output={args.output}")
    print(f"source_size={source.width}x{source.height}")
    print(f"output_size={prepared.width}x{prepared.height}")
    print(f"mode={prepared.mode}")
    if alpha is not None:
        print(f"alpha_extrema={alpha.getextrema()[0]},{alpha.getextrema()[1]}")
        print(f"alpha_bbox={alpha.getbbox()}")
    print(f"sha256={sha256(args.output)}")


if __name__ == "__main__":
    main()
