"""Create web-sized, deterministic copies of the HWG5 question images."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


TARGET_SIZE = (1280, 720)


def optimize(source: Path, destination: Path) -> None:
    with Image.open(source) as opened:
        rgb = opened.convert("RGB")
        fitted = ImageOps.fit(rgb, TARGET_SIZE, method=Image.Resampling.LANCZOS)
        # Palette PNG keeps the illustrations sharp while reducing iPad transfer size.
        quantized = fitted.quantize(
            colors=256,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.FLOYDSTEINBERG,
        )
        destination.parent.mkdir(parents=True, exist_ok=True)
        quantized.save(destination, format="PNG", optimize=True, compress_level=9)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "images" / "hwg5-sentence-review",
    )
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()

    source_dir = args.source_dir.resolve()
    output_dir = (args.output_dir or source_dir).resolve()
    files = sorted(source_dir.glob("HWG5-SR-*.png"))
    if len(files) != 15:
        raise SystemExit(f"expected 15 HWG5 PNG files, found {len(files)}")

    for source in files:
        destination = output_dir / source.name
        if destination == source:
            temporary = source.with_suffix(".optimized.png")
            optimize(source, temporary)
            temporary.replace(source)
        else:
            optimize(source, destination)
        print(f"optimized {source.name} -> {destination}")


if __name__ == "__main__":
    main()
