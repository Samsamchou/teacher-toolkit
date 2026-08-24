"""Build and verify the nine image-option QA contact sheet."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


OPTION_IDS = (
    "OPT-01A",
    "OPT-01B",
    "OPT-01C",
    "OPT-10A",
    "OPT-10B",
    "OPT-10C",
    "OPT-18A",
    "OPT-18B",
    "OPT-18C",
)


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    option_root = project_root / "assets" / "imagegen" / "masters" / "options"
    output = (
        project_root
        / "assets"
        / "imagegen"
        / "qa"
        / "OPT-01_10_18-contact-sheet-20260824.png"
    )

    cell_width, cell_height = 360, 400
    sheet = Image.new("RGB", (cell_width * 3, cell_height * 3), (30, 38, 50))
    draw = ImageDraw.Draw(sheet)
    hashes: list[str] = []

    print(f"OPTION_COUNT={len(OPTION_IDS)}")
    for index, option_id in enumerate(OPTION_IDS):
        path = option_root / f"{option_id}.png"
        with Image.open(path) as source:
            source.load()
            size = source.size
            mode = source.mode
            image = source.convert("RGB")

        if size != (1024, 1024):
            raise ValueError(f"{option_id}: expected 1024x1024, got {size}")

        digest = hashlib.sha256(path.read_bytes()).hexdigest().upper()
        hashes.append(digest)
        print(f"{option_id}|{size[0]}x{size[1]}|{mode}|{digest}")

        thumb = ImageOps.fit(
            image,
            (340, 340),
            method=Image.Resampling.LANCZOS,
        )
        x = (index % 3) * cell_width + 10
        y = (index // 3) * cell_height + 10
        sheet.paste(thumb, (x, y))
        draw.text((x + 8, y + 352), option_id, fill=(255, 255, 255))

    if len(set(hashes)) != len(OPTION_IDS):
        raise ValueError("One or more option images have duplicate SHA-256 hashes")

    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)
    print(f"UNIQUE_HASHES={len(set(hashes))}")
    print(f"CONTACT_SHEET={output}")
    print(f"CONTACT_SIZE={sheet.width}x{sheet.height}")


if __name__ == "__main__":
    main()
