"""由來段全片 S03–S12（老師 2026-11-04 核准 v4 版面）：每句 第一次念＝H3 全畫面 → 慢翻頁 1.2 秒 → 第二次念＝解說動畫全畫面
＋ Pippy 圓框小頭像；句與句之間 0.4 秒淡入淡出。標籤在解說畫面左上角直排、字幕在最下方、小頭像在預留角落。
  python scripts/compose_full.py [S03 S04 ...]   -> work/full/origin.mp4、origin_720p.mp4（不給句子＝全部）
"""
import json, math, subprocess, sys, tempfile
from pathlib import Path
import numpy as np, soundfile as sf
from PIL import Image, ImageDraw, ImageFont

FILM = Path(__file__).resolve().parents[1]
OUT = FILM / "work" / "full"; OUT.mkdir(parents=True, exist_ok=True)
FONTS = FILM / "work" / "fonts"
W, H, FPS, SR, LINE_AT, XF = 1920, 1080, 24, 48000, 0.5, 0.4
PAGE = 1.2            # page turn between the two reads (teacher 11/04: slower)
LEAD = PAGE - XF      # read 1 holds its last frame, the explainer holds its first frame -> no voice during the page turn
WORDS = json.loads((FILM / "voices" / "words.json").read_text(encoding="utf-8"))
SEQ = ["S03", "S04", "S05", "S06", "S07", "S08", "S09", "S10", "S11", "S12"]

# Pippy 在第二次念 H3（1344x768）中的臉：中心、裁切邊長；小頭像放在解說畫面的哪個角落
BUBBLE = {
    "S03": dict(cx=1100, cy=440, size=300, corner="br"),
    "S04": dict(cx=270, cy=470, size=300, corner="bl"),
    "S05": dict(cx=1030, cy=415, size=340, corner="bl"),
    "S06": dict(cx=210, cy=410, size=300, corner="bl"),
    "S07": dict(cx=1065, cy=470, size=260, corner="bl"),
    "S08": dict(cx=230, cy=400, size=440, corner="bl"),
    "S09": dict(cx=205, cy=405, size=300, corner="br"),
    "S10": dict(cx=1160, cy=430, size=300, corner="br"),
    "S11": dict(cx=672, cy=360, size=420, corner="bl"),
    "S12": dict(cx=1100, cy=435, size=280, corner="bl"),
}
X = FILM / "work"; HX = FILM / "h3"
EXPLAINER = {"S03": X / "X03_map.mp4", "S04": X / "X04.mp4", "S05": X / "X05.mp4", "S06": X / "X06.mp4",
             "S07": HX / "X07" / "clip.mp4", "S08": HX / "X08" / "clip.mp4", "S09": HX / "X09" / "clip.mp4",
             "S10": X / "X10.mp4", "S11": X / "X11.mp4", "S12": HX / "X12" / "clip.mp4"}
# 解說畫面左上角的標籤（念到 trigger 字時亮起）；"num" = 大數字
LABELS = {
    "S03": [("1620", "1620", "", "num")],
    "S04": [("Mayflower", "Mayflower", "五月花號"), ("About", "about 100", "大約 100")],
    "S05": [("Pilgrims", "Pilgrims", "朝聖者（清教徒）")],
    "S06": [("land", "land", "土地"), ("Wampanoag", "Wampanoag", "萬帕諾亞格族")],
    "S07": [("winter", "winter", "冬天"), ("cold", "cold", "冷")],
    "S08": [("Wampanoag", "Wampanoag", "萬帕諾亞格族"), ("Tisquantum", "Tisquantum", "人名"), ("plant", "plant corn", "種玉米")],
    "S09": [("1621", "1621", "", "num"), ("fall", "fall", "秋天"), ("harvest", "harvest", "豐收"), ("feast", "feast", "大餐")],
    "S10": [("Massasoit", "Massasoit", "人名"), ("leader", "leader", "領袖"), ("about", "about 90", "大約 90"),
            ("three", "three days", "三天")],
    "S11": [("holiday", "holiday", "節日"), ("fourth", "fourth Thursday", "第四個星期四"), ("November", "November", "十一月")],
    "S12": [("Native", "Native people", "原住民"), ("remember", "remember", "記得"), ("history", "history", "歷史")],
}
# 背景音樂（句意動作與聲音對照表 v2 的情緒分段）
MUSIC = [("voyage", "S03", "S05"), ("arrival", "S06", "S06"), ("winter", "S07", "S07"), ("spring", "S08", "S08"),
         ("harvest", "S09", "S10"), ("holiday", "S11", "S11"), ("native", "S12", "S12")]
