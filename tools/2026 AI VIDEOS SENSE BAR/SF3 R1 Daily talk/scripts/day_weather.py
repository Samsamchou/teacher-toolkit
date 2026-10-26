"""Reusable "day + weather" overlay (RDQ 2026-10-26, S01): calendar flip + Mon-Sun row on the top left,
a cartoon weather icon + bilingual weather card on the top right. Everything is drawn by code (no AI text).

  python scripts/day_weather.py sample            -> work/day_weather_sample.jpg (overlay fully shown, on the S01 frame at 6 s)
  python scripts/day_weather.py render            -> still/S01_dw.mp4 (1920x1080, 24 fps, narration audio)

Change the day / weather in CONF (or pass another dict to Overlay). Timing comes from work/word_times.json:
the calendar lands when the narrator says the day word, the weather pops in on the weather word.
Weather icons: sunny, cloudy, rainy. Nothing enters the bottom third (karaoke subtitles live there).
"""
import json, math, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FILM = Path(__file__).resolve().parents[1]
W, H, FPS = 1920, 1080, 24
EN = str(FILM / "fonts" / "ComicRelief-Regular.ttf")
ZH = "C:/Windows/Fonts/msjhbd.ttc"
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

CONF = dict(
    shot="S01", src="seedance/S01/ref_1.mp4", narr="voices_final/S01_narr.wav", narr_at=0.6,
    day="Sunday", day_zh="星期天", day_word="Sunday",
    weather="sunny", weather_zh="晴天", weather_word="sunny",
)

INK = (40, 48, 70, 255)
RED = (226, 72, 62, 255)
WHITE = (255, 255, 255, 255)
GOLD = (255, 196, 40, 255)


def font(path, size):
    return ImageFont.truetype(path, size)


def ease(x):
    x = min(1.0, max(0.0, x))
    return 1 - (1 - x) ** 3


def pop(x):  # overshoot 0 -> 1.15 -> 1
    x = min(1.0, max(0.0, x))
    return 1 + 0.15 * math.sin(x * math.pi) if x < 1 else 1.0 if x >= 1 else x


def word_time(key, word, offset):
    wt = json.loads((FILM / "work" / "word_times.json").read_text(encoding="utf-8"))[key]
    for w in wt:
        if w["w"].lower().strip(".,!?") == word.lower():
            return offset + w["s"]
    raise SystemExit(f"{word!r} not found in word_times[{key}]")


def fit(text, path, size, max_w):
    """Largest font <= size whose text fits max_w (long day names like WEDNESDAY)."""
    while size > 12:
        f = ImageFont.truetype(path, size)
        if f.getlength(text) <= max_w:
            return f
        size -= 2
    return ImageFont.truetype(path, size)


def shadowed(layer, draw_fn):
    """Draw onto a temp layer, add a soft drop shadow, composite onto layer."""
    tmp = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(tmp))
    sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    sh.putalpha(tmp.getchannel("A").point(lambda a: a * 0.35))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    layer.alpha_composite(sh, (6, 8))
    layer.alpha_composite(tmp)


