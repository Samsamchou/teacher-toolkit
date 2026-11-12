"""Free Time「看影片」默劇線索加關鍵音效（rdq/RDQ-spec-freetime-mime-sfx-20261112.md）。
做法照 資料/listen-3clues/video/make_mime_sfx.py：每個聲音用 KIE Suno Sounds 生成（每層約 2.5 點、出 2 段），
照抽格（每秒 5–12 張）找到的動作秒數放進去，整段 loudnorm -20 LUFS（比「聽聲音」線索小聲），**不放任何說話聲**。
遊戲端：影片（.ogv）維持無聲，聲音另存 godot-ershui-freetime/assets/clues/video_sfx/<活動>.ogg（從 0 秒開始、和影片一樣長），
game.gd 在影片第一格顯示時才開始播，之後每格和影片位置比對，差太多就 seek（15 fps 也不會越差越多）。
  python -I make_mime_sfx.py gen [act ...]   # 生成缺少的聲音層 → raw/<act>/<layer>_<0|1>.mp3
  python -I make_mime_sfx.py mix [act ...]   # 混音 → godot-ershui-freetime/assets/clues/video_sfx/<act>.ogg ＋ plan/<act>.json ＋ preview/<act>.mp4
"""
import json, os, re, subprocess, sys, tempfile, concurrent.futures as cf
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")
GAME = os.path.normpath(os.path.join(HERE, r"..\..\..\..\godot-ershui-freetime"))
VID = os.path.join(GAME, "assets", "clues", "video")
OUT = os.path.join(GAME, "assets", "clues", "video_sfx")
RAW = os.path.join(HERE, "raw")
SR = 44100
TAIL = " Isolated single sound effect, close-up foley recording, dry, no singing, no speech, no talking, no voices, no words, no crowd."
LAYERS = {
 "baseball": {"crack": "A wooden baseball bat hitting a baseball very hard: one sharp loud clean wooden CRACK, then a short fading whoosh of the ball flying away."},
 "basketball": {"bounce": "A basketball dribbled on a wooden gym floor: single hard rubber ball bounces, thump, thump, thump, slow and evenly spaced, clear separate hits.",
                "swish": "A basketball dropping cleanly through a basketball hoop net: one soft crisp net swish sound, close up."},
 "bike": {"pedal": "A bicycle being pedaled: rhythmic bicycle chain and freewheel clicking, tires rolling softly on a road, steady pace.",
          "bell": "A classic bicycle handlebar bell rung twice with the thumb: bright metal ring-ring, ring-ring."},
 "camping": {"hammer": "A tent peg stake being hammered into hard ground with a mallet: single solid knocks on a metal stake, slow, clearly separated hits.",
             "fire": "A small campfire burning at night: wood crackling and popping, soft whoosh of flames, close up, no insects."},
 "english": {"page": "Turning one page of a paper textbook: a single crisp paper page flip, close up.",
             "pencil": "A pencil writing quickly on paper: scratchy graphite pencil-on-paper writing sound, close up, about two seconds."},
 "games": {"buttons": "Fast button mashing on a plastic video game controller: rapid clicky thumb presses on buttons and a joystick, close up.",
           "win": "A short cheerful retro 8-bit video game level complete jingle, chiptune, about two seconds, instrumental only."},
 "internet": {"click": "A computer mouse clicking: single crisp plastic mouse button clicks, click, pause, click, pause, click, close up.",
              "scroll": "A computer mouse scroll wheel being rolled: fast fine ratcheting ticks of the scroll wheel, close up."},
 "jogging": {"steps": "Running in place in sneakers on a wooden floor: light rhythmic sneaker footsteps, thud thud thud, steady jogging pace, clear separate steps, no breathing."},
 "music": {"beat": "Upbeat pop music leaking quietly from headphones: tinny thin drum beat and bass groove, instrumental only, no vocals, no singing."},
 "recorder": {"tune": "A child playing a simple happy melody on a plastic soprano recorder flute: clear breathy notes, slow, instrumental only."},
 "tv": {"remote": "A TV remote control button pressed and the television changing channel: a small plastic click followed by a short burst of TV static noise, repeated three times with pauses.",
        "cartoon": "Funny cartoon sound effects from a television: a springy boing, a slide whistle going up, a bonk, instrumental only, no voices, no laughter."},
}
# 每支影片：(層, 開始秒, 長度秒, 增益 dB, 說明[, 剪一聲重複放的秒數])
# 秒數照抽格：資料/freetime/mime-sfx-check-v1.png（每秒 5 張全片＋每秒 12 張重點段）
PLAN = {
 "baseball": [("crack", 2.20, 1.2, 4, "揮棒擊中 咔！")],
 "basketball": [("bounce", 0.70, 0.25, 0, "運球 咚（6 下）", [0.70, 1.02, 1.34, 1.66, 1.98, 2.30]),
                ("swish", 3.90, 0.8, -1, "投進 刷網")],
 "bike": [("pedal", 0.45, 1.9, -4, "踩踏板 鏈條聲"), ("bell", 2.40, 1.6, -1, "拇指按車鈴 鈴鈴")],
 "camping": [("hammer", 0.50, 0.3, 2, "敲營釘（3 下）", [0.50, 1.02, 1.50]),
             ("fire", 3.00, 2.9, -5, "營火劈啪")],
 "english": [("page", 2.00, 0.7, 0, "翻頁"), ("pencil", 2.80, 1.3, -3, "在手掌上寫字 沙沙")],
 "games": [("buttons", 0.45, 3.3, -6, "狂按手把按鍵"), ("win", 4.00, 1.8, -3, "過關音樂")],
 "internet": [("click", 0.55, 0.12, 0, "點滑鼠（3 下）", [0.55, 1.15, 1.85]), ("scroll", 2.45, 1.2, -4, "滾輪往下滑")],
 "jogging": [("steps", 0.40, 0.2, 0, "原地跑腳步（9 下）", [round(0.40 + 0.25 * i, 2) for i in range(9)])],
 "music": [("beat", 1.00, 4.9, -8, "耳機漏音的節奏（無歌詞）")],
 "recorder": [("tune", 0.60, 3.0, -3, "吹直笛"), ("tune", 4.60, 1.35, -1, "吸一大口氣再吹")],
 "tv": [("remote", 0.90, 2.8, -3, "按遙控器換台 喀＋雜訊"), ("cartoon", 4.20, 1.7, -4, "卡通音效（無人聲）")],
}


