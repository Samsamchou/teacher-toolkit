"""Listen and Guess 環境音：每個地點的「代表聲音」用 KIE Suno Sounds 分開生成，再疊在小聲的背景上。

用法：
  python -I tools/make_ambience.py gen  [地點...]   # 生成缺少的聲音層（每層 2.5 點，出 2 段）
  python -I tools/make_ambience.py mix  [地點...]   # 混成 10 秒 A／B 兩版，-16 LUFS
素材：3D planet/資料/ambience/<地點>/<層>_<0|1>.mp3；成品：資料/ambience/<地點>_A.mp3、_B.mp3
重點聲音各自拉到同樣響度再疊，背景壓很小（老師要求：重點聲音要大聲，人聲只當背景）。
"""
import os, subprocess, sys, concurrent.futures as cf
import numpy as np

sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")
ROOT = r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\資料\ambience"
SR = 44100
TAIL = " Isolated single sound effect, close-up foley recording, dry, no music, no melody, no singing, no speech."
BEDTAIL = " Steady background ambience, no music, no melody, no singing, no clear words."
# 每層：(提示詞, 開始秒, 長度秒, 額外增益 dB)
P = {
    "post": {
        "bed": ("Quiet indoor room tone of a small public service office: air conditioner hum, very soft distant murmur of a few people.", 0, 10, 0),
        "chime": ("Queue number calling system at a service counter: a clear two-tone electronic ding-dong chime, played once.", 0.2, 1.6, -2),
        "counter": ("Electric banknote counting machine running: fast continuous rapid flicking and riffling of paper bills, mechanical whirr, about 3 seconds.", 1.5, 3.4, 0),
        "stamp": ("A rubber postmark stamp thumping hard onto paper envelopes on a wooden counter, four separate heavy thuds with short pauses.", 5.0, 2.6, 5),
        "mailbox": ("Envelopes dropped one by one into a metal mailbox slot, paper sliding and the metal flap clacking shut.", 7.4, 2.4, 0),
    },
    "supermarket": {
        "bed": ("Inside a small supermarket: soft refrigerator hum, faint distant shoppers murmuring.", 0, 10, 0),
        "scan": ("Supermarket checkout barcode scanner beeping as items are scanned: beep, beep, beep, beep, quick regular beeps.", 0.3, 3.0, 0),
        "drawer": ("Cash register drawer opening with a bell ding and coins clinking, then the drawer slams shut.", 3.4, 1.8, 0),
        "cart": ("A metal shopping cart being pushed across a smooth tiled floor: rattling wire basket and squeaky rolling wheels.", 5.2, 3.0, 0),
        "bag": ("Plastic shopping bag rustling as groceries are packed into it.", 8.2, 1.8, -3),
    },
    "school": {
        "bed": ("Outdoor elementary schoolyard ambience: faint distant children playing and chattering, light breeze.", 0, 10, 0),
        "bell": ("An electronic school bell chime of four bell notes, the Westminster quarters tune, played once like a school bell in Taiwan.", 0.2, 3.6, -1),
        "ball": ("A basketball bouncing on an outdoor concrete court: steady dribbling thumps, then a shot hitting the metal rim.", 3.9, 3.2, 0),
        "whistle": ("A coach blowing a sports whistle twice, sharp short blasts.", 7.2, 1.2, -3),
        "cheer": ("A small group of young children cheering briefly and clapping.", 8.3, 1.7, -2),
    },
    "library": {
        "bed": ("Very quiet library reading room: soft air conditioner hum, almost silent, a chair creaks far away.", 0, 10, 0),
        "pages": ("Turning pages of a paper book one by one, crisp page flips, close up.", 0.3, 3.0, 2),
        "checkout": ("Library self-checkout machine: a book placed on a counter, one short electronic beep confirming, a receipt printing.", 3.4, 2.4, 0),
        "steps": ("Soft quiet footsteps walking slowly on a carpet between bookshelves, a book slid back onto a wooden shelf.", 5.9, 2.4, 0),
        "shh": ("A single soft shhh hushing sound from a librarian asking for quiet.", 8.4, 1.4, -2),
    },
    "hospital": {
        "bed": ("Clinic waiting room ambience: soft air conditioner, quiet murmur, a door opening far away.", 0, 10, 0),
        "callnum": ("Clinic patient number calling system: a short electronic three-tone beep chime announcing the next number.", 0.2, 1.8, -2),
        "cough2": ("A sick adult man with a cold coughing out loud: two clear human throat coughs, 'khuh khuh', then clearing his throat. Realistic human cough, close up.", 2.2, 1.6, 0),
        "thermo": ("A digital ear thermometer beeping: one short beep then three quick beeps.", 4.0, 1.8, 0),
        "trolley": ("A medical metal trolley being pushed with glass bottles and instruments gently rattling, wheels rolling on a hospital floor.", 6.0, 3.6, 0),
    },
    "park": {
        "bed": ("Outdoor town park ambience: gentle wind through trees, leaves rustling, distant traffic very faint.", 0, 10, 0),
        "birds": ("Many small birds chirping and singing in trees, sparrows and bulbuls, cheerful.", 0.2, 3.6, 0),
        "swing": ("A playground swing moving back and forth with rhythmic creaking metal chains.", 3.6, 3.0, 0),
        "dog": ("A small dog barking a few times outdoors at a short distance.", 6.7, 1.6, -2),
        "kids": ("Children laughing and giggling happily on a playground for a moment.", 8.2, 1.8, -2),
    },
    "restaurant": {
        "bed": ("Busy small Taiwanese restaurant dining room ambience: diners chatting softly, chopsticks and spoons tapping bowls.", 0, 10, 0),
        "cutlery": ("People eating a meal at a table: metal forks, spoons and chopsticks clinking and scraping on ceramic plates and bowls, close up at the dining table.", 0.3, 3.4, 0),
        "chew": ("A person eating food with mouth noises: chewing, munching and swallowing, a happy 'mmm', close up.", 3.8, 2.6, 2),
        "slurp": ("A person slurping hot noodles from a bowl loudly and sipping soup from a spoon, close up eating sounds.", 6.5, 2.0, 1),
        "dishes": ("A waiter putting ceramic plates and bowls down on a table, plates clinking together.", 8.5, 1.5, -1),
    },
    "tea": {
        "bed": ("Small bubble tea shop counter ambience: fridge hum, quiet street outside, faint customers chatting.", 0, 10, 0),
        "sealer": ("Bubble tea cup sealing machine: a plastic cup pressed into the machine, a mechanical clunk and a hot film sealing whirr, then a click.", 0.3, 2.2, 0),
        "cupshake": ("Shaking a sealed plastic takeaway drink cup full of ice and tea up and down by hand: liquid sloshing and ice cubes rattling inside the plastic cup, about 3 seconds.", 2.6, 3.0, 0),
        "straw": ("Punching a thick plastic straw through a sealed plastic film lid on a drink cup: one sharp pop.", 5.7, 1.0, 0),
        "sip": ("A person sucking a drink through a thick straw: loud slurping sip of bubble milk tea, tapioca pearls sucked up the straw, then a satisfied 'ahh'.", 6.8, 3.0, 2),
    },
}