KW = 54


def run(*a):
    subprocess.run(list(a), check=True)


def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                                capture_output=True, text=True).stdout)


def norm(src, dst, hold=0.0):
    run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(src), "-vf",
        f"scale=1920:-2,crop=1920:1080,fps=24,setsar=1,tpad=stop_mode=clone:stop_duration={hold}", "-an",
        "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", str(dst))


def bubble_ring(d=300, ring=10):
    m = Image.new("RGBA", (d + 2 * ring, d + 2 * ring), (0, 0, 0, 0)); g = ImageDraw.Draw(m)
    g.ellipse([0, 0, d + 2 * ring - 1, d + 2 * ring - 1], fill=(255, 250, 235, 255))
    g.ellipse([ring - 3, ring - 3, d + ring + 2, d + ring + 2], outline=(230, 140, 40, 255), width=6)
    m.save(OUT / "ring.png")


def word_t(sid, key, k=2, end=False):
    """Time of a word inside the <sid>_<k> clip (voice starts at LINE_AT)."""
    off = lead_offset(sid, k)
    for w in WORDS[sid][f"take{k}"]:
        if key.lower() in w["w"].lower():
            return LINE_AT + w["t"] - off + (w["d"] if end else 0)
    raise KeyError(key)


def overlay_clip(sid, secs):
    """Code overlays on top of AI explainers (transparent .mov), or None."""
    if sid not in ("S07", "S09"):
        return None
    dst = OUT / f"{sid}_ov.mov"
    if sid == "S07":
        t0, t1 = word_t(sid, "cold") - 0.2, word_t(sid, "hard", end=True)
    else:
        rng = np.random.default_rng(9); leaves = [(rng.uniform(300, W), rng.uniform(-H, 0), rng.uniform(0.6, 1.2)) for _ in range(16)]
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "qtrle", str(dst)], stdin=subprocess.PIPE)
    for i in range(int(round(secs * FPS))):
        t = i / FPS; im = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(im)
        if sid == "S07":      # thermometer on the right: red level falls to blue on "cold ... hard"
            x, y0, y1 = 1730, 200, 760
            u = 0.5 - 0.5 * math.cos(math.pi * max(0, min(1, (t - t0) / max(0.5, t1 - t0))))
            d.rounded_rectangle([x - 34, y0, x + 34, y1], radius=34, fill=(245, 245, 250, 230), outline=(90, 100, 120, 255), width=6)
            d.ellipse([x - 62, y1 - 40, x + 62, y1 + 84], fill=(245, 245, 250, 230), outline=(90, 100, 120, 255), width=6)
            col = tuple(int(a * (1 - u) + b * u) for a, b in zip((230, 50, 40), (60, 120, 230)))
            lvl = y0 + 60 + (y1 - y0 - 80) * (0.15 + 0.75 * u)
            d.rectangle([x - 16, lvl, x + 16, y1 + 10], fill=col + (255,)); d.ellipse([x - 46, y1 - 24, x + 46, y1 + 68], fill=col + (255,))
            for k in range(8):
                yy = y0 + 70 + k * 60; d.line([(x + 36, yy), (x + 58, yy)], fill=(90, 100, 120, 255), width=4)
            d.text((x, y0 - 60), "cold" if u > 0.5 else "", font=ImageFont.truetype(str(FONTS / "ComicRelief-Regular.ttf"), 60),
                   fill=(60, 120, 230, 255), anchor="mm", stroke_width=6, stroke_fill=(255, 255, 255, 255))
        else:                 # falling autumn leaves
            for j, (lx, ly, sp) in enumerate(leaves):
                yy = ly + t * 160 * sp; xx = lx + 40 * math.sin(t * 1.5 + j)
                if -40 < yy < H - 260:
                    a = math.radians((t * 90 * sp + j * 40) % 360)
                    pts = [(xx + 22 * math.cos(a + q), yy + 12 * math.sin(a + q)) for q in (0, 1.6, 3.14, 4.7)]
                    d.polygon(pts, fill=((220, 90, 30) if j % 3 else (240, 170, 40)) + (235,))
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()
    return dst


