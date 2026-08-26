from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps, PngImagePlugin


DPI = 300
A4_P = (2480, 3508)
A4_L = (3508, 2480)
A5_P = (1748, 2480)
A6_P = (1240, 1748)

UNIT_DIR = Path(__file__).resolve().parents[2]
STAGING = UNIT_DIR / "_work" / "staging" / "lesson2_formal_imagegen_20260826"
MASTER_DIR = STAGING / "masters"
STUDENT_DIR = STAGING / "pages" / "學生版"
TEACHER_DIR = STAGING / "pages" / "教師答案版"
QA_DIR = STAGING / "qa"
PREVIEW_DIR = QA_DIR / "列印預覽"

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

INK = "#26393D"
TEAL = "#0B5558"
GRAY = "#5E6B6F"
ANSWER = "#A6382E"
ANSWER_DARK = "#7D261F"
CREAM = "#FFFDF7"
WHITE = "#FFFFFF"

PROHIBITED = ("學生樣稿", "教師樣稿", "草稿", "待確認")
COMIC_SHA = "9EF4958AB06385D91F635F83A15569786B243F9D010CFB3F9A5CDDA593C7BC22"

CHINESE_STRIPS = [
    ("T1", "何時", "1922年，彰化扇形車庫啟用，初期有6股道。"),
    ("T2", "何時", "後來分期增建，1933年形成12股道。"),
    ("M1", "構件", "轉車台位在扇形軌道中央。"),
    ("M2", "構件", "放射狀軌道從轉車台連到各個庫位。"),
    ("M3", "構件", "扇形車庫有多個庫位，可容納火車頭。"),
    ("F1", "功能", "轉車台讓火車頭轉向並對準軌道。"),
    ("F2", "功能", "放射狀軌道讓火車頭進出不同庫位。"),
    ("F3", "功能", "車庫供火車頭檢修、保養與停放。"),
]

MASTER_FILES = {
    2: "02_四色圖例卡_ImageGen無字母版_嘗試2_採用.png",
    3: "03_三格出口票_ImageGen無字母版_嘗試1_採用.png",
    4: "04_何時構件功能三格圖示板_ImageGen無字母版_嘗試1_採用.png",
    5: "05_8張中文資料句條_ImageGen無字母版_嘗試3_採用.png",
    6: "06_4張英文句型卡_ImageGen無字母版_嘗試2_採用.png",
    7: "07_30秒導覽順序卡_ImageGen無字母版_嘗試1_採用.png",
}

OUTPUTS = {
    2: ("02_學生版_A5直式_四色圖例卡.png", "02_教師答案版_A5直式_四色圖例卡.png", A5_P, "A5 portrait"),
    3: ("03_學生版_A6直式_三格出口票.png", "03_教師答案版_A6直式_三格出口票.png", A6_P, "A6 portrait"),
    4: ("04_學生版_A4橫式_何時構件功能三格圖示板.png", "04_教師答案版_A4橫式_何時構件功能三格圖示板.png", A4_L, "A4 landscape"),
    5: ("05_學生版_A4直式_8張中文資料句條.png", "05_教師答案版_A4直式_8張中文資料句條.png", A4_P, "A4 portrait"),
    6: ("06_學生版_A5直式_4張英文句型卡.png", "06_教師答案版_A5直式_4張英文句型卡.png", A5_P, "A5 portrait"),
    7: ("07_學生版_A5直式_30秒導覽順序卡.png", "07_教師答案版_A5直式_30秒導覽順序卡.png", A5_P, "A5 portrait"),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def zh_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(ZH_BOLD if bold else ZH_REGULAR), size)


def en_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(COMIC_RELIEF), size)


def sb(
    source_size: tuple[int, int],
    page_size: tuple[int, int],
    box: tuple[float, float, float, float],
) -> tuple[int, int, int, int]:
    sx = page_size[0] / source_size[0]
    sy = page_size[1] / source_size[1]
    x1, y1, x2, y2 = box
    return round(x1 * sx), round(y1 * sy), round(x2 * sx), round(y2 * sy)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int, english: bool) -> list[str]:
    explicit = text.splitlines() or [""]
    lines: list[str] = []
    for paragraph in explicit:
        if not paragraph:
            lines.append("")
            continue
        # 中文資料句中常夾有年份與股道數；把連續數字視為不可拆分的字組，
        # 避免 1933 被換成「193」與「3」兩行而降低學生可讀性。
        tokens = paragraph.split(" ") if english else re.findall(r"\d+|[A-Za-z]+(?:['’-][A-Za-z]+)?|.", paragraph)
        current = ""
        for token in tokens:
            candidate = token if not current else (f"{current} {token}" if english else current + token)
            width = draw.textbbox((0, 0), candidate, font=font)[2]
            if width <= max_width:
                current = candidate
            else:
                if not current:
                    raise ValueError(f"Single token too wide: {token!r}")
                lines.append(current)
                current = token
        if current:
            lines.append(current)
    return lines


