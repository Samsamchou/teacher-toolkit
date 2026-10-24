import subprocess, sys, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
for f in sys.argv[1:]:
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", f, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    segs, _ = m.transcribe(np.frombuffer(pcm, np.int16).astype(np.float32) / 32768, language="en", vad_filter=True)
    print(f, [(round(s.start, 2), round(s.end, 2), s.text.strip()) for s in segs], flush=True)
