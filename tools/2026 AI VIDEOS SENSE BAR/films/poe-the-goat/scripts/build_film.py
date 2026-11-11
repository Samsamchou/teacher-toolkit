"""Poe the Goat: phonics teaching layer + assembly (voice C = narC, music s51).

  python scripts/build_film.py voices      # voices_final/: S0x_n (0.8x), S0x_s (0.65x), W_<word> (0.8x), 48 kHz mono
  python scripts/build_film.py times       # work/word_times.json (faster-whisper word times; words come from the script)
  python scripts/build_film.py render      # final/Poe-the-Goat-English.mp4 + -Listening.mp4 (+ 720p), work/timeline.json
  python scripts/build_film.py render S03  # only re-render the segments of one sentence (others reused)

Order: title -> per sentence (1st listen normal, 2nd listen slow with target letters colouring as they are spoken,
Your turn 5/7 countdown) -> sort o_e / oa / ow -> 3 quiz questions -> The End.
Colours: o_e red, oa blue, ow green. English text is Comic Relief only.
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np, soundfile as sf

FILM = Path(__file__).resolve().parents[1]
CFG = json.loads((FILM / "shots.json").read_text(encoding="utf-8"))
SHOTS = CFG["shots"]
VOICE = "narC"
CLIPS = {"S01": "seedance/S01/first_1.mp4", "S02": "seedance/S02/first_1.mp4", "S03": "seedance/S03/first_2.mp4",
         "S04": "seedance/S04/first_1.mp4", "S05": "seedance/S05/first_1.mp4"}
MUSIC = next((FILM / "music" / "s51").glob("*Instrumental*.wav"))
VF, WORK, FINAL = FILM / "voices_final", FILM / "work", FILM / "final"
SR, FPS = 48000, 30
SLOW = 0.65                      # 2nd listen tempo (1st listen 0.8)
COUNT = {"S01": 5, "S02": 5, "S03": 5, "S04": 7, "S05": 7}
MUSIC_DB = -24.0                 # music bed vs voice level (very quiet, teacher preference)
DUCK_DB = -6.0                   # extra cut while someone speaks

# ASS colours are &HBBGGRR
RED, BLUE, GREEN = "&H005A5AFF&", "&H00FFAA3C&", "&H0050DC50&"
WHITE, GRAY, YELLOW = "&H00FFFFFF&", "&H00909090&", "&H0000E6FF&"
TARGET = {"goat": ("oa", 1), "boat": ("oa", 1), "coat": ("oa", 1),
          "rose": ("o_e", 1), "note": ("o_e", 1), "robe": ("o_e", 1), "home": ("o_e", 1),
          "rows": ("ow", 1), "blows": ("ow", 2), "snow": ("ow", 2), "bowt": ("ow", 1), "snoa": ("oa", 2), "roab": ("oa", 1)}
COL = {"o_e": RED, "oa": BLUE, "ow": GREEN}


def run(*a, cwd=FILM):
    r = subprocess.run([str(x) for x in a], cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        sys.exit(f"FAILED: {' '.join(map(str, a))}\n{r.stderr[-2000:]}")
    return r.stdout


def dur(f):
    return float(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", f))


def frames(t):
    return round(t * FPS) / FPS


# ---------- text helpers ----------
def color_word(tok, on=True):
    """tok may carry punctuation; colour the target letters of the core word."""
    m = re.match(r"^([A-Za-z]+)(.*)$", tok)
    if not m or not on:
        return tok
    core, tail = m.groups()
    t = TARGET.get(core.lower())
    if not t:
        return tok
    kind, i = t
    c = COL[kind]
    if kind == "o_e":       # o . e  (letter, consonant, final e)
        return (core[:i] + f"{{\\c{c}}}{core[i]}{{\\c{WHITE}}}" + core[i + 1:-1]
                + f"{{\\c{c}}}{core[-1]}{{\\c{WHITE}}}" + tail)
    return core[:i] + f"{{\\c{c}}}{core[i:i + 2]}{{\\c{WHITE}}}" + core[i + 2:] + tail


def is_target(tok):
    return re.sub(r"[^a-z]", "", tok.lower()) in TARGET


def ts(t):
    t = max(0.0, t)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


HEAD = ("[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        "Style: Kara,Comic Relief,88,&H0000E6FF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,5,2,2,90,90,110,1\n"
        "Style: Sent,Comic Relief,88,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,5,2,2,90,90,110,1\n"
        "Style: Card,Comic Relief,92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,6,2,5,120,120,0,1\n"
        "Style: Label,Comic Relief,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,4,2,7,60,60,50,1\n"
        "Style: Big,Comic Relief,170,&H0000E6FF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,8,3,2,60,60,110,1\n"
        "Style: Word,Comic Relief,84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,5,2,5,0,0,0,1\n"
        "Style: Title,Comic Relief,150,&H0000E6FF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,9,3,5,0,0,0,1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")


def dlg(a, b, style, text, layer=0):
    return f"Dialogue: {layer},{ts(a)},{ts(b)},{style},,0,0,0,,{text}\n"


# ---------- audio helpers ----------
def load(f):
    w, sr = sf.read(str(f), dtype="float32", always_2d=True)
    assert sr == SR, f
    return w.mean(axis=1)


def tone(freqs, secs, amp, decay):
    t = np.arange(int(secs * SR)) / SR
    w = sum(np.sin(2 * np.pi * f * t) for f in freqs) / len(freqs)
    env = np.exp(-t * decay) * np.minimum(1, t / 0.005)
    return (amp * w * env).astype("float32")


BEEP = tone([880], 0.14, 0.10, 18)
DING = tone([1320, 1760, 2640], 0.8, 0.14, 5)


# ---------- stage 1: voices ----------
def stage_voices():
    VF.mkdir(exist_ok=True)
    items = []
    for s in SHOTS:
        src = FILM / "voices" / f"{s['id']}_narr_{VOICE}.wav"
        items += [(src, VF / f"{s['id']}_n.wav", 0.8), (src, VF / f"{s['id']}_s.wav", SLOW)]
    for w in CFG_WORDS:
        items.append((FILM / "voices" / f"W_{w}_{VOICE}.wav", VF / f"W_{w}.wav", 0.8))
    for src, dst, t in items:
        run("ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af",
            f"rubberband=tempo={t}:transients=smooth,alimiter=limit=0.89:level=false", "-ar", SR, "-ac", 1, dst)
    # same active loudness for every file
    ref = None
    for _, dst, _ in items:
        w = load(dst)
        a = np.abs(w); act = np.sqrt(np.mean(w[a > 0.02] ** 2)) if (a > 0.02).any() else 0.05
        ref = ref or act
        sf.write(str(dst), np.clip(w * ref / act, -0.95, 0.95), SR)
    print(f"{len(items)} files -> voices_final/")


CFG_WORDS = ["rose", "note", "robe", "home", "goat", "boat", "coat", "rows", "blows", "snow"]


# ---------- stage 2: word times ----------
def stage_times():
    import difflib
    from faster_whisper import WhisperModel
    m = WhisperModel("small.en", device="cpu", compute_type="int8")
    norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
    out = {}
    for s in SHOTS:
        for k in ("n", "s"):
            f = VF / f"{s['id']}_{k}.wav"
            a = load(f)
            raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(f), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                                 capture_output=True).stdout
            pcm16 = np.frombuffer(raw, np.int16).astype(np.float32) / 32768   # (this faster-whisper's own decoder breaks on new PyAV)
            segs, _ = m.transcribe(pcm16, language="en", word_timestamps=True, initial_prompt=s["narr"])
            heard = [dict(w=w.word.strip(), s=w.start, e=w.end) for sg in segs for w in (sg.words or [])]
            sw = s["narr"].split()
            res = [None] * len(sw)
            sm = difflib.SequenceMatcher(None, [norm(w) for w in sw], [norm(h["w"]) for h in heard], autojunk=False)
            for i0, j0, n in sm.get_matching_blocks():
                for q in range(n):
                    res[i0 + q] = (heard[j0 + q]["s"], heard[j0 + q]["e"])
            env = np.where(np.abs(a) > 0.02)[0]
            s0, e0 = (env[0] / SR, env[-1] / SR) if len(env) else (0, len(a) / SR)
            for i in range(len(sw)):
                if res[i] is None:
                    prev = next((res[j][1] for j in range(i - 1, -1, -1) if res[j]), s0)
                    nxt = next((res[j][0] for j in range(i + 1, len(sw)) if res[j]), e0)
                    res[i] = (prev, max(prev + 0.1, nxt))
            out[f"{s['id']}_{k}"] = [dict(w=w, s=round(r[0], 3), e=round(r[1], 3)) for w, r in zip(sw, res)]
            print(f"{s['id']}_{k}", " ".join(f"{x['w']}@{x['s']:.2f}" for x in out[f"{s['id']}_{k}"]), flush=True)
    WORK.mkdir(exist_ok=True)
    (WORK / "word_times.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")


# ---------- stage 3: segments ----------
def segments():
    """Each segment: dict(id, dur, video=(kind, ...), audio=[(t, wav)], ass_sub=str, ass_lis=str)."""
    WT = json.loads((WORK / "word_times.json").read_text(encoding="utf-8"))
    segs = []

    # title
    d = 6.0
    legend = (f"{{\\c{RED}}}o_e{{\\c{WHITE}}}  r{{\\c{RED}}}o{{\\c{WHITE}}}s{{\\c{RED}}}e{{\\c{WHITE}}}      "
              f"{{\\c{BLUE}}}oa{{\\c{WHITE}}}  b{{\\c{BLUE}}}oa{{\\c{WHITE}}}t      "
              f"{{\\c{GREEN}}}ow{{\\c{WHITE}}}  sn{{\\c{GREEN}}}ow{{\\c{WHITE}}}")
    a = (dlg(0.3, d, "Title", "{\\pos(960,380)\\fad(400,300)}Poe the Goat")
         + dlg(1.2, d, "Card", "{\\pos(960,600)\\fs70\\fad(400,300)}Long o sounds")
         + dlg(2.0, d, "Card", "{\\pos(960,760)\\fs96\\fad(400,300)}" + legend))
    segs.append(dict(id="title", dur=d, video=("still", "frames/S01.png", 0.45), audio=[], ass_sub=a, ass_lis=a))

    for s in SHOTS:
        sid, text = s["id"], s["narr"]
        clip = CLIPS[sid]; cd = dur(FILM / clip)
        # 1st listen
        vn = load(VF / f"{sid}_n.wav"); off = 0.5
        d = frames(max(min(cd, off + len(vn) / SR + 2.5), off + len(vn) / SR + 1.5))
        wt = WT[f"{sid}_n"]
        k = "{\\k20}"   # the line appears 0.2 s before the first word
        for i, w in enumerate(wt):
            nxt = wt[i + 1]["s"] if i + 1 < len(wt) else w["e"]
            k += f"{{\\k{max(1, int(round((nxt - w['s']) * 100)))}}}{w['w']} "
        lab = dlg(0.2, d, "Label", "Listen.")
        segs.append(dict(id=f"{sid}_1", dur=d, video=("clip", clip, 1.0), audio=[(off, vn)],
                         ass_sub=lab + dlg(off + wt[0]["s"] - 0.2, d, "Kara", k.strip()), ass_lis=lab))
        # 2nd listen, slow, target letters colour when spoken
        vs = load(VF / f"{sid}_s.wav"); off = 0.6
        d = frames(max(off + len(vs) / SR + 1.8, 4.0))
        wt = WT[f"{sid}_s"]
        times = sorted({0.0} | {off + w["s"] for w in wt if is_target(w["w"])})
        ev = ""
        for j, t0 in enumerate(times):
            t1 = times[j + 1] if j + 1 < len(times) else d
            line = " ".join(color_word(w["w"], on=(off + w["s"] <= t0 + 1e-6)) for w in wt)
            ev += dlg(t0 + (0.3 if j == 0 else 0), t1, "Sent", line)
        lab = dlg(0.2, d, "Label", "Listen again. Look at the letters!")
        segs.append(dict(id=f"{sid}_2", dur=d, video=("clip", clip, 0.7), audio=[(off, vs)], ass_sub=lab + ev, ass_lis=lab))
        # your turn
        n = COUNT[sid]; d = frames(n + 1.2)
        card = dlg(0.0, d, "Card", "{\\an8\\pos(960,250)\\fs82}" + " ".join(color_word(w) for w in text.split()))
        cnt = "".join(dlg(0.8 + q, 0.8 + q + 1.0, "Big", f"{{\\fad(80,120)}}{n - q}") for q in range(n))
        lab = dlg(0.0, d, "Label", "{\\an8\\pos(960,70)\\fs90\\c" + YELLOW + "}Your turn!")
        segs.append(dict(id=f"{sid}_3", dur=d, video=("still", f"work/last_{sid}.png", 0.55),
                         audio=[(0.8 + q, BEEP) for q in range(n)], ass_sub=lab + card + cnt, ass_lis=lab + cnt))

    # sort
    order = ["rose", "goat", "rows", "note", "boat", "blows", "robe", "coat", "snow", "home"]
    colx = {"o_e": 480, "oa": 960, "ow": 1440}
    d = frames(2.5 + 1.8 * len(order) + 2.5)
    a = dlg(0.2, d, "Label", "{\\an8\\pos(960,60)\\fs90\\c" + YELLOW + "}Sort the words.")
    for kind, x in colx.items():
        a += dlg(0.6, d, "Word", f"{{\\pos({x},250)\\fs120\\c{COL[kind]}}}{kind}")
    rows = {k: 0 for k in colx}; au = []
    for i, w in enumerate(order):
        kind = TARGET[w][0]; t0 = 2.5 + 1.8 * i; y = 410 + 120 * rows[kind]; rows[kind] += 1
        a += dlg(t0, d, "Word", f"{{\\pos({colx[kind]},{y})\\fad(250,0)}}" + color_word(w))
        au.append((t0, load(VF / f"W_{w}.wav")))
    segs.append(dict(id="sort", dur=d, video=("still", "masters/lake_sunny.png", 0.5), audio=au, ass_sub=a, ass_lis=a))

    # quiz
    d = 2.5
    a = dlg(0.2, d, "Title", "{\\pos(960,500)\\fad(300,300)}Quiz time!")
    segs.append(dict(id="quiz0", dur=d, video=("still", "masters/lake_snow.png", 0.5), audio=[(0.3, DING)], ass_sub=a, ass_lis=a))
    # distractor = a word that LOOKS close but has a different vowel spelling (short o / other long-o pattern),
    # never a same-sound spelling like bowt for boat (teacher 11/11)
    qs = [("boat", ["boat", "bot"], 0), ("snow", ["snoke", "snow"], 1), ("robe", ["rob", "robe"], 1)]
    for qi, (w, opts, right) in enumerate(qs, 1):
        d = 10.0; vw = load(VF / f"W_{w}.wav"); xs = [620, 1300]
        a = dlg(0.2, d, "Label", "{\\an8\\pos(960,60)\\fs80}" + f"Question {qi}: Listen and choose.")
        for j, o in enumerate(opts):
            lab = "AB"[j]
            a += dlg(0.3, 7.5, "Word", f"{{\\pos({xs[j]},500)\\fs140}}{lab}  {o}")
            if j == right:
                a += dlg(7.5, d, "Word", f"{{\\pos({xs[j]},500)\\fs160\\3c&H0000B400&\\bord10}}{lab}  " + color_word(o))
                a += dlg(7.5, d, "Word", f"{{\\pos({xs[j]},680)\\fs90\\c{YELLOW}}}Yes!")
            else:
                a += dlg(7.5, d, "Word", f"{{\\pos({xs[j]},500)\\fs140\\c{GRAY}\\alpha&H60&}}{lab}  {o}")
        a += "".join(dlg(4.5 + q, 5.5 + q, "Big", f"{{\\fad(80,120)}}{3 - q}") for q in range(3))
        au = [(0.6, vw), (2.4, vw)] + [(4.5 + q, BEEP) for q in range(3)] + [(7.5, DING), (7.9, vw)]
        segs.append(dict(id=f"quiz{qi}", dur=d, video=("still", "masters/lake_snow.png", 0.5), audio=au, ass_sub=a, ass_lis=a))

    # whole story once, no pauses (teacher 11/11): 5 clips back to back, 0.8x voice, karaoke in the subtitle version
    for n, s in enumerate(SHOTS):
        sid = s["id"]; clip = CLIPS[sid]; cd = dur(FILM / clip)
        vn = load(VF / f"{sid}_n.wav"); off = 0.3; L = len(vn) / SR
        d = frames(max(off + L + 0.6, min(cd, off + L + 1.2)))
        wt = WT[f"{sid}_n"]
        k = "{\\k20}"
        for i, w in enumerate(wt):
            nxt = wt[i + 1]["s"] if i + 1 < len(wt) else w["e"]
            k += f"{{\\k{max(1, int(round((nxt - w['s']) * 100)))}}}{w['w']} "
        lab = dlg(0.0, d, "Label", "The whole story") if n == 0 else ""
        segs.append(dict(id=f"story_{sid}", dur=d, video=("clip", clip, 1.0), audio=[(off, vn)],
                         ass_sub=lab + dlg(off + wt[0]["s"] - 0.2, d, "Kara", k.strip()), ass_lis=lab))

    # end
    d = 4.5
    a = dlg(0.3, d, "Title", "{\\pos(960,480)\\fad(500,500)}The End")
    segs.append(dict(id="end", dur=d, video=("still", "work/last_S05.png", 0.4), audio=[], ass_sub=a, ass_lis=a))
    for s in segs:
        s["dur"] = frames(s["dur"])
    return segs


def render_seg(s, ver):
    ass = WORK / "ass" / f"{s['id']}_{ver}.ass"
    ass.parent.mkdir(parents=True, exist_ok=True)
    ass.write_text(HEAD + s["ass_sub" if ver == "sub" else "ass_lis"], encoding="utf-8")
    out = WORK / "segs" / ver / f"{s['id']}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    sub = f"subtitles={ass.relative_to(FILM).as_posix()}:fontsdir=fonts"
    D = s["dur"]
    if s["video"][0] == "clip":
        _, clip, speed = s["video"]
        vf = (f"setpts=PTS/{speed},fps={FPS},scale=1920:1080:flags=lanczos,tpad=stop_mode=clone:stop_duration=20,"
              f"trim=duration={D},setpts=PTS-STARTPTS,{sub}")
        run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", clip, "-vf", vf, "-an",
            "-c:v", "libx264", "-crf", 18, "-preset", "medium", "-pix_fmt", "yuv420p", "-r", FPS, out.relative_to(FILM).as_posix())
    else:
        _, png, dim = s["video"]
        fc = (f"[1:v]scale=1920:1080:flags=lanczos,boxblur=10:2,eq=brightness=-{dim * 0.45:.2f}:saturation=0.85[b];"
              f"[0:v][b]overlay=eof_action=repeat,{sub}[v]")
        run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c=black:s=1920x1080:r={FPS}:d={D}",
            "-i", png, "-filter_complex", fc, "-map", "[v]", "-t", D,
            "-c:v", "libx264", "-crf", 18, "-preset", "medium", "-pix_fmt", "yuv420p", "-r", FPS, out.relative_to(FILM).as_posix())
    return out


def mix(segs):
    total = sum(s["dur"] for s in segs)
    v = np.zeros(int(total * SR) + SR, dtype="float32"); t = 0.0; tl = []
    for s in segs:
        for at, w in s["audio"]:
            i = int((t + at) * SR); v[i:i + len(w)] += w
        tl.append(dict(id=s["id"], start=round(t, 3), dur=s["dur"])); t += s["dur"]
    v = v[: int(total * SR)]
    m48 = WORK / "music48.wav"
    if not m48.exists():
        run("ffmpeg", "-y", "-loglevel", "error", "-i", MUSIC, "-ar", SR, "-ac", 1, m48)
    m = load(m48)
    xf = int(3 * SR); seg = m.copy()
    while len(seg) < len(v):
        r = np.linspace(0, 1, xf, dtype="float32")
        seg = np.concatenate([seg[:-xf], seg[-xf:] * (1 - r) + m[:xf] * r, m[xf:]])
    m = seg[: len(v)]
    act = np.abs(v) > 0.01
    vref = np.sqrt(np.mean(v[act] ** 2)) if act.any() else 0.1
    m = m * (vref / (np.sqrt(np.mean(m ** 2)) + 1e-9)) * 10 ** (MUSIC_DB / 20)
    # duck while voice: moving average of activity (cumsum, 0.4 s)
    k = int(0.4 * SR); c = np.cumsum(np.concatenate([[0], act.astype("float32")]))
    a = np.clip((c[k:] - c[:-k]) / k * 4, 0, 1)
    a = np.concatenate([a, np.full(len(v) - len(a), a[-1])])
    m = m * (1 - a * (1 - 10 ** (DUCK_DB / 20)))
    m[-int(3 * SR):] *= np.linspace(1, 0, int(3 * SR))
    sf.write(str(WORK / "mix_raw.wav"), np.clip(v + m, -0.99, 0.99), SR)
    (WORK / "timeline.json").write_text(json.dumps(tl, indent=1), encoding="utf-8")
    return total


def stage_render(only):
    (FILM / "fonts").mkdir(exist_ok=True)
    for f in ("ComicRelief-Bold.ttf", "ComicRelief-Regular.ttf"):
        dst = FILM / "fonts" / f
        if not dst.exists():
            dst.write_bytes((Path.home() / "AppData/Local/Microsoft/Windows/Fonts" / f).read_bytes())
    for sid, clip in CLIPS.items():
        run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-sseof", "-0.2", "-i", clip, "-frames:v", 1,
            "-vf", "scale=1920:1080:flags=lanczos", f"work/last_{sid}.png")
    segs = segments()
    total = mix(segs)
    run("ffmpeg", "-y", "-loglevel", "error", "-i", "work/mix_raw.wav", "-af", "loudnorm=I=-16:TP=-2:LRA=11", "-ar", SR, "work/mix.wav")
    FINAL.mkdir(exist_ok=True)
    for ver, name in (("sub", "English"), ("lis", "Listening")):
        for s in segs:
            p = WORK / "segs" / ver / f"{s['id']}.mp4"
            if not only or s["id"].startswith(tuple(only)) or not p.exists():
                render_seg(s, ver); print(f"[{ver}] {s['id']} {s['dur']:.2f}s", flush=True)
        lst = WORK / f"concat_{ver}.txt"
        lst.write_text("".join(f"file 'segs/{ver}/{s['id']}.mp4'\n" for s in segs), encoding="utf-8")
        out = f"final/Poe-the-Goat-{name}.mp4"
        run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-f", "concat", "-safe", 0, "-i", lst.relative_to(FILM).as_posix(),
            "-i", "work/mix.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out)
        run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", out, "-vf", "scale=1280:720", "-c:v", "libx264", "-crf", 23,
            "-c:a", "copy", out.replace(".mp4", "-720p.mp4"))
        print(out, f"{dur(FILM / out):.1f}s (timeline {total:.1f}s)", flush=True)


if __name__ == "__main__":
    cmd = sys.argv[1]
    {"voices": stage_voices, "times": stage_times, "render": lambda: stage_render(sys.argv[2:])}[cmd]()
