# 3 icons 1 word 線索：每個活動一張「3 個黑色剪影圖示並排」，Codex CLI 內建生圖（ChatGPT 方案，不另計費），再切成 3 張。
# 用法：python -I gen_icons.py              → 只產生缺少的
#       python -I gen_icons.py jogging tv    → 重做指定活動（覆蓋）
#       python -I gen_icons.py split          → 只重切＋重做總表
import json, re, shutil, subprocess, os, glob, hashlib, time, sys
from PIL import Image, ImageDraw, ImageFont, ImageOps
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "icons", "raw"); OUT = os.path.join(HERE, "icons")
WORK = r"C:\Users\User\AppData\Local\Temp\claude\5b34f038e9120482\00f516a5-fecc-4b83-bc5b-cb4607636ba8\scratchpad\codexwork_icons"
for d in (RAW, WORK): os.makedirs(d, exist_ok=True)

# 活動 id → (英文片語, [3 個圖示]) ；圖示是「提示」，不直接畫人做這件事
# 老師 11/10：圖示要是「答案周邊」的線索，不能太明顯；第 1 個最不明顯，第 3 個最接近答案（仍不直接畫答案本身）
ICONS = {
 "jogging":  ("go jogging", ["the sun rising over a flat horizon line", "a heart with a heartbeat (ECG) pulse line through it", "a stopwatch"]),
 "music":    ("listen to music", ["an audio cable with a 3.5 mm headphone jack plug", "a loudspeaker volume symbol with three sound-wave arcs", "a vinyl record disc"]),
 "baseball": ("play baseball", ["a sports shoe with cleats (studs) on the sole, side view", "a batting helmet with one ear flap, side view", "a baseball diamond field outline: a square turned 45 degrees with small square bases at the four corners and a pitcher's mound dot"]),
 "basketball": ("play basketball", ["a referee whistle", "a digital shot clock scoreboard showing the number 24", "a half basketball court floor plan seen from above: rectangle with the key (free-throw lane) and the three-point arc"]),
 "bike":     ("ride a bike", ["sports sunglasses (wraparound)", "a short piece of bicycle chain links", "a handlebar grip with a brake lever"]),
 "english":  ("study English", ["a desk lamp", "an open notebook with a pencil lying on it (no writing)", "a speech bubble with the word Hello!"]),
 "internet": ("surf the Internet", ["a big ocean wave curling over", "a magnifying glass", "a Wi-Fi signal symbol (three arcs and a dot)"]),
 "tv":       ("watch TV", ["a two-seat sofa", "a bucket of popcorn", "a TV remote control with buttons"]),
 "camping":  ("go camping", ["a crescent moon with three small stars", "a marshmallow on a long roasting stick", "a campfire with crossed logs and flames"]),
 "games":    ("play online games", ["a pixel-art heart (8-bit style, square pixels)", "a trophy cup", "a gaming headset with a microphone boom"]),
 "recorder": ("play the recorder", ["a treble clef", "a music stand holding sheet music", "a fingering chart: a vertical column of eight circles, the top five filled black and the bottom three hollow"]),
}
STYLE = ("Three separate pictogram icons in one row, evenly spaced in three equal-width columns with lots of empty space between them, "
         "each icon centred in its column and about the same size. Solid pure black flat silhouettes on a pure white background, "
         "like simple signage pictograms or classroom flashcard icons: bold, clean, no outlines-only, no grey, no shading, no gradients, "
         "no shadows, no frames or boxes around icons, no people or hands. No text or letters anywhere unless an icon description asks for them. "
         "Wide landscape image, 3:2.")

