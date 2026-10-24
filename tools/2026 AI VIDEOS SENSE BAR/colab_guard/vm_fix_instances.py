"""Run ON THE COLAB VM (python3): make sure 2 ComfyUI instances run, without the setup_h3.py copy race.
Upstream bug (repo 8b4c50a): cloud/vm/setup_h3.py starts instance 0 and then copies its folder for instance 1, so copytree
hits __pycache__ temp files that the running instance is writing -> shutil.Error, no FAILED marker, start polls forever.
Here: stop ComfyUI, copy with ALL __pycache__ skipped, start both, merge into /content/h3_state.json, append SETUP_DONE.
"""
import json, shutil, subprocess, time, urllib.request
from pathlib import Path

C = Path("/content/AI/H3/ComfyUI-0.36.0")
D = Path("/content/ComfyUI_1")
STATE = Path("/content/h3_state.json")
subprocess.run("pkill -f 'main.py --listen'", shell=True)
time.sleep(3)
shutil.rmtree(D, ignore_errors=True)
TOP = {"models", "input", "output", "user", "temp"}
shutil.copytree(C, D, symlinks=True,
                ignore=lambda p, names: [n for n in names if n == "__pycache__" or (Path(p) == C and n in TOP)])
(D / "models").symlink_to(C / "models")
if (C / "extra_model_paths.yaml").exists():
    shutil.copy(C / "extra_model_paths.yaml", D / "extra_model_paths.yaml")
inst = []
for i, d in enumerate([C, D]):
    port = 8188 + i
    subprocess.Popen(f"nohup python main.py --listen 127.0.0.1 --port {port} --disable-auto-launch --preview-method none "
                     f"--fast fp16_accumulation --reserve-vram 46 > /content/comfy_{i}.log 2>&1 &", shell=True, cwd=d)
    inst.append({"dir": str(d), "port": port})
for x in inst:
    for _ in range(300):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{x['port']}/system_stats", timeout=2)
            break
        except Exception:
            time.sleep(1)
    else:
        raise SystemExit(f"FAILED: ComfyUI on port {x['port']} did not start")
st = json.loads(STATE.read_text()) if STATE.exists() else {"encoder": "heretic"}
st.update(instances=inst, ready_at=time.time())
STATE.write_text(json.dumps(st))
for log in ("/content/setup_h3.log", "/content/install_full.log"):
    if Path(log).exists():
        with open(log, "a") as f:
            f.write("[guard] comfy instances: 2 (vm_fix_instances.py)\n")
with open("/content/setup_h3.log", "a") as f:
    f.write("SETUP_DONE\n")
print("FIXED 2 instances ready", flush=True)
