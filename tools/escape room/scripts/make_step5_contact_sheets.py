"""Validate step-5 assets and build item/finale QA contact sheets."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ITEM_DIR = ROOT / "assets" / "imagegen" / "masters" / "items"
FINALE_DIR = ROOT / "assets" / "imagegen" / "masters" / "finale"
QA_DIR = ROOT / "assets" / "imagegen" / "qa"

ITEMS = [
    "ITEM-01-ArrivalDataChip.png",
    "ITEM-02-IdentityLens.png",
    "ITEM-03-TeamPass.png",
    "ITEM-04-RouteDial.png",
    "ITEM-05-ManifestSeal.png",
    "ITEM-06-WaterRouteKey.png",
    "ITEM-07-FinalWelcomePass.png",
]
FINALES = [
    "FINALE-01-WelcomeGateClosed.png",
    "FINALE-02-WelcomeGateOpen.png",
]


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest().upper()


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/msjh.ttc"),
    ]
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def checker(size: tuple[int, int], block: int = 24) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(image)
    for y in range(0, height, block):
        for x in range(0, width, block):
            color = (238, 242, 247) if (x // block + y // block) % 2 else (44, 57, 74)
            draw.rectangle((x, y, x + block - 1, y + block - 1), fill=color)
    return image


def validate_items() -> list[str]:
    hashes: list[str] = []
    for name in ITEMS:
        path = ITEM_DIR / name
        image = Image.open(path)
        if image.size != (1024, 1024) or image.mode != "RGBA":
            raise SystemExit(f"Invalid item geometry: {name} {image.size} {image.mode}")
        alpha = image.getchannel("A")
        if alpha.getextrema() != (0, 255):
            raise SystemExit(f"Invalid alpha range: {name} {alpha.getextrema()}")
        bbox = alpha.getbbox()
        if bbox is None or bbox[0] < 100 or bbox[1] < 100 or bbox[2] > 924 or bbox[3] > 924:
            raise SystemExit(f"Unsafe visible bounds: {name} {bbox}")
        hashes.append(digest(path))
        print(f"{name}|size=1024x1024|mode=RGBA|alpha=0,255|bbox={bbox}|sha256={hashes[-1]}")
    if len(hashes) != len(set(hashes)):
        raise SystemExit("Step-5 item hashes are not unique")
    return hashes


def make_item_sheet() -> Path:
    tile = 360
    cols, rows = 4, 2
    sheet = Image.new("RGB", (tile * cols, tile * rows), (20, 29, 43))
    draw = ImageDraw.Draw(sheet)
    title_font = font(22)
    for index, name in enumerate(ITEMS):
        x = (index % cols) * tile
        y = (index // cols) * tile
        bg = checker((tile, tile - 42))
        sheet.paste(bg, (x, y + 42))
        item = Image.open(ITEM_DIR / name).convert("RGBA")
        item.thumbnail((280, 280), Image.Resampling.LANCZOS)
        left = x + (tile - item.width) // 2
        top = y + 54 + (tile - 54 - item.height) // 2
        sheet.paste(item, (left, top), item)
        draw.text((x + 12, y + 10), name.removesuffix(".png"), font=title_font, fill="white")
    output = QA_DIR / "ITEM-01-07-contact-sheet-dark-light-20260824.png"
    if output.exists():
        raise SystemExit(f"Refusing to overwrite: {output}")
    sheet.save(output, format="PNG", optimize=True)
    return output


def make_finale_sheet() -> Path:
    canvas = Image.new("RGB", (1360, 590), (18, 26, 38))
    draw = ImageDraw.Draw(canvas)
    label_font = font(25)
    for index, name in enumerate(FINALES):
        path = FINALE_DIR / name
        image = Image.open(path).convert("RGB")
        if image.size != (2048, 1536):
            raise SystemExit(f"Invalid finale geometry: {name} {image.size}")
        thumb = image.resize((640, 480), Image.Resampling.LANCZOS)
        left = 20 + index * 670
        canvas.paste(thumb, (left, 65))
        draw.text((left, 20), name.removesuffix(".png"), font=label_font, fill="white")
        print(f"{name}|size=2048x1536|mode={image.mode}|sha256={digest(path)}")
    output = QA_DIR / "FINALE-01-02-contact-sheet-20260824.png"
    if output.exists():
        raise SystemExit(f"Refusing to overwrite: {output}")
    canvas.save(output, format="PNG", optimize=True)
    return output


def main() -> None:
    QA_DIR.mkdir(parents=True, exist_ok=True)
    validate_items()
    print(f"item_sheet={make_item_sheet()}")
    print(f"finale_sheet={make_finale_sheet()}")


if __name__ == "__main__":
    main()
