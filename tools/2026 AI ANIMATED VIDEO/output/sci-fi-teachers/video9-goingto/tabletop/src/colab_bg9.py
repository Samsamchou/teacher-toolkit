"""colab_bg9.py — 分離執行版（2026-11-18：長 colab exec 會卡住，見記憶 colab-cli-long-exec-pitfalls）。
在 Colab 用 setsid 背景跑 Blender，本機每 50 秒用短 exec 看進度；跑完 zip 下載。上傳沿用 colab_run9 的 sync。
  python -I src/colab_bg9.py <light|final> <SID> [frames|all]
輸出：light → qa/colab/<時間>/<SID>/；final → renders/<SID>/
"""
import datetime, json, shutil, subprocess, sys, time, zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import colab_run9 as R

q, sid = sys.argv[1], sys.argv[2]; spec = sys.argv[3] if len(sys.argv) > 3 else "all"
samples, scale = R.Q[q]
OD = f"/content/{'out' if q == 'final' else 'tout'}/{sid}"
R.stop_idle_timer()
state = json.loads(R.STATE.read_text()) if R.STATE.exists() else {}
state = R.ensure_session(state)
ROOT = R.ROOT
files = [(p, f"/content/props/{p.name}") for p in sorted((ROOT / "props").glob("*")) if p.suffix in (".glb", ".png")]
files += [(R.FONTS, "/content/fonts/ComicRelief-Regular.ttf")]
files += [(ROOT / "src" / n, f"/content/src/{n}") for n in ("engine.py", "scenes9.py", "timing.json", "yaw9.json", "mouth9.json") if (ROOT / "src" / n).exists()]
R.sync(state, files); R.STATE.write_text(json.dumps(state, indent=1))
mode = f"range {OD} 0 end 2" if spec == "all" else f"sheet {OD} {spec}"
cmd = (f"rm -rf {OD} && mkdir -p {OD} && /content/blender/blender -b --factory-startup --python /content/src/scenes9.py -- "
       f"/content/props /content/fonts {sid} {mode} CYCLES {samples} {scale} > /content/job_{sid}.log 2>&1; echo JOBDONE >> /content/job_{sid}.log")
R.write_ascii(R.WORK / "_bg.py", "import subprocess\nsubprocess.Popen(['setsid','bash','-c',%r], start_new_session=True)\nprint('started')\n" % cmd)
print(R.colab("exec", "-s", R.SESSION, "-f", "work/_bg.py", timeout=120)[1].strip().splitlines()[-1], flush=True)
R.write_ascii(R.WORK / "_poll.py", f"import subprocess\nprint('POLL', subprocess.run(\"grep -c '^FRAME' /content/job_{sid}.log; grep -c JOBDONE /content/job_{sid}.log; grep -m3 -E 'Error|Traceback' /content/job_{sid}.log\", shell=True, capture_output=True, text=True).stdout.replace(chr(10), ' '))\n")
t0 = time.time()
while True:
    time.sleep(50)
    try: out = R.colab("exec", "-s", R.SESSION, "-f", "work/_poll.py", timeout=100)[1]
    except subprocess.TimeoutExpired: print("poll 逾時，再試", flush=True); continue
    line = next((l for l in out.splitlines() if l.startswith("POLL")), "POLL ?")
    print(f"{time.time() - t0:.0f}s {line}", flush=True)
    parts = line.split()
    if len(parts) >= 3 and parts[2] == "1": break
    if time.time() - t0 > 3 * 3600: raise SystemExit("超過 3 小時")
R.write_ascii(R.WORK / "_zip.py", f"import os\nos.system('cd /content && rm -f out.zip && zip -q -r out.zip {OD[9:]}')\nprint('zipped')\n")
R.colab("exec", "-s", R.SESSION, "-f", "work/_zip.py", timeout=600)
dst = ROOT / "qa" / "colab" / datetime.datetime.now().strftime("%m%d-%H%M%S"); dst.mkdir(parents=True, exist_ok=True)
R.colab("download", "-s", R.SESSION, "/content/out.zip", str(dst / "out.zip"), timeout=1800)
with zipfile.ZipFile(dst / "out.zip") as z: z.extractall(dst)
(dst / "out.zip").unlink()
src = dst / OD[9:]
if q == "final":
    tgt = ROOT / "renders" / sid; tgt.mkdir(parents=True, exist_ok=True)
    for p in src.glob("*.png"): shutil.copy(p, tgt / p.name)
    print("final", sid, len(list(tgt.glob("*.png"))), flush=True)
print("OUT", src, len(list(src.glob("*.png"))), flush=True)
R.start_idle_timer()
