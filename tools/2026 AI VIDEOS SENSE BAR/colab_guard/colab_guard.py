"""Colab guard: start the shanshiba Colab VM safely and watch it so a stuck or idle G4 never burns units unnoticed.

  python colab_guard/colab_guard.py start --name u04 [--h3-only]   # safe start (see below), then 2 ComfyUI instances
  python colab_guard/colab_guard.py watch --name u04 [--idle 15]   # watchdog; EXITS with an ALERT line when something needs a human
  python colab_guard/colab_guard.py status --name u04              # one status line

Safe start: runs the repo's `colab_h3.py start` with ONE ComfyUI instance (avoids the setup_h3.py copy race, repo 8b4c50a),
then vm_fix_instances.py adds the second instance. While installing it checks the VM log every minute and stops at once on
an error (Traceback/FAILED) or when the log has not moved for --stall minutes.
Watch: every minute reads GPU use, running jobs and the ComfyUI queue. Exits (code 10) when the VM has been idle for --idle
minutes, (code 11) when the VM is gone, (code 12) on a setup error. It never stops the VM itself; a person decides.
Exit lines start with "ALERT" so the caller can forward them. Standard library only.
"""
import argparse, json, os, re, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent / "shanshiba-workflow-32gvram-64gram"
sys.path.insert(0, str(REPO / "cloud"))
import colab_h3 as C  # noqa: E402  (repo helpers: cx / vm / upload / alive / balance)

STATUS_CODE = r'''
import json, os, subprocess, time, urllib.request
def sh(c): return subprocess.run(c, shell=True, capture_output=True, text=True).stdout
g = sh("nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader,nounits").strip().split(",")
jobs = sh("ps aux | grep -E '[h]3_shot|[r]un_batch|[p]arallel_h3|[m]ake_film|[v]m_voices|[i]nstall_full|[s]etup_h3|[s]moke_test' | wc -l").strip()
logs = {}
for f in ("/content/setup_h3.log", "/content/install_full.log"):
    if os.path.exists(f):
        t = open(f, errors="replace").read()
        logs[os.path.basename(f)] = dict(age=round(time.time() - os.path.getmtime(f)), done=("SETUP_DONE" in t or "FULL_DONE" in t),
                                         error=("Traceback" in t or "FAILED" in t), tail=t[-400:])
q = 0
for p in (8188, 8189):
    try:
        d = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{p}/queue", timeout=3).read())
        q += len(d.get("queue_running", [])) + len(d.get("queue_pending", []))
    except Exception:
        pass
print("STATUS" + json.dumps(dict(gpu=int(g[0]) if g and g[0].strip() else -1, mem=int(g[1]) if len(g) > 1 else -1,
                                  jobs=int(jobs or 0), queue=q, logs=logs)))
'''


def now():
    return time.strftime("%H:%M:%S")


def say(msg):
    print(f"{now()} {msg}", flush=True)


def status(name):
    out = C.cx(["exec", "-s", name], inp=STATUS_CODE, timeout=120, check=False)
    m = re.search(r"STATUS(\{.*\})", out)
    return json.loads(m.group(1)) if m else None


def fix_instances(name):
    C.upload(name, HERE / "vm_fix_instances.py", "/content/vm_fix_instances.py")
    out = C.vm(name, "import subprocess\nr = subprocess.run('python3 /content/vm_fix_instances.py', shell=True, capture_output=True, text=True)\n"
                     "print(r.stdout[-500:], r.stderr[-1500:])", timeout=600)
    if "FIXED 2 instances ready" not in out:
        say("ALERT 第二個 ComfyUI 沒有開起來：\n" + out[-800:])
        sys.exit(12)
    say("2 個 ComfyUI 已就緒")


def cmd_start(a):
    env = dict(os.environ, PYTHONUTF8="1")
    args = [sys.executable, str(REPO / "cloud" / "colab_h3.py"), "--name", a.name, "start", "--instances", "1"]
    if a.h3_only:
        args.append("--h3-only")
    say("安全開機：先只開 1 個 ComfyUI（避開 setup_h3.py 的複製衝突）")
    p = subprocess.Popen(args, env=env)
    time.sleep(90)
    while p.poll() is None:
        st = status(a.name) if C.alive(a.name) else None
        for f, L in ((st or {}).get("logs") or {}).items():
            if L["error"] and not L["done"]:
                p.kill()
                say(f"ALERT 安裝出錯（{f}），已停止等待。最後紀錄：\n{L['tail']}")
                sys.exit(12)
            if not L["done"] and L["age"] > a.stall * 60:
                p.kill()
                say(f"ALERT 安裝 {L['age'] // 60} 分鐘沒有進度（{f}），已停止等待。最後紀錄：\n{L['tail']}")
                sys.exit(12)
        time.sleep(60)
    if p.returncode:
        say(f"ALERT colab_h3.py start 失敗（exit {p.returncode}）")
        sys.exit(12)
    fix_instances(a.name)
    say(f"開機完成；餘額 {C.balance()} 單元。之後請開 watch 監控閒置。")


def cmd_watch(a):
    idle_since, last_bal_t = None, 0
    t0, b0 = time.time(), C.balance()
    say(f"開始監控 {a.name}（閒置 {a.idle} 分鐘就通知；不會自動關機）。餘額 {b0}")
    while True:
        if not C.alive(a.name):
            say(f"ALERT Colab 機器 {a.name} 已不在（被收回或已關機）")
            sys.exit(11)
        st = status(a.name)
        if st:
            for f, L in st["logs"].items():
                if L["error"] and not L["done"]:
                    say(f"ALERT 安裝紀錄 {f} 出現錯誤：\n{L['tail']}")
                    sys.exit(12)
            busy = st["jobs"] > 0 or st["queue"] > 0 or st["gpu"] >= 5
            if busy:
                idle_since = None
            elif idle_since is None:
                idle_since = time.time()
            if idle_since and time.time() - idle_since >= a.idle * 60:
                b = C.balance()
                say(f"ALERT G4 已閒置 {a.idle} 分鐘（GPU {st['gpu']}%、沒有工作）。每小時約 8.9 單元；"
                    f"監控期間已用 {round((b0 or 0) - (b or 0), 2)} 單元，餘額 {b}。要繼續用就 keepalive，不用就 stop。")
                sys.exit(10)
            if time.time() - last_bal_t > 600:
                last_bal_t = time.time()
                say(f"GPU {st['gpu']}%  工作 {st['jobs']}  佇列 {st['queue']}  閒置 "
                    f"{0 if not idle_since else round((time.time() - idle_since) / 60)} 分  餘額 {C.balance()}")
        if a.hours and time.time() - t0 > a.hours * 3600:
            say("監控時間到，結束（沒有異常）")
            return
        time.sleep(60)


def cmd_status(a):
    st = status(a.name) if C.alive(a.name) else None
    print(json.dumps(st, ensure_ascii=False, indent=1) if st else f"{a.name} 沒有在跑")
    print("餘額", C.balance())


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for c in ("start", "watch", "status"):
        p = sub.add_parser(c)
        p.add_argument("--name", default="u04")
        if c == "start":
            p.add_argument("--h3-only", action="store_true")
            p.add_argument("--stall", type=int, default=6, help="minutes without log progress before stopping")
        if c == "watch":
            p.add_argument("--idle", type=int, default=15, help="minutes idle before the ALERT exit")
            p.add_argument("--hours", type=float, default=6, help="stop watching after this many hours")
    a = ap.parse_args()
    {"start": cmd_start, "watch": cmd_watch, "status": cmd_status}[a.cmd](a)
