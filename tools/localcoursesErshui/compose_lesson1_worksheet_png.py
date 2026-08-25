from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path.cwd()
ASSET_DIR = ROOT / "assets" / "animals_worksheet"
BACKGROUND = ASSET_DIR / "animals_worksheet_artwork.png"
COMIC = ASSET_DIR / "ComicRelief-Regular.ttf"
BIUKAI = Path(r"C:\Windows\Fonts\kaiu.ttf")
OUT = ASSET_DIR / "學習單一_我的動物朋友搭上二水小火車_3D日式動漫.png"

NAVY = "#1B4264"
TEAL = "#126C73"
CORAL = "#B6524B"
GREY = "#53656F"


def font(path, size):
    return ImageFont.truetype(str(path), size=size)


def fit_font(draw, text, font_path, max_size, max_width, min_size=14):
    for size in range(max_size, min_size - 1, -1):
        candidate = font(font_path, size)
        box = draw.textbbox((0, 0), text, font=candidate)
        if box[2] - box[0] <= max_width:
            return candidate
    return font(font_path, min_size)


def center(draw, text, y, fnt, fill, x_center=512):
    box = draw.textbbox((0, 0), text, font=fnt)
    x = x_center - (box[2] - box[0]) / 2
    draw.text((x, y), text, font=fnt, fill=fill)


def left(draw, text, x, y, fnt, fill):
    draw.text((x, y), text, font=fnt, fill=fill)


def main():
    image = Image.open(BACKGROUND).convert("RGBA")
    draw = ImageDraw.Draw(image)

    # Top title panel
    title = "學習單一｜我的動物朋友搭上二水小火車"
    center(draw, title, 67, fit_font(draw, title, BIUKAI, 46, 870), NAVY)
    center(draw, "Animals  •  Lesson 1", 132, font(COMIC, 31), TEAL)

    # Student information strip
    info = font(BIUKAI, 20)
    left(draw, "班級：________", 88, 247, info, NAVY)
    left(draw, "座號：______", 398, 247, info, NAVY)
    left(draw, "姓名：________", 684, 247, info, NAVY)

    # Three learning cards. The animal mascots in the train are the visual clue;
    # the blank cards stay intentionally clear for students to trace / paste / draw.
    card_x = [70, 373, 676]
    words = ["dog", "cat", "turtle"]
    for x, word in zip(card_x, words):
        center(draw, word, 347, font(COMIC, 38), TEAL, x + 137)
        center(draw, "老師貼圖卡／我畫圖", 415, font(BIUKAI, 18), GREY, x + 137)
        center(draw, "我會說：" + word, 480, font(BIUKAI, 18), NAVY, x + 137)

    # Panel A
    left(draw, "A. 看圖選字", 80, 586, font(BIUKAI, 27), NAVY)
    left(draw, "請看老師投影的動物圖卡，圈選你聽到的英文。", 80, 627, font(BIUKAI, 20), GREY)
    center(draw, "我聽到：   □ dog      □ cat      □ turtle", 680, font(BIUKAI, 26), TEAL)

    # Panel B
    left(draw, "B. 問問同學", 80, 784, font(BIUKAI, 27), NAVY)
    left(draw, "Do you have a ______ ?", 80, 826, font(COMIC, 31), TEAL)
    left(draw, "同學 1：________   □ Yes, I do.   □ No, I don't.", 80, 873, font(BIUKAI, 20), NAVY)
    left(draw, "同學 2：________   □ Yes, I do.   □ No, I don't.", 80, 910, font(BIUKAI, 20), NAVY)

    # Bottom teacher-provided local-material inquiry note.
    left(draw, "C. 在教室用資料認識二水", 83, 1377, font(BIUKAI, 25), NAVY)
    left(draw, "看老師提供的二水照片、短片或資料卡，圈選一個線索：", 83, 1412, font(BIUKAI, 18), GREY)
    left(draw, "□ 老火車    □ 公園    □ 解說牌    提醒：根據資料再說二水有什麼。", 83, 1451, font(BIUKAI, 17), TEAL)

    image.convert("RGB").save(OUT, quality=95, dpi=(150, 150))
    print(OUT)


if __name__ == "__main__":
    main()
