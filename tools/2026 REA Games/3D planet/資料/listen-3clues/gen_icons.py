# Listen and Guess「兩個圖示」線索：每個地點一張「2 個黑色剪影圖示並排」，Codex CLI 內建生圖（ChatGPT 方案，不另計費），再切成 2 張。
# 規則（照 Free Time 老師 11/10）：圖示是地點「周邊」的線索、不放文字；第 1 個較不明顯、第 2 個較接近答案；不直接畫建築招牌。
# 用法：python -I gen_icons.py              → 只產生缺少的（同時最多 3 張）
#       python -I gen_icons.py post tea      → 重做指定地點（覆蓋）
#       python -I gen_icons.py split          → 只重切＋重做檢查圖
import json, re, shutil, subprocess, os, glob, hashlib, time, sys
import concurrent.futures as cf
from PIL import Image, ImageDraw, ImageFont, ImageOps
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "icons", "raw"); OUT = os.path.join(HERE, "icons")
WORK = r"C:\Users\User\AppData\Local\Temp\claude\5b34f038e9120482\c19d1837-142e-4994-ae13-cf5aaa41e2fc\scratchpad\codexwork_listen_icons"
WEB = r"G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\site\public\ershui-3d-quest-planetlisten\clues\icons"
for d in (RAW, WORK, WEB): os.makedirs(d, exist_ok=True)

# 地點 id（listen.json）→ (英文單字, 中文, [圖示 1, 圖示 2])
ICONS = {
 "post":        ("post office", "郵局", ["a cardboard parcel box tied with string", "a postage stamp with a wavy perforated edge showing a simple flower picture"]),
 "supermarket": ("supermarket", "超市", ["a shopping basket with a handle holding a few fruits and a milk bottle", "a shopping cart"]),
 "school":      ("school", "學校", ["a school backpack with two shoulder straps", "a school building with a flag on a tall flagpole beside it and a round clock on the front wall"]),
 "library":     ("library", "圖書館", ["a pair of reading glasses", "a tall bookshelf full of books standing in rows"]),
 "hospital":    ("hospital", "診所", ["a medicine bottle with a few pills beside it", "a doctor's stethoscope"]),
 "park":        ("park", "公園", ["a kite with a long wavy tail", "a playground swing set with two swings"]),
 "restaurant":  ("restaurant", "餐廳", ["a pair of chopsticks resting on a small bowl", "a plate of dumplings with steam rising"]),
 "tea":         ("tea shop", "飲料店", ["three ice cubes", "a takeaway bubble tea cup with a sealed lid, a thick straw and round pearls at the bottom"]),
 "station":     ("train station", "火車站", ["a railway level-crossing warning sign: a big X-shaped crossbuck on a post with two round lights (no letters)", "the front of a passenger train coming toward the viewer on rails"]),
 "bookstore":   ("bookstore", "書店", ["a book with a blank price-tag sticker on its cover", "a paper shopping bag with two books sticking out of the top"]),
}
STYLE = ("Two separate pictogram icons side by side, evenly spaced in two equal-width columns with lots of empty space between them, "
         "each icon centred in its column and about the same size. Solid pure black flat silhouettes on a pure white background, "
         "like simple signage pictograms or classroom flashcard icons: bold, clean, no outlines-only, no grey, no shading, no gradients, "
         "no shadows, no frames or boxes around icons, no people or hands. Absolutely no text, letters, numbers or symbols with writing anywhere. "
         "Wide landscape image, 3:2.")

