"""S03 課堂版試片合成：第 1 次（正常速度）→ 翻頁 → 第 2 次（慢速）→ 跟唸 3 秒＋中文小卡。
  python src/compose_s03.py <renders_dir>     （renders_dir 內有 full_r1/、full_r2/ 的偶數格 PNG）
輸出 out/S03-pilot.mp4（字幕版）與 out/S03-pilot-listen.mp4（聽力版：沒有字幕、沒有小卡文字的句子）。
"""
import json, math, shutil, subprocess, sys, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OV = ROOT.parent / "opening-video"
FONTS = OV / "work" / "fonts"
EN = str(FONTS / "ComicRelief-Regular.ttf"); ZH = str(FONTS / "msjhbd.ttc")
W, H, FPS, SR = 1920, 1080, 24, 48000
LEAD, PAGE, HOLD2, XF = 0.5, 1.2, 0.8, 0.4
WORK = ROOT / "work" / "s03"; OUT = ROOT / "out"
SID = "S03"
ZH_LINE = "很久以前，在 1620 年，一艘船從英國航行到美洲。"
KW_EN = {"1620", "ship", "England", "America"}
KW_ZH = ["1620", "船", "英國", "美洲"]
CARDS = [("1620", "一六二〇年"), ("ship", "船"), ("England", "英國"), ("America", "美洲")]
YEARS = ["1620", "1621", "1863", "Today"]; NOW = 0
SAY = 3.0; PAUSE = 0.8 + SAY + 0.8
RED = (230, 60, 60); GOLD = (255, 215, 0)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        print(r.stderr[-3000:]); raise SystemExit("ffmpeg failed")


def f(sz, zh=False): return ImageFont.truetype(ZH if zh else EN, sz)


def seq(src, dst):
    """偶數格 f0000,f0002… → 連號 0000,0001…（每張放 2 格＝12 fps 定格）"""
    if dst.exists(): shutil.rmtree(dst)
    dst.mkdir(parents=True)
    fs = sorted(src.glob("f*.png"))
    for i, p in enumerate(fs): shutil.copy(p, dst / f"{i:04d}.png")
    return fs, len(fs) / 12.0


# ---------- 角落時間軸 ----------
def timeline(now=NOW):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    x0, x1, y = 1330, 1850, 78
    d.rounded_rectangle([x0 - 50, 22, x1 + 50, 140], radius=30, fill=(20, 18, 40, 170))
    d.line([(x0, y), (x1, y)], fill=(230, 220, 200, 230), width=6)
    for i, yr in enumerate(YEARS):
        x = x0 + (x1 - x0) * i / 3
        if i == now:
            for r, a in ((34, 60), (26, 110)): d.ellipse([x - r, y - r, x + r, y + r], fill=GOLD + (a,))
            d.ellipse([x - 17, y - 17, x + 17, y + 17], fill=GOLD + (255,), outline=(255, 255, 255, 255), width=3)
        else:
            d.ellipse([x - 10, y - 10, x + 10, y + 10], fill=(150, 145, 160, 255))
        fn = f(34 if i == now else 26)
        d.text((x, y + 40), yr, font=fn, anchor="mm", fill=(GOLD if i == now else (200, 195, 210)) + (255,))
    return im


# ---------- 字幕（ASS，卡拉 OK，關鍵字紅色＋中文句意） ----------
def ts(t): t = max(0, t); return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def ass_lines(reads):
    words = json.load(open(OV / "voices" / "words.json", encoding="utf-8"))[SID]
    full = words["text"]
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Comic Relief,76,&H0000D7FF,&H00FFFFFF,&H00301A08,&H64000000,0,0,0,0,100,100,0,0,1,6,2,2,80,80,118,1
Style: Zh,Microsoft JhengHei,50,&H00FFFFFF,&H00FFFFFF,&H00301A08,&H64000000,1,0,0,0,100,100,0,0,1,5,2,2,80,80,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    RED_ASS = "&H003C3CE6&"
    zh = ZH_LINE
    for k in KW_ZH: zh = zh.replace(k, f"{{\\c{RED_ASS}}}{k}{{\\c&H00FFFFFF&}}")
    ev = []
    for start, end, take in reads:
        ws = words[f"take{take}"]; parts, prev, pos = [], start + LEAD + ws[0]["t"] - 0.25, 0
        a = prev
        for w in ws:
            t0 = start + LEAD + w["t"]
            if t0 - prev > 0.02: parts.append(f"{{\\k{int((t0 - prev) * 100)}}}")
            i = full.find(w["w"].split()[0], pos); j = full.find(w["w"].split()[-1], i) + len(w["w"].split()[-1])
            while j < len(full) and full[j] in ",.!?": j += 1
            shown, pos = full[i:j], j
            kw = any(k in shown for k in KW_EN)
            col = f"{{\\1c{RED_ASS}\\2c{RED_ASS}}}" if kw else ""
            back = "{\\1c&H0000D7FF&\\2c&H00FFFFFF&}" if kw else ""
            parts.append(f"{{\\kf{max(1, int(w['d'] * 100))}}}{col}{shown}{back} "); prev = t0 + w["d"]
        ev.append(f"Dialogue: 0,{ts(a)},{ts(end)},Sub,,0,0,0,,{''.join(parts).strip()}")
        ev.append(f"Dialogue: 0,{ts(a)},{ts(end)},Zh,,0,0,0,,{zh}")
    return head + "\n".join(ev) + "\n"