def gen_one(act, layer, prompt):
    import kie
    d = os.path.join(RAW, act); os.makedirs(d, exist_ok=True)
    if os.path.exists(os.path.join(d, layer + "_0.mp3")):
        return f"skip {act} {layer}"
    t = kie.create("ai-music-api/sounds", {"prompt": prompt + TAIL, "model": "V5", "sound_loop": False})
    r = kie.wait(t, every=8)
    got = 0
    for i, c in enumerate(((r.get("response") or {}).get("data") or [])[:2]):
        kie.download(c["audio_url"], os.path.join(d, f"{layer}_{i}.mp3")); got += 1
    if not got:
        res = r.get("result") or {}
        for i, u in enumerate((res.get("resultUrls") or [])[:2]):
            kie.download(u, os.path.join(d, f"{layer}_{i}.mp3")); got += 1
    return f"generated {act} {layer} n={got} state={r.get('state')} {('' if got else json.dumps(r, ensure_ascii=False)[:600])}"


def gen(acts):
    jobs = [(a, l, p) for a in acts for l, p in LAYERS[a].items()]
    with cf.ThreadPoolExecutor(4) as ex:
        for s in ex.map(lambda j: gen_one(*j), jobs):
            print(s, flush=True)


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def gain_to(x, db):
    rms = np.sqrt(np.mean(x ** 2) + 1e-12); return 10 ** ((db - 20 * np.log10(rms)) / 20)


