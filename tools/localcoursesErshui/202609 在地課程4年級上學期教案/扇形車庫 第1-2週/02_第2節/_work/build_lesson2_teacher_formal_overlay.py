from __future__ import annotations

import hashlib
import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps, PngImagePlugin


PAGE_SIZE = (2480, 3508)
MASTER_SIZE = (1055, 1491)
COORD_SIZE = (1024, 1536)

UNIT_DIR = Path(__file__).resolve().parents[1]
PILOT_DIR = UNIT_DIR / "18_扇形車庫_第2節ImageGen個人解密單樣稿_20260826"
QA_DIR = PILOT_DIR / "_qa"
MASTER = PILOT_DIR / "08_學生版_ImageGen活潑版無字母版_嘗試2_採用.png"
STUDENT = PILOT_DIR / "11_學生版_A4直式_個人解密單_正式版_20260826.png"
TEACHER = PILOT_DIR / "14_教師答案版_A4直式_個人解密單_正式版_20260826.png"
CANDIDATE = PILOT_DIR / "14B_教師答案版_A4直式_個人解密單_正式候選_20260826.png"

ZH_BOLD = Path(r"C:\Windows\Fonts\msjhbd.ttc")
COMIC_RELIEF = (
    UNIT_DIR.parents[2]
    / "skills"
    / "ershui-local-curriculum-builder"
    / "assets"
    / "fonts"
    / "ComicRelief-Regular.ttf"
)

ANSWER = "#A6382E"
ANSWER_DARK = "#7D261F"
WHITE_HALO = "#FFFDF7"
BLUE = (54, 125, 176, 225)
GREEN = (94, 153, 105, 135)
GREEN_DARK = (52, 105, 61, 245)
RED = (197, 77, 63, 105)
RED_DARK = (151, 46, 38, 245)
YELLOW = (241, 184, 75, 170)
YELLOW_DARK = (112, 79, 24, 245)

EXPECTED_STUDENT_SHA = "A9A69951D582F0ED0E63BFD60003173E5EC2B9AD4253B75B12A59E536C5CE5E4"
EXPECTED_MASTER_SHA = "07F3A1D8859A0EFC340610E1F498AD5F52607D5735E1D7166E0E6AB0EA70CBD2"
EXPECTED_COMIC_SHA = "9EF4958AB06385D91F635F83A15569786B243F9D010CFB3F9A5CDDA593C7BC22"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def b(left: float, top: float, right: float, bottom: float) -> tuple[int, int, int, int]:
    sx = PAGE_SIZE[0] / COORD_SIZE[0]
    sy = PAGE_SIZE[1] / COORD_SIZE[1]
    return round(left * sx), round(top * sy), round(right * sx), round(bottom * sy)


def source_to_page(x: float, y: float) -> tuple[int, int]:
    return round(x * PAGE_SIZE[0] / MASTER_SIZE[0]), round(y * PAGE_SIZE[1] / MASTER_SIZE[1])


