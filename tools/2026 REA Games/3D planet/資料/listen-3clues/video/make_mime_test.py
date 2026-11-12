"""Listen and Guess 默劇影片線索：試拍 1 支（郵局：Ken 比手畫腳寄信），老師看過＋同意報價才做其他 9 支。
做法照 Free Time 的比手畫腳影片（資料/freetime/clues/video/make_clue_video.py、mime_v3.py 的教訓）：
  ① Codex CLI 內建生圖畫首幀（附 Ken 參考圖、0 點）：Ken 原本的樣子（深藍外套橘袖、護目鏡），站在教室講台中央，舞台上沒有道具。
  ② KIE Seedance 2.0 Mini 首幀模式 720p 8 秒、不生成聲音。提示詞完全不寫物品名稱（寫了 AI 就會變出道具）。
  ③ ffmpeg 去音軌、720p、網頁用 mp4 → 本資料夾 post_test.mp4＋外框 clues/video/post.mp4。
費用：Free Time 帳本 720p 每秒 8.2 點（6 秒＝49.2）→ 8 秒約 65.6 點；超過 100 點就不生成、只報價。
  python -I make_mime_test.py frame
  python -I make_mime_test.py video [480p|720p]
"""
import json, os, re, shutil, subprocess, sys, time, glob, hashlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")
MODEL, LIMIT, LEDGER = "bytedance/seedance-2-mini", 100, HERE / "ledger.json"
RATE = {"480p": 4.2, "720p": 8.2}          # 點／秒（Free Time 帳本實際扣點）
REF = HERE.parent.parent / "freetime" / "clues" / "video" / "ken_ref.png"
WEB = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\site\public\ershui-3d-quest-planetlisten\clues\video")
WORK = Path(r"C:\Users\User\AppData\Local\Temp\claude\5b34f038e9120482\c19d1837-142e-4994-ae13-cf5aaa41e2fc\scratchpad\codexwork_listen_video")
KEN = ("the same boy as in the attached reference image: about 12 years old, same face, short spiky black hair, orange-tinted goggles pushed up on his forehead, "
       "navy-blue zip jacket with bright orange sleeves and orange trim, navy trousers, white-and-orange sneakers; bare hands (no gloves), nothing in his hands, nothing on his belt")
STAGE = ("He stands alone in the centre of a low wooden stage platform at the front of a bright, cheerful elementary school English classroom, "
         "facing the camera (the audience), standing straight and relaxed with both arms down at his sides, friendly smile, full body visible from head to shoes "
         "with empty space around him on both sides and above. Behind him a clean blank green chalkboard, colourful paper bunting above it, a potted plant at one side. "
         "The stage is completely empty: no props, no furniture, no desk, no chair, no objects on the floor.")
LOOK = ("Bright, cheerful stylised 3D cartoon animation look (like a friendly kids' animated film), soft daylight. Wide 16:9 frame, eye-level camera. "
        "No text, no letters, no numbers, no writing on the chalkboard or anywhere, no logos, no other people.")
RULES = ("This is a silent body-movement performance filmed in one static wide shot. ONLY the boy's own body moves. "
         "The wooden stage floor around him stays completely bare and empty for the entire clip, exactly as in the opening frame: "
         "nothing is ever added to the scene - no objects, no furniture, no equipment, no effects, no glow, no particles. "
         "His hands are always empty: nothing ever appears in his hands, between his hands, at his mouth or near him. "
         "The classroom background never changes. Full body always in frame. "
         "Keep his face, hair, goggles and clothes exactly as in the opening frame, same 3D cartoon style. "
         "He does not talk or sing. No captions, no subtitles, no text, no other characters.")
# 郵局（寄信）：前 4 秒折、舔、貼；後 4 秒走過去投進去、揮手
SHOTS = {
 "post": ("he holds both empty flat hands together in front of his chest and folds one flat hand over the other like closing a flap, runs one fingertip along the edge, "
          "then licks the tip of his right thumb and presses that thumb down hard onto the upper corner of his flat left palm, nodding once",
          "he takes two steps to the side, bends forward a little, and slowly pushes his flat right hand straight forward at chest height as if sliding it through a narrow gap, "
          "lets go with his fingers open, then steps back, waves goodbye toward that spot with a big smile and gives a thumbs up"),
}


FIRST = {}   # 地點 → 首幀檔名（預設 stage_ken.png）
EXTRA = {}   # 地點 → 額外提示（例：手一直是空的）


def find_new_png(out, stale, t0):
    cands = [str(stale)] + re.findall(r"[A-Za-z]:\\[^\s\"'`]*?generated_images[^\s\"'`]*?\.png", out)
    return next((c for c in cands if os.path.exists(c) and os.path.getmtime(c) > t0), None)


