from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


SOURCE = Path(
    os.environ.get(
        "LESSON2_STYLE_SOURCE",
        r"C:\Users\User\.codex\generated_images\01a03b72-a928-76b3-a3d9-d6f8c732fc2c\exec-9dbb389c-3bd2-4e00-b016-2f1ce4688fe3.png",
    )
)
OUTPUT = Path(
    os.environ.get(
        "LESSON2_STYLE_OUTPUT",
        r"C:\Users\User\.codex\visualizations\2026\08\26\01a03b72-a928-76b3-a3d9-d6f8c732fc2c\lesson2-seven-sketches\08_火車小偵探五風格比較板_教師選擇用.png",
    )
)

FONT_REGULAR = Path(r"C:\Windows\Fonts\msjh.ttc")
FONT_BOLD = Path(r"C:\Windows\Fonts\msjhbd.ttc")

LABELS = [
    "① 3D Q版\n溫暖手繪",
    "② 3D Q版\n剪紙",
    "③ 3D家庭動畫\n電影感",
    "④ 溫暖日式\n手繪動畫感",
    "⑤ 日式Q版\n動漫",
]


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def centered_multiline(
    draw: ImageDraw.ImageDraw,
    center_x: float,
    top: int,
    text: str,
    text_font: ImageFont.FreeTypeFont,
    fill: str,
    spacing: int = 8,
) -> None:
    box = draw.multiline_textbbox((0, 0), text, font=text_font, spacing=spacing, align="center")
    width = box[2] - box[0]
    draw.multiline_text(
        (center_x - width / 2, top),
        text,
        font=text_font,
        fill=fill,
        spacing=spacing,
        align="center",
    )


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    width, height = source.size
    header_h = 150
    footer_h = 190
    canvas = Image.new("RGB", (width, height + header_h + footer_h), "#FBF8F0")
    canvas.paste(source, (0, header_h))
    draw = ImageDraw.Draw(canvas)

    draw.text((55, 28), "火車小偵探｜五種視覺風格比較板", font=font(FONT_BOLD, 51), fill="#173B57")
    draw.text(
        (58, 91),
        "同一角色、同一姿勢，只比較視覺風格｜教師選擇用，尚非正式教材",
        font=font(FONT_REGULAR, 25),
        fill="#6B7280",
    )

    panel_w = width / 5
    footer_top = header_h + height
    draw.rectangle((0, footer_top, width, footer_top + footer_h), fill="#EEF5F6")
    for index, label in enumerate(LABELS):
        left = index * panel_w
        if index:
            draw.line((left, header_h + 16, left, footer_top + footer_h - 16), fill="#B7C7CD", width=2)
        centered_multiline(
            draw,
            left + panel_w / 2,
            footer_top + 35,
            label,
            font(FONT_BOLD, 29),
            "#173B57",
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT, quality=96)
    print(OUTPUT)


if __name__ == "__main__":
    main()
