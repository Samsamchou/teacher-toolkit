import subprocess
def sh(c):
    r = subprocess.run(c, shell=True, capture_output=True, text=True)
    print("\n".join(l for l in (r.stdout + r.stderr).splitlines() if "RENDER_SECONDS" in l or "CYCLES_DEVICES" in l or "Error" in l or "EGL" in l)[-3000:])
B = "/content/blender/blender -b --factory-startup --python /content/speedtest.py -- /content/nova.glb"
sh(f"{B} /content/t_eevee32.png BLENDER_EEVEE 32")
sh(f"{B} /content/t_cycles64.png CYCLES 64")
