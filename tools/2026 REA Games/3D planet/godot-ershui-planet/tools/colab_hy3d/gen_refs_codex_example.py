import json, re, shutil, subprocess, os, glob, hashlib, time
OUT = r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\資料\generated-images\buildings-v4"
WORK = r"C:\Users\User\AppData\Local\Temp\claude\5b34f038e9120482\00f516a5-fecc-4b83-bc5b-cb4607636ba8\scratchpad\codexwork"
os.makedirs(OUT, exist_ok=True); os.makedirs(WORK, exist_ok=True)
SUFFIX = ("Single building, 3/4 front view from the street side, plain light-grey background, no people, no cars, no street, "
          "no trees in front of it. Toy-like stylized 3D model look with clean simple shapes but faithful real proportions and colors "
          "of a small-town street in central Taiwan. Solid closed shapes (no see-through railings). Any sign text must be simple English "
          "placeholder letters only (no Chinese characters, no brand logos).")
ITEMS = {
 "asia_inn": "An old four-storey narrow concrete hotel building in a Taiwanese railway-station town (a small 1970s budget inn). Beige-brown small square wall tiles, each upper floor has a row of aluminium windows with rusty iron window grilles, a tall vertical white lightbox sign with red placeholder letters 'HOTEL' hanging on the front corner, ground floor has a glass door and a small reception counter visible inside, a shallow arcade (covered walkway) along the ground floor.",
 "dental": "A three-storey narrow Taiwanese townhouse used as a dental clinic: white and pale-blue wall tiles, ground-floor glass front with frosted lower half, a wide horizontal light-blue signboard above the door with a simple white tooth icon and placeholder letters 'DENTAL', aluminium windows on upper floors, a shallow ground-floor arcade with two square columns.",
 "decheng": "An old two-and-a-half-storey Taiwanese shophouse general store (department-store style small shop): ground floor fully open to the street, stacked with plastic buckets, brooms, washbasins, baskets and towels hanging from the arcade ceiling; a long faded red horizontal signboard with yellow placeholder letters 'STORE'; cream-colored walls with old rectangular windows above, square arcade columns in front.",
 "shoes": "A three-storey Taiwanese corner shophouse at a street intersection, ground floor is a small shoe and clothing shop: glass display windows with rows of shoes on white shelves, sneakers and sandals on racks under the arcade, a yellow horizontal signboard with dark placeholder letters 'SHOES' wrapping around the corner, light-grey tiled walls with aluminium windows above.",
 "ensheng": "A three-storey Taiwanese townhouse family-medicine clinic: clean white wall tiles with a green horizontal stripe, a green cross symbol and placeholder letters 'CLINIC' on a white signboard above the door, glass entrance with automatic sliding doors, a small waiting area with chairs visible inside, a shallow arcade with two white columns.",
 "farmers": "A four-storey Taiwanese township farmers' association office and credit-union building: wide modern-1980s civic building, light-beige tiles with dark-green window frames and a green band at the roof edge, a broad ground-floor glass front like a bank hall with a counter visible inside, a big horizontal green signboard with white placeholder letters 'FARMERS ASSOCIATION', wide entrance steps.",
 "ande": "A traditional Taiwanese Mazu temple facing the street: a three-bay temple hall with a sweeping red-tiled roof and high upturned swallowtail ridge ends decorated with colorful ceramic dragons and figures, red lacquered columns with carved stone dragon pillars at the entrance, red wooden doors painted with door-god guardians, gold trim, two stone lions at the steps and a big bronze incense burner on a stand in the front courtyard.",
 "dumpling": "A two-storey narrow Taiwanese shophouse dumpling and potsticker restaurant: a bright red horizontal signboard with white placeholder letters 'DUMPLINGS', an open kitchen counter at the front with a big flat griddle of potstickers and stacked bamboo steamers, a glass door, small tables visible inside, cream wall tiles on the upper floor with an aluminium window.",
}
log = {}
for k, desc in ITEMS.items():
    dst = os.path.join(OUT, k + ".png")
    if os.path.exists(dst): continue
    prompt = f"Use your built-in image generation tool to create this image: {desc} {SUFFIX} Square image. Save the PNG as {k}.png in the current directory. Reply with the saved file path only."
    t0 = time.time()
    r = subprocess.run("codex exec --skip-git-repo-check -s workspace-write -", input=prompt, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=WORK, shell=True, timeout=900)
    out = r.stdout + r.stderr
    cands = [os.path.join(WORK, k + ".png")] + re.findall(r"[A-Za-z]:\[^\s\"'`]*?generated_images[^\s\"'`]*?\.png", out)
    src = next((c for c in cands if os.path.exists(c)), None)
    if not src:
        rec = sorted(glob.glob(os.path.expanduser(r"~\.codex\generated_images\**\*.png"), recursive=True), key=os.path.getmtime)
        if rec and os.path.getmtime(rec[-1]) > t0: src = rec[-1]
    if src:
        shutil.copy(src, dst)
        log[k] = {"prompt": prompt, "sha256": hashlib.sha256(open(dst, "rb").read()).hexdigest(), "src": src}
        print("ok", k, round(time.time() - t0), flush=True)
    else:
        print("FAIL", k, out[-400:], flush=True)
    json.dump(log, open(os.path.join(OUT, "provenance.json"), "a" if False else "w", encoding="utf-8"), ensure_ascii=False, indent=1) if log else None
