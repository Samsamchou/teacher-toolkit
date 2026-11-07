# Colab setup: Blender 5.2.2 + folders. Skips steps that are already done. ASCII only (colab exec reads with cp950 on Windows).
import subprocess, os, time
t0 = time.time()
def sh(c): r = subprocess.run(c, shell=True, capture_output=True, text=True); return (r.stdout + r.stderr)[-400:]
for d in ("/content/props", "/content/fonts", "/content/src"): os.makedirs(d, exist_ok=True)
if not os.path.exists("/content/blender/blender"):
    sh("apt-get -qq install -y libegl1 libxi6 libxkbcommon0 libsm6 libxrender1 libxfixes3 libxxf86vm1 >/dev/null 2>&1")
    sh("cd /content && curl -sSL --retry 5 -o b.tar.xz https://download.blender.org/release/Blender5.2/blender-5.2.2-linux-x64.tar.xz && tar -xf b.tar.xz && mv blender-5.2.2-linux-x64 blender && rm b.tar.xz")
print("blender", os.path.exists("/content/blender/blender"), "setup %.0fs" % (time.time() - t0))
