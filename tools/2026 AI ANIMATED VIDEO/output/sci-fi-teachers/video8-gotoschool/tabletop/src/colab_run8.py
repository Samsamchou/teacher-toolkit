"""一鍵（從感恩節版 colab_run.py 改）：上傳有改的檔案 → Colab G4 渲染 → 下載 → 縮圖總表 → 閒置 20 分鐘自動關機。本機不開 Blender。
  python src/colab_run8.py <test|light|final> "LINEUP 0" "Mia sec" "OPEN all" ...
    sec＝每 1 秒一張；all＝整段偶數格（正式渲染）；或直接給格數清單（逗號分隔）
  畫質：test＝Cycles 16 樣本 33%；light＝32 樣本 50%；final＝64 樣本 100%
  輸出：qa/colab/<時間>/<SID>/f####.png、qa/colab/<時間>/<SID>.jpg（final 另存 renders/<SID>/）
  2026-11-08 老師：Colab 沒有每日上限（仍記用量到 work/colab_usage.log）。
"""
import datetime, hashlib, json, os, shutil, subprocess, sys, time, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTS = Path("G:/我的雲端硬碟/teacher-toolkit/tools/2026 Thanksgiving/opening-video/work/fonts/ComicRelief-Regular.ttf")
SHEET = Path("G:/我的雲端硬碟/teacher-toolkit/tools/2026 AI ANIMATED VIDEO/output/style-pilots-20261104/h-tabletop/src/sheet.py")
SESSION = "v8"; IDLE_MIN = 20
Q = {"test": (16, 33), "light": (32, 50), "final": (64, 100)}
TM = json.loads((ROOT / "src" / "timing.json").read_text(encoding="utf-8"))
WORK = ROOT / "work"; WORK.mkdir(exist_ok=True)
STATE = WORK / "colab_state.json"; LOG = WORK / "colab_usage.log"; IDLE_PID = WORK / "colab_idle.pid"
ENV = dict(os.environ, MSYS_NO_PATHCONV="1", PYTHONIOENCODING="utf-8")


def colab(*args, timeout=None):
    r = subprocess.run(["colab", *args], capture_output=True, text=True, encoding="utf-8", errors="replace", env=ENV, cwd=ROOT, timeout=timeout)
    return r.returncode, r.stdout + r.stderr


def balance():
    _, out = colab("usage")
    for line in out.splitlines():
        if "balance" in line.lower():
            try: return float(line.split(":")[1].split()[0])
            except Exception: pass
    return None


def stop_idle_timer():
    if IDLE_PID.exists():
        subprocess.run(["taskkill", "/F", "/T", "/PID", IDLE_PID.read_text().strip()], capture_output=True); IDLE_PID.unlink()


def start_idle_timer():
    p = subprocess.Popen([sys.executable, "-c", f"import time,subprocess;time.sleep({IDLE_MIN * 60});subprocess.run(['colab','stop','-s','{SESSION}'])"],
                         creationflags=getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) | getattr(subprocess, "DETACHED_PROCESS", 0), env=ENV)
    IDLE_PID.write_text(str(p.pid))


def write_ascii(path, text):
    text.encode("ascii"); path.write_text(text, encoding="ascii")


def ensure_session(state):
    write_ascii(WORK / "_ping.py", "import os\nt='/content/.token'\nif not os.path.exists(t): open(t,'w').write(str(os.getpid()))\nprint('TOKEN', open(t).read(), os.path.exists('/content/blender/blender'))\n")
    code, out = colab("exec", "-s", SESSION, "-f", "work/_ping.py", timeout=120)
    if "TOKEN" not in out:
        print("開新的 Colab G4 …", flush=True)
        colab("new", "-s", SESSION, "--gpu", "G4", timeout=600)
        code, out = colab("exec", "-s", SESSION, "-f", "work/_ping.py", timeout=120)
    tok = [l for l in out.splitlines() if l.startswith("TOKEN")][0].split()
    if tok[2] != "True":
        print(colab("exec", "-s", SESSION, "-f", "src/colab_setup.py", "--timeout", "900", timeout=1000)[1].strip().splitlines()[-1], flush=True)
    if state.get("token") != tok[1]:
        state.clear(); state["token"] = tok[1]
    return state


