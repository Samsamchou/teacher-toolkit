"""gen_art.py — 用 Codex CLI 生背景圖（踩坑規則第 11 類：prompt 走 stdin、在 C 槽生圖再複製、同時最多 3 張、逾時 7 分鐘）。
用法：python -I gen_art.py B02 B08      （只跑指定代號；已有的跳過，加 --force 重生）
prompts.json：{代號: {"prompt": "...", "refs": ["相對 art/ 或絕對路徑", ...]}}
輸出：art/bg/<代號>.png，紀錄 art/image-records.json
"""
import hashlib, json, pathlib, re, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

ART = pathlib.Path(__file__).resolve().parent
WORK = pathlib.Path(r"C:\Users\User\ershui-l3-work\gen")
GEN = pathlib.Path.home() / ".codex" / "generated_images"
STYLE = ("Wide 16:9 landscape background illustration, 1536x864 or similar. Art style: the same original children's "
         "Japanese-manga line art with soft cel shading, clean dark outlines and bright warm colours as the reference character "
         "image (use it ONLY as a style reference; do NOT draw that character or any person). Rural inland central Taiwan, "
         "no sea. No text, no letters, no numbers, no logos, no signs with writing; any sign or number plate stays blank. ")


def run(key, job, force):
    out = ART / "bg" / f"{key}.png"
    if out.exists() and not force:
        return key, "skip"
    d = WORK / key; d.mkdir(parents=True, exist_ok=True)
    (d / "prompt.txt").write_text(STYLE + job["prompt"] + f" Save the PNG as {key}.png in the current directory. "
                                  "Reply with the saved file path only.", encoding="utf-8")
    args = ["codex.cmd", "exec", "--skip-git-repo-check", "-s", "workspace-write"]
    for r in job.get("refs", []):
        p = pathlib.Path(r); p = p if p.is_absolute() else ART / p
        args += ["-i", str(p)]
    args.append("-")
    before = set(GEN.rglob("*.png")) if GEN.exists() else set()
    t0 = time.time()
    with open(d / "prompt.txt", "rb") as fin, open(d / "codex.log", "wb") as flog:
        pr = subprocess.Popen(args, cwd=d, stdin=fin, stdout=flog, stderr=subprocess.STDOUT)
        while pr.poll() is None:
            if time.time() - t0 > 420: pr.kill(); return key, "timeout"
            time.sleep(5)
    src = d / f"{key}.png"
    if not src.exists():
        new = sorted(set(GEN.rglob("*.png")) - before, key=lambda p: p.stat().st_mtime)
        log = (d / "codex.log").read_text(encoding="utf-8", errors="ignore")
        m = re.findall(r"[A-Za-z]:[^\s()\"']+\.png", log)
        cand = [pathlib.Path(x) for x in m if pathlib.Path(x).exists()] or new
        if not cand: return key, "no image"
        src = cand[-1]
    out.parent.mkdir(exist_ok=True); shutil.copy2(src, out)
    return key, f"ok {round(time.time() - t0)}s sha256={hashlib.sha256(out.read_bytes()).hexdigest()[:16]}"


def main():
    force = "--force" in sys.argv
    keys = [a for a in sys.argv[1:] if not a.startswith("--")]
    jobs = json.loads((ART / "prompts.json").read_text(encoding="utf-8"))
    keys = keys or list(jobs)
    rec_p = ART / "image-records.json"
    rec = json.loads(rec_p.read_text(encoding="utf-8")) if rec_p.exists() else {}
    with ThreadPoolExecutor(3) as ex:
        for key, res in ex.map(lambda k: run(k, jobs[k], force), keys):
            print(key, res)
            if res.startswith("ok"):
                rec[key] = dict(tool="codex exec (ChatGPT plan)", date=time.strftime("%Y-%m-%d %H:%M"), result=res,
                                prompt=jobs[key]["prompt"], refs=jobs[key].get("refs", []))
    rec_p.write_text(json.dumps(rec, ensure_ascii=False, indent=1), encoding="utf-8")


main()
