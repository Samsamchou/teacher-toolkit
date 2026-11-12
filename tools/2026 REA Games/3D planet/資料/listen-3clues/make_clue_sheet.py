# 「10 地點 × 三種線索」檢查圖 v2：每列一個地點＝環境音內容（文字）＋兩個圖示＋默劇影片 8 格（0.5、1.5…7.5 秒）＋每個音效的開始秒數（標在最接近的那一格下面）。
# 用法：python -I make_clue_sheet.py  → clue-check-v2.png（v1 版是沒有音效的 4 格）
import json, os, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
WEB = r"G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\site\public\ershui-3d-quest-planetlisten\clues"
ROWS = [  # id, 英文, 中文, 環境音（18 秒，老師選定版）
 ("post", "post office", "郵局", "叫號叮咚＋「來賓105號請到3號櫃檯」、蓋郵戳、封箱膠帶、點鈔機、收據機、投信"),
 ("supermarket", "supermarket", "超市", "結帳掃描嗶嗶、推車、「請支援收銀」、塑膠袋裝貨、找零錢"),
 ("school", "school", "學校", "西敏寺鐘聲（4 句）、小朋友歡呼、運球投籃、哨子"),
 ("library", "library", "圖書館", "翻書、輕腳步、鉛筆寫字、書放桌上、圖書館員「噓——」"),
 ("hospital", "hospital", "診所", "咳嗽、「九號請進」、小孩哭、耳溫槍嗶、推車、遠處救護車"),
 ("park", "park", "公園", "鳥叫、盪鞦韆鐵鍊、狗叫、小孩笑聲"),
 ("restaurant", "restaurant", "餐廳", "大火快炒、碗盤、餐具、吃東西聲 8 秒（誇張）、吸麵"),
 ("tea", "tea shop", "飲料店", "搖杯、封膜機、插吸管、吸飲料吸珍珠 8 秒（誇張）、冰塊"),
 ("station", "train station", "火車站", "月台廣播「區間車即將進站」、汽笛＋列車進站＋煞車、車門關、平交道噹噹、刷卡嗶"),
 ("bookstore", "bookstore", "書店", "門鈴、「歡迎光臨」、拆漫畫收縮膜、「這本漫畫一百二十元」、收銀機、書放進紙袋"),
]
F = lambda s, b=True: ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc" if b else "C:/Windows/Fonts/msjh.ttc", s)
ICON, VW, VH = 130, 176, 99
TIMES = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]
SFXD = os.path.join(HERE, "video", "sfx")
W = 20 + 230 + 280 + 2 * (ICON + 10) + len(TIMES) * (VW + 6) + 20
RH = VH + 92
H = 90 + len(ROWS) * RH + 20
sh = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(sh)
d.text((20, 18), "Listen and Guess 10 地點 × 三種線索 clue-check-v2（環境音｜兩個圖示｜默劇影片＋音效秒數）", fill="black", font=F(30))
tmp = tempfile.mkdtemp()
for r, (k, en, zh, amb) in enumerate(ROWS):
    y = 80 + r * RH
    if r % 2: d.rectangle((0, y - 12, W, y + RH - 12), fill="#f6f3ee")
    d.text((20, y + 20), en, fill="black", font=F(26)); d.text((20, y + 60), zh, fill="#555", font=F(24))
    # 環境音文字（自動換行）
    x0, line, yy = 250, "", y
    for ch in "環境音：" + amb:
        if d.textlength(line + ch, font=F(18, False)) > 260: d.text((x0, yy), line, fill="#333", font=F(18, False)); line, yy = "", yy + 26
        line += ch
    d.text((x0, yy), line, fill="#333", font=F(18, False))
    x = 250 + 280
    for i in (1, 2):
        p = os.path.join(WEB, "icons", f"{k}_{i}.webp")
        if os.path.exists(p): sh.paste(Image.open(p).convert("RGB").resize((ICON, ICON)), (x, y))
        d.rectangle((x, y, x + ICON, y + ICON), outline="#999"); x += ICON + 10
    v = os.path.join(WEB, "video", f"{k}.mp4")
    ev = json.load(open(os.path.join(SFXD, k, "plan.json"), encoding="utf-8"))["events"]
    near = {}
    for e in ev:
        near.setdefault(min(range(len(TIMES)), key=lambda i: abs(TIMES[i] - e["start"])), []).append(e)
    for j, t in enumerate(TIMES):
        f = os.path.join(tmp, f"{k}_{t}.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", v, "-frames:v", "1", "-vf", f"scale={VW}:{VH}", f])
        if os.path.exists(f): sh.paste(Image.open(f).convert("RGB"), (x, y))
        hit = j in near
        d.rectangle((x, y, x + VW, y + VH), outline="#e03131" if hit else "#999", width=3 if hit else 1)
        d.text((x + 3, y + 2), f"{t}s", fill="white", font=F(13), stroke_width=2, stroke_fill="black")
        for n, e in enumerate(near.get(j, [])):
            d.text((x, y + VH + 3 + n * 19), f"{e['start']:.1f}s {e['label']}"[:14], fill="#c92a2a", font=F(14))
        x += VW + 6
sh.save(os.path.join(HERE, "clue-check-v2.png"))
print("saved", sh.size)