def gen(k):
    phrase, items = ICONS[k]
    desc = f"Icon 1 (left): {items[0]}. Icon 2 (middle): {items[1]}. Icon 3 (right): {items[2]}."
    prompt = f"Use your built-in image generation tool to create this image: {desc} {STYLE} Save the PNG as {k}.png in the current directory. Reply with the saved file path only."
    stale = os.path.join(WORK, k + ".png")
    if os.path.exists(stale): os.remove(stale)
    t0 = time.time()
    r = subprocess.run("codex exec --skip-git-repo-check -s workspace-write -", input=prompt, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", cwd=WORK, shell=True, timeout=900)
    out = r.stdout + r.stderr
    cands = [stale] + re.findall(r"[A-Za-z]:\\[^\s\"'`]*?generated_images[^\s\"'`]*?\.png", out)
    src = next((c for c in cands if os.path.exists(c) and os.path.getmtime(c) > t0), None)
    if not src:
        rec = sorted(glob.glob(os.path.expanduser(r"~\.codex\generated_images\**\*.png"), recursive=True), key=os.path.getmtime)
        if rec and os.path.getmtime(rec[-1]) > t0: src = rec[-1]
    if not src:
        print("FAIL", k, out[-300:], flush=True); return None
    dst = os.path.join(RAW, k + ".png"); shutil.copy(src, dst)
    print("ok", k, round(time.time() - t0), flush=True)
    return {"prompt": prompt, "sha256": hashlib.sha256(open(dst, "rb").read()).hexdigest(), "src": src,
            "generated": time.strftime("%Y-%m-%d %H:%M:%S"), "tool": "codex exec (built-in image generation)"}

def split(k):
    im = Image.open(os.path.join(RAW, k + ".png")).convert("L")
    bw = im.point(lambda v: 0 if v < 140 else 255)
    W, H = im.size
    # 依「黑色像素的空白欄」切 3 塊，失敗就平均切
    cols = [sum(1 for y in range(0, H, 4) if bw.getpixel((x, y)) == 0) for x in range(W)]
    runs, cur = [], None
    for x, c in enumerate(cols):
        if c > 0 and cur is None: cur = x
        if c == 0 and cur is not None: runs.append([cur, x]); cur = None
    if cur is not None: runs.append([cur, W])
    while len(runs) > 3:   # 合併最近的兩段（同一圖示裡的空隙）
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        i = gaps.index(min(gaps)); runs[i] = [runs[i][0], runs[i + 1][1]]; del runs[i + 1]
    if len(runs) != 3: runs = [[i * W // 3, (i + 1) * W // 3] for i in range(3)]
    for i, (a, b) in enumerate(runs):
        part = bw.crop((a, 0, b, H))
        bbox = ImageOps.invert(part).getbbox()
        if bbox: part = part.crop(bbox)
        s = max(part.size); pad = int(s * 0.12)
        sq = Image.new("L", (s + 2 * pad, s + 2 * pad), 255)
        sq.paste(part, ((sq.width - part.width) // 2, (sq.height - part.height) // 2))
        sq.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, f"{k}_{i + 1}.png"))

def sheet():
    f = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 30)
    cell = 200; rows = list(ICONS)
    sh = Image.new("RGB", (330 + 3 * (cell + 20), len(rows) * (cell + 20) + 20), "white"); d = ImageDraw.Draw(sh)
    for r, k in enumerate(rows):
        y = 20 + r * (cell + 20)
        d.text((15, y + cell // 2 - 18), ICONS[k][0], fill="black", font=f)
        for i in range(3):
            p = os.path.join(OUT, f"{k}_{i + 1}.png")
            if os.path.exists(p):
                im = Image.open(p).convert("RGB").resize((cell, cell))
                sh.paste(im, (330 + i * (cell + 20), y)); d.rectangle((330 + i * (cell + 20), y, 330 + i * (cell + 20) + cell, y + cell), outline="#bbb")
    sh.save(os.path.join(HERE, "..", "clues-icons-v2.png"))

if __name__ == "__main__":
    args = sys.argv[1:]
    prov_path = os.path.join(HERE, "icons", "provenance.json")
    log = json.load(open(prov_path, encoding="utf-8")) if os.path.exists(prov_path) else {}
    if args != ["split"]:
        for k in ICONS:
            if os.path.exists(os.path.join(RAW, k + ".png")) and k not in args: continue
            rec = gen(k)
            if rec:
                log[k] = rec; json.dump(log, open(prov_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for k in ICONS:
        if os.path.exists(os.path.join(RAW, k + ".png")): split(k)
    sheet(); print("sheet done")
