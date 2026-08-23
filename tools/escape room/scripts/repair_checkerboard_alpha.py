"""Convert an ImageGen-baked pale checkerboard into real PNG alpha.

The source file is never modified. The output path must not already exist.
Only the pale background connected to a canvas corner is flood-filled, so
white details enclosed by the character outline remain opaque.
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--threshold", type=int, default=32)
    parser.add_argument("--erode-pixels", type=int, default=0)
    args = parser.parse_args()

    if not args.source.is_file():
        raise SystemExit(f"Source does not exist: {args.source}")
    if args.output.exists():
        raise SystemExit(f"Refusing to overwrite: {args.output}")

    image = Image.open(args.source).convert("RGBA")
    width, height = image.size
    corners = ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1))

    # ImageGen sometimes draws the transparency checkerboard into RGB. The
    # checker shades are near-white and connected across the outer canvas.
    for corner in corners:
        if image.getpixel(corner)[3] != 0:
            ImageDraw.floodfill(
                image,
                corner,
                (0, 0, 0, 0),
                thresh=args.threshold,
            )

    alpha = image.getchannel("A")
    for _ in range(args.erode_pixels):
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    if args.erode_pixels:
        image.putalpha(alpha)
    extrema = alpha.getextrema()
    transparent_pixels = sum(
        count
        for count, value in alpha.getcolors(width * height) or []
        if value == 0
    )
    if extrema == (255, 255) or transparent_pixels == 0:
        raise SystemExit("Alpha repair failed: no transparent pixels were created")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output, format="PNG", optimize=True)
    print(f"output={args.output}")
    print(f"size={width}x{height}")
    print(f"alpha_extrema={extrema[0]},{extrema[1]}")
    print(f"transparent_pixels={transparent_pixels}")
    print(f"sha256={sha256(args.output)}")


if __name__ == "__main__":
    main()
