"""Pippy 聲音試聽：在 Colab VM 上用 VoxCPM2 做 3 種聲音，下載回 voices/。
改自 SF3 R1 的 colab_voices.py。
  python scripts/colab_voices.py --name tg
VM 先用 colab_guard 開好（完整安裝）。
"""
import argparse, sys, tempfile, zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
SENSE = HERE.parents[2] / "2026 AI VIDEOS SENSE BAR"
REPO = SENSE / "shanshiba-workflow-32gvram-64gram"
sys.path.insert(0, str(REPO / "cloud"))
import colab_h3 as C  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--name", default="tg")
a = ap.parse_args()

if not C.alive(a.name):
    sys.exit(f"Colab VM '{a.name}' is not running")
C.vm_sh(a.name, "mkdir -p /content/tg/voices")
for f in ("shots.json", "voices.json", "scripts/vm_voices.py"):
    C.upload(a.name, HERE / f, f"/content/tg/{Path(f).name}")
C.vm_sh(a.name, "cd /content/tg && rm -f voices.log && nohup /content/AI/Voice/venv/bin/python vm_voices.py /content/tg > voices.log 2>&1 &")
C.poll(a.name, "/content/tg/voices.log", "VOICES_DONE", fail=("Traceback",), every=30, show=r"^\[voices\]")
C.vm_sh(a.name, "cd /content/tg && rm -f voices.zip && python3 -c \"import shutil; shutil.make_archive('/content/tg/voices', 'zip', 'voices')\"")
lz = Path(tempfile.mkdtemp()) / "voices.zip"
C.download(a.name, "/content/tg/voices.zip", lz)
zipfile.ZipFile(lz).extractall(HERE / "voices")
print(f"[voices] downloaded to {HERE / 'voices'}", flush=True)
