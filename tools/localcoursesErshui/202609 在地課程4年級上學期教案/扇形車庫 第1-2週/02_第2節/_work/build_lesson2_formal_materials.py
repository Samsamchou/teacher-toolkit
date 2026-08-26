from __future__ import annotations

import hashlib
import json
import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4, A5, A6, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


DPI = 300
A4_P = (2480, 3508)
A4_L = (3508, 2480)
A5_P = (1748, 2480)
A6_P = (1240, 1748)

UNIT_DIR = Path(__file__).resolve().parents[1]
FINAL_DIR = UNIT_DIR / "16_扇形車庫_第2節正式教材圖檔_20260826"
ASSET_DIR = FINAL_DIR / "_assets"
QA_DIR = UNIT_DIR / "_qa" / "lesson2_formal_materials"
STUDENT_PDF = UNIT_DIR / "14_扇形車庫_第2節正式教材_學生版_20260826.pdf"
TEACHER_PDF = UNIT_DIR / "15_扇形車庫_第2節正式教材_教師答案版_20260826.pdf"

AI_SOURCE = Path(
    r"C:\Users\User\.codex\generated_images\01a03b72-a928-76b3-a3d9-d6f8c732fc2c"
    r"\exec-d1b2ec09-c480-4b51-be75-5a9053995ec0.png"
)
AI_MASTER = FINAL_DIR / "08_火車小偵探_風格3_六姿勢母版.png"

FONT_REG = Path(r"C:\Windows\Fonts\msjh.ttc")
FONT_BOLD = Path(r"C:\Windows\Fonts\msjhbd.ttc")
FONT_PDF = Path(r"C:\Windows\Fonts\kaiu.ttf")
PDFTOPPM = Path(
    r"C:\Users\User\.cache\codex-runtimes\codex-primary-runtime"
    r"\dependencies\native\poppler\Library\bin\pdftoppm.exe"
)

INK = "#24383D"
TEAL = "#155F61"
TEAL_DARK = "#0C484B"
CREAM = "#FFF8EC"
GOLD = "#F1B84B"
GOLD_LIGHT = "#FFF0C6"
PURPLE = "#74528E"
PURPLE_LIGHT = "#EEE6F4"
RED = "#C54D3F"
RED_LIGHT = "#FAE4DF"
BLUE = "#367DB0"
BLUE_LIGHT = "#E5F1F9"
GREEN = "#6A9B72"
GREEN_LIGHT = "#E6F1E7"
GRAY = "#66757A"
GRAY_LIGHT = "#E8ECEC"
WHITE = "#FFFFFF"
ANSWER = "#A6382E"


CHINESE_STRIPS = [
    ("T1", "何時", "clock", "1922年，彰化扇形車庫啟用，初期有6股道。"),
    ("T2", "何時", "clock", "後來分期增建，1933年形成12股道。"),
    ("M1", "構件", "link", "轉車台位在扇形軌道中央。"),
    ("M2", "構件", "link", "放射狀軌道從轉車台連到各個庫位。"),
    ("M3", "構件", "link", "扇形車庫有多個庫位，可容納火車頭。"),
    ("F1", "功能", "gear", "轉車台讓火車頭轉向並對準軌道。"),
    ("F2", "功能", "gear", "放射狀軌道讓火車頭進出不同庫位。"),
    ("F3", "功能", "gear", "車庫供火車頭檢修、保養與停放。"),
]

ENGLISH_CARDS = [
    ("clock", "What's this?", "指向一個構件問問題", "What's this?"),
    ("link", "It's a __________.", "說出構件名稱", "It's a turntable."),
    ("pin", "Where's the __________?", "問構件在哪裡", "Where's the turntable?"),
    ("mic", "It's in the __________.", "小提示：中央 = middle", "It's in the middle."),
]


def pil_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REG), size=size)


def text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> float:
    return draw.textlength(text, font=font)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        if paragraph == "":
            lines.append("")
            continue
        current = ""
        last_space = -1
        for ch in paragraph:
            trial = current + ch
            if text_width(draw, trial, font) <= max_width or not current:
                current = trial
                if ch.isspace():
                    last_space = len(current) - 1
                continue
            if last_space >= 0:
                lines.append(current[:last_space].rstrip())
                current = (current[last_space + 1 :] + ch).lstrip()
            else:
                lines.append(current.rstrip())
                current = ch
            last_space = current.rfind(" ")
        if current or not lines:
            lines.append(current.rstrip())
    return lines


def fit_text(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    max_size: int,
    min_size: int = 20,
    bold: bool = False,
    fill: str = INK,
    align: str = "left",
    valign: str = "center",
    spacing_ratio: float = 0.30,
) -> int:
    x1, y1, x2, y2 = box
    max_width = x2 - x1
    max_height = y2 - y1
    for size in range(max_size, min_size - 1, -2):
        font = pil_font(size, bold)
        lines = wrap_text(draw, text, font, max_width)
        spacing = int(size * spacing_ratio)
        line_heights = []
        for line in lines:
            bbox = draw.textbbox((0, 0), line or "　", font=font)
            line_heights.append(bbox[3] - bbox[1])
        total_h = sum(line_heights) + spacing * max(0, len(lines) - 1)
        if total_h <= max_height:
            y = y1 if valign == "top" else y1 + (max_height - total_h) / 2
            for line, line_h in zip(lines, line_heights):
                if align == "center":
                    x = x1 + (max_width - text_width(draw, line, font)) / 2
                elif align == "right":
                    x = x2 - text_width(draw, line, font)
                else:
                    x = x1
                draw.text((int(x), int(y)), line, font=font, fill=fill)
                y += line_h + spacing
            return size
    raise ValueError(f"Text does not fit: {text[:80]}")


def rounded_panel(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fill: str = WHITE,
    outline: str = GRAY_LIGHT,
    radius: int = 34,
    width: int = 4,
    shadow: bool = True,
) -> None:
    x1, y1, x2, y2 = box
    if shadow:
        draw.rounded_rectangle((x1 + 10, y1 + 12, x2 + 10, y2 + 12), radius=radius, fill="#E7DDD0")
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def dashed_line(
    draw: ImageDraw.ImageDraw,
    start: tuple[int, int],
    end: tuple[int, int],
    fill: str = GRAY,
    width: int = 4,
    dash: int = 18,
    gap: int = 12,
) -> None:
    x1, y1 = start
    x2, y2 = end
    length = math.hypot(x2 - x1, y2 - y1)
    if length == 0:
        return
    ux = (x2 - x1) / length
    uy = (y2 - y1) / length
    pos = 0.0
    while pos < length:
        seg_end = min(pos + dash, length)
        draw.line(
            (x1 + ux * pos, y1 + uy * pos, x1 + ux * seg_end, y1 + uy * seg_end),
            fill=fill,
            width=width,
        )
        pos += dash + gap


