"""試做片 v4（老師 2026-11-04 規格 RDQ-spec-explainer-embed）：每句 第一次念＝H3 全畫面 → 翻頁轉場 → 第二次念＝解說動畫全畫面
＋ Pippy 圓框小頭像（從第二次念的 H3 裁出，嘴形對得上）。標籤只放在解說畫面最上方一條、字幕在最下方、小頭像在預留角落。
  python scripts/compose_v4.py      -> work/v4/v4.mp4、v4_720p.mp4
"""
import json, subprocess, tempfile
from pathlib import Path
import numpy as np, soundfile as sf
from PIL import Image, ImageDraw, ImageFont

FILM = Path(__file__).resolve().parents[1]
OUT = FILM / "work" / "v4"; OUT.mkdir(parents=True, exist_ok=True)
FONTS = FILM / "work" / "fonts"
W, H, FPS, SR, LINE_AT, XF = 1920, 1080, 24, 48000, 0.5, 0.4
PAGE = 1.2            # page turn between the two reads (teacher 11/04: slower)
LEAD = PAGE - XF      # read 1 holds its last frame this long, and the explainer holds its first frame this long,
                      # so neither voice plays during the slow page turn
WORDS = json.loads((FILM / "voices" / "words.json").read_text(encoding="utf-8"))

# Pippy 在第二次念 H3（1344x768）中的臉：中心、裁切邊長；小頭像放在解說畫面的哪個角落
BUBBLE = {"S03": dict(cx=1100, cy=440, size=300, corner="br"), "S08": dict(cx=230, cy=400, size=440, corner="bl")}
EXPLAINER = {"S03": FILM / "work" / "X03_map.mp4", "S08": FILM / "h3" / "X08" / "clip.mp4"}
# 解說畫面最上方一條的標籤（念到 trigger 字時亮起）
LABELS = {"S03": [("1620", "1620", "", "num")],
          "S08": [("Wampanoag", "Wampanoag", "萬帕諾亞格族"), ("Tisquantum", "Tisquantum", "人名"), ("plant", "plant corn", "種玉米")]}
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


def bubble_mask(d=300, ring=10):
    m = Image.new("RGBA", (d + 2 * ring, d + 2 * ring), (0, 0, 0, 0)); g = ImageDraw.Draw(m)
    g.ellipse([0, 0, d + 2 * ring - 1, d + 2 * ring - 1], fill=(255, 250, 235, 255))
    g.ellipse([ring - 3, ring - 3, d + ring + 2, d + ring + 2], outline=(230, 140, 40, 255), width=6)
    m.save(OUT / "ring.png")
    a = Image.new("L", (d, d), 0); ImageDraw.Draw(a).ellipse([0, 0, d - 1, d - 1], fill=255); a.save(OUT / "mask.png")


def explainer(sid, k2clip, dst):
    """Explainer full screen + round Pippy bubble cut from the 2nd-read H3 clip."""
    b = BUBBLE[sid]; s = b["size"]; x0, y0 = b["cx"] - s // 2, b["cy"] - s // 2
    D, R = 300, 10
    bx = W - D - 2 * R - 60 if b["corner"] == "br" else 60
    by = H - D - 2 * R - 250          # above the subtitle band
    # ffmpeg 9.0.1: PNG with -loop 1 hangs forever, so no looped images. Circle cut by geq; ring is a still overlay.
    fc = (f"[1:v]fps=24,crop={s}:{s}:{x0}:{y0},scale={D}:{D},format=rgba,"
          f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-{D / 2},Y-{D / 2}),{D / 2 - 1}),255,0)'[face];"
          f"[0:v]scale=1920:-2,crop=1920:1080,fps=24,setsar=1,tpad=stop_mode=clone:stop_duration=10[bg];"
          f"[bg][2:v]overlay={bx}:{by}[b1];[b1][face]overlay={bx + R}:{by + R}:shortest=1,tpad=start_mode=clone:start_duration={LEAD}[v]")
    run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(EXPLAINER[sid]), "-i", str(k2clip),
        "-i", str(OUT / "ring.png"), "-filter_complex", fc, "-map", "[v]", "-t", f"{dur(k2clip) + LEAD:.3f}",
        "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", str(dst))


