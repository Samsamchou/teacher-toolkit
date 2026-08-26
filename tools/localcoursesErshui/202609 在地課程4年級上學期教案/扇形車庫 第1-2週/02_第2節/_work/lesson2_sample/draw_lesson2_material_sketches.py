"""Draw deterministic low-fidelity sketches for Lesson 2 handmade materials."""

from pathlib import Path
import os

from PIL import Image, ImageDraw, ImageFont


SCRIPT_DIR = Path(__file__).resolve().parent
UNIT_DIR = SCRIPT_DIR.parents[1]
OUTPUT_DIR = Path(
    os.environ.get(
        "LESSON2_SKETCH_OUTPUT_DIR",
        str(UNIT_DIR / "13_扇形車庫_第2節七類教材草圖與風格比較_20260826"),
    )
)

WIDTH = 1240
HEIGHT = 1754
BG = "#FFFDF8"
INK = "#243447"
MUTED = "#5E6B75"
NAVY = "#183B56"
TEAL = "#087F8C"
PALE_BLUE = "#EAF4FA"
PALE_TEAL = "#E8F6F3"
PALE_AMBER = "#FFF4D6"
PALE_ROSE = "#FCECEE"
LINE = "#8A9BA8"
RED = "#E85D5D"
BLUE = "#4C8ED9"
GREEN = "#55A868"
YELLOW = "#F2C94C"
PURPLE = "#8064A2"


