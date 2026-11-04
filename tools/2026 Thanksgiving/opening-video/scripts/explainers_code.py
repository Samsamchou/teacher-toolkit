"""程式解說動畫（第二次念）＋ S11 全程式（Pippy 程式嘴形）。
  python scripts/explainers_code.py X04 X06 X10 X11 S11
輸出：
  work/X04.mp4、X06.mp4、X10.mp4、X11.mp4  —— 長度＝<id>_2 的 H3 片長（和 build_specs 同算法），跟著 take2 的字走
  h3/S11_1/clip.mp4＋guide.wav —— 第一次念：大 Pippy（程式嘴形）＋月曆動畫
  h3/S11_2/clip.mp4＋guide.wav —— 第二次念用來裁 Pippy 小頭像的「說話 Pippy」（1344x768，臉在正中）
  work/X??_events.json —— 音效時間點（給 compose 用）
版面（和 S03 地圖一樣）：左上角留給直排標籤、最下方 230 px 留給字幕、Pippy 小頭像那個角落不放內容。
"""
import json, math, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np, soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FILM = Path(__file__).resolve().parents[1]
WORK = FILM / "work"
W, H, FPS, SR, LINE_AT, TAIL = 1920, 1080, 24, 48000, 0.5, 0.8
FONTS = WORK / "fonts"
EN, ZH = str(FONTS / "ComicRelief-Regular.ttf"), str(FONTS / "msjhbd.ttc")
WORDS = json.loads((FILM / "voices" / "words.json").read_text(encoding="utf-8"))
_F = {}


def font(sz, zh=False):
    k = (sz, zh)
    if k not in _F:
        _F[k] = ImageFont.truetype(ZH if zh else EN, sz)
    return _F[k]


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, t)))


def pop(t):            # 0 -> overshoot -> 1
    t = max(0.0, min(1.0, t))
    return 1 + 0.25 * math.sin(math.pi * t) * (1 - t) * 2 if t < 1 else 1.0


def frames_for(d):
    n = 0
    while 17 * n + 5 < d * FPS:
        n += 1
    return 17 * n + 5


def voice(sid, k):
    """Trimmed voice like build_specs.load; returns (wave, offset of trim)."""
    t = Path(tempfile.mkdtemp()) / "a.wav"
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(FILM / "voices" / f"{sid}_{k}.mp3"),
                    "-ar", str(SR), "-ac", "1", str(t)], check=True)
    w, _ = sf.read(str(t), dtype="float32"); idx = np.where(np.abs(w) > 0.01)[0]
    a = max(0, idx[0] - 2400)
    return w[a: idx[-1] + 2400], a / SR


def clip_len(sid, k):
    w, _ = voice(sid, k)
    return frames_for(LINE_AT + len(w) / SR + TAIL) / FPS


def words(sid, k):
    _, off = voice(sid, k)
    return [(x["w"], LINE_AT + x["t"] - off, x["d"]) for x in WORDS[sid][f"take{k}"]]


def at(ws, key, n=0, end=False):
    hits = [(t, d) for w, t, d in ws if key.lower() in w.lower()]
    t, d = hits[n]
    return t + d if end else t


def guide(sid, k, dst):
    """Same guide.wav as build_specs (voice starts at LINE_AT)."""
    w, _ = voice(sid, k); secs = clip_len(sid, k)
    buf = np.zeros(int(secs * SR), dtype=np.float32); st = int(LINE_AT * SR); seg = w[: len(buf) - st]; buf[st:st + len(seg)] = seg
    dst.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(dst), "wb") as g:
        g.setnchannels(1); g.setsampwidth(2); g.setframerate(SR)
        g.writeframes((np.clip(buf, -1, 1) * 32767).astype("<i2").tobytes())
    return buf


def render(dst, secs, fn, size=(W, H)):
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{size[0]}x{size[1]}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                          "-crf", "17", str(dst)], stdin=subprocess.PIPE)
    n = int(round(secs * FPS))
    for i in range(n):
        p.stdin.write(fn(i / FPS).convert("RGB").tobytes())
    p.stdin.close(); p.wait()
    for frac in (0.3, 0.6, 0.95):
        fn(secs * frac).convert("RGB").resize((640, int(640 * size[1] / size[0]))).save(WORK / "qa" / f"{dst.stem}_{frac:.2f}.png")
    return n


def text(d, xy, s, sz, fill, stroke=6, sfill=(255, 255, 255), zh=False, anchor="mm", a=1.0):
    if a <= 0:
        return
    f = font(sz, zh); al = int(255 * a)
    d.text(xy, s, font=f, fill=fill + (al,), anchor=anchor, stroke_width=stroke, stroke_fill=sfill + (al,))


