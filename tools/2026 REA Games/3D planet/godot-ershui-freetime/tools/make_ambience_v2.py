"""Listen and Guess 環境音 v2（老師 11/08：餐廳、飲料店、學校、郵局學生猜不出來 → 依 YouTube 環境音研究重做 8 個地點）。

研究：scratchpad ambience_research.md（重點：招牌聲放前 3 秒；共用的聲音分給一個地點就好；
叮咚＋叫號只給郵局、掃描嗶只給超市、冰塊只給飲料店、戶外小孩＋鳥只給公園；不用超商電子門鈴）。
層的種類：
  kie   ：資料/ambience/<地點>/<層>_<0|1>.mp3（沒有就用 KIE Suno Sounds 生成，每層 2.5 點）
  tts   ：一句台灣口音中文（edge-tts zh-TW），可加「喇叭」濾波（PA）
  bell  ：程式合成學校西敏寺鐘聲（C4 E4 D4 G3 | C4 D4 E4 C4，走廊喇叭音色＋迴音）
輸出：資料/ambience/v2/<地點>_A.mp3、_B.mp3（A／B 用不同的 AI 素材）。
用法：python -I tools/make_ambience_v2.py [地點...]
"""
import asyncio, os, subprocess, sys, tempfile
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_ambience as M          # load / best_window / fade / gain_to / gen 的 KIE 呼叫

SR = M.SR
ROOT = M.ROOT
OUT = os.path.join(ROOT, "v2")
VOICE_F = "zh-TW-HsiaoChenNeural"
VOICE_M = "zh-TW-YunJheNeural"

DUR = 18.0   # 老師 11/08：每段 18 秒
# 新增的 KIE 層（其他層沿用已生成的素材）
NEW_KIE = {
    "post": {"tape": "Packing tape being pulled off a roll and pressed onto a cardboard parcel box, loud tape screech, then the box set down on a counter.",
             "printer": "A small receipt printer at a post office counter printing a slip with a fast buzzing chatter, then coins dropped into a metal change tray."},
    "supermarket": {"coins": "A cashier handing back change: coins clinking into a hand and a paper receipt being torn off."},
    "library": {"pencil": "A pencil writing quickly on paper at a quiet desk, scratching strokes, close up.",
                "booktable": "A heavy hardcover book placed gently on a wooden table, then a chair slid back softly on the floor."},
    "hospital": {"babycry": "A toddler crying and whimpering briefly in a doctor's waiting room, a little distance away.",
                 "siren": "A distant ambulance siren passing by outside, Taiwanese ambulance two-tone wail, heard from indoors."},
    "restaurant": {"wok2": "Taiwanese stir-fry restaurant kitchen: a huge gas burner roaring, oil sizzling loudly as food hits a hot wok, metal spatula clanging rhythmically on the wok."},
}

# (種類, 參數..., 開始秒, 長度秒, 增益 dB)
#   kie／kieB：一段素材（B＝換另一段）；long：兩段素材接起來（交叉淡入淡出）再取需要的長度；
#   longboth：兩條 long 疊在一起＋輕壓縮（誇張）；tts；bell
# 老師 11/08：18 秒＝把每個地點「重點聲音」拉長，不是整串重複
PLAN = {
    "post": [("kie", "bed", 0, 18, 0), ("kie", "chime", 0.0, 1.3, 0), ("tts", "來賓一百零五號，請到三號櫃檯。", VOICE_F, True, 1.1, 3),
             ("long", "stamp", 4.0, 4.2, 6), ("kie", "tape", 8.3, 2.2, 0), ("long", "counter", 10.6, 4.2, 0),
             ("kie", "printer", 15.0, 1.8, 0), ("kie", "mailbox", 16.6, 1.4, -2)],
    "supermarket": [("kie", "bed", 0, 18, 0), ("long", "scan", 0.1, 6.0, 2), ("kie", "cart", 6.2, 2.6, 0),
                    ("tts", "請支援收銀，謝謝。", VOICE_F, True, 8.9, -4), ("long", "bagpack", 10.8, 6.0, 1),
                    ("kie", "coins", 16.4, 1.6, -2)],
    "school": [("kie", "bed", 0, 18, 0), ("bell", 0.1, 6), ("long", "cheer", 8.6, 4.6, -1), ("long", "ball", 12.8, 5.2, 1),
               ("kie", "whistle", 16.7, 1.2, -4)],
    "library": [("kie", "bed", 0, 18, 0), ("kie", "pages", 0.2, 3.4, 2), ("kie", "steps", 3.8, 2.0, -4), ("kie", "pencil", 5.9, 2.6, -2),
                ("kie", "booktable", 8.6, 1.8, -2), ("kieB", "pages", 10.5, 2.2, 1), ("long", "shh2", 12.8, 5.2, 0)],
    "hospital": [("kie", "bed", 0, 18, 0), ("long", "cough2", 0.1, 5.0, 2), ("tts", "九號，請進。", VOICE_F, True, 5.3, 0),
                 ("kie", "babycry", 7.0, 2.4, -3), ("kie", "thermo", 9.6, 1.3, 0), ("kie", "trolley", 11.0, 2.8, -1),
                 ("long", "cough", 13.9, 4.1, 2), ("kie", "siren", 15.6, 2.4, -10)],
    "park": [("kie", "bed", 0, 18, 0), ("kie", "birds", 0.0, 3.0, 2), ("long", "swing", 2.4, 7.0, 2), ("long", "dog", 9.3, 5.0, -1),
             ("kie", "kids", 14.0, 2.2, -2), ("kieB", "birds", 15.6, 2.4, 1)],
    # 餐廳：吃東西聲 8 秒（誇張）；沒有中文句子
    "restaurant": [("kie", "bed", 0, 18, 0), ("kie", "wok2", 0.1, 3.3, 2), ("kie", "dishes", 3.4, 2.4, 4), ("kie", "cutlery", 5.0, 1.4, 2),
                   ("longboth", "chew", 6.3, 8.0, 10), ("longboth", "slurp", 9.5, 2.6, 5), ("kieB", "dishes", 14.5, 1.8, 4),
                   ("kieB", "cutlery", 16.2, 1.8, 2)],
    # 飲料店：吸飲料、吸珍珠 8 秒（誇張）；沒有中文句子
    "tea": [("kie", "bed", 0, 18, 0), ("kie", "shaker", 0.1, 3.0, 2), ("kie", "sealer", 3.2, 1.9, 2), ("kie", "straw", 5.2, 0.9, 0),
            ("longboth", "sip", 6.1, 8.0, 11), ("kieB", "shaker", 14.3, 2.0, 0), ("kie", "ice", 16.2, 1.8, -1)],
}
NEW_KIE["library"]["shh2"] = ("A friendly librarian hushing children in a quiet library: a long soft human 'shhhhh' through the teeth, "
                              "a short pause, then another longer gentle 'shhhhhh', close and natural, real human breath.")
