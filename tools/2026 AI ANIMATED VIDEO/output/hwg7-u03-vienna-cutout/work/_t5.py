import subprocess, os, time
os.makedirs("/content/full", exist_ok=True)
for sh in ("s1", "s0", "s2", "s3", "s4", "s5"):
    if os.path.exists("/content/full/%s.mp4" % sh): continue
    t = time.time()
    r = subprocess.run("/content/blender/blender -b --factory-startup --python /content/src/b3d_vienna.py -- /content/props /content/out/%s %s all 64 100" % (sh, sh), shell=True, capture_output=True, text=True)
    o = r.stdout + r.stderr; i = o.find("Traceback")
    subprocess.run("cd /content/out/%s && ffmpeg -y -loglevel error -framerate 30 -start_number 0 -i %s_f%%04d.png -c:v libx264 -crf 10 -pix_fmt yuv420p /content/full/_%s.mp4 && mv /content/full/_%s.mp4 /content/full/%s.mp4" % (sh, sh, sh, sh, sh), shell=True)
    print("==", sh, round(time.time() - t), "s", o.count("FRAME"), "frames", o[i:i + 500] if i >= 0 else "", flush=True)
