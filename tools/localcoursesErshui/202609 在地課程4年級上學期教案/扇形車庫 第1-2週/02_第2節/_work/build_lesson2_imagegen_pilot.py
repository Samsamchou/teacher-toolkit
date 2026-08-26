from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps, PngImagePlugin


PAGE_SIZE = (2480, 3508)
BASE_SIZE = (1055, 1491)

UNIT_DIR = Path(__file__).resolve().parents[1]
PILOT_DIR = UNIT_DIR / "18_扇形車庫_第2節ImageGen個人解密單樣稿_20260826"
QA_DIR = PILOT_DIR / "_qa"

STUDENT_MASTER = PILOT_DIR / "02_學生版_ImageGen無字母版_嘗試2_採用.png"
TEACHER_MASTER = PILOT_DIR / "03_教師答案版_ImageGen無字母版_嘗試1_採用.png"
STUDENT_OUTPUT = PILOT_DIR / "04_學生版_正式文字覆排樣稿.png"
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
TEAL = "#0C5558"
GRAY = "#68777B"
ANSWER = "#A6382E"
BLUE = "#367DB0"
GREEN = "#5E9969"
RED = "#C54D3F"
GOLD = "#F1B84B"
WHITE = "#FFFFFF"

SX = PAGE_SIZE[0] / BASE_SIZE[0]
SY = PAGE_SIZE[1] / BASE_SIZE[1]


def px(x: float) -> int:
    return round(x * SX)


def py(y: float) -> int:
    return round(y * SY)


def box(left: float, top: float, right: float, bottom: float) -> tuple[int, int, int, int]:
    return (px(left), py(top), px(right), py(bottom))


def zh_font(size: float, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(ZH_BOLD if bold else ZH_REGULAR), py(size))


def en_font(size: float) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(COMIC_RELIEF), py(size))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def fit_single_line(
    draw: ImageDraw.ImageDraw,
    target: tuple[int, int, int, int],
    text: str,
    start_size: float,
    min_size: float,
    *,
    english: bool = False,
    bold: bool = False,
    fill: str = INK,
    align: str = "left",
) -> dict:
    x1, y1, x2, y2 = target
    size = start_size
    while size >= min_size:
        font = en_font(size) if english else zh_font(size, bold=bold)
        width, height = text_size(draw, text, font)
        if width <= x2 - x1 and height <= y2 - y1:
            if align == "center":
                x = x1 + ((x2 - x1) - width) / 2
            elif align == "right":
                x = x2 - width
            else:
                x = x1
            y = y1 + ((y2 - y1) - height) / 2
            draw.text((round(x), round(y)), text, font=font, fill=fill)
            return {
                "text": text,
                "box": list(target),
                "font": "Comic Relief Regular" if english else ("Microsoft JhengHei Bold" if bold else "Microsoft JhengHei"),
                "font_size_px": font.size,
            }
        size -= 0.5
    raise ValueError(f"Text does not fit: {text}")


def draw_multiline_center(
    draw: ImageDraw.ImageDraw,
    target: tuple[int, int, int, int],
    lines: list[str],
    size: float,
    *,
    fill: str = GRAY,
    bold: bool = False,
) -> list[dict]:
    x1, y1, x2, y2 = target
    font = zh_font(size, bold=bold)
    line_height = round(font.size * 1.32)
    total_height = line_height * len(lines)
    y = y1 + ((y2 - y1) - total_height) / 2
    records = []
    for line in lines:
        width, _ = text_size(draw, line, font)
        x = x1 + ((x2 - x1) - width) / 2
        draw.text((round(x), round(y)), line, font=font, fill=fill)
        records.append(
            {
                "text": line,
                "box": [x1, round(y), x2, round(y + line_height)],
                "font": "Microsoft JhengHei Bold" if bold else "Microsoft JhengHei",
                "font_size_px": font.size,
            }
        )
        y += line_height
    return records


