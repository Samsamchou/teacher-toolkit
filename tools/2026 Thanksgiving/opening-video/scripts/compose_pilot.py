"""試做片：S03（地圖 3 秒＋念兩次）＋S08（念兩次＋玉米發芽縮時），疊卡拉 OK 字幕與關鍵詞中英標籤。
  python scripts/compose_pilot.py [--music m.wav] [--sfx sfx_dir]
輸出 work/pilot/pilot.mp4（1920x1080）。聲音：乾淨配音（guide）＋（若有）配樂、音效。
"""
import argparse, json, math, shutil, subprocess, tempfile
from pathlib import Path
import numpy as np, soundfile as sf
from PIL import Image, ImageDraw, ImageFont

FILM = Path(__file__).resolve().parents[1]
OUT = FILM / "work" / "pilot"; OUT.mkdir(parents=True, exist_ok=True)
FONTS = FILM / "work" / "fonts"; FONTS.mkdir(parents=True, exist_ok=True)
SF3 = FILM.parents[1] / "2026 AI VIDEOS SENSE BAR" / "SF3 R1 Daily talk" / "fonts" / "ComicRelief-Regular.ttf"
for src in (SF3, Path("C:/Windows/Fonts/msjhbd.ttc")):
    if not (FONTS / src.name).exists():
        shutil.copy(src, FONTS / src.name)
W, H, FPS, SR, LINE_AT = 1920, 1080, 24, 48000, 0.5
WORDS = json.loads((FILM / "voices" / "words.json").read_text(encoding="utf-8"))

# 關鍵詞：念到 trigger 字時亮起，到該段結束。
# 位置：老師 2026-11-03 規定標籤不可擋到人物或重要畫面 → 每鏡指定空白區（看首幀＋逐秒抽格確認）
#   ("col", x, y) 由 (x, y) 往下排；("row", x, y) 由 (x, y) 往右排。數字 num 另給 NUMPOS。
LAYOUT = {"S03": ("col", 60, 200), "S08": ("row", 40, 22)}
NUMPOS = {"S03": (60, 20)}
KW_SIZE = 54
KEYS = {
    "S03": [("1620", "1620", "", "num"), ("England", "England", "英格蘭", "kw"), ("America", "America", "美洲", "kw")],
    "S08": [("Wampanoag", "Wampanoag", "萬帕諾亞格族", "kw"), ("Tisquantum", "Tisquantum", "人名", "kw"),
            ("plant", "plant corn", "種玉米", "kw")],
}


def lead_offset(sid, k):
    t = Path(tempfile.mkdtemp()) / "a.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(FILM / "voices" / f"{sid}_{k}.mp3"), "-ar", str(SR), "-ac", "1", str(t)], check=True)
    w, _ = sf.read(str(t), dtype="float32")
    idx = np.where(np.abs(w) > 0.01)[0]
    return max(0, idx[0] - 2400) / SR


def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def ass_for(segs):
    """segs: list of (start_in_film, sid, k, clip_secs)."""
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Comic Relief,82,&H0000D7FF,&H00FFFFFF,&H00301A08,&H64000000,0,0,0,0,100,100,0,0,1,6,2,2,80,80,70,1
Style: Kw,Comic Relief,54,&H00FFFFFF,&H00FFFFFF,&H00205AC8,&H00205AC8,0,0,0,0,100,100,0,0,3,14,0,9,60,60,50,1
Style: Num,Comic Relief,130,&H0028C8FF,&H0028C8FF,&H00143250,&H00000000,0,0,0,0,100,100,0,0,1,10,0,8,0,0,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for st, sid, k, dur in segs:
        off = lead_offset(sid, k)
        words = WORDS[sid][f"take{k}"]
        times = [st + LINE_AT + w["t"] - off for w in words]
        a, b = times[0] - 0.25, st + dur - 0.05
        # karaoke: \kf per word (centiseconds), whole line visible, sung part turns yellow (PrimaryColour)
        parts, prev, full, pos = [], a, WORDS[sid]["text"], 0
        for w, t0 in zip(words, times):
            gap = max(0, t0 - prev)
            if gap > 0.02:
                parts.append(f"{{\\k{int(gap * 100)}}}")
            i = full.find(w["w"].split()[0], pos)
            j = (full.find(w["w"].split()[-1], i) + len(w["w"].split()[-1])) if i >= 0 else -1
            if i >= 0 and j > 0:
                while j < len(full) and full[j] in ",.!?":
                    j += 1
                shown, pos = full[i:j], j
            else:
                shown = w["w"]
            parts.append(f"{{\\kf{max(1, int(w['d'] * 100))}}}{shown} ")
            prev = t0 + w["d"]
        text = "".join(parts).strip()
        if len(WORDS[sid]["text"]) > 42:  # two lines for long sentences
            mid = len(words) // 2
            cut = text.find(f"{words[mid]['w']} ")
            text = text[:cut] + "\\N" + text[cut:] if cut > 0 else text
        ev.append(f"Dialogue: 0,{ts(a)},{ts(b)},Sub,,0,0,0,,{text}")
        mode, x0, y0 = LAYOUT[sid]
        x, y = x0, y0
        fe = ImageFont.truetype(str(FONTS / "ComicRelief-Regular.ttf"), KW_SIZE)
        fz = ImageFont.truetype(str(FONTS / "msjhbd.ttc"), KW_SIZE)
        for trig, en, zh, kind in KEYS.get(sid, []):
            hit = [t for w, t in zip(words, times) if w["w"].split()[-1].strip(",.").lower() == trig.lower()
                   or trig.lower() in w["w"].lower()]
            if not hit:
                continue
            t0 = hit[0]
            if kind == "num":
                nx, ny = NUMPOS[sid]
                ev.append(f"Dialogue: 1,{ts(t0)},{ts(b)},Num,,0,0,0,,{{\\an7\\pos({nx},{ny})\\fad(150,200)\\t(0,180,\\fscx120\\fscy120)\\t(180,360,\\fscx100\\fscy100)}}{en}")
                continue
            lab = en + (f"  {{\\fnMicrosoft JhengHei\\b1}}{zh}" if zh else "")
            ev.append(f"Dialogue: 1,{ts(t0)},{ts(b)},Kw,,0,0,0,,{{\\an7\\pos({x},{y})\\fad(200,200)}}{lab}")
            wpx = fe.getlength(en) + (fe.getlength("  ") + fz.getlength(zh) if zh else 0) + 2 * 14
            if mode == "col":
                y += KW_SIZE + 2 * 14 + 16
            else:
                x += int(wpx) + 24
    return head + "\n".join(ev) + "\n"


