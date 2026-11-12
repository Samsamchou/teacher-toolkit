"""Listen and Guess 默劇影片加音效（RDQ-spec-listen-guess-mime-sfx-20261112；老師規則：不好呈現的地點，畫面只演身體動作，看不見的東西交給聲音）。
做法照 godot-ershui-planet/tools/make_ambience.py：每個聲音用 KIE Suno Sounds 分開生成（每層約 2.5 點、出 2 段），取最響的一段、拉到同樣響度，
照抽格（每秒 3 張）找到的動作秒數放進去，整段 loudnorm -20 LUFS（比環境音線索 -16 小聲），AAC 混進影片。**不放任何說話聲**（廣播只留音）。
  python -I make_mime_sfx.py gen station ...   # 生成缺少的聲音層（素材：sfx/<地點>/<層>_<0|1>.mp3）
  python -I make_mime_sfx.py mix station ...   # 混進影片 → ../<地點>_mime_sfx.mp4 ＋外框 clues/video/<地點>.mp4（原本的無聲版留在 ../<地點>_mime.mp4）
第一批只做 4 支（station、supermarket、library、bookstore），老師看聽 OK 才做其他 6 支。
"""
import json, os, shutil, subprocess, sys, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\godot-ershui-planet\tools")
import make_ambience as M            # load / best_window / fade / gain_to / KIE 路徑

