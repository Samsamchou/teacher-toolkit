import subprocess, os
for d in ('/content/src', '/content/out', '/content/full'): os.makedirs(d, exist_ok=True)
cmd = ("(apt-get -qq install -y libegl1 libxi6 libxkbcommon0 libsm6 libxrender1 libxfixes3 libxxf86vm1 >/dev/null 2>&1; "
       "cd /content && curl -sSL --retry 5 -o b.tar.xz https://download.blender.org/release/Blender5.2/blender-5.2.2-linux-x64.tar.xz && tar -xf b.tar.xz && mv blender-5.2.2-linux-x64 blender && rm b.tar.xz; echo done > /content/setup.done) > /content/setup.log 2>&1")
subprocess.Popen(cmd, shell=True, start_new_session=True)
print("STARTED")
