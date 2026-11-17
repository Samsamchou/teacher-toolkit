import subprocess, os, time
os.system("rm -rf /content/tout; mkdir -p /content/tout")
for sh in ("s0", "s1", "s2", "s3", "s4", "s5"):
    t = time.time()
    try:
        r = subprocess.run("/content/blender/blender -b --factory-startup --python /content/src/b3d_vienna.py -- /content/props /content/tout %s 0,45,89 32 50" % sh, shell=True, capture_output=True, text=True, timeout=400)
        o = r.stdout + r.stderr
    except subprocess.TimeoutExpired as e:
        o = "TIMEOUT"
    i = o.find("Traceback")
    print("==", sh, round(time.time() - t), "s", o.count("FRAME"), "frames", o[i:i + 900] if i >= 0 else ("TIMEOUT" if o == "TIMEOUT" else ""), flush=True)
os.system("cd /content && rm -f o.zip && zip -q -r o.zip tout")
print(sorted(os.listdir("/content/tout")))
