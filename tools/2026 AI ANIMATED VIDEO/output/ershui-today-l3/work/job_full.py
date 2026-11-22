import subprocess, os, time, glob, zipfile, shutil
def run(shot, samples, pct, out):
    t = time.time()
    r = subprocess.run("/content/blender/blender -b --factory-startup --python /content/src/b3d_cassia.py -- %s %s %d %d" % (out, shot, samples, pct), shell=True, capture_output=True, text=True)
    o = r.stdout + r.stderr; i = o.find("Traceback"); d = [l for l in o.splitlines() if l.startswith("DEVICE")]
    print("==", shot, round(time.time() - t), "s", o.count("FRAME"), "frames", d, o[i:i + 600] if i >= 0 else "", flush=True)
run("check", 32, 50, "/content/out/check")
with zipfile.ZipFile("/content/full/_check.zip", "w") as z:
    for f in glob.glob("/content/out/check/*"): z.write(f, os.path.basename(f))
os.rename("/content/full/_check.zip", "/content/full/check.zip")
for sh in ("A", "B"):
    out = "/content/out/" + sh; run(sh, 32, 100, out)
    with zipfile.ZipFile("/content/full/_%s.zip" % sh, "w", zipfile.ZIP_STORED) as z:
        for f in sorted(glob.glob(out + "/*")): z.write(f, os.path.basename(f))
    os.rename("/content/full/_%s.zip" % sh, "/content/full/%s.zip" % sh)
