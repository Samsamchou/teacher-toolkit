"""感恩節由來課堂版：全片合成（本機只用 Python＋ffmpeg，不開 Blender）。
  python src/compose_all.py O S03 S04 … S12 Q   → work/sec/<段>.mp4、<段>-listen.mp4
  python src/compose_all.py film                 → out/Thanksgiving-Classroom-Tabletop.mp4（字幕版）、-Listening.mp4（聽力版）＋各 720p
每句：第 1 次（正常速度）→ 翻頁 → 第 2 次（慢速）→ 跟唸（關鍵字發亮、中文小卡、5-4-3-2-1；S10、S11 是 7 秒）。
畫面來源：renders/<SID>r1、<SID>r2（Colab 渲染的偶數格，12 fps 每張放 2 格）；S03 用 renders/full_r1、full_r2。
"""
import json, math, shutil, subprocess, sys, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OV = ROOT.parent / "opening-video"
FONTS = OV / "work" / "fonts"
EN = str(FONTS / "ComicRelief-Regular.ttf"); ZH = str(FONTS / "msjhbd.ttc")
W, H, FPS, SR = 1920, 1080, 24, 48000
LEAD, PAGE, HOLD2 = 0.5, 1.2, 0.8
SEC = ROOT / "work" / "sec"; OUT = ROOT / "out"
RED = (230, 60, 60); GOLD = (255, 215, 0); RED_ASS = "&H003C3CE6&"
YEARS = ["1620", "1621", "1863", "Today"]
WORDS = json.load(open(OV / "voices" / "words.json", encoding="utf-8"))

S = {   # 中文句意、英文關鍵字、中文關鍵字、小卡、時間軸位置、跟唸秒數、配樂
 "S03": dict(zh="很久以前，在 1620 年，一艘船從英國航行到美洲。", kw=["1620", "ship", "England", "America"], kz=["1620", "船", "英國", "美洲"],
             cards=[("1620", "一六二〇年"), ("ship", "船"), ("England", "英國"), ("America", "美洲")], tl=0, say=5, music="voyage"),
 "S04": dict(zh="那艘船叫五月花號，船上大約有 100 個人。", kw=["Mayflower", "100", "people"], kz=["五月花號", "100", "人"],
             cards=[("Mayflower", "五月花號"), ("100", "一百"), ("people", "人們")], tl=0, say=5, music="voyage",
             count=dict(n=100, r1=3.31, r2=3.79, dur=2.5)),
 "S05": dict(zh="今天，我們稱他們為清教徒（朝聖者）。", kw=["Today", "Pilgrims"], kz=["今天", "清教徒"],
             cards=[("Today", "今天"), ("Pilgrims", "清教徒")], tl=0, say=5, music="voyage"),
 "S06": dict(zh="他們來到萬帕諾亞格族人的土地。", kw=["land", "Wampanoag", "people"], kz=["土地", "萬帕諾亞格族"],
             cards=[("land", "土地"), ("Wampanoag", "萬帕諾亞格族"), ("people", "人們")], tl=0, say=5, music="arrival"),
 "S07": dict(zh="第一個冬天非常寒冷又艱苦。", kw=["first", "winter", "cold", "hard"], kz=["第一個", "冬天", "寒冷", "艱苦"],
             cards=[("first", "第一個"), ("winter", "冬天"), ("cold", "寒冷的"), ("hard", "艱苦的")], tl=0, say=5, music="winter"),
 "S08": dict(zh="一位萬帕諾亞格族男子 Tisquantum，幫助他們種玉米。", kw=["Tisquantum", "helped", "plant", "corn"], kz=["幫助", "種", "玉米"],
             cards=[("Tisquantum", "（人名）"), ("helped", "幫助了"), ("plant", "種植"), ("corn", "玉米")], tl=1, say=5, music="spring"),
 "S09": dict(zh="1621 年秋天，他們有了好收成，還辦了一場大盛宴。", kw=["fall", "1621", "harvest", "feast"], kz=["秋天", "1621", "收成", "盛宴"],
             cards=[("fall", "秋天"), ("1621", "一六二一年"), ("harvest", "收成"), ("feast", "盛宴")], tl=1, say=5, music="harvest"),
 "S10": dict(zh="萬帕諾亞格族首領 Massasoit 帶著大約 90 個人來。\\N他們一起吃了三天。", kw=["Massasoit", "leader", "90", "together", "three", "days"],
             kz=["首領", "90", "一起", "三天"], cards=[("leader", "首領"), ("90", "九十"), ("together", "一起"), ("three days", "三天")], tl=1, say=7,
             music="harvest", count=dict(n=90, r1=4.27, r2=4.87, dur=1.3), days=dict(r1=6.77, r2=7.73)),
 "S11": dict(zh="1863 年，感恩節成為節日。\\N現在，它在十一月的第四個星期四。", kw=["1863", "holiday", "fourth", "Thursday", "November"],
             kz=["1863", "節日", "第四個", "星期四", "十一月"], cards=[("holiday", "節日"), ("fourth", "第四個"), ("Thursday", "星期四"), ("November", "十一月")],
             tl=2, tl_today=dict(r1=5.88, r2=6.71), say=7, music="holiday", top=True),   # v3：英文字幕在上、時間軸在右下，不擋月曆
 "S12": dict(zh="對許多原住民來說，這也是記住他們歷史的日子。", kw=["Native", "remember", "history"], kz=["原住民", "記住", "歷史"],
             cards=[("Native people", "原住民"), ("remember", "記住"), ("history", "歷史")], tl=3, say=5, music="native"),
}


