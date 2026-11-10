"""Free Time 線索：無聲演出影片（Ken 演出，人物不出聲）。
步驟：① Codex CLI 內建生圖畫首幀（附 Ken 參考圖，0 點）→ ② KIE Seedance 2.0 Mini 首幀模式 720p 6 秒（不生成聲音）→ ③ ffmpeg 去音軌、壓成網頁用 mp4。
  python -I make_clue_video.py frame jogging [...]     # 只畫首幀 frames/<id>.png
  python -I make_clue_video.py video jogging [...]     # 生成影片 raw/<id>_<n>.mp4 → final/<id>.mp4
花費記在 ledger.json；上限 700 點（老師 2026-11-10 核可的報價），超過就拒絕開始。
"""
import json, os, re, shutil, subprocess, sys, time, glob, hashlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")
MODEL, BUDGET, LEDGER = "bytedance/seedance-2-mini", 700, HERE / "ledger.json"
REF = HERE / "ken_ref.png"
WORK = Path(r"C:\Users\User\AppData\Local\Temp\claude\5b34f038e9120482\00f516a5-fecc-4b83-bc5b-cb4607636ba8\scratchpad\codexwork_video")
# 老師 2026-11-10：無聲「比手畫腳」演出。背景固定是英語教室前方的講台，Ken 穿學生服裝，舞台上沒有任何道具，
# 動作要誇張，每個活動有兩個強調的重點（A、B），6 秒。所有影片共用同一張首幀 frames/stage.png。
KEN = ("the same boy as in the attached reference image (same face, short spiky black hair, orange-tinted goggles pushed up on his forehead), "
       "but now wearing a Taiwanese elementary school student uniform: white short-sleeved polo shirt with a navy-blue collar, navy-blue shorts, "
       "white socks and white sneakers; no gloves, no jacket, nothing in his hands")
STAGE = ("He stands alone in the centre of a low wooden stage platform at the front of a bright, cheerful elementary school English classroom, "
         "facing the camera (the audience), standing straight and relaxed with both arms down at his sides, friendly smile, full body visible from head to shoes "
         "with empty space around him on both sides and above. Behind him a clean blank green chalkboard, colourful paper bunting above it, a potted plant at one side. "
         "The stage is completely empty: no props, no furniture, no desk, no chair, no objects on the floor.")
LOOK = ("Bright, cheerful stylised 3D cartoon animation look (like a friendly kids' animated film), soft daylight. Wide 16:9 frame, eye-level camera. "
        "No text, no letters, no numbers, no writing on the chalkboard or anywhere, no logos, no other people.")
RULES = ("This is a silent charades / pantomime performance: he acts with big, exaggerated, clear body movements and facial expressions. "
         "He has NO props at all: his hands are always empty, and no object, tool, instrument, screen, furniture or ball ever appears - everything is imaginary and invisible. "
         "He stays on the same classroom stage the whole time; the background never changes. Static camera, full body always in frame. "
         "Keep his face, hair, goggles and school uniform exactly as in the opening frame, same 3D cartoon style. "
         "He does not talk or sing: no speaking lip movement. No captions, no subtitles, no text, no new characters.")
# id → (重點 A, 重點 B)；影片前 3 秒做 A、後 3 秒做 B
SHOTS = {
 "jogging": ("he jogs on the spot with exaggerated high knees and big bent-arm swings, bouncing rhythmically, breathing in and out through puffed cheeks",
             "he slows down and stops, bends forward a little, wipes sweat off his forehead with the back of his hand, fans his face with his hand, then gives a tired but happy thumbs up"),
 "music": ("he cups both hands over his ears as if wearing big headphones, closes his eyes and smiles blissfully",
           "keeping his hands on his ears he nods his head to an imaginary beat, sways his whole body side to side and bounces his knees, completely lost in the music"),
 "baseball": ("he takes a batting stance side-on, gripping an imaginary bat with both fists stacked, wiggles, then makes one huge exaggerated full swing, twisting his whole body",
              "he shades his eyes with one hand and follows the imaginary ball flying far, far away with his head, then jumps and punches the air in celebration"),
 "basketball": ("he bends his knees low and dribbles an imaginary ball with one hand, pushing his open palm down and up in a fast exaggerated bouncing rhythm, looking around like a player",
                "he jumps high and shoots with both hands above his head, holding the follow-through with a bent wrist, watches the imaginary shot drop, then pumps his fist"),
 "bike": ("he holds imaginary handlebars with both fists out in front and pedals with his legs, lifting his knees in big alternating circles on the spot, leaning slightly forward",
          "still holding the handlebars he flicks his right thumb again and again like ringing a bicycle bell, then leans his whole body left and right as if turning corners while pedalling"),
 "english": ("he holds an imaginary open book in both open palms in front of his chest, his eyes and head moving left to right line by line, then turns an imaginary page with one hand",
             "he writes carefully on his open left palm with an imaginary pencil in his right hand, stops, scratches his head thinking hard, then raises one finger with a bright eureka face"),
 "internet": ("he sits on an imaginary chair (knees bent, as if seated at a desk), slides his right hand around on an imaginary mouse and taps his index finger clicking, staring forward at an imaginary screen",
              "he flicks his finger up and down as if scrolling, leans his head closer and closer with wide surprised eyes, then leans back and nods, impressed"),
 "tv": ("he drops back as if flopping onto an imaginary sofa (knees bent, leaning back, one arm resting on the sofa back), points an imaginary remote forward and presses his thumb again and again, changing channels with a bored face",
        "he suddenly points forward at the imaginary screen, bursts into big silent laughter holding his belly with both hands, shoulders shaking, slapping his knee"),
 "camping": ("he kneels on one knee and hammers an imaginary tent peg into the floor with big swings of an imaginary mallet, then pulls an imaginary rope tight with both hands",
             "he sits down cross-legged, holds both open palms out and rubs them together warming them over an imaginary campfire, shivers happily, then points up and gazes at the imaginary stars in wonder"),
 "games": ("he holds an imaginary game controller in both hands in front of his belly, both thumbs mashing buttons extremely fast, leaning and twisting his whole body left and right with a tense concentrated face",
           "he freezes, then throws both fists high in the air in a huge silent victory cheer and jumps, then quickly goes back to mashing the controller"),
 "recorder": ("he holds an imaginary recorder straight down from his lips with both hands one above the other, lips pursed blowing, all his fingers wiggling up and down one by one",
              "he takes one huge exaggerated breath with his chest and shoulders rising, then plays again swaying side to side with puffed cheeks, tapping one foot to the beat"),
}


