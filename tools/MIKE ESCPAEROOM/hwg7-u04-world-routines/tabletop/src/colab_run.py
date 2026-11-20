"""World Routines Trip tabletop renders on a Colab G4 (Blender never runs on this PC).
  python tabletop/src/colab_run.py <test|light|final> <scene> "L1 0" "L3 0,24" ...
    scene = the scene script in tabletop/src without .py (e.g. japan_lunch); each job is "<SHOT> <frames|all>"
  Quality: test = Cycles 16 samples 33 %, light = 32 samples 50 %, final = 64 samples 100 %.
  Output: tabletop/qa/<time>/<SHOT>/f####.png + <SHOT>.log (DESK / CONTACT / CHK / GND lines).
  Uses its own Colab session "wrt" and stops it 20 minutes after the last batch. Usage goes to tabletop/colab_usage.log."""
import datetime, hashlib, json, os, subprocess, sys, time, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
THANKS = ROOT.parents[2] / "2026 Thanksgiving" / "classroom-tabletop" / "src"
SESSION, IDLE_MIN, DAY_LIMIT = "wrt", 20, 30.0
Q = {"test": (16, 33), "light": (32, 50), "final": (64, 100)}
WORK = ROOT / "work"; WORK.mkdir(exist_ok=True)
STATE, LOG, IDLE_PID = WORK / "colab_state.json", ROOT / "colab_usage.log", WORK / "colab_idle.pid"
ENV = dict(os.environ, MSYS_NO_PATHCONV="1", PYTHONIOENCODING="utf-8")


def colab(*args, timeout=None):
    r = subprocess.run(["colab", *args], capture_output=True, text=True, encoding="utf-8", errors="replace", env=ENV, cwd=ROOT, timeout=timeout)
    return r.returncode, r.stdout + r.stderr


def balance():
    for line in colab("usage")[1].splitlines():
        if "balance" in line.lower():
            try: return float(line.split(":")[1].split()[0])
            except ValueError: pass
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


def short(name, code, timeout=100):
    """Run a few lines on Colab with a short exec. Long execs hang (see the Colab pitfalls note), so real work runs detached."""
    write_ascii(WORK / name, code)
    for attempt in range(3):                       # the connection sometimes hangs for a moment: retry instead of failing the batch
        try: return colab("exec", "-s", SESSION, "-f", f"work/{name}", "--timeout", "60", timeout=timeout)[1]
        except subprocess.TimeoutExpired:
            if attempt == 2: raise
            print(f"{name} timed out, retrying", flush=True)


def detached(remote_py, tag, limit=3000):
    """Start /content/<remote_py> detached, then poll with a short exec about every 40 s until /content/<tag>.done appears."""
    start = ("import subprocess, os\np = '/content/%s.done'\nif os.path.exists(p): os.remove(p)\n"
             "subprocess.Popen('python3 /content/%s > /content/%s.log 2>&1; touch /content/%s.done', shell=True, start_new_session=True)\nprint('STARTED')\n" % (tag, remote_py, tag, tag))
    print(short("_start.py", start).strip().splitlines()[-1], flush=True)
    poll = "import os\nprint('POLL', os.path.exists('/content/%s.done'))\nprint(open('/content/%s.log').read()[-1500:])\n" % (tag, tag)
    t0 = time.time(); last = ""
    while time.time() - t0 < limit:
        time.sleep(40)
        try: out = short("_poll.py", poll)
        except subprocess.TimeoutExpired: print("poll timed out, retrying", flush=True); continue
        tail = out[out.find("POLL"):]
        if tail != last: print("[%.0fs] " % (time.time() - t0) + " / ".join(tail.strip().splitlines()[-3:])[:300], flush=True); last = tail
        if "POLL True" in out: return out
    raise SystemExit("Colab job did not finish in time")


def ensure_session(state):
    ping = "import os\nt='/content/.token'\nif not os.path.exists(t): open(t,'w').write(str(os.getpid()))\nprint('TOKEN', open(t).read(), os.path.exists('/content/blender/blender'))\n"
    out = short("_ping.py", ping)
    if "TOKEN" not in out:
        print("starting a new Colab session (G4, or L4 when G4 is unavailable) ...", flush=True)
        if "READY" not in colab("new", "-s", SESSION, "--gpu", "G4", timeout=600)[1]: colab("new", "-s", SESSION, "--gpu", "L4", timeout=600)
        for _ in range(4):
            try: out = short("_ping.py", ping)
            except subprocess.TimeoutExpired: out = ""
            if "TOKEN" in out: break
    tok = [l for l in out.splitlines() if l.startswith("TOKEN")][0].split()
    short("_mk.py", "import os\nfor d in ('/content/props', '/content/fonts', '/content/src'): os.makedirs(d, exist_ok=True)\nprint('MK')\n")
    if tok[2] != "True":
        write_ascii(WORK / "_setup.py", (THANKS / "colab_setup.py").read_text(encoding="utf-8"))
        colab("upload", "-s", SESSION, str(WORK / "_setup.py"), "/content/src/_setup.py", timeout=300)
        detached("src/_setup.py", "setup", limit=900)
    if state.get("token") != tok[1]:
        state.clear(); state["token"] = tok[1]
    return state


