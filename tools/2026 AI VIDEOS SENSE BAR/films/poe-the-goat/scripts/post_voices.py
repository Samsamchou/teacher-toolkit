"""Finish the slow (v2) voices so each line speaks at <speed> x the FIRST batch's pace (RDQ 2026-10-26).
  python scripts/post_voices.py samples            voices_final/_samples/<id>_<speed>.wav + _samples.mp3 (S02 S07 S17 x 0.7/0.65/0.6)
  python scripts/post_voices.py all [--speed 0.7]  voices/<id>.wav -> voices_final/<id>.wav (48 kHz mono) + _all_lines.mp3

Target length = first-batch raw length (voices_v1/picks.json) / speed. The new slow take is stretched with rubberband
(pitch kept) by tempo = new / target, clipped to voices.json "tempo_range" (0.8-1.0): never sped up, never over-stretched.
Character effects from voices.json "post": "pitch:+N/-N" semitones, "chest" (formants move with pitch).
"""
import argparse, json, subprocess
from pathlib import Path
import numpy as np, soundfile as sf

FILM = Path(__file__).resolve().parents[1]
V = json.loads((FILM / "voices.json").read_text(encoding="utf-8"))
SHOTS = json.loads((FILM / "shots.json").read_text(encoding="utf-8"))
PICKS = json.loads((FILM / "voices" / "picks.json").read_text(encoding="utf-8"))
V1 = json.loads((FILM / "voices_v1" / "picks.json").read_text(encoding="utf-8"))
OUT = FILM / "voices_final"; OUT.mkdir(exist_ok=True)
LO, HI = V.get("tempo_range", [0.8, 1.0])
if __import__("os").environ.get("NOCLIP"): LO = 0.5


def tempo_for(sid, speed):
    target = V1[sid]["secs"] / speed
    return min(HI, max(LO, PICKS[sid]["secs"] / target))


def finish(sid, speed, dst):
    who = PICKS[sid]["who"]
    effs = V.get("post", {}).get(who, [])
    semis = sum(float(e.split(":")[1]) for e in effs if e.startswith("pitch:"))
    formant = "shifted" if "chest" in effs else "preserved"
    t = tempo_for(sid, speed)
    rb = f"rubberband=tempo={t:.4f}:pitch={2 ** (semis / 12):.4f}:transients=smooth:formant={formant}"
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(FILM / "voices" / f"{sid}.wav"),
                    "-af", rb + ",alimiter=limit=0.89:level=false", "-ar", "48000", "-ac", "1", str(dst)], check=True)
    w, sr = sf.read(str(dst), dtype="float32")
    return w, sr, t


def join(items, gap, wav, mp3):
    pieces = []
    for w, sr in items:
        pieces += [w, np.zeros(int(gap * 48000), dtype="float32")]
    sf.write(str(wav), np.concatenate(pieces), 48000)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-b:a", "160k", str(mp3)], check=True)
    wav.unlink()
    print(mp3)


def order():
    for s in SHOTS["shots"]:
        if s.get("narr"):
            yield s["id"] + "_narr"
        if s.get("line"):
            yield s["id"]


ap = argparse.ArgumentParser()
ap.add_argument("cmd", choices=["samples", "all"])
ap.add_argument("--speed", type=float, default=V.get("speed_vs_v1", 0.7))
a = ap.parse_args()
gap = V.get("all_lines_gap", 1.5)

if a.cmd == "samples":
    items = []
    for sp in (0.7, 0.65, 0.6):
        for sid in ("S02", "S07", "S17"):
            w, sr, t = finish(sid, sp, OUT / "_samples" / f"{sid}_{sp}.wav")
            items.append((w, sr))
            print(f"{sp}  {sid:5} v1 {V1[sid]['secs']:.2f}s  slow {PICKS[sid]['secs']:.2f}s  tempo {t:.3f}  -> {len(w) / sr:.2f}s")
    join(items, gap, OUT / "_samples" / "_tmp.wav", OUT / "_samples" / "_samples_0.7_0.65_0.6.mp3")
else:
    items = []
    for sid in order():
        w, sr, t = finish(sid, a.speed, OUT / f"{sid}.wav")
        items.append((w, sr))
        print(f"{sid:9} {PICKS[sid]['who']:8} v1 {V1[sid]['secs']:.2f}s  slow {PICKS[sid]['secs']:.2f}s  tempo {t:.3f}  -> {len(w) / sr:.2f}s")
    join(items, gap, OUT / "_tmp.wav", OUT / "_all_lines.mp3")
