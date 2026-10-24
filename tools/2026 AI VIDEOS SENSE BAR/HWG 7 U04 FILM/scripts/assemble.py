"""Assemble the HWG7 U04 film: 24 shots (Seedance + H3) + narration + English subtitles + Music 3 bed + ending.
  python scripts/assemble.py            -> final/HWG7U04_1080p_sub.mp4, final/HWG7U04_1080p_nosub.mp4, final/HWG7U04_720p_sub.mp4
Audio rules (teacher, 2026-10-24): H3 shots and S03 use the approved voices (voices_final/); S09 keeps Seedance's own voice
(vocals separated from its music, seedance/S09/vocals.wav); other Seedance audio is dropped (our music bed instead);
narration is mixed in post. Loudness target -15.5 LUFS, true peak -1.5 dB (repo docs: alimiter level=false).
"""
import json, subprocess
from pathlib import Path
import numpy as np
import soundfile as sf

FILM = Path(__file__).resolve().parents[1]
CFG = json.loads((FILM / "shots.json").read_text(encoding="utf-8"))
SEL = json.loads((FILM / "seedance" / "selected.json").read_text(encoding="utf-8"))
WORK = FILM / "work" / "assemble"; WORK.mkdir(parents=True, exist_ok=True)
OUT = FILM / "final"; OUT.mkdir(exist_ok=True)
SR, FPS = 48000, 24
LINE_AT = 0.6                       # H3 guide tracks put the line at 0.6 s (build_specs.py)
VOICE_AT = {"S03": 0.3}             # Seedance S03: approved voice where Seedance's own voice started
NARR_AT = {"S01": 0.6, "S11": 0.2, "S14a": 0.3, "S16": 0.4}
S09_VOICE = (FILM / "seedance" / "S09" / "vocals.wav", 3.2, "I make a snowman!")   # Seedance voice, heard 3.28-5.28 s
NAME = {"teddy": "Teddy", "amber": "Amber", "abu": "Abu", "joy": "Joy", "alan": "Alan", "santa": "Santa"}
COLOR = {"teddy": "&H003C8CFF", "amber": "&H00B48CFF", "abu": "&H00FFD27A", "joy": "&H008CE6A0", "alan": "&H0078B4FF",
         "santa": "&H006E6EFF"}      # ASS &HAABBGGRR
MUSIC_BED, MUSIC_UNDER = 0.05, 0.35  # bed RMS, and gain under speech
ENDING = FILM / "ending" / "ending.mp4"


def run(*a):
    subprocess.run([str(x) for x in a], check=True)


def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                                capture_output=True, text=True).stdout)


def load(f):
    w, sr = sf.read(str(f), dtype="float32", always_2d=True)
    w = w.mean(axis=1)
    if sr != SR:
        tmp = WORK / "_rs.wav"
        run("ffmpeg", "-y", "-loglevel", "error", "-i", f, "-ar", SR, "-ac", 1, tmp)
        w = sf.read(str(tmp), dtype="float32")[0]
    return w


def src(s):
    i = s["id"]
    return FILM / "seedance" / i / f"{SEL[i]}.mp4" if i in SEL else FILM / "h3" / i / "clip.mp4"


def ts(t):
    h, r = divmod(t, 3600); m, r = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{r:05.2f}"


# 1) normalized 1080p video per shot (lanczos; H3 1344x768 is cropped to 16:9, Seedance 1280x720 scaled)
segs, t = [], 0.0
for k, s in enumerate(CFG["shots"]):
    f = src(s); d = round(dur(f) * FPS) / FPS
    v = WORK / f"{k:02d}_{s['id']}.mp4"
    if not v.exists():
        run("ffmpeg", "-y", "-loglevel", "error", "-i", f, "-an", "-t", f"{d:.3f}",
            "-vf", "scale=1920:-2:flags=lanczos,crop=1920:1080,fps=24,setsar=1,format=yuv420p",
            "-c:v", "libx264", "-preset", "medium", "-crf", "17", v)
    segs.append(dict(id=s["id"], start=t, dur=d, file=v, shot=s))
    t += d
main_len = t
end_len = dur(ENDING) if ENDING.exists() else 0.0
total = main_len + end_len

# 2) speech track + subtitle events
speech = np.zeros(int(total * SR) + SR, np.float32)
mask = np.zeros_like(speech)
events = []


WT = json.loads((FILM / "work" / "word_times.json").read_text(encoding="utf-8"))   # scripts/word_times.py (karaoke timing)


def place(w, at, text, style, key, name=None):
    a = int(at * SR); speech[a:a + len(w)] += w[: len(speech) - a]; mask[a:a + len(w)] = 1
    events.append((at, at + len(w) / SR + 0.35, style, text, name, key))


for g in segs:
    s = g["shot"]; i = s["id"]
    if s.get("narr"):
        place(load(FILM / "voices_final" / f"{i}_narr.wav"), g["start"] + NARR_AT[i], s["narr"], "Narr", f"{i}_narr")
    ln = s.get("line")
    if not ln:
        continue
    if i == "S09":
        w = load(S09_VOICE[0]); a = int(S09_VOICE[1] * SR)
        seg = w[a:]
        place(seg, g["start"] + S09_VOICE[1], ln["text"], "Line", i, ln["who"])
        continue
    place(load(FILM / "voices_final" / f"{i}.wav"), g["start"] + VOICE_AT.get(i, LINE_AT), ln["text"], "Line", i, ln["who"])