def gen(place):
    import kie
    d = os.path.join(ROOT, place)
    os.makedirs(d, exist_ok=True)

    def one(layer):
        if os.path.exists(os.path.join(d, layer + "_0.mp3")):
            return layer, "skip"
        txt = P[place][layer][0] + (BEDTAIL if layer == "bed" else TAIL)
        t = kie.create("ai-music-api/sounds", {"prompt": txt, "model": "V5", "sound_loop": layer == "bed"})
        r = kie.wait(t)
        clips = (r.get("response") or {}).get("data") or []
        for i, c in enumerate(clips[:2]):
            kie.download(c["audio_url"], os.path.join(d, f"{layer}_{i}.mp3"))
        return layer, len(clips)

    with cf.ThreadPoolExecutor(5) as ex:
        for res in ex.map(one, P[place]):
            print(place, *res, flush=True)


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def gain_to(x, target_db):
    rms = np.sqrt(np.mean(x ** 2) + 1e-12)
    return 10 ** ((target_db - 20 * np.log10(rms)) / 20)


def best_window(x, n):
    """取能量最高的一段（避開開頭的空白）。"""
    if len(x) <= n:
        return np.pad(x, (0, n - len(x)))
    e = np.convolve(x ** 2, np.ones(SR // 10), "same")
    cs = np.concatenate([[0], np.cumsum(e)])
    starts = np.arange(0, len(x) - n, SR // 20)
    s = starts[np.argmax(cs[starts + n] - cs[starts])]
    return x[s:s + n]


def fade(x, a=0.05, b=0.25):
    na, nb = int(a * SR), int(b * SR)
    x[:na] *= np.linspace(0, 1, na)
    x[-nb:] *= np.linspace(1, 0, nb)
    return x


def mix(place):
    d = os.path.join(ROOT, place)
    for tag, v in (("A", 0), ("B", 1)):
        out = np.zeros(SR * 10, np.float32)
        for layer, (_, st, ln, db) in P[place].items():
            f = os.path.join(d, f"{layer}_{v}.mp3")
            if not os.path.exists(f):
                f = os.path.join(d, f"{layer}_0.mp3")
            seg = best_window(load(f), int(ln * SR))
            if layer == "bed":
                seg = seg * gain_to(seg, -36)
            else:
                act = seg[np.abs(seg) > 0.05 * (np.abs(seg).max() + 1e-9)]
                seg = seg * gain_to(act if len(act) > SR // 20 else seg, -16 + db)
            seg = fade(seg.astype(np.float32))
            i = int(st * SR)
            out[i:i + len(seg)] += seg[: len(out) - i]
        out = fade(out, 0.3, 0.7)
        tmp = os.path.join(d, f"_tmp_{tag}.f32")
        out.tofile(tmp)
        dst = os.path.join(ROOT, f"{place}_{tag}.mp3")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", tmp,
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=18", "-ar", str(SR), "-ac", "2", "-b:a", "160k", dst],
                       check=True)
        os.remove(tmp)
        print("mixed", dst, flush=True)


if __name__ == "__main__":
    cmd, places = sys.argv[1], (sys.argv[2:] or list(P))
    for pl in places:
        (gen if cmd == "gen" else mix)(pl)
