# Ken 的家外觀參考圖（3 款候選），用 Codex CLI 內建生圖（ChatGPT 方案，不另計費）。
# 用法：python -I gen_ken_home_refs.py            → 只產生缺少的圖
#       python -I gen_ken_home_refs.py A C         → 重做指定款（覆蓋）
import json, re, shutil, subprocess, os, glob, hashlib, time, sys
OUT = r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\資料\generated-images\homes-v1"
WORK = r"C:\Users\User\AppData\Local\Temp\claude\5b34f038e9120482\00f516a5-fecc-4b83-bc5b-cb4607636ba8\scratchpad\codexwork_home"
os.makedirs(OUT, exist_ok=True); os.makedirs(WORK, exist_ok=True)
SUFFIX = ("Single building, 3/4 front view from the street side, plain light-grey background, no people, no cars, no street, "
          "no trees in front of it. Toy-like stylized 3D model look with clean simple shapes but faithful real proportions and colors "
          "of a small-town street in central Taiwan. Solid closed shapes (no see-through railings). Any sign text must be simple English "
          "placeholder letters only (no Chinese characters, no brand logos).")
COMMON = ("It is a private family home, not a shop: no shop sign, no name plate, no house number, no text at all on the building. "
          "Narrow and deep plot: about 8.5 m wide street frontage and 13 m deep, so the side wall is visibly longer than the front. ")
ITEMS = {
 "ken_home_A": "A classic three-storey Taiwanese townhouse (tou-tian-cuo) family home in a small rural railway town in central Taiwan. "
   "Facade covered with beige and light-brown small rectangular wall tiles, ground floor has a glass front door with aluminium frame next to a "
   "metal roll-up garage door, a small front porch with one parked kid's bicycle and a few green potted plants, upper floors have aluminium windows "
   "and small balconies with solid tiled parapets (no railings), a flat roof with a low parapet. A subtle orange accent on the front door frame. ",
 "ken_home_B": "A newer three-storey modern Taiwanese townhouse family home in a small rural town in central Taiwan. "
   "Clean white walls combined with warm wood-tone vertical panels on the facade, large windows with dark charcoal frames, "
   "a small carport at the front with a slim orange roof sheltering one kid's bicycle, a navy-blue front door, a slanted single-pitch roof edge "
   "on top, one small balcony with a solid white parapet, a couple of potted plants by the door. ",
 "ken_home_C": "An older two-storey Taiwanese family house in a small rural town in central Taiwan, walls of red-brown brick, "
   "a pitched roof of dark grey-red clay tiles on top, a small front yard behind a low solid plastered wall with a simple orange metal gate "
   "(solid panels, not see-through), a kid's bicycle parked in the yard, wooden-framed windows, a little upper-floor balcony with a solid brick "
   "parapet and a few potted plants. ",
}
force = [a.upper() for a in sys.argv[1:]]
prov_path = os.path.join(OUT, "provenance.json")
log = json.load(open(prov_path, encoding="utf-8")) if os.path.exists(prov_path) else {}
for k, desc in ITEMS.items():
    dst = os.path.join(OUT, k + ".png")
    if os.path.exists(dst) and k[-1] not in force: continue
    prompt = f"Use your built-in image generation tool to create this image: {desc}{COMMON}{SUFFIX} Square image. Save the PNG as {k}.png in the current directory. Reply with the saved file path only."
    stale = os.path.join(WORK, k + ".png")
    if os.path.exists(stale): os.remove(stale)
    t0 = time.time()
    r = subprocess.run("codex exec --skip-git-repo-check -s workspace-write -", input=prompt, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=WORK, shell=True, timeout=900)
    out = r.stdout + r.stderr
    cands = [stale] + re.findall(r"[A-Za-z]:\\[^\s\"'`]*?generated_images[^\s\"'`]*?\.png", out)
    src = next((c for c in cands if os.path.exists(c) and os.path.getmtime(c) > t0), None)
    if not src:
        rec = sorted(glob.glob(os.path.expanduser(r"~\.codex\generated_images\**\*.png"), recursive=True), key=os.path.getmtime)
        if rec and os.path.getmtime(rec[-1]) > t0: src = rec[-1]
    if src:
        shutil.copy(src, dst)
        log[k] = {"prompt": prompt, "sha256": hashlib.sha256(open(dst, "rb").read()).hexdigest(), "src": src,
                  "generated": time.strftime("%Y-%m-%d %H:%M:%S"), "tool": "codex exec (built-in image generation)"}
        print("ok", k, round(time.time() - t0), flush=True)
        json.dump(log, open(prov_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    else:
        print("FAIL", k, out[-400:], flush=True)
