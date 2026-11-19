"""colab_bg9.py — 分離執行版（2026-11-18：長 colab exec 會卡住，見記憶 colab-cli-long-exec-pitfalls）。
在 Colab 用 setsid 背景跑 Blender，本機每 50 秒用短 exec 看進度；跑完 zip 下載。上傳沿用 colab_run9 的 sync。
  python -I src/colab_bg9.py <light|final> <SID> [frames|all]
輸出：light → qa/colab/<時間>/<SID>/；final → renders/<SID>/
"""
import datetime, json, shutil, subprocess, sys, time, zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import colab_run9 as R

args = [x for x in sys.argv[1:] if not x.startswith("--")]
q, sid = args[0], args[1]; spec = args[2] if len(args) > 2 else "all"
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
# 2026-11-19：pgrep 一定要用 ^ 錨定 blender 執行檔開頭，否則會比對到 bash -c 自己（命令字串裡就有 scenes9.py）→ 直接 exit，Blender 沒開（HOSP 空等 2 小時）
cmd = (f"pgrep -f '^/content/blender/blender -b .* {sid} (range|sheet)' && exit 0;{'' if q == 'final' else f'rm -rf {OD} && '}mkdir -p {OD} && /content/blender/blender -b --factory-startup --python /content/src/scenes9.py -- "
       f"/content/props /content/fonts {sid} {mode} CYCLES {samples} {scale} > /content/job_{sid}.log 2>&1; echo JOBDONE >> /content/job_{sid}.log")
if "--collect" in sys.argv: cmd = None   # 只等現有的工作做完再下載（不重新開 Blender）
if cmd: R.write_ascii(R.WORK / f"_bg_{q}_{sid}.py", "import subprocess\nsubprocess.Popen(['setsid','bash','-c',%r], start_new_session=True)\nprint('started')\n" % cmd)
for _ in range(3 if cmd else 0):   # 啟動逾時就再試；Colab 端用 pgrep 擋同一段重複開 Blender
    try: print(R.colab("exec", "-s", R.SESSION, "-f", f"work/_bg_{q}_{sid}.py", timeout=120)[1].strip().splitlines()[-1], flush=True); break
    except subprocess.TimeoutExpired: print("啟動逾時，再試", flush=True)
R.write_ascii(R.WORK / f"_poll_{q}_{sid}.py", f"import subprocess\nprint('POLL', subprocess.run(\"grep -c '^FRAME' /content/job_{sid}.log; grep -c JOBDONE /content/job_{sid}.log; grep -m3 -E 'Error|Traceback' /content/job_{sid}.log\", shell=True, capture_output=True, text=True).stdout.replace(chr(10), ' '))\n")
t0 = time.time()
while True:
    time.sleep(50)
    try: out = R.colab("exec", "-s", R.SESSION, "-f", f"work/_poll_{q}_{sid}.py", timeout=100)[1]
    except subprocess.TimeoutExpired: print("poll 逾時，再試", flush=True); continue
    line = next((l for l in out.splitlines() if l.startswith("POLL")), "POLL ?")
    print(f"{time.time() - t0:.0f}s {line}", flush=True)
    parts = line.split()
    if len(parts) >= 3 and parts[2] == "1": break
    if time.time() - t0 > 3 * 3600: raise SystemExit("超過 3 小時")
# 2026-11-19：zip 放在 exec 裡也會卡住（SUPER、LIB 各卡一次）→ 分離執行，壓好才改名，本機每 30 秒短 exec 看 .zip 出現沒
zcmd = f"cd /content && rm -f out_{sid}.zip out_{sid}.part && zip -q -0 -r out_{sid}.part {OD[9:]} && mv out_{sid}.part out_{sid}.zip"
R.write_ascii(R.WORK / f"_zip_{q}_{sid}.py", "import subprocess\nsubprocess.Popen(['setsid','bash','-c',%r], start_new_session=True)\nprint('zipping')\n" % zcmd)
R.write_ascii(R.WORK / f"_zpoll_{q}_{sid}.py", f"import os\nprint('ZIP', os.path.exists('/content/out_{sid}.zip'))\n")
for _ in range(3):
    try: R.colab("exec", "-s", R.SESSION, "-f", f"work/_zip_{q}_{sid}.py", timeout=120); break
    except subprocess.TimeoutExpired: print("zip 啟動逾時，再試", flush=True)
while True:
    time.sleep(30)
    try: out = R.colab("exec", "-s", R.SESSION, "-f", f"work/_zpoll_{q}_{sid}.py", timeout=100)[1]
    except subprocess.TimeoutExpired: continue
    if "ZIP True" in out: break
dst = ROOT / "qa" / "colab" / datetime.datetime.now().strftime("%m%d-%H%M%S"); dst.mkdir(parents=True, exist_ok=True)
R.colab("download", "-s", R.SESSION, f"/content/out_{sid}.zip", str(dst / "out.zip"), timeout=1800)
with zipfile.ZipFile(dst / "out.zip") as z: z.extractall(dst)
(dst / "out.zip").unlink()
src = dst / OD[9:]
if q == "final":
    tgt = ROOT / "renders" / sid; tgt.mkdir(parents=True, exist_ok=True)
    for p in src.glob("*.png"): shutil.copy(p, tgt / p.name)
    print("final", sid, len(list(tgt.glob("*.png"))), flush=True)
print("OUT", src, len(list(src.glob("*.png"))), flush=True)
# 2026-11-19：不在這裡開「閒置 20 分鐘自動關機」計時器（另一段還在跑時會被關掉）；由 run_final.sh 全部跑完後才開
if "--idle" in sys.argv: R.start_idle_timer()
