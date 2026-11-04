"""單字卡（劇本 v1 第三段）：圖片＋英文大字＋中文；Pippy（程式嘴形）在左下念單字 → 停 2 秒「Say it!」讓全場跟念 → 念例句。
  python scripts/vocab_cards.py 14 15 16 17 18 19 20
輸出 h3/K<n>/clip.mp4＋guide.wav＋events.json（例句字幕的時間點）。
19、20 的例句由 H3 的 Pippy 全畫面說（h3/S19、S20），所以卡片只到「Say it!」結束。
"""
import json, math, sys, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent))
from explainers_code import (FILM, W, H, FPS, SR, font, ease, pop, voice, render, pippy_cut, pippy_frame, mouth_env, sky, text)

CARDS = {14: ("Mayflower", "五月花號"), 15: ("Pilgrims", "朝聖者（清教徒）"), 16: ("feast", "盛宴、大餐"), 17: ("turkey", "火雞"),
         18: ("potatoes", "馬鈴薯"), 19: ("pumpkin pie", "南瓜派"), 20: ("thankful", "感謝的")}
PIC = {14: "C14", 15: "C15", 16: "C16", 17: "C17", 18: "C18", 19: "S19", 20: "S20"}
LEAD, GAP, SAY, TAIL = 0.5, 0.35, 2.0, 0.6
PANEL = (560, 90, 1500, 619)          # picture (16:9) ; word + Chinese below it ; subtitles at the very bottom


def card(n):
    en, zh = CARDS[n]; od = FILM / "h3" / f"K{n}"; od.mkdir(parents=True, exist_ok=True)
    ww, _ = voice(f"W{n}", 1); has_e = n not in (19, 20)
    ew, eoff = voice(f"E{n}", 1) if has_e else (np.zeros(0, np.float32), 0.0)
    w_at = LEAD; w_end = w_at + len(ww) / SR; say0 = w_end + GAP; say1 = say0 + SAY
    e_at = say1 + 0.2; secs = (e_at + len(ew) / SR + TAIL) if has_e else (say1 + 0.4)
    buf = np.zeros(int(secs * SR) + SR, np.float32)
    buf[int(w_at * SR):int(w_at * SR) + len(ww)] += ww
    if has_e:
        buf[int(e_at * SR):int(e_at * SR) + len(ew)] += ew
    buf = buf[: int(secs * SR)]
    with wave.open(str(od / "guide.wav"), "wb") as g:
        g.setnchannels(1); g.setsampwidth(2); g.setframerate(SR); g.writeframes((np.clip(buf, -1, 1) * 32767).astype("<i2").tobytes())
    env = mouth_env(buf); cut, mc = pippy_cut()
    pic = Image.open(FILM / "frames" / f"{PIC[n]}.png").convert("RGB")
    if n == 19:          # only the slice of pie (the full frame also shows Pippy, who is already in the corner)
        pic = pic.crop((880, 300, 1480, 638))
    x0, y0, x1, y1 = PANEL; bw, bh = x1 - x0, y1 - y0
    bg = sky((255, 240, 210), (250, 214, 165))
    rng = np.random.default_rng(n); leaves = [(rng.uniform(0, W), rng.uniform(0, H)) for _ in range(14)]

    def fr(t):
        im = bg.convert("RGBA"); d = ImageDraw.Draw(im)
        for i, (x, y) in enumerate(leaves):
            yy = (y + t * (35 + 5 * (i % 4))) % (H + 60) - 30; xx = x + 25 * math.sin(t + i)
            d.ellipse([xx - 13, yy - 7, xx + 13, yy + 7], fill=((230, 120, 40) if i % 2 else (200, 80, 30)) + (255,))
        # picture card flips in, then slowly pushes in
        s = pop(t / 0.45) if t < 0.45 else 1.0; z = 1 + 0.08 * ease(t / max(1.0, secs))
        cw, ch = pic.width / z, pic.width / z * bh / bw
        crop = pic.crop((pic.width / 2 - cw / 2, pic.height / 2 - ch / 2, pic.width / 2 + cw / 2, pic.height / 2 + ch / 2))
        tw, th = int(bw * s), int(bh * s)
        p = crop.resize((tw, th), Image.LANCZOS).convert("RGBA"); m = Image.new("L", (tw, th), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, tw - 1, th - 1], radius=30, fill=255); p.putalpha(m)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        d.rounded_rectangle([cx - tw / 2 - 12, cy - th / 2 - 12, cx + tw / 2 + 12, cy + th / 2 + 12], radius=40, fill=(255, 250, 235, 255), outline=(200, 90, 40, 255), width=7)
        im.alpha_composite(p, (int(cx - tw / 2), int(cy - th / 2)))
        # big word + Chinese (word glows while Pippy says it and during "Say it!")
        a = ease((t - w_at + 0.2) / 0.3); glow = 1 if w_at <= t < say1 else 0
        f = font(140); wl = d.textlength(en, font=f)
        if glow:
            r = 10 + 4 * math.sin(t * 8); d.rounded_rectangle([cx - wl / 2 - 40 - r, 655 - r, cx + wl / 2 + 40 + r, 810 + r], radius=50, fill=(255, 225, 120, 200))
        text(d, (cx, 730), en, 140, (120, 50, 20), stroke=10, a=a)
        text(d, (cx, 850), zh, 64, (200, 80, 20), stroke=7, zh=True, a=a)
        # "Say it!" bubble with a 2-second countdown
        if say0 - 0.1 <= t < say1 + 0.2:
            k = pop((t - say0 + 0.1) / 0.35); bx, by = 1725, 330
            d.ellipse([bx - 190 * k, by - 120 * k, bx + 190 * k, by + 120 * k], fill=(255, 255, 255, 255), outline=(230, 120, 40, 255), width=8)
            d.polygon([(bx - 120 * k, by + 70 * k), (bx - 200 * k, by + 170 * k), (bx - 40 * k, by + 100 * k)], fill=(255, 255, 255, 255))
            text(d, (bx, by - 15 * k), "Say it!", int(86 * k), (220, 60, 30), stroke=0)
            left = max(0, say1 - t); dots = int(math.ceil(left))
            for j in range(2):
                c = (230, 120, 40) if j < dots else (230, 225, 215)
                d.ellipse([bx - 40 + j * 60, by + 50 * k, bx - 10 + j * 60, by + 80 * k], fill=c + (255,))
        # Pippy, bottom-left, coded mouth; jumps a little when "Say it!" appears
        o = env[min(len(env) - 1, int(t * FPS))]; hop = 40 * math.sin(math.pi * (t - say0) / 0.45) if say0 <= t < say0 + 0.45 else 0
        pp = pippy_frame(cut, mc, o, 0.42)
        im.alpha_composite(pp, (60, int(1000 - pp.height - hop + 3 * math.sin(t * 3))))
        return im
    render(od / "clip.mp4", secs, fr)
    ev = dict(word=en, zh=zh, w_at=w_at, say=[say0, say1], e_at=e_at if has_e else None, e_off=eoff, secs=secs)
    (od / "events.json").write_text(json.dumps(ev, ensure_ascii=False, indent=1), encoding="utf-8")
    return f"K{n} {secs:.2f}s"


if __name__ == "__main__":
    for a in sys.argv[1:]:
        print(card(int(a)), flush=True)