def sprout_overlay(dst, secs=2.6):
    """Full-screen cutaway after S08 (an inset would cover the characters): corn sprout grows into corn (time-lapse)."""
    d = Path(tempfile.mkdtemp())
    R, cx, cy = 470, W // 2, H // 2 + 60
    n = int(secs * FPS)
    for i in range(n):
        u = min(1, i / (n * 0.85))
        im = Image.new("RGBA", (W, H), (250, 236, 205, 255)); g = ImageDraw.Draw(im)
        a = 255
        g.ellipse([cx - R - 8, cy - R - 8, cx + R + 8, cy + R + 8], fill=(255, 250, 235, a))
        g.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(205, 235, 250, a))
        g.pieslice([cx - R, cy - R, cx + R, cy + R], 0, 180, fill=(120, 80, 45, a))
        g.rectangle([cx - R + 30, cy, cx + R - 30, cy + 8], fill=(95, 60, 30, a))
        hgt = 40 + 360 * u
        g.line([(cx, cy), (cx, cy - hgt)], fill=(70, 150, 60, a), width=12)
        for j in range(int(1 + 5 * u)):
            y = cy - 60 - j * 85
            if y < cy - hgt:
                break
            s = 1 if j % 2 else -1
            L = 260 * min(1, u * 1.4)
            g.polygon([(cx, y), (cx + s * L * 0.5, y - 45), (cx + s * L, y - 60), (cx + s * L * 0.6, y - 18), (cx, y + 8)],
                      fill=(90, 175, 70, a), outline=(50, 120, 45, a))
        if u > 0.7:
            v = (u - 0.7) / 0.3
            g.ellipse([cx + 8, cy - hgt * 0.75 - 70 * v, cx + 8 + 44 * v, cy - hgt * 0.75 + 10], fill=(250, 210, 60, a))
            g.polygon([(cx + 4, cy - hgt * 0.75 + 20), (cx + 60 * v, cy - hgt * 0.75 - 90 * v), (cx + 40, cy - hgt * 0.75 + 20)], fill=(110, 185, 80, a))
        im.save(d / f"f{i:04d}.png")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(d / "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", str(dst)], check=True)


def norm_clip(src, dst, secs=None):
    vf = "scale=1920:-2,crop=1920:1080,fps=24,setsar=1"
    cmd = ["ffmpeg", "-y", "-loglevel", "error"] + (["-t", f"{secs}"] if secs else []) + ["-i", str(src), "-vf", vf, "-an",
           "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", str(dst)]
    subprocess.run(cmd, check=True)