def lead_offset(sid, k):
    t = Path(tempfile.mkdtemp()) / "a.wav"
    run("ffmpeg", "-y", "-loglevel", "error", "-i", str(FILM / "voices" / f"{sid}_{k}.mp3"), "-ar", str(SR), "-ac", "1", str(t))
    w, _ = sf.read(str(t), dtype="float32"); idx = np.where(np.abs(w) > 0.01)[0]
    return max(0, idx[0] - 2400) / SR


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
    fe = ImageFont.truetype(str(FONTS / "ComicRelief-Regular.ttf"), KW); fz = ImageFont.truetype(str(FONTS / "msjhbd.ttc"), KW)
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
        if len(full) > 42:
            cut = text.find(f"{words[len(words) // 2]['w'].split()[0]}", len(text) // 3)
            text = text[:cut] + "\\N" + text[cut:] if cut > 0 else text
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
    run("ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-ar", str(SR), "-ac", "1", str(t))
    w = sf.read(str(t), dtype="float32")[0]
    if rms:
        act = w[np.abs(w) > 0.01]; w = w * (rms / (np.sqrt((act ** 2).mean()) + 1e-9)) if len(act) else w
    return w


if __name__ == "__main__":
    bubble_mask()
    plan = [("S03", 1, False), ("S03", 2, True), ("S08", 1, False), ("S08", 2, True)]
    files = []
    for sid, k, ex in plan:
        clip = FILM / "h3" / f"{sid}_{k}" / "clip.mp4"; dst = OUT / f"{sid}_{k}{'_x' if ex else ''}.mp4"
        explainer(sid, clip, dst) if ex else norm(clip, dst, hold=PAGE - XF)
        files.append(dst)
    ds = [dur(f) for f in files]
    # transitions: page slide between the two reads of a sentence, soft fade between sentences
    trans = [("slideleft", PAGE), ("fade", XF), ("slideleft", PAGE)]
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

    R = lambda key: loadw(FILM / "sfx" / "raw" / f"{key}.mp3", rms=0.1)
    s03a, s03b, s08a, s08b = starts
    for cue, at, ln in (("voyage", 0.0, s08a + XF), ("spring", s08a - 0.4, total - s08a + 0.4)):
        p = json.loads((FILM / "music" / cue / "pick.json").read_text(encoding="utf-8"))
        place(loadw(FILM / "music" / cue / Path(p["file"]).relative_to(f"/content/tg/music/{cue}"), rms=0.1), at, ln, db=-14, fade=1.2)
    # S03 read 1: ship at sea
    place(R("waves"), s03a, ds[0], db=-8, fade=0.8); place(R("sails"), s03a, ds[0], db=-12, fade=0.8)
    place(R("creak"), s03a, ds[0], db=-14, fade=0.8, off=2.0); place(R("gulls"), s03a + 0.5, ds[0] - 0.5, db=-14, fade=0.8)
    # page turns between the two reads
    for st in (s03b, s08b):
        place(R("page"), st - 0.05, db=-6, fade=0.02, ducked=False)
    s03b, s08b = cs[1], cs[3]          # explainer sound cues follow the explainer content, after the held first frame
    # S03 read 2: map follows the words
    E = json.loads((FILM / "work" / "X03_events.json").read_text(encoding="utf-8"))
    place(R("waves"), s03b, ds[1], db=-16, fade=0.8)
    place(R("whoosh"), s03b + E["England"][0], db=-6, fade=0.02, ducked=False)          # ship sets off
    place(R("chime"), s03b + E["America"][0] + E["America"][1], 1.6, db=-6, fade=0.2, ducked=False)  # ship arrives
    # S08 read 1 + read 2: spring field
    place(R("birds"), s08a, total - s08a, db=-10, fade=1.0)
    dig, water = R("dig"), R("water")
    place(dig, s08a + 0.2, 2.2, db=-12, fade=0.2, off=3.0); place(water, s08a + 3.5, 2.0, db=-12, fade=0.3, off=1.0)
    # X08 clip timing (checked frame by frame): hole 0.2-0.9, seeds drop ~1.0, cover 2.0-3.4, water 3.9-5.0, sprout 5.6-7.8
    place(dig, s08b + 0.2, 0.9, db=-10, fade=0.15, off=3.0)       # finger makes the hole
    place(R("pop"), s08b + 1.0, db=-10, fade=0.01, ducked=False)  # seeds drop in
    place(dig, s08b + 2.0, 1.4, db=-10, fade=0.2, off=8.0)        # covering with soil
    place(water, s08b + 3.9, 1.2, db=-10, fade=0.3, off=1.0)      # watering
    place(R("chime"), s08b + 5.6, 2.4, db=-6, fade=0.3, ducked=False)  # sprout grows into corn
    sf.write(str(OUT / "audio.wav"), np.clip(mix, -0.98, 0.98), SR)

    run("ffmpeg", "-y", "-loglevel", "error", *ins, "-i", str(OUT / "audio.wav"), "-filter_complex", ";".join(fc),
        "-map", "[o]", "-map", f"{len(files)}:a", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
        "-shortest", str(OUT / "v4.mp4"))
    run("ffmpeg", "-y", "-loglevel", "error", "-i", str(OUT / "v4.mp4"), "-vf", "scale=1280:-2", "-c:v", "libx264", "-crf", "26",
        "-preset", "slow", "-af", "loudnorm=I=-16:TP=-1.5", "-c:a", "aac", "-b:a", "160k", str(OUT / "v4_720p.mp4"))
    print(OUT / "v4.mp4", f"{total:.1f}s", [round(s, 2) for s in starts])
