"""二水鐵道博物館（虛構）檢查圖 museum-check-v1.png：
1 地圖位置（data/map.json 俯視：車站、博物館、門口、鐵道） 2 Ken 走到博物館＋抵達畫面 3 外觀特寫
4 Listen and Guess 列：環境音內容（A/B）、兩個圖示、默劇抽格＋音效秒數（紅框＝有音效的那一格）。
用法：python -I make_museum_sheet.py   （先跑 Godot 測試產生 godot-ershui-planet/test_*.png）
"""
import json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, "..", "..", "godot-ershui-planet")
LIS = os.path.join(HERE, "..", "listen-3clues")
FZ = lambda n: ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", n)
FR = lambda n: ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", n)
W = 1920


def map_img(w=900, h=620):
    m = json.load(open(os.path.join(GAME, "data", "map.json"), encoding="utf-8"))
    X0, X1, Z0, Z1 = -75, 75, -185, -82
    S = min(w / (X1 - X0), h / (Z1 - Z0))
    im = Image.new("RGB", (w, h), (246, 244, 236))
    d = ImageDraw.Draw(im)
    T = lambda q: ((q[0] - X0) * S, (q[1] - Z0) * S)
    for g in m["green"]:
        d.polygon([T(q) for q in g["poly"]], fill=(206, 232, 196))
    for e in m["edges"]:
        a, b = m["nodes"][e[0]], m["nodes"][e[1]]
        d.line([T(a), T(b)], fill=(150, 150, 150), width=max(2, int(e[2] * S)))
    for r in m["rails"]:
        d.line([T(q) for q in r], fill=(60, 60, 60), width=2)
    for b in m["buildings"]:
        d.polygon([T(q) for q in b["poly"]], fill=(205, 170, 140), outline=(120, 90, 70))
    P = {p["id"]: p for p in m["places"]}
    for pid, col, txt in [("station", (40, 90, 200), "二水車站"), ("museum", (200, 30, 30), "二水鐵道博物館（虛構）")]:
        p = P[pid]
        x, z = p["pos"]
        s = 16 if pid == "museum" else 26
        d.rectangle([T((x - s / 2, z - s / 2)), T((x + s / 2, z + s / 2))], outline=col, width=4)
        dx, dz = p["door"]
        d.ellipse([T((dx - 1.3, dz - 1.3)), T((dx + 1.3, dz + 1.3))], fill=col)
        tx, ty = T((x - s / 2, z + s / 2))
        d.text((tx, ty + 4), txt, fill=col, font=FZ(24))
    d.text((10, 8), "1 地圖位置（俯視，北在上；黑線＝鐵道；圓點＝角色停的門口）", fill="black", font=FZ(24))
    d.text((10, h - 34), "車站西北、車站旁的路與鐵道之間的空地（綠地東北角），正門朝路；沒拿掉房子、不壓路", fill=(60, 60, 60), font=FR(20))
    return im


def shot(name, w, h):
    p = os.path.join(GAME, f"test_{name}.png")
    if not os.path.exists(p):
        im = Image.new("RGB", (w, h), (220, 220, 220))
        ImageDraw.Draw(im).text((10, 10), "missing " + name, fill="red", font=FR(20))
        return im
    return Image.open(p).convert("RGB").resize((w, h))


def frames(src, times, w):
    h = w * 9 // 16
    out = []
    for t in times:
        b = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", src, "-frames:v", "1", "-vf", f"scale={w}:{h}",
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        out.append(Image.fromarray(np.frombuffer(b, np.uint8)[: w * h * 3].reshape(h, w, 3)))
    return out