def font(size, bold=False):
    candidates = [
        Path(r"C:\Windows\Fonts\msjhbd.ttc" if bold else r"C:\Windows\Fonts\msjh.ttc"),
        Path(r"C:\Windows\Fonts\NotoSansTC-Bold.ttf" if bold else r"C:\Windows\Fonts\NotoSansTC-Regular.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


F_TITLE = font(46, True)
F_SUBTITLE = font(25, True)
F_SECTION = font(30, True)
F_BODY = font(24)
F_BODY_BOLD = font(24, True)
F_SMALL = font(20)
F_TINY = font(17)


def rounded(draw, box, fill, outline=LINE, width=3, radius=24):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text_width(draw, text, fnt):
    return draw.textbbox((0, 0), text, font=fnt)[2]


def wrap(draw, text, fnt, max_width):
    lines = []
    current = ""
    for char in text:
        test = current + char
        if current and text_width(draw, test, fnt) > max_width:
            lines.append(current)
            current = char
        else:
            current = test
    if current:
        lines.append(current)
    return lines


def draw_wrapped(draw, xy, text, fnt, fill, max_width, spacing=8, max_lines=None):
    x, y = xy
    line_height = fnt.size + spacing
    lines = wrap(draw, text, fnt, max_width)
    if max_lines is not None:
        lines = lines[:max_lines]
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_height
    return y


def header(draw, title, paper):
    rounded(draw, (48, 42, WIDTH - 48, 168), PALE_BLUE, outline=NAVY, width=4, radius=28)
    draw.text((78, 62), title, font=F_TITLE, fill=NAVY)
    paper_text = f"預定尺寸：{paper}"
    draw.text((WIDTH - 78 - text_width(draw, paper_text, F_SMALL), 118), paper_text, font=F_SMALL, fill=MUTED)
    rounded(draw, (65, 183, WIDTH - 65, 235), PALE_AMBER, outline="#D4A72C", width=2, radius=16)
    label = "詳案理解用／非正式教材｜角色為結構占位，正式風格待教師選定"
    bbox = draw.textbbox((0, 0), label, font=F_SMALL)
    draw.text(((WIDTH - (bbox[2] - bbox[0])) / 2, 196), label, font=F_SMALL, fill="#7A5710")


def draw_detective(draw, center, scale=1.0, prop="magnifier"):
    """Neutral flat placeholder for the future 3D chibi railway detective."""
    x, y = center
    s = scale
    line_width = max(2, int(3 * s))
    draw.polygon(
        [(x - 54 * s, y - 68 * s), (x + 35 * s, y - 68 * s), (x + 55 * s, y - 48 * s), (x - 60 * s, y - 48 * s)],
        fill=TEAL,
        outline=NAVY,
    )
    draw.rectangle(
        (x - 16 * s, y - 86 * s, x + 12 * s, y - 68 * s),
        fill=YELLOW,
        outline=NAVY,
        width=max(1, int(2 * s)),
    )
    rounded(
        draw,
        (x - 58 * s, y - 48 * s, x + 58 * s, y + 42 * s),
        "white",
        outline=NAVY,
        width=line_width,
        radius=max(4, int(18 * s)),
    )
    draw.ellipse((x - 30 * s, y - 22 * s, x - 17 * s, y - 9 * s), fill=INK)
    draw.ellipse((x + 17 * s, y - 22 * s, x + 30 * s, y - 9 * s), fill=INK)
    draw.arc((x - 18 * s, y - 12 * s, x + 18 * s, y + 18 * s), 10, 170, fill=TEAL, width=line_width)
    draw.ellipse((x - 42 * s, y + 30 * s, x - 15 * s, y + 57 * s), fill=PURPLE, outline=NAVY)
    draw.ellipse((x + 15 * s, y + 30 * s, x + 42 * s, y + 57 * s), fill=PURPLE, outline=NAVY)
    px, py = x + 70 * s, y + 2 * s
    prop_width = max(2, int(4 * s))
    if prop == "magnifier":
        draw.ellipse((px - 18 * s, py - 30 * s, px + 20 * s, py + 8 * s), outline=RED, width=prop_width)
        draw.line((px + 14 * s, py + 3 * s, px + 37 * s, py + 30 * s), fill=RED, width=prop_width)
    elif prop == "link":
        draw.line((px - 28 * s, py - 12 * s, px + 28 * s, py + 12 * s), fill=BLUE, width=prop_width)
        draw.ellipse((px - 38 * s, py - 22 * s, px - 18 * s, py - 2 * s), outline=BLUE, width=prop_width)
        draw.ellipse((px + 18 * s, py + 2 * s, px + 38 * s, py + 22 * s), outline=BLUE, width=prop_width)
    elif prop == "palette":
        draw.ellipse((px - 30 * s, py - 28 * s, px + 32 * s, py + 28 * s), fill=PALE_AMBER, outline=PURPLE, width=prop_width)
        for ox, oy, color in [(-12, -10, RED), (8, -14, BLUE), (14, 7, GREEN)]:
            draw.ellipse((px + (ox - 5) * s, py + (oy - 5) * s, px + (ox + 5) * s, py + (oy + 5) * s), fill=color)
    elif prop == "pin":
        draw.ellipse((px - 20 * s, py - 28 * s, px + 20 * s, py + 12 * s), fill=RED, outline=NAVY, width=prop_width)
        draw.polygon([(px - 17 * s, py + 4 * s), (px + 17 * s, py + 4 * s), (px, py + 38 * s)], fill=RED, outline=NAVY)
        draw.ellipse((px - 6 * s, py - 14 * s, px + 6 * s, py - 2 * s), fill="white")
    elif prop == "clock":
        draw.ellipse((px - 28 * s, py - 28 * s, px + 28 * s, py + 28 * s), fill="white", outline=BLUE, width=prop_width)
        draw.line((px, py, px, py - 16 * s), fill=INK, width=prop_width)
        draw.line((px, py, px + 14 * s, py + 8 * s), fill=INK, width=prop_width)
    elif prop == "gear":
        draw.ellipse((px - 28 * s, py - 28 * s, px + 28 * s, py + 28 * s), fill=PALE_TEAL, outline=GREEN, width=prop_width)
        draw.ellipse((px - 8 * s, py - 8 * s, px + 8 * s, py + 8 * s), fill="white", outline=GREEN, width=prop_width)
    elif prop == "speech":
        rounded(draw, (px - 38 * s, py - 34 * s, px + 38 * s, py + 22 * s), "white", outline=TEAL, width=prop_width, radius=max(4, int(12 * s)))
        draw.text((px - 17 * s, py - 25 * s), "?", font=font(max(12, int(30 * s)), True), fill=TEAL)
    elif prop == "microphone":
        draw.ellipse((px - 14 * s, py - 34 * s, px + 14 * s, py - 4 * s), fill=PURPLE, outline=NAVY, width=prop_width)
        draw.line((px, py - 4 * s, px, py + 30 * s), fill=NAVY, width=prop_width)
        draw.line((px - 18 * s, py + 30 * s, px + 18 * s, py + 30 * s), fill=NAVY, width=prop_width)
    elif prop == "check":
        rounded(draw, (px - 30 * s, py - 34 * s, px + 30 * s, py + 34 * s), "white", outline=GREEN, width=prop_width, radius=max(4, int(8 * s)))
        draw.line((px - 14 * s, py, px - 2 * s, py + 12 * s, px + 18 * s, py - 14 * s), fill=GREEN, width=prop_width)


def section(draw, box, number, title, fill=PALE_TEAL, prop="magnifier"):
    rounded(draw, box, fill, outline=TEAL, width=3, radius=20)
    x1, y1, x2, _ = box
    rounded(draw, (x1 + 18, y1 + 16, x1 + 72, y1 + 70), TEAL, outline=TEAL, radius=14)
    nbox = draw.textbbox((0, 0), str(number), font=F_SUBTITLE)
    draw.text((x1 + 45 - (nbox[2] - nbox[0]) / 2, y1 + 27), str(number), font=F_SUBTITLE, fill="white")
    draw_wrapped(draw, (x1 + 90, y1 + 20), title, F_BODY_BOLD, NAVY, x2 - x1 - 275, spacing=4, max_lines=2)
    draw_detective(draw, (x2 - 95, y1 + 58), 0.42, prop)


def draw_roundhouse_map(draw, box, show_legend=False):
    x1, y1, x2, y2 = box
    cx = (x1 + x2) // 2
    cy = y2 - 135
    radius = 64
    for dx in (-250, -170, -85, 0, 85, 170, 250):
        end_x = cx + dx
        end_y = y1 + 95 + abs(dx) // 5
        draw.line((cx, cy, end_x, end_y), fill=BLUE, width=12)
        rounded(draw, (end_x - 38, end_y - 52, end_x + 38, end_y + 16), GREEN, outline="#357A45", width=2, radius=8)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=RED, outline="#A63B3B", width=5)
    rounded(draw, (cx - 35, cy - 155, cx + 35, cy - 100), YELLOW, outline="#A98614", width=3, radius=8)
    if show_legend:
        items = [(RED, "○轉車台"), (BLUE, "═軌道"), (GREEN, "⌂車庫"), (YELLOW, "▣火車頭")]
        lx = x1 + 18
        ly = y2 - 58
        for color, label in items:
            draw.rectangle((lx, ly, lx + 24, ly + 24), fill=color, outline=INK)
            draw.text((lx + 31, ly - 2), label, font=F_TINY, fill=INK)
            lx += 155


def draw_worksheet(path):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    header(draw, "個人《扇形車庫解密單》草圖", "A4直式，每人1張")
    draw.text((72, 252), "姓名：________________　組別：______", font=F_BODY, fill=INK)

    section(draw, (62, 306, WIDTH - 62, 540), 1, "由來小偵探｜依資料句條完成一句話", prop="magnifier")
    draw.text((92, 388), "彰化扇形車庫在 ______ 年啟用，當時有 ______ 股道；", font=F_BODY, fill=INK)
    draw.text((92, 438), "後來到 ______ 年形成 ______ 股道。", font=F_BODY, fill=INK)
    draw.text((92, 490), "提示：先找『何時』句條；不用默寫年份。", font=F_SMALL, fill=MUTED)

    section(draw, (62, 560, WIDTH - 62, 900), 2, "構件找功能｜連線小偵探畫線配對", prop="link")
    left = [("轉車台", 665), ("放射狀軌道", 745), ("車庫", 825)]
    right = [("檢修、保養與停放火車頭", 665), ("讓火車頭轉向並對準軌道", 745), ("連接轉車台和不同庫位", 825)]
    for label, y in left:
        rounded(draw, (95, y - 27, 355, y + 31), "white", outline=NAVY, width=2, radius=12)
        draw.text((120, y - 17), label, font=F_BODY_BOLD, fill=NAVY)
    for label, y in right:
        rounded(draw, (720, y - 27, 1135, y + 31), "white", outline=TEAL, width=2, radius=12)
        draw.text((742, y - 16), label, font=F_SMALL, fill=INK)
    for y in (665, 745, 825):
        draw.ellipse((382, y - 7, 396, y + 7), fill=LINE)
        draw.ellipse((680, y - 7, 694, y + 7), fill=LINE)
    draw.text((468, 620), "學生自行連線", font=F_SMALL, fill=MUTED)

    section(draw, (62, 920, WIDTH - 62, 1328), 3, "四色定位｜調色盤小偵探協助找位置", prop="palette")
    draw_roundhouse_map(draw, (135, 995, 1105, 1295), show_legend=True)

    section(draw, (62, 1348, WIDTH - 62, 1685), 4, "位置問答｜定位小偵探提供句首", prop="pin")
    draw.text((100, 1440), "Q: Where's the turntable?", font=F_BODY_BOLD, fill=NAVY)
    draw.text((100, 1500), "A: It's ______________________________.", font=F_BODY, fill=INK)
    draw.text((100, 1572), "提示：middle＝中間。先指位置，再說完整句。", font=F_SMALL, fill=MUTED)
    image.save(path, quality=95)


def draw_color_key(path):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    header(draw, "四色圖例卡草圖", "A5直式，每組1張")
    draw_wrapped(
        draw,
        (86, 266),
        "用途：放在A3無文字全景圖旁。顏色、文字與圖形三種線索一起使用，黑白影印也能辨認。",
        F_BODY,
        INK,
        WIDTH - 172,
    )
    cards = [
        (RED, "○", "轉車台", "turntable", "Where's the turntable?", "pin"),
        (BLUE, "═", "軌道", "tracks", "What are these?", "link"),
        (GREEN, "⌂", "車庫", "roundhouse", "Point to the roundhouse.", "magnifier"),
        (YELLOW, "▣", "火車頭", "locomotive", "What's this?", "speech"),
    ]
    y = 390
    for color, symbol, zh, en, prompt, prop in cards:
        rounded(draw, (78, y, WIDTH - 78, y + 260), "white", outline=color, width=6, radius=28)
        draw.rectangle((112, y + 38, 282, y + 208), fill=color, outline=INK, width=3)
        symbol_font = font(60, True)
        bbox = draw.textbbox((0, 0), symbol, font=symbol_font)
        draw.text((197 - (bbox[2] - bbox[0]) / 2, y + 82), symbol, font=symbol_font, fill=INK)
        draw.text((330, y + 40), zh, font=font(40, True), fill=NAVY)
        draw.text((330, y + 100), en, font=font(34, True), fill=TEAL)
        draw.text((330, y + 164), prompt, font=F_BODY, fill=INK)
        draw_detective(draw, (1055, y + 126), 0.42, prop)
        y += 285
    rounded(draw, (78, 1540, WIDTH - 78, 1688), PALE_AMBER, outline="#D4A72C", width=3, radius=24)
    draw.text((112, 1572), "操作：看顏色／圖形 → 指全景圖 → 說名稱或句框", font=F_BODY_BOLD, fill="#7A5710")
    image.save(path, quality=95)


def draw_exit_ticket(path):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    header(draw, "三格出口票草圖", "A6直式，每人1張")
    draw.text((76, 255), "姓名：________________　日期：________", font=F_BODY, fill=INK)
    boxes = [
        (1, "由來", "1922年發生什麼？", "1922年，扇形車庫開始________，\n當時有________股道。", "clock"),
        (2, "功能", "轉車台有什麼功能？", "中央轉車台可以讓火車頭________，\n並對準不同的________。", "gear"),
        (3, "位置", "Where's the turntable?", "It's in the __________________.\n提示：middle＝中間", "pin"),
    ]
    y = 325
    fills = [PALE_BLUE, PALE_TEAL, PALE_AMBER]
    for (number, label, question, answer, prop), fill in zip(boxes, fills):
        section(draw, (62, y, WIDTH - 62, y + 365), number, label, fill=fill, prop=prop)
        draw.text((100, y + 98), question, font=F_BODY_BOLD, fill=NAVY)
        ay = y + 170
        for line in answer.split("\n"):
            draw.text((100, ay), line, font=F_BODY, fill=INK)
            ay += 78
        y += 390
    rounded(draw, (62, 1510, WIDTH - 62, 1688), "white", outline=LINE, width=3, radius=22)
    draw.text((92, 1542), "教師快速分類（學生不填）", font=F_BODY_BOLD, fill=NAVY)
    draw.text((92, 1605), "□ 可獨立說明　□ 需要資料句條　□ 需要再看圖複習", font=F_BODY, fill=INK)
    image.save(path, quality=95)


def header_landscape(draw, width, title, paper):
    rounded(draw, (48, 42, width - 48, 168), PALE_BLUE, outline=NAVY, width=4, radius=28)
    draw.text((78, 62), title, font=F_TITLE, fill=NAVY)
    paper_text = f"預定尺寸：{paper}"
    draw.text((width - 78 - text_width(draw, paper_text, F_SMALL), 118), paper_text, font=F_SMALL, fill=MUTED)
    rounded(draw, (65, 183, width - 65, 235), PALE_AMBER, outline="#D4A72C", width=2, radius=16)
    label = "詳案理解用／非正式教材｜角色為結構占位，正式風格待教師選定"
    bbox = draw.textbbox((0, 0), label, font=F_SMALL)
    draw.text(((width - (bbox[2] - bbox[0])) / 2, 196), label, font=F_SMALL, fill="#7A5710")


def draw_three_cell_board(path):
    width, height = 1754, 1240
    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)
    header_landscape(draw, width, "『何時—構件—功能』三格圖示板草圖", "A4橫式，每組1張")
    draw.text((82, 260), "操作：先看圖示猜類別 → 將8張中文資料句條放入三格 → 配對構件與功能。", font=F_BODY, fill=INK)
    columns = [
        ("何時", "時鐘＝先後與年代", PALE_BLUE, "clock", "放2張何時句條"),
        ("構件", "放大鏡＝看得到的部分", PALE_TEAL, "magnifier", "放3張構件句條"),
        ("功能", "齒輪＝這一部分能做什麼", PALE_AMBER, "gear", "放3張功能句條"),
    ]
    gap = 34
    left = 72
    col_w = (width - 144 - gap * 2) // 3
    for idx, (title, hint, fill, prop, count) in enumerate(columns, start=1):
        x1 = left + (idx - 1) * (col_w + gap)
        x2 = x1 + col_w
        rounded(draw, (x1, 330, x2, 1085), fill, outline=TEAL, width=4, radius=28)
        rounded(draw, (x1 + 22, 352, x1 + 78, 408), TEAL, outline=TEAL, radius=14)
        draw.text((x1 + 40, 364), str(idx), font=F_SUBTITLE, fill="white")
        draw.text((x1 + 100, 350), title, font=font(42, True), fill=NAVY)
        draw_detective(draw, (x2 - 88, 390), 0.50, prop)
        draw_wrapped(draw, (x1 + 34, 445), hint, F_BODY_BOLD, INK, col_w - 68)
        draw.text((x1 + 34, 520), count, font=F_SMALL, fill=MUTED)
        slots = 2 if idx == 1 else 3
        sy = 585
        for slot in range(slots):
            rounded(draw, (x1 + 34, sy, x2 - 34, sy + 115), "white", outline=LINE, width=2, radius=15)
            draw.text((x1 + 60, sy + 38), f"句條放置區 {slot + 1}", font=F_BODY, fill=LINE)
            sy += 135
    rounded(draw, (72, 1110, width - 72, 1190), PALE_ROSE, outline=RED, width=2, radius=18)
    draw.text((105, 1135), "完成後：把3張構件句條和3張功能句條一一配對，再到全景圖指出位置。", font=F_BODY_BOLD, fill="#8B3A3A")
    image.save(path, quality=95)