def draw_text_box(
    draw: ImageDraw.ImageDraw,
    target: tuple[int, int, int, int],
    text: str,
    size: int,
    *,
    english: bool = False,
    bold: bool = False,
    fill: str = INK,
    align: str = "left",
    valign: str = "center",
    line_spacing: float = 1.18,
    role: str = "body",
) -> dict:
    font = en_font(size) if english else zh_font(size, bold=bold)
    x1, y1, x2, y2 = target
    lines = wrap_text(draw, text, font, x2 - x1, english)
    glyph_boxes = [draw.textbbox((0, 0), line or "　", font=font) for line in lines]
    line_height = math.ceil(size * line_spacing)
    total_height = line_height * len(lines)
    if total_height > y2 - y1:
        raise ValueError(f"Text too tall for fixed readable size: {text!r} {target}")
    y = y1 if valign == "top" else (y2 - total_height if valign == "bottom" else y1 + ((y2 - y1) - total_height) / 2)
    rendered: list[list[int]] = []
    for line, glyph in zip(lines, glyph_boxes):
        width = glyph[2] - glyph[0]
        if align == "center":
            x = x1 + ((x2 - x1) - width) / 2 - glyph[0]
        elif align == "right":
            x = x2 - width - glyph[0]
        else:
            x = x1 - glyph[0]
        baseline_y = round(y - glyph[1])
        draw.text((round(x), baseline_y), line, font=font, fill=fill)
        rendered.append(list(draw.textbbox((round(x), baseline_y), line, font=font)))
        y += line_height
    envelope = [
        min(box[0] for box in rendered), min(box[1] for box in rendered),
        max(box[2] for box in rendered), max(box[3] for box in rendered),
    ]
    if envelope[0] < x1 or envelope[1] < y1 or envelope[2] > x2 or envelope[3] > y2:
        raise AssertionError(f"Rendered text escaped target: {text!r} {envelope} {target}")
    return {
        "text": text,
        "role": role,
        "target": list(target),
        "rendered_bbox": envelope,
        "font": "Comic Relief Regular" if english else ("Microsoft JhengHei Bold" if bold else "Microsoft JhengHei"),
        "font_size_px": size,
        "color": fill,
    }


def draw_mixed_center(
    draw: ImageDraw.ImageDraw,
    target: tuple[int, int, int, int],
    chinese: str,
    english: str,
    size: int,
    *,
    fill: str = TEAL,
    role: str = "mixed",
) -> list[dict]:
    zh = zh_font(size, bold=True)
    en = en_font(size)
    zh_box = draw.textbbox((0, 0), chinese, font=zh)
    en_box = draw.textbbox((0, 0), english, font=en)
    gap = round(size * 0.35)
    total = (zh_box[2] - zh_box[0]) + gap + (en_box[2] - en_box[0])
    x1, y1, x2, y2 = target
    if total > x2 - x1:
        raise ValueError(f"Mixed line too wide: {chinese} {english}")
    center_y = (y1 + y2) / 2
    x = (x1 + x2 - total) / 2
    zh_y = center_y - (zh_box[1] + zh_box[3]) / 2
    draw.text((round(x - zh_box[0]), round(zh_y)), chinese, font=zh, fill=fill)
    zh_render = list(draw.textbbox((round(x - zh_box[0]), round(zh_y)), chinese, font=zh))
    x += zh_box[2] - zh_box[0] + gap
    en_y = center_y - (en_box[1] + en_box[3]) / 2
    draw.text((round(x - en_box[0]), round(en_y)), english, font=en, fill=fill)
    en_render = list(draw.textbbox((round(x - en_box[0]), round(en_y)), english, font=en))
    return [
        {"text": chinese, "role": role, "target": list(target), "rendered_bbox": zh_render, "font": "Microsoft JhengHei Bold", "font_size_px": size, "color": fill},
        {"text": english, "role": role, "target": list(target), "rendered_bbox": en_render, "font": "Comic Relief Regular", "font_size_px": size, "color": fill},
    ]


def load_master(page_no: int, page_size: tuple[int, int]) -> tuple[Image.Image, tuple[int, int], Path]:
    path = MASTER_DIR / MASTER_FILES[page_no]
    if not path.exists():
        raise FileNotFoundError(path)
    with Image.open(path) as source:
        source_size = source.size
        page = source.convert("RGB").resize(page_size, Image.Resampling.LANCZOS)
    return page, source_size, path