def gen_frame(k="stage"):
    k = "stage"
    (HERE / "frames").mkdir(exist_ok=True); WORK.mkdir(parents=True, exist_ok=True)
    dst = HERE / "frames" / f"{k}.png"
    shutil.copy(REF, WORK / "ken_ref.png")
    prompt = (f"Use your built-in image generation tool to create this image. The attached image ken_ref.png is the character reference. "
              f"Scene: {KEN}. {STAGE} {LOOK} Landscape 16:9 image. Save the PNG as {k}.png in the current directory. Reply with the saved file path only.")
    stale = WORK / f"{k}.png"
    if stale.exists(): stale.unlink()
    t0 = time.time()
    r = subprocess.run("codex exec --skip-git-repo-check -s workspace-write -i ken_ref.png -", input=prompt, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", cwd=str(WORK), shell=True, timeout=1200)
    out = r.stdout + r.stderr
    cands = [str(stale)] + re.findall(r"[A-Za-z]:\\[^\s\"'`]*?generated_images[^\s\"'`]*?\.png", out)
    src = next((c for c in cands if os.path.exists(c) and os.path.getmtime(c) > t0), None)
    if not src:
        rec = sorted(glob.glob(os.path.expanduser(r"~\.codex\generated_images\**\*.png"), recursive=True), key=os.path.getmtime)
        if rec and os.path.getmtime(rec[-1]) > t0: src = rec[-1]
    if not src:
        print("FAIL frame", k, out[-400:], flush=True); return False
    shutil.copy(src, dst)
    pp = HERE / "frames" / "provenance.json"
    log = json.loads(pp.read_text(encoding="utf-8")) if pp.exists() else {}
    log[k] = {"prompt": prompt, "sha256": hashlib.sha256(dst.read_bytes()).hexdigest(), "generated": time.strftime("%Y-%m-%d %H:%M:%S"),
              "tool": "codex exec (built-in image generation) with ken_ref.png"}
    pp.write_text(json.dumps(log, ensure_ascii=False, indent=1), encoding="utf-8")
    print("ok frame", k, round(time.time() - t0), flush=True); return True


def ledger(): return json.loads(LEDGER.read_text(encoding="utf-8")) if LEDGER.exists() else []
def spent(): return sum(r.get("credits") or 0 for r in ledger())


def gen_video(k, dur=6, res="720p"):
    import kie
    (HERE / "raw").mkdir(exist_ok=True); (HERE / "final").mkdir(exist_ok=True)
    n = len(list((HERE / "raw").glob(f"{k}_*.mp4"))) + 1
    # 首幀縮成 1280x720 JPEG 再上傳
    small = WORK / f"{k}_first.jpg"; WORK.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(HERE / "frames" / "stage.png"), "-vf",
                    "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "2", str(small)], check=True)
    A, B = SHOTS[k]
    inp = {"prompt": " ".join(["Stylised 3D cartoon animation exactly like the opening frame.",
                                f"Action, first half (about 3 seconds): {A}. Second half (about 3 seconds): {B}.", RULES]),
           "resolution": res, "aspect_ratio": "16:9", "duration": dur, "web_search": False, "generate_audio": False,
           "first_frame_url": kie.upload(small, upload_path="freetime-clues", file_name=f"{k}_first.jpg")}
    safe = dict(inp); (HERE / "raw" / f"{k}_{n}.request.json").write_text(json.dumps(safe, ensure_ascii=False, indent=1), encoding="utf-8")
    t0 = time.time(); tid = kie.create(MODEL, inp); d = kie.wait(tid)
    rec = dict(shot=k, res=res, take=n, taskId=tid, state=d["state"], credits=d.get("creditsConsumed"), secs=round(time.time() - t0), fail=d.get("failMsg") or "")
    if d["state"] == "success":
        raw = HERE / "raw" / f"{k}_{n}.mp4"
        kie.download(d["result"]["resultUrls"][0], raw); rec["file"] = f"raw/{k}_{n}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-an", "-c:v", "libx264", "-crf", "24", "-preset", "slow",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(HERE / "final" / f"{k}.mp4")], check=True)
    L = ledger(); L.append(rec); LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(rec, ensure_ascii=False), flush=True)
    return rec


if __name__ == "__main__":
    cmd, ids = sys.argv[1], (sys.argv[2:] or list(SHOTS))
    if cmd == "frame":
        gen_frame()
    else:
        est = len(ids) * 6 * 9
        if spent() + est > BUDGET: sys.exit(f"已花 {spent()} 點，這次預估 {est}，會超過上限 {BUDGET}：先問老師。")
        for k in ids: gen_video(k)
        print("累計花費", spent(), "點", flush=True)
