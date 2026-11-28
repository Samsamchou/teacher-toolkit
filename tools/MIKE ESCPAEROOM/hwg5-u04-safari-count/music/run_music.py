"""Safari Count background music (teacher 11/27, 4B: one Music 3 track for v1 and v2 start screens).
Starts a full-install Colab G4 (session scmusic) if needed, makes one take per seed, keeps the cleanest instrumental,
downloads everything to music/, then stops the VM.   python music/run_music.py --secs 90 7 23 51"""
import argparse, json, sys, tempfile, zipfile, subprocess
from pathlib import Path
HERE = Path(__file__).resolve().parent
CLOUD = HERE.parents[2] / "2026 AI VIDEOS SENSE BAR" / "shanshiba-workflow-32gvram-64gram" / "cloud"
sys.path.insert(0, str(CLOUD))
import colab_h3 as C  # noqa: E402
ap = argparse.ArgumentParser(); ap.add_argument("--secs", type=int, default=90); ap.add_argument("--keep", action="store_true"); ap.add_argument("--gpu", default="G4", help="G4 | A100 (teacher 11/28: A100 when G4 is not available)")
ap.add_argument("seeds", nargs="*", default=["7", "23", "51"]); a = ap.parse_args()
NAME = "scmusic"
print("[music] balance before:", C.balance(), flush=True)
import time
if not C.alive(NAME) or "FULL_DONE" not in C.vm_sh(NAME, "cat /content/install_full.log 2>/dev/null | tail -3"):
    for k in range(8):   # G4 often answers 503 "Service Unavailable" for a while: wait and ask again (no VM = no cost)
        if subprocess.run([sys.executable, str(CLOUD / "colab_h3.py"), "--name", NAME, "start", "--gpu", a.gpu]).returncode == 0: break
        print(f"[music] start failed (try {k + 1}), waiting 90 s", flush=True); time.sleep(90)
    else:
        sys.exit("[music] could not get a " + a.gpu)
C.vm_sh(NAME, "mkdir -p /content/sc")
C.upload(NAME, HERE / "vm_music.py", "/content/sc/vm_music.py")
C.vm_sh(NAME, f"cd /content/sc && rm -f music.log && nohup python3 vm_music.py /content/sc {a.secs} {' '.join(a.seeds)} > music.log 2>&1 &")
C.poll(NAME, "/content/sc/music.log", "MUSIC_DONE", fail=("FAILED", "Traceback"), every=30, show=r"^\[music\]")
C.vm_sh(NAME, "cd /content/sc && rm -f music.zip && python3 -c \"import shutil; shutil.make_archive('/content/sc/music', 'zip', 'music')\"")
lz = Path(tempfile.mkdtemp()) / "music.zip"
C.download(NAME, "/content/sc/music.zip", lz)
zipfile.ZipFile(lz).extractall(HERE / "takes")
pick = json.loads((HERE / "takes" / "pick.json").read_text(encoding="utf-8"))
print(f"[music] picked seed {pick['seed']} (vocal residue {pick['vocal_ratio']:.4f})", flush=True)
if not a.keep:
    subprocess.run([sys.executable, str(CLOUD / "colab_h3.py"), "--name", NAME, "stop"], check=False)
print("[music] balance after:", C.balance(), flush=True)
