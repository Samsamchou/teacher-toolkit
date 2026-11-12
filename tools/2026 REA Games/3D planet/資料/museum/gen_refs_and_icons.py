# 二水鐵道博物館（虛構，RDQ-spec-ershui-planet-railway-museum-20261112）：Codex CLI 生圖（ChatGPT 方案，0 點）
#  1) 建築參考圖 2 張（給 Colab Hunyuan3D-2 挑一張）→ 本資料夾 ref_museum_<a|b>.png
#  2) Listen and Guess 兩個圖示（沿用 listen-3clues/gen_icons.py 的風格與切圖）→ listen-3clues/icons/museum_1|2.png ＋ 外框 clues/icons/museum_1|2.webp
# 用法：python -I gen_refs_and_icons.py [refs] [icons]
import os, sys, re, glob, shutil, subprocess, time, hashlib, json
import concurrent.futures as cf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "listen-3clues"))
import gen_icons as GI
WORK = r"C:\Users\User\AppData\Local\Temp\claude\5b34f038e9120482\c19d1837-142e-4994-ae13-cf5aaa41e2fc\scratchpad\codexwork_museum"
SUFFIX = ("Single building, 3/4 front view from the street side, plain light-grey background, no people, no cars, no street, "
          "no trees in front of it. Toy-like stylized 3D model look with clean simple shapes. Solid closed shapes (no see-through railings, "
          "no open arches you can see through). Any text must be simple English letters only (no Chinese characters, no logos).")
DESC = {
 "a": ("A small railway museum built in the style of an old Taiwanese red-brick railway roundhouse (fan-shaped locomotive shed): "
       "a low one-storey red-brick building whose front is a gentle curve of four tall arched engine-bay doors with dark green wooden doors and "
       "white stone trim, a shallow grey sloping roof, a row of small clerestory windows along the roof, and big bold white capital letters "
       "'MUSEUM' standing on top of the roof ridge, easy to read. Clean neat brick walls, solid and closed."),
 "b": ("A compact fan-shaped red-brick railway roundhouse turned into a museum, like the Changhua roundhouse in Taiwan but smaller: "
       "the front facade is a wide shallow arc with three large round-arched doorways (closed with dark green doors), red brick walls with "
       "cream-coloured stone bands, a grey corrugated roof sloping back, a short railway track leading to the middle door, and a long flat white "
       "signboard on the roof edge with large dark-red capital letters 'MUSEUM'. Solid and closed, simple shapes."),
}

def codex(prompt, wd, name):
    os.makedirs(wd, exist_ok=True)
    stale = os.path.join(wd, name)
    if os.path.exists(stale): os.remove(stale)
    t0 = time.time()
    r = subprocess.run("codex exec --skip-git-repo-check -s workspace-write -", input=prompt, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", cwd=wd, shell=True, timeout=900)
    out = r.stdout + r.stderr
    cands = [stale] + re.findall(r"[A-Za-z]:\[^\s\"'`]*?generated_images[^\s\"'`]*?\.png", out)
    src = next((c for c in cands if os.path.exists(c) and os.path.getmtime(c) > t0), None)
    if not src:
        rec = sorted(glob.glob(os.path.expanduser(r"~\.codex\generated_images\**\*.png"), recursive=True), key=os.path.getmtime)
        if rec and os.path.getmtime(rec[-1]) > t0: src = rec[-1]
    return src, out

def ref(k):
    prompt = (f"Use your built-in image generation tool to create this image: {DESC[k]} {SUFFIX} Square image. "
              f"Save the PNG as museum_{k}.png in the current directory. Reply with the saved file path only.")
    src, out = codex(prompt, os.path.join(WORK, "ref_" + k), f"museum_{k}.png")
    if not src: print("FAIL ref", k, out[-300:], flush=True); return None
    dst = os.path.join(HERE, f"ref_museum_{k}.png"); shutil.copy(src, dst)
    print("ok ref", k, flush=True)
    return {"prompt": prompt, "sha256": hashlib.sha256(open(dst, "rb").read()).hexdigest(), "src": src}

def icons():
    rec = GI.gen("museum")
    if rec: GI.split("museum")
    return rec

GI.ICONS["museum"] = ("museum", "博物館", [
    "two short shiny posts standing apart with a thick velvet rope hanging between them in a curve (a museum display barrier)",
    "a small old steam locomotive standing on a low display platform under a hanging spotlight, seen from the side"])
GI.WORK = WORK

if __name__ == "__main__":
    what = sys.argv[1:] or ["refs", "icons"]
    prov = os.path.join(HERE, "provenance.json")
    log = json.load(open(prov, encoding="utf-8")) if os.path.exists(prov) else {}
    jobs = {}
    with cf.ThreadPoolExecutor(3) as ex:
        if "refs" in what:
            for k in DESC: jobs["ref_" + k] = ex.submit(ref, k)
        if "icons" in what: jobs["icons"] = ex.submit(icons)
        for name, f in jobs.items():
            r = f.result()
            if r: log[name] = r
    json.dump(log, open(prov, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("done", flush=True)
