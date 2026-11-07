"""一鍵：上傳有改的檔案 → Colab G4 渲染 → 下載 → 做縮圖總表 → 閒置 20 分鐘自動關機。本機不開 Blender。
  python src/colab_run.py <test|light|final> "S07 r1 sec" "S08 r2 0,48,96" "S04 r1 all" ...
    sec＝每 1 秒一張；all＝整段偶數格（正式渲染）；或直接給格數清單
  畫質：test＝Cycles 16 樣本 33%；light＝32 樣本 50%；final＝64 樣本 100%
  輸出：qa/colab/<時間>/<SID><SHOT>/f####.png、qa/colab/<時間>/<SID><SHOT>.jpg（final 另存 renders/<SID><SHOT>/）
  花費：每批前後記 colab usage 到 work/colab_usage.log；當天超過 30 單位會印 WARNING（要先問老師）。
"""
import datetime, glob, hashlib, json, os, shutil, subprocess, sys, time, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT.parent / "opening-video" / "work" / "fonts" / "ComicRelief-Regular.ttf"
SESSION = "tth"; IDLE_MIN = 20; DAY_LIMIT = 30.0
Q = {"test": (16, 33), "light": (32, 50), "final": (64, 100)}
DUR = {("O", "r1"): 17.6, ("S04", "r1"): 8.2, ("S04", "r2"): 9.2, ("S05", "r1"): 4.8, ("S05", "r2"): 5.4, ("S06", "r1"): 5.4, ("S06", "r2"): 6.0,
       ("S07", "r1"): 5.9, ("S07", "r2"): 6.6, ("S08", "r1"): 7.7, ("S08", "r2"): 8.6, ("S09", "r1"): 8.6, ("S09", "r2"): 9.7,
       ("S10", "r1"): 11.8, ("S10", "r2"): 13.3, ("S11", "r1"): 12.2, ("S11", "r2"): 13.8, ("S12", "r1"): 8.0, ("S12", "r2"): 9.0}
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
        pid = IDLE_PID.read_text().strip()
        subprocess.run(["taskkill", "/F", "/T", "/PID", pid], capture_output=True)
        IDLE_PID.unlink()


def start_idle_timer():
    """背景計時：IDLE_MIN 分鐘後自動 colab stop（下一批開始時會先取消）。"""
    p = subprocess.Popen([sys.executable, "-c", f"import time,subprocess;time.sleep({IDLE_MIN * 60});subprocess.run(['colab','stop','-s','{SESSION}'])"],
                         creationflags=getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) | getattr(subprocess, "DETACHED_PROCESS", 0), env=ENV)
    IDLE_PID.write_text(str(p.pid))


def write_ascii(path, text):
    text.encode("ascii"); path.write_text(text, encoding="ascii")


def ensure_session(state):
    ping = WORK / "_ping.py"
    write_ascii(ping, "import os\nt='/content/.token'\nif not os.path.exists(t): open(t,'w').write(str(os.getpid()))\nprint('TOKEN', open(t).read(), os.path.exists('/content/blender/blender'))\n")
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
    """只上傳有改過的檔案（用 md5 記住這個 Colab 工作階段上傳過什麼）。"""
    up = state.setdefault("uploaded", {}); n = 0
    for local, remote in files:
        h = hashlib.md5(Path(local).read_bytes()).hexdigest()
        if up.get(remote) == h: continue
        code, out = colab("upload", "-s", SESSION, str(local), remote, timeout=600)
        if "Uploaded" not in out: raise SystemExit(f"上傳失敗 {local}: {out[-300:]}")
        up[remote] = h; n += 1
    print(f"上傳 {n} 個檔案", flush=True)


def frames_for(sid, shot, spec):
    d = DUR[(sid, shot)]
    if spec == "sec": return ",".join(str(round(t * 24)) for t in range(int(d) + 1))
    if spec == "all": return "all"
    if spec == "chk" or spec.startswith("from:"): return spec
    return spec


