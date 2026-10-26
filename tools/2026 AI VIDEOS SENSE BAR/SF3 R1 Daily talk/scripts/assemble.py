"""Assemble SF3 R1 Daily Talk: 20 shots (H3 + Seedance + local S01 overlay / S15 knock) + voices + karaoke subtitles
+ Music 3 bed + ending. Adapted from HWG 7 U04 FILM/scripts/assemble.py.
  python scripts/assemble.py      -> final/SF3R1_1080p_sub.mp4, _1080p_nosub.mp4, _720p_sub.mp4, _720p_phone.mp4, timeline.json
Rules:
- Every voice comes from voices_final/ (0.7x of the first batch, teacher 2026-10-26); Seedance's own audio is dropped.
- H3 lines start at 0.6 s (build_specs.py); Seedance S20 line at 0.3 s (its reference audio had a 0.3 s lead-in);
  narration starts 0.6 s into S01 (matches the day/weather overlay), S11, S12.
- RDQ suggestion 4: each spoken shot is held 0.5 s longer (last frame frozen) so students can repeat.
- S17 is cut to 3.4 s (Grandma walks away after her line). S15 = local knock shot + "Knock, knock!" card.
- Subtitles: Comic Relief 88/82 at 1080p, MarginV 130, karaoke (spoken word turns yellow), names in character colors.
- Loudness -15.5 LUFS, true peak -1.5 dB.
"""
import json, os, subprocess
from pathlib import Path
import numpy as np
import soundfile as sf

FILM = Path(__file__).resolve().parents[1]
CFG = json.loads((FILM / "shots.json").read_text(encoding="utf-8"))
SEL = json.loads((FILM / "seedance" / "selected.json").read_text(encoding="utf-8"))
WT = json.loads((FILM / "work" / "word_times.json").read_text(encoding="utf-8"))
WORK = FILM / "work" / "assemble"; WORK.mkdir(parents=True, exist_ok=True)
OUT = FILM / "final"; OUT.mkdir(exist_ok=True)
SR, FPS = 48000, 24
LINE_AT, VOICE_AT, NARR_AT = 0.6, {"S20": 0.3}, 0.6
TRIM = {"S17": 3.4}
HOLD = 0.5
NAME = {"ken": "Ken", "allen": "Allen", "grandma": "Grandma", "dad": "Dad"}
COLOR = {"ken": "&H003C8CFF", "allen": "&H00FFD27A", "grandma": "&H00B48CFF", "dad": "&H008CE6A0"}  # ASS &HAABBGGRR
MUSIC_BED, MUSIC_UNDER = 0.05, 0.35   # old (v1) levels: the reference for MUSIC_DB
MUSIC_DB = float(os.environ.get("MUSIC_DB", -10))  # teacher 2026-10-26 picked -10 dB vs v1 (samples -6/-8/-10)
VOICE_DB = 2.0
ENDING = FILM / "ending" / "ending.mp4"
KNOCK = FILM / "still" / "S15_knock.wav"
P = "SF3R1"


def run(*a):
    subprocess.run([str(x) for x in a], check=True)


def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                                capture_output=True, text=True).stdout)


def load(f):
    tmp = WORK / "_rs.wav"
    run("ffmpeg", "-y", "-loglevel", "error", "-i", f, "-ar", SR, "-ac", 1, tmp)
    return sf.read(str(tmp), dtype="float32")[0]


def src(s):
    i = s["id"]
    if i == "S01":
        return FILM / SEL["S01_final"]
    if s.get("gen") == "still":
        return FILM / "still" / f"{i}.mp4"
    if i in SEL:
        return FILM / SEL[i]
    return FILM / "h3" / i / "clip.mp4"


def ts(t):
    h, r = divmod(t, 3600); m, r = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{r:05.2f}"


# 1) normalized 1080p video per shot; spoken shots get a 0.5 s frozen tail
segs, t = [], 0.0
for k, s in enumerate(CFG["shots"]):
    f = src(s)
    d = round(min(dur(f), TRIM.get(s["id"], 99)) * FPS) / FPS
    hold = HOLD if (s.get("line") or s.get("narr")) else 0.0
    v = WORK / f"{k:02d}_{s['id']}.mp4"
    if not v.exists() or v.stat().st_mtime < f.stat().st_mtime:
        run("ffmpeg", "-y", "-loglevel", "error", "-t", f"{d:.3f}", "-i", f, "-an",
            "-vf", f"scale=1920:-2:flags=lanczos,crop=1920:1080,fps=24,setsar=1,tpad=stop_mode=clone:stop_duration={hold},format=yuv420p",
            "-c:v", "libx264", "-preset", "medium", "-crf", "17", v)
    d2 = round(dur(v) * FPS) / FPS
    segs.append(dict(id=s["id"], start=t, dur=d2, file=v, shot=s))
    t += d2
