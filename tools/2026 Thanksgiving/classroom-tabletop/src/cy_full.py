import subprocess
B = "/content/blender/blender -b --factory-startup --python /content/src/s03_scene.py -- /content/props /content/fonts"
for shot, end in (("r1", 206), ("r2", 232)):
    r = subprocess.run(f"{B} {shot} range /content/full_{shot} 0 {end} 2 CYCLES 64 100", shell=True, capture_output=True, text=True)
    lines = [l for l in (r.stdout + r.stderr).splitlines() if "FRAME" in l or "Error" in l or "Traceback" in l]
    print(shot, len([l for l in lines if l.startswith("FRAME")]), "frames", "\n".join(lines[-3:]))
subprocess.run("cd /content && zip -q -r full.zip full_r1 full_r2", shell=True)
print(subprocess.run("ls -la /content/full.zip", shell=True, capture_output=True, text=True).stdout)