def best_window(x, n):
    if len(x) <= n:
        return np.pad(x, (0, n - len(x)))
    e = np.convolve(x ** 2, np.ones(SR // 10), "same"); cs = np.concatenate([[0], np.cumsum(e)])
    st = np.arange(0, len(x) - n, SR // 20); s = st[np.argmax(cs[st + n] - cs[st])]
    return x[s:s + n]


def fade(x, a=0.02, b=0.25):
    na, nb = min(int(a * SR), len(x) // 2), min(int(b * SR), len(x) // 2)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x


def onset(src, thr=0.3):
    on = np.where(np.abs(src) > np.abs(src).max() * thr)[0]
    return max(0, on[0] - int(0.015 * SR))


def pick(act, layer):
    """raw/<act>/_sel.json 指定用哪一段（0/1）、從第幾秒開始找（offset）；沒有就用 0。"""
    sel = os.path.join(RAW, act, "_sel.json")
    s = json.load(open(sel)).get(layer, 0) if os.path.exists(sel) else 0
    i, off = (s, None) if isinstance(s, int) else (s.get("i", 0), s.get("off"))
    x = load(os.path.join(RAW, act, f"{layer}_{i}.mp3"))
    return (x, False) if off is None else (x[int(off * SR):], True)   # 有 off＝從那一秒照切（不找最響的一段）


def mix(act):
    vid = os.path.join(VID, act + ".ogv")
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", vid], capture_output=True, text=True).stdout)
    out = np.zeros(int(SR * dur), np.float32)
    evs = []
    for ev in PLAN[act]:
        layer, st, ln, db, label = ev[:5]
        src, exact = pick(act, layer)
        if len(ev) > 5:   # 剪下第一聲，放在每個指定秒數（照抽格的動作）
            a = onset(src); env = np.abs(src); b = a + int(0.03 * SR)
            while b < len(src) and b < a + int(ln * SR) and env[b:b + int(0.03 * SR)].max() > env.max() * 0.06:
                b += int(0.01 * SR)
            one = fade((src[a:b] * gain_to(src[a:b], -16 + db)).astype(np.float32), 0.003, min(0.06, (b - a) / SR / 3))
            for t in ev[5]:
                i = int(t * SR); out[i:i + len(one)] += one[: max(0, len(out) - i)]
            evs.append({"layer": layer, "start": st, "len": round(len(one) / SR + (ev[5][-1] - ev[5][0]), 2), "db": db, "label": label, "hits": list(ev[5])})
            continue
        if exact:
            seg = np.pad(src[:int(ln * SR)], (0, max(0, int(ln * SR) - len(src))))
        elif ln <= 1.2:   # 短的打擊聲：從聲音真正開始的那一點切
            a0 = onset(src); seg = src[a0:a0 + int(ln * SR)]
        else:
            seg = best_window(src, int(ln * SR))
        part = seg[np.abs(seg) > 0.05 * (np.abs(seg).max() + 1e-9)]
        seg = fade((seg * gain_to(part if len(part) > SR // 20 else seg, -16 + db)).astype(np.float32), 0.02 if ln <= 1.2 else 0.12, 0.25)
        i = int(st * SR); out[i:i + len(seg)] += seg[: max(0, len(out) - i)]
        evs.append({"layer": layer, "start": st, "len": ln, "db": db, "label": label})
    fd, tmp = tempfile.mkstemp(suffix=".f32"); os.close(fd); out.tofile(tmp)
    os.makedirs(OUT, exist_ok=True); os.makedirs(os.path.join(HERE, "preview"), exist_ok=True)
    wav = os.path.join(HERE, "preview", act + "_mix.wav")
    # 整段 -20 LUFS（「聽聲音」線索約 -16），真峰值 -2；長度＝影片長度，從 0 秒開始（和影片同一時間軸）
    # 兩段式：先量整段響度，再一次調到 -20 LUFS，超過 -1.5 dB 的尖峰用 limiter 壓（loudnorm 單段對稀疏的打擊聲會差到 ±6 LU）
    def measure(path, fmt=None):
        a = ["ffmpeg", "-hide_banner", "-nostats"] + (["-f", "f32le", "-ar", str(SR), "-ac", "1"] if fmt else []) + ["-i", path, "-af", "ebur128", "-f", "null", "-"]
        e = subprocess.run(a, capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
        return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", e)[-1])
    I0 = measure(tmp, True)
    g = -20.0 - I0
    for _ in range(3):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", tmp,
                        "-af", f"volume={g:.2f}dB,alimiter=limit=0.84:attack=1:release=40:level=disabled,apad", "-t", f"{dur:.3f}",
                        "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", wav], check=True)
        I1 = measure(wav)
        if abs(I1 + 20.0) <= 0.5:
            break
        g += -20.0 - I1   # limiter 壓掉尖峰後變小聲 → 再補
    os.remove(tmp)
    ogg = os.path.join(OUT, act + ".ogg")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-c:a", "libvorbis", "-q:a", "3", ogg], check=True)
    mp4 = os.path.join(HERE, "preview", act + ".mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", vid, "-i", wav, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-crf", "23", "-c:a", "aac", "-b:a", "96k", "-shortest", mp4], check=True)
    os.makedirs(os.path.join(HERE, "plan"), exist_ok=True)
    json.dump({"act": act, "events": evs}, open(os.path.join(HERE, "plan", act + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("mixed", act, os.path.getsize(ogg), flush=True)


if __name__ == "__main__":
    # 老師 11/12：music 維持原本無聲默劇（混好的檔留在 removed/music.ogg，不放進遊戲）
    NO_SFX = {"music"}
    cmd, ids = sys.argv[1], sys.argv[2:] or [k for k in PLAN if k not in NO_SFX]
    if cmd == "gen":
        gen(ids)
    else:
        for k in ids:
            mix(k)