# ---------- 跟唸段：關鍵字發亮、3-2-1、中文小卡 ----------
def pause_frames(bg_png, dst, sentence=True):
    if dst.exists(): shutil.rmtree(dst)
    dst.mkdir(parents=True)
    bg = Image.open(bg_png).convert("RGBA").resize((W, H))
    bg = Image.alpha_composite(bg.filter(ImageFilter.GaussianBlur(3)), Image.new("RGBA", (W, H), (10, 8, 25, 120)))
    tl = timeline()
    line1, line2 = "Long ago, in 1620,", "a ship sailed from England to America."
    n = int(round(PAUSE * FPS))
    for i in range(n):
        t = i / FPS; im = bg.copy(); d = ImageDraw.Draw(im)
        # 中文小卡：依序彈出
        cw, ch, gap = 360, 190, 40; x0 = (W - (4 * cw + 3 * gap)) / 2; y0 = 285
        for k, (en, zh) in enumerate(CARDS):
            u = min(1, max(0, (t - 0.15 * k) / 0.3))
            if u <= 0: continue
            s = 0.6 + 0.4 * u + 0.12 * math.sin(math.pi * u)
            cx, cy = x0 + k * (cw + gap) + cw / 2, y0 + ch / 2
            w2, h2 = cw * s / 2, ch * s / 2
            d.rounded_rectangle([cx - w2, cy - h2, cx + w2, cy + h2], radius=int(28 * s), fill=(255, 248, 230, 255), outline=(200, 90, 40, 255), width=6)
            d.text((cx, cy - 32 * s), en, font=f(int(64 * s)), anchor="mm", fill=RED + (255,))
            d.text((cx, cy + 48 * s), zh, font=f(int(52 * s), True), anchor="mm", fill=(80, 40, 20, 255))
        # 句子：關鍵字黃色光暈一閃一閃
        glow = 0.6 + 0.4 * math.sin(t * 6)
        for row, line in enumerate((line1, line2) if sentence else ()):
            fn = f(80); tw = d.textlength(line, font=fn); x = (W - tw) / 2; y = 575 + row * 112
            for tok in line.split(" "):
                bare = tok.strip(",.")
                wl = d.textlength(tok, font=fn)
                if bare in KW_EN:
                    bw = d.textlength(bare, font=fn)
                    d.rounded_rectangle([x - 12, y - 6, x + bw + 12, y + 100], radius=22, fill=(255, 220, 90, int(150 * glow)))
                    d.text((x, y), bare, font=fn, fill=RED + (255,), stroke_width=4, stroke_fill=(255, 255, 255, 255))
                    d.text((x + bw, y), tok[len(bare):], font=fn, fill=(255, 255, 255, 255), stroke_width=5, stroke_fill=(48, 26, 8, 255))
                else:
                    d.text((x, y), tok, font=fn, fill=(255, 255, 255, 255), stroke_width=5, stroke_fill=(48, 26, 8, 255))
                x += wl + d.textlength(" ", font=fn)
        zf = f(54, True); zl = d.textlength(ZH_LINE, font=zf)
        if sentence: d.text(((W - zl) / 2, 830), ZH_LINE, font=zf, fill=(255, 255, 255, 255), stroke_width=5, stroke_fill=(48, 26, 8, 255))
        # Say it! 3-2-1
        if 0.6 <= t < 0.8 + SAY + 0.2:
            k = min(1, (t - 0.6) / 0.25); bx, by = 260, 150
            d.ellipse([bx - 200 * k, by - 105 * k, bx + 200 * k, by + 105 * k], fill=(255, 255, 255, 245), outline=(230, 120, 40, 255), width=7)
            d.text((bx, by - 30 * k), "Say it! 跟著念", font=f(int(52 * k), True), anchor="mm", fill=(220, 60, 30, 255))
            if 0.8 <= t < 0.8 + SAY:
                num = 3 - int(t - 0.8); u = (t - 0.8) % 1; z = 1.25 - 0.25 * min(1, u / 0.25)
                d.text((bx, by + 45 * k), str(num), font=f(int(78 * z)), anchor="mm", fill=(90, 70, 200, 255))
        im.alpha_composite(tl)
        im.convert("RGB").save(dst / f"{i:04d}.png")
    return n / FPS


