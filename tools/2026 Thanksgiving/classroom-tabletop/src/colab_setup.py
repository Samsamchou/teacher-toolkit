import subprocess, os
def sh(c): print(subprocess.run(c, shell=True, capture_output=True, text=True).stdout[-1500:])
sh("nvidia-smi --query-gpu=name,memory.total --format=csv")
sh("apt-get -qq update >/dev/null && apt-get -qq install -y libegl1 libgl1 libxi6 libxkbcommon0 libsm6 libxrender1 libxfixes3 libxxf86vm1 >/dev/null; echo apt-done")
if not os.path.exists("/content/blender/blender"):
    sh("cd /content && curl -sSL --retry 5 -O https://download.blender.org/release/Blender5.2/blender-5.2.2-linux-x64.tar.xz && tar -xf blender-5.2.2-linux-x64.tar.xz && mv blender-5.2.2-linux-x64 blender && echo blender-ok")
sh("/content/blender/blender -b --factory-startup --version | head -2")
