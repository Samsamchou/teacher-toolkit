"""Run ON THE COLAB VM (full install): background music with MiniMax Music 3, same steps as the repo template's music stage.
  python3 vm_music.py /content/sf3 <seconds> [seed ...]
Instrumental-only lyrics (section tags only) -> one take per seed -> BS-RoFormer split -> keep the Instrumental stem of the take
with the least vocal residue. Writes <root>/music/s<seed>/..., <root>/music/pick.json, prints MUSIC_DONE.
"""
import json, os, subprocess, sys
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(sys.argv[1]); SECS = int(sys.argv[2]); SEEDS = [int(s) for s in sys.argv[3:]] or [7, 23, 51]
MD = ROOT / "music"; MD.mkdir(parents=True, exist_ok=True)
T = Path("/content/repo/tools"); SEP = "/content/AI/Voice/venv/bin/audio-separator"
CAP = ("Genre: bright, cheerful slice-of-life underscore for a children's anime about a sunny Sunday in the park and an art studio, "
       "purely instrumental, warm, happy and relaxed, gentle and not too busy so slow English dialogue stays clear. BPM 96, key G major.\n"
       "Vocal: NONE. No singing, no humming, no choir.\n"
       "Arrangement: ukulele, light acoustic guitar, glockenspiel, soft whistle-like flute, pizzicato strings, warm piano, soft bass, light shaker and brushed percussion.")
(MD / "cap.txt").write_text(CAP, encoding="utf-8")
# repo: <14 tags too short; Verse tags add voice. 2026-10-24: 18 tags gave only 65-100 s, so scale with length (~5 s per tag)
(MD / "lyr.txt").write_text("[Intro]\n" + "[Instrumental]\n" * max(18, SECS // 5) + "[Outro]\n[Instrumental]\n", encoding="utf-8")
env = dict(os.environ, COMFY_DIR="/content/AI/H3/ComfyUI-0.36.0")
best = None
for sd in SEEDS:
    d = MD / f"s{sd}"; d.mkdir(exist_ok=True)
    if not list(d.glob("*.flac")):
        subprocess.run(["python", str(T / "gen_music3.py"), "--caption-file", str(MD / "cap.txt"), "--lyrics-file", str(MD / "lyr.txt"),
                        "--seconds", str(SECS), "--seed", str(sd), "--prefix", f"audio/MM3/sf3_{sd}", "--out", str(d)], check=True, env=env)
    src = next(d.glob("*.flac"))
    if not list(d.glob("*Instrumental*.wav")):
        subprocess.run([SEP, str(src), "--model_filename", "model_bs_roformer_ep_317_sdr_12.9755.ckpt",
                        "--model_file_dir", "/content/AI/Voice/models/separator", "--output_dir", str(d), "--output_format", "WAV"], check=True)
    voc, sr = sf.read(str(next(d.glob("*Vocals*.wav"))), dtype="float32")
    ins, _ = sf.read(str(next(d.glob("*Instrumental*.wav"))), dtype="float32")
    ratio = float(np.sqrt((voc ** 2).mean()) / (np.sqrt((ins ** 2).mean()) + 1e-9))
    secs = len(ins) / sr
    print(f"[music] s{sd} vocal_ratio={ratio:.4f} secs={secs:.1f}", flush=True)
    if secs >= SECS - 6 and (best is None or ratio < best[0]):
        best = (ratio, str(next(d.glob("*Instrumental*.wav"))), sd)
if best is None:
    sys.exit("FAILED: no take long enough")
(MD / "pick.json").write_text(json.dumps(dict(file=best[1], seed=best[2], vocal_ratio=best[0])), encoding="utf-8")
print("MUSIC_DONE", flush=True)
