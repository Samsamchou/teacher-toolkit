"""Make background music on the Colab VM (Music 3, needs the full install) and bring all takes back to music/.
  python scripts/colab_music.py --secs 150 [--name sf3] [seed ...]
"""
import argparse, json, sys, tempfile, zipfile
from pathlib import Path

FILM = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(FILM.parent / "shanshiba-workflow-32gvram-64gram" / "cloud"))
import colab_h3 as C  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--name", default="sf3")
ap.add_argument("--secs", type=int, default=150)
ap.add_argument("seeds", nargs="*", default=["7", "23", "51"])
a = ap.parse_args()
if not C.alive(a.name):
    sys.exit(f"VM {a.name} is not running")
C.vm_sh(a.name, "mkdir -p /content/sf3")
C.upload(a.name, FILM / "scripts" / "vm_music.py", "/content/sf3/vm_music.py")
C.vm_sh(a.name, f"cd /content/sf3 && rm -f music.log && nohup python3 vm_music.py /content/sf3 {a.secs} {' '.join(a.seeds)} > music.log 2>&1 &")
C.poll(a.name, "/content/sf3/music.log", "MUSIC_DONE", fail=("FAILED", "Traceback"), every=30, show=r"^\[music\]")
C.vm_sh(a.name, "cd /content/sf3 && rm -f music.zip && python3 -c \"import shutil; shutil.make_archive('/content/sf3/music', 'zip', 'music')\"")
lz = Path(tempfile.mkdtemp()) / "music.zip"
C.download(a.name, "/content/sf3/music.zip", lz)
zipfile.ZipFile(lz).extractall(FILM / "music")
pick = json.loads((FILM / "music" / "pick.json").read_text(encoding="utf-8"))
print(f"[music] picked seed {pick['seed']} (vocal residue {pick['vocal_ratio']:.4f}) -> music/", flush=True)