def sync(state, files):
    up = state.setdefault("uploaded", {}); n = 0
    for local, remote in files:
        h = hashlib.md5(Path(local).read_bytes()).hexdigest()
        if up.get(remote) == h: continue
        out = colab("upload", "-s", SESSION, str(local), remote, timeout=600)[1]
        if "Uploaded" not in out: raise SystemExit(f"upload failed {local}: {out[-300:]}")
        up[remote] = h; n += 1
    print(f"uploaded {n} files", flush=True)


def main():
    q, scene, jobs = sys.argv[1], sys.argv[2], [j.split() for j in sys.argv[3:]]
    samples, scale = Q[q]
    stop_idle_timer()
    today = datetime.date.today().isoformat()
    used_today = sum(float(l.split()[1]) for l in LOG.read_text(encoding="utf-8").splitlines() if l.startswith(today)) if LOG.exists() else 0.0
    if used_today > DAY_LIMIT: print(f"WARNING {used_today:.1f} units used today (> {DAY_LIMIT}): ask the teacher first", flush=True)
    b0 = balance()
    state = ensure_session(json.loads(STATE.read_text()) if STATE.exists() else {})
    files = [(p, f"/content/props/{p.name}") for p in sorted((ROOT / "models").glob("*.glb"))]
    files += [(THANKS / "engine.py", "/content/src/engine.py"), (ROOT / "src" / f"{scene}.py", f"/content/src/{scene}.py"),
              (ROOT / "src" / "hands.py", "/content/src/hands.py")]
    sync(state, files); STATE.write_text(json.dumps(state, indent=1))
    lines = ["import subprocess, os",
             f"B = '/content/blender/blender -b --factory-startup --python /content/src/{scene}.py -- /content/props /content/fonts'",
             "os.system('rm -rf /content/tout && mkdir -p /content/tout')"]
    for shot, fr in jobs:
        mode = f"range /content/tout/{shot} 0 end 2" if fr == "all" else f"sheet /content/tout/{shot} {fr}"
        lines += [f"r = subprocess.run(B + ' {shot} {mode} CYCLES {samples} {scale}', shell=True, capture_output=True, text=True)",
                  "keep = [l for l in (r.stdout + r.stderr).splitlines() if l.split(' ')[0] in ('DESK', 'CONTACT', 'CHK', 'GND', 'FRAME') or 'Error' in l or 'Traceback' in l or l.startswith('  File')]",
                  f"open('/content/tout/{shot}.log', 'w').write(chr(10).join(keep))",
                  f"print('{shot}', len([l for l in keep if l.startswith('FRAME')]), 'frames', ' | '.join(l for l in keep if 'Error' in l)[-500:], flush=True)"]
    lines.append("os.system('cd /content && rm -f out.zip && zip -q -r out.zip tout')")
    write_ascii(WORK / "_job.py", "\n".join(lines) + "\n")
    t0 = time.time()
    colab("upload", "-s", SESSION, str(WORK / "_job.py"), "/content/src/_job.py", timeout=300)
    detached("src/_job.py", "job")
    dst = ROOT / "qa" / datetime.datetime.now().strftime("%m%d-%H%M%S"); dst.mkdir(parents=True, exist_ok=True)
    colab("download", "-s", SESSION, "/content/out.zip", str(dst / "out.zip"), timeout=1800)
    with zipfile.ZipFile(dst / "out.zip") as z: z.extractall(dst)
    (dst / "out.zip").unlink()
    b1 = balance(); used = (b0 - b1) if (b0 is not None and b1 is not None) else 0.0
    with open(LOG, "a", encoding="utf-8") as fh:
        fh.write(f"{today} {used:.2f} {q} {scene} {' / '.join(' '.join(j) for j in jobs)} ({time.time() - t0:.0f}s)\n")
    start_idle_timer()
    print(f"done: {dst}  about {used:.2f} units (the balance also includes other sessions); Colab stops after {IDLE_MIN} idle minutes", flush=True)


if __name__ == "__main__":
    main()