def sky(top, bottom, horizon=H):
    g = np.linspace(0, 1, horizon)[:, None]
    arr = (np.array(top)[None, :] * (1 - g) + np.array(bottom)[None, :] * g).astype(np.uint8)
    im = Image.new("RGB", (W, H), bottom)
    im.paste(Image.fromarray(np.repeat(arr[:, None, :], W, axis=1).reshape(horizon, W, 3)), (0, 0))
    return im


def person(d, x, y, s, body, head=(240, 200, 160), a=255, hat=None):
    """Simple rounded people icon, (x, y) = feet centre, s = height."""
    r = s * 0.17
    d.rounded_rectangle([x - s * 0.22, y - s * 0.62, x + s * 0.22, y], radius=s * 0.16, fill=body + (a,))
    d.ellipse([x - r, y - s * 0.62 - 2 * r - 2, x + r, y - s * 0.62 - 2], fill=head + (a,))
    if hat == "pilgrim":
        d.rectangle([x - r * 0.8, y - s * 0.62 - 2 * r - r * 1.0, x + r * 0.8, y - s * 0.62 - 2 * r + 2], fill=(40, 35, 35, a))
        d.rectangle([x - r * 1.3, y - s * 0.62 - 2 * r - 2, x + r * 1.3, y - s * 0.62 - 2 * r + 4], fill=(40, 35, 35, a))
    elif hat == "hair":
        d.chord([x - r, y - s * 0.62 - 2 * r - 2, x + r, y - s * 0.62 - 2], 180, 360, fill=(40, 30, 25, a))