def draw_badge(draw: ImageDraw.ImageDraw, teacher: bool) -> dict:
    target = box(760, 38, 895, 76)
    fill = "#F8E4DF" if teacher else "#E5F1F9"
    outline = ANSWER if teacher else BLUE
    draw.rounded_rectangle(target, radius=py(12), fill=fill, outline=outline, width=py(1.5))
    return fit_single_line(
        draw,
        (target[0] + px(8), target[1] + py(2), target[2] - px(8), target[3] - py(2)),
        "教師答案樣稿" if teacher else "學生樣稿",
        12.5,
        10,
        bold=True,
        fill=outline,
        align="center",
    )


def draw_card_label(
    draw: ImageDraw.ImageDraw,
    target: tuple[int, int, int, int],
    prefix: str,
    label: str,
    *,
    answer: bool = False,
) -> list[dict]:
    x1, y1, x2, y2 = target
    prefix_font = en_font(13.5)
    label_font = zh_font(13.5, bold=answer)
    prefix_width, prefix_height = text_size(draw, prefix, prefix_font)
    label_width, label_height = text_size(draw, label, label_font)
    total_width = prefix_width + px(10) + label_width
    x = x1 + px(10)
    if total_width > x2 - x1 - px(16):
        label_font = zh_font(12.2, bold=answer)
        label_width, label_height = text_size(draw, label, label_font)
    y = y1 + ((y2 - y1) - max(prefix_height, label_height)) / 2
    draw.text((x, round(y)), prefix, font=prefix_font, fill=ANSWER if answer else TEAL)
    draw.text((x + prefix_width + px(10), round(y)), label, font=label_font, fill=ANSWER if answer else INK)
    return [
        {
            "text": prefix,
            "box": [x, round(y), x + prefix_width, round(y + prefix_height)],
            "font": "Comic Relief Regular",
            "font_size_px": prefix_font.size,
        },
        {
            "text": label,
            "box": [x + prefix_width + px(10), round(y), x2, round(y + label_height)],
            "font": "Microsoft JhengHei Bold" if answer else "Microsoft JhengHei",
            "font_size_px": label_font.size,
        },
    ]


