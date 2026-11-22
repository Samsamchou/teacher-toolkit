import subprocess, os, time, glob, zipfile
t = time.time()
r = subprocess.run("/content/blender/blender -b --factory-startup --python /content/src/b3d_cassia.py -- /content/out/check check 32 50", shell=True, capture_output=True, text=True)
o = r.stdout + r.stderr; i = o.find("Traceback")
with zipfile.ZipFile("/content/full/_check.zip", "w") as z:
    for f in glob.glob("/content/out/check/*"): z.write(f, os.path.basename(f))
os.rename("/content/full/_check.zip", "/content/full/check.zip")
print("== check", round(time.time() - t), "s", o.count("FRAME"), "frames", o[i:i + 800] if i >= 0 else o[-300:], flush=True)