# ---------------------------------------------------------------- X04 Mayflower + about 100
def x04():
    ws = words("S04", 2); secs = clip_len("S04", 2)
    t_may, t_ab, t_end = at(ws, "Mayflower"), at(ws, "About"), at(ws, "people", end=True)
    bg = sky((150, 205, 240), (210, 235, 250), 700)
    d0 = ImageDraw.Draw(bg); d0.rectangle([0, 700, W, H], fill=(60, 130, 190))
    for y in range(720, H, 40):
        d0.arc([-100, y, W + 100, y + 60], 200, 340, fill=(90, 160, 215), width=4)
    # ship (bubble is bottom-left, so the ship sits centre-right)
    hull = [(640, 520), (1720, 520), (1640, 730), (720, 730)]
    seats = [(780 + (i % 20) * 45, 575 + (i // 20) * 32) for i in range(100)]
    rng = np.random.default_rng(4); cols = [tuple(int(c) for c in rng.choice([[60, 60, 70], [90, 70, 50], [120, 40, 40], [50, 70, 100], [150, 150, 140]])) for _ in seats]
    ev = dict(mayflower=t_may, count_start=t_ab, count_end=t_end, ticks=[])

    def fr(t):
        im = bg.convert("RGBA"); ov = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(ov)
        bob = 6 * math.sin(t * 2.2)
        for mx, top in ((960, 170), (1220, 140), (1460, 200)):
            d.line([(mx, 520 + bob), (mx, top + bob)], fill=(90, 60, 35, 255), width=12)
            d.polygon([(mx - 120, top + 40 + bob), (mx + 120, top + 40 + bob), (mx + 105, 470 + bob), (mx - 105, 470 + bob)], fill=(250, 244, 225, 255))
        d.polygon([(x, y + bob) for x, y in hull], fill=(130, 80, 40, 255))
        # cut-away hull window shows the people inside
        cut = ease((t - t_ab + 0.3) / 0.5)
        if cut > 0:
            d.rounded_rectangle([755, 548 + bob, 1665, 715 + bob], radius=18, fill=(250, 225, 170, int(255 * cut)))
        n = int(round(100 * ease((t - t_ab) / max(0.6, t_end - t_ab)))) if t >= t_ab else 0
        for i in range(n):
            x, y = seats[i]; person(d, x, y + 26 + bob, 30, cols[i], hat="pilgrim" if i % 3 == 0 else None)
        d.line([(640, 520 + bob), (1720, 520 + bob)], fill=(90, 55, 25, 255), width=10)
        # name plate
        s = pop((t - t_may + 0.1) / 0.5) if t >= t_may - 0.1 else 0
        if s:
            f = font(int(84 * s)); w_ = d.textlength("Mayflower", font=f)
            d.rounded_rectangle([1180 - w_ / 2 - 30, 400 + bob - 55 * s, 1180 + w_ / 2 + 30, 400 + bob + 55 * s], radius=24, fill=(255, 250, 235, 255), outline=(120, 70, 30, 255), width=6)
            d.text((1180, 400 + bob), "Mayflower", font=f, fill=(110, 55, 20, 255), anchor="mm")
        if t >= t_ab:
            text(d, (1500, 200), f"{n}", 120, (255, 200, 40), stroke=10, sfill=(70, 40, 20))
            if n >= 100:
                text(d, (1500, 300), "about 100", 64, (255, 255, 255), stroke=8, sfill=(70, 40, 20), a=ease((t - t_end) / 0.3))
        im.alpha_composite(ov)
        return im
    for k in range(1, 11):
        ev["ticks"].append(t_ab + (t_end - t_ab) * k / 10 * 0.95)
    render(WORK / "X04.mp4", secs, fr)
    (WORK / "X04_events.json").write_text(json.dumps(ev, indent=1), encoding="utf-8")


# ---------------------------------------------------------------- X06 Wampanoag land
def x06():
    ws = words("S06", 2); secs = clip_len("S06", 2)
    t_land, t_wamp = at(ws, "land"), at(ws, "Wampanoag")
    t_arr = at(ws, "came", end=True) + 0.6
    SEA, LAND, EDGE = (120, 190, 230), (238, 214, 160), (190, 150, 95)
    coast = [(0, 140), (520, 150), (700, 300), (760, 420), (900, 470), (1010, 470), (1090, 420), (1140, 330), (1190, 300),
             (1215, 330), (1180, 430), (1110, 540), (980, 600), (860, 640), (780, 780), (620, 900), (560, 1080), (0, 1080)]
    region = [(700, 300), (760, 420), (900, 470), (1010, 470), (1090, 420), (1140, 330), (1190, 300), (1215, 330),
              (1180, 430), (1110, 540), (980, 600), (860, 640), (780, 780), (640, 740), (600, 560), (620, 400)]
    base = Image.new("RGB", (W, H), SEA); d0 = ImageDraw.Draw(base)
    for y in range(0, H, 60):
        d0.arc([-200, y, W + 200, y + 120], 200, 340, fill=(140, 205, 240), width=3)
    d0.polygon(coast, fill=LAND, outline=EDGE)
    base = base.filter(ImageFilter.SMOOTH)
    huts = [(760, 560), (850, 520), (930, 560), (700, 650), (1060, 480)]
    ev = dict(land=t_land, wamp=t_wamp, arrive=t_arr)

    def fr(t):
        im = base.convert("RGBA"); ov = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(ov)
        g = ease((t - t_wamp + 0.1) / 0.5); pulse = 0.5 + 0.5 * math.sin(t * 6)
        if t >= t_land - 0.1:
            d.line(region + [region[0]], fill=(40, 140, 60, int(255 * min(1, ease((t - t_land + 0.1) / 0.3)))), width=int(8 + 4 * pulse * (1 - g)))
        if g > 0:
            d.polygon(region, fill=(110, 190, 100, int(170 * g)))
            for i, (x, y) in enumerate(huts):
                a = ease((t - t_wamp - 0.15 * i) / 0.35)
                if a > 0:
                    d.chord([x - 34, y - 34, x + 34, y + 30], 180, 360, fill=(150, 110, 70, int(255 * a)), outline=(90, 60, 30, int(255 * a)), width=3)
                    d.rectangle([x - 34, y - 2, x + 34, y + 2], fill=(90, 60, 30, int(255 * a)))
            text(d, (930, 380), "Wampanoag land", 66, (30, 90, 40), stroke=8, a=g)
        # ship sails in from the right and stops by the coast
        p = ease((t - 0.3) / max(0.8, t_arr - 0.3)); sx, sy = 1880 - (1880 - 1300) * p, 470 + 30 * p; bob = 5 * math.sin(t * 7)
        d.polygon([(sx - 50, sy + bob), (sx + 50, sy + bob), (sx + 34, sy + 32 + bob), (sx - 34, sy + 32 + bob)], fill=(130, 80, 40, 255))
        d.line([(sx, sy + bob), (sx, sy - 80 + bob)], fill=(90, 60, 30, 255), width=7)
        d.polygon([(sx + 4, sy - 76 + bob), (sx + 4, sy - 12 + bob), (sx + 52, sy - 22 + bob)], fill=(250, 245, 230, 255))
        d.polygon([(sx - 4, sy - 70 + bob), (sx - 4, sy - 12 + bob), (sx - 44, sy - 20 + bob)], fill=(250, 245, 230, 255))
        im.alpha_composite(ov)
        return im
    render(WORK / "X06.mp4", secs, fr)
    (WORK / "X06_events.json").write_text(json.dumps(ev, indent=1), encoding="utf-8")


# ---------------------------------------------------------------- X10 about 90 men + three days
def x10():
    ws = words("S10", 2); secs = clip_len("S10", 2)
    t_mas, t_lead = at(ws, "Massasoit"), at(ws, "leader")
    t_c0, t_c1 = at(ws, "came"), at(ws, "men", end=True)
    t_they, t_end = at(ws, "They"), at(ws, "days", end=True)
    c_start, c_end = at(ws, "ate"), min(secs - 0.3, t_end + 0.6)
    # bubble is bottom-right: people gather centre-left
    spots = [(470 + (i % 15) * 62, 470 + (i // 15) * 62) for i in range(90)]
    LEADER = (1440, 640)
    ev = dict(massasoit=t_mas, count_start=t_c0, count_end=t_c1, they=t_they, days=[], steps=[])

    def daylight(t):
        if t < c_start:
            return 1.0, None, 0
        u = (t - c_start) / (c_end - c_start) * 3; k = min(2, int(u)); f = u - k
        if t >= c_end:
            return 1.0, None, 3
        return 0.5 + 0.5 * math.cos(2 * math.pi * f), f, k

    def fr(t):
        lt, f, k = daylight(t)
        top = tuple(int(a * lt + b * (1 - lt)) for a, b in zip((150, 205, 240), (30, 40, 90)))
        im = sky(top, tuple(int(a * lt + b * (1 - lt)) for a, b in zip((215, 235, 245), (60, 70, 120))), 430).convert("RGBA")
        d = ImageDraw.Draw(im)
        gcol = tuple(int(a * (0.55 + 0.45 * lt)) for a in (120, 180, 90)); d.rectangle([0, 430, W, H], fill=gcol + (255,))
        ov = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(ov)
        if f is not None:      # sun by day, moon by night, crossing an arc at the top right
            ang = math.pi * (f * 2 % 1); cx, cy = 1250 - 260 * math.cos(ang), 400 - 230 * math.sin(ang)
            if f < 0.5:
                d.ellipse([cx - 48, cy - 48, cx + 48, cy + 48], fill=(255, 210, 60, 255))
            else:
                d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], fill=(245, 245, 225, 255)); d.ellipse([cx - 22, cy - 46, cx + 50, cy + 26], fill=top + (255,))
        # table for the feast (after "They")
        ta = ease((t - t_they) / 0.6)
        if ta > 0:
            d.rounded_rectangle([430, 640, 1400, 690], radius=12, fill=(140, 90, 50, int(255 * ta)))
            for i in range(14):
                d.ellipse([460 + i * 66, 622, 500 + i * 66, 650], fill=((240, 190, 60) if i % 2 else (200, 110, 50)) + (int(255 * ta),))
        # people walking in from the left, counted as they arrive
        p = (t - t_c0) / max(0.8, t_c1 - t_c0)
        n = 0
        for i, (x, y) in enumerate(spots):
            arr = ease((p - i / 90 * 0.8) / 0.2) if t >= t_c0 else 0
            if arr <= 0:
                continue
            n += arr >= 0.999
            xx = -60 + (x + 60) * arr; step = 4 * abs(math.sin(t * 9 + i)) * (1 - arr)
            person(d, xx, y - step, 52, (150, 110, 70), head=(190, 130, 90), hat="hair")
        # the leader stands in front from the start of the line
        la = ease((t - t_mas + 0.2) / 0.5)
        if la > 0:
            person(d, LEADER[0] - 300 * (1 - la), LEADER[1], 110, (120, 80, 45), head=(190, 130, 90), a=int(255 * la), hat="hair")
            d.line([(LEADER[0] - 300 * (1 - la) - 30, LEADER[1] - 70), (LEADER[0] - 300 * (1 - la) + 30, LEADER[1] - 70)], fill=(255, 255, 255, int(255 * la)), width=6)
            text(d, (LEADER[0] - 300 * (1 - la), LEADER[1] - 190), "leader", 48, (255, 215, 60), stroke=7, sfill=(60, 40, 20), a=ease((t - t_lead) / 0.3))
        if t_c0 <= t < t_they + 0.4:
            a = 1 - ease((t - t_they) / 0.4)
            text(d, (960, 200), f"{n}", 110, (255, 200, 40), stroke=10, sfill=(70, 40, 20), a=a)
            if n >= 90:
                text(d, (960, 300), "about 90", 60, (255, 255, 255), stroke=8, sfill=(70, 40, 20), a=a * ease((t - t_c1) / 0.3))
        for j in range(min(k, 3)):        # day counter 1, 2, 3
            text(d, (1100 + j * 150, 230), str(j + 1), 110, (255, 255, 255), stroke=10, sfill=(200, 80, 20))
        im.alpha_composite(ov)
        return im
    for k in range(3):
        ev["days"].append(c_start + (c_end - c_start) * (k + 1) / 3)
    ev["steps"] = [t_c0, t_c1]
    render(WORK / "X10.mp4", secs, fr)
    (WORK / "X10_events.json").write_text(json.dumps(ev, indent=1), encoding="utf-8")


# ---------------------------------------------------------------- S11 calendar (used by X11 and S11_1)
def calendar_fn(ws, box):
    """box = (x0, y0, x1, y1) where the calendar lives. Returns fn(d, t) drawing it, plus events."""
    x0, y0, x1, y1 = box; cw = x1 - x0; ch = y1 - y0
    t_year = at(ws, "1863", end=True); t_hol = at(ws, "holiday")
    t_today = at(ws, "Today"); t_on, t_thu = at(ws, "on"), at(ws, "Thursday", end=True); t_nov = at(ws, "November")
    thu = [5, 12, 19, 26]; t_count = [t_on + (t_thu - t_on) * (i + 0.5) / 4 for i in range(4)]
    ev = dict(flip_start=max(0.2, t_year - 1.4), year=t_year, stamp=t_hol, switch=t_today - 0.2, thursdays=t_count, glow=t_nov)

    def draw(d, t):
        if t < ev["switch"]:
            # tear-off year calendar flipping 1620 -> 1863
            d.rounded_rectangle([x0, y0, x1, y1], radius=30, fill=(255, 252, 245, 255), outline=(150, 60, 40, 255), width=8)
            d.rectangle([x0, y0, x1, y0 + ch * 0.2], fill=(200, 60, 45, 255))
            for i in range(6):
                rx = x0 + cw * (0.15 + 0.14 * i); d.ellipse([rx - 12, y0 - 18, rx + 12, y0 + 18], fill=(90, 90, 100, 255))
            p = ease((t - ev["flip_start"]) / max(0.3, t_year - ev["flip_start"]))
            yr = 1863 if t >= t_year else int(1620 + (1863 - 1620) * p)
            text(d, ((x0 + x1) / 2, y0 + ch * 0.47), str(yr), int(ch * 0.3), (60, 40, 30), stroke=0)
            s = pop((t - t_hol + 0.05) / 0.35) if t >= t_hol - 0.05 else 0
            if s:
                st = Image.new("RGBA", (520, 220)); sd = ImageDraw.Draw(st)
                sd.rounded_rectangle([10, 10, 510, 210], radius=30, outline=(220, 30, 40, 235), width=14)
                sd.text((260, 112), "holiday", font=font(110), fill=(220, 30, 40, 235), anchor="mm")
                st = st.rotate(8, expand=True, resample=Image.BICUBIC); st = st.resize((int(st.width * s * 0.65), int(st.height * s * 0.65)))
                d._image.alpha_composite(st, (int((x0 + x1) / 2 - st.width / 2), int(y0 + ch * 0.8 - st.height / 2)))   # below the year
            return
        # November 2026, Sunday first; Thursdays light up 1-2-3-4, then 26 glows
        a = ease((t - ev["switch"]) / 0.4)
        d.rounded_rectangle([x0, y0, x1, y1], radius=30, fill=(255, 252, 245, int(255 * a)), outline=(150, 60, 40, int(255 * a)), width=8)
        d.rectangle([x0 + 4, y0 + 4, x1 - 4, y0 + ch * 0.16], fill=(230, 120, 40, int(255 * a)))
        text(d, ((x0 + x1) / 2, y0 + ch * 0.08), "November 2026", int(ch * 0.085), (255, 255, 255), stroke=0, a=a)
        days = ["S", "M", "T", "W", "Th", "F", "S"]; gx = cw / 7; top = y0 + ch * 0.2; gy = (y1 - top - 20) / 6
        for i, dn in enumerate(days):
            c = (200, 60, 30) if i == 4 else (110, 90, 80)
            text(d, (x0 + gx * (i + 0.5), top + gy * 0.45), dn, int(gy * 0.42), c, stroke=0, a=a)
        if a > 0.5 and t >= t_count[0] - 0.2:   # highlight the Thursday column
            d.rounded_rectangle([x0 + gx * 4 + 6, top + gy * 0.9, x0 + gx * 5 - 6, y1 - 16], radius=16, fill=(255, 220, 120, int(150 * ease((t - t_count[0] + 0.2) / 0.3))))
        for day in range(1, 31):
            wd = (day + 6) % 7      # Nov 1 2026 is a Sunday -> column 0
            row = (day + 6) // 7 - 1 + 1
            cx, cy = x0 + gx * (wd + 0.5), top + gy * (row + 0.5)
            lit = day in thu and t >= t_count[thu.index(day)]
            glow = day == 26 and t >= t_nov
            if glow:
                r = gy * (0.55 + 0.06 * math.sin(t * 8)); d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 200, 40, 255))
            elif lit:
                r = gy * 0.42; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 150, 60, 255))
            text(d, (cx, cy), str(day), int(gy * (0.5 if glow else 0.4)), (255, 255, 255) if (lit or glow) else (70, 60, 55), stroke=0, a=a)
            if lit:
                i = thu.index(day); text(d, (cx + gx * 0.42, cy - gy * 0.32), str(i + 1), int(gy * 0.32), (200, 50, 30), stroke=5, a=ease((t - t_count[i]) / 0.2))
    return draw, ev


