"""Build the responsive WebP assets consumed by the local website.

Canonical PNG masters remain untouched.  Existing web derivatives are not
overwritten unless ``--force`` is supplied explicitly.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "assets" / "imagegen" / "masters"
OUTPUT = ROOT / "site" / "public" / "assets" / "images"


def save_webp(source: Path, target: Path, size: tuple[int, int], *, contain: bool, force: bool) -> dict[str, object]:
    if not source.is_file():
        raise SystemExit(f"Missing canonical source: {source}")
    if target.exists() and not force:
        raise SystemExit(f"Refusing to overwrite: {target}")
    image = Image.open(source)
    if contain:
        rgba = image.convert("RGBA")
        rgba.thumbnail(size, Image.Resampling.LANCZOS)
        prepared = Image.new("RGBA", size, (0, 0, 0, 0))
        prepared.alpha_composite(rgba, ((size[0] - rgba.width) // 2, (size[1] - rgba.height) // 2))
    else:
        prepared = ImageOps.fit(image.convert("RGB"), size, Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    target.parent.mkdir(parents=True, exist_ok=True)
    prepared.save(target, format="WEBP", quality=86, method=6)
    return {
        "source": source.relative_to(ROOT).as_posix(),
        "output": target.relative_to(ROOT / "site" / "public").as_posix(),
        "width": prepared.width,
        "height": prepared.height,
        "mode": prepared.mode,
        "bytes": target.stat().st_size,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="replace existing derived WebP files")
    args = parser.parse_args()
    specs: list[tuple[Path, Path, tuple[int, int], bool]] = []

    home_specs = {
        "HOME-01-Hero.png": ("HOME-01.webp", (1600, 900)),
        "HOME-02-MissionMap.png": ("HOME-02.webp", (1024, 768)),
        "HOME-03-HWG7U01U02.png": ("HOME-03.webp", (512, 384)),
        "HOME-04-LockedPortal.png": ("HOME-04.webp", (512, 384)),
    }
    for source_name, (target_name, size) in home_specs.items():
        specs.append((MASTER / "home" / source_name, OUTPUT / "home" / target_name, size, False))

    for index in range(1, 7):
        source = next((MASTER / "scenes").glob(f"SCENE-{index:02d}-*.png"))
        specs.append((source, OUTPUT / "scenes" / f"SCENE-{index:02d}.webp", (1024, 768), False))
        specs.append((source, OUTPUT / "scenes" / f"SCENE-{index:02d}@2x.webp", (2048, 1536), False))
    for index in range(1, 19):
        specs.append((MASTER / "evidence" / f"EVD-{index:02d}.png", OUTPUT / "evidence" / f"EVD-{index:02d}.webp", (960, 720), False))
    for name in ["OPT-01A", "OPT-01B", "OPT-01C", "OPT-10A", "OPT-10B", "OPT-10C", "OPT-18A", "OPT-18B", "OPT-18C"]:
        specs.append((MASTER / "options" / f"{name}.png", OUTPUT / "options" / f"{name}.webp", (512, 512), False))
    for index, stem in enumerate([
        "ITEM-01-ArrivalDataChip", "ITEM-02-IdentityLens", "ITEM-03-TeamPass",
        "ITEM-04-RouteDial", "ITEM-05-ManifestSeal", "ITEM-06-WaterRouteKey",
        "ITEM-07-FinalWelcomePass",
    ], start=1):
        specs.append((MASTER / "items" / f"{stem}.png", OUTPUT / "items" / f"ITEM-{index:02d}.webp", (512, 512), True))
    for index in range(1, 6):
        source = next((MASTER / "mascots").glob(f"MASCOT-{index:02d}-*.png"))
        specs.append((source, OUTPUT / "mascots" / f"MASCOT-{index:02d}.webp", (384, 384), True))
    for index in range(1, 9):
        source = next((MASTER / "characters").glob(f"CHAR-{index:02d}-*.png"))
        specs.append((source, OUTPUT / "characters" / f"CHAR-{index:02d}.webp", (320, 480), True))
    specs.extend([
        (MASTER / "finale" / "FINALE-01-WelcomeGateClosed.png", OUTPUT / "finale" / "FINALE-01.webp", (1024, 768), False),
        (MASTER / "finale" / "FINALE-01-WelcomeGateClosed.png", OUTPUT / "finale" / "FINALE-01@2x.webp", (2048, 1536), False),
        (MASTER / "finale" / "FINALE-02-WelcomeGateOpen.png", OUTPUT / "finale" / "FINALE-02.webp", (1024, 768), False),
        (MASTER / "finale" / "FINALE-02-WelcomeGateOpen.png", OUTPUT / "finale" / "FINALE-02@2x.webp", (2048, 1536), False),
    ])

    manifest = [save_webp(source, target, size, contain=contain, force=args.force) for source, target, size, contain in specs]
    manifest_path = ROOT / "site" / "public" / "assets" / "asset-manifest.json"
    if manifest_path.exists() and not args.force:
        raise SystemExit(f"Refusing to overwrite: {manifest_path}")
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"assets={len(manifest)}")
    print(f"bytes={sum(int(item['bytes']) for item in manifest)}")
    print(f"manifest={manifest_path}")


if __name__ == "__main__":
    main()