def draw_chinese_strips(path):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    header(draw, "中文資料句條草圖｜一套8張", "A4裁切頁，每組1套")
    draw.text((75, 258), "學生版正面不印分類；左上角代碼供教師核對，正式版可改印背面。", font=F_SMALL, fill=MUTED)
    cards = [
        ("何時1", "1922年，彰化扇形車庫啟用，初期有6股道。", "clock", PALE_BLUE),
        ("何時2", "後來分期增建，1933年形成12股道。", "clock", PALE_BLUE),
        ("構件1", "轉車台位在扇形軌道中央。", "magnifier", PALE_TEAL),
        ("構件2", "放射狀軌道從轉車台連到各個庫位。", "link", PALE_TEAL),
        ("構件3", "扇形車庫有多個庫位，可容納火車頭。", "magnifier", PALE_TEAL),
        ("功能1", "轉車台讓火車頭轉向並對準軌道。", "gear", PALE_AMBER),
        ("功能2", "放射狀軌道讓火車頭進出不同庫位。", "gear", PALE_AMBER),
        ("功能3", "車庫供火車頭檢修、保養與停放。", "gear", PALE_AMBER),
    ]
    card_w = 530
    card_h = 285
    xs = [72, 638]
    y0 = 330
    for index, (code, sentence, prop, fill) in enumerate(cards):
        col = index % 2
        row = index // 2
        x = xs[col]
        y = y0 + row * 335
        rounded(draw, (x, y, x + card_w, y + card_h), "white", outline=TEAL, width=3, radius=22)
        rounded(draw, (x + 18, y + 18, x + 118, y + 54), fill, outline=TEAL, width=1, radius=10)
        draw.text((x + 34, y + 24), code, font=F_TINY, fill=NAVY)
        draw_detective(draw, (x + card_w - 78, y + 72), 0.38, prop)
        draw_wrapped(draw, (x + 28, y + 92), sentence, F_BODY_BOLD, INK, card_w - 56, spacing=8, max_lines=4)
        draw.line((x + 20, y + card_h - 28, x + card_w - 20, y + card_h - 28), fill=LINE, width=2)
        draw.text((x + 28, y + card_h - 32), "沿虛線裁切", font=F_TINY, fill=MUTED)
    image.save(path, quality=95)