def sync(state, files):
    up = state.setdefault("uploaded", {}); n = 0
    for local, remote in files:
        h = hashlib.md5(Path(local).read_bytes()).hexdigest()
        if up.get(remote) == h: continue
        code, out = colab("upload", "-s", SESSION, str(local), remote, timeout=900)
        if "Uploaded" not in out: raise SystemExit(f"上傳失敗 {local}: {out[-300:]}")
        up[remote] = h; n += 1
    print(f"上傳 {n} 個檔案", flush=True)


def frames_for(sid, spec):
    d = TM.get(sid, {"dur": 0})["dur"]
    if spec == "sec": return ",".join(str(round(t * 24)) for t in range(int(d) + 1))
    return spec


def main():
    q, jobs = sys.argv[1], [j.split() for j in sys.argv[2:]]
    samples, scale = Q[q]
    stop_idle_timer(); today = datetime.date.today().isoformat()
    b0 = balance()
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    state = ensure_session(state)
    files = [(p, f"/content/props/{p.name}") for p in sorted((ROOT / "props").glob("*")) if p.suffix in (".glb", ".png")]
    files += [(FONTS, "/content/fonts/ComicRelief-Regular.ttf")]
    files += [(p, f"/content/src/{p.name}") for p in [ROOT / "src" / "engine.py", ROOT / "src" / "scenes8.py", ROOT / "src" / "timing.json"]
              + ([ROOT / "src" / "yaw.json"] if (ROOT / "src" / "yaw.json").exists() else [])]
    sync(state, files); STATE.write_text(json.dumps(state, indent=1))
    stamp = datetime.datetime.now().strftime("%m%d-%H%M%S")
    OD = "/content/out" if q == "final" else "/content/tout"
    lines = ["import subprocess, os",
             "B = '/content/blender/blender -b --factory-startup --python /content/src/scenes8.py -- /content/props /content/fonts'",
             f"os.system('mkdir -p /content/out' if {q!r} == 'final' else 'rm -rf /content/tout && mkdir -p /content/tout')"]
    for sid, spec in jobs:
        fr = frames_for(sid, spec)
        mode = f"range {OD}/{sid} 0 end 2" if fr == "all" else (f"check {OD}/{sid} 4" if fr == "chk" else f"sheet {OD}/{sid} {fr}")
        lines += [f"r = subprocess.run(B + ' {sid} {mode} CYCLES {samples} {scale}', shell=True, capture_output=True, text=True)",
                  "ls = [l for l in (r.stdout + r.stderr).splitlines() if l.startswith('FRAME') or 'Error' in l or 'Traceback' in l or 'line ' in l]",
                  f"print('JOB {sid}', len([l for l in ls if l.startswith('FRAME')]), 'frames', ' | '.join(l for l in ls if not l.startswith('FRAME'))[-900:], flush=True)"]
    lines.append(f"os.system('cd /content && rm -f out.zip && zip -q -r out.zip {OD[9:]}')")
    write_ascii(WORK / "_job.py", "\n".join(lines) + "\n")
    t0 = time.time()
    code, out = colab("exec", "-s", SESSION, "-f", "work/_job.py", "--timeout", "14400", timeout=14500)
    print("\n".join(l for l in out.splitlines() if l.startswith("JOB") or "Error" in l), flush=True)
    dst = ROOT / "qa" / "colab" / stamp; dst.mkdir(parents=True, exist_ok=True)
    colab("download", "-s", SESSION, "/content/out.zip", str(dst / "out.zip"), timeout=1800)
    with zipfile.ZipFile(dst / "out.zip") as z: z.extractall(dst)
    (dst / "out.zip").unlink()
    for d in sorted((dst / OD[9:]).iterdir()):
        if not d.is_dir(): continue
        if q == "final":
            tgt = ROOT / "renders" / d.name; tgt.mkdir(parents=True, exist_ok=True)
            for p in d.glob("*.png"): shutil.copy(p, tgt / p.name)
        else:
            subprocess.run([sys.executable, str(SHEET), str(d), str(dst / f"{d.name}.jpg"), "5"])
    b1 = balance(); used = (b0 - b1) if (b0 is not None and b1 is not None) else 0.0
    with open(LOG, "a", encoding="utf-8") as fh:
        fh.write(f"{today} {used:.2f} {q} {' / '.join(' '.join(j) for j in jobs)} ({time.time() - t0:.0f}s)\n")
    start_idle_timer()
    print(f"完成：{dst}　這批約 {used:.2f} 單位；{IDLE_MIN} 分鐘沒新工作就自動關 Colab", flush=True)


if __name__ == "__main__":
    main()
