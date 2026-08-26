from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps, PngImagePlugin


PAGE_SIZE = (2480, 3508)
MASTER_SIZE = (1055, 1491)
COORD_SIZE = (1024, 1536)

UNIT_DIR = Path(__file__).resolve().parents[1]
PILOT_DIR = UNIT_DIR / "18_扇形車庫_第2節ImageGen個人解密單樣稿_20260826"
QA_DIR = PILOT_DIR / "_qa"

MASTER = PILOT_DIR / "08_學生版_ImageGen活潑版無字母版_嘗試2_採用.png"
IMAGEGEN_SOURCE = PILOT_DIR / "06_學生版_ImageGen活潑版無字母版_嘗試1_採用.png"
BEFORE = PILOT_DIR / "04_學生版_正式文字覆排樣稿_跨大題修正前備份_20260826.png"
CANDIDATE = PILOT_DIR / "10_學生版_正式文字覆排_跨大題防重疊候選.png"
FINAL_TARGET = PILOT_DIR / "04_學生版_正式文字覆排樣稿.png"
TEACHER_OUTPUT = PILOT_DIR / "05_教師答案版_正式文字覆排樣稿.png"

ZH_REGULAR = Path(r"C:\Windows\Fonts\msjh.ttc")
ZH_BOLD = Path(r"C:\Windows\Fonts\msjhbd.ttc")
COMIC_RELIEF = (
    UNIT_DIR.parents[2]
    / "skills"
    / "ershui-local-curriculum-builder"
    / "assets"
    / "fonts"
    / "ComicRelief-Regular.ttf"
)

INK = "#24383D"
TEAL = "#0B5558"
GRAY = "#5B686C"
BLUE = "#236E9E"
WHITE = "#FFFFFF"

BASELINE_FONT_PX = {
    "title": 73,
    "name": 31,
    "section": 47,
    "origin": 41,
    "hint": 32,
    "card": 32,
    "legend": 31,
    "english": 48,
    "footer": 22,
}

TARGET_FONT_PX = {
    category: math.ceil(size * 1.2) for category, size in BASELINE_FONT_PX.items()
}

PROHIBITED_FACE_TERMS = ("學生樣稿", "草稿", "待確認")

# 第 2 次／最後一次 ImageGen 編修母版的四色圖示邊界（1055 × 1491 原圖）。
# 這些邊界以人工讀圖與色彩像素讀回交叉確認；文字會依各圖示中心精準垂直置中。
LEGEND_ICON_BBOX_SOURCE = {
    "紅色圓形": (651, 928, 681, 959),
    "藍色線條": (648, 1006, 687, 1013),
    "綠色方格": (651, 1063, 683, 1094),
    "黃色火車": (649, 1132, 692, 1165),
}

# 第 3 大題最後一張黃色票券卡（含下緣陰影）的人工讀圖邊界。
# 原圖 y=1190 換算至 A4 300 dpi 為 y=2799.81 px；第 4 大題標題帶從 y=2820 開始。
SECTION3_LAST_VISUAL_BBOX_SOURCE = (35, 940, 906, 1190)
SECTION4_TITLE_RIBBON_PAGE = (194, 2820, 1264, 2896)
SECTION4_TITLE_TEXT_PAGE = (215, 2820, 1243, 2896)
SECTION4_QUESTION_PAGE = (213, 2916, 1296, 3008)
PREFERRED_SECTION_GAP_PX = 20
MINIMUM_FALLBACK_SECTION_GAP_PX = 10


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def zh_font(size_px: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(ZH_BOLD if bold else ZH_REGULAR), size_px)


def en_font(size_px: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(COMIC_RELIEF), size_px)