def draw_english_cards(path):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    header(draw, "英文句型卡草圖｜一套4張", "A5裁切頁，每組1套")
    draw.text((78, 262), "只支援構件辨認與位置表達；功能仍用中文。兩人抽問句卡與回答卡輪流練習。", font=F_SMALL, fill=MUTED)
    cards = [
        ("問名稱", "What's this?", "指向一個構件再問", "speech", PALE_BLUE),
        ("答名稱", "It's a __________.", "看圖例說構件名稱", "magnifier", PALE_TEAL),
        ("問位置", "Where's the __________?", "先放入構件名稱再問", "pin", PALE_AMBER),
        ("答位置", "It's in the __________.", "提示：middle＝中間", "pin", PALE_ROSE),
    ]
    positions = [(74, 350), (638, 350), (74, 970), (638, 970)]
    for (label, pattern, hint, prop, fill), (x, y) in zip(cards, positions):
        rounded(draw, (x, y, x + 528, y + 520), fill, outline=TEAL, width=4, radius=28)
        rounded(draw, (x + 22, y + 22, x + 160, y + 68), "white", outline=TEAL, width=2, radius=12)
        draw.text((x + 42, y + 31), label, font=F_SMALL, fill=NAVY)
        draw_detective(draw, (x + 425, y + 105), 0.58, prop)
        draw_wrapped(draw, (x + 34, y + 185), pattern, font(34, True), NAVY, 460, spacing=10, max_lines=2)
        rounded(draw, (x + 30, y + 335, x + 498, y + 455), "white", outline=LINE, width=2, radius=16)
        draw_wrapped(draw, (x + 52, y + 362), hint, F_BODY, INK, 420, spacing=7, max_lines=2)
        draw.text((x + 34, y + 480), "學生操作提示", font=F_TINY, fill=MUTED)
    image.save(path, quality=95)


