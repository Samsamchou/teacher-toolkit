"""Run ON THE COLAB VM (python3) when cloud/vm/setup_h3.py crashed while copying ComfyUI for the 2nd instance
(race: instance 0 is already running and writing __pycache__ temp files while copytree reads the folder).
Copies the folder with ALL __pycache__ skipped, starts both instances, writes /content/h3_state.json and SETUP_DONE.
"""
import json, shutil, subprocess, time, urllib.request
from pathlib import Path

C = Path("/content/AI/H3/ComfyUI-0.36.0")
D = Path("/content/ComfyUI_1")
subprocess.run("pkill -f 'main.py --listen'", shell=True)
time.sleep(3)
shutil.rmtree(D, ignore_errors=True)
TOP = {"models", "input", "output", "user", "temp"}
shutil.copytree(C, D, symlinks=True,
                ignore=lambda p, names: [n for n in names if n == "__pycache__" or (Path(p) == C and n in TOP)])
(D / "models").symlink_to(C / "models")
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
Path("/content/h3_state.json").write_text(json.dumps({"instances": inst, "encoder": "heretic", "ready_at": time.time()}))
with open("/content/setup_h3.log", "a") as f:
    f.write("[setup] comfy_ready = 2 instance(s) (fixed by vm_fix_instances.py)\nSETUP_DONE\n")
print("FIXED 2 instances ready", flush=True)