def text_size(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def build_canvas(
    master_path: Path,
) -> tuple[Image.Image, tuple[float, float], int, int]:
    with Image.open(master_path) as source:
        if source.size != MASTER_SIZE:
            raise AssertionError(f"Unexpected master size: {source.size}")
        page = source.convert("RGB").resize(PAGE_SIZE, Image.Resampling.LANCZOS)

    coordinate_scale = (
        PAGE_SIZE[0] / COORD_SIZE[0],
        PAGE_SIZE[1] / COORD_SIZE[1],
    )
    return page, coordinate_scale, 0, 0


def master_box(
    scale: tuple[float, float],
    offset_x: int,
    offset_y: int,
    left: float,
    top: float,
    right: float,
    bottom: float,
) -> tuple[int, int, int, int]:
    scale_x, scale_y = scale
    return (
        round(offset_x + left * scale_x),
        round(offset_y + top * scale_y),
        round(offset_x + right * scale_x),
        round(offset_y + bottom * scale_y),
    )


def make_record(
    *,
    text: str,
    category: str,
    target: tuple[int, int, int, int],
    font: ImageFont.FreeTypeFont,
    font_name: str,
) -> dict:
    baseline = BASELINE_FONT_PX[category]
    return {
        "text": text,
        "category": category,
        "box": list(target),
        "font": font_name,
        "baseline_font_size_px": baseline,
        "required_font_size_px": math.ceil(baseline * 1.2),
        "font_size_px": font.size,
        "scale_ratio": round(font.size / baseline, 3),
    }


def draw_single(
    draw: ImageDraw.ImageDraw,
    target: tuple[int, int, int, int],
    text: str,
    category: str,
    *,
    english: bool = False,
    bold: bool = False,
    fill: str = INK,
    align: str = "left",
) -> dict:
    size_px = TARGET_FONT_PX[category]
    font = en_font(size_px) if english else zh_font(size_px, bold=bold)
    width, height = text_size(draw, text, font)
    x1, y1, x2, y2 = target
    if width > x2 - x1 or height > y2 - y1:
        raise ValueError(
            f"Text does not fit at required 120% size: {category=} {text=} "
            f"text={width}x{height} box={x2-x1}x{y2-y1}"
        )
    if align == "center":
        x = x1 + ((x2 - x1) - width) / 2
    elif align == "right":
        x = x2 - width
    else:
        x = x1
    y = y1 + ((y2 - y1) - height) / 2
    draw_x = round(x)
    draw_y = round(y)
    draw.text((draw_x, draw_y), text, font=font, fill=fill)
    rendered_bbox = draw.textbbox((draw_x, draw_y), text, font=font)
    record = make_record(
        text=text,
        category=category,
        target=target,
        font=font,
        font_name=(
            "Comic Relief Regular"
            if english
            else ("Microsoft JhengHei Bold" if bold else "Microsoft JhengHei")
        ),
    )
    record["rendered_bbox"] = list(rendered_bbox)
    return record


def draw_exact_center(
    draw: ImageDraw.ImageDraw,
    target: tuple[int, int, int, int],
    text: str,
    category: str,
    *,
    english: bool = False,
    bold: bool = False,
    fill: str = INK,
) -> dict:
    """依實際字形邊界在目標框內水平、垂直置中。"""
    size_px = TARGET_FONT_PX[category]
    font = en_font(size_px) if english else zh_font(size_px, bold=bold)
    glyph_bbox = draw.textbbox((0, 0), text, font=font)
    glyph_width = glyph_bbox[2] - glyph_bbox[0]
    glyph_height = glyph_bbox[3] - glyph_bbox[1]
    x1, y1, x2, y2 = target
    if glyph_width > x2 - x1 or glyph_height > y2 - y1:
        raise ValueError(
            f"Text does not fit at required 120% size: {category=} {text=} "
            f"text={glyph_width}x{glyph_height} box={x2-x1}x{y2-y1}"
        )
    target_center_x = (x1 + x2) / 2
    target_center_y = (y1 + y2) / 2
    draw_x = round(target_center_x - (glyph_bbox[0] + glyph_bbox[2]) / 2)
    draw_y = round(target_center_y - (glyph_bbox[1] + glyph_bbox[3]) / 2)
    draw.text((draw_x, draw_y), text, font=font, fill=fill)
    rendered_bbox = draw.textbbox((draw_x, draw_y), text, font=font)
    record = make_record(
        text=text,
        category=category,
        target=target,
        font=font,
        font_name=(
            "Comic Relief Regular"
            if english
            else ("Microsoft JhengHei Bold" if bold else "Microsoft JhengHei")
        ),
    )
    record["rendered_bbox"] = list(rendered_bbox)
    record["rendered_center"] = [
        round((rendered_bbox[0] + rendered_bbox[2]) / 2, 2),
        round((rendered_bbox[1] + rendered_bbox[3]) / 2, 2),
    ]
    return record


def draw_left_at_center_y(
    draw: ImageDraw.ImageDraw,
    *,
    left_x: int,
    right_x: int,
    center_y: float,
    row_height: int,
    text: str,
    category: str,
    bold: bool = False,
    fill: str = INK,
) -> dict:
    """固定文字起點，並讓實際字形中心與指定圖示中心同高。"""
    font = zh_font(TARGET_FONT_PX[category], bold=bold)
    glyph_bbox = draw.textbbox((0, 0), text, font=font)
    glyph_width = glyph_bbox[2] - glyph_bbox[0]
    glyph_height = glyph_bbox[3] - glyph_bbox[1]
    if glyph_width > right_x - left_x or glyph_height > row_height:
        raise ValueError(f"Aligned label does not fit: {text}")
    draw_x = round(left_x - glyph_bbox[0])
    draw_y = round(center_y - (glyph_bbox[1] + glyph_bbox[3]) / 2)
    draw.text((draw_x, draw_y), text, font=font, fill=fill)
    rendered_bbox = draw.textbbox((draw_x, draw_y), text, font=font)
    rendered_center_y = (rendered_bbox[1] + rendered_bbox[3]) / 2
    target = (
        left_x,
        round(center_y - row_height / 2),
        right_x,
        round(center_y + row_height / 2),
    )
    record = make_record(
        text=text,
        category=category,
        target=target,
        font=font,
        font_name="Microsoft JhengHei Bold" if bold else "Microsoft JhengHei",
    )
    record["rendered_bbox"] = list(rendered_bbox)
    record["rendered_left_x"] = rendered_bbox[0]
    record["target_center_y"] = round(center_y, 2)
    record["rendered_center_y"] = round(rendered_center_y, 2)
    record["vertical_center_delta_px"] = round(abs(rendered_center_y - center_y), 2)
    return record


def source_bbox_to_page(source_bbox: tuple[int, int, int, int]) -> tuple[float, float, float, float]:
    scale_x = PAGE_SIZE[0] / MASTER_SIZE[0]
    scale_y = PAGE_SIZE[1] / MASTER_SIZE[1]
    x1, y1, x2, y2 = source_bbox
    return x1 * scale_x, y1 * scale_y, x2 * scale_x, y2 * scale_y


def draw_multiline(
    draw: ImageDraw.ImageDraw,
    target: tuple[int, int, int, int],
    lines: list[str],
    category: str,
    *,
    bold: bool = False,
    fill: str = INK,
    align: str = "left",
    line_height_ratio: float = 1.08,
) -> list[dict]:
    font = zh_font(TARGET_FONT_PX[category], bold=bold)
    line_height = round(font.size * line_height_ratio)
    total_height = line_height * len(lines)
    x1, y1, x2, y2 = target
    if total_height > y2 - y1:
        raise ValueError(f"Multiline text too tall at required 120% size: {lines}")
    y = y1 + ((y2 - y1) - total_height) / 2
    records: list[dict] = []
    for line in lines:
        width, height = text_size(draw, line, font)
        if width > x2 - x1:
            raise ValueError(f"Multiline text too wide at required 120% size: {line}")
        if align == "center":
            x = x1 + ((x2 - x1) - width) / 2
        elif align == "right":
            x = x2 - width
        else:
            x = x1
        draw_x = round(x)
        draw_y = round(y)
        draw.text((draw_x, draw_y), line, font=font, fill=fill)
        record = make_record(
                text=line,
                category=category,
                target=(x1, round(y), x2, round(y + max(height, line_height))),
                font=font,
                font_name="Microsoft JhengHei Bold" if bold else "Microsoft JhengHei",
            )
        record["rendered_bbox"] = list(draw.textbbox((draw_x, draw_y), line, font=font))
        records.append(record)
        y += line_height
    return records


def draw_matching_card(
    draw: ImageDraw.ImageDraw,
    target: tuple[int, int, int, int],
    prefix: str,
    lines: list[str],
) -> list[dict]:
    font_en = en_font(TARGET_FONT_PX["card"])
    font_zh = zh_font(TARGET_FONT_PX["card"])
    x1, y1, x2, y2 = target
    prefix_width, prefix_height = text_size(draw, prefix, font_en)
    gap = 18
    line_height = round(TARGET_FONT_PX["card"] * 1.08)
    total_height = line_height * len(lines)
    y = y1 + ((y2 - y1) - total_height) / 2
    records: list[dict] = []

    for index, line in enumerate(lines):
        line_width, line_text_height = text_size(draw, line, font_zh)
        prefix_space = prefix_width + gap if index == 0 else 0
        if prefix_space + line_width > x2 - x1 - 24:
            raise ValueError(f"Card text does not fit at required 120% size: {prefix} {line}")
        x = x1 + 18
        if index == 0:
            draw.text((x, round(y)), prefix, font=font_en, fill=TEAL)
            prefix_record = make_record(
                    text=prefix,
                    category="card",
                    target=(x, round(y), x + prefix_width, round(y + prefix_height)),
                    font=font_en,
                    font_name="Comic Relief Regular",
                )
            prefix_record["rendered_bbox"] = list(
                draw.textbbox((x, round(y)), prefix, font=font_en)
            )
            records.append(prefix_record)
            x += prefix_space
        else:
            x += prefix_width + gap
        draw.text((x, round(y)), line, font=font_zh, fill=INK)
        line_record = make_record(
                text=line,
                category="card",
                target=(x, round(y), x2, round(y + line_text_height)),
                font=font_zh,
                font_name="Microsoft JhengHei",
            )
        line_record["rendered_bbox"] = list(
            draw.textbbox((x, round(y)), line, font=font_zh)
        )
        records.append(line_record)
        y += line_height
    return records


def make_contact_sheet(
    before: Path,
    after: Path,
    output: Path,
    *,
    grayscale: bool,
    before_label: str,
    after_label: str,
) -> None:
    canvas = Image.new("RGB", (2140, 1580), "#F4F0E8")
    draw = ImageDraw.Draw(canvas)
    label_font = zh_font(42, bold=True)
    pairs = ((before, before_label), (after, after_label))
    for index, (path, label) in enumerate(pairs):
        with Image.open(path) as source:
            page = source.convert("RGB")
            if grayscale:
                page = ImageOps.grayscale(page).convert("RGB")
            page.thumbnail((980, 1400), Image.Resampling.LANCZOS)
        x = 55 + index * 1045 + (980 - page.width) // 2
        y = 125 + (1400 - page.height) // 2
        canvas.paste(page, (x, y))
        label_width, _ = text_size(draw, label, label_font)
        draw.text((x + (page.width - label_width) / 2, 35), label, font=label_font, fill=TEAL)
        draw.rectangle((x - 2, y - 2, x + page.width + 2, y + page.height + 2), outline="#B9B3A8", width=3)
    canvas.save(output, format="PNG", optimize=True)


def make_a4_print_preview(source: Path, output: Path) -> None:
    """建立帶 5 mm 安全線的 A4 縮放預覽，供版面 QA，不作為學生教材。"""
    canvas = Image.new("RGB", (1360, 1940), "#D8D8D8")
    draw = ImageDraw.Draw(canvas)
    label_font = zh_font(34, bold=True)
    note_font = zh_font(24)
    draw.text((60, 22), "A4 直式列印預覽（300 dpi）", font=label_font, fill=INK)
    draw.text((60, 61), "紅色虛線為 5 mm 安全區；只供 QA，不會印在學生版。", font=note_font, fill=GRAY)
    with Image.open(source) as image:
        page = image.convert("RGB")
        page.thumbnail((1240, 1754), Image.Resampling.LANCZOS)
    page_x = (canvas.width - page.width) // 2
    page_y = 126
    canvas.paste(page, (page_x, page_y))
    draw.rectangle(
        (page_x - 2, page_y - 2, page_x + page.width + 2, page_y + page.height + 2),
        outline="#777777",
        width=3,
    )
    safe_x = round(page.width * 5 / 210)
    safe_y = round(page.height * 5 / 297)
    safe_box = (
        page_x + safe_x,
        page_y + safe_y,
        page_x + page.width - safe_x,
        page_y + page.height - safe_y,
    )
    dash = 12
    for x in range(safe_box[0], safe_box[2], dash * 2):
        draw.line((x, safe_box[1], min(x + dash, safe_box[2]), safe_box[1]), fill="#C62828", width=2)
        draw.line((x, safe_box[3], min(x + dash, safe_box[2]), safe_box[3]), fill="#C62828", width=2)
    for y in range(safe_box[1], safe_box[3], dash * 2):
        draw.line((safe_box[0], y, safe_box[0], min(y + dash, safe_box[3])), fill="#C62828", width=2)
        draw.line((safe_box[2], y, safe_box[2], min(y + dash, safe_box[3])), fill="#C62828", width=2)
    canvas.save(output, format="PNG", optimize=True, dpi=(150, 150))


def make_detail_comparison(before: Path, after: Path, output: Path) -> None:
    """放大第 3、4 大題交界，讓票券卡、標題帶與英文問句可直接人工讀圖。"""
    crop_box = (0, 2580, PAGE_SIZE[0], 3090)
    panel_width = 1900
    panel_height = round((crop_box[3] - crop_box[1]) * panel_width / PAGE_SIZE[0])
    label_height = 76
    gap = 28
    canvas = Image.new(
        "RGB",
        (panel_width + 80, label_height * 2 + panel_height * 2 + gap + 80),
        "#F4F0E8",
    )
    draw = ImageDraw.Draw(canvas)
    label_font = zh_font(40, bold=True)
    for index, (path, label) in enumerate(
        ((before, "跨大題修正前"), (after, "跨大題修正後候選"))
    ):
        with Image.open(path) as source:
            detail = source.convert("RGB").crop(crop_box)
            detail = detail.resize((panel_width, panel_height), Image.Resampling.LANCZOS)
        y = 40 + index * (label_height + panel_height + gap)
        draw.text((40, y), label, font=label_font, fill=TEAL)
        image_y = y + label_height
        canvas.paste(detail, (40, image_y))
        draw.rectangle(
            (38, image_y - 2, 42 + panel_width, image_y + panel_height + 2),
            outline="#B9B3A8",
            width=3,
        )
    canvas.save(output, format="PNG", optimize=True)


def union_bbox(boxes: list[tuple[float, float, float, float]]) -> list[float]:
    if not boxes:
        raise ValueError("Cannot build an envelope from an empty box list.")
    return [
        round(min(box[0] for box in boxes), 2),
        round(min(box[1] for box in boxes), 2),
        round(max(box[2] for box in boxes), 2),
        round(max(box[3] for box in boxes), 2),
    ]


def boundary_record(
    *,
    from_section: str,
    to_section: str,
    upper_content_bbox: list[float],
    next_title_ribbon_bbox: tuple[int, int, int, int],
) -> dict:
    gap_px = round(next_title_ribbon_bbox[1] - upper_content_bbox[3], 2)
    overlap_px = round(max(0.0, -gap_px), 2)
    return {
        "from_section": from_section,
        "to_section": to_section,
        "upper_content_envelope": upper_content_bbox,
        "next_title_ribbon_envelope": list(next_title_ribbon_bbox),
        "gap_px": gap_px,
        "overlap_px": overlap_px,
        "passes_preferred_20_px": gap_px >= PREFERRED_SECTION_GAP_PX,
        "passes_confirmed_minimum_10_px": gap_px >= MINIMUM_FALLBACK_SECTION_GAP_PX,
    }


def main() -> None:
    required = [
        MASTER,
        IMAGEGEN_SOURCE,
        BEFORE,
        FINAL_TARGET,
        TEACHER_OUTPUT,
        ZH_REGULAR,
        ZH_BOLD,
        COMIC_RELIEF,
    ]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing required files: " + ", ".join(missing))

    expected_teacher_hash = "15A2B676875983FF227543BA25198D4F7BC6931419E9DF45B6EB720D6727C21B"
    teacher_hash_before = sha256(TEACHER_OUTPUT)
    if teacher_hash_before != expected_teacher_hash:
        raise AssertionError(f"Teacher baseline changed unexpectedly: {teacher_hash_before}")

    comic_name = en_font(TARGET_FONT_PX["english"]).getname()
    if comic_name != ("Comic Relief", "Regular"):
        raise AssertionError(f"Unexpected Comic Relief font identity: {comic_name}")

    page, scale, offset_x, offset_y = build_canvas(MASTER)
    draw = ImageDraw.Draw(page)
    b = lambda left, top, right, bottom: master_box(
        scale, offset_x, offset_y, left, top, right, bottom
    )
    records: list[dict] = []

    records.append(
        draw_exact_center(
            draw,
            b(220, 45, 760, 185),
            "個人《扇形車庫解密單》",
            "title",
            bold=True,
            fill=TEAL,
        )
    )

    for target, label in (
        (b(270, 211, 430, 267), "班級："),
        (b(540, 211, 685, 267), "座號："),
        (b(752, 211, 895, 267), "姓名："),
    ):
        records.append(draw_single(draw, target, label, "name", fill=GRAY))

    section_ribbon_boxes = {
        "1": b(104, 282, 870, 326),
        "2": b(70, 626, 875, 669),
        "3": b(70, 892, 875, 935),
        "4": SECTION4_TITLE_RIBBON_PAGE,
    }
    section_ribbons = (
        (section_ribbon_boxes["1"], "#FFF3C4", "#D99C27"),
        (section_ribbon_boxes["2"], "#DDF2FF", "#398FC0"),
        (section_ribbon_boxes["3"], "#E2F4E5", "#67A875"),
        (section_ribbon_boxes["4"], "#EFE4F6", "#8F70A8"),
    )
    for ribbon, fill, outline in section_ribbons:
        draw.rounded_rectangle(ribbon, radius=30, fill=fill, outline=outline, width=4)

    section_titles = (
        ("1｜由來小偵探：從資料句條找出時間線", b(118, 282, 860, 326)),
        ("2｜構件找功能：把每個構件連到正確功能", b(70, 625, 875, 670)),
        ("3｜四色位置解密：依圖例在圖中標出位置", b(70, 891, 875, 936)),
    )
    for text, target in section_titles:
        records.append(draw_single(draw, target, text, "section", bold=True, fill=TEAL))
    records.append(
        draw_exact_center(
            draw,
            SECTION4_TITLE_TEXT_PAGE,
            "4｜英語定位解密：回答轉車台在哪裡",
            "section",
            bold=True,
            fill=TEAL,
        )
    )

    section1_content_records = [
        draw_single(draw, b(96, 330, 855, 398), "彰化扇形車庫在 ______ 年啟用，初期有 ______ 股道；", "origin", fill=INK),
        draw_single(draw, b(96, 421, 855, 486), "後來分期增建，到 ______ 年形成 ______ 股道。", "origin", fill=INK),
        draw_single(draw, b(250, 520, 910, 590), "小提示：先找「何時」的兩張中文資料句條。", "hint", fill=GRAY),
    ]
    records.extend(section1_content_records)

    left_cards = (
        ("A", ["中央轉車台"]),
        ("B", ["放射狀軌道"]),
        ("C", ["扇形車庫庫位"]),
    )
    right_cards = (
        ("1", ["供火車頭檢修、", "保養與停放"]),
        ("2", ["讓火車頭轉向並", "對準軌道"]),
        ("3", ["讓火車頭進出", "不同庫位"]),
    )
    rows = ((74, 672, 267, 741), (74, 749, 267, 817), (74, 824, 267, 891))
    right_rows = ((728, 672, 920, 741), (728, 749, 920, 817), (728, 824, 920, 891))
    section2_content_records: list[dict] = []
    for (prefix, lines), coords in zip(left_cards, rows):
        section2_content_records.extend(draw_matching_card(draw, b(*coords), prefix, lines))
    for (prefix, lines), coords in zip(right_cards, right_rows):
        section2_content_records.extend(draw_matching_card(draw, b(*coords), prefix, lines))
    records.extend(section2_content_records)

    legend = (
        ("紅色圓形", "紅色圓形｜中央轉車台"),
        ("藍色線條", "藍色線條｜放射狀軌道"),
        ("綠色方格", "綠色方格｜車庫庫位"),
        ("黃色火車", "黃色火車｜火車頭"),
    )
    legend_label_left = b(674, 0, 922, 1)[0]
    legend_label_right = b(674, 0, 922, 1)[2]
    legend_row_height = 116
    legend_alignment: list[dict] = []
    for icon_name, text in legend:
        icon_bbox_page = source_bbox_to_page(LEGEND_ICON_BBOX_SOURCE[icon_name])
        icon_center_x = (icon_bbox_page[0] + icon_bbox_page[2]) / 2
        icon_center_y = (icon_bbox_page[1] + icon_bbox_page[3]) / 2
        record = draw_left_at_center_y(
            draw,
            left_x=legend_label_left,
            right_x=legend_label_right,
            center_y=icon_center_y,
            row_height=legend_row_height,
            text=text,
            category="legend",
            bold=True,
            fill=INK,
        )
        record["icon_name"] = icon_name
        record["icon_bbox_page"] = [round(value, 2) for value in icon_bbox_page]
        record["icon_center_page"] = [round(icon_center_x, 2), round(icon_center_y, 2)]
        records.append(record)
        legend_alignment.append(record)

    records.append(draw_single(draw, SECTION4_QUESTION_PAGE, "Where's the turntable?", "english", english=True, fill=TEAL))
    records.append(draw_single(draw, b(88, 1331, 535, 1391), "It's in the __________.", "english", english=True, fill=INK))
    records.extend(draw_multiline(draw, b(590, 1260, 888, 1395), ["小提示：", "想想「中央」的英文。"], "hint", fill=GRAY, align="center", line_height_ratio=1.22))
    records.append(draw_single(draw, b(120, 1427, 905, 1461), "完成後請先自己檢查，再和組員核對；不要先看教師答案版。", "footer", fill=GRAY, align="center"))

    face_text = "\n".join(item["text"] for item in records)
    visible_status_hits = [term for term in PROHIBITED_FACE_TERMS if term in face_text]
    if visible_status_hits:
        raise AssertionError(f"Printable face contains review-status terms: {visible_status_hits}")

    legend_left_positions = {item["rendered_left_x"] for item in legend_alignment}
    legend_row_heights = {item["box"][3] - item["box"][1] for item in legend_alignment}
    maximum_legend_vertical_delta = max(
        item["vertical_center_delta_px"] for item in legend_alignment
    )
    if len(legend_left_positions) != 1:
        raise AssertionError(f"Legend label left edges differ: {legend_left_positions}")
    if len(legend_row_heights) != 1:
        raise AssertionError(f"Legend row heights differ: {legend_row_heights}")
    if maximum_legend_vertical_delta > 3:
        raise AssertionError(
            f"Legend icon/text vertical center delta exceeds 3 px: {maximum_legend_vertical_delta}"
        )

    paperclip_bbox_source = (21, 340, 58, 440)
    paperclip_bbox_page = source_bbox_to_page(paperclip_bbox_source)
    nearest_first_zone_content_left = b(96, 0, 97, 1)[0]
    paperclip_clearance_px = round(
        nearest_first_zone_content_left - paperclip_bbox_page[2], 2
    )
    if paperclip_clearance_px < TARGET_FONT_PX["origin"]:
        raise AssertionError(
            f"Paperclip clearance is below one body-text height: {paperclip_clearance_px}"
        )

    minimum_ratio = min(item["scale_ratio"] for item in records)
    if minimum_ratio < 1.2:
        raise AssertionError(f"Text scale requirement failed: {minimum_ratio}")

    section1_content_envelope = union_bbox(
        [tuple(item["rendered_bbox"]) for item in section1_content_records]
    )
    section2_content_envelope = union_bbox(
        [tuple(item["rendered_bbox"]) for item in section2_content_records]
    )
    section3_visual_bbox_page = source_bbox_to_page(SECTION3_LAST_VISUAL_BBOX_SOURCE)
    section3_content_envelope = union_bbox(
        [section3_visual_bbox_page]
        + [tuple(item["rendered_bbox"]) for item in legend_alignment]
    )
    boundary_checks = [
        boundary_record(
            from_section="1",
            to_section="2",
            upper_content_bbox=section1_content_envelope,
            next_title_ribbon_bbox=section_ribbon_boxes["2"],
        ),
        boundary_record(
            from_section="2",
            to_section="3",
            upper_content_bbox=section2_content_envelope,
            next_title_ribbon_bbox=section_ribbon_boxes["3"],
        ),
        boundary_record(
            from_section="3",
            to_section="4",
            upper_content_bbox=section3_content_envelope,
            next_title_ribbon_bbox=section_ribbon_boxes["4"],
        ),
    ]
    if any(item["overlap_px"] > 0 for item in boundary_checks):
        raise AssertionError(f"Cross-section overlap detected: {boundary_checks}")
    if not all(item["passes_preferred_20_px"] for item in boundary_checks[:2]):
        raise AssertionError(
            f"Existing section 1→2 or 2→3 gap dropped below 20 px: {boundary_checks[:2]}"
        )
    section3_to_4 = boundary_checks[2]
    if not section3_to_4["passes_confirmed_minimum_10_px"]:
        raise AssertionError(
            f"Section 3→4 gap is below the confirmed 10 px fallback: {section3_to_4}"
        )
    fallback_used = not section3_to_4["passes_preferred_20_px"]
    section4_title_to_question_gap_px = round(
        SECTION4_QUESTION_PAGE[1] - SECTION4_TITLE_RIBBON_PAGE[3], 2
    )
    if section4_title_to_question_gap_px < PREFERRED_SECTION_GAP_PX:
        raise AssertionError(
            "Section 4 title ribbon and English question target are not separated by 20 px: "
            f"{section4_title_to_question_gap_px}"
        )

    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("title", "扇形車庫第2節個人解密單－跨大題防重疊候選")
    metadata.add_text("imagegen_master", MASTER.name)
    metadata.add_text("english_font", "Comic Relief Regular")
    metadata.add_text("minimum_text_scale_ratio", str(minimum_ratio))
    metadata.add_text("text_overlay", json.dumps([item["text"] for item in records], ensure_ascii=False))
    page.save(CANDIDATE, format="PNG", optimize=True, dpi=(300, 300), pnginfo=metadata)
    page.close()

    QA_DIR.mkdir(parents=True, exist_ok=True)
    color_contact = QA_DIR / "11_學生版_跨大題修正前後彩色對照.png"
    gray_contact = QA_DIR / "12_學生版_跨大題修正前後灰階對照.png"
    detail_contact = QA_DIR / "13_學生版_第3至4大題局部放大對照.png"
    print_preview = QA_DIR / "14_學生版_A4跨大題修正列印預覽.png"
    make_contact_sheet(
        BEFORE,
        CANDIDATE,
        color_contact,
        grayscale=False,
        before_label="版面修正前",
        after_label="版面修正後候選",
    )
    make_contact_sheet(
        BEFORE,
        CANDIDATE,
        gray_contact,
        grayscale=True,
        before_label="版面修正前（灰階）",
        after_label="版面修正後候選（灰階）",
    )
    make_detail_comparison(BEFORE, CANDIDATE, detail_contact)
    make_a4_print_preview(CANDIDATE, print_preview)

    teacher_hash_after = sha256(TEACHER_OUTPUT)
    if teacher_hash_after != teacher_hash_before:
        raise AssertionError("Teacher answer sample was modified by the student-only revision.")

    candidate_hash = sha256(CANDIDATE)
    final_target_hash = sha256(FINAL_TARGET)
    final_matches_candidate = final_target_hash == candidate_hash

    manifest = {
        "generated_on": "2026-08-26",
        "scope": "只修訂個人解密單學生版；教師答案版及其餘12頁未修改",
        "page_size": {"pixels": list(PAGE_SIZE), "dpi": 300, "paper": "A4 portrait"},
        "imagegen": {
            "revision_attempts": 2,
            "this_was_final_allowed_edit": True,
            "this_revision_called_imagegen": False,
            "this_revision_method": "沿用現行無字母版並以可重建程式覆排，不再呼叫 ImageGen",
            "edit_source": IMAGEGEN_SOURCE.name,
            "edit_source_sha256": sha256(IMAGEGEN_SOURCE),
            "selected_master": MASTER.name,
            "selected_master_sha256": sha256(MASTER),
            "master_pixels": list(MASTER_SIZE),
            "manual_no_readable_text": True,
            "manual_content_count": {"turntable": 1, "radial_tracks": 12, "bays": 12, "locomotive": 1},
            "manual_upper_right_empty_plaque_removed": True,
            "manual_red_paperclip_moved_to_left_yellow_boundary": True,
        },
        "style_reference_policy": {
            "references_used_for_general_design_only": True,
            "copied_reference_text_or_content": False,
            "applied_devices": [
                "波浪色帶",
                "分層紙張與票券卡",
                "雲朵與小旗幟",
                "條紋與圓點底紋",
                "迴紋針、圖釘與鐵道角落裝飾",
            ],
            "writing_and_operation_space_target": "約60%",
        },
        "font_scaling": {
            "policy": "各文字類別以修改前實際渲染像素為基準，向上取整至至少120%；空間不足時改行，不縮字",
            "baseline_font_px": BASELINE_FONT_PX,
            "target_font_px": TARGET_FONT_PX,
            "minimum_actual_ratio": minimum_ratio,
            "all_records_pass_120_percent": True,
            "removed_instead_of_resized": ["副標題", "學生樣稿可見字樣"],
        },
        "font": {
            "english_family_style": list(comic_name),
            "english_font_path": str(COMIC_RELIEF),
            "english_font_sha256": sha256(COMIC_RELIEF),
        },
        "before": {"path": str(BEFORE), "sha256": sha256(BEFORE)},
        "layout_corrections": {
            "main_title_recentered_in_cloud": True,
            "subtitle_removed_without_replacement": True,
            "visible_review_status_removed": True,
            "visible_status_term_hits": visible_status_hits,
            "upper_right_empty_plaque_removed": True,
            "paperclip_bbox_source": list(paperclip_bbox_source),
            "paperclip_bbox_page": [round(value, 2) for value in paperclip_bbox_page],
            "paperclip_clearance_px": paperclip_clearance_px,
            "required_paperclip_clearance_px": TARGET_FONT_PX["origin"],
            "legend_fixed_label_left_x": next(iter(legend_left_positions)),
            "legend_equal_text_row_height_px": next(iter(legend_row_heights)),
            "legend_maximum_icon_text_vertical_center_delta_px": maximum_legend_vertical_delta,
            "legend_alignment_records": legend_alignment,
            "cross_section_collision_qa": {
                "policy": "所有相鄰大題的前題內容包絡框與下一題標題帶不得重疊；優先20 px，僅在不縮字、不刪內容、不移動第3大題仍不可行時採已確認的10 px下限",
                "preferred_gap_px": PREFERRED_SECTION_GAP_PX,
                "confirmed_fallback_gap_px": MINIMUM_FALLBACK_SECTION_GAP_PX,
                "section3_last_visual_bbox_source": list(SECTION3_LAST_VISUAL_BBOX_SOURCE),
                "section3_last_visual_bbox_page": [round(value, 2) for value in section3_visual_bbox_page],
                "boundaries": boundary_checks,
                "all_overlap_zero": all(item["overlap_px"] == 0 for item in boundary_checks),
                "fallback_used": fallback_used,
                "section4_title_to_question_target_gap_px": section4_title_to_question_gap_px,
            },
        },
        "candidate": {
            "path": str(CANDIDATE),
            "sha256": candidate_hash,
            "text_records": records,
        },
        "final_target": {
            "path": str(FINAL_TARGET),
            "sha256": final_target_hash,
            "matches_candidate": final_matches_candidate,
            "review_status": (
                "指定學生樣稿已更新；仍為樣稿，尚未另存正式版"
                if final_matches_candidate
                else "候選版待人工視覺 QA，尚未覆寫指定學生樣稿"
            ),
        },
        "teacher_unchanged": {
            "path": str(TEACHER_OUTPUT),
            "sha256_before": teacher_hash_before,
            "sha256_after": teacher_hash_after,
        },
        "qa_outputs": [
            {"path": str(color_contact), "sha256": sha256(color_contact)},
            {"path": str(gray_contact), "sha256": sha256(gray_contact)},
            {"path": str(detail_contact), "sha256": sha256(detail_contact)},
            {"path": str(print_preview), "sha256": sha256(print_preview)},
        ],
        "manual_gate": (
            "候選版已完成人工視覺讀圖並覆寫指定的04學生樣稿；仍不建立正式版，教師答案版仍停在原樣稿確認關卡。"
            if final_matches_candidate
            else "候選版已產生；必須先完成局部、彩色、灰階與A4人工視覺QA，通過後才能覆寫指定的04學生樣稿。"
        ),
    }
    manifest_path = QA_DIR / "15_學生版跨大題防重疊_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