def run(cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=cwd)
    if r.returncode: print(r.stderr[-3000:]); raise SystemExit("ffmpeg failed")


def font(sz, zh=False): return ImageFont.truetype(ZH if zh else EN, sz)


def music_file(cue):
    pick = json.load(open(OV / "music" / cue / "pick.json"))
    return next((OV / "music" / cue / f"s{pick['seed']}").glob("*(Instrumental)*.wav"))


def seq(src, dst):
    if dst.exists(): shutil.rmtree(dst)
    dst.mkdir(parents=True)
    fs = sorted(src.glob("f*.png"))
    if not fs: raise SystemExit(f"沒有渲染畫面：{src}")
    for i, p in enumerate(fs): shutil.copy(p, dst / f"{i:04d}.png")
    return fs, len(fs) / 12.0


def timeline(now, bottom=False):
    """右上角時間軸（v2：縮小 72%、整體半透明，少擋人物）。"""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if now is None: return im
    c = Image.new("RGBA", (680, 140), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    x0, x1, y = 80, 600, 58
    d.rounded_rectangle([30, 2, 650, 120], radius=30, fill=(20, 18, 40, 150))
    d.line([(x0, y), (x1, y)], fill=(230, 220, 200, 230), width=6)
    for i, yr in enumerate(YEARS):
        x = x0 + (x1 - x0) * i / 3
        if i == now:
            for r, a in ((34, 60), (26, 110)): d.ellipse([x - r, y - r, x + r, y + r], fill=GOLD + (a,))
            d.ellipse([x - 17, y - 17, x + 17, y + 17], fill=GOLD + (255,), outline=(255, 255, 255, 255), width=3)
        else:
            d.ellipse([x - 10, y - 10, x + 10, y + 10], fill=(150, 145, 160, 255))
        d.text((x, y + 40), yr, font=font(34 if i == now else 26), anchor="mm", fill=(GOLD if i == now else (200, 195, 210)) + (255,))
    c = c.resize((int(680 * 0.72), int(140 * 0.72)), Image.LANCZOS)
    c.putalpha(c.getchannel("A").point(lambda v: int(v * 0.8)))
    im.alpha_composite(c, (W - c.width - 18, H - c.height - 14 if bottom else 14))
    return im


def ts(t): t = max(0, t); return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


ASS_HEAD = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Comic Relief,72,&H0000D7FF,&H00FFFFFF,&H00301A08,&H64000000,0,0,0,0,100,100,0,0,1,6,2,2,80,80,118,1
Style: Zh,Microsoft JhengHei,46,&H00FFFFFF,&H00FFFFFF,&H00301A08,&H64000000,1,0,0,0,100,100,0,0,1,5,2,2,80,80,36,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def karaoke(sid, take, start, end, kw, zh, kz, two_lines, top=False):
    w = WORDS[sid]; full = w["text"]; ws = w[f"take{take}"]
    parts, prev, pos = [], start + LEAD + ws[0]["t"] - 0.25, 0; a = prev
    for x in ws:
        t0 = start + LEAD + x["t"]
        if t0 - prev > 0.02: parts.append(f"{{\\k{int((t0 - prev) * 100)}}}")
        i = full.find(x["w"].split()[0], pos); j = full.find(x["w"].split()[-1], i) + len(x["w"].split()[-1])
        while j < len(full) and full[j] in ",.!?": j += 1
        shown, pos = full[i:j], j
        brk = "\\N" if two_lines and i > 0 and full[i - 2:i] == ". " else ""
        hit = any(k == shown.strip(",.!?") or k in shown.split() for k in kw)
        col = f"{{\\1c{RED_ASS}\\2c{RED_ASS}}}" if hit else ""; back = "{\\1c&H0000D7FF&\\2c&H00FFFFFF&}" if hit else ""
        parts.append(f"{brk}{{\\kf{max(1, int(x['d'] * 100))}}}{col}{shown}{back} "); prev = t0 + x["d"]
    z = zh
    for k in kz: z = z.replace(k, f"{{\\c{RED_ASS}}}{k}{{\\c&H00FFFFFF&}}")
    mv = 175 if "\\N" in zh else 0         # 中文有兩行時，英文往上移，英文在上、中文在下
    if top: mv = 26; parts.insert(0, "{" + chr(92) + "an8}")   # v3：英文改放畫面上方（中文留在下方）
    return [f"Dialogue: 0,{ts(a)},{ts(end)},Sub,,0,0,{mv},,{''.join(parts).strip()}", f"Dialogue: 0,{ts(a)},{ts(end)},Zh,,0,0,0,,{z}"]


def wrap(d, text, fn, maxw):
    """平均分行：先算要幾行，再用平均寬度斷行（不讓最後一個字單獨一行）。"""
    total = d.textlength(text, font=fn); n = max(1, math.ceil(total / maxw)); target = min(maxw, total / n + 40)
    lines, cur = [], ""
    for tok in text.split(" "):
        t = (cur + " " + tok).strip()
        if d.textlength(t, font=fn) > target and cur: lines.append(cur); cur = tok
        else: cur = t
    return lines + [cur]


def pause_frame(bg, t, cfg, text, sentence, say):
    im = bg.copy(); d = ImageDraw.Draw(im)
    cards = cfg["cards"]; n = len(cards)
    cw, ch, gap = (360, 190, 40) if n <= 4 else (300, 170, 30); x0 = (W - (n * cw + (n - 1) * gap)) / 2; y0 = 285
    for k, (en, zh) in enumerate(cards):
        u = min(1, max(0, (t - 0.15 * k) / 0.3))
        if u <= 0: continue
        s = 0.6 + 0.4 * u + 0.12 * math.sin(math.pi * u); cx, cy = x0 + k * (cw + gap) + cw / 2, y0 + ch / 2
        d.rounded_rectangle([cx - cw * s / 2, cy - ch * s / 2, cx + cw * s / 2, cy + ch * s / 2], radius=int(28 * s), fill=(255, 248, 230, 255), outline=(200, 90, 40, 255), width=6)
        fe = font(int(64 * s));
        while d.textlength(en, font=fe) > cw * s - 30: fe = font(fe.size - 4)
        d.text((cx, cy - 32 * s), en, font=fe, anchor="mm", fill=RED + (255,))
        d.text((cx, cy + 48 * s), zh, font=font(int(50 * s), True), anchor="mm", fill=(80, 40, 20, 255))
    if sentence:
        glow = 0.6 + 0.4 * math.sin(t * 6); sz = 76
        while True:
            fn = font(sz); lines = wrap(d, text, fn, 1760)
            if len(lines) <= 3: break
            sz -= 6
        y = 540 if len(lines) < 3 else 515
        for line in lines:
            x = (W - d.textlength(line, font=fn)) / 2
            for tok in line.split(" "):
                bare = tok.strip(",.!?"); wl = d.textlength(tok, font=fn)
                if bare in cfg["kw"]:
                    bw = d.textlength(bare, font=fn)
                    d.rounded_rectangle([x - 10, y - 4, x + bw + 10, y + sz * 1.25], radius=20, fill=(255, 220, 90, int(150 * glow)))
                    d.text((x, y), bare, font=fn, fill=RED + (255,), stroke_width=4, stroke_fill=(255, 255, 255, 255))
                    d.text((x + bw, y), tok[len(bare):], font=fn, fill=(255, 255, 255, 255), stroke_width=5, stroke_fill=(48, 26, 8, 255))
                else:
                    d.text((x, y), tok, font=fn, fill=(255, 255, 255, 255), stroke_width=5, stroke_fill=(48, 26, 8, 255))
                x += wl + d.textlength(" ", font=fn)
            y += int(sz * 1.4)
        zl = cfg["zh"].replace("\\N", "")
        zf = font(50, True)
        while d.textlength(zl, font=zf) > 1800: zf = font(zf.size - 2)
        d.text(((W - d.textlength(zl, font=zf)) / 2, max(y + 10, 830)), zl, font=zf, fill=(255, 255, 255, 255), stroke_width=5, stroke_fill=(48, 26, 8, 255))
    if 0.6 <= t < 0.8 + say + 0.2:
        k = min(1, (t - 0.6) / 0.25); bx, by = 260, 150
        d.ellipse([bx - 200 * k, by - 105 * k, bx + 200 * k, by + 105 * k], fill=(255, 255, 255, 245), outline=(230, 120, 40, 255), width=7)
        d.text((bx, by - 30 * k), "Say it! 跟著念", font=font(int(52 * k), True), anchor="mm", fill=(220, 60, 30, 255))
        if 0.8 <= t < 0.8 + say:
            num = say - int(t - 0.8) if say <= 5 else max(1, 5 - int((t - 0.8) * 5 / say))
            u = ((t - 0.8) % (say / 5 if say > 5 else 1)) / (say / 5 if say > 5 else 1)
            z = 1.25 - 0.25 * min(1, u / 0.25)
            d.text((bx, by + 45 * k), str(num), font=font(int(78 * z)), anchor="mm", fill=(90, 70, 200, 255))
    return im


def badge(d, text, sub=None):
    f1 = font(96); tw = d.textlength(text, font=f1)
    d.rounded_rectangle([60, 40, 60 + tw + 80, 170], radius=36, fill=(255, 248, 230, 235), outline=(200, 90, 40, 255), width=6)
    d.text((100, 105), text, font=f1, anchor="lm", fill=RED + (255,))
    if sub: d.text((100 + tw + 30, 105), sub, font=font(40, True), anchor="lm", fill=(80, 40, 20, 255))


def overlay_frames(sid, cfg, D1, T2, D2, TP, PAUSE, bg_png, dst, listen):
    if dst.exists(): shutil.rmtree(dst)
    dst.mkdir(parents=True)
    tl_imgs = {i: timeline(i, cfg.get("top", False)) for i in (None, 0, 1, 2, 3)}
    bg = Image.open(bg_png).convert("RGBA").resize((W, H))
    bg = Image.alpha_composite(bg.filter(ImageFilter.GaussianBlur(3)), Image.new("RGBA", (W, H), (10, 8, 25, 120)))
    text = WORDS[sid]["text"]
    for i in range(int(round((TP + PAUSE) * FPS))):
        t = i / FPS
        if t >= TP:
            im = pause_frame(bg, t - TP, cfg, text, not listen, cfg["say"])
            a = min(1, (t - TP) / 0.4)
            if a < 1: im.putalpha(int(255 * a))
        else:
            im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
            local, take = (t, "r1") if t < T2 else (t - T2, "r2")
            if "count" in cfg:
                c = cfg["count"]; c0 = c[take] + LEAD
                if local >= c0: badge(d, str(min(c["n"], int(c["n"] * (local - c0) / c["dur"]))), "人")
            if "days" in cfg:
                c0 = cfg["days"][take] + LEAD; dur = (D1 if take == "r1" else D2) - c0 - 0.3
                if local >= c0: badge(d, f"Day {min(3, 1 + int(3 * (local - c0) / max(0.1, dur)))}", "第幾天")
        now = cfg["tl"]
        if "tl_today" in cfg and t < TP:
            local, take = (t, "r1") if t < T2 else (t - T2, "r2")
            if local >= cfg["tl_today"][take] + LEAD: now = 3
        im.alpha_composite(tl_imgs[now] if t < TP or True else tl_imgs[None])
        im.save(dst / f"{i:05d}.png", compress_level=1)


def tick(at_list, total):
    buf = np.zeros(int(total * SR) + SR, np.float32)
    for at in at_list:
        n = int(0.09 * SR); tt = np.arange(n) / SR
        s = 0.35 * np.sin(2 * np.pi * 1320 * tt) * np.exp(-tt * 40); i = int(at * SR); buf[i:i + n] += s[: len(buf) - i]
    return buf


def save_wav(p, buf):
    with wave.open(str(p), "wb") as g:
        g.setnchannels(1); g.setsampwidth(2); g.setframerate(SR); g.writeframes((np.clip(buf, -1, 1) * 32767).astype("<i2").tobytes())


def sentence(sid):
    cfg = S[sid]; w = SEC / sid; w.mkdir(parents=True, exist_ok=True)
    r1 = ROOT / "renders" / ("full_r1" if sid == "S03" else f"{sid}r1"); r2 = ROOT / "renders" / ("full_r2" if sid == "S03" else f"{sid}r2")
    f1, D1 = seq(r1, w / "r1"); f2, D2 = seq(r2, w / "r2")
    T2 = D1 + HOLD2; TP = T2 + D2; PAUSE = 0.8 + cfg["say"] + 0.8; TOTAL = TP + PAUSE
    two = len(WORDS[sid]["text"]) > 48
    for listen in (False, True):
        tag = "-listen" if listen else ""
        overlay_frames(sid, cfg, D1, T2, D2, TP, PAUSE, f1[-1], w / f"ov{tag}", listen)
        if not listen:
            top = cfg.get("top", False)
            ev = karaoke(sid, 1, 0, D1 + 0.3, cfg["kw"], cfg["zh"], cfg["kz"], two, top) + karaoke(sid, 2, T2, TP - 0.1, cfg["kw"], cfg["zh"], cfg["kz"], two, top)
            (w / "subs.ass").write_text(ASS_HEAD + "\n".join(ev) + "\n", encoding="utf-8")
        save_wav(w / "tick.wav", tick([TP + 0.8 + k * cfg["say"] / 5 for k in range(5)], TOTAL))
        sub = "subtitles=subs.ass:fontsdir=fonts," if not listen else ""
        fc = (f"[0:v]fps=24,tpad=stop_mode=clone:stop_duration={PAGE}[a];[1:v]fps=24,tpad=start_mode=clone:start_duration={HOLD2}[b];"
              f"[a][b]xfade=transition=slideleft:duration={PAGE}:offset={D1:.3f},tpad=stop_mode=clone:stop_duration={PAUSE + 1}[base];"
              f"[base][2:v]overlay=0:0:shortest=0[v0];[v0]trim=0:{TOTAL:.3f},{sub}format=yuv420p[v]")
        af = (f"[3:a]adelay={int(LEAD * 1000)}|{int(LEAD * 1000)}[v1];[4:a]adelay={int((T2 + LEAD) * 1000)}|{int((T2 + LEAD) * 1000)}[v2];"
              f"[5:a]atrim=0:{TOTAL + 1:.2f},volume=0.16,afade=t=in:d=0.5,afade=t=out:st={TOTAL - 1.2:.2f}:d=1.2[m];"
              f"[v1][v2][m][6:a]amix=inputs=4:normalize=0,loudnorm=I=-16:TP=-1.5,atrim=0:{TOTAL:.2f}[a]")
        if not (w / "fonts").exists(): shutil.copytree(FONTS, w / "fonts")
        run(["ffmpeg", "-y", "-nostdin", "-framerate", "12", "-i", "r1/%04d.png", "-framerate", "12", "-i", "r2/%04d.png",
             "-framerate", "24", "-i", f"ov{tag}/%05d.png", "-i", str(OV / "voices" / f"{sid}_1.mp3"), "-i", str(OV / "voices" / f"{sid}_2.mp3"),
             "-i", str(music_file(cfg["music"])), "-i", "tick.wav", "-filter_complex", fc + ";" + af, "-map", "[v]", "-map", "[a]",
             "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-r", "24", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
             "-t", f"{TOTAL:.2f}", str(SEC / f"{sid}{tag}.mp4")], cwd=w)
        shutil.rmtree(w / f"ov{tag}")
    print(sid, f"{TOTAL:.1f}s", flush=True)


CARD_WORDS = [("Mayflower", "五月花號"), ("Pilgrims", "清教徒"), ("Wampanoag", "萬帕諾亞格族"), ("winter", "冬天"),
              ("corn", "玉米"), ("harvest", "豐收"), ("feast", "盛宴"), ("holiday", "節日")]
# poster_art.png（1536×1024）裡 8 格插圖的位置（左、上、右、下）
CARD_BOX = [(36, 186, 392, 500), (416, 186, 756, 500), (780, 186, 1122, 500), (1148, 186, 1500, 500),
            (36, 590, 392, 898), (416, 590, 756, 898), (780, 590, 1122, 898), (1148, 590, 1500, 898)]
INTRO, POSTER_END = 24.0, 1.2   # v3：每張卡約 2.85 秒，Ana 念兩次


def speech_span(p):
    import re
    r = subprocess.run(["ffmpeg", "-nostdin", "-i", str(p), "-af", "silencedetect=n=-40dB:d=0.1", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", r.stderr)]
    en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", r.stderr)]
    return en[0], st[-1]


def intro_cards(dst):
    """片頭 10 秒：8 張單字大卡（插圖＋英文＋中文，Ana 念單字）→ 最後 1.2 秒整張海報。回傳 [(念讀檔, 開始秒, 去掉的前段靜音)]。"""
    from PIL import ImageEnhance
    art = Image.open(ROOT / "refs" / "poster_art.png").convert("RGB")
    bg = art.resize((W, int(W * 1024 / 1536)), Image.LANCZOS).crop((0, 60, W, 60 + H)).filter(ImageFilter.GaussianBlur(18))
    bg = ImageEnhance.Brightness(bg).enhance(1.12).convert("RGBA")
    bg.alpha_composite(Image.new("RGBA", (W, H), (255, 244, 225, 120)))
    spans = [speech_span(ROOT / "voices" / f"W_{w}.mp3") for w, _ in CARD_WORDS]
    sp = [b - a for a, b in spans]; extra = (INTRO - POSTER_END - 2 * sum(sp)) / len(sp)
    durs = [2 * x + extra for x in sp]; starts = [sum(durs[:i]) for i in range(len(durs))]
    ph = H - 40
    poster = Image.open(ROOT / "out" / "poster_A3.png").convert("RGB").resize((int(ph * 1.5), ph), Image.LANCZOS)
    cards = []
    for i, (en, zh) in enumerate(CARD_WORDS):
        im = bg.copy(); d = ImageDraw.Draw(im)
        pic = ImageEnhance.Brightness(art.crop(CARD_BOX[i])).enhance(1.08)
        pic = pic.resize((int(pic.width * 820 / pic.height), 820), Image.LANCZOS)
        m = Image.new("L", pic.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, pic.width, pic.height], radius=40, fill=255)
        sh = Image.new("RGBA", (pic.width + 40, pic.height + 40), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([20, 26, pic.width + 20, pic.height + 26], radius=40, fill=(60, 30, 10, 110))
        im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)), (70, 110))
        im.paste(pic, (90, 130), m)
        d.rounded_rectangle([84, 124, 96 + pic.width, 136 + pic.height], radius=44, outline=(120, 70, 30), width=6)
        cx = 90 + pic.width + (W - 90 - pic.width) // 2
        fe = 150
        while d.textlength(en, font=font(fe)) > W - 90 - pic.width - 110: fe -= 6
        d.text((cx, 470), en, font=font(fe), anchor="mm", fill=(90, 42, 16), stroke_width=4, stroke_fill=(255, 250, 238))
        d.text((cx, 640), zh, font=font(96, True), anchor="mm", fill=(200, 50, 40), stroke_width=4, stroke_fill=(255, 250, 238))
        d.text((cx, 860), f"{i + 1} / 8", font=font(48), anchor="mm", fill=(140, 95, 60))
        cards.append(im)
    for k in range(int(INTRO * 12)):
        t = k / 12
        if t >= INTRO - POSTER_END:
            im = bg.copy(); u = min(1, (t - (INTRO - POSTER_END)) / 0.3); z = 0.94 + 0.06 * u
            pp = poster.resize((int(poster.width * z), int(poster.height * z)), Image.LANCZOS)
            im.paste(pp, ((W - pp.width) // 2, (H - pp.height) // 2))
        else:
            i = max(j for j in range(8) if starts[j] <= t + 1e-6); u = min(1, (t - starts[i]) / 0.25)
            if u < 1:                                   # 卡片從 92% 彈到 100%
                z = 0.92 + 0.08 * u; cc = cards[i].resize((int(W * z), int(H * z)), Image.LANCZOS)
                im = bg.copy(); im.alpha_composite(cc, ((W - cc.width) // 2, (H - cc.height) // 2))
            else: im = cards[i]
        im.convert("RGB").save(dst / f"{k:04d}.png", compress_level=1)
    out = []
    for i, (w, _) in enumerate(CARD_WORDS):   # 第一次：卡片出現後 0.2 秒；第二次：卡片的一半＋0.15 秒（中間留空跟讀）
        vp, cut = ROOT / "voices" / f"W_{w}.mp3", max(0, spans[i][0] - 0.03)
        out += [(vp, starts[i] + 0.2, cut), (vp, starts[i] + durs[i] / 2 + 0.15, cut)]
    return out


def opening():
    """v2：片頭 10 秒單字卡 → 書本（Blender O 段從 6.8 秒開始，0.6 秒溶接）；書翻開時配 S02 第 1 次。"""
    w = SEC / "O"; shutil.rmtree(w, ignore_errors=True); (w / "c").mkdir(parents=True); (w / "b").mkdir()
    CUT, XD, VAT0 = 6.8, 0.6, 8.6
    voices = intro_cards(w / "c")
    fs = sorted(p for p in (ROOT / "renders" / "Or1").glob("f*.png") if int(p.stem[1:]) >= round(CUT * 24))
    for i, p in enumerate(fs): shutil.copy(p, w / "b" / f"{i:04d}.png")
    D = INTRO + len(fs) / 12.0; VAT = INTRO + (VAT0 - CUT)
    ev = karaoke("S02", 1, VAT - LEAD, VAT + 8.2, ["Thanksgiving", "holiday", "America", "learn"], "感恩節是美國的重要節日。\\N一起來看看它是怎麼開始的！", ["感恩節", "節日"], True)
    (w / "subs.ass").write_text(ASS_HEAD + "\n".join(ev) + "\n", encoding="utf-8")
    shutil.copytree(FONTS, w / "fonts")
    for listen in (False, True):
        tag = "-listen" if listen else ""; sub = "subtitles=subs.ass:fontsdir=fonts," if not listen else ""
        fc = (f"[0:v]fps=24,tpad=stop_mode=clone:stop_duration={XD}[a];[1:v]fps=24[b];"
              f"[a][b]xfade=transition=fade:duration={XD}:offset={INTRO:.3f},{sub}format=yuv420p[v]")
        ins = ["-framerate", "12", "-i", "b/%04d.png", "-i", str(OV / "voices" / "S02_1.mp3"), "-i", str(music_file("harvest"))]
        af = f"[2:a]adelay={int(VAT * 1000)}|{int(VAT * 1000)}[v1];[3:a]atrim=0:{D + 1:.2f},volume=0.18,afade=t=in:d=1,afade=t=out:st={D - 1.2:.2f}:d=1.2[m];"
        mix = "[v1][m]"
        for k, (vp, at, cut) in enumerate(voices):
            ins += ["-i", str(vp)]; ms = int(at * 1000)
            af += f"[{4 + k}:a]atrim=start={cut:.3f},asetpts=PTS-STARTPTS,adelay={ms}|{ms}[w{k}];"; mix += f"[w{k}]"
        af += f"{mix}amix=inputs={2 + len(voices)}:normalize=0,loudnorm=I=-16:TP=-1.5,atrim=0:{D:.2f}[a]"
        run(["ffmpeg", "-y", "-nostdin", "-framerate", "12", "-i", "c/%04d.png", *ins, "-filter_complex", fc + ";" + af, "-map", "[v]", "-map", "[a]",
             "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-r", "24", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
             "-t", f"{D:.2f}", str(SEC / f"O{tag}.mp4")], cwd=w)
    print("O", f"{D:.1f}s", flush=True)


QZ = [("CQ1", "CA1", True, "S03", "The Pilgrims came to America in 1620.", None),
      ("CQ2", "CA2", False, "S08", "Tisquantum helped them plant rice.", ("rice", "corn")),
      ("CQ3", "CA3", True, "S10", "They ate together for three days.", None)]


def dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return float(r.stdout.strip())


def quiz():
    """片尾 3 題是非題：題目＋畫面 → 3-2-1 → 揭曉 → 念答案。背景是書桌全景（模糊）。"""
    w = SEC / "Q"; w.mkdir(parents=True, exist_ok=True)
    bgsrc = sorted((ROOT / "renders" / "Or1").glob("f*.png"))[-1]
    bg = Image.open(bgsrc).convert("RGBA").resize((W, H))
    bg = Image.alpha_composite(bg.filter(ImageFilter.GaussianBlur(6)), Image.new("RGBA", (W, H), (20, 14, 30, 110)))
    VQ = ROOT / "voices"; parts = []; t = 0.5
    qi = OV / "voices" / "QI_1.mp3"; parts.append((qi, t)); t += dur(qi) + 0.4
    plan = []
    for q, a, ans, pic_sid, text, fix in QZ:
        q_at = t; parts.append((VQ / f"{q}.mp3", q_at)); t += dur(VQ / f"{q}.mp3") + 0.3
        c0 = t; rv = c0 + 3.0; a_at = rv + 0.5; parts.append((VQ / f"{a}.mp3", a_at)); t = a_at + dur(VQ / f"{a}.mp3") + 1.0
        pic_dir = ROOT / "renders" / ("full_r1" if pic_sid == "S03" else f"{pic_sid}r1")
        pics = sorted(pic_dir.glob("f*.png")); pic = Image.open(pics[len(pics) * 2 // 3]).convert("RGB")
        plan.append(dict(q0=q_at, c0=c0, rv=rv, a_at=a_at, end=t, ans=ans, text=text, fix=fix, pic=pic))
    TOTAL = t + 0.5
    fdir = w / "f"
    if fdir.exists(): shutil.rmtree(fdir)
    fdir.mkdir()
    for i in range(int(TOTAL * FPS)):
        tt = i / FPS; im = bg.copy(); d = ImageDraw.Draw(im)
        tag = "True or False?  是非題"
        d.rounded_rectangle([60, 30, 60 + d.textlength(tag, font=font(56, True)) + 60, 112], radius=30, fill=(90, 70, 200, 255))
        d.text((90, 71), tag, font=font(56, True), anchor="lm", fill=(255, 255, 255, 255))
        cur = next((p for p in plan if tt < p["end"]), None)
        if cur and tt >= cur["q0"] - 0.3:
            k = plan.index(cur) + 1
            pw, ph = 860, 484; px, py = (W - pw) // 2, 150
            pic = cur["pic"].resize((pw, ph)); d.rounded_rectangle([px - 12, py - 12, px + pw + 12, py + ph + 12], radius=30, fill=(255, 250, 235, 255), outline=(90, 70, 200, 255), width=7)
            im.paste(pic, (px, py)); d = ImageDraw.Draw(im)
            fq = font(62); txt = f"Q{k}. {cur['text']}"
            while d.textlength(txt, font=fq) > 1760: fq = font(fq.size - 4)
            d.text((W / 2, 690), txt, font=fq, anchor="mm", fill=(255, 255, 255, 255), stroke_width=5, stroke_fill=(48, 26, 8, 255))
            r = min(1, max(0, (tt - cur["rv"]) / 0.35)) if tt >= cur["rv"] else 0
            for lab, good, bx in (("TRUE", cur["ans"], 700), ("FALSE", not cur["ans"], 1220)):
                col = (60, 170, 80) if lab == "TRUE" else (220, 70, 60); sc = 1 + 0.18 * r * (1 if good else -0.4); a = int(255 * (1 - 0.65 * r * (0 if good else 1)))
                w2, h2 = 200 * sc, 66 * sc; yy = 850
                if good and r > 0:
                    g = 16 + 6 * math.sin(tt * 8); d.rounded_rectangle([bx - w2 - g, yy - h2 - g, bx + w2 + g, yy + h2 + g], radius=60, fill=(255, 230, 90, 200))
                d.rounded_rectangle([bx - w2, yy - h2, bx + w2, yy + h2], radius=50, fill=col + (a,), outline=(255, 255, 255, a), width=7)
                d.text((bx, yy), ("✔ " if lab == "TRUE" else "✘ ") * 0 + lab, font=font(int(72 * sc)), anchor="mm", fill=(255, 255, 255, a))
            if cur["c0"] <= tt < cur["rv"]:
                n = 3 - int(tt - cur["c0"]); u = (tt - cur["c0"]) % 1; z = 1.4 - 0.4 * min(1, u / 0.3)
                cx, cy = W / 2, py + ph / 2
                d.ellipse([cx - 110 * z, cy - 110 * z, cx + 110 * z, cy + 110 * z], fill=(255, 255, 255, 235), outline=(90, 70, 200, 255), width=10)
                d.text((cx, cy), str(n), font=font(int(160 * z)), anchor="mm", fill=(90, 70, 200, 255))
            if cur["fix"] and tt >= cur["a_at"] + 0.6:
                wrong, right = cur["fix"]; a2 = min(1, (tt - cur["a_at"] - 0.6) / 0.4)
                d.rounded_rectangle([1420, 300, 1840, 520], radius=30, fill=(255, 255, 255, int(240 * a2)), outline=(90, 70, 200, int(255 * a2)), width=6)
                d.text((1630, 360), wrong, font=font(64), anchor="mm", fill=(170, 160, 160, int(255 * a2)))
                wl = font(64).getlength(wrong); d.line([(1630 - wl / 2, 364), (1630 + wl / 2, 364)], fill=(220, 50, 40, int(255 * a2)), width=8)
                d.text((1630, 460), right + " 玉米", font=font(68, True), anchor="mm", fill=(60, 150, 70, int(255 * a2)))
        im.convert("RGB").save(fdir / f"{i:05d}.png", compress_level=1)
    buf = np.zeros(int((TOTAL + 1) * SR), np.float32)
    for p, at in parts:
        subprocess.run(["ffmpeg", "-y", "-nostdin", "-i", str(p), "-ac", "1", "-ar", str(SR), str(w / "tmp.wav")], capture_output=True)
        with wave.open(str(w / "tmp.wav")) as g: x = np.frombuffer(g.readframes(g.getnframes()), "<i2").astype(np.float32) / 32767
        i0 = int(at * SR); buf[i0:i0 + len(x)] += x
    buf += tick([p["c0"] + k for p in plan for k in range(3)], TOTAL + 1)[: len(buf)]
    save_wav(w / "voice.wav", buf)
    af = f"[1:a]volume=1.0[v];[2:a]atrim=0:{TOTAL + 1:.2f},volume=0.14,afade=t=out:st={TOTAL - 2:.2f}:d=2[m];[v][m]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5,atrim=0:{TOTAL:.2f}[a]"
    for tag in ("", "-listen"):
        run(["ffmpeg", "-y", "-nostdin", "-framerate", "24", "-i", "f/%05d.png", "-i", "voice.wav", "-i", str(music_file("holiday")),
             "-filter_complex", af, "-map", "0:v", "-map", "[a]", "-vf", f"fade=t=out:st={TOTAL - 1:.2f}:d=1,format=yuv420p",
             "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-r", "24", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
             "-t", f"{TOTAL:.2f}", str(SEC / f"Q{tag}.mp4")], cwd=w)
    shutil.rmtree(fdir)
    print("Q", f"{TOTAL:.1f}s", flush=True)


def film():
    OUT.mkdir(exist_ok=True)
    order = ["O"] + [f"S{n:02d}" for n in range(3, 13)] + ["Q"]
    for tag, name in (("", "Thanksgiving-Classroom-Tabletop"), ("-listen", "Thanksgiving-Classroom-Tabletop-Listening")):
        lst = SEC / f"list{tag}.txt"
        lst.write_text("".join(f"file '{(SEC / f'{s}{tag}.mp4').as_posix()}'\n" for s in order), encoding="utf-8")
        run(["ffmpeg", "-y", "-nostdin", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(OUT / f"{name}.mp4")])
        run(["ffmpeg", "-y", "-nostdin", "-i", str(OUT / f"{name}.mp4"), "-vf", "scale=1280:720", "-c:v", "libx264", "-crf", "24", "-preset", "medium",
             "-c:a", "aac", "-b:a", "128k", str(OUT / f"{name}_720p.mp4")])
        print(name, f"{dur(OUT / f'{name}.mp4'):.1f}s", flush=True)


if __name__ == "__main__":
    SEC.mkdir(parents=True, exist_ok=True)
    for a in sys.argv[1:]:
        if a == "film": film()
        elif a == "O": opening()
        elif a == "Q": quiz()
        else: sentence(a)