class Overlay:
    def __init__(self, c):
        self.c = c
        key = c["shot"] + "_narr"
        self.t_day = word_time(key, c["day_word"], c["narr_at"])
        self.t_wx = word_time(key, c["weather_word"], c["narr_at"])
        self.f_cal = font(EN, 56)
        self.f_day = font(EN, 34)
        self.f_lab = font(EN, 58)
        self.f_zh = font(ZH, 44)
        self.f_wx = font(EN, 54)

    # ---- calendar (top left) ----
    def calendar(self, L, t):
        t0 = self.t_day - 0.45                # starts flipping a bit before the word
        if t < t0:
            return
        x, y, w, h = 60, 46, 300, 250
        prev = DAYS[(DAYS.index(self.c["day"]) - 1) % 7]
        a = ease((t - t0) / 0.25)             # card slides in
        flip = ease((t - (t0 + 0.2)) / 0.3)   # old page flips up, new page shows

        def draw(d):
            yy = y - int((1 - a) * 60)
            d.rounded_rectangle((x, yy, x + w, yy + h), 26, fill=WHITE, outline=INK, width=5)
            d.rounded_rectangle((x, yy, x + w, yy + 70), 26, fill=RED, outline=INK, width=5)
            d.rectangle((x + 5, yy + 45, x + w - 5, yy + 68), fill=RED)
            for rx in (x + 70, x + w - 70):
                d.rounded_rectangle((rx - 9, yy - 22, rx + 9, yy + 22), 9, fill=(90, 96, 115, 255), outline=INK, width=3)
            # new page text
            d.text((x + w / 2, yy + 160), self.c["day"].upper(), font=fit(self.c["day"].upper(), EN, 56, w - 36), fill=INK, anchor="mm")
            # old page flipping up over the new one
            if flip < 1:
                ph = int((h - 72) * (1 - flip))
                if ph > 4:
                    d.rectangle((x + 5, yy + 72, x + w - 5, yy + 72 + ph), fill=(250, 248, 240, 255))
                    if ph > 60:
                        d.text((x + w / 2, yy + 72 + ph / 2), prev.upper(), font=fit(prev.upper(), EN, 56, w - 36), fill=(150, 150, 160, 255), anchor="mm")
        shadowed(L, draw)

    # ---- Mon..Sun row + bilingual label (right of the calendar) ----
    def week(self, L, t):
        t0 = self.t_day - 0.1
        if t < t0:
            return
        x0, y, bw, gap = 400, 62, 104, 10
        target = DAYS.index(self.c["day"])

        def draw(d):
            for i, name in enumerate(DAYS):
                ai = ease((t - t0 - i * 0.04) / 0.2)
                if ai <= 0:
                    continue
                xx = x0 + i * (bw + gap)
                on = t >= self.t_day + 0.25 and i == target
                s = pop((t - self.t_day - 0.25) / 0.3) if on else 1
                cx, cy = xx + bw / 2, y + 40
                hw, hh = bw / 2 * s, 38 * s
                fill = GOLD if on else (255, 255, 255, int(150 + 60 * (i == target)))
                d.rounded_rectangle((cx - hw, cy - hh, cx + hw, cy + hh), 20, fill=fill, outline=INK if on else (90, 96, 115, 200), width=4 if on else 3)
                d.text((cx, cy), name[:3], font=self.f_day, fill=INK if on else (100, 104, 120, 255), anchor="mm")
            ta = ease((t - self.t_day - 0.4) / 0.3)
            if ta > 0:
                lx, ly = x0, y + 100 + int((1 - ta) * 20)
                txt = self.c["day"]
                tw = d.textlength(txt, font=self.f_lab)
                zw = d.textlength(self.c["day_zh"], font=self.f_zh)
                d.rounded_rectangle((lx, ly, lx + tw + zw + 80, ly + 84), 24, fill=WHITE, outline=INK, width=5)
                d.text((lx + 28, ly + 42), txt, font=self.f_lab, fill=RED, anchor="lm")
                d.text((lx + 52 + tw, ly + 44), self.c["day_zh"], font=self.f_zh, fill=INK, anchor="lm")
        shadowed(L, draw)

    # ---- weather icon + card (top right) ----
    def weather(self, L, t):
        t0 = self.t_wx - 0.25
        if t < t0:
            return
        cx, cy, r = 1730, 138, 80
        s = pop((t - t0) / 0.35)
        kind = self.c["weather"]
        if kind == "sunny":
            # soft glow
            g = Image.new("RGBA", L.size, (0, 0, 0, 0))
            gd = ImageDraw.Draw(g)
            gr = r * 2.3 * s
            gd.ellipse((cx - gr, cy - gr, cx + gr, cy + gr), fill=(255, 230, 120, 90))
            L.alpha_composite(g.filter(ImageFilter.GaussianBlur(40)))

        def draw(d):
            rr = r * s
            if kind == "sunny":
                rot = (t - t0) * 25
                for k in range(12):
                    ang = math.radians(rot + k * 30)
                    r1, r2 = rr * 1.2, rr * (1.62 if k % 2 == 0 else 1.45)
                    p = [(cx + math.cos(ang - 0.11) * r1, cy + math.sin(ang - 0.11) * r1),
                         (cx + math.cos(ang) * r2, cy + math.sin(ang) * r2),
                         (cx + math.cos(ang + 0.11) * r1, cy + math.sin(ang + 0.11) * r1)]
                    d.polygon(p, fill=GOLD, outline=(230, 140, 20, 255))
                d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=(255, 214, 60, 255), outline=(230, 140, 20, 255), width=6)
                e = rr * 0.28
                d.ellipse((cx - e - 14, cy - 18, cx - e + 2, cy + 2), fill=INK)
                d.ellipse((cx + e - 2, cy - 18, cx + e + 14, cy + 2), fill=INK)
                d.arc((cx - rr * 0.42, cy - rr * 0.2, cx + rr * 0.42, cy + rr * 0.5), 20, 160, fill=INK, width=7)
                d.ellipse((cx - rr * 0.68, cy + 4, cx - rr * 0.42, cy + 26), fill=(255, 150, 120, 200))
                d.ellipse((cx + rr * 0.42, cy + 4, cx + rr * 0.68, cy + 26), fill=(255, 150, 120, 200))
            elif kind == "cloudy":
                for ox, oy, cr in ((-50, 20, 55), (10, -10, 72), (70, 22, 52)):
                    d.ellipse((cx + ox * s - cr * s, cy + oy * s - cr * s, cx + ox * s + cr * s, cy + oy * s + cr * s), fill=(235, 240, 248, 255), outline=INK, width=5)
            elif kind == "rainy":
                for ox, oy, cr in ((-50, 0, 50), (10, -25, 66), (66, 4, 48)):
                    d.ellipse((cx + ox * s - cr * s, cy + oy * s - cr * s, cx + ox * s + cr * s, cy + oy * s + cr * s), fill=(190, 200, 218, 255), outline=INK, width=5)
                ph = (t * 3) % 1
                for k, ox in enumerate((-55, -10, 35, 80)):
                    yy = cy + 60 + ((ph + k * 0.25) % 1) * 50
                    d.line((cx + ox, yy, cx + ox - 8, yy + 22), fill=(70, 140, 230, 255), width=7)
            ca = ease((t - self.t_wx) / 0.3)
            if ca > 0:
                txt, zh = self.c["weather"], self.c["weather_zh"]
                tw = d.textlength(txt, font=self.f_wx)
                zw = d.textlength(zh, font=self.f_zh)
                bw = tw + zw + 70
                bx, by = 1885 - bw, 278 + int((1 - ca) * 20)
                d.rounded_rectangle((bx, by, bx + bw, by + 88), 24, fill=WHITE, outline=INK, width=5)
                d.text((bx + 28, by + 44), txt, font=self.f_wx, fill=(230, 120, 10, 255), anchor="lm")
                d.text((bx + 52 + tw, by + 46), zh, font=self.f_zh, fill=INK, anchor="lm")
        shadowed(L, draw)

    def frame(self, t):
        L = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        self.weather(L, t)
        self.calendar(L, t)
        self.week(L, t)
        return L


