"""Listen and Guess 默劇影片：其他 9 個地點（老師 2026-11-12：「影片 OK，做 480p」；核准 9 × 33.6＝302.4 點，重拍合計 < 100 點）。
和 post 試拍同一套（make_mime_test.py）：同一張首幀 stage_ken.png、Seedance 2.0 Mini、8 秒、不生成聲音、提示詞不寫物品名稱。
每個地點兩段：前 4 秒 A、後 4 秒 B，要「猜得到、和地點有關」。
  python -I mime_batch.py station bookstore ...   # 生成（同時最多 3 支）
  python -I mime_batch.py sheet                   # 只重做每支的抽格圖
輸出：raw/<id>_<n>.mp4 → ../<id>_mime.mp4（480p、無音軌）＋外框 clues/video/<id>.mp4；抽格 ../frames/<id>_frames.jpg
"""
import sys, os, json, shutil, subprocess
import concurrent.futures as cf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_mime_test as m

BUDGET_LISTEN = 582.4 + 91.2 + 90   # 11/12 老師第二次回饋：超市、圖書館、書店重拍 91.2＋加拍 ≤90 #  # 11/12 第三階段：前面實扣 430.4＋4 支重拍 122＋加拍 ≤60（RDQ mime-sfx） #    # 試拍＋9 支＋重拍上限（點）；實際 9 支 273.6，重拍合計另外限 <100（11/12 station＋supermarket 各一次＝60.8）
m.SHOTS.update({
 "station": ("he walks forward, raises his flat empty right palm and taps it once against an invisible spot at waist height beside him, then steps forward through, "
             "stops, looks at his empty wrist, and leans out sideways shading his eyes with one hand, looking far down to one side, waiting impatiently on tiptoe",
             # 重拍（11/12）：v1「爬上車」讓 Seedance 變出車門與座位 → 拿掉上車；v2「看東西經過」又讓畫面下緣飄過一團藍色（像列車）→ v3 只指、揮手、抓頭上空氣搖晃；鏡頭固定
             "his face lights up and he points far to the side with a big smile, then waves with that hand; "
             "he takes one small step forward on the same spot, raises one empty hand above his head closing it around nothing, and sways gently side to side. "
             "The camera never moves or zooms: the same wide static shot of the whole stage from the first frame to the last. Nothing passes by, nothing enters the frame, the area in front of the stage stays empty"),
 "bookstore": ("he holds both empty open hands side by side in front of his chest with palms up like an open surface, flicks his right thumb across again and again quickly, "
               "stops, bursts into a big silent laugh, then nods firmly and hugs both empty arms to his chest as if he has decided 'I want this one'",
               "he steps to the side, bows slightly and stretches both empty hands forward politely as if handing something over, then counts on his fingers, "
               "receives with both open palms held together, bows again, hugs his arms to his chest happily and waves goodbye"),
 "supermarket": (# 重拍（11/12）：v1 推車像雙手叉腰 → 雙臂往前伸直、雙拳握在腰前同一高度，身體前傾一步一步推著走
                 "he stretches both arms straight forward at waist height, both closed empty fists side by side gripping nothing, elbows almost straight, "
                 "leans his body forward and walks slowly across the stage step by step pushing forward, the fists always staying the same distance in front of his belly; "
                 "he stops, stretches one empty hand high up to reach, and lowers it into the space in front of his waist",
                 "he grips the air in front of his waist again with both straight arms and pushes forward a few more steps, turning his head left and right looking up and down; "
                 "then he lets both arms hang down straight beside his legs with fists closed, leans back and walks a few steps sideways with a strained face as if carrying two heavy loads, then smiles. "
                 "The camera never moves or zooms"),
 "school": ("he hooks both thumbs under his collar at the shoulders as if holding two straps, and marches forward cheerfully with a bounce in his step, "
            "then waves big at someone on the side with a happy grin",
            "he stops, stands straight to attention facing front, gives a short salute, then sits down cross-legged on the bare floor, "
            "and shoots one hand straight up high, waving it eagerly and bouncing, as if he knows the answer"),
 "library": ("he tiptoes very slowly with exaggerated quiet steps, his eyes scanning sideways at eye level while his index finger slides through the air from left to right, "
             "then stops and taps one spot in the air, nodding",
             "he presses one index finger to his lips with a gentle 'shh' face and glances left and right; then he holds both empty open hands side by side in front of his chest "
             "with palms up and reads very quietly, moving his eyes from left to right, perfectly calm"),
 "hospital": ("he coughs hard twice into his bent elbow, shoulders jerking, then touches his forehead with the back of his hand, makes a weak sick face and wobbles a little",
              "he tilts his head back and opens his mouth wide as if saying 'aah'; then he pushes up his left sleeve, squeezes his eyes shut, winces bravely, "
              "rubs his upper arm and gives a brave little thumbs up"),
 "park": ("he runs a few steps backward, looking high up into the sky, his right fist raised above his head tugging down again and again in small jerks, "
          "mouth open with excitement, his left hand pointing up at the sky",
          "he stops, spreads both arms wide and takes a deep happy breath of fresh air, then lies down on his back on the bare floor with arms behind his head, "
          "crosses his legs and gazes up at the sky, smiling and pointing up"),
 "restaurant": ("he rubs his hands together, sniffs the air with a delighted face, then pinches two fingers of his right hand together, dips them down low in front of him, "
                "lifts them to his mouth, blows twice to cool, and chews with big puffed cheeks, eyes closed in joy",
                "he quickly repeats the dip-blow-chew two more times, then pats his full round belly with both hands, leans back satisfied, "
                "and raises one hand high calling over to the side, holding up two fingers"),
 "tea": ("he fans his face fast with one hand and wipes sweat from his forehead as if it is very hot, then looks up high at the wall above, "
         "points at one spot with his index finger and holds up one finger, nodding",
         "he holds one closed empty fist in front of his chest, bends his head down, purses his lips and sucks hard with hollow cheeks, his eyes going wide, "
         "then chews happily with bouncing cheeks, sucks again, and gives a big satisfied 'ahh' with a thumbs up"),
})


