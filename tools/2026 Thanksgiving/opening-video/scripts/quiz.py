"""是非題 Q1–Q3（劇本 v2）：Pippy（程式嘴形）念題目 → 3、2、1 倒數讓全場想 → 揭曉（對的按鈕亮、錯的變淡）→ Pippy 念答案。
  python scripts/quiz.py 1 2 3     -> h3/Q<n>/clip.mp4＋guide.wav＋events.json
Q1 開頭先念「Let's play True or False!」。
"""
import json, math, sys, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent))
from explainers_code import (FILM, W, H, FPS, SR, font, ease, pop, voice, render, pippy_cut, pippy_frame, mouth_env, sky, text)

QS = {1: dict(pic="C14", ans=True, note=None),
      2: dict(pic="C15", ans=False, note=("Taiwan", "England")),
      3: dict(pic="HOL", ans=True, note=None)}
COUNT, GAP = 3.0, 0.3
PANEL = (560, 150, 1360, 600)


def check(d, cx, cy, s, col, w=18):
    d.line([(cx - s, cy), (cx - s * 0.3, cy + s * 0.7), (cx + s, cy - s * 0.8)], fill=col, width=w, joint="curve")


def cross(d, cx, cy, s, col, w=18):
    d.line([(cx - s, cy - s), (cx + s, cy + s)], fill=col, width=w); d.line([(cx - s, cy + s), (cx + s, cy - s)], fill=col, width=w)