def explainer(sid, k2clip, dst):
    """Explainer full screen (+ code overlay) + round Pippy bubble cut from the 2nd-read clip."""
    b = BUBBLE[sid]; s = b["size"]; x0, y0 = b["cx"] - s // 2, b["cy"] - s // 2
    D, R = 300, 10
    bx = W - D - 2 * R - 60 if b["corner"] == "br" else 60
    by = H - D - 2 * R - 250          # above the subtitle band
    secs = dur(k2clip); ov = overlay_clip(sid, secs)
    ins = ["-i", str(EXPLAINER[sid]), "-i", str(k2clip), "-i", str(OUT / "ring.png")] + (["-i", str(ov)] if ov else [])
    # ffmpeg 9.0.1: PNG with -loop 1 hangs forever, so no looped images. Circle cut by geq; ring is a still overlay.
    fc = (f"[1:v]fps=24,crop={s}:{s}:{x0}:{y0},scale={D}:{D},format=rgba,"
          f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-{D / 2},Y-{D / 2}),{D / 2 - 1}),255,0)'[face];"
          f"[0:v]scale=1920:-2,crop=1920:1080,fps=24,setsar=1,tpad=stop_mode=clone:stop_duration=10[bg0];")
    fc += "[bg0][3:v]overlay=0:0:eof_action=pass[bg];" if ov else "[bg0]null[bg];"
    fc += (f"[bg][2:v]overlay={bx}:{by}[b1];[b1][face]overlay={bx + R}:{by + R}:shortest=1,"
           f"tpad=start_mode=clone:start_duration={LEAD}[v]")
    run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", *ins, "-filter_complex", fc, "-map", "[v]", "-t", f"{secs + LEAD:.3f}",
        "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", str(dst))


_OFF = {}


def lead_offset(sid, k):
    if (sid, k) not in _OFF:
        t = Path(tempfile.mkdtemp()) / "a.wav"
        run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(FILM / "voices" / f"{sid}_{k}.mp3"), "-ar", str(SR), "-ac", "1", str(t))
        w, _ = sf.read(str(t), dtype="float32"); idx = np.where(np.abs(w) > 0.01)[0]
        _OFF[(sid, k)] = max(0, idx[0] - 2400) / SR
    return _OFF[(sid, k)]


def ts(t):
    t = max(0, t); return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def ass(segs):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Comic Relief,82,&H0000D7FF,&H00FFFFFF,&H00301A08,&H64000000,0,0,0,0,100,100,0,0,1,6,2,2,80,80,60,1
