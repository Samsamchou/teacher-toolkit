"""開場段（S01–S02）、單字段（S13＋7 張單字卡＋S19/S20 H3 例句），再和由來段接成整片。
  python scripts/compose_sections.py opening vocab film
  -> work/full/opening.mp4、vocab.mp4、film.mp4、film_720p.mp4
片段之間 0.4 秒淡入淡出；字幕是 Comic Relief 卡拉 OK（單字卡上的單字本身就是大字，不另上字幕，只上例句）。
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np, soundfile as sf
sys.path.insert(0, str(Path(__file__).resolve().parent))
from compose_full import (FILM, OUT, FONTS, W, H, SR, LINE_AT, XF, WORDS, run, dur, norm, lead_offset, ts, loadw)

HEAD = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Comic Relief,82,&H0000D7FF,&H00FFFFFF,&H00301A08,&H64000000,0,0,0,0,100,100,0,0,1,6,2,2,80,80,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def karaoke(key, at, end):
    """One karaoke subtitle line for voices/<key>_1 whose trimmed voice starts at `at`."""
    off = lead_offset(key, 1); words = WORDS[key]["take1"]; full = WORDS[key]["text"]
    times = [at + w["t"] - off for w in words]
    a = times[0] - 0.25; parts, prev, pos = [], a, 0
    for w, t0 in zip(words, times):
        if t0 - prev > 0.02:
            parts.append(f"{{\\k{int((t0 - prev) * 100)}}}")
        i = full.find(w["w"].split()[0], pos)
        j = full.find(w["w"].split()[-1], i) + len(w["w"].split()[-1]) if i >= 0 else -1
        if i >= 0 and j > 0:
            while j < len(full) and full[j] in ",.!?":
                j += 1
            shown, pos = full[i:j], j
        else:
            shown = w["w"]
        parts.append(f"{{\\kf{max(1, int(w['d'] * 100))}}}{shown} "); prev = t0 + w["d"]
    text = "".join(parts).strip()
    if len(full) > 42:
        # break at the sentence end nearest the middle (". ", "! ", "? "), else in the middle of the words
        cands = [i + 2 for i in range(len(full) - 3) if full[i:i + 2] in (". ", "! ", "? ") and full[i - 2:i + 1] != "..."]
        k = min(cands, key=lambda i: abs(i - len(full) / 2)) if cands else 0
        key2 = full[k:].split()[0] if k else words[len(words) // 2]["w"].split()[0]
        cut = text.find(f"}}{key2}", len(text) // 4)
        text = text[:cut + 1] + "\\N" + text[cut + 1:] if cut > 0 else text
    return f"Dialogue: 0,{ts(a)},{ts(end)},Sub,,0,0,0,,{text}"


def section(name, segs, music, sfx):
    """segs: list of dict(clip, guide, subs=[(key, at_in_seg)], h3=bool). sfx: fn(starts, ds) -> [(key, at, len, db, fade, off, ducked)]."""
    files = []
    for i, s in enumerate(segs):
        dst = OUT / f"{name}_{i:02d}.mp4"; norm(s["clip"], dst); files.append(dst)
    ds = [dur(f) for f in files]; starts = [0.0]
    for d in ds[:-1]:
        starts.append(starts[-1] + d - XF)
    total = starts[-1] + ds[-1]
    fc, last = [], "[0:v]"
    for i in range(1, len(files)):
        fc.append(f"{last}[{i}:v]xfade=transition=fade:duration={XF}:offset={starts[i]:.3f}[x{i}]"); last = f"[x{i}]"
    ev = []
    for i, s in enumerate(segs):
        subs = sorted(s.get("subs", []), key=lambda x: x[1])
        for j, (key, at) in enumerate(subs):          # each line ends when the next one starts (no stacked subtitles)
            end = starts[i] + subs[j + 1][1] - 0.35 if j + 1 < len(subs) else starts[i] + ds[i] - XF
            ev.append(karaoke(key, starts[i] + at, end))
    (OUT / f"{name}.ass").write_text(HEAD + "\n".join(ev) + "\n", encoding="utf-8")
    fontsdir = FONTS.as_posix().replace(":", "\\:"); assf = (OUT / f"{name}.ass").as_posix().replace(":", "\\:")
    fc.append(f"{last}ass='{assf}':fontsdir='{fontsdir}'[o]")
    mix = np.zeros(int(total * SR) + SR, np.float32)
    for i, s in enumerate(segs):
        w, _ = sf.read(str(s["guide"]), dtype="float32"); i0 = int(starts[i] * SR); mix[i0:i0 + len(w)] += w * 1.25
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
    p = json.loads((FILM / "music" / music / "pick.json").read_text(encoding="utf-8"))
    place(loadw(FILM / "music" / music / Path(p["file"]).relative_to(f"/content/tg/music/{music}"), rms=0.1), 0, total, db=-14, fade=1.2)
    cache = {}
    for key, at, ln, db, fade, off, dk in sfx(starts, ds):
        w = cache.setdefault(key, loadw(FILM / "sfx" / "raw" / f"{key}.mp3", rms=0.1)); place(w, at, ln, db, fade, off, bool(dk))
    sf.write(str(OUT / f"{name}.wav"), np.clip(mix, -0.98, 0.98), SR)
    ins = sum([["-i", str(f)] for f in files], [])
    run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", *ins, "-i", str(OUT / f"{name}.wav"), "-filter_complex", ";".join(fc),
        "-map", "[o]", "-map", f"{len(files)}:a", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
        "-shortest", str(OUT / f"{name}.mp4"))
    print(name, f"{total:.1f}s", [round(s, 2) for s in starts], flush=True)


def h3(sid):
    d = FILM / "h3" / f"{sid}_1"; return dict(clip=d / "clip.mp4", guide=d / "guide.wav", subs=[(sid, LINE_AT)])


def opening():
    def sfx(st, ds):
        return [("rustle", st[0] + 0.2, None, -10, .1, 0, 0), ("birds", st[0], ds[0], -14, .8, 0, 1), ("pop", st[0] + 0.3, None, -8, .01, 0, 0),
                ("rustle", st[0] + 1.0, None, -14, .1, 0, 1), ("chime", st[1] + 3.0, 1.6, -12, .2, 0, 0)]
    section("opening", [h3("S01"), h3("S02")], "harvest", sfx)


def vocab():
    segs, kinds = [h3("S13")], ["S13"]
    for n in range(14, 21):
        d = FILM / "h3" / f"K{n}"; e = json.loads((d / "events.json").read_text(encoding="utf-8"))
        segs.append(dict(clip=d / "clip.mp4", guide=d / "guide.wav", subs=[(f"E{n}", e["e_at"])] if e["e_at"] else [], ev=e)); kinds.append(f"K{n}")
        if n in (19, 20):
            segs.append(h3(f"S{n}")); kinds.append(f"S{n}")
    WORD_SFX = {14: ("waves", -12), 15: ("steps", -12), 16: ("plates", -14), 17: ("plates", -16), 18: ("pop", -12), 19: ("chime", -12), 20: ("chime", -12)}

    def sfx(st, ds):
        c = [("page", st[0] + 0.6, None, -10, .02, 0, 0)]
        for i, (k, s) in enumerate(zip(kinds, segs)):
            if not k.startswith("K"):
                continue
            n = int(k[1:]); e = s["ev"]; key, db = WORD_SFX[n]
            c += [("whoosh", st[i] + 0.05, None, -10, .02, 0, 0), (key, st[i] + 0.1, 1.2, db, .2, 0, 1),
                  ("pop", st[i] + e["say"][0], None, -8, .01, 0, 0)]
        return c
    section("vocab", segs, "holiday", sfx)


def quiz():
    segs = []
    for n in (1, 2, 3):
        d = FILM / "h3" / f"Q{n}"; e = json.loads((d / "events.json").read_text(encoding="utf-8"))
        subs = ([("QI", e["intro_at"])] if e["intro_at"] else []) + [(f"Q{n}", e["q_at"]), (f"A{n}", e["a_at"])]
        segs.append(dict(clip=d / "clip.mp4", guide=d / "guide.wav", subs=subs, ev=e))

    def sfx(st, ds):
        c = []
        for i, s in enumerate(segs):
            e = s["ev"]; c0 = e["count"][0]
            c += [("pop", st[i] + c0 + k, None, -12, .01, 0, 0) for k in range(3)]
            if e["ans"]:
                c += [("chime", st[i] + e["reveal"], 1.6, -6, .2, 0, 0)]
            else:
                c += [("whoosh", st[i] + e["reveal"], None, -6, .02, 0, 0), ("chime", st[i] + e["reveal"] + 0.3, 1.4, -10, .2, 0, 0)]
        c += [("waves", st[0] + segs[0]["ev"]["q_at"], 3.0, -16, .5, 0, 1)]
        return c
    section("quiz", segs, "holiday", sfx)


def ending():
    def sfx(st, ds):
        return [("rustle", st[0] + 0.3, None, -12, .1, 0, 1), ("birds", st[0], ds[0], -14, .8, 0, 1), ("chime", st[0] + ds[0] - 2.5, 2.0, -10, .3, 0, 0)]
    section("ending", [h3("S21")], "harvest", sfx)


def film():
    names = ["opening", "origin", "quiz", "vocab", "ending"]
    parts = [OUT / f"{n}.mp4" for n in names]; ds = [dur(p) for p in parts]; X = 0.6
    offs = []; acc = 0.0
    for d in ds[:-1]:
        acc += d - X; offs.append(acc - (len(offs)) * 0)
    fv, fa, lv, la = [], [], "[0:v]", "[0:a]"
    t = 0.0
    for i in range(1, len(parts)):
        t = (t if i > 1 else 0) + ds[i - 1] - X
        fv.append(f"{lv}[{i}:v]xfade=transition=fade:duration={X}:offset={t:.3f}[v{i}]"); lv = f"[v{i}]"
        fa.append(f"{la}[{i}:a]acrossfade=d={X}[a{i}]"); la = f"[a{i}]"
        print(f"  {names[i]} starts at {t:.2f}s")
    fc = ";".join(fv + fa).replace(f"[v{len(parts) - 1}]", "[v]").replace(f"[a{len(parts) - 1}]", "[a]")
    run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", *sum([["-i", str(p)] for p in parts], []), "-filter_complex", fc,
        "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", str(OUT / "film.mp4"))
    run("ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(OUT / "film.mp4"), "-vf", "scale=1280:-2", "-c:v", "libx264", "-crf", "27",
        "-preset", "slow", "-af", "loudnorm=I=-16:TP=-1.5", "-c:a", "aac", "-b:a", "128k", str(OUT / "film_720p.mp4"))
    print("film", f"{sum(ds) - (len(ds) - 1) * X:.1f}s")


if __name__ == "__main__":
    for job in sys.argv[1:]:
        {"opening": opening, "vocab": vocab, "quiz": quiz, "ending": ending, "film": film}[job]()