# ---------------------------------------------------------------- coded Pippy (S11)
def pippy_cut():
    im = Image.open(FILM / "chars" / "pippy.png").convert("RGB").crop((20, 20, 800, 941))
    a = np.asarray(im).astype(np.int16)
    bg = np.abs(a - np.array([199, 199, 199])).sum(2) < 22
    from collections import deque
    hgt, wid = bg.shape; out = np.zeros_like(bg); q = deque()
    for y in range(hgt):
        for x in (0, wid - 1):
            if bg[y, x] and not out[y, x]:
                out[y, x] = True; q.append((y, x))
    for x in range(wid):
        for y in (0, hgt - 1):
            if bg[y, x] and not out[y, x]:
                out[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < hgt and 0 <= xx < wid and bg[yy, xx] and not out[yy, xx]:
                out[yy, xx] = True; q.append((yy, xx))
    alpha = Image.fromarray(np.where(out, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = im.convert("RGBA"); rgba.putalpha(alpha)
    # paint over the open mouth with the surrounding face colour (feathered mask, no dark halo)
    box = (330, 458, 498, 580)
    arr = np.asarray(rgba).astype(np.float32)
    ring = np.r_[arr[box[1] - 12:box[1] - 4, box[0] + 30:box[2] - 30, :3].reshape(-1, 3), arr[box[1] + 20:box[3] - 20, box[0] - 14:box[0] - 6, :3].reshape(-1, 3)]
    face = tuple(int(c) for c in np.median(ring, 0)) + (255,)
    m = Image.new("L", rgba.size, 0); ImageDraw.Draw(m).ellipse(box, fill=255); m = m.filter(ImageFilter.GaussianBlur(9))
    rgba = Image.composite(Image.new("RGBA", rgba.size, face), rgba, m)
    rgba.putalpha(alpha)
    return rgba, (414, 520)          # mouth centre in the cut-out


def mouth_env(buf):
    hop = SR // FPS; n = len(buf) // hop
    e = np.array([np.sqrt((buf[i * hop:(i + 1) * hop] ** 2).mean()) for i in range(n)])
    e = np.clip(e / (np.percentile(e[e > 0.005], 90) + 1e-6 if (e > 0.005).any() else 1), 0, 1)
    return np.convolve(e, [0.25, 0.5, 0.25], "same")


def draw_mouth(d, cx, cy, o, s=1.0):
    if o < 0.12:
        d.arc([cx - 40 * s, cy - 34 * s, cx + 40 * s, cy + 16 * s], 25, 155, fill=(110, 40, 20, 255), width=int(7 * s))
        return
    w_, h_ = (40 + 14 * o) * s, (14 + 50 * o) * s
    box = [cx - w_, cy - h_ - 6 * s, cx + w_, cy + h_ - 6 * s]
    lay = Image.new("RGBA", d._image.size); ld = ImageDraw.Draw(lay)
    ld.pieslice(box, 0, 180, fill=(95, 25, 20, 255))
    if o > 0.3:
        ld.ellipse([cx - w_ * 0.55, cy + h_ * 0.35 - 6 * s, cx + w_ * 0.55, cy + h_ * 1.25 - 6 * s], fill=(225, 110, 105, 255))
    m = Image.new("L", lay.size, 0); ImageDraw.Draw(m).pieslice(box, 0, 180, fill=255)
    lay.putalpha(Image.fromarray(np.minimum(np.asarray(lay.getchannel("A")), np.asarray(m))))
    ImageDraw.Draw(lay).arc(box, 0, 180, fill=(120, 45, 25, 255), width=max(2, int(4 * s)))
    d._image.alpha_composite(lay)


def pippy_frame(cut, mc, o, scale, hop=0.0, point=0.0):
    p = cut.resize((int(cut.width * scale), int(cut.height * scale)), Image.LANCZOS)
    d = ImageDraw.Draw(p); draw_mouth(d, mc[0] * scale, mc[1] * scale, o, scale)
    return p


HOL = None


def cell26(box):
    x0, y0, x1, y1 = box; gx = (x1 - x0) / 7; top = y0 + (y1 - y0) * 0.2; gy = (y1 - top - 20) / 6
    return x0 + gx * 4.5, top + gy * 4.5, gx, gy


def holiday_panel(im, t, ev, box, from_x):
    """'holiday' picture (family Thanksgiving dinner, AI) + 'No school!' badge.
    Slides in from the calendar side on the word holiday, slowly pushes in, fades out when the calendar switches."""
    global HOL
    if HOL is None:
        HOL = Image.open(FILM / "frames" / "HOL.png").convert("RGB")
    x0, y0, x1, y1 = box; bw, bh = x1 - x0, y1 - y0
    a_in = ease((t - ev["stamp"] + 0.05) / 0.5); a_out = 1 - ease((t - ev["switch"] + 0.1) / 0.4)
    a = min(a_in, a_out)
    if a <= 0:
        return
    z = 1.0 + 0.12 * ease((t - ev["stamp"]) / 3.0)             # slow push in
    if bh / bw > HOL.height / HOL.width:          # panel taller than the picture: fit height (no black bars)
        ch = HOL.height / z; cw = ch * bw / bh
    else:
        cw = HOL.width / z; ch = cw * bh / bw
    cx, cy = HOL.width * 0.52, HOL.height * 0.5
    pic = HOL.crop((cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)).resize((bw, bh), Image.LANCZOS).convert("RGBA")
    m = Image.new("L", (bw, bh), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, bw - 1, bh - 1], radius=28, fill=255)
    pic.putalpha(m)
    fr = Image.new("RGBA", (bw + 20, bh + 20)); ImageDraw.Draw(fr).rounded_rectangle([0, 0, bw + 19, bh + 19], radius=36, fill=(255, 250, 235, 255), outline=(200, 90, 40, 255), width=6)
    fr.alpha_composite(pic, (10, 10))
    bd = ImageDraw.Draw(fr); f = font(int(bh * 0.13)); txt = "No school!"
    tw = bd.textlength(txt, font=f); bx, by = 26, 22
    bd.rounded_rectangle([bx, by, bx + tw + 36, by + bh * 0.17], radius=18, fill=(220, 40, 40, 255), outline=(255, 255, 255, 255), width=4)
    bd.text((bx + 18 + tw / 2, by + bh * 0.085), txt, font=f, fill=(255, 255, 255, 255), anchor="mm")
    if a < 1:
        fr.putalpha(Image.fromarray((np.asarray(fr.getchannel("A")) * a).astype(np.uint8)))
    xx = int(from_x + (x0 - 10 - from_x) * a_in) if a_out >= 1 else x0 - 10
    im.alpha_composite(fr, (xx, y0 - 10))


def turkey_badge(im, t, ev, cxy, r=95):
    """Small round turkey-dinner picture that pops up next to the 26th."""
    global HOL
    if HOL is None:
        HOL = Image.open(FILM / "frames" / "HOL.png").convert("RGB")
    s = pop((t - ev["glow"]) / 0.4) if t >= ev["glow"] else 0
    if not s:
        return
    R = int(r * s); crop = HOL.crop((560, 380, 1080, 720)).resize((2 * R, int(2 * R * 340 / 520)), Image.LANCZOS)
    tile = Image.new("RGBA", (2 * R, 2 * R), (255, 250, 235, 255)); tile.paste(crop, (0, (2 * R - crop.height) // 2))
    m = Image.new("L", (2 * R, 2 * R), 0); ImageDraw.Draw(m).ellipse([0, 0, 2 * R - 1, 2 * R - 1], fill=255); tile.putalpha(m)
    ring = Image.new("RGBA", (2 * R + 16, 2 * R + 16)); ImageDraw.Draw(ring).ellipse([0, 0, 2 * R + 15, 2 * R + 15], fill=(255, 200, 40, 255))
    ring.alpha_composite(tile, (8, 8)); im.alpha_composite(ring, (int(cxy[0] - R - 8), int(cxy[1] - R - 8)))


def s11():
    cut, mc = pippy_cut(); cut.save(WORK / "qa" / "pippy_cut.png")
    # read 1: Pippy left, holiday picture in the middle, calendar right (teacher 11/04: holiday needs a picture)
    ws1 = words("S11", 1); secs1 = clip_len("S11", 1); buf1 = guide("S11", 1, FILM / "h3" / "S11_1" / "guide.wav"); env1 = mouth_env(buf1)
    CAL1 = (1150, 150, 1850, 820)
    cal1, ev1 = calendar_fn(ws1, CAL1)
    bg = sky((255, 236, 200), (250, 210, 160))
    leaves = [(np.random.default_rng(i).uniform(0, W), np.random.default_rng(i + 99).uniform(0, H)) for i in range(18)]

    def bgf(t):
        im = bg.convert("RGBA"); d = ImageDraw.Draw(im)
        for i, (x, y) in enumerate(leaves):
            yy = (y + t * (40 + 6 * (i % 5))) % (H + 60) - 30; xx = x + 30 * math.sin(t + i)
            d.ellipse([xx - 14, yy - 8, xx + 14, yy + 8], fill=((230, 120, 40) if i % 2 else (200, 80, 30)) + (150,))
        return im

    def f1(t):
        im = bgf(t); d = ImageDraw.Draw(im); cal1(d, t)
        holiday_panel(im, t, ev1, (590, 300, 1110, 620), from_x=1150)
        cx, cy, gx, gy = cell26(CAL1); turkey_badge(im, t, ev1, (cx + gx * 1.6, cy - gy * 0.2), r=80)
        o = env1[min(len(env1) - 1, int(t * FPS))]
        jump = 0
        for tj in (ev1["stamp"], ev1["glow"]):
            if tj <= t < tj + 0.5:
                jump = 60 * math.sin(math.pi * (t - tj) / 0.5)
        p = pippy_frame(cut, mc, o, 0.6)
        im.alpha_composite(p, (int(300 - p.width / 2), int(830 - p.height - jump + 4 * math.sin(t * 3))))
        return im
    (FILM / "h3" / "S11_1").mkdir(parents=True, exist_ok=True)
    render(FILM / "h3" / "S11_1" / "clip.mp4", secs1, f1)
    (WORK / "S11_1_events.json").write_text(json.dumps(ev1, indent=1), encoding="utf-8")

    # read 2: talking Pippy on plain background (only used to cut the round bubble, face at the centre)
    secs2 = clip_len("S11", 2); buf2 = guide("S11", 2, FILM / "h3" / "S11_2" / "guide.wav"); env2 = mouth_env(buf2)

    def f2(t):
        im = Image.new("RGBA", (1344, 768), (255, 236, 200, 255))
        p = pippy_frame(cut, mc, env2[min(len(env2) - 1, int(t * FPS))], 0.62)
        # face centre of the cut-out is about (414, 400) -> put it at (672, 384)
        im.alpha_composite(p, (int(672 - 414 * 0.62), int(384 - 400 * 0.62 + 3 * math.sin(t * 3))))
        return im
    render(FILM / "h3" / "S11_2" / "clip.mp4", secs2, f2, size=(1344, 768))

    # X11: the calendar explainer for read 2 (bubble bottom-left -> calendar centre-right)
    CAL2 = (820, 140, 1780, 840)
    ws2 = words("S11", 2); cal2, ev2 = calendar_fn(ws2, CAL2)

    def fx(t):
        im = bgf(t); d = ImageDraw.Draw(im); cal2(d, t)
        holiday_panel(im, t, ev2, (410, 310, 790, 600), from_x=820)
        cx, cy, gx, gy = cell26(CAL2); turkey_badge(im, t, ev2, (cx + gx * 1.6, cy - gy * 0.2), r=95)
        return im
    render(WORK / "X11.mp4", secs2, fx)
    (WORK / "X11_events.json").write_text(json.dumps(ev2, indent=1), encoding="utf-8")


if __name__ == "__main__":
    (WORK / "qa").mkdir(exist_ok=True)
    jobs = {"X04": x04, "X06": x06, "X10": x10, "S11": s11}
    for j in sys.argv[1:] or list(jobs):
        jobs["S11" if j == "X11" else j]()
        print(j, "done", flush=True)
