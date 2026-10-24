import json, subprocess
import numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
sel = json.load(open("seedance/selected.json"))
out = {}
for sid, t in sel.items():
    f = f"seedance/{sid}/{t}.mp4"
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", f, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    a = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
    segs, _ = m.transcribe(a, language="en", vad_filter=True)
    segs = [dict(start=round(s.start, 2), end=round(s.end, 2), text=s.text.strip()) for s in segs]
    out[sid] = segs
    print(sid, segs, flush=True)
json.dump(out, open("seedance/asr.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