# 3) music bed: Music 3 instrumental, ducked under speech, faded out with the ending
pick = json.loads((FILM / "music" / "pick.json").read_text(encoding="utf-8"))
mfile = FILM / pick["file"]   # music/bed.wav: s23 + s51 Music 3 instrumentals, 3 s crossfade (single takes max ~100-127 s)
mus = load(mfile)
mus = np.pad(mus, (0, max(0, len(speech) - len(mus))))[: len(speech)]
mus *= MUSIC_BED / (np.sqrt((mus[: int(main_len * SR)] ** 2).mean()) + 1e-9)
k = int(0.25 * SR)                                  # smooth the duck so the music breathes in and out
c = np.concatenate([[0.0], np.cumsum(mask, dtype=np.float64)])   # moving average via cumsum (np.convolve was O(N*k), far too slow)
lo = np.clip(np.arange(len(mask)) - k // 2, 0, len(mask)); hi = np.clip(np.arange(len(mask)) + k // 2, 0, len(mask))
duck = ((c[hi] - c[lo]) / k).astype(np.float32)
gain = 1.0 - (1.0 - MUSIC_UNDER) * np.clip(duck * 1.5, 0, 1)
fade = int(3.5 * SR); e = int(total * SR)
gain[e - fade:e] *= np.linspace(1, 0, fade); gain[e:] = 0
mix = speech + mus * gain
import os
if os.environ.get("REMIX", "1") == "1" or not (WORK / "mix.wav").exists():   # REMIX=0: keep audio, redo subtitles only
  sf.write(str(WORK / "mix_raw.wav"), np.stack([mix, mix], 1)[: int(total * SR)], SR)
  run("ffmpeg", "-y", "-loglevel", "error", "-i", WORK / "mix_raw.wav",
      "-af", "loudnorm=I=-15.5:TP=-1.5:LRA=11,alimiter=limit=0.84:level=false", "-ar", SR, WORK / "mix.wav")

# 4) subtitles (ASS): names in color, narration in italics, "The next day..." card on S16
s16 = next(g for g in segs if g["id"] == "S16")
head = ("[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 0\n\n[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        # teacher 2026-10-24: Comic Relief, LARGE for back-row students (88/82 at 1080p), raised (MarginV 130), karaoke: spoken word turns yellow (Primary), not yet = white (Secondary)
        "Style: Line,Comic Relief,88,&H0000E6FF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,5,2,2,80,80,130,1\n"
        "Style: Narr,Comic Relief,82,&H0000E6FF,&H00F0F0FF,&H00402000,&H64000000,0,1,0,0,100,100,0,0,1,5,2,2,80,80,130,1\n"
        "Style: Card,Comic Relief,110,&H0066E6FF,&H00FFFFFF,&H00301000,&H64000000,0,0,0,0,100,100,2,0,1,7,3,5,80,80,0,1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
lines = [f"Dialogue: 1,{ts(s16['start'] + 0.1)},{ts(s16['start'] + 2.6)},Card,,0,0,0,,{{\\fad(300,400)}}The next day..."]
for at, b, style, text, who, key in sorted(events):
    words = WT[key]
    a = at + words[0]["s"] - 0.25                      # show the line a moment before the first word
    parts = [f"{{\\k{round(0.25 * 100)}}}"]            # lead-in, nothing highlighted yet
    for k, w in enumerate(words):
        nxt = words[k + 1]["s"] if k + 1 < len(words) else w["e"]
        parts.append(f"{{\\k{max(1, round((nxt - w['s']) * 100))}}}{w['w']} ")
    karaoke = "".join(parts).rstrip()
    b = max(b, at + words[-1]["e"] + 0.6)
    name = "" if not who else f"{{\\1c{COLOR[who]}\\2c{COLOR[who]}}}{NAME[who]}: {{\\1c&H0000E6FF&\\2c&H00FFFFFF&}}"
    lines.append(f"Dialogue: 0,{ts(a)},{ts(b)},{style},,0,0,0,,{name}{karaoke}")
ass = WORK / "subs.ass"
ass.write_text(head + "\n".join(lines) + "\n", encoding="utf-8-sig")

# 5) concat video (+ ending), mux audio, burn subtitles
lst = WORK / "list.txt"
lst.write_text("".join(f"file '{g['file'].name}'\n" for g in segs)
               + (f"file '{ENDING.as_posix()}'\n" if ENDING.exists() else ""), encoding="utf-8")
nosub = OUT / "HWG7U04_1080p_nosub.mp4"
if not nosub.exists() or nosub.stat().st_mtime < (WORK / "mix.wav").stat().st_mtime - 5:   # reuse when only subtitles changed
    run("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", WORK / "mix.wav",
        "-map", "0:v", "-map", "1:a", "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
        "-c:a", "aac", "-b:a", "192k", "-shortest", nosub)
assp = ass.as_posix().replace(":", "\\:")
fdir = (FILM / "fonts").as_posix().replace(":", "\\:")
run("ffmpeg", "-y", "-loglevel", "error", "-i", OUT / "HWG7U04_1080p_nosub.mp4", "-vf", f"ass='{assp}':fontsdir='{fdir}'",
    "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-c:a", "copy", OUT / "HWG7U04_1080p_sub.mp4")
run("ffmpeg", "-y", "-loglevel", "error", "-i", OUT / "HWG7U04_1080p_sub.mp4", "-vf", "scale=1280:720",
    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "128k", OUT / "HWG7U04_720p_sub.mp4")
(OUT / "timeline.json").write_text(json.dumps([dict(id=g["id"], start=round(g["start"], 3), dur=g["dur"], src=str(src(g["shot"]).relative_to(FILM)))
                                               for g in segs], indent=1), encoding="utf-8")
print(f"done: main {main_len:.1f}s + ending {end_len:.1f}s = {total:.1f}s; {len(events)} subtitle lines")
