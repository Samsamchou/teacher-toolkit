"""compose_samples.py — 畫風樣張：新背景（放大到 1920×1080）＋核准透明角色 PNG（裁到角色範圍、腳踩地面）。
用法：python -I compose_samples.py → art/samples/*.png
"""
import pathlib
from PIL import Image, ImageFilter

ART = pathlib.Path(__file__).resolve().parent
CH = pathlib.Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui\共用視覺資產\二水在地課程角色組_20260903")
W, H = 1920, 1080


def char(name, height):
    p = next((CH / "04_正式透明角色PNG").glob(name + "*.png"), None) or next((CH / "05_追加姿勢_20260904").glob(name + "*.png"))
    im = Image.open(p).convert("RGBA"); im = im.crop(im.getchannel("A").getbbox())
    return im.resize((round(im.width * height / im.height), height), Image.LANCZOS)


def put(bg, im, cx, foot_y, shadow=True):
    x, y = round(cx - im.width / 2), round(foot_y - im.height)
    if shadow:  # 腳下淡淡接地影，避免看起來浮著
        sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); a = Image.new("L", (int(im.width * .8), 28), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(a).ellipse((0, 0, a.width - 1, 27), fill=90)
        sh.paste((0, 0, 0, 255), (round(cx - a.width / 2), foot_y - 16), a)
        bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)))
    bg.alpha_composite(im, (x, y))


def scene(key, cast, out):
    bg = Image.open(ART / "bg" / f"{key}.png").convert("RGBA").resize((W, H), Image.LANCZOS)
    for name, h, cx, fy in cast: put(bg, char(name, h), cx, fy)
    (ART / "samples").mkdir(exist_ok=True); bg.convert("RGB").save(ART / "samples" / out, quality=92); print(out)


scene("B03", [("22_女孩_驚訝發現", 520, 330, 1045), ("15_男孩_指向畫面右方", 550, 680, 1055)], "sample_B03_公園火車頭_v2.png")
scene("B08", [("37_女孩_拿相機拍照", 400, 1180, 1030), ("14_男孩_驚訝發現", 430, 1500, 1050),
              ("30_臺灣獼猴_驚訝發現", 170, 1760, 1000)], "sample_B08_花旗木鐵道_v2.png")
scene("B03s", [("22_女孩_驚訝發現", 520, 330, 1045), ("15_男孩_指向畫面右方", 550, 680, 1055)], "sample_B03_公園火車頭_v2_畫風版.png")