SFX = os.path.join(HERE, "sfx")
WEB = r"G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\site\public\ershui-3d-quest-planetlisten\clues\video"
SR = M.SR
TAIL = " Isolated single sound effect, close-up foley recording, dry, no music, no melody, no singing, no speech, no talking, no announcement voice, no words."
# 聲音層：提示詞（不寫人說話）
LAYERS = {
 "station": {
  "gate": "A transit card tapped on a railway station ticket gate reader: one short high electronic beep, then the gate flaps snap open with a quick mechanical clack.",
  "arrive": "A train arriving at a station platform: a loud train horn blast, then heavy steel wheels on rails clattering louder and louder as it comes in, ending with a long high squeal of brakes and a hiss of air.",
  "ride": "Inside a moving train carriage: steady rhythmic clickety-clack of wheels over rail joints and a low rumble, gently swaying, no voices.",
 },
 "supermarket": {
  "register": "A supermarket cash register: one bright drawer bell ding and the drawer sliding open with coins rattling.",
  "cart": "A metal shopping cart pushed across a smooth tiled supermarket floor: wire basket rattling and small wheels rolling and squeaking.",
  "scan": "Supermarket checkout barcode scanner: three clear separate beep, beep, beep sounds as items are scanned, then a cash register drawer bell ding and the drawer sliding open.",
  "bags": "Plastic shopping bags full of groceries being lifted and carried: loud plastic rustling and crinkling, bottles clinking inside.",
 },
 "library": {
  "bookdown": "A hardcover book set down flat on a wooden library counter: one solid soft thud, then a light slide of the book on the counter.",
  "stamp": "A librarian pressing a rubber date stamp firmly onto paper on a wooden desk: one loud clear heavy thump, close up.",
  "steps": "Very soft slow tiptoe footsteps on a wooden floor in a silent room, careful quiet steps, one floorboard creak.",
  "shh": "A single long gentle human hushing sound 'shhhhhh' through the teeth, like a librarian asking for quiet, breathy, no words.",
  "pages": "Slowly turning the paper pages of a book one by one in a silent room: soft crisp page flips, close up.",
 },
 "bookstore": {
  "pen": "A ballpoint pen scribbling quickly on a sheet of paper: scratchy fast pen-on-paper writing sound, close up, about two seconds.",
  "register": "An electronic cash register at a shop counter: a drawer bell ding and the cash drawer sliding open, then a receipt printing quickly.",
  "flip": "Quickly riffling through the pages of a paperback book with a thumb, then the book closed and slid back onto a wooden shelf with a soft thump; done twice.",
  "cash": "Counting paper banknotes by hand: crisp bills flicked one after another, then an old cash register bell ka-ching and a receipt printing.",
  "bag": "A new book slid into a stiff paper shopping bag at a shop counter: paper bag crackling and folding closed.",
 },
}
# 其他 6 支（老師 11/12「這 4 支 OK」之後）：盡量借用環境音已生成的 KIE 素材（層名 amb:<地點>/<層> → 資料/ambience/<地點>/<層>_0.mp3），只補 3 個新的
LAYERS.update({
 "post": {"fold": "Folding a sheet of paper in half and sliding it into a paper envelope, then pressing the envelope flap closed: crisp paper rustle and fold sounds, close up."},
 "park": {"kite": "A kite flapping and fluttering hard in a strong outdoor wind: fabric snapping, string humming, gusts of wind."},
 "tea": {"cicadas": "Loud summer cicadas buzzing in trees on a very hot day in Taiwan, outdoor, steady."},
})
# 每支影片：(層, 開始秒, 長度秒, 增益 dB, 說明)；秒數照每秒 3 張抽格（資料/listen-3clues/mime-sfx-check-v1.png）
PLAN = {
 # 火車站：老師 11/12 通過，不改
 "station": [("gate", 0.35, 1.3, 0, "刷卡嗶＋閘門"), ("arrive", 2.9, 3.3, 2, "火車進站：汽笛＋鐵軌＋煞車"),
             ("ride", 6.1, 1.9, -3, "車廂裡鐵軌喀噹聲")],
 # 超市（v5）：推車 0–1.7 秒；側身掃描三次，手伸到最前面的那一刻嗶（每秒 5 張抽格：約 2.5、4.5、6.0 秒）；拍手時收銀機
 "supermarket": [("cart", 0.15, 1.6, -2, "推車輪子"), ("scan", 2.5, 0.2, 1, "掃描嗶（第 1 件）", [2.5]),
                 ("scan", 4.5, 0.2, 1, "掃描嗶（第 2 件）", [4.5]), ("scan", 6.0, 0.2, 1, "掃描嗶（第 3 件）", [6.0]),
                 ("register", 6.8, 1.2, -3, "收銀機叮")],
 # 圖書館（v5）：噓＋踮腳 0.3–1.7、手掌當書 1.8–4.0、雙手往前推還書 4.4、拳頭蓋章 6.75（每秒 10 張抽格）
 "library": [("shh", 0.3, 1.5, -2, "噓——"), ("steps", 0.6, 1.3, -6, "踮腳輕輕走"), ("pages", 1.9, 2.0, -2, "翻書頁"),
             ("bookdown", 4.4, 1.0, 2, "還書：書放上櫃台"), ("stamp", 6.75, 0.8, 4, "蓋章 咚")],
 # 書店（v5）：手掌翻書 0.2–1.4、試寫筆 1.4–2.8、雙拳舉起點頭 3.0–4.0、走去櫃檯 4.3–5.3、雙手往前結帳 5.7–7.0
 "bookstore": [("flip", 0.2, 1.3, 0, "翻書"), ("pen", 1.45, 1.4, 0, "原子筆試寫"),
               ("supermarket/scan", 5.9, 0.2, 1, "結帳嗶（書）", [5.9]), ("supermarket/scan", 6.35, 0.2, 1, "結帳嗶（筆）", [6.35]),
               ("register", 6.9, 1.1, -3, "收銀機")],
 # 以下 6 支：秒數照每秒 4 張抽格
 # 郵局（720p 試拍）：折信 0.5–2.0、舔拇指 2.5、按郵票 3.0、側走把手推進投信口 4.0–5.0、揮手
 "post": [("fold", 0.5, 1.6, -2, "折信、裝信封"), ("amb:post/stamp", 3.0, 0.6, 0, "按郵票 咚"),
          ("amb:post/mailbox", 4.9, 1.6, 0, "信投進郵筒")],
 # 學校：背書包走、揮手 0.25–2.5、立正敬禮 2.75–4.0、坐下 4.25、舉手 5.0–8
 "school": [("amb:school/bell", 0.2, 2.4, -3, "學校鐘聲"), ("amb:school/whistle", 2.75, 1.0, -4, "哨子（立正）"),
            ("amb:school/cheer", 5.0, 2.0, -8, "小朋友歡呼（舉手）")],
 # 診所：咳嗽 0.25–1.75、摸額頭 2.0–3.75、張嘴啊 4.0–5.25、捲袖子打針 5.5–7
 "hospital": [("amb:hospital/cough2", 0.25, 1.6, 0, "咳嗽"), ("amb:hospital/thermo", 2.3, 1.2, -2, "耳溫槍嗶"),
              ("amb:hospital/trolley", 5.4, 1.8, -5, "護士推車（打針）")],
 # 公園：拉風箏 0.25–2.75、張開雙臂深呼吸 2.75–5.5、躺下看天空 5.75–8
 "park": [("kite", 0.25, 2.6, -2, "風箏在風裡拍動"), ("amb:park/birds", 2.8, 2.8, 0, "鳥叫"),
          ("amb:park/kids", 5.8, 2.2, -8, "遠處小孩笑聲")],
 # 餐廳：搓手聞香 0.25–1.75、夾起吹吹吃 2.0–5.75、拍肚子 6.0、舉手叫人 7.25
 "restaurant": [("amb:restaurant/wok2", 0.2, 1.7, -4, "大火快炒"), ("amb:restaurant/chew", 2.2, 3.6, 0, "吃東西聲"),
                ("amb:restaurant/orderbell", 7.2, 0.8, -2, "叫人叮")],
 # 飲料店：搧風擦汗 0.25–1.75、指菜單 2.0–3.25、吸飲料 3.5–7.0、比讚 7.25
 "tea": [("cicadas", 0.1, 1.9, -6, "夏天蟬叫（好熱）"), ("amb:tea/shaker", 2.0, 1.4, -2, "搖杯"),
         ("amb:tea/sip", 3.5, 3.6, 0, "吸飲料吸珍珠"), ("amb:tea/ice", 7.2, 0.8, -4, "冰塊")],
}