def add_teacher_badge(
    page: Image.Image,
    answer_mask: Image.Image,
    target: tuple[int, int, int, int],
    records: list[dict],
) -> None:
    draw = ImageDraw.Draw(page)
    mask = ImageDraw.Draw(answer_mask)
    draw.rounded_rectangle(target, radius=max(8, (target[3] - target[1]) // 4), fill="#FFF4F1", outline=ANSWER, width=3)
    mask.rounded_rectangle(target, radius=max(10, (target[3] - target[1]) // 4 + 2), fill=255)
    records.append(draw_text_box(draw, (target[0] + 10, target[1] + 4, target[2] - 10, target[3] - 4), "教師答案版", max(24, round((target[3] - target[1]) * 0.46)), bold=True, fill=ANSWER_DARK, align="center", role="teacher-badge"))


def build_legend() -> tuple[Image.Image, Image.Image, Image.Image, list[dict], list[dict], dict]:
    page_size = A5_P
    common, source_size, master = load_master(2, page_size)
    draw = ImageDraw.Draw(common)
    common_records: list[dict] = []
    common_records.append(draw_text_box(draw, sb(source_size, page_size, (285, 85, 930, 245)), "四色圖例卡", 78, bold=True, fill=TEAL, align="center", role="title"))
    common_records.append(draw_text_box(draw, sb(source_size, page_size, (330, 245, 925, 330)), "看顏色，也看圖形和文字", 38, bold=True, fill=GRAY, align="center", role="subtitle"))
    rows = [
        ("紅色圓形｜中央轉車台", "讓火車頭轉向並對準軌道"),
        ("藍色線條｜放射狀軌道", "從轉車台通往不同庫位"),
        ("綠色方格｜扇形車庫庫位", "供火車頭檢修、保養與停放"),
        ("黃色火車｜火車頭", "依轉車台與軌道進出庫位"),
    ]
    text_boxes = [(410, 420, 930, 625), (410, 665, 930, 870), (410, 905, 930, 1110), (410, 1150, 930, 1360)]
    for (title, body), source_box in zip(rows, text_boxes):
        target = sb(source_size, page_size, source_box)
        split_y = target[1] + round((target[3] - target[1]) * 0.46)
        common_records.append(draw_text_box(draw, (target[0], target[1], target[2], split_y), title, 48, bold=True, fill=TEAL, valign="bottom", role="legend-title"))
        common_records.append(draw_text_box(draw, (target[0], split_y + 8, target[2], target[3]), body, 40, fill=INK, valign="top", role="legend-body"))
    student = common.copy()
    teacher = common.copy()
    answer_mask = Image.new("L", page_size, 0)
    teacher_records: list[dict] = []
    add_teacher_badge(teacher, answer_mask, sb(source_size, page_size, (705, 320, 930, 380)), teacher_records)
    return student, teacher, answer_mask, common_records, teacher_records, {"master": master, "source_size": source_size, "content_count": 4}


def build_exit_ticket() -> tuple[Image.Image, Image.Image, Image.Image, list[dict], list[dict], dict]:
    page_size = A6_P
    common, source_size, master = load_master(3, page_size)
    draw = ImageDraw.Draw(common)
    common_records: list[dict] = []
    common_records.append(draw_text_box(draw, sb(source_size, page_size, (120, 70, 710, 205)), "三格出口票", 60, bold=True, fill=TEAL, align="center", role="title"))
    common_records.append(draw_text_box(draw, sb(source_size, page_size, (140, 205, 700, 300)), "下課前5分鐘｜每人1張", 30, bold=True, fill=GRAY, align="center", role="subtitle"))
    panels = [
        ((235, 390, 950, 690), "1｜由來小偵探", "扇形車庫何時啟用？當時有幾股道？", "提示：它在1920年代初啟用。", "1922年啟用，初期有6股道。", False),
        ((245, 725, 950, 1020), "2｜功能小工程師", "轉車台有什麼功能？", "提示：中央轉車台可以……", "中央轉車台可以讓火車頭轉向並對準軌道。", False),
        ((380, 1060, 950, 1345), "3｜英語小導覽員", "Where's the turntable?", "It's in the ________.", "It's in the middle.", True),
    ]
    question_boxes: list[tuple[int, int, int, int]] = []
    for source_box, title, question, _, _, english in panels:
        target = sb(source_size, page_size, source_box)
        h = target[3] - target[1]
        common_records.append(draw_text_box(draw, (target[0], target[1], target[2], target[1] + round(h * 0.25)), title, 36, bold=True, fill=TEAL, valign="center", role="section-title"))
        common_records.append(draw_text_box(draw, (target[0], target[1] + round(h * 0.25), target[2], target[1] + round(h * 0.55)), question, 34 if not english else 40, english=english, bold=not english, fill=INK, valign="center", role="question"))
        question_boxes.append((target[0], target[1] + round(h * 0.58), target[2], target[3]))
    student = common.copy()
    teacher = common.copy()
    student_records: list[dict] = []
    teacher_records: list[dict] = []
    answer_mask = Image.new("L", page_size, 0)
    mask = ImageDraw.Draw(answer_mask)
    for response_box, panel in zip(question_boxes, panels):
        _, _, _, hint, answer, english = panel
        mask.rounded_rectangle(response_box, radius=8, fill=255)
        student_records.append(draw_text_box(ImageDraw.Draw(student), response_box, hint, 30 if not english else 34, english=english, fill=GRAY, valign="center", role="student-hint"))
        teacher_records.append(draw_text_box(ImageDraw.Draw(teacher), response_box, answer, 31 if not english else 37, english=english, bold=not english, fill=ANSWER, valign="center", role="teacher-answer"))
    identity = [(55, 1388, 320, 1460, "班級："), (365, 1388, 660, 1460, "座號："), (705, 1388, 1005, 1460, "姓名：")]
    for x1, y1, x2, y2, label in identity:
        common_target = sb(source_size, page_size, (x1, y1, x2, y2))
        for page, records in ((student, student_records), (teacher, teacher_records)):
            records.append(draw_text_box(ImageDraw.Draw(page), common_target, label, 24, bold=True, fill=GRAY, align="center", role="identity"))
    add_teacher_badge(teacher, answer_mask, sb(source_size, page_size, (660, 300, 920, 355)), teacher_records)
    return student, teacher, answer_mask, common_records + student_records, teacher_records, {"master": master, "source_size": source_size, "content_count": 3}


def build_board() -> tuple[Image.Image, Image.Image, Image.Image, list[dict], list[dict], dict]:
    page_size = A4_L
    common, source_size, master = load_master(4, page_size)
    draw = ImageDraw.Draw(common)
    common_records: list[dict] = []
    common_records.append(draw_text_box(draw, sb(source_size, page_size, (380, 55, 1190, 220)), "「何時－構件－功能」三格圖示板", 78, bold=True, fill=TEAL, align="center", role="title"))
    headers = [((300, 395, 615, 500), "何時", "WHEN"), ((650, 395, 985, 500), "構件", "WHAT"), ((1015, 395, 1360, 500), "功能", "HOW")]
    for source_box, zh, en in headers:
        common_records.extend(draw_mixed_center(draw, sb(source_size, page_size, source_box), zh, en, 52, role="column-header"))
    slot_sources = [
        (300, 515, 610, 710), (300, 730, 610, 965),
        (650, 515, 980, 650), (650, 665, 980, 805), (650, 820, 980, 965),
        (1020, 515, 1355, 650), (1020, 665, 1355, 805), (1020, 820, 1355, 965),
    ]
    student = common.copy()
    teacher = common.copy()
    student_records: list[dict] = []
    teacher_records: list[dict] = []
    answer_mask = Image.new("L", page_size, 0)
    mask = ImageDraw.Draw(answer_mask)
    student_labels = ["放入第1張何時句條", "放入第2張何時句條", "放入第1張構件句條", "放入第2張構件句條", "放入第3張構件句條", "放入第1張功能句條", "放入第2張功能句條", "放入第3張功能句條"]
    for source_box, student_label, (_, _, answer) in zip(slot_sources, student_labels, CHINESE_STRIPS):
        target = sb(source_size, page_size, source_box)
        inset = (target[0] + 22, target[1] + 12, target[2] - 22, target[3] - 12)
        mask.rounded_rectangle(target, radius=12, fill=255)
        student_records.append(draw_text_box(ImageDraw.Draw(student), inset, student_label, 36, bold=True, fill=GRAY, align="center", role="student-slot"))
        teacher_records.append(draw_text_box(ImageDraw.Draw(teacher), inset, answer, 40, bold=True, fill=ANSWER, align="center", role="teacher-slot"))
    add_teacher_badge(teacher, answer_mask, sb(source_size, page_size, (1170, 250, 1390, 315)), teacher_records)
    return student, teacher, answer_mask, common_records + student_records, teacher_records, {"master": master, "source_size": source_size, "slot_count": [2, 3, 3]}


def build_strips() -> tuple[Image.Image, Image.Image, Image.Image, list[dict], list[dict], dict]:
    page_size = A4_P
    common, source_size, master = load_master(5, page_size)
    draw = ImageDraw.Draw(common)
    common_records: list[dict] = []
    title_box = sb(source_size, page_size, (305, 8, 720, 72))
    draw.rounded_rectangle(title_box, radius=20, fill="#FFF8E9", outline="#A97732", width=3)
    common_records.append(draw_text_box(draw, title_box, "8張中文資料句條", 52, bold=True, fill=TEAL, align="center", role="page-title"))
    card_sources = [
        (315, 120, 475, 405), (805, 120, 965, 405),
        (315, 480, 475, 745), (805, 480, 965, 745),
        (315, 825, 475, 1060), (805, 825, 965, 1060),
        (315, 1130, 475, 1375), (805, 1130, 965, 1375),
    ]
    student = common.copy()
    teacher = common.copy()
    student_records: list[dict] = []
    teacher_records: list[dict] = []
    answer_mask = Image.new("L", page_size, 0)
    mask = ImageDraw.Draw(answer_mask)
    for index, (source_box, (code, category, sentence)) in enumerate(zip(card_sources, CHINESE_STRIPS), start=1):
        target = sb(source_size, page_size, source_box)
        for page in (student, teacher):
            ImageDraw.Draw(page).rounded_rectangle(target, radius=18, fill="#FFF9EC", outline="#D5C199", width=3)
        h = target[3] - target[1]
        badge_box = (target[0], target[1], target[2], target[1] + round(h * 0.22))
        text_box = (target[0] + 18, target[1] + round(h * 0.22), target[2] - 18, target[3] - 10)
        sentence_record = draw_text_box(ImageDraw.Draw(student), text_box, sentence, 43, bold=True, fill=INK, valign="center", role="data-sentence")
        draw_text_box(ImageDraw.Draw(teacher), text_box, sentence, 43, bold=True, fill=INK, valign="center", role="data-sentence")
        common_records.append(sentence_record)
        student_records.append(draw_text_box(ImageDraw.Draw(student), badge_box, f"資料{index}", 31, bold=True, fill=TEAL, align="center", role="student-label"))
        mask.rounded_rectangle(badge_box, radius=8, fill=255)
        label = f"{category}｜{code}"
        zh, en = label.split("｜")
        teacher_records.extend(draw_mixed_center(ImageDraw.Draw(teacher), badge_box, zh + "｜", en, 31, fill=ANSWER, role="teacher-category"))
    add_teacher_badge(teacher, answer_mask, sb(source_size, page_size, (790, 15, 990, 70)), teacher_records)
    return student, teacher, answer_mask, common_records + student_records, teacher_records, {"master": master, "source_size": source_size, "card_count": 8}


def build_english_cards() -> tuple[Image.Image, Image.Image, Image.Image, list[dict], list[dict], dict]:
    page_size = A5_P
    common, source_size, master = load_master(6, page_size)
    draw = ImageDraw.Draw(common)
    common_records: list[dict] = []
    speech_sources = [(70, 75, 465, 320), (585, 75, 980, 320), (70, 805, 465, 1035), (585, 805, 980, 1035)]
    hint_sources = [(95, 590, 445, 690), (610, 590, 960, 690), (95, 1300, 445, 1405), (610, 1300, 960, 1405)]
    student_sentences = ["What's this?", "It's a __________.", "Where's the __________?", "It's in the __________."]
    teacher_sentences = ["What's this?", "It's a turntable.", "Where's the turntable?", "It's in the middle."]
    cues = ["指向一個構件問問題", "說出構件名稱", "問構件在哪裡", "小提示：中央的英文是 middle"]
    student = common.copy()
    teacher = common.copy()
    student_records: list[dict] = []
    teacher_records: list[dict] = []
    answer_mask = Image.new("L", page_size, 0)
    mask = ImageDraw.Draw(answer_mask)
    for index, (speech_source, hint_source, student_sentence, teacher_sentence, cue) in enumerate(zip(speech_sources, hint_sources, student_sentences, teacher_sentences, cues)):
        speech = sb(source_size, page_size, speech_source)
        hint = sb(source_size, page_size, hint_source)
        mask.rounded_rectangle(speech, radius=10, fill=255)
        student_records.append(draw_text_box(ImageDraw.Draw(student), speech, student_sentence, 55, english=True, fill=TEAL, align="center", role="student-english"))
        teacher_records.append(draw_text_box(ImageDraw.Draw(teacher), speech, teacher_sentence, 55, english=True, fill=ANSWER, align="center", role="teacher-english"))
        if index < 3:
            cue_record = draw_text_box(ImageDraw.Draw(student), hint, cue, 31, bold=True, fill=GRAY, align="center", role="cue")
            draw_text_box(ImageDraw.Draw(teacher), hint, cue, 31, bold=True, fill=GRAY, align="center", role="cue")
            common_records.append(cue_record)
        else:
            chinese_box = (hint[0], hint[1], hint[0] + round((hint[2] - hint[0]) * 0.64), hint[3])
            english_box = (chinese_box[2] + 10, hint[1], hint[2], hint[3])
            chinese_record = draw_text_box(ImageDraw.Draw(student), chinese_box, "小提示：中央的英文是", 28, bold=True, fill=GRAY, align="right", role="cue")
            draw_text_box(ImageDraw.Draw(teacher), chinese_box, "小提示：中央的英文是", 28, bold=True, fill=GRAY, align="right", role="cue")
            english_record = draw_text_box(ImageDraw.Draw(student), english_box, "middle", 34, english=True, fill=GRAY, align="left", role="cue-english")
            draw_text_box(ImageDraw.Draw(teacher), english_box, "middle", 34, english=True, fill=GRAY, align="left", role="cue-english")
            common_records.extend([chinese_record, english_record])
    add_teacher_badge(teacher, answer_mask, sb(source_size, page_size, (810, 10, 1030, 65)), teacher_records)
    return student, teacher, answer_mask, common_records + student_records, teacher_records, {"master": master, "source_size": source_size, "card_count": 4}


def build_guide() -> tuple[Image.Image, Image.Image, Image.Image, list[dict], list[dict], dict]:
    page_size = A5_P
    common, source_size, master = load_master(7, page_size)
    draw = ImageDraw.Draw(common)
    common_records: list[dict] = []
    common_records.append(draw_text_box(draw, sb(source_size, page_size, (265, 75, 845, 220)), "30秒導覽順序卡", 70, bold=True, fill=TEAL, align="center", role="title"))
    common_records.append(draw_text_box(draw, sb(source_size, page_size, (300, 220, 825, 295)), "一句由來＋一個構件＋一組問答＋一個功能", 31, bold=True, fill=GRAY, align="center", role="subtitle"))
    panels = [
        ((420, 365, 930, 605), "1｜先說由來", "_____年啟用，初期有_____股道；\n_____年形成_____股道。", "1922年啟用，初期有6股道；\n1933年形成12股道。", False),
        ((420, 640, 930, 880), "2｜指出並命名構件", "What's this?\nIt's a __________.", "What's this?\nIt's a turntable.", True),
        ((420, 920, 930, 1155), "3｜做一組英語問答", "Where's the turntable?\nIt's in the __________.", "Where's the turntable?\nIt's in the middle.", True),
        ((420, 1200, 930, 1435), "4｜說明一個功能", "中央轉車台可以……", "中央轉車台可以讓火車頭轉向並對準軌道。", False),
    ]
    response_boxes: list[tuple[int, int, int, int]] = []
    student = common.copy()
    teacher = common.copy()
    student_records: list[dict] = []
    teacher_records: list[dict] = []
    answer_mask = Image.new("L", page_size, 0)
    mask = ImageDraw.Draw(answer_mask)
    for source_box, title, student_body, teacher_body, english in panels:
        target = sb(source_size, page_size, source_box)
        h = target[3] - target[1]
        title_box = (target[0], target[1], target[2], target[1] + round(h * 0.28))
        body_box = (target[0], target[1] + round(h * 0.31), target[2], target[3])
        title_record = draw_text_box(ImageDraw.Draw(student), title_box, title, 42, bold=True, fill=TEAL, valign="center", role="step-title")
        draw_text_box(ImageDraw.Draw(teacher), title_box, title, 42, bold=True, fill=TEAL, valign="center", role="step-title")
        common_records.append(title_record)
        mask.rounded_rectangle(body_box, radius=10, fill=255)
        student_records.append(draw_text_box(ImageDraw.Draw(student), body_box, student_body, 40 if not english else 48, english=english, bold=not english, fill=INK, valign="center", role="student-step"))
        teacher_records.append(draw_text_box(ImageDraw.Draw(teacher), body_box, teacher_body, 40 if not english else 48, english=english, bold=not english, fill=ANSWER, valign="center", role="teacher-step"))
        response_boxes.append(body_box)
    add_teacher_badge(teacher, answer_mask, sb(source_size, page_size, (760, 300, 960, 355)), teacher_records)
    return student, teacher, answer_mask, common_records + student_records, teacher_records, {"master": master, "source_size": source_size, "step_count": 4}


def save_png(page: Image.Image, path: Path, metadata: dict) -> None:
    info = PngImagePlugin.PngInfo()
    for key, value in metadata.items():
        info.add_text(key, value if isinstance(value, str) else json.dumps(value, ensure_ascii=False))
    page.save(path, format="PNG", optimize=True, dpi=(DPI, DPI), pnginfo=info)


def assert_pair_alignment(student: Image.Image, teacher: Image.Image, answer_mask: Image.Image) -> dict:
    diff = ImageChops.difference(student.convert("RGB"), teacher.convert("RGB"))
    if diff.getbbox() is None:
        raise AssertionError("Teacher page contains no visible answer-layer difference")
    conservative = answer_mask.filter(ImageFilter.MaxFilter(31))
    outside = ImageChops.composite(diff, Image.new("RGB", student.size, "black"), ImageOps.invert(conservative))
    if outside.getbbox() is not None:
        raise AssertionError(f"Pair differs outside answer mask: {outside.getbbox()}")
    return {"outside_answer_mask_pixel_difference": 0, "answer_mask_antialias_dilation_px": 15, "difference_bbox": list(diff.getbbox())}


def make_contact(paths: list[Path], output: Path, grayscale: bool) -> None:
    thumbs: list[Image.Image] = []
    for path in paths:
        with Image.open(path) as source:
            image = source.convert("RGB")
        if grayscale:
            image = ImageOps.grayscale(image).convert("RGB")
        image.thumbnail((380, 520), Image.Resampling.LANCZOS)
        thumbs.append(image)
    rows = math.ceil(len(thumbs) / 2)
    canvas = Image.new("RGB", (900, 105 + rows * 610), "#EDEDED")
    draw = ImageDraw.Draw(canvas)
    title_font = zh_font(36, bold=True)
    label_font = zh_font(20, bold=True)
    draw.text((35, 25), "七頁教材視覺QA" + ("（灰階）" if grayscale else "（彩色）"), font=title_font, fill=INK)
    for index, (thumb, path) in enumerate(zip(thumbs, paths)):
        row, col = divmod(index, 2)
        x = 30 + col * 435
        y = 90 + row * 610
        draw.text((x, y), path.stem, font=label_font, fill=TEAL)
        canvas.paste(thumb, (x, y + 34))
    canvas.save(output, format="PNG", optimize=True, dpi=(150, 150))


def make_print_preview(path: Path, paper: str, output: Path) -> None:
    with Image.open(path) as source:
        page = source.convert("RGB")
    landscape = page.width > page.height
    max_size = (1320, 930) if landscape else (850, 1210)
    page.thumbnail(max_size, Image.Resampling.LANCZOS)
    canvas_size = (1460, 1120) if landscape else (1080, 1430)
    canvas = Image.new("RGB", canvas_size, "#DADADA")
    draw = ImageDraw.Draw(canvas)
    draw.text((45, 25), f"{paper} 列印預覽（300 dpi）", font=zh_font(38, bold=True), fill=INK)
    draw.text((45, 75), "紅色虛線為5 mm安全區；實體試印仍為教師端待辦。", font=zh_font(25), fill=GRAY)
    ox = (canvas.width - page.width) // 2
    oy = 125
    canvas.paste(page, (ox, oy))
    paper_mm = {"A4 portrait": (210, 297), "A4 landscape": (297, 210), "A5 portrait": (148, 210), "A6 portrait": (105, 148)}[paper]
    mx = round(page.width * 5 / paper_mm[0])
    my = round(page.height * 5 / paper_mm[1])
    draw.rectangle((ox + mx, oy + my, ox + page.width - mx, oy + page.height - my), outline="#D94B45", width=2)
    canvas.save(output, format="PNG", optimize=True, dpi=(150, 150))


def main() -> None:
    for path in (ZH_REGULAR, ZH_BOLD, COMIC_RELIEF):
        if not path.exists():
            raise FileNotFoundError(path)
    if sha256(COMIC_RELIEF) != COMIC_SHA:
        raise AssertionError("Comic Relief asset hash changed")
    if en_font(48).getname() != ("Comic Relief", "Regular"):
        raise AssertionError(f"Unexpected Comic Relief identity: {en_font(48).getname()}")
    STUDENT_DIR.mkdir(parents=True, exist_ok=True)
    TEACHER_DIR.mkdir(parents=True, exist_ok=True)
    QA_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    builders = {2: build_legend, 3: build_exit_ticket, 4: build_board, 5: build_strips, 6: build_english_cards, 7: build_guide}
    results: list[dict] = []
    student_paths = [STUDENT_DIR / "01_學生版_A4直式_個人解密單.png"]
    teacher_paths = [TEACHER_DIR / "01_教師答案版_A4直式_個人解密單.png"]
    if not student_paths[0].exists() or not teacher_paths[0].exists():
        raise FileNotFoundError("Locked page 1 pair must already be staged")

    for page_no in range(2, 8):
        student, teacher, answer_mask, student_records, teacher_records, info = builders[page_no]()
        student_name, teacher_name, expected_size, paper = OUTPUTS[page_no]
        if student.size != expected_size or teacher.size != expected_size:
            raise AssertionError(f"Unexpected page size for page {page_no}")
        face_text = "\n".join(record["text"] for record in student_records + teacher_records)
        hits = [term for term in PROHIBITED if term in face_text]
        if hits:
            raise AssertionError(f"Prohibited printable-face terms on page {page_no}: {hits}")
        alignment = assert_pair_alignment(student, teacher, answer_mask)
        student_path = STUDENT_DIR / student_name
        teacher_path = TEACHER_DIR / teacher_name
        master: Path = info["master"]
        metadata = {
            "status": "正式數位教材候選；整套QA通過後更新正式路徑",
            "imagegen_master": master.name,
            "imagegen_master_sha256": sha256(master),
            "english_font": "Comic Relief Regular",
        }
        save_png(student, student_path, {**metadata, "edition": "student", "text_overlay": [r["text"] for r in student_records]})
        save_png(teacher, teacher_path, {**metadata, "edition": "teacher-answer", "text_overlay": [r["text"] for r in teacher_records]})
        with Image.open(student_path) as student_check, Image.open(teacher_path) as teacher_check:
            dpi_student = student_check.info.get("dpi")
            dpi_teacher = teacher_check.info.get("dpi")
            if student_check.size != expected_size or teacher_check.size != expected_size:
                raise AssertionError("PNG readback size mismatch")
        if not dpi_student or not dpi_teacher or abs(dpi_student[0] - 300) >= 1 or abs(dpi_teacher[0] - 300) >= 1:
            raise AssertionError(f"PNG readback DPI mismatch: {dpi_student}, {dpi_teacher}")
        preview_student = PREVIEW_DIR / f"{page_no:02d}_學生版_{paper.replace(' ', '_')}_預覽.png"
        preview_teacher = PREVIEW_DIR / f"{page_no:02d}_教師答案版_{paper.replace(' ', '_')}_預覽.png"
        make_print_preview(student_path, paper, preview_student)
        make_print_preview(teacher_path, paper, preview_teacher)
        results.append({
            "page": page_no,
            "paper": paper,
            "pixels": list(expected_size),
            "master": {"file": master.name, "sha256": sha256(master), "source_pixels": list(info["source_size"]), "manual_no_readable_text": True},
            "student": {"file": student_name, "bytes": student_path.stat().st_size, "sha256": sha256(student_path), "dpi": dpi_student},
            "teacher": {"file": teacher_name, "bytes": teacher_path.stat().st_size, "sha256": sha256(teacher_path), "dpi": dpi_teacher},
            "alignment": alignment,
            "content_structure": {key: value for key, value in info.items() if key not in {"master", "source_size"}},
            "text_records": {"student": student_records, "teacher": teacher_records},
            "prohibited_terms": {term: 0 for term in PROHIBITED},
            "previews": [preview_student.name, preview_teacher.name],
        })
        student_paths.append(student_path)
        teacher_paths.append(teacher_path)

    make_contact(student_paths, QA_DIR / "01_學生版_7頁彩色接觸表.png", grayscale=False)
    make_contact(student_paths, QA_DIR / "02_學生版_7頁灰階接觸表.png", grayscale=True)
    make_contact(teacher_paths, QA_DIR / "03_教師答案版_7頁彩色接觸表.png", grayscale=False)
    make_contact(teacher_paths, QA_DIR / "04_教師答案版_7頁灰階接觸表.png", grayscale=True)
    manifest = {
        "generated_on": "2026-08-26",
        "status": "staged; manual visual QA required before formal swap",
        "scope": "lesson 2 pages 2-7; page 1 pair copied from confirmed pilot",
        "font": {"english_family_style": list(en_font(48).getname()), "comic_relief_sha256": COMIC_SHA},
        "page1_locked": {
            "student": {"file": student_paths[0].name, "sha256": sha256(student_paths[0])},
            "teacher": {"file": teacher_paths[0].name, "sha256": sha256(teacher_paths[0])},
        },
        "pages_2_to_7": results,
        "qa": {
            "content_machine_checks": "pass",
            "answer_machine_checks": "pass",
            "pair_alignment_outside_answer_masks": "pass",
            "comic_relief_actual_font": "pass",
            "prohibited_face_terms": "pass",
            "page_sizes_and_dpi": "pass",
            "color_contacts": "generated",
            "grayscale_contacts": "generated",
            "paper_previews": "generated",
            "manual_visual_read": "pending",
            "physical_print": "teacher-todo",
        },
    }
    manifest_path = QA_DIR / "05_第2節ImageGen整批頁面_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "student_pages": len(student_paths),
        "teacher_pages": len(teacher_paths),
        "manifest": str(manifest_path),
        "student_sha256": [sha256(path) for path in student_paths],
        "teacher_sha256": [sha256(path) for path in teacher_paths],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