main_len = t
end_len = dur(ENDING)
total = main_len + end_len

# 2) speech track + subtitle events
speech = np.zeros(int(total * SR) + SR, np.float32)
sfx = np.zeros_like(speech)
mask = np.zeros_like(speech)
events, cards = [], []


def active_rms(w):
    v = w[np.abs(w) > 0.01]
    return float(np.sqrt((v ** 2).mean())) if len(v) else 1e-6


raw_lines = []   # (wave, at, text, style, key, who)
for g in segs:
    s = g["shot"]; i = s["id"]
    if s.get("narr"):
        raw_lines.append((load(FILM / "voices_final" / f"{i}_narr.wav"), g["start"] + NARR_AT, s["narr"], "Narr", f"{i}_narr", None))
    if s.get("line"):
        ln = s["line"]
        raw_lines.append((load(FILM / "voices_final" / f"{i}.wav"), g["start"] + VOICE_AT.get(i, LINE_AT), ln["text"], "Line", i, ln["who"]))
    if s.get("sfx"):
        w = load(KNOCK); a0 = int(g["start"] * SR); sfx[a0:a0 + len(w)] += w * 0.9
        cards.append((g["start"] + 0.45, g["start"] + g["dur"] + 0.2, s["sfx"]))

# RDQ 2026-10-26 (music remix): every line to the same loudness (the old average, so the old music level stays the
# reference), then voices +2 dB.
ref = float(np.mean([active_rms(w) for w, *_ in raw_lines]))
for w, at, text, style, key, who in raw_lines:
    w = w * (ref / active_rms(w)) * 10 ** (VOICE_DB / 20)
    a0 = int(at * SR); speech[a0:a0 + len(w)] += w[: len(speech) - a0]; mask[a0:a0 + len(w)] = 1
    events.append((at, at + len(w) / SR + 0.35, style, text, who, key))

# 3) music bed
pick = json.loads((FILM / "music" / "pick.json").read_text(encoding="utf-8"))
mfile = FILM / "music" / Path(pick["file"]).relative_to(Path(pick["file"]).parents[1])
mus = load(mfile)
eq = WORK / "_music_eq.wav"   # the same music with the speech band (1-4 kHz) pulled down
run("ffmpeg", "-y", "-loglevel", "error", "-i", mfile, "-ar", SR, "-ac", 1,
    "-af", "equalizer=f=2000:t=h:w=3000:g=-8", eq)
mus_eq = sf.read(str(eq), dtype="float32")[0]


def fit_len(x):
    if len(x) < len(speech):  # loop with a 3 s crossfade if the take is shorter than the film
        xf = 3 * SR
        while len(x) < len(speech):
            x = np.concatenate([x[:-xf], x[-xf:] * np.linspace(1, 0, xf) + x[:xf] * np.linspace(0, 1, xf), x[xf:]])
    return x[: len(speech)]