def draw_icon(
    draw: ImageDraw.ImageDraw,
    kind: str,
    center: tuple[int, int],
    size: int,
    color: str = TEAL,
    secondary: str = GOLD,
) -> None:
    cx, cy = center
    s = size
    lw = max(4, s // 16)
    if kind == "clock":
        draw.ellipse((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2), fill=GOLD_LIGHT, outline=color, width=lw)
        draw.line((cx, cy, cx, cy - s * 0.27), fill=color, width=lw)
        draw.line((cx, cy, cx + s * 0.22, cy + s * 0.12), fill=color, width=lw)
        draw.ellipse((cx - lw, cy - lw, cx + lw, cy + lw), fill=color)
    elif kind == "link":
        draw.rounded_rectangle((cx - s * 0.48, cy - s * 0.16, cx - s * 0.02, cy + s * 0.16), radius=s // 7, outline=color, width=lw)
        draw.rounded_rectangle((cx + s * 0.02, cy - s * 0.16, cx + s * 0.48, cy + s * 0.16), radius=s // 7, outline=secondary, width=lw)
        draw.line((cx - s * 0.12, cy, cx + s * 0.12, cy), fill=INK, width=lw)
    elif kind == "palette":
        draw.ellipse((cx - s * 0.52, cy - s * 0.36, cx + s * 0.52, cy + s * 0.36), fill=GOLD_LIGHT, outline=color, width=lw)
        dots = [(-0.22, -0.10, RED), (0.05, -0.17, GREEN), (0.25, 0.08, BLUE), (-0.05, 0.17, GOLD)]
        for dx, dy, fill in dots:
            r = s * 0.09
            draw.ellipse((cx + dx * s - r, cy + dy * s - r, cx + dx * s + r, cy + dy * s + r), fill=fill, outline=INK, width=max(2, lw // 2))
    elif kind == "pin":
        r = s * 0.30
        draw.ellipse((cx - r, cy - s * 0.42, cx + r, cy + s * 0.18), fill=RED_LIGHT, outline=color, width=lw)
        draw.polygon([(cx - r * 0.72, cy + s * 0.05), (cx + r * 0.72, cy + s * 0.05), (cx, cy + s * 0.48)], fill=RED_LIGHT, outline=color)
        draw.ellipse((cx - r * 0.34, cy - s * 0.26, cx + r * 0.34, cy - s * 0.02), fill=WHITE, outline=color, width=max(2, lw // 2))
    elif kind == "gear":
        points = []
        for i in range(24):
            angle = math.pi * 2 * i / 24 - math.pi / 2
            radius = s * (0.50 if i % 2 == 0 else 0.39)
            points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
        draw.polygon(points, fill=GOLD_LIGHT, outline=color)
        draw.ellipse((cx - s * 0.18, cy - s * 0.18, cx + s * 0.18, cy + s * 0.18), fill=WHITE, outline=color, width=lw)
    elif kind == "mic":
        draw.ellipse((cx - s * 0.18, cy - s * 0.45, cx + s * 0.18, cy - s * 0.05), fill=GRAY_LIGHT, outline=color, width=lw)
        draw.line((cx, cy - s * 0.05, cx - s * 0.18, cy + s * 0.36), fill=color, width=lw * 2)
        draw.line((cx - s * 0.30, cy + s * 0.40, cx + s * 0.08, cy + s * 0.40), fill=color, width=lw)
    elif kind == "rails":
        for off in (-s * 0.18, s * 0.18):
            draw.line((cx - s * 0.45, cy + off, cx + s * 0.45, cy + off), fill=color, width=lw)
        for i in range(-3, 4):
            x = cx + i * s * 0.14
            draw.line((x, cy - s * 0.28, x, cy + s * 0.28), fill=secondary, width=max(3, lw // 2))
    elif kind == "garage":
        draw.polygon([(cx - s * 0.46, cy - s * 0.12), (cx, cy - s * 0.48), (cx + s * 0.46, cy - s * 0.12)], fill=GREEN_LIGHT, outline=color)
        draw.rectangle((cx - s * 0.42, cy - s * 0.12, cx + s * 0.42, cy + s * 0.42), fill=GREEN_LIGHT, outline=color, width=lw)
        for dx in (-0.24, 0, 0.24):
            draw.rectangle((cx + dx * s - s * 0.09, cy + s * 0.05, cx + dx * s + s * 0.09, cy + s * 0.42), fill=WHITE, outline=color, width=max(2, lw // 2))
    elif kind == "turntable":
        draw.ellipse((cx - s * 0.45, cy - s * 0.45, cx + s * 0.45, cy + s * 0.45), fill=RED_LIGHT, outline=color, width=lw)
        draw.line((cx - s * 0.34, cy, cx + s * 0.34, cy), fill=color, width=lw * 2)
        draw.arc((cx - s * 0.29, cy - s * 0.29, cx + s * 0.29, cy + s * 0.29), 205, 500, fill=secondary, width=lw)
        draw.polygon([(cx + s * 0.28, cy - s * 0.10), (cx + s * 0.47, cy - s * 0.05), (cx + s * 0.34, cy + s * 0.10)], fill=secondary)
    elif kind == "train":
        draw.rounded_rectangle((cx - s * 0.42, cy - s * 0.24, cx + s * 0.42, cy + s * 0.24), radius=s // 9, fill=GOLD_LIGHT, outline=color, width=lw)
        draw.rectangle((cx - s * 0.13, cy - s * 0.43, cx + s * 0.10, cy - s * 0.24), fill=color, outline=INK, width=max(2, lw // 2))
        draw.ellipse((cx - s * 0.34, cy + s * 0.12, cx - s * 0.08, cy + s * 0.38), fill=PURPLE, outline=INK, width=max(2, lw // 2))
        draw.ellipse((cx + s * 0.08, cy + s * 0.12, cx + s * 0.34, cy + s * 0.38), fill=PURPLE, outline=INK, width=max(2, lw // 2))
        draw.ellipse((cx + s * 0.20, cy - s * 0.12, cx + s * 0.34, cy + s * 0.02), fill=secondary, outline=INK, width=max(2, lw // 2))
    else:
        draw.ellipse((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2), fill=GOLD_LIGHT, outline=color, width=lw)


def crop_mascots() -> dict[str, Image.Image]:
    if not AI_SOURCE.exists():
        raise FileNotFoundError(f"AI source not found: {AI_SOURCE}")
    FINAL_DIR.mkdir(parents=True, exist_ok=True)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    QA_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(AI_SOURCE, AI_MASTER)
    sheet = Image.open(AI_SOURCE).convert("RGB")
    width, height = sheet.size
    keys = ["clock", "link", "palette", "pin", "gear", "mic"]
    sprites: dict[str, Image.Image] = {}
    for index, key in enumerate(keys):
        col = index % 3
        row = index // 3
        left = round(col * width / 3)
        top = round(row * height / 2)
        right = round((col + 1) * width / 3)
        bottom = round((row + 1) * height / 2)
        crop = sheet.crop((left, top, right, bottom)).convert("RGBA")
        # Remove only the near-white background connected to the outer corners.
        # Enclosed whites such as eyes and the magnifying-glass lens stay intact.
        for corner in ((0, 0), (crop.width - 1, 0), (0, crop.height - 1), (crop.width - 1, crop.height - 1)):
            ImageDraw.floodfill(crop, corner, (255, 255, 255, 0), thresh=24)
        content_box = crop.getbbox()
        if content_box:
            crop = crop.crop(content_box)
        crop_path = ASSET_DIR / f"火車小偵探_{index + 1:02d}_{key}.png"
        crop.save(crop_path, quality=95)
        sprites[key] = crop
    return sprites


def paste_sprite(page: Image.Image, sprite: Image.Image, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    target = ImageOps.contain(sprite, (x2 - x1, y2 - y1), method=Image.Resampling.LANCZOS)
    tx = x1 + (x2 - x1 - target.width) // 2
    ty = y1 + (y2 - y1 - target.height) // 2
    mask = target.getchannel("A") if target.mode == "RGBA" else Image.new("L", target.size, 255)
    page.paste(target, (tx, ty), mask)


def new_page(size: tuple[int, int]) -> Image.Image:
    return Image.new("RGB", size, CREAM)


def draw_version_badge(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], teacher: bool) -> None:
    fill = RED_LIGHT if teacher else BLUE_LIGHT
    outline = RED if teacher else BLUE
    label = "教師答案版" if teacher else "學生版"
    draw.rounded_rectangle(box, radius=24, fill=fill, outline=outline, width=4)
    fit_text(draw, (box[0] + 14, box[1] + 6, box[2] - 14, box[3] - 6), label, 34, 24, bold=True, fill=outline, align="center")


def draw_header(
    page: Image.Image,
    draw: ImageDraw.ImageDraw,
    title: str,
    subtitle: str,
    teacher: bool,
    page_no: int,
    mascot: Image.Image,
    compact: bool = False,
) -> int:
    width, _ = page.size
    header_h = 270 if compact else 350
    draw.rectangle((0, 0, width, 34), fill=TEAL)
    rounded_panel(draw, (70, 64, width - 70, header_h), fill=WHITE, outline="#DED5C8", radius=34, width=4)
    mascot_w = 220 if compact else 280
    paste_sprite(page, mascot, (width - mascot_w - 105, 128, width - 95, header_h - 12))
    title_right = width - mascot_w - 150
    fit_text(draw, (110, 88, title_right, 190 if compact else 220), title, 72 if compact else 84, 42, bold=True, fill=TEAL_DARK, valign="center")
    fit_text(draw, (112, 190 if compact else 220, title_right, header_h - 28), subtitle, 34 if compact else 40, 24, fill=GRAY, valign="center")
    fill = RED_LIGHT if teacher else BLUE_LIGHT
    outline = RED if teacher else BLUE
    version = "教師答案版" if teacher else "學生版"
    badge = (width - 500, 76, width - 105, 145)
    draw.rounded_rectangle(badge, radius=24, fill=fill, outline=outline, width=4)
    fit_text(draw, (badge[0] + 12, badge[1] + 7, badge[2] - 12, badge[3] - 7), f"{version}｜教材 {page_no}/7", 29, 22, bold=True, fill=outline, align="center")
    return header_h


def draw_footer(draw: ImageDraw.ImageDraw, width: int, height: int, text: str) -> None:
    draw.line((80, height - 78, width - 80, height - 78), fill="#D9D2C8", width=3)
    fit_text(draw, (90, height - 67, width - 90, height - 20), text, 24, 18, fill=GRAY, align="center")


def draw_roundhouse_diagram(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], teacher: bool) -> None:
    x1, y1, x2, y2 = box
    width = x2 - x1
    height = y2 - y1
    cx = x1 + width * 0.50
    cy = y1 + height * 0.82
    radius = height * 0.70
    track_color = BLUE if teacher else "#7A8588"
    bay_fill = GREEN_LIGHT if teacher else WHITE
    bay_outline = GREEN if teacher else "#7A8588"
    for index in range(12):
        angle = math.radians(205 + index * (130 / 11))
        ex = cx + radius * math.cos(angle)
        ey = cy + radius * math.sin(angle)
        draw.line((cx, cy, ex, ey), fill=track_color, width=7 if teacher else 5)
        bw, bh = width * 0.075, height * 0.12
        draw.rounded_rectangle((ex - bw / 2, ey - bh / 2, ex + bw / 2, ey + bh / 2), radius=10, fill=bay_fill, outline=bay_outline, width=4)
    turn_fill = RED_LIGHT if teacher else WHITE
    turn_outline = RED if teacher else "#59676B"
    tr = height * 0.115
    draw.ellipse((cx - tr, cy - tr, cx + tr, cy + tr), fill=turn_fill, outline=turn_outline, width=8)
    draw.line((cx - tr * 0.80, cy, cx + tr * 0.80, cy), fill=turn_outline, width=7)
    train_x = cx + radius * math.cos(math.radians(250)) * 0.52
    train_y = cy + radius * math.sin(math.radians(250)) * 0.52
    tw, th = width * 0.11, height * 0.075
    train_fill = GOLD if teacher else WHITE
    draw.rounded_rectangle((train_x - tw / 2, train_y - th / 2, train_x + tw / 2, train_y + th / 2), radius=12, fill=train_fill, outline=INK, width=4)
    draw.ellipse((train_x - tw * 0.34, train_y + th * 0.28, train_x - tw * 0.10, train_y + th * 0.62), fill=PURPLE if teacher else WHITE, outline=INK, width=3)
    draw.ellipse((train_x + tw * 0.10, train_y + th * 0.28, train_x + tw * 0.34, train_y + th * 0.62), fill=PURPLE if teacher else WHITE, outline=INK, width=3)


def build_personal_sheet(teacher: bool, sprites: dict[str, Image.Image]) -> tuple[Image.Image, str]:
    page = new_page(A4_P)
    draw = ImageDraw.Draw(page)
    draw_header(page, draw, "個人《扇形車庫解密單》", "第2節｜何時 - 構件 - 功能｜先獨立完成 8 分鐘", teacher, 1, sprites["clock"])
    fit_text(draw, (130, 370, 2350, 445), "班級：__________　座號：__________　姓名：____________________", 36, 28, fill=GRAY)

    sections = [
        (110, 485, 2370, 1000),
        (110, 1030, 2370, 1775),
        (110, 1805, 2370, 2825),
        (110, 2855, 2370, 3390),
    ]
    fills = [GOLD_LIGHT, BLUE_LIGHT, GREEN_LIGHT, PURPLE_LIGHT]
    outlines = [GOLD, BLUE, GREEN, PURPLE]
    for box, fill, outline in zip(sections, fills, outlines):
        rounded_panel(draw, box, fill=WHITE, outline=outline, radius=32, width=5)
        draw.rounded_rectangle((box[0], box[1], box[2], box[1] + 92), radius=30, fill=fill)

    # 1. origin timeline
    fit_text(draw, (150, 505, 2030, 570), "1｜由來小偵探：從資料句條找出時間線", 52, 38, bold=True, fill=TEAL_DARK)
    paste_sprite(page, sprites["clock"], (2050, 495, 2320, 735))
    origin_student = "彰化扇形車庫在 ______ 年啟用，初期有 ______ 股道；\n後來分期增建，到 ______ 年形成 ______ 股道。"
    origin_teacher = "彰化扇形車庫在 1922 年啟用，初期有 6 股道；\n後來分期增建，到 1933 年形成 12 股道。"
    fit_text(draw, (185, 630, 2030, 835), origin_teacher if teacher else origin_student, 47, 34, bold=teacher, fill=ANSWER if teacher else INK)
    draw.rounded_rectangle((175, 855, 2180, 955), radius=24, fill="#FFF9E8", outline=GOLD, width=3)
    fit_text(draw, (205, 872, 2150, 938), "小提示：先找「何時」的兩張中文資料句條。", 35, 28, fill=GRAY)

    # 2. matching
    fit_text(draw, (150, 1050, 2050, 1115), "2｜構件找功能：把每個構件連到正確功能", 52, 38, bold=True, fill=TEAL_DARK)
    paste_sprite(page, sprites["link"], (2070, 1040, 2320, 1270))
    left_items = ["A　中央轉車台", "B　放射狀軌道", "C　扇形車庫庫位"]
    right_items = ["1　供火車頭檢修、保養與停放", "2　讓火車頭轉向並對準軌道", "3　讓火車頭進出不同庫位"]
    left_boxes = []
    right_boxes = []
    for index in range(3):
        y = 1190 + index * 170
        left_box = (170, y, 980, y + 120)
        right_box = (1320, y, 2260, y + 120)
        left_boxes.append(left_box)
        right_boxes.append(right_box)
    if teacher:
        mappings = {0: 1, 1: 2, 2: 0}
        for left_index, right_index in mappings.items():
            lb = left_boxes[left_index]
            rb = right_boxes[right_index]
            draw.line((lb[2], (lb[1] + lb[3]) // 2, rb[0], (rb[1] + rb[3]) // 2), fill=ANSWER, width=9)
    else:
        for index, lb in enumerate(left_boxes):
            rb = right_boxes[index]
            dashed_line(draw, (lb[2] + 12, (lb[1] + lb[3]) // 2), (rb[0] - 12, (rb[1] + rb[3]) // 2), fill="#BAC3C6", width=4)
    for index, (lb, rb) in enumerate(zip(left_boxes, right_boxes)):
        draw.rounded_rectangle(lb, radius=24, fill=BLUE_LIGHT, outline=BLUE, width=4)
        draw.rounded_rectangle(rb, radius=24, fill=WHITE, outline=BLUE, width=4)
        fit_text(draw, (lb[0] + 25, lb[1] + 12, lb[2] - 25, lb[3] - 12), left_items[index], 38, 28, bold=True, fill=TEAL_DARK)
        fit_text(draw, (rb[0] + 25, rb[1] + 10, rb[2] - 25, rb[3] - 10), right_items[index], 34, 25, fill=INK)
    fit_text(draw, (170, 1695, 2260, 1748), "畫線後，請用手指沿著一組配對說出「構件 + 功能」。", 31, 24, fill=GRAY, align="center")

    # 3. color legend and diagram
    fit_text(draw, (150, 1825, 2050, 1890), "3｜四色位置解密：依圖例在圖中標出位置", 52, 38, bold=True, fill=TEAL_DARK)
    paste_sprite(page, sprites["palette"], (2070, 1815, 2320, 2045))
    draw_roundhouse_diagram(draw, (170, 1950, 1170, 2735), teacher)
    legend_rows = [
        (RED, "circle", "紅色圓形｜中央轉車台"),
        (BLUE, "line", "藍色線條｜放射狀軌道"),
        (GREEN, "square", "綠色方格｜車庫庫位"),
        (GOLD, "train", "黃色火車｜火車頭"),
    ]
    for index, (color, shape, label) in enumerate(legend_rows):
        y = 1990 + index * 175
        draw.rounded_rectangle((1250, y, 2220, y + 135), radius=24, fill=WHITE, outline=color, width=5)
        cx, cy = 1325, y + 67
        if shape == "circle":
            draw.ellipse((cx - 34, cy - 34, cx + 34, cy + 34), fill=color, outline=INK, width=3)
        elif shape == "line":
            draw.line((cx - 42, cy, cx + 42, cy), fill=color, width=14)
        elif shape == "square":
            draw.rectangle((cx - 34, cy - 34, cx + 34, cy + 34), fill=color, outline=INK, width=3)
        else:
            draw.rounded_rectangle((cx - 45, cy - 27, cx + 45, cy + 27), radius=12, fill=color, outline=INK, width=3)
        fit_text(draw, (1400, y + 15, 2185, y + 120), label, 37, 28, bold=True, fill=INK)
    instruction = "教師答案已完成四色標示。" if teacher else "請用紅、藍、綠、黃四色筆，圈、描、框、畫出四個位置。"
    fit_text(draw, (1260, 2700, 2210, 2790), instruction, 33, 25, fill=ANSWER if teacher else GRAY, align="center")

    # 4. English location
    fit_text(draw, (150, 2875, 2050, 2940), "4｜英語定位解密：回答轉車台在哪裡", 52, 38, bold=True, fill=TEAL_DARK)
    paste_sprite(page, sprites["pin"], (2070, 2865, 2320, 3095))
    fit_text(draw, (205, 3005, 1100, 3090), "Where's the turntable?", 48, 34, bold=True, fill=TEAL_DARK)
    answer_line = "It's in the middle." if teacher else "It's in the __________."
    fit_text(draw, (205, 3100, 1500, 3195), answer_line, 52, 36, bold=True, fill=ANSWER if teacher else INK)
    draw.rounded_rectangle((1550, 3055, 2210, 3255), radius=26, fill="#F5EFF8", outline=PURPLE, width=4)
    fit_text(draw, (1590, 3080, 2170, 3230), "小提示：\n想想「中央」的英文。", 34, 26, fill=GRAY, align="center")
    draw_footer(draw, page.width, page.height, "完成後請先自己檢查，再和組員核對；不要先看教師答案版。")
    hidden = "\n".join([
        "個人扇形車庫解密單",
        origin_student if not teacher else origin_teacher,
        *left_items,
        *right_items,
        "紅色圓形 中央轉車台 藍色線條 放射狀軌道 綠色方格 車庫庫位 黃色火車 火車頭",
        "Where's the turntable?",
        answer_line,
    ])
    return page, hidden


def build_legend_card(teacher: bool, sprites: dict[str, Image.Image]) -> tuple[Image.Image, str]:
    page = new_page(A5_P)
    draw = ImageDraw.Draw(page)
    draw_header(page, draw, "四色圖例卡", "看顏色，也看圖形和文字｜每組 1 張", teacher, 2, sprites["palette"], compact=True)
    rows = [
        (RED_LIGHT, RED, "turntable", "紅色圓形｜中央轉車台", "讓火車頭轉向並對準軌道"),
        (BLUE_LIGHT, BLUE, "rails", "藍色線條｜放射狀軌道", "從轉車台通往不同庫位"),
        (GREEN_LIGHT, GREEN, "garage", "綠色方格｜扇形車庫庫位", "供火車頭檢修、保養與停放"),
        (GOLD_LIGHT, GOLD, "train", "黃色火車｜火車頭", "依轉車台與軌道進出庫位"),
    ]
    top = 360
    row_h = 430
    for index, (fill, outline, icon, title, body) in enumerate(rows):
        y1 = top + index * (row_h + 28)
        y2 = y1 + row_h
        rounded_panel(draw, (85, y1, 1663, y2), fill=WHITE, outline=outline, radius=32, width=5)
        draw.rounded_rectangle((110, y1 + 35, 430, y2 - 35), radius=30, fill=fill, outline=outline, width=4)
        draw_icon(draw, icon, (270, (y1 + y2) // 2), 210, color=outline, secondary=GOLD)
        fit_text(draw, (490, y1 + 55, 1595, y1 + 190), title, 48, 34, bold=True, fill=TEAL_DARK)
        fit_text(draw, (490, y1 + 205, 1595, y2 - 55), body, 39, 29, fill=INK, valign="top")
    note_y = 2200
    draw.rounded_rectangle((110, note_y, 1638, 2380), radius=28, fill="#FFFDF7", outline=TEAL, width=4)
    note = "教師使用：先請學生說圖形名稱，再說構件或功能；不直接代答。" if teacher else "記憶口訣：紅圓、藍線、綠庫、黃車。黑白列印時也可看圖形與文字。"
    fit_text(draw, (155, note_y + 25, 1590, note_y + 155), note, 36, 27, bold=True, fill=ANSWER if teacher else TEAL_DARK, align="center")
    hidden = "\n".join(["四色圖例卡"] + [f"{title} {body}" for _, _, _, title, body in rows] + [note])
    return page, hidden


def build_exit_ticket(teacher: bool, sprites: dict[str, Image.Image]) -> tuple[Image.Image, str]:
    page = new_page(A6_P)
    draw = ImageDraw.Draw(page)
    draw_header(page, draw, "三格出口票", "下課前 5 分鐘｜每人 1 張", teacher, 3, sprites["mic"], compact=True)
    cards = [
        ("clock", GOLD_LIGHT, GOLD, "1｜由來小偵探", "扇形車庫何時啟用？當時有幾股道？", "提示：它在 1920 年代初啟用。", "1922 年啟用，初期有 6 股道。"),
        ("gear", GREEN_LIGHT, GREEN, "2｜功能小工程師", "轉車台有什麼功能？", "提示：中央轉車台可以……", "中央轉車台可以讓火車頭轉向並對準軌道。"),
        ("mic", PURPLE_LIGHT, PURPLE, "3｜英語小導覽員", "Where's the turntable?", "提示：It's in the ________.", "It's in the middle."),
    ]
    y = 350
    for icon, fill, outline, title, question, hint, answer in cards:
        box = (65, y, 1175, y + 410)
        rounded_panel(draw, box, fill=WHITE, outline=outline, radius=28, width=5)
        draw.rounded_rectangle((85, y + 25, 250, y + 190), radius=28, fill=fill, outline=outline, width=4)
        draw_icon(draw, icon, (168, y + 108), 110, color=outline)
        fit_text(draw, (285, y + 28, 1125, y + 105), title, 38, 28, bold=True, fill=TEAL_DARK)
        fit_text(draw, (285, y + 112, 1125, y + 205), question, 34, 26, bold=True, fill=INK, valign="top")
        draw.rounded_rectangle((110, y + 220, 1130, y + 370), radius=22, fill="#FFFDF8", outline="#D7D0C5", width=3)
        response = answer if teacher else hint + "\n________________________________________________"
        fit_text(draw, (140, y + 235, 1100, y + 355), response, 31, 23, bold=teacher, fill=ANSWER if teacher else GRAY, valign="center")
        y += 440
    fit_text(draw, (90, 1680, 1150, 1725), "班級：______　座號：______　姓名：________________", 25, 20, fill=GRAY, align="center")
    hidden = "\n".join(["三格出口票"] + [f"{title} {question} {answer if teacher else hint}" for _, _, _, title, question, hint, answer in cards])
    return page, hidden


def board_slot(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    outline: str,
    teacher: bool,
    code: str,
) -> None:
    if teacher:
        draw.rounded_rectangle(box, radius=22, fill=WHITE, outline=outline, width=5)
        draw.rounded_rectangle((box[0] + 18, box[1] + 18, box[0] + 120, box[1] + 72), radius=16, fill=outline)
        fit_text(draw, (box[0] + 28, box[1] + 22, box[0] + 110, box[1] + 68), code, 28, 21, bold=True, fill=WHITE, align="center")
        fit_text(draw, (box[0] + 145, box[1] + 24, box[2] - 24, box[3] - 24), text, 36, 25, bold=True, fill=INK)
    else:
        draw.rounded_rectangle(box, radius=22, fill="#FFFEFB", outline="#8D989B", width=4)
        dashed_line(draw, (box[0] + 35, (box[1] + box[3]) // 2), (box[2] - 35, (box[1] + box[3]) // 2), fill="#AEB7B9", width=4, dash=24, gap=18)
        category = {"T": "何時", "M": "構件", "F": "功能"}[code[0]]
        fit_text(draw, (box[0] + 20, box[1] + 20, box[2] - 20, box[1] + 75), f"放入第 {code[1:]} 張{category}句條", 28, 21, bold=True, fill=GRAY, align="center")


def build_three_cell_board(teacher: bool, sprites: dict[str, Image.Image]) -> tuple[Image.Image, str]:
    page = new_page(A4_L)
    draw = ImageDraw.Draw(page)
    draw_header(page, draw, "「何時 - 構件 - 功能」三格圖示板", "把 8 張中文資料句條放進正確的格子｜每組 1 張", teacher, 4, sprites["link"], compact=True)
    columns = [
        (90, 390, 1135, 2180, GOLD_LIGHT, GOLD, "clock", "何時 WHEN", CHINESE_STRIPS[0:2]),
        (1230, 390, 2275, 2180, BLUE_LIGHT, BLUE, "link", "構件 WHAT", CHINESE_STRIPS[2:5]),
        (2370, 390, 3415, 2180, PURPLE_LIGHT, PURPLE, "gear", "功能 HOW", CHINESE_STRIPS[5:8]),
    ]
    for x1, y1, x2, y2, fill, outline, icon, title, items in columns:
        rounded_panel(draw, (x1, y1, x2, y2), fill=fill, outline=outline, radius=36, width=6)
        draw.ellipse((x1 + 55, y1 + 45, x1 + 235, y1 + 225), fill=WHITE, outline=outline, width=5)
        draw_icon(draw, icon, (x1 + 145, y1 + 135), 115, color=outline)
        fit_text(draw, (x1 + 265, y1 + 55, x2 - 45, y1 + 205), title, 54, 36, bold=True, fill=TEAL_DARK, align="center")
        slot_top = y1 + 280
        slot_gap = 38
        slot_h = (y2 - slot_top - 75 - slot_gap * (len(items) - 1)) // len(items)
        for index, (code, _, _, text) in enumerate(items):
            sy1 = slot_top + index * (slot_h + slot_gap)
            board_slot(draw, (x1 + 45, sy1, x2 - 45, sy1 + slot_h), text, outline, teacher, code)
    note = "教師答案：M1 對 F1、M2 對 F2、M3 對 F3；T1、T2 排成時間線。" if teacher else "放好後：先排兩張何時句條，再把三張構件句條各連到一張功能句條。"
    draw.rounded_rectangle((250, 2220, 3258, 2390), radius=30, fill=WHITE, outline=TEAL, width=5)
    paste_sprite(page, sprites["mic"], (270, 2225, 500, 2380))
    fit_text(draw, (540, 2250, 3200, 2365), note, 38, 27, bold=True, fill=ANSWER if teacher else TEAL_DARK, align="center")
    hidden = "\n".join(["何時 構件 功能 三格圖示板"] + [item[3] for item in CHINESE_STRIPS] + [note])
    return page, hidden


def build_chinese_strips(teacher: bool, sprites: dict[str, Image.Image]) -> tuple[Image.Image, str]:
    page = new_page(A4_P)
    draw = ImageDraw.Draw(page)
    draw_header(page, draw, "8 張中文資料句條", "沿虛線剪下｜每組 1 套｜兩張何時、三張構件、三張功能", teacher, 5, sprites["clock"])
    card_w = 1080
    card_h = 650
    lefts = [120, 1280]
    top = 430
    gap_y = 90
    category_colors = {"何時": GOLD, "構件": BLUE, "功能": PURPLE}
    for index, (code, category, pose, text) in enumerate(CHINESE_STRIPS):
        col = index % 2
        row = index // 2
        x1 = lefts[col]
        y1 = top + row * (card_h + gap_y)
        x2 = x1 + card_w
        y2 = y1 + card_h
        dashed_line(draw, (x1, y1), (x2, y1), fill="#7D898D", width=4, dash=24, gap=14)
        dashed_line(draw, (x2, y1), (x2, y2), fill="#7D898D", width=4, dash=24, gap=14)
        dashed_line(draw, (x2, y2), (x1, y2), fill="#7D898D", width=4, dash=24, gap=14)
        dashed_line(draw, (x1, y2), (x1, y1), fill="#7D898D", width=4, dash=24, gap=14)
        draw.rounded_rectangle((x1 + 22, y1 + 22, x2 - 22, y2 - 22), radius=34, fill=WHITE, outline=category_colors[category], width=5)
        paste_sprite(page, sprites[pose], (x1 + 45, y1 + 75, x1 + 350, y1 + 380))
        draw.rounded_rectangle((x1 + 55, y1 + 430, x1 + 330, y1 + 550), radius=24, fill="#F6F2EA", outline=category_colors[category], width=4)
        visible_label = f"{category}｜{code}" if teacher else f"資料 {index + 1}"
        fit_text(draw, (x1 + 75, y1 + 448, x1 + 310, y1 + 532), visible_label, 34, 25, bold=True, fill=ANSWER if teacher else TEAL_DARK, align="center")
        display_text = {
            "T1": "1922年，彰化扇形車庫啟用，\n初期有6股道。",
            "T2": "後來分期增建，\n1933年形成12股道。",
        }.get(code, text)
        fit_text(draw, (x1 + 390, y1 + 80, x2 - 70, y2 - 80), display_text, 47, 31, bold=True, fill=INK)
    draw_footer(draw, page.width, page.height, "學生版正面不直接寫分類；圖片提示可協助理解，分類仍需讀句子。")
    hidden = "\n".join(["8張中文資料句條"] + [item[3] for item in CHINESE_STRIPS])
    return page, hidden


def build_english_cards(teacher: bool, sprites: dict[str, Image.Image]) -> tuple[Image.Image, str]:
    page = new_page(A5_P)
    draw = ImageDraw.Draw(page)
    draw_header(page, draw, "4 張英文句型卡", "沿虛線剪下｜每組 1 套｜指、問、答、定位", teacher, 6, sprites["mic"], compact=True)
    card_w = 720
    card_h = 880
    lefts = [100, 928]
    top = 385
    colors = [(GOLD_LIGHT, GOLD), (BLUE_LIGHT, BLUE), (GREEN_LIGHT, GREEN), (PURPLE_LIGHT, PURPLE)]
    for index, ((pose, sentence, cue, answer), (fill, outline)) in enumerate(zip(ENGLISH_CARDS, colors)):
        col = index % 2
        row = index // 2
        x1 = lefts[col]
        y1 = top + row * 970
        x2 = x1 + card_w
        y2 = y1 + card_h
        dashed_line(draw, (x1, y1), (x2, y1), fill="#7D898D", width=4, dash=22, gap=14)
        dashed_line(draw, (x2, y1), (x2, y2), fill="#7D898D", width=4, dash=22, gap=14)
        dashed_line(draw, (x2, y2), (x1, y2), fill="#7D898D", width=4, dash=22, gap=14)
        dashed_line(draw, (x1, y2), (x1, y1), fill="#7D898D", width=4, dash=22, gap=14)
        draw.rounded_rectangle((x1 + 20, y1 + 20, x2 - 20, y2 - 20), radius=34, fill=WHITE, outline=outline, width=5)
        draw.rounded_rectangle((x1 + 45, y1 + 45, x2 - 45, y1 + 315), radius=30, fill=fill)
        paste_sprite(page, sprites[pose], (x1 + 220, y1 + 40, x2 - 220, y1 + 320))
        shown = answer if teacher else sentence
        fit_text(draw, (x1 + 65, y1 + 350, x2 - 65, y1 + 585), shown, 54, 34, bold=True, fill=ANSWER if teacher else TEAL_DARK, align="center")
        draw.rounded_rectangle((x1 + 70, y1 + 625, x2 - 70, y1 + 790), radius=24, fill="#FBF9F4", outline="#D7D0C5", width=3)
        fit_text(draw, (x1 + 95, y1 + 645, x2 - 95, y1 + 770), cue, 32, 24, fill=GRAY, align="center")
        fit_text(draw, (x2 - 145, y1 + 42, x2 - 55, y1 + 92), str(index + 1), 27, 21, bold=True, fill=outline, align="center")
    draw_footer(draw, page.width, page.height, "第四張保留 middle 提示；教師答案版提供一組可朗讀的完整示範。")
    hidden = "\n".join(["4張英文句型卡"] + [answer if teacher else sentence for _, sentence, _, answer in ENGLISH_CARDS])
    return page, hidden


def build_guide_card(teacher: bool, sprites: dict[str, Image.Image]) -> tuple[Image.Image, str]:
    page = new_page(A5_P)
    draw = ImageDraw.Draw(page)
    draw_header(page, draw, "30 秒導覽順序卡", "每組 1 張｜完成後可自願小組上台導覽", teacher, 7, sprites["mic"], compact=True)
    student_steps = [
        ("clock", GOLD_LIGHT, GOLD, "1｜先說由來", "_____ 年啟用，初期有 _____ 股道；\n_____ 年形成 _____ 股道。"),
        ("link", BLUE_LIGHT, BLUE, "2｜指出並命名構件", "What's this?\nIt's a __________."),
        ("pin", GREEN_LIGHT, GREEN, "3｜做一組英語問答", "Where's the turntable?\nIt's in the __________."),
        ("gear", PURPLE_LIGHT, PURPLE, "4｜說明一個功能", "中央轉車台可以……"),
    ]
    teacher_steps = [
        ("clock", GOLD_LIGHT, GOLD, "1｜先說由來", "1922 年啟用，初期有 6 股道；\n1933 年形成 12 股道。"),
        ("link", BLUE_LIGHT, BLUE, "2｜指出並命名構件", "What's this?\nIt's a turntable."),
        ("pin", GREEN_LIGHT, GREEN, "3｜做一組英語問答", "Where's the turntable?\nIt's in the middle."),
        ("gear", PURPLE_LIGHT, PURPLE, "4｜說明一個功能", "中央轉車台可以讓火車頭轉向並對準軌道。"),
    ]
    steps = teacher_steps if teacher else student_steps
    top = 355
    step_h = 410
    for index, (icon, fill, outline, title, body) in enumerate(steps):
        y1 = top + index * (step_h + 28)
        y2 = y1 + step_h
        rounded_panel(draw, (90, y1, 1658, y2), fill=WHITE, outline=outline, radius=30, width=5)
        draw.rounded_rectangle((120, y1 + 45, 405, y2 - 45), radius=28, fill=fill, outline=outline, width=4)
        draw_icon(draw, icon, (262, (y1 + y2) // 2), 170, color=outline)
        fit_text(draw, (455, y1 + 45, 1580, y1 + 135), title, 44, 32, bold=True, fill=TEAL_DARK)
        fit_text(draw, (455, y1 + 145, 1580, y2 - 45), body, 40, 28, bold=teacher, fill=ANSWER if teacher else INK, valign="top")
    draw.rounded_rectangle((120, 2160, 1628, 2370), radius=30, fill="#FFFDF7", outline=TEAL, width=5)
    final_note = "教師示範約 25-30 秒；學生不必逐字背誦，可依資料句條替換構件與功能。" if teacher else "30 秒提示：一句由來 + 一個構件 + 一組英文問答 + 一個功能。"
    fit_text(draw, (170, 2190, 1578, 2340), final_note, 36, 27, bold=True, fill=ANSWER if teacher else TEAL_DARK, align="center")
    hidden = "\n".join(["30秒導覽順序卡"] + [item[4] for item in steps] + [final_note])
    return page, hidden


def save_page(page: Image.Image, filename: str) -> Path:
    path = FINAL_DIR / filename
    page.save(path, format="PNG", optimize=True)
    page.close()
    return path


def build_pdf(pdf_path: Path, pages: list[tuple[Path, tuple[float, float], str]]) -> None:
    pdfmetrics.registerFont(TTFont("PDFZH", str(FONT_PDF)))
    c = canvas.Canvas(str(pdf_path), pagesize=pages[0][1])
    c.setTitle(pdf_path.stem)
    c.setAuthor("二水國小在地課程教材製作")
    c.setSubject("扇形車庫第2節七類教材")
    for image_path, page_size, hidden_text in pages:
        c.setPageSize(page_size)
        width_pt, height_pt = page_size
        c.drawImage(ImageReader(str(image_path)), 0, 0, width=width_pt, height=height_pt)
        text_obj = c.beginText()
        text_obj.setTextOrigin(4, 4)
        text_obj.setFont("PDFZH", 2)
        text_obj.setTextRenderMode(3)
        for line in hidden_text.splitlines():
            text_obj.textLine(line)
        c.drawText(text_obj)
        c.showPage()
    c.save()


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def verify_pdf(pdf_path: Path, expected_sizes: list[tuple[float, float]], required_text: list[str]) -> dict:
    reader = PdfReader(str(pdf_path))
    if len(reader.pages) != len(expected_sizes):
        raise AssertionError(f"{pdf_path.name}: expected {len(expected_sizes)} pages, got {len(reader.pages)}")
    actual_sizes = []
    extracted = []
    for page, expected in zip(reader.pages, expected_sizes):
        actual = (float(page.mediabox.width), float(page.mediabox.height))
        actual_sizes.append([round(actual[0], 2), round(actual[1], 2)])
        if abs(actual[0] - expected[0]) > 1 or abs(actual[1] - expected[1]) > 1:
            raise AssertionError(f"{pdf_path.name}: wrong page size {actual}, expected {expected}")
        extracted.append(page.extract_text() or "")
    all_text = "\n".join(extracted)
    missing = [item for item in required_text if item not in all_text]
    if missing:
        raise AssertionError(f"{pdf_path.name}: hidden text layer missing {missing}")
    return {
        "path": str(pdf_path),
        "pages": len(reader.pages),
        "page_sizes_pt": actual_sizes,
        "sha256": hash_file(pdf_path),
        "text_checks": required_text,
    }


def render_pdf(pdf_path: Path, prefix: str) -> list[Path]:
    if not PDFTOPPM.exists():
        raise FileNotFoundError(f"pdftoppm not found: {PDFTOPPM}")
    render_dir = QA_DIR / f"render_{prefix}"
    render_dir.mkdir(parents=True, exist_ok=True)
    out_prefix = render_dir / prefix
    subprocess.run(
        [str(PDFTOPPM), "-png", "-r", "120", str(pdf_path), str(out_prefix)],
        check=True,
        capture_output=True,
        text=True,
    )
    pages = sorted(render_dir.glob(f"{prefix}-*.png"))
    if len(pages) != 7:
        raise AssertionError(f"Expected 7 rendered pages for {pdf_path.name}, got {len(pages)}")
    return pages


def make_contact_sheet(paths: list[Path], output: Path, grayscale: bool = False) -> None:
    columns = 2
    rows = 4
    cell_w, cell_h = 1000, 760
    sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), WHITE)
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(paths):
        image = Image.open(path).convert("RGB")
        if grayscale:
            image = ImageOps.grayscale(image).convert("RGB")
        image.thumbnail((cell_w - 80, cell_h - 90), Image.Resampling.LANCZOS)
        col = index % columns
        row = index // columns
        x = col * cell_w + (cell_w - image.width) // 2
        y = row * cell_h + 58 + (cell_h - 80 - image.height) // 2
        sheet.paste(image, (x, y))
        fit_text(draw, (col * cell_w + 20, row * cell_h + 12, (col + 1) * cell_w - 20, row * cell_h + 52), f"教材 {index + 1}/7", 28, 22, bold=True, fill=INK, align="center")
        draw.rectangle((col * cell_w + 8, row * cell_h + 5, (col + 1) * cell_w - 8, (row + 1) * cell_h - 5), outline="#C7CED0", width=3)
    sheet.save(output, optimize=True)


def main() -> None:
    for required in (FONT_REG, FONT_BOLD, FONT_PDF, AI_SOURCE):
        if not required.exists():
            raise FileNotFoundError(required)
    sprites = crop_mascots()
    builders = [
        ("01", "A4直式_個人解密單", build_personal_sheet, A4),
        ("02", "A5直式_四色圖例卡", build_legend_card, A5),
        ("03", "A6直式_三格出口票", build_exit_ticket, A6),
        ("04", "A4橫式_何時構件功能三格圖示板", build_three_cell_board, landscape(A4)),
        ("05", "A4直式_8張中文資料句條", build_chinese_strips, A4),
        ("06", "A5直式_4張英文句型卡", build_english_cards, A5),
        ("07", "A5直式_30秒導覽順序卡", build_guide_card, A5),
    ]
    student_pages: list[tuple[Path, tuple[float, float], str]] = []
    teacher_pages: list[tuple[Path, tuple[float, float], str]] = []
    png_manifest = []
    for number, label, builder, pdf_size in builders:
        for teacher, version in ((False, "學生版"), (True, "教師答案版")):
            image, hidden = builder(teacher, sprites)
            filename = f"{number}_{version}_{label}.png"
            path = save_page(image, filename)
            with Image.open(path) as check:
                expected_px = {
                    "01": A4_P,
                    "02": A5_P,
                    "03": A6_P,
                    "04": A4_L,
                    "05": A4_P,
                    "06": A5_P,
                    "07": A5_P,
                }[number]
                if check.size != expected_px:
                    raise AssertionError(f"{filename}: {check.size} != {expected_px}")
            png_manifest.append({"path": str(path), "pixels": list(expected_px), "sha256": hash_file(path)})
            target = teacher_pages if teacher else student_pages
            target.append((path, pdf_size, hidden))

    build_pdf(STUDENT_PDF, student_pages)
    build_pdf(TEACHER_PDF, teacher_pages)
    expected_sizes = [A4, A5, A6, landscape(A4), A4, A5, A5]
    student_check = verify_pdf(STUDENT_PDF, expected_sizes, ["1922", "1933", "Where's the turntable?"])
    teacher_check = verify_pdf(TEACHER_PDF, expected_sizes, ["1922", "1933", "It's in the middle."])

    student_renders = render_pdf(STUDENT_PDF, "student")
    teacher_renders = render_pdf(TEACHER_PDF, "teacher")
    student_contact = QA_DIR / "學生版_7頁彩色接觸表.png"
    teacher_contact = QA_DIR / "教師答案版_7頁彩色接觸表.png"
    student_gray = QA_DIR / "學生版_7頁灰階接觸表.png"
    teacher_gray = QA_DIR / "教師答案版_7頁灰階接觸表.png"
    make_contact_sheet(student_renders, student_contact)
    make_contact_sheet(teacher_renders, teacher_contact)
    make_contact_sheet(student_renders, student_gray, grayscale=True)
    make_contact_sheet(teacher_renders, teacher_gray, grayscale=True)

    manifest = {
        "generated_on": "2026-08-26",
        "style": "③ 3D家庭動畫電影感（原創，不仿製特定公司或作品）",
        "historical_lock": {
            "1922": "啟用，初期6股道",
            "1933": "分期增建後形成12股道",
        },
        "student_pdf": student_check,
        "teacher_pdf": teacher_check,
        "png_files": png_manifest,
        "ai_master": {"path": str(AI_MASTER), "sha256": hash_file(AI_MASTER)},
        "qa_contact_sheets": [str(student_contact), str(teacher_contact), str(student_gray), str(teacher_gray)],
    }
    manifest_path = QA_DIR / "lesson2_formal_materials_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