def gen(place):
    import kie
    d = os.path.join(SFX, place); os.makedirs(d, exist_ok=True)
    os.makedirs(d, exist_ok=True)
    for layer, prompt in LAYERS.get(place, {}).items():
        if os.path.exists(os.path.join(d, layer + "_0.mp3")):
            continue
        t = kie.create("ai-music-api/sounds", {"prompt": prompt + TAIL, "model": "V5", "sound_loop": False})
        r = kie.wait(t)
        for i, c in enumerate(((r.get("response") or {}).get("data") or [])[:2]):
            kie.download(c["audio_url"], os.path.join(d, f"{layer}_{i}.mp3"))
        print("generated", place, layer, flush=True)


def mix(place):
    d = os.path.join(SFX, place)
    os.makedirs(d, exist_ok=True)
    vid = os.path.join(os.path.dirname(HERE), "post_mime_test.mp4" if place == "post" else f"{place}_mime.mp4")
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", vid], capture_output=True, text=True).stdout)
    out = np.zeros(int(SR * dur), np.float32)
    for ev in PLAN[place]:
        layer, st, ln, db = ev[:4]
        if layer.startswith("amb:"):   # 借用環境音的 KIE 素材
            path = os.path.join(M.ROOT, layer[4:] + "_0.mp3")
        elif "/" in layer:
            path = os.path.join(SFX, layer + "_0.mp3")
        else:
            path = os.path.join(d, f"{layer}_0.mp3")
        src = M.load(path)
        if len(ev) > 5:   # 剪下第一聲（> -15 dB 的第一段），放在指定的秒數
            env = np.abs(src)
            on = np.where(env > env.max() * 0.3)[0]
            a = max(0, on[0] - int(0.01 * SR))
            b = a
            while b < len(src) and np.abs(src[b:b + int(0.03 * SR)]).max() > env.max() * 0.05:
                b += int(0.01 * SR)
            b = min(b, a + int(0.2 * SR))   # 收銀嗶聲一聲 0.2 秒就好（KIE 的一聲拖 0.9 秒，三聲會黏在一起）
            one = M.fade(src[a:b] * M.gain_to(src[a:b], -16 + db), 0.005, 0.03).astype(np.float32)
            for t in ev[5]:
                i = int(t * SR); out[i:i + len(one)] += one[: max(0, len(out) - i)]
            continue
        if ln <= 1.2:   # 短的「打擊聲」（放書、蓋章、收銀機）：從聲音真正開始的那一點切，才會對準動作
            on = np.where(np.abs(src) > np.abs(src).max() * 0.3)[0]
            a0 = max(0, on[0] - int(0.02 * SR))
            seg = src[a0:a0 + int(ln * SR)]
        else:
            seg = M.best_window(src, int(ln * SR))
        act = seg[np.abs(seg) > 0.05 * (np.abs(seg).max() + 1e-9)]
        seg = M.fade((seg * M.gain_to(act if len(act) > SR // 20 else seg, -16 + db)).astype(np.float32), 0.02, 0.25)
        i = int(st * SR)
        out[i:i + len(seg)] += seg[: max(0, len(out) - i)]
    out = M.fade(out, 0.05, 0.3)
    fd, tmp = tempfile.mkstemp(suffix=".f32"); os.close(fd)
    out.tofile(tmp)
    wav = os.path.join(d, "_mix.m4a")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", tmp,
                    "-af", "loudnorm=I=-20:TP=-2:LRA=15", "-ar", "44100", "-ac", "1", "-c:a", "aac", "-b:a", "80k", wav], check=True)
    os.remove(tmp)
    # 短音檔 loudnorm 常常沒對準（餐廳 -17）：量一次，差超過 1 dB 就再用 volume 修正到 -20
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", wav, "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    try:
        li = float(json.loads(r[r.rindex("{"):r.rindex("}") + 1])["input_i"])
    except Exception:
        li = -20.0
    if abs(li + 20) > 1:
        fixed = wav.replace("_mix.m4a", "_mix2.m4a")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-af", f"volume={-20 - li:.1f}dB", "-c:a", "aac", "-b:a", "80k", fixed], check=True)
        os.replace(fixed, wav)
        print("  gain fix", place, f"{li:.1f} -> -20", flush=True)
    dst = os.path.join(os.path.dirname(HERE), f"{place}_mime_sfx.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", vid, "-i", wav, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "copy",
                    "-shortest", "-movflags", "+faststart", dst], check=True)
    shutil.copy(dst, os.path.join(WEB, f"{place}.mp4"))
    json.dump({"place": place, "events": [{"layer": e[0], "start": e[1], "len": e[2], "db": e[3], "label": e[4]} for e in PLAN[place]]},
              open(os.path.join(d, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("mixed", place, os.path.getsize(dst), flush=True)


if __name__ == "__main__":
    cmd, ids = sys.argv[1], sys.argv[2:] or ["station", "supermarket", "library", "bookstore"]
    for k in ids:
        (gen if cmd == "gen" else mix)(k)
