import subprocess, os, time
os.system("rm -rf /content/t1s; mkdir -p /content/t1s")
JOBS = [("s0", 45), ("s1", 88), ("s2", 30), ("s3", 30), ("s4", 45), ("s5", 0)]
for sh, f0 in JOBS:
    t = time.time(); fr = ",".join(str(f0 + i) for i in range(30))
    r = subprocess.run("/content/blender/blender -b --factory-startup --python /content/src/b3d_vienna.py -- /content/props /content/t1s/%s %s %s 64 100" % (sh, sh, fr), shell=True, capture_output=True, text=True)
    o = r.stdout + r.stderr; i = o.find("Traceback")
    subprocess.run("cd /content/t1s/%s && ffmpeg -y -loglevel error -framerate 30 -start_number %d -i %s_f%%04d.png -c:v libx264 -crf 14 -pix_fmt yuv420p /content/t1s/%s_1s.mp4" % (sh, f0, sh, sh), shell=True)
    print("==", sh, round(time.time() - t), "s", o.count("FRAME"), "frames", o[i:i + 600] if i >= 0 else "", flush=True)
os.system("cd /content/t1s && rm -f /content/o.zip && zip -q -0 /content/o.zip *.mp4")
