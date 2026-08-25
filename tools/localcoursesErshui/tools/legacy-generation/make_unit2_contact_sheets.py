# -*- coding: utf-8 -*-
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[2]

parser = argparse.ArgumentParser(
    description="Create contact sheets from rendered Unit 2 Word pages."
)
parser.add_argument(
    "--src",
    type=Path,
    required=True,
    help="Directory containing page-*.png files.",
)
parser.add_argument(
    "--out",
    type=Path,
    default=PROJECT_ROOT / "work" / "unit2-contact-sheets",
    help="Output directory (default: <project>/work/unit2-contact-sheets).",
)
args = parser.parse_args()

SRC = args.src.resolve()
OUT = args.out.resolve()
if not SRC.is_dir():
    raise SystemExit(f"Source directory does not exist: {SRC}")
OUT.mkdir(parents=True, exist_ok=True)

pages = sorted(
    SRC.glob("page-*.png"),
    key=lambda p: int(p.stem.split("-")[-1]),
)
cols, rows = 4, 3
thumb_w, thumb_h = 340, 440
label_h, gap = 28, 10
font = ImageFont.load_default()

for batch_idx in range(0, len(pages), cols * rows):
    batch = pages[batch_idx : batch_idx + cols * rows]
    sheet = Image.new(
        "RGB",
        (
            cols * (thumb_w + gap) + gap,
            rows * (thumb_h + label_h + gap) + gap,
        ),
        "white",
    )
    draw = ImageDraw.Draw(sheet)
    for offset, path in enumerate(batch):
        im = Image.open(path).convert("RGB")
        im.thumbnail((thumb_w, thumb_h))
        x = gap + (offset % cols) * (thumb_w + gap)
        y = gap + (offset // cols) * (thumb_h + label_h + gap)
        px = x + (thumb_w - im.width) // 2
        py = y + label_h + (thumb_h - im.height) // 2
        sheet.paste(im, (px, py))
        page_no = int(path.stem.split("-")[-1])
        draw.text((x + 4, y + 7), f"Page {page_no}", fill="black", font=font)
        draw.rectangle((x, y + label_h, x + thumb_w, y + label_h + thumb_h), outline="#888888", width=1)
    start = batch_idx + 1
    end = batch_idx + len(batch)
    out = OUT / f"contact_{start:02d}-{end:02d}.jpg"
    sheet.save(out, quality=88)
    print(out)
