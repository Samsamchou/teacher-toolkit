import subprocess
B = "/content/blender/blender -b --factory-startup --python /content/src/s03_scene.py -- /content/props /content/fonts"
for shot, frames in (("r1", "60,180"), ("r2", "120")):
    r = subprocess.run(f"{B} {shot} sheet /content/cytest_{shot} {frames} CYCLES 64 100", shell=True, capture_output=True, text=True)
    print(shot, "\n".join(l for l in (r.stdout + r.stderr).splitlines() if "FRAME" in l or "Error" in l or "Traceback" in l)[-1500:])
subprocess.run("cd /content && zip -q -r cytest.zip cytest_r1 cytest_r2", shell=True)