NEW_KIE["supermarket"]["bagpack"] = ("A cashier packing groceries into a thin plastic shopping bag for several seconds: plastic bag rustling and "
                                     "crinkling loudly, bottles and boxes placed in, the bag handles pulled and tied.")


def gen_new(place):
    import kie
    d = os.path.join(ROOT, place)
    for layer, prompt in NEW_KIE.get(place, {}).items():
        if os.path.exists(os.path.join(d, layer + "_0.mp3")):
            continue
        t = kie.create("ai-music-api/sounds", {"prompt": prompt + M.TAIL, "model": "V5", "sound_loop": False})
        r = kie.wait(t)
        for i, c in enumerate(((r.get("response") or {}).get("data") or [])[:2]):
            kie.download(c["audio_url"], os.path.join(d, f"{layer}_{i}.mp3"))
        print("generated", place, layer, flush=True)


def tts(text, voice, pa):
    import edge_tts
    fd, mp3 = tempfile.mkstemp(suffix=".mp3"); os.close(fd)
    asyncio.run(edge_tts.Communicate(text, voice, rate="-5%").save(mp3))
    x = M.load(mp3)
    os.remove(mp3)
    if pa:   # 喇叭／廣播：300–3400 Hz、加一點殘響
        x = _band(x, 300, 3400)
        x = _reverb(x, 0.22, 0.35)
    return x


def _band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] *= 0.05
    return np.fft.irfft(X, len(x)).astype(np.float32)