Style: Kw,Comic Relief,{KW},&H00FFFFFF,&H00FFFFFF,&H00205AC8,&H00205AC8,0,0,0,0,100,100,0,0,3,14,0,7,0,0,0,1
Style: Num,Comic Relief,110,&H0028C8FF,&H0028C8FF,&H00143250,&H00000000,0,0,0,0,100,100,0,0,1,9,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for st, sid, k, d, is_expl, xo in segs:
        off = lead_offset(sid, k); words = WORDS[sid][f"take{k}"]; full = WORDS[sid]["text"]
        times = [st + LINE_AT + w["t"] - off for w in words]
        a, b = times[0] - 0.25, st + d - xo
        parts, prev, pos = [], a, 0
        for w, t0 in zip(words, times):
            if t0 - prev > 0.02:
                parts.append(f"{{\\k{int((t0 - prev) * 100)}}}")
            i = full.find(w["w"].split()[0], pos); j = full.find(w["w"].split()[-1], i) + len(w["w"].split()[-1]) if i >= 0 else -1
            if i >= 0 and j > 0:
                while j < len(full) and full[j] in ",.!?":
                    j += 1
                shown, pos = full[i:j], j
            else:
                shown = w["w"]
            parts.append(f"{{\\kf{max(1, int(w['d'] * 100))}}}{shown} "); prev = t0 + w["d"]
        text = "".join(parts).strip()
        if len(full) > 42:            # two lines: break at the sentence break if there is one, else in the middle
            mid = full.find(". ") + 2 if 0 < full.find(". ") < len(full) - 3 else 0
            key = full[mid:].split()[0] if mid else words[len(words) // 2]["w"].split()[0]
            cut = text.find(f"}}{key}", len(text) // 4)
            text = text[:cut + 1] + "\\N" + text[cut + 1:] if cut > 0 else text
        ev.append(f"Dialogue: 0,{ts(a)},{ts(b)},Sub,,0,0,0,,{text}")
        if not is_expl:
            continue
        x, ky = 40, 22
        for item in LABELS.get(sid, []):
            trig, en, zh = item[:3]
            hit = [t for w, t in zip(words, times) if trig.lower() in w["w"].lower()]
            if not hit:
                continue
            if len(item) > 3 and item[3] == "num":
                ev.append(f"Dialogue: 1,{ts(hit[0])},{ts(b)},Num,,0,0,0,,{{\\an7\\pos({x},6)\\fad(150,200)}}{en}")
                x += int(ImageFont.truetype(str(FONTS / 'ComicRelief-Regular.ttf'), 110).getlength(en)) + 40
                continue
            lab = en + (f"  {{\\fnMicrosoft JhengHei\\b1}}{zh}" if zh else "")
            # keyword labels stack down the empty top-left column, so they never reach the explainer content
            ev.append(f"Dialogue: 1,{ts(hit[0])},{ts(b)},Kw,,0,0,0,,{{\\an7\\pos({x},{ky})\\fad(200,200)}}{lab}")
            ky += 84
    return head + "\n".join(ev) + "\n"


def loadw(path, rms=None):
    t = Path(tempfile.mkdtemp()) / "x.wav"
    run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(path), "-ar", str(SR), "-ac", "1", str(t))
    w = sf.read(str(t), dtype="float32")[0]
    if rms:
        act = w[np.abs(w) > 0.01]; w = w * (rms / (np.sqrt((act ** 2).mean()) + 1e-9)) if len(act) else w
    return w


def sfx_plan(sid, a, b, la, lb):
    """Sound cues per sentence: (key, at, length, db, fade, off, ducked). a/b = content start of read 1/2, la/lb lengths."""
    E = lambda name: json.loads((FILM / "work" / f"{name}_events.json").read_text(encoding="utf-8"))
    c = []
    if sid == "S03":
        c += [("waves", a, la, -8, .8, 0, 1), ("sails", a, la, -12, .8, 0, 1), ("creak", a, la, -14, .8, 2, 1), ("gulls", a + .5, la - .5, -14, .8, 0, 1)]
        e = json.loads((FILM / "work" / "X03_events.json").read_text(encoding="utf-8"))
        c += [("waves", b, lb, -16, .8, 0, 1), ("whoosh", b + e["England"][0], None, -6, .02, 0, 0),
              ("chime", b + e["America"][0] + e["America"][1], 1.6, -6, .2, 0, 0)]
    elif sid == "S04":
        e = E("X04")
        c += [("waves", a, la, -12, .8, 0, 1), ("creak", a, la, -12, .8, 2, 1), ("gulls", a, la, -18, .8, 0, 1),
              ("crowd", a, la, -16, .8, 0, 1), ("laugh", a + 1.5, 3.0, -24, .5, 0, 1),
              ("waves", b, lb, -18, .8, 0, 1), ("pop", b + e["mayflower"], None, -8, .01, 0, 0)]
        c += [("pop", b + t, None, -16, .01, 0, 0) for t in e["ticks"]] + [("chime", b + e["count_end"], 1.6, -6, .2, 0, 0)]
    elif sid == "S05":
        c += [("waves", a, la, -10, .8, 0, 1), ("gulls", a, la, -16, .8, 0, 1), ("steps", a + .6, la - .6, -16, .5, 0, 1),
              ("waves", b, lb, -14, .8, 0, 1),
              ("pop", b + word_t(sid, "Pilgrims"), None, -8, .01, 0, 0)]
    elif sid == "S06":
        e = E("X06")
        c += [("birds", a, la, -10, .8, 0, 1), ("waves", a, la, -18, .8, 0, 1), ("rustle", a + .3, None, -16, .2, 0, 1),
              ("waves", b, lb, -16, .8, 0, 1),
              ("chime", b + e["wamp"], 1.6, -6, .2, 0, 0)]
    elif sid == "S07":
        c += [("wind", a, la, -8, .8, 20, 1), ("fire", a, la, -14, .8, 5, 1),
              ("wind", b, lb, -10, .8, 40, 1), ("fire", b, lb, -12, .8, 30, 1), ("whoosh", b + word_t(sid, "cold"), None, -8, .05, 0, 0)]
    elif sid == "S08":
        c += [("birds", a, la + lb + 2, -10, 1.0, 0, 1), ("dig", a + .2, 2.2, -12, .2, 3, 1), ("water", a + 3.5, 2.0, -12, .3, 1, 1)]
        c += [("dig", b + .2, .9, -10, .15, 3, 1), ("pop", b + 1.0, None, -10, .01, 0, 0), ("dig", b + 2.0, 1.4, -10, .2, 8, 1),
              ("water", b + 3.9, 1.2, -10, .3, 1, 1), ("chime", b + 5.6, 2.4, -6, .3, 0, 0)]
    elif sid == "S09":
        c += [("birds", a, la, -14, .8, 0, 1), ("crowd", a, la, -22, .8, 0, 1), ("birds", b, lb, -16, .8, 0, 1),
              ("rustle", b + .4, None, -10, .1, 0, 1), ("rustle", b + 2.6, None, -12, .1, 0, 1), ("pop", b + word_t(sid, "1621"), None, -8, .01, 0, 0)]
    elif sid == "S10":
        e = E("X10")
        c += [("birds", a, la, -16, .8, 0, 1), ("plates", a, la, -16, .8, 0, 1), ("laugh", a + 1, 4, -18, .5, 0, 1)]
        c += [("chime", b + t, 1.2, -8, .2, 0, 0) for t in e["days"]]
        c += [("steps", b + e["count_start"], e["count_end"] - e["count_start"] + .3, -12, .3, 0, 1),
              ("plates", b + e["they"], lb - e["they"], -16, .5, 0, 1), ("laugh", b + e["they"] + .5, 3, -20, .5, 0, 1)]
        c += [("pop", b + e["count_start"] + (e["count_end"] - e["count_start"]) * k / 8, None, -16, .01, 0, 0) for k in range(9)]
    elif sid == "S11":
        for base, ev in ((a, E("S11_1")), (b, E("X11"))):
            c += [("page", base + ev["flip_start"], None, -10, .02, 0, 0), ("stamp", base + ev["stamp"], None, -4, .01, 0, 0),
                  ("page", base + ev["switch"], None, -10, .02, 0, 0)]
            c += [("pop", base + t, None, -12, .01, 0, 0) for t in ev["thursdays"]] + [("chime", base + ev["glow"], 1.6, -6, .2, 0, 0)]
    elif sid == "S12":
        c += [("waves", a, la, -14, .8, 0, 1), ("waves", b, lb, -20, .8, 0, 1)]
    return c


if __name__ == "__main__":
    seq = sys.argv[1:] or SEQ
    bubble_ring()
    plan = [(sid, k, k == 2) for sid in seq for k in (1, 2)]
    files = []
    for sid, k, ex in plan:
        clip = FILM / "h3" / f"{sid}_{k}" / "clip.mp4"; dst = OUT / f"{sid}_{k}{'_x' if ex else ''}.mp4"
        explainer(sid, clip, dst) if ex else norm(clip, dst, hold=LEAD)
        files.append(dst); print("segment", dst.name, flush=True)
    ds = [dur(f) for f in files]
    trans = [("slideleft", PAGE) if i % 2 == 0 else ("fade", XF) for i in range(len(files) - 1)]
    starts = [0.0]
    for d, (_, x) in zip(ds[:-1], trans):
        starts.append(starts[-1] + d - x)
    total = starts[-1] + ds[-1]
    fc, last = [], "[0:v]"
    for i in range(1, len(files)):
        fc.append(f"{last}[{i}:v]xfade=transition={trans[i - 1][0]}:duration={trans[i - 1][1]}:offset={starts[i]:.3f}[x{i}]"); last = f"[x{i}]"
    lead = [LEAD if ex else 0.0 for _, _, ex in plan]
    cs = [st + ld for st, ld in zip(starts, lead)]          # when each segment's own content (voice) starts
    segs = [(cs[i], sid, k, ds[i] - lead[i], ex, trans[i][1] if i < len(trans) else XF) for i, (sid, k, ex) in enumerate(plan)]
    (OUT / "subs.ass").write_text(ass(segs), encoding="utf-8")
    fontsdir = FONTS.as_posix().replace(":", "\\:"); assf = (OUT / "subs.ass").as_posix().replace(":", "\\:")
    fc.append(f"{last}ass='{assf}':fontsdir='{fontsdir}'[o]")
    ins = sum([["-i", str(f)] for f in files], [])

    # ---- audio ----
    mix = np.zeros(int(total * SR) + SR, dtype=np.float32)
    for i, (sid, k, ex) in enumerate(plan):
        w, _ = sf.read(str(FILM / "h3" / f"{sid}_{k}" / "guide.wav"), dtype="float32"); i0 = int(cs[i] * SR); mix[i0:i0 + len(w)] += w * 1.25
    v = np.abs(mix); c = np.cumsum(np.insert(v, 0, 0)); kk = SR // 4
    env = (c[kk:] - c[:-kk]) / kk; env = np.pad(env, (kk // 2, len(mix) - len(env) - kk // 2))
    duck = np.convolve(np.where(env > 0.008, 10 ** (-7 / 20), 1.0), np.ones(SR // 10) / (SR // 10), "same").astype(np.float32)

    def place(w, at, length=None, db=-20, fade=0.3, off=0.0, ducked=True):
        w = w[int(off * SR):]; n = int((length or len(w) / SR) * SR)
        w = np.resize(w, n) if n > len(w) else w[:n]; f = min(int(fade * SR), n // 2)
        if f:
            w = w.copy(); w[:f] *= np.linspace(0, 1, f); w[-f:] *= np.linspace(1, 0, f)
        i0 = int(at * SR); w = w[: max(0, len(mix) - i0)] * 10 ** (db / 20)
        if ducked:
            w = w * duck[i0:i0 + len(w)]
        mix[i0:i0 + len(w)] += w

    cache = {}
    R = lambda key: cache.setdefault(key, loadw(FILM / "sfx" / "raw" / f"{key}.mp3", rms=0.1))
    idx = {sid: plan.index((sid, 1, False)) for sid in seq}
    for cue, s0, s1 in MUSIC:
        if s0 not in idx and s1 not in idx:
            continue
        i0 = idx.get(s0, 0); i1 = idx.get(s1, len(plan) - 2) + 1
        at = starts[i0] - (0.4 if i0 else 0); ln = (starts[i1 + 1] if i1 + 1 < len(plan) else total) - at + 0.4
        p = json.loads((FILM / "music" / cue / "pick.json").read_text(encoding="utf-8"))
        place(loadw(FILM / "music" / cue / Path(p["file"]).relative_to(f"/content/tg/music/{cue}"), rms=0.1), at, ln, db=-14, fade=1.2)
    for sid in seq:
        i = idx[sid]
        place(R("page"), starts[i + 1] - 0.05, db=-6, fade=0.02, ducked=False)          # page turn between the two reads
        for key, at, ln, db, fade, off, dk in sfx_plan(sid, cs[i], cs[i + 1], ds[i], ds[i + 1] - LEAD):
            place(R(key), at, ln, db=db, fade=fade, off=off, ducked=bool(dk))
    sf.write(str(OUT / "audio.wav"), np.clip(mix, -0.98, 0.98), SR)

    run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", *ins, "-i", str(OUT / "audio.wav"), "-filter_complex", ";".join(fc),
        "-map", "[o]", "-map", f"{len(files)}:a", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
        "-shortest", str(OUT / "origin.mp4"))
    run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(OUT / "origin.mp4"), "-vf", "scale=1280:-2", "-c:v", "libx264", "-crf", "27",
        "-preset", "slow", "-af", "loudnorm=I=-16:TP=-1.5", "-c:a", "aac", "-b:a", "128k", str(OUT / "origin_720p.mp4"))
    print(OUT / "origin.mp4", f"{total:.1f}s", [round(s, 2) for s in starts])