def gen(k):
    word, zh, items = ICONS[k]
    desc = f"Icon 1 (left): {items[0]}. Icon 2 (right): {items[1]}."
    prompt = f"Use your built-in image generation tool to create this image: {desc} {STYLE} Save the PNG as {k}.png in the current directory. Reply with the saved file path only."
    wd = os.path.join(WORK, k); os.makedirs(wd, exist_ok=True)
    stale = os.path.join(wd, k + ".png")
    if os.path.exists(stale): os.remove(stale)
    t0 = time.time()
    r = subprocess.run("codex exec --skip-git-repo-check -s workspace-write -", input=prompt, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", cwd=wd, shell=True, timeout=900)
    out = r.stdout + r.stderr
    cands = [stale] + re.findall(r"[A-Za-z]:\\[^\s\"'`]*?generated_images[^\s\"'`]*?\.png", out)
    src = next((c for c in cands if os.path.exists(c) and os.path.getmtime(c) > t0), None)
    if not src:
        print("FAIL", k, out[-300:], flush=True); return None
    dst = os.path.join(RAW, k + ".png"); shutil.copy(src, dst)
    print("ok", k, round(time.time() - t0), flush=True)
    return {"prompt": prompt, "sha256": hashlib.sha256(open(dst, "rb").read()).hexdigest(), "src": src,
            "generated": time.strftime("%Y-%m-%d %H:%M:%S"), "tool": "codex exec (built-in image generation)"}

def split(k, n=2):
    im = Image.open(os.path.join(RAW, k + ".png")).convert("L")
    bw = im.point(lambda v: 0 if v < 140 else 255)
    W, H = im.size
    cols = [sum(1 for y in range(0, H, 4) if bw.getpixel((x, y)) == 0) for x in range(W)]
    runs, cur = [], None
    for x, c in enumerate(cols):
        if c > 0 and cur is None: cur = x
        if c == 0 and cur is not None: runs.append([cur, x]); cur = None
    if cur is not None: runs.append([cur, W])
    while len(runs) > n:
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        i = gaps.index(min(gaps)); runs[i] = [runs[i][0], runs[i + 1][1]]; del runs[i + 1]
    if len(runs) != n: runs = [[i * W // n, (i + 1) * W // n] for i in range(n)]
    for i, (a, b) in enumerate(runs):
        part = bw.crop((a, 0, b, H))
        bbox = ImageOps.invert(part).getbbox()
        if bbox: part = part.crop(bbox)
        s = max(part.size); pad = int(s * 0.12)
        sq = Image.new("L", (s + 2 * pad, s + 2 * pad), 255)
        sq.paste(part, ((sq.width - part.width) // 2, (sq.height - part.height) // 2))
        big = sq.resize((512, 512), Image.LANCZOS)
        big.save(os.path.join(OUT, f"{k}_{i + 1}.png"))
        big.resize((320, 320), Image.LANCZOS).convert("RGB").save(os.path.join(WEB, f"{k}_{i + 1}.webp"), quality=82)

def sheet():
    f = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 28)
    fz = ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", 26)
    cell = 200; rows = list(ICONS)
    sh = Image.new("RGB", (1010, len(rows) * (cell + 20) + 90), "white"); d = ImageDraw.Draw(sh)
    d.text((15, 20), "Listen and Guess 兩個圖示線索 icon-check-v1：左＝圖示1（較不明顯）右＝圖示2（較接近）", fill="black", font=fz)
    for r, k in enumerate(rows):
        y = 70 + r * (cell + 20)
        d.text((15, y + cell // 2 - 34), ICONS[k][0], fill="black", font=f)
        d.text((15, y + cell // 2 + 4), ICONS[k][1], fill="#555", font=fz)
        for i in range(2):
            p = os.path.join(OUT, f"{k}_{i + 1}.png")
            x = 300 + i * (cell + 20)
            if os.path.exists(p):
                sh.paste(Image.open(p).convert("RGB").resize((cell, cell)), (x, y))
            d.rectangle((x, y, x + cell, y + cell), outline="#bbb")
    sh.save(os.path.join(HERE, "icon-check-v1.png"))

if __name__ == "__main__":
    args = sys.argv[1:]
    prov_path = os.path.join(OUT, "provenance.json")
    log = json.load(open(prov_path, encoding="utf-8")) if os.path.exists(prov_path) else {}
    if args != ["split"]:
        todo = [k for k in ICONS if k in args or (not args and not os.path.exists(os.path.join(RAW, k + ".png")))]
        with cf.ThreadPoolExecutor(3) as ex:   # 同時最多 3 張
            for k, rec in zip(todo, ex.map(gen, todo)):
                if rec:
                    log[k] = rec; json.dump(log, open(prov_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for k in ICONS:
        if os.path.exists(os.path.join(RAW, k + ".png")): split(k)
    sheet(); print("sheet done", flush=True)