def main():
    q, jobs = sys.argv[1], [j.split() for j in sys.argv[2:]]
    samples, scale = Q[q]
    stop_idle_timer()
    today = datetime.date.today().isoformat()
    used_today = sum(float(l.split()[1]) for l in LOG.read_text().splitlines() if l.startswith(today)) if LOG.exists() else 0.0
    if used_today > DAY_LIMIT:
        print(f"WARNING 今天已用 {used_today:.1f} 單位，超過 {DAY_LIMIT} → 先問老師", flush=True)
    b0 = balance()
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    state = ensure_session(state)
    files = [(p, f"/content/props/{p.name}") for p in sorted((ROOT / "props").glob("*")) if p.suffix in (".glb", ".png", ".json")]
    files += [(FONTS, "/content/fonts/ComicRelief-Regular.ttf")]
    files += [(p, f"/content/src/{p.name}") for p in (ROOT / "src" / "engine.py", ROOT / "src" / "scenes.py", ROOT / "src" / "scenes_s07_s12.py")]
    sync(state, files); STATE.write_text(json.dumps(state, indent=1))
    stamp = datetime.datetime.now().strftime("%m%d-%H%M%S")
    lines = ["import subprocess, os",
             "B = '/content/blender/blender -b --factory-startup --python /content/src/scenes.py -- /content/props /content/fonts'",
             "os.system('mkdir -p /content/out' if %r == 'final' else 'rm -rf /content/tout && mkdir -p /content/tout')" % q]
    for sid, shot, spec in jobs:
        fr = frames_for(sid, shot, spec)
        OD = '/content/out' if q == 'final' else '/content/tout'
        mode = f"range {OD}/{sid}{shot} 0 end 2" if fr == "all" else (f"check {OD}/{sid}{shot} 4" if fr == "chk" else (f"range {OD}/{sid}{shot} {fr[5:]} end 2" if fr.startswith("from:") else f"sheet {OD}/{sid}{shot} {fr}"))
        lines += [f"r = subprocess.run(B + ' {sid} {shot} {mode} CYCLES {samples} {scale}', shell=True, capture_output=True, text=True)",
                  f"open('{OD}/{sid}{shot}.chk', 'w').write(chr(10).join(l for l in r.stdout.splitlines() if l[:3] in ('CHK','GND','FLG') or l.startswith('FLAGMOVE')))",
                  "ls = [l for l in (r.stdout + r.stderr).splitlines() if l.startswith('FRAME') or 'Error' in l or 'Traceback' in l or 'line ' in l]",
                  f"print('{sid}{shot}', len([l for l in ls if l.startswith('FRAME')]), 'frames', ' | '.join(l for l in ls if not l.startswith('FRAME'))[-600:], flush=True)"]
    lines.append("os.system('cd /content && rm -f out.zip && zip -q -r out.zip %s')" % ('out' if q == 'final' else 'tout'))
    write_ascii(WORK / "_job.py", "\n".join(lines) + "\n")
    t0 = time.time()
    code, out = colab("exec", "-s", SESSION, "-f", "work/_job.py", "--timeout", "14400", timeout=14500)
    print("\n".join(l for l in out.splitlines() if l[:3] in ("O r", "S0", "S1") or "Error" in l), flush=True)
    dst = ROOT / "qa" / "colab" / stamp; dst.mkdir(parents=True, exist_ok=True)
    code, out = colab("download", "-s", SESSION, "/content/out.zip", str(dst / "out.zip"), timeout=1800)
    with zipfile.ZipFile(dst / "out.zip") as z: z.extractall(dst)
    (dst / "out.zip").unlink()
    sheet = ROOT.parent.parent / "2026 AI ANIMATED VIDEO" / "output" / "style-pilots-20261104" / "h-tabletop" / "src" / "sheet.py"
    for d in sorted((dst / ("out" if q == "final" else "tout")).iterdir()):
        if not d.is_dir():
            continue
        if q == "final":
            tgt = ROOT / "renders" / d.name; tgt.mkdir(parents=True, exist_ok=True)
            for p in d.glob("*.png"): shutil.copy(p, tgt / p.name)
        else:
            subprocess.run([sys.executable, str(sheet), str(d), str(dst / f"{d.name}.jpg"), "6"])
    b1 = balance(); used = (b0 - b1) if (b0 is not None and b1 is not None) else 0.0
    with open(LOG, "a", encoding="utf-8") as fh:
        fh.write(f"{today} {used:.2f} {q} {' / '.join(' '.join(j) for j in jobs)} ({time.time() - t0:.0f}s)\n")
    start_idle_timer()
    print(f"完成：{dst}　這批約 {used:.2f} 單位（帳面數字可能晚幾分鐘更新），今天累計約 {used_today + used:.2f}；{IDLE_MIN} 分鐘沒新工作就自動關 Colab", flush=True)


if __name__ == "__main__":
    main()
