from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SITE_ROOT = PROJECT_ROOT / "site"
SOURCE_PATH = PROJECT_ROOT / "site-source.json"
OUTPUT_DIR = SITE_ROOT / "audit" / "contact-sheets"

CELL_W = 240
CELL_H = 250
IMAGE_SIZE = 205
HEADER_H = 58
COLS = 4


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = ["arialbd.ttf" if bold else "arial.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"]
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


TITLE_FONT = font(25, bold=True)
LABEL_FONT = font(18, bold=True)
NOTE_FONT = font(14)


def load_image(path: Path) -> Image.Image:
    with Image.open(path) as src:
        return ImageOps.exif_transpose(src).convert("RGB")


def draw_sheet(unit: dict, mode: str) -> Path:
    words = unit["words"]
    rows = (len(words) + COLS - 1) // COLS
    canvas = Image.new("RGB", (COLS * CELL_W, HEADER_H + rows * CELL_H), "#f4f7fb")
    draw = ImageDraw.Draw(canvas)
    title = f"{unit['topicId']} - {'Source references' if mode == 'reference' else 'Generated website images'}"
    draw.text((18, 14), title, fill="#172033", font=TITLE_FONT)

    for index, word in enumerate(words):
        row, col = divmod(index, COLS)
        x = col * CELL_W
        y = HEADER_H + row * CELL_H
        draw.rounded_rectangle((x + 6, y + 6, x + CELL_W - 6, y + CELL_H - 6), 14, fill="white", outline="#d7deea", width=2)

        if mode == "reference" and word.get("sourceImage"):
            image_path = PROJECT_ROOT / Path(word["sourceImage"])
        elif mode == "generated":
            image_path = SITE_ROOT / "public" / "images" / "vocabulary" / unit["dir"] / word["image"]
        else:
            image_path = None

        if image_path and image_path.is_file():
            image = ImageOps.contain(load_image(image_path), (IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)
            image_x = x + (CELL_W - image.width) // 2
            image_y = y + 15 + (IMAGE_SIZE - image.height) // 2
            canvas.paste(image, (image_x, image_y))
        else:
            box = (x + 18, y + 18, x + CELL_W - 18, y + 18 + IMAGE_SIZE)
            draw.rounded_rectangle(box, 12, fill="#eef2f7", outline="#cbd5e1")
            draw.text((x + 43, y + 103), "No source image", fill="#64748b", font=NOTE_FONT)

        label = word["en"]
        label_box = draw.textbbox((0, 0), label, font=LABEL_FONT)
        label_w = label_box[2] - label_box[0]
        draw.text((x + (CELL_W - label_w) // 2, y + 224), label, fill="#172033", font=LABEL_FONT)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output = OUTPUT_DIR / f"{unit['dir']}-{mode}.jpg"
    canvas.save(output, "JPEG", quality=88, progressive=True, optimize=True)
    return output


def main() -> None:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    outputs: list[Path] = []
    for book in source["books"]:
        for unit in book["units"]:
            outputs.append(draw_sheet(unit, "reference"))
            outputs.append(draw_sheet(unit, "generated"))
    for output in outputs:
        print(output)


if __name__ == "__main__":
    main()