def scene(n):
    q = QS[n]; od = FILM / "h3" / f"Q{n}"; od.mkdir(parents=True, exist_ok=True)
    t = 0.5; parts = []
    if n == 1:
        iw, _ = voice("QI", 1); parts.append(("QI", t, iw)); t += len(iw) / SR + 0.4
    qw, _ = voice(f"Q{n}", 1); q_at = t; parts.append((f"Q{n}", t, qw)); t += len(qw) / SR + GAP
    c0 = t; c1 = c0 + COUNT; rv = c1
    aw, _ = voice(f"A{n}", 1); a_at = rv + 0.5; parts.append((f"A{n}", a_at, aw))
    secs = a_at + len(aw) / SR + 0.8
    buf = np.zeros(int(secs * SR) + SR, np.float32)
    for _, at, w in parts:
        buf[int(at * SR):int(at * SR) + len(w)] += w
    buf = buf[: int(secs * SR)]
    with wave.open(str(od / "guide.wav"), "wb") as g:
        g.setnchannels(1); g.setsampwidth(2); g.setframerate(SR); g.writeframes((np.clip(buf, -1, 1) * 32767).astype("<i2").tobytes())
    env = mouth_env(buf); cut, mc = pippy_cut()
    pic = Image.open(FILM / "frames" / f"{q['pic']}.png").convert("RGB")
    x0, y0, x1, y1 = PANEL; bw, bh = x1 - x0, y1 - y0
    bg = sky((210, 235, 255), (255, 235, 205))

    def fr(tt):
        im = bg.convert("RGBA"); d = ImageDraw.Draw(im)
        # title ribbon
        tag = f"True or False?  Q{n}"
        f = font(56); tl = d.textlength(tag, font=f)
        d.rounded_rectangle([60, 24, 60 + tl + 50, 104], radius=30, fill=(90, 70, 200, 255)); d.text((85, 64), tag, font=f, fill=(255, 255, 255, 255), anchor="lm")
        # picture
        s = pop(tt / 0.45) if tt < 0.45 else 1.0; tw, th = int(bw * s), int(bh * s)
        cw = pic.width; ch = cw * bh / bw
        if ch > pic.height:
            ch = pic.height; cw = ch * bw / bh
        p = pic.crop((pic.width / 2 - cw / 2, pic.height / 2 - ch / 2, pic.width / 2 + cw / 2, pic.height / 2 + ch / 2)).resize((tw, th), Image.LANCZOS).convert("RGBA")
        m = Image.new("L", (tw, th), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, tw - 1, th - 1], radius=30, fill=255); p.putalpha(m)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        d.rounded_rectangle([cx - tw / 2 - 12, cy - th / 2 - 12, cx + tw / 2 + 12, cy + th / 2 + 12], radius=40, fill=(255, 255, 255, 255), outline=(90, 70, 200, 255), width=7)
        im.alpha_composite(p, (int(cx - tw / 2), int(cy - th / 2)))
        # the two answer buttons
        r = ease((tt - rv) / 0.35) if tt >= rv else 0
        for k, (lab, good, bx) in enumerate((("TRUE", q["ans"], 700), ("FALSE", not q["ans"], 1220))):
            col = (60, 170, 80) if lab == "TRUE" else (220, 70, 60)
            sc = 1 + 0.18 * r * (1 if good else -0.4); a = int(255 * (1 - 0.65 * r * (0 if good else 1)))
            w2, h2 = 230 * sc, 80 * sc; yy = 750
            if good and r > 0:
                g = 18 + 8 * math.sin(tt * 8); d.rounded_rectangle([bx - w2 - g, yy - h2 - g, bx + w2 + g, yy + h2 + g], radius=60, fill=(255, 230, 90, 200))
            d.rounded_rectangle([bx - w2, yy - h2, bx + w2, yy + h2], radius=50, fill=col + (a,), outline=(255, 255, 255, a), width=8)
            if lab == "TRUE":
                check(d, bx - 140 * sc, yy, 34 * sc, (255, 255, 255, a), int(14 * sc))
            else:
                cross(d, bx - 145 * sc, yy, 28 * sc, (255, 255, 255, a), int(14 * sc))
            d.text((bx + 55 * sc, yy), lab, font=font(int(84 * sc)), fill=(255, 255, 255, a), anchor="mm")
        # countdown 3-2-1 over the picture
        if c0 <= tt < c1:
            k = 3 - int(tt - c0); u = (tt - c0) % 1
            z = 1.4 - 0.4 * ease(u / 0.3)
            d.ellipse([cx - 120 * z, cy - 120 * z, cx + 120 * z, cy + 120 * z], fill=(255, 255, 255, 230), outline=(90, 70, 200, 255), width=10)
            d.text((cx, cy), str(k), font=font(int(170 * z)), fill=(90, 70, 200, 255), anchor="mm")
        # big tick / cross stamp on the picture after the reveal
        if tt >= rv:
            z = pop((tt - rv) / 0.35)
            if q["ans"]:
                check(d, cx + 230, cy + 120, 70 * z, (60, 170, 80, 255), int(30 * z))
            else:
                cross(d, cx + 250, cy + 130, 60 * z, (220, 50, 40, 255), int(28 * z))
            if q["note"] and tt >= a_at + 0.6:      # Taiwan -> England
                a2 = ease((tt - a_at - 0.6) / 0.4); wrong, right = q["note"]
                d.rounded_rectangle([x1 + 40, y0 + 120, x1 + 520, y0 + 330], radius=30, fill=(255, 255, 255, int(240 * a2)), outline=(90, 70, 200, int(255 * a2)), width=6)
                text(d, (x1 + 280, y0 + 175), wrong, 60, (170, 160, 160), stroke=0, a=a2)
                wl = font(60).getlength(wrong); d.line([(x1 + 280 - wl / 2, y0 + 180), (x1 + 280 + wl / 2, y0 + 180)], fill=(220, 50, 40, int(255 * a2)), width=8)
                text(d, (x1 + 280, y0 + 270), right, 72, (60, 150, 70), stroke=0, a=a2)
        o = env[min(len(env) - 1, int(tt * FPS))]; hop = 50 * math.sin(math.pi * (tt - rv) / 0.5) if rv <= tt < rv + 0.5 else 0
        pp = pippy_frame(cut, mc, o, 0.42)
        im.alpha_composite(pp, (60, int(1000 - pp.height - hop + 3 * math.sin(tt * 3))))
        return im
    render(od / "clip.mp4", secs, fr)
    ev = dict(intro_at=0.5 if n == 1 else None, q_at=q_at, count=[c0, c1], reveal=rv, a_at=a_at, ans=q["ans"], secs=secs)
    (od / "events.json").write_text(json.dumps(ev, indent=1), encoding="utf-8")
    return f"Q{n} {secs:.2f}s"


if __name__ == "__main__":
    for a in sys.argv[1:]:
        print(scene(int(a)), flush=True)
