"""配樂：Colab Music 3（完整安裝的 VM）。每個 cue 生 2 個 seed，選人聲殘留最少的。
  python scripts/colab_music.py --name tg voyage spring
"""
import argparse, json, sys, tempfile, zipfile
from pathlib import Path
FILM = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(FILM.parents[1] / "2026 AI VIDEOS SENSE BAR" / "shanshiba-workflow-32gvram-64gram" / "cloud"))
import colab_h3 as C  # noqa: E402
ap = argparse.ArgumentParser(); ap.add_argument("--name", default="tg"); ap.add_argument("--secs", type=int, default=45)
ap.add_argument("cues", nargs="+"); a = ap.parse_args()
if not C.alive(a.name):
    sys.exit(f"VM {a.name} is not running")
C.vm_sh(a.name, "mkdir -p /content/tg")
C.upload(a.name, FILM / "scripts" / "vm_music.py", "/content/tg/vm_music.py")
for c in a.cues:
    C.upload(a.name, FILM / f"cap_{c}.txt", f"/content/tg/cap_{c}.txt")
cmd = " && ".join(f"python3 vm_music.py /content/tg {c} {a.secs} 7 23" for c in a.cues)
C.vm_sh(a.name, f"cd /content/tg && rm -f music.log && nohup sh -c '{cmd} ; echo ALL_MUSIC_DONE' > music.log 2>&1 &")
C.poll(a.name, "/content/tg/music.log", "ALL_MUSIC_DONE", fail=("FAILED", "Traceback"), every=30, show=r"^\[music\]")
C.vm_sh(a.name, "cd /content/tg && rm -f music.zip && python3 -c \"import shutil; shutil.make_archive('/content/tg/music', 'zip', 'music')\"")
lz = Path(tempfile.mkdtemp()) / "music.zip"
C.download(a.name, "/content/tg/music.zip", lz)
zipfile.ZipFile(lz).extractall(FILM / "music")
for c in a.cues:
    p = json.loads((FILM / "music" / c / "pick.json").read_text(encoding="utf-8"))
    print(f"[music] {c}: seed {p['seed']} vocal {p['vocal_ratio']:.4f}", flush=True)
