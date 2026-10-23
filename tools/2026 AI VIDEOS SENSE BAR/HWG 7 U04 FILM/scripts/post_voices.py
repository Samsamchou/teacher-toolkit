"""Finish the chosen voices: slow every line to voices.json "tempo" (0.8x, pitch kept), add character effects.
  python scripts/post_voices.py      voices/<id>.wav -> voices_final/<id>.wav (48 kHz mono) + voices_final/_all_lines.mp3
Effects (voices.json "post"): robot = light flanger + short echo (cute robot); deeper = pitch down 2 semitones.
"""
import json, subprocess
from pathlib import Path
import numpy as np, soundfile as sf

FILM = Path(__file__).resolve().parents[1]
V = json.loads((FILM / "voices.json").read_text(encoding="utf-8"))
SHOTS = json.loads((FILM / "shots.json").read_text(encoding="utf-8"))
PICKS = json.loads((FILM / "voices" / "picks.json").read_text(encoding="utf-8"))
OUT = FILM / "voices_final"; OUT.mkdir(exist_ok=True)
TEMPO = V.get("tempo", 0.8)
FX = {
    "robot": "flanger=delay=1:depth=1:regen=8:width=40:speed=4,aecho=0.85:0.5:9:0.22",
}


def finish(sid, who):
    """voices.json post[who] = list of: "pitch:+N"/"pitch:-N" semitones, "chest" (formants move with pitch = bigger body), "robot"."""
    effs = V.get("post", {}).get(who, [])
    semis = sum(float(e.split(":")[1]) for e in effs if e.startswith("pitch:"))
    formant = "shifted" if "chest" in effs else "preserved"
    rb = f"rubberband=tempo={TEMPO}:pitch={2 ** (semis / 12):.4f}:transients=smooth:formant={formant}"
    chain = [rb] + [FX[e] for e in effs if FX.get(e)] + ["alimiter=limit=0.89:level=false"]
    dst = OUT / f"{sid}.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(FILM / "voices" / f"{sid}.wav"),
                    "-af", ",".join(chain), "-ar", "48000", "-ac", "1", str(dst)], check=True)
    return dst


order = []
for s in SHOTS["shots"]:
    if s.get("narr"):
        order.append(s["id"] + "_narr")
    if s.get("line"):
        order.append(s["id"])
pieces = []
for sid in order:
    f = finish(sid, PICKS[sid]["who"])
    w, sr = sf.read(str(f), dtype="float32")
    pieces += [w, np.zeros(int(0.8 * sr), dtype="float32")]
    print(f"{sid:9} {PICKS[sid]['who']:8} {PICKS[sid]['secs']:.2f}s -> {len(w) / sr:.2f}s")
sf.write(str(OUT / "_all_lines.wav"), np.concatenate(pieces), 48000)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(OUT / "_all_lines.wav"), "-b:a", "160k", str(OUT / "_all_lines.mp3")], check=True)
print("voices_final/_all_lines.mp3")
