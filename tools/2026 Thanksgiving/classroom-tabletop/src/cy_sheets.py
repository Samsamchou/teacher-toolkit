# Colab: one Cycles still per second for each shot (32 samples, 50%), run one after another
import subprocess
B = "/content/blender/blender -b --factory-startup --python /content/src/scenes.py -- /content/props /content/fonts"
JOBS = [("O", "r1", 17.6), ("S04", "r1", 8.2), ("S04", "r2", 9.2), ("S05", "r1", 4.8), ("S05", "r2", 5.4), ("S06", "r1", 5.4), ("S06", "r2", 6.0)]
for sid, shot, dur in JOBS:
    fr = ",".join(str(round(t * 24)) for t in range(int(dur) + 1))
    r = subprocess.run(f"{B} {sid} {shot} sheet /content/sheets/{sid}{shot} {fr} CYCLES 32 50", shell=True, capture_output=True, text=True)
    lines = [l for l in (r.stdout + r.stderr).splitlines() if l.startswith("FRAME") or "Error" in l or "Traceback" in l]
    print(sid, shot, len([l for l in lines if l.startswith("FRAME")]), "frames", "\n".join(l for l in lines if not l.startswith("FRAME"))[-800:], flush=True)
subprocess.run("cd /content && zip -q -r sheets.zip sheets", shell=True)
