"""Make the English voices on the Colab VM (VoxCPM2 + faster-whisper) and bring them back to voices/.
  python scripts/colab_voices.py [--name u04]
Needs a VM started with the repo's full install:  python cloud/colab_h3.py --name u04 start
Re-running keeps finished files on the VM (delete voices/<shot>.wav locally AND on the VM to redo a line).
"""
import argparse, sys, tempfile, zipfile
from pathlib import Path

FILM = Path(__file__).resolve().parents[1]
REPO = FILM.parent / "shanshiba-workflow-32gvram-64gram"
sys.path.insert(0, str(REPO / "cloud"))
import colab_h3 as C  # noqa: E402  (repo helpers: cx / vm / vm_sh / upload / download / poll)

ap = argparse.ArgumentParser()
ap.add_argument("--name", default="u04")
ap.add_argument("only", nargs="*", help="only redo these line ids (e.g. S04 S20); others keep their picks")
a = ap.parse_args()

if not C.alive(a.name):
    sys.exit(f"Colab VM '{a.name}' is not running: python cloud/colab_h3.py --name {a.name} start")
C.vm_sh(a.name, "mkdir -p /content/u04")
for f in ("shots.json", "voices.json", "scripts/vm_voices.py"):
    C.upload(a.name, FILM / f, f"/content/u04/{Path(f).name}")
C.vm_sh(a.name, "cd /content/u04 && rm -f voices.log && nohup /content/AI/Voice/venv/bin/python vm_voices.py /content/u04 " + " ".join(a.only) + " > voices.log 2>&1 &")
C.poll(a.name, "/content/u04/voices.log", "VOICES_DONE", fail=("Traceback",), every=30, show=r"^\[voices\]")
C.vm_sh(a.name, "cd /content/u04 && rm -f voices.zip && python3 -c \"import shutil; shutil.make_archive('/content/u04/voices', 'zip', 'voices')\"")
lz = Path(tempfile.mkdtemp()) / "voices.zip"
C.download(a.name, "/content/u04/voices.zip", lz)
zipfile.ZipFile(lz).extractall(FILM / "voices")
print(f"[voices] downloaded to {FILM / 'voices'}", flush=True)