def _reverb(x, decay, wet):
    ir_len = int(SR * 1.2)
    t = np.arange(ir_len) / SR
    rng = np.random.default_rng(7)
    ir = rng.standard_normal(ir_len) * np.exp(-t / decay)
    ir[0] = 1.0
    y = np.convolve(x, ir / np.abs(ir).sum() * 6.0)[: len(x) + ir_len // 2]
    out = np.zeros(len(y), np.float32)
    out[: len(x)] += x * (1 - wet)
    out += y * wet
    return out


def bell():
    """學校西敏寺鐘聲：前兩句 C4 E4 D4 G3 | C4 D4 E4 C4（原調移到 E 大調），每句 2.1 秒。"""
    E4, F4, G4, B3 = 329.63, 369.99, 415.30, 246.94
    notes = [E4, G4, F4, B3, E4, F4, G4, E4, G4, E4, F4, B3, B3, F4, G4, E4]   # 完整 4 句（老師 11/08：18 秒版）
    durs = [0.40, 0.40, 0.40, 0.90] * 4
    total = int(SR * (sum(durs) + 1.6))
    out = np.zeros(total, np.float32)
    t0 = 0.0
    for f0, d in zip(notes, durs):
        n = int(SR * 2.2)
        t = np.arange(n) / SR
        env = np.exp(-t / 0.9) * (1 - np.exp(-t / 0.004))
        tone = (np.sin(2 * np.pi * f0 * t) + 0.5 * np.sin(2 * np.pi * f0 * 2.01 * t) * np.exp(-t / 0.4)
                + 0.25 * np.sin(2 * np.pi * f0 * 3.0 * t) * np.exp(-t / 0.25) + 0.12 * np.sin(2 * np.pi * f0 * 4.2 * t) * np.exp(-t / 0.15))
        i = int(SR * t0)
        seg = (tone * env).astype(np.float32)
        out[i:i + n] += seg[: total - i]
        t0 += d
    out = _band(out, 250, 4000)        # 走廊喇叭
    return _reverb(out, 0.5, 0.45)


def mix(place):
    os.makedirs(OUT, exist_ok=True)
    d = os.path.join(ROOT, place)
    for tag, v in (("A", 0), ("B", 1)):
        out = np.zeros(int(SR * DUR), np.float32)
        for L in PLAN[place]:
            kind = L[0]
            if kind in ("long", "longboth"):
                _, name, st, ln, db = L
                def joined(first):
                    a0 = M.load(os.path.join(d, f"{name}_{first}.mp3"))
                    b0p = os.path.join(d, f"{name}_{1 - first}.mp3")
                    parts = [a0] + ([M.load(b0p)] if os.path.exists(b0p) else [])
                    xf = int(0.3 * SR)
                    out_s = parts[0]
                    while len(out_s) < int(ln * SR) + xf:
                        for q in parts[1:] + parts[:1]:
                            ramp = np.linspace(0, 1, xf, dtype=np.float32)
                            out_s = np.concatenate([out_s[:-xf], out_s[-xf:] * (1 - ramp) + q[:xf] * ramp, q[xf:]])
                            if len(out_s) >= int(ln * SR) + xf:
                                break
                    return M.best_window(out_s, int(ln * SR))
                seg = joined(v)
                if kind == "longboth":
                    seg = seg + joined(1 - v) * 0.8
                act = seg[np.abs(seg) > 0.05 * (np.abs(seg).max() + 1e-9)]
                seg = seg * M.gain_to(act if len(act) > SR // 20 else seg, -16 + db)
                if kind == "longboth":
                    seg = np.tanh(seg * 1.4) / 1.4
                seg = M.fade(seg.astype(np.float32), 0.05, 0.3)
            elif kind == "both":   # 同一種聲音的兩段素材疊在一起（更厚、更誇張）
                _, name, st, ln, db = L
                segs = [M.best_window(M.load(os.path.join(d, f"{name}_{k}.mp3")), int(ln * SR)) for k in (0, 1)]
                seg = segs[0] + segs[1] * 0.8
                act = seg[np.abs(seg) > 0.05 * (np.abs(seg).max() + 1e-9)]
                seg = np.tanh(seg * M.gain_to(act, -16 + db) * 1.4) / 1.4      # 輕微壓縮，聲音更「近」
                seg = M.fade(seg.astype(np.float32), 0.05, 0.3)
            elif kind in ("kie", "kieB"):
                _, name, st, ln, db = L
                vv = (1 - v) if kind == "kieB" else v     # kieB＝第二次出現時換另一段素材
                f = os.path.join(d, f"{name}_{vv}.mp3")
                if not os.path.exists(f):
                    f = os.path.join(d, f"{name}_0.mp3")
                src = M.load(f)
                if name == "bed" and len(src) < int(ln * SR):
                    # 背景比 18 秒短：首尾交叉淡入淡出接起來，不會突然安靜
                    xf = int(0.8 * SR)
                    loop = src.copy()
                    while len(loop) < int(ln * SR) + xf:
                        ramp = np.linspace(0, 1, xf, dtype=np.float32)
                        loop = np.concatenate([loop[:-xf], loop[-xf:] * (1 - ramp) + src[:xf] * ramp, src[xf:]])
                    src = loop
                seg = M.best_window(src, int(ln * SR))
                if name == "bed":
                    seg = seg * M.gain_to(seg, -36)
                else:
                    act = seg[np.abs(seg) > 0.05 * (np.abs(seg).max() + 1e-9)]
                    seg = seg * M.gain_to(act if len(act) > SR // 20 else seg, -16 + db)
                seg = M.fade(seg.astype(np.float32))
            elif kind == "tts":
                _, text, voice, pa, st, db = L
                seg = tts(text, voice, pa)
                act = seg[np.abs(seg) > 0.05 * (np.abs(seg).max() + 1e-9)]
                seg = M.fade((seg * M.gain_to(act, -17 + db)).astype(np.float32), 0.02, 0.1)
            else:   # bell
                _, st, db = L
                seg = bell()
                act = seg[np.abs(seg) > 0.05 * (np.abs(seg).max() + 1e-9)]
                seg = M.fade((seg * M.gain_to(act, -15 + db)).astype(np.float32), 0.01, 0.4)
            i = int(st * SR)
            out[i:i + len(seg)] += seg[: max(0, len(out) - i)]
        out = M.fade(out, 0.15, 0.6)
        fd, tmp = tempfile.mkstemp(suffix=".f32"); os.close(fd)
        out.tofile(tmp)
        dst = os.path.join(OUT, f"{place}_{tag}.mp3")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", tmp,
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=18", "-ar", str(SR), "-ac", "2", "-b:a", "160k", dst], check=True)
        os.remove(tmp)
        print("mixed", place, tag, flush=True)


if __name__ == "__main__":
    for pl in (sys.argv[1:] or list(PLAN)):
        gen_new(pl)
        mix(pl)