mus, mus_eq = fit_len(mus), fit_len(mus_eq)
norm = MUSIC_BED / (np.sqrt((mus[: int(main_len * SR)] ** 2).mean()) + 1e-9)
mus *= norm; mus_eq *= norm
k = int(0.25 * SR)
c = np.concatenate([[0.0], np.cumsum(mask, dtype=np.float64)])
lo = np.clip(np.arange(len(mask)) - k // 2, 0, len(mask)); hi = np.clip(np.arange(len(mask)) + k // 2, 0, len(mask))
duck = np.clip(((c[hi] - c[lo]) / k).astype(np.float32) * 1.5, 0, 1)


def music_mix(music_db):
    """Old mix: 1.0 in gaps, 0.35 under speech. New: under speech = 0.35 x music_db; gaps at most +3 dB above that
    (RDQ 2A: no big rise between lines); ending ramps back to the old normal level (1.0) over 2.5 s."""
    under = MUSIC_UNDER * 10 ** (music_db / 20)
    gap = min(1.0 * 10 ** (music_db / 20), under * 10 ** (3 / 20))
    gain = gap - (gap - under) * duck
    m0, ramp = int(main_len * SR), int(2.5 * SR)
    gain[m0:m0 + ramp] = np.linspace(gain[m0 - 1], 1.0, ramp)
    gain[m0 + ramp:] = 1.0
    fade = int(3.5 * SR); e = int(total * SR)
    gain[e - fade:e] *= np.linspace(1, 0, fade); gain[e:] = 0
    m = mus * gain * (1 - duck) + mus_eq * gain * duck      # speech band dip only while someone speaks
    return speech + sfx + m


def master(raw, dst, speaker=False):
    sf.write(str(WORK / "_raw.wav"), np.stack([raw, raw], 1), SR)
    af = "loudnorm=I=-16:TP=-2:LRA=11,alimiter=limit=0.79:level=false"
    if speaker:   # rough laptop / classroom speaker: no deep bass, no air
        af = "highpass=f=300,lowpass=f=6000," + af
    run("ffmpeg", "-y", "-loglevel", "error", "-i", WORK / "_raw.wav", "-af", af, "-ar", SR, *([] if str(dst).endswith(".wav") else ["-b:a", "192k"]), dst)


if os.environ.get("SAMPLE"):
    g2 = next(g for g in segs if g["id"] == "S02"); g7 = next(g for g in segs if g["id"] == "S07")
    a0, b0 = int(g2["start"] * SR), int((g7["start"] + g7["dur"]) * SR)
    sd = FILM / "work" / "music_samples"; sd.mkdir(exist_ok=True)
    for db in (-6, -8, -10):
        master(music_mix(db)[a0:b0], sd / f"S02-S07_music{db}dB.mp3")
    master(music_mix(-6)[a0:b0], sd / "S02-S07_music-6dB_small_speaker.mp3", speaker=True)
    print(f"samples -> {sd} ({(b0 - a0) / SR:.1f}s each)")
    raise SystemExit
if os.environ.get("REMIX", "1") == "1" or not (WORK / "mix.wav").exists():   # REMIX=0: keep audio, redo subtitles only
    master(music_mix(MUSIC_DB)[: int(total * SR)], WORK / "mix.wav")

# 4) karaoke subtitles (ASS)
head = ("[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 0\n\n[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        "Style: Line,Comic Relief,88,&H0000E6FF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,5,2,2,80,80,130,1\n"
        "Style: Narr,Comic Relief,82,&H0000E6FF,&H00F0F0FF,&H00402000,&H64000000,0,1,0,0,100,100,0,0,1,5,2,2,80,80,130,1\n"
        "Style: Card,Comic Relief,120,&H0066E6FF,&H00FFFFFF,&H00301000,&H64000000,0,0,0,0,100,100,2,0,1,7,3,5,80,80,0,1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
lines = [f"Dialogue: 1,{ts(a)},{ts(b)},Card,,0,0,0,,{{\\fad(150,250)}}{txt}" for a, b, txt in cards]
for at, b, style, text, who, key in sorted(events):
    words = WT[key]
    a = at + words[0]["s"] - 0.25
    parts = [f"{{\\k{round(0.25 * 100)}}}"]
    for kk, w in enumerate(words):
        nxt = words[kk + 1]["s"] if kk + 1 < len(words) else w["e"]
        parts.append(f"{{\\k{max(1, round((nxt - w['s']) * 100))}}}{w['w']} ")
    karaoke = "".join(parts).rstrip()
    b = max(b, at + words[-1]["e"] + 0.6)
    name = "" if not who else f"{{\\1c{COLOR[who]}\\2c{COLOR[who]}}}{NAME[who]}: {{\\1c&H0000E6FF&\\2c&H00FFFFFF&}}"
    lines.append(f"Dialogue: 0,{ts(a)},{ts(b)},{style},,0,0,0,,{name}{karaoke}")
ass = WORK / "subs.ass"
ass.write_text(head + "\n".join(lines) + "\n", encoding="utf-8-sig")

# 5) concat video (+ ending), mux audio, burn subtitles
lst = WORK / "list.txt"
lst.write_text("".join(f"file '{g['file'].name}'\n" for g in segs) + f"file '{ENDING.as_posix()}'\n", encoding="utf-8")
nosub = OUT / f"{P}_1080p_nosub.mp4"
run("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", WORK / "mix.wav",
    "-map", "0:v", "-map", "1:a", "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
    "-c:a", "aac", "-b:a", "192k", "-shortest", nosub)
assp = ass.as_posix().replace(":", "\\:")
fdir = (FILM / "fonts").as_posix().replace(":", "\\:")
run("ffmpeg", "-y", "-loglevel", "error", "-i", nosub, "-vf", f"ass='{assp}':fontsdir='{fdir}'",
    "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-c:a", "copy", OUT / f"{P}_1080p_sub.mp4")
run("ffmpeg", "-y", "-loglevel", "error", "-i", OUT / f"{P}_1080p_sub.mp4", "-vf", "scale=1280:720",
    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "128k", OUT / f"{P}_720p_sub.mp4")
run("ffmpeg", "-y", "-loglevel", "error", "-i", OUT / f"{P}_1080p_sub.mp4", "-vf", "scale=1280:720",
    "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-c:a", "aac", "-b:a", "96k", OUT / f"{P}_720p_phone.mp4")
(OUT / "timeline.json").write_text(json.dumps([dict(id=g["id"], start=round(g["start"], 3), dur=g["dur"], src=str(src(g["shot"]).relative_to(FILM)))
                                               for g in segs], indent=1), encoding="utf-8")
print(f"done: main {main_len:.1f}s + ending {end_len:.1f}s = {total:.1f}s; {len(events)} subtitle lines, {len(cards)} cards")
