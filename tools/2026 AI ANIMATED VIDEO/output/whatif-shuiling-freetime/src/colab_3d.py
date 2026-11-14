"""colab_3d.py：3D 抵達鏡頭一鍵在 Colab G4 渲染（本機不開 Blender）。
  python src/colab_3d.py <shot> <frames|all|hand> <samples> <scale%>   例：python src/colab_3d.py s01 0,48,96,139 32 50
  python src/colab_3d.py stop                                            → 關掉 Colab（記得做完就關）
輸出：renders/3d/<shot>/（PNG），每批前後記 colab usage 到 work/colab_usage.log。
沿用感恩節 colab_run.py 的做法：colab exec 的檔案只能 ASCII、要用相對路徑、上傳前先建資料夾。
"""
import datetime, hashlib, json, os, subprocess, sys, time, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SESSION = "sl3d"
PLANET = ROOT.parents[2] / "2026 REA Games" / "3D planet"
PROPS = [PLANET / "godot-ershui-freetime" / "assets" / "models" / "shuiling_softhand.glb"]
PROPS += [PLANET / "godot-ershui-freetime" / "assets" / "models" / f"shuiling_softhand_shuiling_apose_rigged_{k}.jpg" for k in ("basecolor", "normal", "rm")]
PROPS += sorted((PLANET / "godot-ershui-freetime" / "assets" / "anims").glob("mx_*.fbx"))   # Mixamo clips (not in git)
PROPS += [ROOT / "fonts" / "ComicRelief-Bold.ttf", ROOT / "assets" / "screen_photo.png", ROOT / "assets" / "screen_game.png", ROOT / "assets" / "screen_tv.png"]
PROPS += [PLANET / "godot-ershui-planet" / "assets" / "models" / n for n in ("bld_school_gate.glb", "tree.glb")]
WORK = ROOT / "work"; WORK.mkdir(exist_ok=True)
STATE = WORK / "colab_state.json"; LOG = WORK / "colab_usage.log"
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


def write_ascii(path, text):
    text.encode("ascii"); path.write_text(text, encoding="ascii")


def ensure_session(state):
    write_ascii(WORK / "_ping.py", "import os\nt='/content/.token'\nif not os.path.exists(t): open(t,'w').write(str(os.getpid()))\n"
                "print('TOKEN', open(t).read(), os.path.exists('/content/blender/blender'))\n")
    code, out = colab("exec", "-s", SESSION, "-f", "work/_ping.py", timeout=300)
    tries = 0
    while "TOKEN" not in out and tries < 5:      # G4 偶爾 Service Unavailable、剛開機 DNS 未就緒 → 重試
        tries += 1
        print(f"開新的 Colab G4（第 {tries} 次）…", flush=True)
        print(colab("new", "-s", SESSION, "--gpu", os.environ.get("GPU", "G4"), timeout=900)[1][-200:], flush=True)
        for _ in range(4):
            code, out = colab("exec", "-s", SESSION, "-f", "work/_ping.py", timeout=300)
            if "TOKEN" in out: break
            time.sleep(20)
        if "TOKEN" not in out: time.sleep(45)
    if "TOKEN" not in out: raise SystemExit("Colab G4 開不起來：" + out[-300:])
    tok = [l for l in out.splitlines() if l.startswith("TOKEN")][0].split()
    if tok[2] != "True":
        write_ascii(WORK / "_setup.py", "\n".join([
            "import subprocess, os, time", "t0 = time.time()",
            "def sh(c): r = subprocess.run(c, shell=True, capture_output=True, text=True); return (r.stdout + r.stderr)[-400:]",
            "for d in ('/content/props', '/content/src', '/content/out'): os.makedirs(d, exist_ok=True)",
            "if not os.path.exists('/content/blender/blender'):",
            "    sh('apt-get -qq install -y libegl1 libxi6 libxkbcommon0 libsm6 libxrender1 libxfixes3 libxxf86vm1 >/dev/null 2>&1')",
            "    sh('cd /content && curl -sSL --retry 5 -o b.tar.xz https://download.blender.org/release/Blender5.2/blender-5.2.2-linux-x64.tar.xz && tar -xf b.tar.xz && mv blender-5.2.2-linux-x64 blender && rm b.tar.xz')",
            "print('blender', os.path.exists('/content/blender/blender'), 'setup %.0fs' % (time.time() - t0))", ""]))
        print(colab("exec", "-s", SESSION, "-f", "work/_setup.py", "--timeout", "900", timeout=1000)[1].strip().splitlines()[-1], flush=True)
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