def spent():
    return sum(r.get("credits") or 0 for r in m.ledger())


def run(k):
    rec = m.gen_video(k, dur=8, res="480p")
    if rec.get("state") == "success":
        raw = m.HERE / rec["file"]
        out = m.HERE.parent / f"{k}_mime.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-an", "-vf", "scale=-2:'min(480,ih)'", "-c:v", "libx264", "-crf", "25",
                        "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)], check=True)
        shutil.copy(out, m.WEB / f"{k}.mp4")
        sheet(k)
        # make_mime_test 也寫了 <k>_mime_test.mp4（720p 名稱）：480p 這批不要那個檔
        t = m.HERE.parent / f"{k}_mime_test.mp4"
        if t.exists() and k != "post": t.unlink()
    return rec


def sheet(k):
    src = m.HERE.parent / (f"{k}_mime.mp4" if k != "post" else "post_mime_test.mp4")
    d = m.HERE.parent / "frames"; d.mkdir(exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", "fps=1,scale=480:-1,tile=4x2", "-frames:v", "1", str(d / f"{k}_frames.jpg")], check=True)


# 11/12 第三階段（RDQ-spec-listen-guess-mime-sfx-20261112）：4 支照新動作重拍，每地點 3 個動作；看不見的東西交給音效。
# 火車站畫面不能有車：只寫身體動作（風吹衣服頭髮），不寫任何東西經過。
m.SHOTS.update({
 "station": ("he walks forward, raises his flat empty right palm and taps it once against an invisible spot at waist height beside him, then pushes forward with his hip and walks through",
             "he stops, looks down at his empty left wrist, then rises on tiptoe and leans out sideways shading his eyes with one hand, looking far down to one side, waiting",
             "a strong gust of wind blows at him from the side: his hair and jacket flap, he squints and leans into the wind; then he takes one step forward, raises one empty hand above his head closing it around nothing, and sways gently side to side"),
 "supermarket": ("he stretches both arms straight forward at waist height, both closed empty fists side by side, leans his body forward and walks slowly step by step pushing forward, turning his head left and right, looking up and down",
                 "he stops, stretches one empty hand high up, brings that hand down close to his face and squints at his empty palm as if reading, nods, and lowers the hand into the space in front of his waist",
                 "he turns sideways and with both empty hands lifts from low in front of him up to waist height, then sweeps his flat right hand across at waist height quickly three times, then lets both arms hang straight down with fists closed and walks a few steps sideways leaning back with a strained face as if carrying two heavy loads"),
 # 加拍（11/12）：v4a「兩指捏住往回拉」變出一根細線（像棍子）→ 改成張開手往前、握拳收回胸前
 "library": ("he presses one index finger to his lips with a gentle 'shh' face, looks around, then tiptoes very slowly with exaggerated quiet steps",
             "he reaches forward at eye level with one open empty hand, closes the hand into a loose fist and brings it back to his chest, then sits down cross-legged on the bare floor, holds both empty open palms side by side in front of his chest and slowly flips one hand over again and again, reading quietly",
             "he stands up, stretches both empty hands forward together politely, then presses one fist down firmly twice at waist height, hugs both arms to his chest and waves goodbye with a smile"),
 "bookstore": ("he holds both empty open palms side by side in front of his chest, flicks his thumb across quickly, shakes his head and pushes both hands back up at eye level; he does this once more and shakes his head again",
               "he tilts his head and squints closely at one spot at eye level, then his eyes go wide in surprise and he holds up one finger, then two fingers",
               "he pats his back pocket, holds both hands together in front of him and flicks his thumb several times as if counting, stretches both hands forward politely, then receives with both arms and hugs his arms to his chest happily"),
})


# 11/12 老師回饋（第二次）：超市＝強調結帳掃描手勢；圖書館＝噓踮腳→手掌當書→還書→蓋章；書店＝翻書→試寫筆→決定書和筆→走去櫃檯→結帳。
# 上兩次圖書館都變出東西（細棍、書）→ 加「手一直是空的、只是默劇」，首幀用乾淨舊版圖書館影片的第一格；每個動作短而分明。
EMPTY = ("IMPORTANT: this is pure pantomime with empty hands. His hands are always visibly empty, open or in loose fists, and no object of any kind "
         "(no book, no paper, no pen, no stick, no stamp, no card, no bag, no item) ever appears in his hands, on the floor or anywhere in the scene.")
m.EXTRA.update({"supermarket": EMPTY, "library": EMPTY, "bookstore": EMPTY})
m.FIRST["library"] = "library_first.png"
m.SHOTS.update({
 "supermarket": ("he stretches both arms straight forward at waist height, closed empty fists side by side, and walks two quick steps forward pushing, then stops and turns sideways to the camera",
                 "standing sideways, he lifts his empty right hand from low at his left side, slowly sweeps it in a big clear arc across a spot just in front of his belly from left to right, stops, and nods once firmly",
                 "he does the same big sweeping motion again with his empty right hand from left to right across that same spot in front of his belly, stops, and nods once firmly",
                 "he does the big sweeping motion a third time, nods, then smiles, opens both empty hands and pats them together twice"),
 "library": ("he presses his index finger to his lips in a big 'shh' and tiptoes two slow exaggerated quiet steps",
             "standing still, he holds both empty open palms side by side in front of his chest like an open book and reads quietly, eyes moving left to right",
             "he walks one step forward, brings both flat empty palms together at chest height and pushes them straight forward, then lets go by opening his hands wide and pulling them back, showing they are empty",
             "he raises one empty fist high above his shoulder and thumps it straight down onto an invisible spot at waist height in front of him, firmly, twice, then smiles and waves"),
 "bookstore": ("he holds both empty open palms side by side like an open book and flips his right hand over from right to left again and again quickly, looking down eagerly",
               "he touches his right thumb and index fingertip together (hands empty) and scribbles small quick loops over his flat left palm, watching closely, like testing how something writes",
               "he lifts both empty fists up in front of his chest, looks at one then the other, and nods firmly twice with a happy decided face",
               "he walks a few quick steps sideways across the stage, then stops facing front",
               "he stretches both empty hands forward politely, waits, nods once, nods again, then pulls his arms back and hugs them to his chest happily"),
})


if __name__ == "__main__":
    ids = sys.argv[1:]
    if ids == ["sheet"]:
        for k in ["post"] + [x for x in m.SHOTS if x != "post"]:
            sheet(k)
        sys.exit()
    est = len(ids) * 8 * m.RATE["480p"]
    print("已花", spent(), "這次預估", est, flush=True)
    if spent() + est > BUDGET_LISTEN + 0.01:
        sys.exit(f"會超過核准上限 {BUDGET_LISTEN}：先問老師。")
    with cf.ThreadPoolExecutor(3) as ex:
        for rec in ex.map(run, ids):
            print("DONE", rec.get("shot"), rec.get("state"), rec.get("credits"), rec.get("fail"), flush=True)
    print("累計花費", spent(), "點", flush=True)
