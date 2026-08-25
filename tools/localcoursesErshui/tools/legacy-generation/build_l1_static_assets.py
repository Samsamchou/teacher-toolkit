from __future__ import annotations

import csv
import importlib.util
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


# This script lives in <project>/tools/legacy-generation/.
# Resolve the active project root so the generator also works after the
# canonical project moved from C: to Google Drive.
ROOT = Path(__file__).resolve().parents[2]
UNIT_DIR = ROOT / "在地課程4年級上學期教案" / "02_第3-10週_坐火車趣集集 教材"
REF_DIR = UNIT_DIR / "00_查證與清冊" / "references"
PROMPT_DIR = UNIT_DIR / "00_查證與清冊" / "prompts"
WARMUP_DIR = UNIT_DIR / "01_二水站暖身圖"
ING_DIR = UNIT_DIR / "02_一致性參考板"
SB_DIR = UNIT_DIR / "03_12張分鏡圖"
CLEAN_DIR = SB_DIR / "clean_masters"
CONTACT_DIR = UNIT_DIR / "06_聯絡表"

W, H = 1920, 1080
MSJH = Path(r"C:\Windows\Fonts\msjh.ttc")
COMIC = Path(r"C:\Windows\Fonts\comic.ttf")
COMIC_BOLD = Path(r"C:\Windows\Fonts\comicbd.ttf")

NAVY = "#153B63"
RED = "#D84A3A"
GOLD = "#F4B942"
BLUE = "#2F80C3"
GREEN = "#4C9B66"
CREAM = "#FFF7E7"
INK = "#1E2A35"
PALE_BLUE = "#EAF5FF"

STOPS = [
    ("二水", "Ershui"),
    ("源泉", "Yuanquan"),
    ("濁水", "Zhuoshui"),
    ("龍泉", "Longquan"),
    ("集集", "Jiji"),
    ("水里", "Shuili"),
    ("車埕", "Checheng"),
]

SHOT_META = {
    "01": ("集集線", "Jiji Line", 0),
    "02": ("二水站", "Ershui Station", 0),
    "03": ("二水站", "Ershui Station", 0),
    "04": ("二水—源泉", "Ershui–Yuanquan", 1),
    "05": ("濁水—龍泉", "Zhuoshui–Longquan", 3),
    "06": ("龍泉—集集", "Longquan–Jiji", 4),
    "07": ("集集站", "Jiji Station", 4),
    "08": ("集集小鎮", "Jiji Town", 4),
    "09": ("水里站", "Shuili Station", 5),
    "10": ("車埕站", "Checheng Station", 6),
    "11": ("車埕山城", "Checheng", 6),
    "12": ("路線回顧", "Route Review", 6),
}