def main():
    """s01 用 b3d_arrive.py；其他（可用逗號一次排多個：s02,s03）用 b3d_shot.py，一次 exec 依序渲染。"""
    if sys.argv[1] == "stop":
        print(colab("stop", "-s", SESSION, timeout=300)[1][-200:]); return
    shots, frames, samples, scale = sys.argv[1].split(","), sys.argv[2], sys.argv[3], sys.argv[4]
    b0 = balance(); t0 = time.time()
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    state = ensure_session(state)
    files = [(p, f"/content/props/{p.name}") for p in PROPS]
    files += [(ROOT / "src" / n, f"/content/src/{n}") for n in ("b3d_check.py", "b3d_act.py")]
    sync(state, files); STATE.write_text(json.dumps(state, indent=1))
    full = frames == "all"
    env = " ".join(f"{k}={v}" for k, v in os.environ.items() if k in ("FACE_OFF", "CURL_AXIS", "ROT", "DOORX"))
    lines = ["import subprocess, os", "os.system('rm -rf /content/tout /content/out; mkdir -p /content/tout /content/out')"]
    for shot in shots:
        od = f"/content/out/{shot}" if full else "/content/tout"
        script = os.environ.get("B3D", "b3d_act.py")
        lines += [f"os.makedirs('{od}', exist_ok=True)",
                  f"r = subprocess.run('{env} /content/blender/blender -b --factory-startup --python /content/src/{script} -- /content/props {od} {shot} {frames} {samples} {scale}', shell=True, capture_output=True, text=True)",
                  "ls = [l for l in (r.stdout + r.stderr).splitlines() if l.startswith(('FRAME', 'CLIP', 'RATIO', 'HIPS', 'RETARGET', 'MODEL', 'RATIO', 'CLIP', 'DESK', 'OBJS', 'HEADGEAR', 'SCALE', 'BIG', 'BAD', 'BIKE', 'BAT', 'SOFA', 'DESK', 'DRIB', 'PENCIL')) or 'Error' in l or 'Traceback' in l or 'line ' in l]",
                  f"print('== {shot}', len([l for l in ls if l.startswith('FRAME')]), 'frames'); print(chr(10).join(l for l in ls if not l.startswith('FRAME'))[-1500:], flush=True)"]
    lines.append("os.system('cd /content && rm -f o.zip && zip -q -r o.zip %s')" % ("out" if full else "tout"))
    NL = chr(10)
    write_ascii(WORK / "_job.py", NL.join(lines) + NL)
    code, out = colab("exec", "-s", SESSION, "-f", "work/_job.py", "--timeout", "14000", timeout=1500 * len(shots) + 300)   # 卡住時最多等 25 分鐘/鏡
    print(NL.join(l for l in out.splitlines() if not l.startswith("[colab]"))[-4000:], flush=True)
    tmp = ROOT / "renders" / "3d" / "_dl"; tmp.mkdir(parents=True, exist_ok=True)
    colab("download", "-s", SESSION, "/content/o.zip", str(tmp / "o.zip"), timeout=3600)
    with zipfile.ZipFile(tmp / "o.zip") as z:
        for n in z.namelist():
            if not n.endswith(".png"): continue
            parts = Path(n).parts
            dst = ROOT / "renders" / "3d" / (parts[-2] if full else "test"); dst.mkdir(parents=True, exist_ok=True)
            (dst / parts[-1]).write_bytes(z.read(n))
    (tmp / "o.zip").unlink()
    b1 = balance(); used = (b0 - b1) if (b0 is not None and b1 is not None) else 0.0
    with open(LOG, "a", encoding="utf-8") as fh:
        fh.write(f"{datetime.date.today()} {used:.2f} {','.join(shots)} {frames} {samples} {scale} ({time.time() - t0:.0f}s) balance {b1}" + NL)
    print(f"完成；這批約 {used:.2f} 單位（帳面可能晚幾分鐘更新），餘額 {b1}", flush=True)


if __name__ == "__main__":
    main()