def draw_guide_sequence(path):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    header(draw, "30秒扇形車庫導覽順序卡草圖", "A5直式，每組1張")
    draw.text((80, 260), "四人依1→2→3→4接力；各人說完就把麥克風圖示指向下一位。", font=F_SMALL, fill=MUTED)
    steps = [
        (1, "由來小偵探｜約8秒", "句首：1922年……；後來到1933年……", "magnifier", PALE_BLUE),
        (2, "英文提問員｜約6秒", "指一個構件，問 What's this? 或 Where's ...?", "speech", PALE_TEAL),
        (3, "英文回答員｜約6秒", "依圖例回答 It's a ... 或 It's in the ...", "pin", PALE_AMBER),
        (4, "功能說明員｜約10秒", "句首：中央轉車台可以……／軌道可以……", "gear", PALE_ROSE),
    ]
    y = 330
    for number, title, prompt, prop, fill in steps:
        rounded(draw, (72, y, WIDTH - 72, y + 285), fill, outline=TEAL, width=3, radius=24)
        rounded(draw, (98, y + 25, 168, y + 95), TEAL, outline=TEAL, radius=18)
        draw.text((121, y + 39), str(number), font=font(34, True), fill="white")
        draw.text((195, y + 30), title, font=F_SECTION, fill=NAVY)
        draw_detective(draw, (1060, y + 80), 0.48, prop)
        rounded(draw, (110, y + 125, 1125, y + 235), "white", outline=LINE, width=2, radius=15)
        draw_wrapped(draw, (140, y + 150), prompt, F_BODY, INK, 930, spacing=6, max_lines=2)
        if number < 4:
            draw.line((620, y + 245, 620, y + 310), fill=PURPLE, width=5)
            draw.polygon([(606, y + 300), (634, y + 300), (620, y + 320)], fill=PURPLE)
        y += 320
    rounded(draw, (72, 1620, WIDTH - 72, 1702), PALE_AMBER, outline="#D4A72C", width=2, radius=18)
    draw.text((115, 1645), "上台採自願；未上台者在座位依圖例指圖聆聽。", font=F_BODY_BOLD, fill="#7A5710")
    image.save(path, quality=95)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    outputs = [
        OUTPUT_DIR / "01_個人解密單_詳案理解草圖.png",
        OUTPUT_DIR / "02_四色圖例卡_詳案理解草圖.png",
        OUTPUT_DIR / "03_三格出口票_詳案理解草圖.png",
        OUTPUT_DIR / "04_何時構件功能三格圖示板_詳案理解草圖.png",
        OUTPUT_DIR / "05_中文資料句條8張_詳案理解草圖.png",
        OUTPUT_DIR / "06_英文句型卡4張_詳案理解草圖.png",
        OUTPUT_DIR / "07_30秒導覽順序卡_詳案理解草圖.png",
    ]
    draw_worksheet(outputs[0])
    draw_color_key(outputs[1])
    draw_exit_ticket(outputs[2])
    draw_three_cell_board(outputs[3])
    draw_chinese_strips(outputs[4])
    draw_english_cards(outputs[5])
    draw_guide_sequence(outputs[6])
    for path in outputs:
        print(path)


if __name__ == "__main__":
    main()