def src_frame(path, t):
    f = Path(tempfile.gettempdir()) / "_dw_src.png"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t}", "-i", str(FILM / path), "-frames:v", "1",
                    "-vf", f"scale={W}:{H}:flags=lanczos", str(f)], check=True)
    return Image.open(f).convert("RGBA")


def render(c):
    ov = Overlay(c)
    src = FILM / c["src"]
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)],
                               capture_output=True, text=True).stdout)
    n = int(dur * FPS)
    dec = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", str(src), "-vf", f"fps={FPS},scale={W}:{H}:flags=lanczos",
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    out = FILM / "still" / f"{c['shot']}_dw.mp4"
    out.parent.mkdir(exist_ok=True)
    enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                            "-r", str(FPS), "-i", "-", "-i", str(FILM / c["narr"]),
                            "-filter_complex", f"[1:a]adelay={int(c['narr_at'] * 1000)}|{int(c['narr_at'] * 1000)},apad,aresample=48000[a]",
                            "-map", "0:v", "-map", "[a]", "-shortest", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "192k", str(out)], stdin=subprocess.PIPE)
    for i in range(n):
        raw = dec.stdout.read(W * H * 3)
        if len(raw) < W * H * 3:
            break
        im = Image.frombytes("RGB", (W, H), raw).convert("RGBA")
        im.alpha_composite(ov.frame(i / FPS))
        enc.stdin.write(im.convert("RGB").tobytes())
    enc.stdin.close(); enc.wait(); dec.wait()
    print(out)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "sample"
    if cmd == "sample":
        im = src_frame(CONF["src"], 6.0)
        im.alpha_composite(Overlay(CONF).frame(6.0))
        d = ImageDraw.Draw(im)
        d.line((0, H * 2 / 3, W, H * 2 / 3), fill=(255, 0, 0, 160), width=3)  # bottom-third guide (sample only)
        p = FILM / "work" / "day_weather_sample.jpg"
        im.convert("RGB").save(p, quality=90)
        print(p)
    else:
        render(CONF)
