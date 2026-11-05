import subprocess
r = subprocess.run("/content/blender/blender -b --factory-startup --python /content/h_scene.py -- /content/props range /content/cyfull 0 239 CYCLES 64 100", shell=True, capture_output=True, text=True)
lines = [l for l in (r.stdout + r.stderr).splitlines() if "FRAME" in l or "Error" in l or "Traceback" in l]
print(len([l for l in lines if l.startswith("FRAME")]), "frames"); print("\n".join(lines[-5:]))
subprocess.run("cd /content && zip -q -r cyfull.zip cyfull && ls -la cyfull.zip", shell=True)
print(subprocess.run("ls -la /content/cyfull.zip", shell=True, capture_output=True, text=True).stdout)