def gen_frame():
    WORK.mkdir(parents=True, exist_ok=True)
    shutil.copy(REF, WORK / "ken_ref.png")
    prompt = (f"Use your built-in image generation tool to create this image. The attached image ken_ref.png is the character reference. "
              f"Scene: {KEN}. {STAGE} {LOOK} Landscape 16:9 image. Save the PNG as stage.png in the current directory. Reply with the saved file path only.")
    stale = WORK / "stage.png"
    if stale.exists(): stale.unlink()
    t0 = time.time()
    r = subprocess.run("codex exec --skip-git-repo-check -s workspace-write -i ken_ref.png -", input=prompt, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", cwd=str(WORK), shell=True, timeout=1200)
    src = find_new_png(r.stdout + r.stderr, stale, t0)
    if not src:
        print("FAIL frame", (r.stdout + r.stderr)[-400:], flush=True); return False
    dst = HERE / "stage_ken.png"; shutil.copy(src, dst)
    (HERE / "frame_provenance.json").write_text(json.dumps({"prompt": prompt, "sha256": hashlib.sha256(dst.read_bytes()).hexdigest(),
        "generated": time.strftime("%Y-%m-%d %H:%M:%S"), "tool": "codex exec (built-in image generation) with ken_ref.png"}, ensure_ascii=False, indent=1), encoding="utf-8")
    print("ok frame", round(time.time() - t0), flush=True); return True


def ledger(): return json.loads(LEDGER.read_text(encoding="utf-8")) if LEDGER.exists() else []


def gen_video(k="post", dur=8, res="720p"):
    est = dur * RATE[res]
    print(f"報價：{res} {dur} 秒 × {RATE[res]} 點／秒 ＝ {est:.1f} 點", flush=True)
    if est > LIMIT:
        sys.exit(f"一支 {est:.1f} 點 > {LIMIT} 點：不生成，只報價。")
    import kie
    (HERE / "raw").mkdir(exist_ok=True); WORK.mkdir(parents=True, exist_ok=True)
    n = len(list((HERE / "raw").glob(f"{k}_*.mp4"))) + 1
    small = WORK / f"{k}_first.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(HERE / FIRST.get(k, "stage_ken.png")), "-vf",
                    "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "2", str(small)], check=True)
    sh = SHOTS[k]
    if len(sh) >= 3:   # 11/12 第三階段：N 個動作依序、平均分 8 秒（RDQ-spec-listen-guess-mime-sfx）
        n_ = len(sh); seg = dur / n_
        act = f"{n_} short, distinct actions in order. " + " ".join(
            f"Action {i + 1} (about {i * seg:.1f} to {(i + 1) * seg:.1f} seconds): {a}." for i, a in enumerate(sh)) + " " + EXTRA.get(k, "")
    else:
        act = f"Action, first half (about 4 seconds): {sh[0]}. Second half (about 4 seconds): {sh[1]}."
    inp = {"prompt": " ".join(["Stylised 3D cartoon animation exactly like the opening frame.", act, RULES,
                                "The camera never moves or zooms: one wide static shot of the whole stage from the first frame to the last. "
                                "Nothing passes by, nothing enters the frame, the area around the stage stays empty."]),
           "resolution": res, "aspect_ratio": "16:9", "duration": dur, "web_search": False, "generate_audio": False,
           "first_frame_url": kie.upload(small, upload_path="listen-clues", file_name=f"{k}_first.jpg")}
    (HERE / "raw" / f"{k}_{n}.request.json").write_text(json.dumps(inp, ensure_ascii=False, indent=1), encoding="utf-8")
    t0 = time.time(); tid = kie.create(MODEL, inp); d = kie.wait(tid)
    rec = dict(shot=k, res=res, dur=dur, take=n, taskId=tid, state=d["state"], credits=d.get("creditsConsumed"), est=est,
               secs=round(time.time() - t0), fail=d.get("failMsg") or "")
    if d["state"] == "success":
        raw = HERE / "raw" / f"{k}_{n}.mp4"
        kie.download(d["result"]["resultUrls"][0], raw); rec["file"] = f"raw/{k}_{n}.mp4"
        WEB.mkdir(parents=True, exist_ok=True)
        out = HERE.parent / f"{k}_mime_test.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-an", "-vf", "scale=-2:'min(720,ih)'", "-c:v", "libx264", "-crf", "26",
                        "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)], check=True)
        shutil.copy(out, WEB / f"{k}.mp4")
    L = ledger(); L.append(rec); LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(rec, ensure_ascii=False), flush=True)
    return rec


if __name__ == "__main__":
    if sys.argv[1] == "frame":
        gen_frame()
    else:
        gen_video(res=sys.argv[2] if len(sys.argv) > 2 else "720p")