def tick(at_list, total):
    buf = np.zeros(int(total * SR), np.float32)
    for at in at_list:
        n = int(0.09 * SR); tt = np.arange(n) / SR
        s = 0.35 * np.sin(2 * np.pi * 1320 * tt) * np.exp(-tt * 40)
        i = int(at * SR); buf[i:i + n] += s[: len(buf) - i]
    return buf


def main(rd):
    WORK.mkdir(parents=True, exist_ok=True); OUT.mkdir(exist_ok=True)
    f1, D1 = seq(Path(rd) / "full_r1", WORK / "r1"); f2, D2 = seq(Path(rd) / "full_r2", WORK / "r2")
    DP = pause_frames(f1[-1], WORK / "pause"); pause_frames(f1[-1], WORK / "pause_listen", sentence=False)
    T2 = D1 + HOLD2                      # 第 2 次片段在成片中的開始時間
    TP = T2 + D2 - XF                    # 跟唸段開始
    TOTAL = TP + DP
    timeline().save(WORK / "timeline.png")
    for name, with_subs in (("S03-pilot", True), ("S03-pilot-listen", False)):
        (WORK / "subs.ass").write_text(ass_lines([(0, D1 + 0.3, 1), (T2, T2 + D2 - XF, 2)]), encoding="utf-8")
        sub = "subtitles=subs.ass:fontsdir=fonts," if with_subs else ""
        fc = (f"[0:v]fps=24,tpad=stop_mode=clone:stop_duration={PAGE}[a];"
              f"[1:v]fps=24,tpad=start_mode=clone:start_duration={HOLD2}[b];"
              f"[a][b]xfade=transition=slideleft:duration={PAGE}:offset={D1:.3f}[ab];"
              f"[2:v]fps=24[p];[ab][p]xfade=transition=fade:duration={XF}:offset={TP:.3f}[v0];"
              f"[v0][3:v]overlay=0:0:enable='lt(t,{TP:.3f})'[v1];[v1]{sub}format=yuv420p[v]")
        # 聲音：兩次配音＋voyage 配樂（小聲）＋倒數嗶聲
        mus = OV / "music" / "voyage" / "s23" / "tg_voyage_23_00001_(Instrumental)_model_bs_roformer_ep_317_sdr_12.wav"
        tk = tick([TP + 0.8 + k for k in range(3)], TOTAL + 1)
        with wave.open(str(WORK / "tick.wav"), "wb") as g:
            g.setnchannels(1); g.setsampwidth(2); g.setframerate(SR); g.writeframes((tk * 32767).astype("<i2").tobytes())
        af = (f"[4:a]adelay={int(LEAD * 1000)}|{int(LEAD * 1000)}[v1];"
              f"[5:a]adelay={int((T2 + LEAD) * 1000)}|{int((T2 + LEAD) * 1000)}[v2];"
              f"[6:a]atrim=0:{TOTAL + 1:.2f},volume=0.16,afade=t=out:st={TOTAL - 1.5:.2f}:d=1.5[m];"
              f"[v1][v2][m][7:a]amix=inputs=4:normalize=0,loudnorm=I=-16:TP=-1.5,atrim=0:{TOTAL:.2f}[a]")
        cmd = ["ffmpeg", "-y", "-nostdin",
               "-framerate", "12", "-i", "r1/%04d.png", "-framerate", "12", "-i", "r2/%04d.png",
               "-framerate", "24", "-i", ("pause" if with_subs else "pause_listen") + "/%04d.png", "-i", "timeline.png",
               "-i", str(OV / "voices" / f"{SID}_1.mp3"), "-i", str(OV / "voices" / f"{SID}_2.mp3"),
               "-i", str(mus), "-i", "tick.wav",
               "-filter_complex", fc + ";" + af, "-map", "[v]", "-map", "[a]",
               "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-c:a", "aac", "-b:a", "192k",
               "-t", f"{TOTAL:.2f}", str(OUT / f"{name}.mp4")]
        if not (WORK / "fonts").exists(): shutil.copytree(FONTS, WORK / "fonts")
        r = subprocess.run(cmd, cwd=WORK, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode: print(r.stderr[-3000:]); raise SystemExit(1)
        print(name, f"{TOTAL:.2f}s", flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