def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                                capture_output=True, text=True).stdout)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--music"); ap.add_argument("--sfx"); a = ap.parse_args()
    parts, segs, voice_spans, t = [], [], [], 0.0
    norm_clip(FILM / "work" / "S03_map.mp4", OUT / "p00.mp4"); parts.append(OUT / "p00.mp4"); t += dur(OUT / "p00.mp4")
    for i, (sid, k) in enumerate([("S03", 1), ("S03", 2), ("S08", 1), ("S08", 2)], 1):
        p = OUT / f"p{i:02d}.mp4"
        norm_clip(FILM / "h3" / f"{sid}_{k}" / "clip.mp4", p)
        d = dur(p); segs.append((t, sid, k, d)); voice_spans.append((t, FILM / "h3" / f"{sid}_{k}" / "guide.wav")); parts.append(p); t += d
    sprout_overlay(OUT / "p05.mp4"); parts.append(OUT / "p05.mp4"); t += dur(OUT / "p05.mp4")
    total = t
    (OUT / "list.txt").write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(OUT / "list.txt"), "-c", "copy", str(OUT / "video.mp4")], check=True)
    (OUT / "subs.ass").write_text(ass_for(segs), encoding="utf-8")
    # audio: clean voice at its clip position (+ music/sfx when given)
    mix = np.zeros(int(total * SR) + SR, dtype=np.float32)
    for st, g in voice_spans:
        w, _ = sf.read(str(g), dtype="float32"); i0 = int(st * SR); mix[i0:i0 + len(w)] += w * 1.25
    # 說話時把配樂、環境音壓低（cumsum 移動平均，快）
    v = np.abs(mix); c = np.cumsum(np.insert(v, 0, 0)); k = SR // 4
    env = np.convolve(v, np.ones(1), "same"); env = (c[k:] - c[:-k]) / k; env = np.pad(env, (k // 2, len(mix) - len(env) - k // 2))
    duck = np.where(env > 0.008, 10 ** (-7 / 20), 1.0).astype(np.float32)
    duck = np.convolve(duck, np.ones(SR // 10) / (SR // 10), "same").astype(np.float32)

    def load(path):
        t = Path(tempfile.mkdtemp()) / "x.wav"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-ar", str(SR), "-ac", "1", str(t)], check=True)
        return sf.read(str(t), dtype="float32")[0]

    def place(w, at, length=None, db=-20, fade=0.3, off=0.0, ducked=True):
        w = w[int(off * SR):]
        n = int((length or len(w) / SR) * SR)
        w = np.resize(w, n) if n > len(w) else w[:n]          # loop beds that are too short
        f = min(int(fade * SR), n // 2)
        if f:
            w = w.copy(); w[:f] *= np.linspace(0, 1, f); w[-f:] *= np.linspace(1, 0, f)
        i0 = int(at * SR); w = w[: max(0, len(mix) - i0)] * 10 ** (db / 20)
        if ducked:
            w = w * duck[i0:i0 + len(w)]
        mix[i0:i0 + len(w)] += w

    S03a, S03b, S08a, S08b = segs[0][0], segs[1][0], segs[2][0], segs[3][0]
    s08_end = S08b + segs[3][3]
    if a.music:   # music/<cue>/pick.json from Music 3; very quiet (teacher pref)
        cues = [("voyage", 0.0, S08a + 0.75), ("spring", S08a - 0.75, total - S08a + 0.75)]
        for cue, at, ln in cues:
            p = json.loads((FILM / "music" / cue / "pick.json").read_text(encoding="utf-8"))
            f = FILM / "music" / cue / Path(p["file"]).relative_to(f"/content/tg/music/{cue}")
            m = load(f); m = m * (0.1 / (np.sqrt((m ** 2).mean()) + 1e-9))   # music RMS -> -20 dBFS, then very quiet
            place(m, at, ln, db=-14, fade=1.5)
    if a.sfx:     # sfx/raw/*.mp3 from Pixabay (sources.json)
        def R(k):  # level-match every effect: active part RMS -> -20 dBFS, so the db values below are comparable
            w = load(FILM / "sfx" / "raw" / f"{k}.mp3")
            act = w[np.abs(w) > 0.01]
            return w * (10 ** (-20 / 20) / (np.sqrt((act ** 2).mean()) + 1e-9)) if len(act) else w
        place(R("whoosh"), 0.4, db=-6, fade=0.02, ducked=False)          # map route starts
        place(R("pop"), 0.6, db=-4, fade=0.01, ducked=False)             # 1620 pops in
        place(R("waves"), 0.0, S08a, db=-8, fade=1.0)                    # ocean bed (map + ship)
        place(R("sails"), S03a, S08a - S03a, db=-12, fade=1.0)            # wind in the sails
        place(R("creak"), S03a, S08a - S03a, db=-14, fade=1.0, off=2.0)   # wooden ship creaking
        place(R("gulls"), S03a + 0.5, S08a - S03a - 0.5, db=-14, fade=1.0)
        place(R("birds"), S08a, total - S08a, db=-10, fade=1.0)           # spring field
        dig, water = R("dig"), R("water")
        for st in (S08a, S08b):
            place(dig, st + 0.2, 2.2, db=-12, fade=0.2, off=3.0)          # digging soil
            place(water, st + 3.5, 2.0, db=-12, fade=0.3, off=1.0)        # watering can
        place(R("chime"), s08_end + 0.1, 2.4, db=-4, fade=0.3, ducked=False)  # corn grows
    sf.write(str(OUT / "audio.wav"), np.clip(mix, -0.98, 0.98), SR)
    fontsdir = FONTS.as_posix().replace(":", "\\:")
    assf = (OUT / "subs.ass").as_posix().replace(":", "\\:")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(OUT / "video.mp4"), "-i", str(OUT / "audio.wav"),
                    "-filter_complex", f"[0]ass='{assf}':fontsdir='{fontsdir}'[o]",
                    "-map", "[o]", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                    "-shortest", str(OUT / "pilot.mp4")], check=True)
    print(OUT / "pilot.mp4", f"{total:.1f}s")