def main():
    sheet = Image.new("RGB", (W, 1990), "white")
    d = ImageDraw.Draw(sheet)
    d.text((20, 14), "二水鐵道博物館 Railway Museum（虛構地點）檢查圖 museum-check-v1　2026-11-12", fill="black", font=FZ(38))
    d.text((20, 64), "紅磚扇形車庫（Colab Hunyuan3D-2）＋門前蒸汽火車頭（沿用公園火車頭模型）＋屋頂 MUSEUM 看板＋路邊立牌「二水鐵道博物館 / Railway Museum」",
           fill=(70, 70, 70), font=FR(24))
    y = 110
    sheet.paste(map_img(), (20, y))
    d.text((950, y), "2 Ken 走到博物館（全班分組 mix 模式）→ 抵達鏡頭", fill="black", font=FZ(24))
    for i, (n, cap) in enumerate([("05_walking_museum_a_mix", "走路途中 1"), ("05_walking_museum_b_mix", "走到門口（Zun-Bo）"),
                                  ("06_reveal_museum_mix", "抵達揭曉（分組）"), ("arr_museum", "抵達鏡頭檢查（沒有被擋）")]):
        x, yy = 950 + (i % 2) * 470, y + 36 + (i // 2) * 292
        sheet.paste(shot(n, 460, 259), (x, yy))
        d.text((x, yy + 260), cap, fill=(60, 60, 60), font=FR(20))
    y = 760
    d.text((20, y), "3 外觀特寫", fill="black", font=FZ(24))
    for i, (n, cap) in enumerate([("sign_museum", "正面：屋頂 MUSEUM、立牌、火車頭"),
                                  ("p04_reveal_museum", "個人模式：Ken 走到博物館揭曉"),
                                  ("06_reveal_museum_where", "問路模式 Where's the museum? 抵達")]):
        x = 20 + i * 630
        sheet.paste(shot(n, 620, 349), (x, y + 36))
        d.text((x, y + 388), cap, fill=(60, 60, 60), font=FR(20))
    y = 1210
    d.text((20, y), "4 Listen and Guess 第 11 個地點：It's Sunday. It's cloudy today. → I'm going to the museum. I want to see old trains.",
           fill="black", font=FZ(26))
    d.text((20, y + 44), "環境音 18 秒（請老師選 A 或 B；遊戲先放 A）：0.2 秒蒸汽火車汽笛兩聲＋放汽聲 → 4.4 秒蒸汽機噗噗 → 背景一直有遠處導覽的模糊人聲（聽不出字；",
           fill=(50, 50, 50), font=FR(22))
    d.text((20, y + 76), "語音辨識中英文都沒有字）→ 9.2 秒木地板慢慢的腳步 → 15.4、16.6 秒相機快門兩下。A、B 用不同的 AI 素材。檔案：資料/museum/museum_A.mp3、museum_B.mp3",
           fill=(50, 50, 50), font=FR(22))
    d.text((20, y + 124), "兩個圖示（無字）", fill="black", font=FZ(22))
    for i in range(2):
        ic = Image.open(os.path.join(LIS, "icons", f"museum_{i + 1}.png")).convert("RGB").resize((200, 200))
        sheet.paste(ic, (20 + i * 215, y + 160))
        d.rectangle((20 + i * 215, y + 160, 220 + i * 215, y + 360), outline="#bbb")
        d.text((20 + i * 215, y + 364), ["圖示 1：展品圍欄（較不明顯）", "圖示 2：展示台上的火車頭"][i], fill=(60, 60, 60), font=FR(16))
    plan = json.load(open(os.path.join(LIS, "video", "sfx", "museum", "plan.json"), encoding="utf-8"))["events"]
    src = os.path.join(LIS, "museum_mime_sfx.mp4")
    times = [0.5, 1.0, 1.85, 2.25, 3.3, 4.25, 5.25, 5.75, 6.8, 7.6]
    fw = 280
    fh = fw * 9 // 16
    fr = frames(src, times, fw)
    x0 = 470
    d.text((x0, y + 124), "默劇 8 秒（KIE Seedance 480p；手一直是空的，沒有道具、沒有字）＋音效（-20 LUFS、沒有說話）；紅框＝這格有音效",
           fill="black", font=FZ(22))
    for i, (t, im) in enumerate(zip(times, fr)):
        x, yy = x0 + (i % 5) * (fw + 8), y + 160 + (i // 5) * (fh + 34)
        sheet.paste(im, (x, yy))
        hit = sorted([e for e in plan if e["start"] - 0.15 <= t <= e["start"] + max(e["len"], 0.3)], key=lambda e: -e["start"])
        if hit:
            d.rectangle((x - 3, yy - 3, x + fw + 3, yy + fh + 3), outline="red", width=4)
        lab = f"{t:.2f} 秒" + (("　" + hit[0]["label"]) if hit else "")
        d.text((x, yy + fh + 4), lab, fill="red" if hit else (60, 60, 60), font=FR(16))
    yy = y + 160 + 2 * (fh + 34) + 6
    d.text((x0, yy), "動作：0.5 舉一根手指（買一張）→ 1.75 手往前付錢【投幣＋售票機嗶 1.75】→ 3.2–4.9 手背在後面安靜踮腳走【輕腳步 3.2】→ 5.0–5.9 抬頭指大展品",
           fill=(40, 40, 40), font=FR(19))
    d.text((x0, yy + 28), "→ 6.4–7.3 雙手比框框、眨一隻眼拍照【相機快門喀嚓 6.8】→ 7.5 比讚。檔案：資料/museum/museum_mime_sfx.mp4",
           fill=(40, 40, 40), font=FR(19))
    b = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-f", "f32le", "-ac", "1", "-ar", "8000", "-"], capture_output=True).stdout
    a = np.frombuffer(b, np.float32)
    wy, wh, wx, ww = yy + 84, 80, x0, 5 * (fw + 8) - 8
    d.text((wx, wy - 26), "音效波形（0–8 秒，紅線＝音效開始）", fill=(60, 60, 60), font=FR(18))
    d.rectangle((wx, wy, wx + ww, wy + wh), outline="#999")
    step = max(1, len(a) // ww)
    peak = float(np.abs(a).max()) or 1.0
    for i in range(ww):
        seg = a[i * step:(i + 1) * step]
        if len(seg):
            v = float(np.abs(seg).max()) / peak
            d.line((wx + i, wy + wh / 2 - v * wh / 2, wx + i, wy + wh / 2 + v * wh / 2), fill=(40, 90, 200))
    for e in plan:
        ex = wx + e["start"] / 8.04 * ww
        d.line((ex, wy, ex, wy + wh), fill="red", width=2)
        d.text((ex + 3, wy + wh + 2), f'{e["start"]}s', fill="red", font=FR(16))
    out = os.path.join(HERE, "museum-check-v1.png")
    sheet.save(out)
    print(out)


if __name__ == "__main__":
    main()