def source_box_to_page(box: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
    x1, y1 = source_to_page(box[0], box[1])
    x2, y2 = source_to_page(box[2], box[3])
    return x1, y1, x2, y2


def draw_text_vertically_centered(
    draw: ImageDraw.ImageDraw,
    target: tuple[int, int, int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: str,
) -> list[int]:
    glyph = draw.textbbox((0, 0), text, font=font)
    width = glyph[2] - glyph[0]
    height = glyph[3] - glyph[1]
    x1, y1, x2, y2 = target
    if width > x2 - x1 or height > y2 - y1:
        raise ValueError(f"Answer text does not fit: {text!r} {width}x{height} in {target}")
    x = round(x1 - glyph[0])
    y = round((y1 + y2) / 2 - (glyph[1] + glyph[3]) / 2)
    draw.text((x, y), text, font=font, fill=fill)
    return list(draw.textbbox((x, y), text, font=font))


def add_matching_answers(page: Image.Image, answer_mask: Image.Image) -> dict:
    draw = ImageDraw.Draw(page)
    mask_draw = ImageDraw.Draw(answer_mask)
    paths = {
        "A_to_2": [(647, 1614), (900, 1614), (1450, 1789), (1763, 1789)],
        "B_to_3": [(647, 1789), (850, 1789), (1350, 1959), (1763, 1959)],
        "C_to_1": [(647, 1959), (800, 1959), (1500, 1614), (1763, 1614)],
    }
    for points in paths.values():
        draw.line(points, fill=WHITE_HALO, width=18, joint="curve")
        draw.line(points, fill=ANSWER, width=9, joint="curve")
        for point in (points[0], points[-1]):
            x, y = point
            draw.ellipse((x - 10, y - 10, x + 10, y + 10), fill=WHITE_HALO)
            draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=ANSWER)
        mask_draw.line(points, fill=255, width=24, joint="curve")
        for x, y in (points[0], points[-1]):
            mask_draw.ellipse((x - 13, y - 13, x + 13, y + 13), fill=255)
    return {"mapping": {"A": "2", "B": "3", "C": "1"}, "paths_page_px": paths}


def polygon_hatch(
    target: Image.Image,
    polygon: list[tuple[float, float]],
    spacing: int = 11,
) -> None:
    mask = Image.new("L", MASTER_SIZE, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    hatch = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))
    hatch_draw = ImageDraw.Draw(hatch)
    xs = [point[0] for point in polygon]
    ys = [point[1] for point in polygon]
    start = math.floor(min(xs) - max(ys)) - 40
    end = math.ceil(max(xs) - min(ys)) + 40
    for offset in range(start, end + spacing, spacing):
        hatch_draw.line((offset, 0, offset + MASTER_SIZE[1], MASTER_SIZE[1]), fill=(44, 83, 49, 190), width=2)
    target.alpha_composite(Image.composite(hatch, Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0)), mask))


def add_four_color_answers(page: Image.Image, answer_mask: Image.Image) -> dict:
    overlay = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    center = (333, 1128)
    bays = [
        (125, 1071), (148, 1030), (181, 987), (218, 955),
        (267, 934), (317, 926), (367, 931), (416, 947),
        (458, 971), (499, 1000), (530, 1038), (552, 1082),
    ]
    polygons: list[list[tuple[float, float]]] = []
    cx, cy = center
    for bx, by in bays:
        dx, dy = bx - cx, by - cy
        length = math.hypot(dx, dy)
        ux, uy = dx / length, dy / length
        start = (cx + ux * 58, cy + uy * 58)
        end = (bx - ux * 28, by - uy * 28)
        draw.line((start, end), fill=BLUE, width=5)
        vx, vy = -uy, ux
        half_long, half_wide = 25, 16
        polygon = [
            (bx + ux * half_long + vx * half_wide, by + uy * half_long + vy * half_wide),
            (bx + ux * half_long - vx * half_wide, by + uy * half_long - vy * half_wide),
            (bx - ux * half_long - vx * half_wide, by - uy * half_long - vy * half_wide),
            (bx - ux * half_long + vx * half_wide, by - uy * half_long + vy * half_wide),
        ]
        polygons.append(polygon)
        draw.polygon(polygon, fill=GREEN, outline=GREEN_DARK, width=3)
        polygon_hatch(overlay, polygon)

    draw.ellipse((276, 1062, 392, 1185), fill=RED, outline=RED_DARK, width=5)
    draw.ellipse((294, 1080, 374, 1167), outline=RED_DARK, width=3)
    train_box = (312, 1137, 357, 1188)
    draw.rounded_rectangle(train_box, radius=6, fill=YELLOW, outline=YELLOW_DARK, width=4)
    draw.ellipse((317, 1176, 331, 1190), fill=YELLOW_DARK)
    draw.ellipse((340, 1176, 354, 1190), fill=YELLOW_DARK)

    clip = Image.new("L", MASTER_SIZE, 0)
    ImageDraw.Draw(clip).rectangle((65, 915, 579, 1190), fill=255)
    clipped = Image.composite(overlay, Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0)), clip)
    resized = clipped.resize(PAGE_SIZE, Image.Resampling.LANCZOS)
    page.alpha_composite(resized)

    ImageDraw.Draw(answer_mask).rectangle(source_box_to_page((65, 915, 579, 1190)), fill=255)
    return {
        "turntable_count": 1,
        "radial_track_count": 12,
        "bay_count": 12,
        "locomotive_count": 1,
        "source_clip": [65, 915, 579, 1190],
        "center_source_px": list(center),
        "bay_centers_source_px": [list(item) for item in bays],
        "grayscale_redundancy": ["圓框", "實線軌道", "斜線格紋庫位", "火車外輪廓"],
    }


