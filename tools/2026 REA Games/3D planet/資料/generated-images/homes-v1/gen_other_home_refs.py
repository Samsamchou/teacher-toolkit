# Ken 的家外觀參考圖（3 款候選），用 Codex CLI 內建生圖（ChatGPT 方案，不另計費）。
# 用法：python -I gen_ken_home_refs.py            → 只產生缺少的圖
#       python -I gen_ken_home_refs.py A C         → 重做指定款（覆蓋）
import json, re, shutil, subprocess, os, glob, hashlib, time, sys
OUT = r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\資料\generated-images\homes-v1"
WORK = r"C:\Users\User\AppData\Local\Temp\claude\5b34f038e9120482\00f516a5-fecc-4b83-bc5b-cb4607636ba8\scratchpad\codexwork_home2"
os.makedirs(OUT, exist_ok=True); os.makedirs(WORK, exist_ok=True)
SUFFIX = ("Single building, 3/4 front view from the street side, plain light-grey background, no people, no cars, no street, "
          "no trees in front of it. Toy-like stylized 3D model look with clean simple shapes but faithful real proportions and colors "
          "of a small-town street in central Taiwan. Solid closed shapes (no see-through railings). Any sign text must be simple English "
          "placeholder letters only (no Chinese characters, no brand logos).")
COMMON = ("It is a private family home, not a shop: no shop sign, no name plate, no house number, no text at all on the building. ")
ITEMS = {
 # 水鈴的家：溪邊巷，走路上學（靠近學校西門、明德橋旁的小溪）
 "shuiling_home_A": "A cosy two-storey Taiwanese family house beside a small creek lane in a rural town in central Taiwan: white plastered walls, "
   "sky-blue wooden window frames and a sky-blue front door, a pitched roof of blue-grey tiles, a tiny front garden behind a low solid white wall with "
   "blue flower pots and a big ceramic water jar with water plants, a small upper balcony with a solid parapet and hanging plants. ",
 "shuiling_home_B": "A single-storey traditional Taiwanese courtyard-style cottage (small sanheyuan wing house) in a rural town in central Taiwan: "
   "white walls with a red-brick lower band, a curved roof of grey-blue clay tiles, a pale-blue wooden double door, round window, "
   "a little front yard with a stone water basin, green plants and a pair of small rain boots by the door. ",
 "shuiling_home_C": "A two-storey mint-green Taiwanese townhouse family home in a rural town in central Taiwan: mint-green small wall tiles, "
   "white window frames, a turquoise front door with a small awning, a flat roof with a blue water tower tank on top, a narrow porch with potted "
   "plants and an umbrella stand, upper windows with solid white flower boxes. ",
 # 圳寶的家：員集路四段，家人騎機車載他上學
 "zunbo_home_A": "A classic three-storey Taiwanese townhouse (tou-tian-cuo) family home on a main road in a rural town in central Taiwan: "
   "light-green and cream small wall tiles, a ground-floor arcade (covered walkway) with two square columns where one mint-green motor scooter is parked, "
   "a silver metal roll-up door half open beside a glass door, aluminium windows above, a small balcony with a solid tiled parapet and laundry pole. ",
 "zunbo_home_B": "A newer two-storey modern Taiwanese family house on a main road in a rural town in central Taiwan: light-grey walls with teal "
   "accent panels, a teal front door, large windows with dark frames, a small carport with a slim orange roof sheltering one mint-green motor scooter, "
   "a flat roof with solar water heater panels, two potted plants by the door. ",
 "zunbo_home_C": "An older two-storey Taiwanese shophouse-style family home on a main road in a rural town in central Taiwan: cream walls, "
   "an orange metal roll-up door on the ground floor with one mint-green motor scooter parked in front under a striped canvas awning, wooden-framed "
   "windows upstairs with a solid balcony parapet, a pitched roof of red clay tiles, a small mailbox without any text. ",
}
force = [a.upper() for a in sys.argv[1:]]
prov_path = os.path.join(OUT, "provenance.json")
log = json.load(open(prov_path, encoding="utf-8")) if os.path.exists(prov_path) else {}
for k, desc in ITEMS.items():
    dst = os.path.join(OUT, k + ".png")
    if os.path.exists(dst) and k.upper() not in force: continue
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