def font(path: Path, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size, index=index)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def cover(im: Image.Image, size: tuple[int, int], focus: tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    im = ImageOps.exif_transpose(im).convert("RGB")
    tw, th = size
    scale = max(tw / im.width, th / im.height)
    nw, nh = round(im.width * scale), round(im.height * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = round((nw - tw) * focus[0])
    top = round((nh - th) * focus[1])
    left = min(max(0, left), max(0, nw - tw))
    top = min(max(0, top), max(0, nh - th))
    return im.crop((left, top, left + tw, top + th))


def contain(im: Image.Image, size: tuple[int, int], bg: str = "white") -> Image.Image:
    im = ImageOps.exif_transpose(im).convert("RGB")
    fitted = ImageOps.contain(im, size, Image.Resampling.LANCZOS)
    out = Image.new("RGB", size, bg)
    out.paste(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
    return out


def paste_card(
    canvas: Image.Image,
    im: Image.Image,
    box: tuple[int, int, int, int],
    radius: int = 28,
    shadow: int = 12,
    focus: tuple[float, float] = (0.5, 0.5),
) -> None:
    x0, y0, x1, y1 = box
    cw, ch = x1 - x0, y1 - y0
    card = cover(im, (cw, ch), focus=focus)
    mask = rounded_mask((cw, ch), radius)
    if shadow:
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(sh)
        sd.rounded_rectangle((x0 + shadow, y0 + shadow, x1 + shadow, y1 + shadow), radius=radius, fill=(15, 35, 55, 70))
        sh = sh.filter(ImageFilter.GaussianBlur(shadow))
        canvas.alpha_composite(sh)
    canvas.paste(card.convert("RGBA"), (x0, y0), mask)


def draw_text_center(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    text_font: ImageFont.FreeTypeFont,
    fill: str,
    stroke_width: int = 0,
    stroke_fill: str | None = None,
) -> None:
    x0, y0, x1, y1 = box
    b = draw.textbbox((0, 0), text, font=text_font, stroke_width=stroke_width)
    x = x0 + (x1 - x0 - (b[2] - b[0])) / 2
    y = y0 + (y1 - y0 - (b[3] - b[1])) / 2 - b[1]
    draw.text(
        (x, y),
        text,
        font=text_font,
        fill=fill,
        stroke_width=stroke_width,
        stroke_fill=stroke_fill or fill,
    )


def save_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(path, "PNG", optimize=True)


def make_warmups() -> None:
    base = Image.new("RGBA", (W, H), "#EAF4F7")
    paste_card(base, Image.open(REF_DIR / "ershui_02.jpg"), (36, 36, 1200, 1044), focus=(0.55, 0.48))
    paste_card(base, Image.open(REF_DIR / "ershui_03.jpg"), (1238, 36, 1884, 516), focus=(0.65, 0.62))
    paste_card(base, Image.open(REF_DIR / "ershui_01.jpg"), (1238, 564, 1884, 1044), focus=(0.58, 0.68))

    # The slim borders make the three evidence areas easy to scan without revealing answers.
    d = ImageDraw.Draw(base)
    for box in ((36, 36, 1200, 1044), (1238, 36, 1884, 516), (1238, 564, 1884, 1044)):
        d.rounded_rectangle(box, radius=28, outline="white", width=5)

    a = base.copy()
    save_png(a, WARMUP_DIR / "L1_Warmup_ErshuiStation_A_clean.png")

    b = base.copy()
    bd = ImageDraw.Draw(b, "RGBA")
    # Station name on the station facade, platform zone, and visible rail zone.
    bd.rounded_rectangle((500, 90, 1125, 300), radius=28, outline=(244, 185, 66, 255), width=14)
    bd.rounded_rectangle((1282, 250, 1835, 485), radius=28, outline=(76, 155, 102, 255), width=14)
    bd.rounded_rectangle((1265, 735, 1838, 1018), radius=28, outline=(47, 128, 195, 255), width=14)
    save_png(b, WARMUP_DIR / "L1_Warmup_ErshuiStation_B_clues.png")

    c = b.copy()
    cd = ImageDraw.Draw(c, "RGBA")
    label_font_zh = font(MSJH, 42)
    label_font_en = font(COMIC_BOLD, 32)
    for box, color, zh, en, anchor in [
        ((500, 315, 950, 435), GOLD, "站名牌", "sign", (745, 300)),
        ((1265, 90, 1815, 215), GREEN, "月臺", "platform", (1510, 250)),
        ((1260, 585, 1820, 710), BLUE, "鐵軌", "track", (1500, 735)),
    ]:
        x0, y0, x1, y1 = box
        cd.rounded_rectangle(box, radius=24, fill="white", outline=color, width=7)
        cd.text((x0 + 24, y0 + 14), zh, font=label_font_zh, fill=INK)
        cd.text((x0 + 220, y0 + 24), en, font=label_font_en, fill=color)
        sx = (x0 + x1) // 2
        sy = y1
        cd.line((sx, sy, anchor[0], anchor[1]), fill=color, width=8)
        ang = math.atan2(anchor[1] - sy, anchor[0] - sx)
        pts = [
            anchor,
            (anchor[0] - 20 * math.cos(ang - 0.55), anchor[1] - 20 * math.sin(ang - 0.55)),
            (anchor[0] - 20 * math.cos(ang + 0.55), anchor[1] - 20 * math.sin(ang + 0.55)),
        ]
        cd.polygon(pts, fill=color)

    strip = (36, 900, 1200, 1044)
    cd.rounded_rectangle(strip, radius=26, fill=(21, 59, 99, 235))
    cd.text((82, 920), "What’s this?", font=font(COMIC_BOLD, 48), fill="white")
    cd.text((460, 920), "It’s a station.", font=font(COMIC, 48), fill="#FFE6A8")
    cd.rounded_rectangle((64, 62, 500, 146), radius=22, fill=(21, 59, 99, 232))
    cd.text((88, 77), "二水站", font=font(MSJH, 36), fill="white")
    cd.text((245, 83), "Ershui Station", font=font(COMIC_BOLD, 26), fill="#FFE6A8")
    save_png(c, WARMUP_DIR / "L1_Warmup_ErshuiStation_C_answer.png")


def make_station_reference() -> None:
    canvas = Image.new("RGBA", (W, H), CREAM)
    d = ImageDraw.Draw(canvas, "RGBA")
    d.rounded_rectangle((34, 28, 1886, 1050), radius=36, fill="white", outline=NAVY, width=5)
    d.text((74, 54), "集集線車站一致性參考板", font=font(MSJH, 54), fill=NAVY)
    d.text((74, 125), "Station reference board", font=font(COMIC_BOLD, 34), fill=RED)

    cards = [
        ("二水站", "Ershui Station", REF_DIR / "ershui_02.jpg", "官方站體照片", (0.55, 0.48)),
        ("集集站", "Jiji Station", REF_DIR / "jiji_station.jpg", "官方景點照片", (0.5, 0.52)),
        ("水里站", "Shuili Station", REF_DIR / "sign_shuili.png", "官方站牌資料", (0.5, 0.5)),
        ("車埕站", "Checheng Station", REF_DIR / "checheng_station.jpg", "官方景點照片", (0.5, 0.52)),
    ]
    x_positions = [70, 535, 1000, 1465]
    for i, (zh, en, path, source_note, focus) in enumerate(cards):
        x = x_positions[i]
        box = (x, 220, x + 390, 735)
        d.rounded_rectangle((x - 8, 200, x + 398, 945), radius=28, fill="#F8FBFF", outline="#C9DCEE", width=4)
        im = Image.open(path)
        if i == 2:
            # Official Shuili station sign is used; no AI station exterior is presented as a real photo.
            panel = Image.new("RGB", (390, 515), "#EEF7EC")
            pd = ImageDraw.Draw(panel)
            pd.polygon([(60, 430), (145, 330), (225, 420), (295, 300), (370, 430)], fill="#78A96B")
            pd.rectangle((108, 390, 285, 485), fill="#F0D5A8", outline=NAVY, width=5)
            pd.polygon([(95, 390), (197, 330), (300, 390)], fill="#8B5F3C")
            sign = contain(im, (300, 170), bg="white")
            panel.paste(sign, (45, 35))
            canvas.paste(panel, (x, 220), rounded_mask((390, 515), 24))
        else:
            paste_card(canvas, im, box, radius=24, shadow=0, focus=focus)
        draw_text_center(d, (x, 760, x + 390, 820), zh, font(MSJH, 40), NAVY)
        draw_text_center(d, (x, 820, x + 390, 870), en, font(COMIC_BOLD, 27), RED)
        draw_text_center(d, (x, 875, x + 390, 920), source_note, font(MSJH, 22), "#556573")

    d.rounded_rectangle((70, 968, 1850, 1020), radius=18, fill=PALE_BLUE)
    d.text((92, 981), "用途：鎖定站體特徵與站名；水里使用官方站牌資料，不把示意站房冒充現況照片。", font=font(MSJH, 24), fill=INK)
    save_png(canvas, ING_DIR / "L1_ING02_station_reference.png")


def normalize_train_reference() -> None:
    path = ING_DIR / "L1_ING01_train_reference.png"
    if not path.exists():
        raise FileNotFoundError(path)
    im = Image.open(path).convert("RGB")
    if im.size != (W, H):
        im = im.resize((W, H), Image.Resampling.LANCZOS)
        save_png(im, path)


def make_route_reference() -> None:
    canvas = Image.new("RGBA", (W, H), "#F7FBFE")
    d = ImageDraw.Draw(canvas, "RGBA")
    d.rounded_rectangle((32, 28, 1888, 1050), radius=38, fill="white", outline=NAVY, width=5)
    d.text((76, 54), "集集線路線與色彩一致性參考板", font=font(MSJH, 52), fill=NAVY)
    d.text((76, 122), "Route order · terrain cues · safe areas", font=font(COMIC_BOLD, 31), fill=RED)

    # Terrain zones.
    d.rounded_rectangle((76, 230, 1844, 760), radius=36, fill="#F7F5E8", outline="#D7E3E9", width=3)
    d.rectangle((76, 600, 1844, 760), fill="#DFF0C7")
    d.polygon([(76, 590), (260, 470), (430, 590), (610, 420), (760, 590)], fill="#B6D99B")
    d.polygon([(1100, 590), (1280, 380), (1460, 590), (1620, 430), (1844, 590)], fill="#8FB67A")
    d.line((76, 690, 1844, 690), fill="#6EA6C8", width=34)
    d.line((76, 690, 1844, 690), fill="#A6D3E6", width=16)

    pts = [(160, 620), (410, 590), (650, 565), (880, 520), (1130, 455), (1420, 395), (1730, 335)]
    d.line(pts, fill="#6D2720", width=20, joint="curve")
    d.line(pts, fill=RED, width=11, joint="curve")

    for idx, ((zh, en), (x, y)) in enumerate(zip(STOPS, pts)):
        major = idx in (0, 4, 6)
        r = 21 if major else 15
        fill = GOLD if idx == 0 else ("#E4873E" if idx == 4 else ("#8E67B4" if idx == 6 else "white"))
        d.ellipse((x - r, y - r, x + r, y + r), fill=fill, outline=NAVY, width=5)
        if idx == 6:
            d.ellipse((x - r - 9, y - r - 9, x + r + 9, y + r + 9), outline="#8E67B4", width=5)
        tx = x - (80 if idx < 6 else 150)
        ty = y + (32 if idx % 2 == 0 else -92)
        d.rounded_rectangle((tx, ty, tx + 175, ty + 70), radius=18, fill=(255, 255, 255, 235), outline="#C7D8E5", width=3)
        draw_text_center(d, (tx, ty + 3, tx + 175, ty + 38), zh, font(MSJH, 25), NAVY)
        draw_text_center(d, (tx, ty + 37, tx + 175, ty + 66), en, font(COMIC, 18), "#B64638")

    # Direction and source note.
    d.line((1630, 220, 1790, 220), fill=NAVY, width=8)
    d.polygon([(1790, 220), (1758, 201), (1758, 239)], fill=NAVY)
    d.text((1610, 170), "往車埕", font=font(MSJH, 28), fill=NAVY)
    d.text((1715, 170), "To Checheng", font=font(COMIC_BOLD, 22), fill=RED)

    # Subtitle-safe area and palette.
    d.rounded_rectangle((76, 800, 1240, 985), radius=26, fill=(21, 59, 99, 238))
    d.text((110, 828), "字幕安全區", font=font(MSJH, 31), fill="white")
    d.text((110, 875), "Traditional Chinese: Microsoft JhengHei", font=font(COMIC, 28), fill="#FFE6A8")
    d.text((110, 920), "English: Comic Sans", font=font(COMIC_BOLD, 28), fill="#FFE6A8")

    colors = [(GOLD, "train"), (RED, "route"), (BLUE, "river"), (GREEN, "field"), (NAVY, "type")]
    for i, (color, label) in enumerate(colors):
        x = 1310 + (i % 3) * 170
        y = 810 + (i // 3) * 90
        d.rounded_rectangle((x, y, x + 70, y + 55), radius=14, fill=color)
        d.text((x + 82, y + 12), label, font=font(COMIC, 20), fill=INK)

    d.text((1420, 990), "教學示意圖，非依實際比例繪製", font=font(MSJH, 20), fill="#657A89")
    save_png(canvas, ING_DIR / "L1_ING03_route_style_reference.png")


def draw_route_scene(
    canvas: Image.Image,
    points: list[tuple[int, int]],
    highlight: int,
    show_all_nodes: bool = True,
) -> None:
    d = ImageDraw.Draw(canvas, "RGBA")
    d.line(points, fill=(95, 40, 34, 255), width=24, joint="curve")
    d.line(points, fill=RED, width=13, joint="curve")
    for i, (x, y) in enumerate(points):
        if not show_all_nodes and i not in (0, 4, 6):
            continue
        major = i in (0, 4, 6)
        r = 22 if major else 14
        fill = GOLD if i <= highlight else "white"
        d.ellipse((x - r, y - r, x + r, y + r), fill=fill, outline=NAVY, width=5)
        if i == 6:
            d.ellipse((x - r - 10, y - r - 10, x + r + 10, y + r + 10), outline="#8E67B4", width=5)


def draw_small_train(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w, h = int(160 * scale), int(82 * scale)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=int(18 * scale), fill="#F5BE42", outline=NAVY, width=max(2, int(5 * scale)))
    draw.rectangle((x + int(15 * scale), y + int(17 * scale), x + int(120 * scale), y + int(50 * scale)), fill="#FFF3D2")
    for wx in (30, 66, 102):
        draw.rounded_rectangle(
            (x + int(wx * scale), y + int(23 * scale), x + int((wx + 24) * scale), y + int(44 * scale)),
            radius=int(4 * scale),
            fill="#314753",
        )
    draw.arc((x + int(18 * scale), y + int(54 * scale), x + int(58 * scale), y + int(94 * scale)), 180, 360, fill="#1F2326", width=max(2, int(8 * scale)))
    draw.arc((x + int(100 * scale), y + int(54 * scale), x + int(140 * scale), y + int(94 * scale)), 180, 360, fill="#1F2326", width=max(2, int(8 * scale)))
    draw.line((x + int(8 * scale), y + int(56 * scale), x + int(150 * scale), y + int(56 * scale)), fill="#E56B3E", width=max(2, int(8 * scale)))


def make_deterministic_clean_storyboards() -> None:
    # SB01: accurate route-order title scene.
    sb1 = Image.new("RGBA", (W, H), "#EAF5FF")
    d = ImageDraw.Draw(sb1, "RGBA")
    d.rectangle((0, 640, W, H), fill="#E4F0CB")
    d.polygon([(0, 650), (270, 440), (520, 650), (780, 360), (1080, 650)], fill="#B7D99B")
    d.polygon([(940, 650), (1250, 330), (1510, 650), (1720, 410), (W, 650)], fill="#8FB67A")
    d.line((0, 765, W, 765), fill="#7BB8D7", width=70)
    d.line((0, 765, W, 765), fill="#B7DDEF", width=32)
    pts = [(210, 710), (445, 665), (675, 610), (900, 555), (1155, 485), (1435, 405), (1715, 335)]
    draw_route_scene(sb1, pts, 0)
    draw_small_train(d, 110, 600, 0.75)
    # Large uncluttered title-safe area.
    d.rounded_rectangle((90, 70, 1070, 315), radius=36, fill=(255, 255, 255, 210), outline=(21, 59, 99, 100), width=4)
    save_png(sb1, CLEAN_DIR / "L1_SB01_clean.png")

    # SB02: the exact official-evidence warm-up image is reused as the route-video station observation shot.
    sb2 = Image.open(WARMUP_DIR / "L1_Warmup_ErshuiStation_A_clean.png").convert("RGBA")
    save_png(sb2, CLEAN_DIR / "L1_SB02_clean.png")

    # SB03: Ershui station and an exact route-order teaching map in one frame.
    sb3 = Image.new("RGBA", (W, H), "#EFF6FA")
    paste_card(sb3, Image.open(REF_DIR / "ershui_02.jpg"), (40, 40, 825, 1040), radius=32, focus=(0.55, 0.48))
    d3 = ImageDraw.Draw(sb3, "RGBA")
    d3.rounded_rectangle((865, 40, 1880, 1040), radius=32, fill=(255, 255, 255, 245), outline=(21, 59, 99, 130), width=4)
    # Gray trunk line and red branch line meet at Ershui.
    d3.line((1035, 180, 1035, 900), fill="#7B8790", width=20)
    d3.line((1035, 675, 1760, 270), fill="#6D2720", width=24)
    d3.line((1035, 675, 1760, 270), fill=RED, width=13)
    pts3 = [(1035, 675), (1140, 618), (1250, 555), (1360, 495), (1490, 420), (1620, 345), (1760, 270)]
    for i, (x, y) in enumerate(pts3):
        r = 22 if i in (0, 4, 6) else 14
        d3.ellipse((x - r, y - r, x + r, y + r), fill=GOLD if i == 0 else "white", outline=NAVY, width=5)
    d3.line((1715, 170, 1810, 110), fill=NAVY, width=8)
    d3.polygon([(1810, 110), (1770, 112), (1794, 148)], fill=NAVY)
    draw_small_train(d3, 925, 620, 0.66)
    save_png(sb3, CLEAN_DIR / "L1_SB03_clean.png")

    # SB12: review board with exact route order and three official station images.
    sb12 = Image.new("RGBA", (W, H), "#FFF8EA")
    d12 = ImageDraw.Draw(sb12, "RGBA")
    pts12 = [(230, 650), (465, 600), (690, 550), (900, 500), (1125, 440), (1385, 385), (1660, 325)]
    draw_route_scene(sb12, pts12, 6)
    station_photos = [
        (REF_DIR / "ershui_02.jpg", (250, 385), (0.55, 0.48)),
        (REF_DIR / "jiji_station.jpg", (1055, 215), (0.5, 0.52)),
        (REF_DIR / "checheng_station.jpg", (1650, 575), (0.5, 0.52)),
    ]
    for p, (x, y), focus in station_photos:
        crop = cover(Image.open(p), (260, 260), focus=focus)
        circle = Image.new("L", (260, 260), 0)
        ImageDraw.Draw(circle).ellipse((0, 0, 259, 259), fill=255)
        sx, sy = x - 130, y - 130
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse((sx + 12, sy + 14, sx + 272, sy + 274), fill=(15, 35, 55, 70))
        sh = sh.filter(ImageFilter.GaussianBlur(10))
        sb12.alpha_composite(sh)
        sb12.paste(crop.convert("RGBA"), (sx, sy), circle)
        d12.ellipse((sx, sy, sx + 260, sy + 260), outline="white", width=12)
        d12.ellipse((sx - 4, sy - 4, sx + 264, sy + 264), outline=NAVY, width=4)
    d12.rounded_rectangle((100, 720, 1820, 865), radius=30, fill=(255, 255, 255, 225), outline=(21, 59, 99, 100), width=4)
    save_png(sb12, CLEAN_DIR / "L1_SB12_clean.png")


def load_flow_shots() -> list[dict[str, str]]:
    script_path = Path(__file__).with_name("update_unit2_docx.py")
    spec = importlib.util.spec_from_file_location("unit2_update", script_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load FLOW_SHOTS")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.FLOW_SHOTS


def add_route_progress(draw: ImageDraw.ImageDraw, progress: int) -> None:
    x0, y = 1260, 72
    step = 82
    draw.rounded_rectangle((1218, 34, 1855, 148), radius=26, fill=(255, 255, 255, 220), outline=(21, 59, 99, 180), width=3)
    draw.line((x0, y, x0 + step * 6, y), fill=(145, 160, 172, 255), width=8)
    if progress > 0:
        draw.line((x0, y, x0 + step * progress, y), fill=RED, width=10)
    for i in range(7):
        fill = GOLD if i <= progress else "white"
        r = 12 if i in (0, 4, 6) else 9
        draw.ellipse((x0 + step * i - r, y - r, x0 + step * i + r, y + r), fill=fill, outline=NAVY, width=3)
    draw.text((1237, 102), "Ershui", font=font(COMIC, 18), fill=NAVY)
    draw.text((1575, 102), "Jiji", font=font(COMIC, 18), fill=NAVY)
    draw.text((1760, 102), "Checheng", font=font(COMIC, 18), fill=NAVY)


def add_storyboard_overlay(clean: Image.Image, shot: dict[str, str]) -> Image.Image:
    shot_id = shot["id"]
    zh, en, progress = SHOT_META[shot_id]
    focus = (0.5, 0.70) if shot_id == "06" else (0.5, 0.5)
    canvas = cover(clean, (W, H), focus=focus).convert("RGBA")
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay, "RGBA")

    # Shot and station label.
    d.rounded_rectangle((58, 48, 465, 172), radius=26, fill=(255, 255, 255, 232), outline=(21, 59, 99, 210), width=4)
    d.text((82, 64), f"SHOT {shot_id}", font=font(COMIC_BOLD, 28), fill=RED)
    d.text((82, 100), zh, font=font(MSJH, 31), fill=NAVY)
    en_width = d.textbbox((0, 0), en, font=font(COMIC, 21))[2]
    if en_width < 185:
        d.text((245, 111), en, font=font(COMIC, 21), fill="#566A7A")
    if shot_id in {"09", "10"}:
        d.rounded_rectangle((488, 108, 704, 151), radius=16, fill=(255, 244, 218, 230), outline=(216, 74, 58, 180), width=3)
        d.text((510, 116), "站景教學示意", font=font(MSJH, 21), fill="#8C3C31")
    add_route_progress(d, progress)

    if shot_id == "01":
        d.text((150, 185), "從二水出發", font=font(MSJH, 58), fill=NAVY)
        d.text((150, 253), "認識集集線", font=font(MSJH, 58), fill=RED)
    if shot_id == "12":
        labels = [
            ("二水站", "Ershui Station", 170),
            ("集集站", "Jiji Station", 735),
            ("車埕站", "Checheng Station", 1285),
        ]
        for zh_name, en_name, x in labels:
            d.text((x, 748), zh_name, font=font(MSJH, 37), fill=NAVY)
            d.text((x, 798), en_name, font=font(COMIC_BOLD, 25), fill=RED)

    # Exact subtitle bar. Chinese uses Microsoft JhengHei; the only mixed subtitle is shot 12.
    d.rounded_rectangle((90, 895, 1830, 1038), radius=28, fill=(21, 59, 99, 232))
    subtitle = shot["subtitle"]
    if shot_id == "12":
        d.text((190, 930), "二水—集集—車埕", font=font(MSJH, 50), fill="white")
        d.text((800, 932), "What’s this?", font=font(COMIC_BOLD, 50), fill="#FFE6A8")
    else:
        bbox = d.textbbox((0, 0), subtitle, font=font(MSJH, 48), stroke_width=1)
        x = (W - (bbox[2] - bbox[0])) / 2
        d.text((x, 928), subtitle, font=font(MSJH, 48), fill="white", stroke_width=1, stroke_fill=NAVY)
    return Image.alpha_composite(canvas, overlay)


def render_storyboards() -> None:
    shots = load_flow_shots()
    for shot in shots:
        clean_path = CLEAN_DIR / f"L1_SB{shot['id']}_clean.png"
        if not clean_path.exists():
            raise FileNotFoundError(clean_path)
        clean = Image.open(clean_path).convert("RGB")
        if clean.size != (W, H):
            clean = cover(clean, (W, H))
            save_png(clean, clean_path)
        review = add_storyboard_overlay(clean, shot)
        save_png(review, SB_DIR / f"L1_SB{shot['id']}_still.png")


def make_contact_sheet() -> None:
    paths = [
        WARMUP_DIR / "L1_Warmup_ErshuiStation_A_clean.png",
        WARMUP_DIR / "L1_Warmup_ErshuiStation_B_clues.png",
        WARMUP_DIR / "L1_Warmup_ErshuiStation_C_answer.png",
        ING_DIR / "L1_ING01_train_reference.png",
        ING_DIR / "L1_ING02_station_reference.png",
        ING_DIR / "L1_ING03_route_style_reference.png",
    ] + [SB_DIR / f"L1_SB{i:02d}_still.png" for i in range(1, 13)]
    missing = [p for p in paths if not p.exists()]
    if missing:
        raise FileNotFoundError("\n".join(str(p) for p in missing))

    thumb_w, thumb_h = 560, 315
    caption_h = 56
    cols = 3
    rows = math.ceil(len(paths) / cols)
    sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + caption_h)), "#EEF3F6")
    d = ImageDraw.Draw(sheet)
    cap_font = font(COMIC_BOLD, 23)
    for i, path in enumerate(paths):
        x = (i % cols) * thumb_w
        y = (i // cols) * (thumb_h + caption_h)
        im = cover(Image.open(path), (thumb_w - 18, thumb_h - 18))
        sheet.paste(im, (x + 9, y + 9))
        d.text((x + 14, y + thumb_h + 10), path.stem, font=cap_font, fill=INK)
    save_png(sheet, CONTACT_DIR / "L1_18_assets_contact_sheet.png")


def write_manifest() -> None:
    rows: list[dict[str, str]] = []
    deliverables = [
        ("warmup", WARMUP_DIR / "L1_Warmup_ErshuiStation_A_clean.png", "二水站暖身圖A｜無標記"),
        ("warmup", WARMUP_DIR / "L1_Warmup_ErshuiStation_B_clues.png", "二水站暖身圖B｜三提示圈"),
        ("warmup", WARMUP_DIR / "L1_Warmup_ErshuiStation_C_answer.png", "二水站暖身圖C｜答案標籤"),
        ("ingredient", ING_DIR / "L1_ING01_train_reference.png", "一致性參考板1｜列車三視圖"),
        ("ingredient", ING_DIR / "L1_ING02_station_reference.png", "一致性參考板2｜車站"),
        ("ingredient", ING_DIR / "L1_ING03_route_style_reference.png", "一致性參考板3｜路線與色彩"),
    ] + [
        ("storyboard", SB_DIR / f"L1_SB{i:02d}_still.png", f"分鏡{i:02d}") for i in range(1, 13)
    ]
    for category, path, title in deliverables:
        rows.append(
            {
                "asset_id": path.stem,
                "category": category,
                "title_zh": title,
                "file_path": str(path.relative_to(UNIT_DIR)),
                "exists": "yes" if path.exists() else "no",
                "width": str(Image.open(path).width) if path.exists() else "",
                "height": str(Image.open(path).height) if path.exists() else "",
                "status": "ready_for_user_review" if path.exists() else "missing",
            }
        )
    out = UNIT_DIR / "00_查證與清冊" / "00_asset_manifest.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def write_source_register() -> None:
    text = """# 第1節媒體教材｜官方資料來源紀錄

- 查證日期：2026-07-28
- 適用範圍：二水站暖身圖、集集線一致性參考板、12張分鏡靜態圖
- 原則：路線與站序以臺鐵／交通部為主；地方站景與特色以參山國家風景區、南投旅遊網與臺鐵車站頁交叉確認。

| 查證項目 | 主要來源 | 本案用法 |
|---|---|---|
| 集集線車站代碼與順序 | https://www.railway.gov.tw/tra-tip-web/tip/tip00C/tipC21/view?subCode=8ae4cac3756b7b41017573dc65f31899 | 定稿為二水→源泉→濁水→龍泉→集集→水里→車埕。 |
| 2026全線復駛 | https://www.motc.gov.tw/ch/app/news_list/view?id=14&module=news&serno=c752d930-f8a2-4740-a67e-3115a45deb92 | 確認二水至車埕於2026-07-05全線復駛；授課前仍須再查營運公告。 |
| 二水站現況與集集線地理敘述 | https://www.trimt-nsa.gov.tw/zh-tw/attraction/118/ | 暖身圖站體、月臺、鐵軌與列車現況照片來源。 |
| 集集線七站與沿線特色 | https://travel.nantou.gov.tw/theme-train-trip/ | 路線順序、站牌、沿線景觀與地方功能交叉確認。 |
| 集集站 | https://travel.nantou.gov.tw/attractions/jiji-station/ | 集集站外觀與小鎮景觀參考。 |
| 水里站 | https://www.railway.gov.tw/tra-tip-web/tip/tip00H/tipH41/viewStaInfo/3435 | 水里站資料與山谷聚落關係；本案無可靠官方站體照片，因此SB09標示「站景教學示意」。 |
| 車埕站 | https://travel.nantou.gov.tw/attractions/checheng-station/ | 終點、木造重建、山林與木業文化敘述；SB10標示「站景教學示意」。 |
| 授課當日營運狀態 | https://tip.railway.gov.tw/tra-tip-web/tip/tip007/tip711/blockList | 教師播放或規劃實際交通前再次查詢。 |

## 圖片使用說明

- `references` 內官方網頁照片只用於教師端查證、本地製作與一致性參考；若教材公開上網，須依來源授權條款處理。
- 二水暖身圖保留官方照片中的真實站名牌，不讓生成模型重寫。
- SB04–SB11為半寫實3D教學插畫；它們不是現況照片。
- 所有站名、字幕、路線節點與方向均由後製加入，不採用生成模型自行產生的文字或路線圖。
"""
    out = UNIT_DIR / "00_查證與清冊" / "00_official_source_register.md"
    out.write_text(text, encoding="utf-8")


def write_prompt_master() -> None:
    shots = load_flow_shots()
    lines = [
        "# L1｜二水站暖身圖、12張分鏡與Flow提示詞主檔",
        "",
        "## 已確認製作規格",
        "",
        "- 靜態圖：16:9、1920×1080。",
        "- 中文：繁體中文，Microsoft JhengHei（微軟正黑體）。",
        "- 英文：Comic Sans。",
        "- 風格：半寫實3D兒童繪本；地方與路線事實優先。",
        "- 列車：黃色車頭、乳黃色車身、紅／橘／藍波浪帶、灰色車頂、深色車窗；全鏡一致。",
        "- 路線：二水→源泉→濁水→龍泉→集集→水里→車埕。",
        "- 禁止：簡體字、錯站序、高鐵／捷運造型、人物進入軌道、生成浮水印、生成模型自行重寫字幕。",
        "",
        "## 二水站暖身圖",
        "",
        "使用官方現況照片組成三證據區：站體與站名牌、月臺、兩條鐵軌。A版完全無新增標記；B版加入黃／綠／藍三個提示框；C版加入「二水站 Ershui Station」「站名牌 sign」「月臺 platform」「鐵軌 track」與口說句型。",
        "",
        "## 三張一致性Ingredient／參考板",
        "",
        "1. `L1_ING01_train_reference.png`：同一列車前3/4、正側面、後3/4三視圖；車窗、車門、車頭、車頂、色帶一致。",
        "2. `L1_ING02_station_reference.png`：二水、集集、水里、車埕四站參考；水里僅用官方站牌，不把示意站房當現況照片。",
        "3. `L1_ING03_route_style_reference.png`：七站正確順序、往車埕方向、地形線索、字幕安全區與配色。",
        "",
        "## 12張分鏡與獨立Google Flow動態提示詞",
        "",
    ]
    common = (
        "8秒、16:9、以本張乾淨首幀作為起始畫面；固定使用列車、站體與色彩Ingredient。"
        "所有新增中文只用繁體中文，英文只用Comic Sans。若Flow無法穩定產生正確字幕或旁白，"
        "只生成乾淨動態與自然環境聲，字幕、旁白及音效改由後製精確加入。"
    )
    for shot in shots:
        lines.extend(
            [
                f"### 分鏡{shot['id']}｜{shot['title']}",
                "",
                f"- 時間：{shot['time']}",
                f"- 畫面站名：{shot['station']}",
                f"- 靜態畫面：{shot['still']}",
                f"- 精確字幕：{shot['subtitle']}",
                f"- 精確旁白：{shot['narration']}",
                f"- 路線動畫：{shot['route']}",
                f"- 攝影機：{shot['camera']}",
                f"- 畫面動作：{shot['action']}",
                f"- 環境音／音效：{shot['audio']}",
                f"- 轉場：{shot['transition']}",
                "",
                "**獨立Google Flow動態提示詞**",
                "",
                (
                    f"{common}【畫面】{shot['still']}【路線動畫】{shot['route']}"
                    f"【字幕】「{shot['subtitle']}」，下方安全區白字深藍描邊，不得改字。"
                    f"【旁白】臺灣華語、溫暖清楚、四年級語速：「{shot['narration']}」"
                    f"【音效】{shot['audio']}【攝影機】{shot['camera']}【動作】{shot['action']}"
                    f"【轉場】{shot['transition']}不得新增其他站名、顛倒路線、讓列車瞬移、"
                    "讓人物進入軌道或跨越安全線；不要浮水印、簡體字、可辨識真實廣播或額外圖示。"
                ),
                "",
            ]
        )
    (PROMPT_DIR / "L1_image_and_flow_prompt_master.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "foundations"
    for d in (PROMPT_DIR, WARMUP_DIR, ING_DIR, SB_DIR, CLEAN_DIR, CONTACT_DIR):
        d.mkdir(parents=True, exist_ok=True)
    if mode == "foundations":
        make_warmups()
        normalize_train_reference()
        make_station_reference()
        make_route_reference()
        make_deterministic_clean_storyboards()
    elif mode == "storyboards":
        render_storyboards()
        make_contact_sheet()
        write_manifest()
        write_source_register()
        write_prompt_master()
    elif mode == "contact":
        make_contact_sheet()
        write_manifest()
        write_source_register()
        write_prompt_master()
    else:
        raise SystemExit(f"Unknown mode: {mode}")


if __name__ == "__main__":
    main()