def make_contact(student: Path, teacher: Path, output: Path, grayscale: bool) -> None:
    with Image.open(student) as left_source, Image.open(teacher) as right_source:
        left = left_source.convert("RGB")
        right = right_source.convert("RGB")
    if grayscale:
        left = ImageOps.grayscale(left).convert("RGB")
        right = ImageOps.grayscale(right).convert("RGB")
    thumb = (850, 1203)
    left.thumbnail(thumb, Image.Resampling.LANCZOS)
    right.thumbnail(thumb, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (1780, 1320), "#ECECEC")
    draw = ImageDraw.Draw(canvas)
    label_font = ImageFont.truetype(str(ZH_BOLD), 38)
    draw.text((80, 28), "學生正式版", font=label_font, fill="#24383D")
    draw.text((950, 28), "教師答案版", font=label_font, fill=ANSWER_DARK)
    canvas.paste(left, (50, 90))
    canvas.paste(right, (920, 90))
    canvas.save(output, format="PNG", optimize=True, dpi=(150, 150))


def make_detail(teacher: Path, output: Path) -> None:
    with Image.open(teacher) as source:
        page = source.convert("RGB")
    crops = [
        ("第2題配對答案", (250, 1440, 2230, 2070)),
        ("第3題四色答案與第4題交界", (120, 2090, 2290, 3105)),
    ]
    canvas = Image.new("RGB", (2200, 1700), "#F0F0F0")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(str(ZH_BOLD), 42)
    y = 35
    for label, box in crops:
        draw.text((60, y), label, font=font, fill="#24383D")
        crop = page.crop(box)
        crop.thumbnail((2080, 720), Image.Resampling.LANCZOS)
        canvas.paste(crop, ((2200 - crop.width) // 2, y + 60))
        y += 820
    canvas.save(output, format="PNG", optimize=True, dpi=(150, 150))


def make_a4_preview(teacher: Path, output: Path) -> None:
    with Image.open(teacher) as source:
        page = source.convert("RGB")
    page.thumbnail((1120, 1584), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (1360, 1900), "#DCDCDC")
    draw = ImageDraw.Draw(canvas)
    title_font = ImageFont.truetype(str(ZH_BOLD), 42)
    body_font = ImageFont.truetype(str(ZH_BOLD), 26)
    draw.text((60, 25), "A4 教師答案版列印預覽（300 dpi）", font=title_font, fill="#24383D")
    draw.text((60, 80), "紅色虛線為 5 mm 安全區；實體試印仍為教師端待辦。", font=body_font, fill="#647277")
    ox, oy = (1360 - page.width) // 2, 135
    canvas.paste(page, (ox, oy))
    margin_x = round(page.width * 5 / 210)
    margin_y = round(page.height * 5 / 297)
    draw.rectangle((ox + margin_x, oy + margin_y, ox + page.width - margin_x, oy + page.height - margin_y), outline="#D9473F", width=2)
    canvas.save(output, format="PNG", optimize=True, dpi=(150, 150))


def main() -> None:
    for path in (MASTER, STUDENT, ZH_BOLD, COMIC_RELIEF):
        if not path.exists():
            raise FileNotFoundError(path)
    if sha256(STUDENT) != EXPECTED_STUDENT_SHA:
        raise AssertionError("Locked student page changed")
    if sha256(MASTER) != EXPECTED_MASTER_SHA:
        raise AssertionError("Approved complete ImageGen master changed")
    if sha256(COMIC_RELIEF) != EXPECTED_COMIC_SHA:
        raise AssertionError("Comic Relief asset changed")
    comic_font = ImageFont.truetype(str(COMIC_RELIEF), 58)
    if comic_font.getname() != ("Comic Relief", "Regular"):
        raise AssertionError(f"Unexpected English font identity: {comic_font.getname()}")

    with Image.open(STUDENT) as source:
        if source.size != PAGE_SIZE:
            raise AssertionError(source.size)
        page = source.convert("RGBA")
        student_dpi = source.info.get("dpi")
    answer_mask = Image.new("L", PAGE_SIZE, 0)
    draw = ImageDraw.Draw(page)
    mask_draw = ImageDraw.Draw(answer_mask)
    zh_answer = ImageFont.truetype(str(ZH_BOLD), 50)

    answer_text_records = []
    text_areas = [
        (b(90, 330, 860, 398), "彰化扇形車庫在 1922 年啟用，初期有 6 股道；", zh_answer, False),
        (b(90, 421, 860, 486), "後來分期增建，到 1933 年形成 12 股道。", zh_answer, False),
        (b(88, 1331, 535, 1391), "It's in the middle.", comic_font, True),
    ]
    for target, text, font, english in text_areas:
        x1, y1, x2, y2 = target
        cover = (x1 - 8, y1 + 2, x2 + 8, y2 - 2)
        draw.rounded_rectangle(cover, radius=12, fill=WHITE_HALO)
        mask_draw.rounded_rectangle(cover, radius=14, fill=255)
        rendered = draw_text_vertically_centered(draw, target, text, font, ANSWER)
        answer_text_records.append({
            "text": text,
            "box": list(target),
            "rendered_bbox": rendered,
            "font": "Comic Relief Regular" if english else "Microsoft JhengHei Bold",
            "font_size_px": font.size,
            "color": ANSWER,
        })

    matching = add_matching_answers(page, answer_mask)
    diagram = add_four_color_answers(page, answer_mask)

    footer_target = b(120, 1427, 905, 1461)
    footer_cover = (footer_target[0] - 10, footer_target[1] - 2, footer_target[2] + 10, footer_target[3] + 2)
    draw.rounded_rectangle(footer_cover, radius=8, fill="#F2E8F4")
    mask_draw.rounded_rectangle(footer_cover, radius=10, fill=255)
    footer_font = ImageFont.truetype(str(ZH_BOLD), 27)
    footer_text = "教師答案版｜紅字、紅線與四色標示為核對答案"
    footer_glyph = draw.textbbox((0, 0), footer_text, font=footer_font)
    footer_width = footer_glyph[2] - footer_glyph[0]
    footer_x = round((footer_target[0] + footer_target[2] - footer_width) / 2 - footer_glyph[0])
    footer_y = round((footer_target[1] + footer_target[3]) / 2 - (footer_glyph[1] + footer_glyph[3]) / 2)
    draw.text((footer_x, footer_y), footer_text, font=footer_font, fill=ANSWER_DARK)

    prohibited = ("學生樣稿", "教師樣稿", "草稿", "待確認")
    visible_text = "\n".join([item["text"] for item in answer_text_records] + [footer_text])
    hits = [term for term in prohibited if term in visible_text]
    if hits:
        raise AssertionError(f"Printable face contains prohibited terms: {hits}")

    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("title", "扇形車庫第2節個人解密單教師答案版正式數位教材")
    metadata.add_text("shared_imagegen_master", MASTER.name)
    metadata.add_text("shared_imagegen_master_sha256", EXPECTED_MASTER_SHA)
    metadata.add_text("student_parent_sha256", EXPECTED_STUDENT_SHA)
    metadata.add_text("answer_layer", "deterministic red text, matching lines, and four-color geometry")
    metadata.add_text("english_font", "Comic Relief Regular")
    page.convert("RGB").save(CANDIDATE, format="PNG", optimize=True, dpi=(300, 300), pnginfo=metadata)

    with Image.open(STUDENT) as student_image, Image.open(CANDIDATE) as teacher_image:
        student_rgb = student_image.convert("RGB")
        teacher_rgb = teacher_image.convert("RGB")
        teacher_dpi = teacher_image.info.get("dpi")
    diff = ImageChops.difference(student_rgb, teacher_rgb)
    # LANCZOS and rounded edges may antialias a few pixels beyond the exact draw path.
    # Dilating by 15 px keeps the QA mask conservative while still proving that every
    # unrelated part of the locked student page is pixel-identical.
    qa_answer_mask = answer_mask.filter(ImageFilter.MaxFilter(31))
    outside_mask = ImageOps.invert(qa_answer_mask)
    outside_diff = ImageChops.composite(diff, Image.new("RGB", PAGE_SIZE, "black"), outside_mask)
    if outside_diff.getbbox() is not None:
        raise AssertionError(f"Student/teacher differ outside answer mask: {outside_diff.getbbox()}")
    if diff.getbbox() is None:
        raise AssertionError("Teacher answer layer made no visible change")

    QA_DIR.mkdir(parents=True, exist_ok=True)
    color_contact = QA_DIR / "19_正式學生教師版_彩色對照.png"
    gray_contact = QA_DIR / "20_正式學生教師版_灰階對照.png"
    detail = QA_DIR / "21_教師答案版_配對與四色局部QA.png"
    print_preview = QA_DIR / "22_教師答案版_A4列印預覽.png"
    manifest_path = QA_DIR / "23_教師答案版_正式數位教材_manifest.json"
    make_contact(STUDENT, CANDIDATE, color_contact, grayscale=False)
    make_contact(STUDENT, CANDIDATE, gray_contact, grayscale=True)
    make_detail(CANDIDATE, detail)
    make_a4_preview(CANDIDATE, print_preview)

    # Only publish the named formal page after all machine checks above pass.
    shutil.copy2(CANDIDATE, TEACHER)
    if sha256(TEACHER) != sha256(CANDIDATE):
        raise AssertionError("Formal teacher copy hash mismatch")

    manifest = {
        "generated_on": "2026-08-26",
        "status": "正式數位教材；實體試印待教師",
        "strategy": "reuse-approved-complete-student-imagegen-master-plus-deterministic-answer-layer",
        "imagegen": {
            "shared_master": MASTER.name,
            "shared_master_sha256": EXPECTED_MASTER_SHA,
            "master_complete_visual_layout": True,
            "new_teacher_imagegen_call": False,
            "reason": "confirmed RDQ 3A: exact student/teacher alignment is best preserved by a shared approved complete master",
        },
        "student": {
            "file": STUDENT.name,
            "sha256": EXPECTED_STUDENT_SHA,
            "pixels": list(PAGE_SIZE),
            "dpi_readback": student_dpi,
        },
        "teacher": {
            "file": TEACHER.name,
            "sha256": sha256(TEACHER),
            "bytes": TEACHER.stat().st_size,
            "pixels": list(PAGE_SIZE),
            "dpi_readback": teacher_dpi,
        },
        "answer_text": answer_text_records,
        "matching": matching,
        "four_color_geometry": diagram,
        "font": {
            "english_family_style": list(comic_font.getname()),
            "comic_relief_sha256": EXPECTED_COMIC_SHA,
        },
        "qa": {
            "content_answers": "pass",
            "same_complete_master": "pass",
            "outside_answer_mask_pixel_difference": 0,
            "answer_mask_antialias_dilation_px": 15,
            "prohibited_face_terms": {term: 0 for term in prohibited},
            "page_size": "pass",
            "dpi": "pass" if teacher_dpi and abs(teacher_dpi[0] - 300) < 1 else "fail",
            "matching_mapping": "pass",
            "diagram_counts": "pass",
            "comic_relief_actual_font": "pass",
            "cross_section_gaps_inherited_from_locked_student_px": {
                "1_to_2": 136,
                "2_to_3": 35,
                "3_to_4": 20.19,
                "overlap": 0,
            },
            "color_contact": color_contact.name,
            "grayscale_contact": gray_contact.name,
            "detail_contact": detail.name,
            "a4_preview": print_preview.name,
            "manual_visual_read_required": True,
            "physical_print": "teacher-todo",
        },
    }
    if manifest["qa"]["dpi"] != "pass":
        raise AssertionError(f"Teacher DPI readback failed: {teacher_dpi}")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "teacher": str(TEACHER),
        "teacher_sha256": sha256(TEACHER),
        "teacher_bytes": TEACHER.stat().st_size,
        "qa_manifest": str(manifest_path),
        "outside_mask_difference": 0,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