def add_teacher_answer_graphics(page: Image.Image) -> Image.Image:
    overlay = Image.new("RGBA", PAGE_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Matching answers: A->2, B->3, C->1.
    left_centers = [(402, 632), (402, 693), (402, 753)]
    right_centers = [(613, 632), (613, 693), (613, 753)]
    mapping = {0: 1, 1: 2, 2: 0}
    for left_index, right_index in mapping.items():
        sx0, sy0 = left_centers[left_index]
        ex0, ey0 = right_centers[right_index]
        points = [
            (px(sx0), py(sy0)),
            (px(468), py(sy0)),
            (px(548), py(ey0)),
            (px(ex0), py(ey0)),
        ]
        draw.line(points, fill=(166, 56, 46, 225), width=py(4), joint="curve")

    # Four-color answer overlay on the exact 12-part diagram.
    center = (307, 1093)
    bays = [
        (80, 1031),
        (106, 983),
        (137, 940),
        (174, 906),
        (219, 882),
        (269, 868),
        (322, 868),
        (374, 881),
        (423, 906),
        (467, 941),
        (504, 984),
        (534, 1032),
    ]
    cx, cy = center
    for bx, by in bays:
        dx, dy = bx - cx, by - cy
        length = math.hypot(dx, dy)
        ux, uy = dx / length, dy / length
        start = (cx + ux * 49, cy + uy * 49)
        end = (bx - ux * 23, by - uy * 23)
        draw.line(
            (px(start[0]), py(start[1]), px(end[0]), py(end[1])),
            fill=(54, 125, 176, 210),
            width=py(4.2),
        )

        vx, vy = -uy, ux
        half_long, half_wide = 23, 14
        polygon = [
            (px(bx + ux * half_long + vx * half_wide), py(by + uy * half_long + vy * half_wide)),
            (px(bx + ux * half_long - vx * half_wide), py(by + uy * half_long - vy * half_wide)),
            (px(bx - ux * half_long - vx * half_wide), py(by - uy * half_long - vy * half_wide)),
            (px(bx - ux * half_long + vx * half_wide), py(by - uy * half_long + vy * half_wide)),
        ]
        draw.polygon(polygon, fill=(94, 153, 105, 125), outline=(62, 121, 73, 240), width=py(2))

    draw.ellipse(box(251, 1037, 363, 1149), fill=(197, 77, 63, 95), outline=(166, 56, 46, 240), width=py(4))
    draw.rounded_rectangle(box(296, 1122, 321, 1166), radius=py(4), fill=(241, 184, 75, 220), outline=(100, 76, 26, 240), width=py(2))
    return Image.alpha_composite(page.convert("RGBA"), overlay).convert("RGB")


def build_page(master_path: Path, output_path: Path, teacher: bool) -> dict:
    with Image.open(master_path) as source:
        if source.size != BASE_SIZE:
            raise AssertionError(f"Unexpected master size: {master_path.name} {source.size}")
        page = source.convert("RGB").resize(PAGE_SIZE, Image.Resampling.LANCZOS)

    if teacher:
        page = add_teacher_answer_graphics(page)
    draw = ImageDraw.Draw(page)
    text_records: list[dict] = []

    text_records.append(
        fit_single_line(draw, box(130, 48, 750, 105), "個人《扇形車庫解密單》", 31, 24, bold=True, fill=TEAL)
    )
    text_records.append(
        fit_single_line(
            draw,
            box(132, 108, 760, 145),
            "第2節｜何時－構件－功能｜先獨立完成8分鐘",
            14,
            11,
            fill=GRAY,
        )
    )
    text_records.append(draw_badge(draw, teacher))

    for x, label in ((50, "班級："), (359, "座號："), (670, "姓名：")):
        text_records.append(fit_single_line(draw, box(x, 171, x + 92, 199), label, 13, 10.5, fill=GRAY))

    section_titles = [
        ("1｜由來小偵探：從資料句條找出時間線", box(82, 228, 885, 264)),
        ("2｜構件找功能：把每個構件連到正確功能", box(82, 543, 885, 580)),
        ("3｜四色位置解密：依圖例在圖中標出位置", box(82, 810, 885, 846)),
        ("4｜英語定位解密：回答轉車台在哪裡", box(82, 1194, 885, 1230)),
    ]
    for title, target in section_titles:
        text_records.append(fit_single_line(draw, target, title, 20, 16, bold=True, fill=TEAL))

    origin_student = [
        "彰化扇形車庫在 ______ 年啟用，初期有 ______ 股道；",
        "後來分期增建，到 ______ 年形成 ______ 股道。",
    ]
    origin_teacher = [
        "彰化扇形車庫在 1922 年啟用，初期有 6 股道；",
        "後來分期增建，到 1933 年形成 12 股道。",
    ]
    origin = origin_teacher if teacher else origin_student
    for text, target in zip(origin, (box(90, 293, 875, 339), box(90, 352, 875, 398))):
        text_records.append(
            fit_single_line(draw, target, text, 17.5, 13.5, bold=teacher, fill=ANSWER if teacher else INK)
        )
    text_records.append(
        fit_single_line(
            draw,
            box(220, 438, 940, 486),
            "小提示：先找「何時」的兩張中文資料句條。",
            13.5,
            11,
            fill=GRAY,
        )
    )

    left_items = ["中央轉車台", "放射狀軌道", "扇形車庫庫位"]
    right_items = ["供火車頭檢修、保養與停放", "讓火車頭轉向並對準軌道", "讓火車頭進出不同庫位"]
    row_boxes = [(607, 658), (667, 718), (727, 778)]
    for index, (top, bottom) in enumerate(row_boxes):
        text_records.extend(draw_card_label(draw, box(65, top, 402, bottom), chr(65 + index), left_items[index], answer=teacher))
        text_records.extend(draw_card_label(draw, box(613, top, 891, bottom), str(index + 1), right_items[index], answer=teacher))

    legend = [
        "紅色圓形｜中央轉車台",
        "藍色線條｜放射狀軌道",
        "綠色方格｜車庫庫位",
        "黃色火車｜火車頭",
    ]
    legend_boxes = [box(667, 862, 891, 920), box(667, 930, 891, 988), box(667, 997, 891, 1055), box(667, 1064, 891, 1122)]
    for text, target in zip(legend, legend_boxes):
        text_records.append(fit_single_line(draw, target, text, 13.3, 10.5, bold=True, fill=INK))
    text_records.append(
        fit_single_line(draw, box(90, 1258, 567, 1314), "Where's the turntable?", 20.5, 17, english=True, fill=TEAL)
    )
    answer = "It's in the middle." if teacher else "It's in the __________."
    text_records.append(
        fit_single_line(
            draw,
            box(90, 1327, 567, 1385),
            answer,
            20.5,
            17,
            english=True,
            fill=ANSWER if teacher else INK,
        )
    )
    text_records.extend(
        draw_multiline_center(
            draw,
            box(625, 1260, 882, 1396),
            ["小提示：", "想想「中央」的英文。"],
            13,
            fill=GRAY,
        )
    )
    footer = "教師答案版供快速核對，請勿先讓學生看到。" if teacher else "完成後請先自己檢查，再和組員核對；不要先看教師答案版。"
    text_records.append(fit_single_line(draw, box(80, 1434, 975, 1455), footer, 9.5, 8, fill=GRAY, align="center"))

    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("title", "扇形車庫第2節個人解密單教師答案樣稿" if teacher else "扇形車庫第2節個人解密單學生樣稿")
    metadata.add_text("imagegen_master", master_path.name)
    metadata.add_text("english_font", "Comic Relief Regular")
    metadata.add_text("english_font_sha256", sha256(COMIC_RELIEF))
    metadata.add_text("text_overlay", json.dumps([item["text"] for item in text_records], ensure_ascii=False))
    page.save(output_path, format="PNG", optimize=True, pnginfo=metadata)
    page.close()
    return {
        "output": str(output_path),
        "master": str(master_path),
        "pixels": list(PAGE_SIZE),
        "sha256": sha256(output_path),
        "text_records": text_records,
    }


def make_contact_sheet(student_path: Path, teacher_path: Path, output: Path, grayscale: bool = False) -> None:
    canvas = Image.new("RGB", (2140, 1580), "#F4F0E8")
    draw = ImageDraw.Draw(canvas)
    font = zh_font(14, bold=True)
    for index, (path, label) in enumerate(((student_path, "學生版樣稿"), (teacher_path, "教師答案版樣稿"))):
        with Image.open(path) as image:
            page = image.convert("RGB")
            if grayscale:
                page = ImageOps.grayscale(page).convert("RGB")
            page.thumbnail((980, 1420), Image.Resampling.LANCZOS)
            x = 55 + index * 1045 + (980 - page.width) // 2
            y = 105 + (1420 - page.height) // 2
            canvas.paste(page, (x, y))
            label_width, label_height = text_size(draw, label, font)
            draw.text((x + (page.width - label_width) / 2, 34), label, font=font, fill=TEAL)
            draw.rectangle((x - 2, y - 2, x + page.width + 2, y + page.height + 2), outline="#B9B3A8", width=3)
    canvas.save(output, format="PNG", optimize=True)


def compare_alignment(student_path: Path, teacher_path: Path) -> dict:
    with Image.open(student_path) as student, Image.open(teacher_path) as teacher:
        student_gray = ImageOps.grayscale(student.convert("RGB")).resize((620, 877), Image.Resampling.LANCZOS)
        teacher_gray = ImageOps.grayscale(teacher.convert("RGB")).resize((620, 877), Image.Resampling.LANCZOS)
        diff = ImageChops.difference(student_gray, teacher_gray)
        histogram = diff.histogram()
        mean_absolute_difference = sum(value * count for value, count in enumerate(histogram)) / (student_gray.width * student_gray.height)
    return {
        "same_dimensions": True,
        "overlay_coordinate_system_identical": True,
        "grayscale_mean_absolute_difference_0_to_255": round(mean_absolute_difference, 3),
        "note": "教師版刻意包含答案、四色標示與紅色配對線，差異值只作讀回紀錄；兩版正式文字採同一座標表。",
    }


def main() -> None:
    required = [STUDENT_MASTER, TEACHER_MASTER, ZH_REGULAR, ZH_BOLD, COMIC_RELIEF]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing required files: " + ", ".join(missing))
    QA_DIR.mkdir(parents=True, exist_ok=True)

    comic_name = en_font(20).getname()
    if comic_name != ("Comic Relief", "Regular"):
        raise AssertionError(f"Unexpected Comic Relief font identity: {comic_name}")
    expected_font_hash = "9EF4958AB06385D91F635F83A15569786B243F9D010CFB3F9A5CDDA593C7BC22"
    actual_font_hash = sha256(COMIC_RELIEF)
    if actual_font_hash != expected_font_hash:
        raise AssertionError(f"Comic Relief hash mismatch: {actual_font_hash}")

    student = build_page(STUDENT_MASTER, STUDENT_OUTPUT, teacher=False)
    teacher = build_page(TEACHER_MASTER, TEACHER_OUTPUT, teacher=True)

    color_contact = QA_DIR / "01_學生教師版_彩色對照表.png"
    gray_contact = QA_DIR / "02_學生教師版_灰階對照表.png"
    make_contact_sheet(STUDENT_OUTPUT, TEACHER_OUTPUT, color_contact, grayscale=False)
    make_contact_sheet(STUDENT_OUTPUT, TEACHER_OUTPUT, gray_contact, grayscale=True)

    manifest = {
        "generated_on": "2026-08-26",
        "scope": "個人解密單學生版與教師答案版兩頁樣稿；未生成其餘12頁",
        "page_size": {"pixels": list(PAGE_SIZE), "dpi": 300, "paper": "A4 portrait"},
        "imagegen": {
            "student_attempts": 2,
            "student_selected": STUDENT_MASTER.name,
            "teacher_attempts": 1,
            "teacher_selected": TEACHER_MASTER.name,
            "teacher_derived_from_student": True,
        },
        "font": {
            "path": str(COMIC_RELIEF),
            "family_style": list(comic_name),
            "sha256": actual_font_hash,
            "license": "SIL Open Font License 1.1",
        },
        "content_locks": {
            "origin": ["1922年啟用，初期6股道", "1933年形成12股道"],
            "matching": {"A 中央轉車台": "2 讓火車頭轉向並對準軌道", "B 放射狀軌道": "3 讓火車頭進出不同庫位", "C 扇形車庫庫位": "1 供火車頭檢修、保養與停放"},
            "roundhouse_diagram": {"turntable": 1, "radial_tracks": 12, "bays": 12, "locomotive": 1},
            "english": {"question": "Where's the turntable?", "student": "It's in the __________.", "teacher": "It's in the middle."},
        },
        "student": student,
        "teacher": teacher,
        "alignment": compare_alignment(STUDENT_OUTPUT, TEACHER_OUTPUT),
        "qa_outputs": [
            {"path": str(color_contact), "sha256": sha256(color_contact)},
            {"path": str(gray_contact), "sha256": sha256(gray_contact)},
        ],
        "manual_gate": "等待教師確認兩頁樣稿；不得批次生成其餘12頁。",
    }
    manifest_path = QA_DIR / "03_兩頁樣稿_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
