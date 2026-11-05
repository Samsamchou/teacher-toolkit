import subprocess
r = subprocess.run("/content/blender/blender -b --factory-startup --python /content/h_scene.py -- /content/props sheet /content/cytest 30,125,230 CYCLES 64 100", shell=True, capture_output=True, text=True)
print("\n".join(l for l in (r.stdout + r.stderr).splitlines() if "FRAME" in l or "Error" in l or "Traceback" in l)[-2000:])
