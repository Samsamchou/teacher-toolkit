"""水鈴版默劇線索（Shuiling's Free Time 動畫用；老師 11/14 規格卡 2B）。
做法同遊戲 Ken 版（3D planet/資料/freetime/clues/video/make_clue_video.py）：
  ① Codex CLI 畫首幀（水鈴站在同一個教室講台，參考圖＝水鈴造型＋Ken 版講台 stage.png，0 點）
  ② KIE Seedance 2.0 Mini 首幀模式 720p 6 秒、不生成聲音  ③ ffmpeg 去音軌 → final/<act>.mp4
  python -I make_mime.py frame                 # 只畫首幀 frames/stage.png
  python -I make_mime.py video jogging [...]   # 生成影片 raw/<act>_<n>.mp4 → final/<act>.mp4
動作描述沿用 Ken 版 SHOTS（he→she）。花費記在 ledger.json；上限 700 點（規格卡），超過就拒絕開始。
"""
import json, os, re, shutil, subprocess, sys, time, glob, hashlib, importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")
KEN_DIR = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\資料\freetime\clues\video")
REF = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\資料\generated-images\mascot_B_shuiling_apose.png")
MODEL, BUDGET, LEDGER = "bytedance/seedance-2-mini", 1100, HERE / "ledger.json"   # 老師 11/14：全部重拍成空手，上限 700 → 1100
WORK = Path(r"C:\Users\User\whatif-shuiling-work\mime")

spec = importlib.util.spec_from_file_location("kenclue", KEN_DIR / "make_clue_video.py"); kc = importlib.util.module_from_spec(spec); spec.loader.exec_module(kc)


def she(s):
    for a, b in ((r"\bhe\b", "she"), (r"\bHe\b", "She"), (r"\bhis\b", "her"), (r"\bHis\b", "Her"), (r"\bhim\b", "her"), (r"\bhimself\b", "herself")):
        s = re.sub(a, b, s)
    return s


SHOTS = {k: (she(a), she(b)) for k, (a, b) in kc.SHOTS.items()}
# 第 1 次 8 段 KIE 自己畫出道具（書、沙發、球、腳踏車…）→ 重拍版：描述只寫「身體與空手的形狀」，不出現任何物品名詞
NOPROP = {
 "recorder": ("she raises both EMPTY hands to her lips, one fist loosely stacked above the other with only her fingertips wiggling up and down one by one, lips pursed and blowing a long soft breath",
              "she takes one huge breath with her chest and shoulders rising, then keeps the same stacked empty hands at her lips, puffs her cheeks, sways side to side and taps one foot"),
 "english": ("she holds her two EMPTY open palms side by side, facing up, in front of her chest, her eyes and head moving left to right across her palms line by line, then she flips one palm over like turning a page",
             "with her right index finger she traces small lines on her empty left palm as if writing, stops, scratches her head thinking hard, then raises one finger with a bright eureka face"),
 "tv": ("she bends her knees and leans back as if sitting in an invisible armchair, one arm resting on nothing, her right hand stretched forward with the thumb pressing down again and again with a bored face",
        "she suddenly points forward with her empty hand, bursts into big silent laughter holding her belly with both hands, shoulders shaking, slapping her knee"),
 "games": ("she holds both EMPTY hands together in front of her belly, both thumbs pressing very fast, leaning and twisting her whole body left and right with a tense concentrated face",
           "she freezes, then throws both empty fists high in the air in a huge silent victory cheer and jumps, then quickly goes back to the fast thumb presses"),
 "basketball": ("she bends her knees low and pats the air down and up with one EMPTY open palm in a fast bouncing rhythm, looking left and right like a player",
                "she jumps high and pushes both EMPTY hands up above her head with a flick of the wrists, holds the pose, watches upward, then pumps her fist"),
 "bike": ("standing on the empty stage with NOTHING under her, she holds both EMPTY fists out in front at waist height and lifts her knees in big alternating circles on the spot, leaning slightly forward",
          "keeping the same pose she flicks her right thumb again and again, then leans her whole body left and right as if turning corners, knees still circling"),
 "baseball": ("she stands side-on with both EMPTY fists stacked near her right shoulder, wiggles, then makes one huge full swing of her arms, twisting her whole body",
              "she shades her eyes with one empty hand and follows something far, far away with her head, then jumps and punches the air in celebration"),
 "camping": ("she kneels on one knee and swings one EMPTY fist down again and again towards the floor in big hammering moves, then pulls hand over hand on nothing with both empty fists",
             "she sits down cross-legged, holds both EMPTY open palms out and rubs them together warming them, shivers happily, then points up and gazes at the sky in wonder"),
}
for k, v in NOPROP.items(): SHOTS[k] = v

# 第 2 次：english 後半又冒出書、tv 又冒出沙發（「坐進看不見的扶手椅」會畫椅子）、baseball 揮棒瞬間有球棒殘影 → 第 3 次改寫
NOPROP.update({
 "english": ("she holds her two EMPTY open palms side by side, facing up, in front of her chest, and moves her eyes and head left to right across her own palms, reading them carefully",
             "she taps her open left palm with her right index finger as if checking words, then taps her temple with that finger thinking hard, then raises the finger high with a bright eureka face"),
 "tv": ("she flops down to sit on the bare wooden stage floor, leaning back on one hand with her knees up, her other EMPTY hand stretched forward with the thumb pressing down again and again, bored face",
        "she suddenly points forward with her empty hand, bursts into big silent laughter holding her belly, rocking back on the floor and slapping her knee"),
 "baseball": ("she stands side-on, clasps her two EMPTY hands together near her right shoulder, wiggles her hips, then twists her whole body and swings her clasped empty hands around in one big arc",
              "she shades her eyes with one empty hand and follows something far, far away with her head, then jumps and punches the air in celebration"),
})
for k, v in NOPROP.items(): SHOTS[k] = v
STRICT = ("IMPORTANT - PANTOMIME WITH EMPTY HANDS: her hands are completely empty in every frame. Do not draw any object at all: no book, no furniture, "
          "no chair, no sofa, no ball, no bat, no bicycle, no controller, no instrument, no remote, no tool, no rope. Her golden bell stays on her dress. "
          "The stage floor stays empty and clean.")
GIRL = ("the same cute girl as in the first attached reference image (SHUILING): big brown eyes, light-blue hair shaped like a water drop with a curled tip and curls at the sides, "
        "golden rice-ear hair ornaments with small white flowers, white puffy cloud-like sleeves, a green dress with rice-field wave patterns and a small golden bell, "
        "light-green translucent ribbons, green-and-white boots; keep her exact design and colours; nothing in her hands")
STAGE = she(kc.STAGE)
LOOK = kc.LOOK
RULES = she(kc.RULES).replace("Keep her face, hair, goggles and school uniform exactly as in the opening frame",
                              "Keep her face, water-drop hair, rice-ear ornaments and green dress exactly as in the opening frame")


def gen_frame():
    (HERE / "frames").mkdir(exist_ok=True); WORK.mkdir(parents=True, exist_ok=True)
    dst = HERE / "frames" / "stage.png"
    shutil.copy(REF, WORK / "shuiling_ref.png"); shutil.copy(KEN_DIR / "frames" / "stage.png", WORK / "ken_stage.png")
    prompt = ("Use your built-in image generation tool to create this image. The first attached image (shuiling_ref.png) is the character reference. "
              "The second attached image (ken_stage.png) shows the exact classroom stage, camera angle and 3D cartoon look to copy - but the boy must NOT appear. "
              f"Scene: {GIRL}. {STAGE} {LOOK} Landscape 16:9 image. Save the PNG as stage.png in the current directory. Reply with the saved file path only.")
    stale = WORK / "stage.png"
    if stale.exists(): stale.unlink()
    t0 = time.time()
    r = subprocess.run("codex exec --skip-git-repo-check -s workspace-write -i shuiling_ref.png -i ken_stage.png -", input=prompt, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", cwd=str(WORK), shell=True, timeout=1200)
    out = r.stdout + r.stderr
    src = str(stale) if stale.exists() and os.path.getmtime(stale) > t0 else None
    if not src:
        rec = sorted(glob.glob(os.path.expanduser(r"~\.codex\generated_images\**\*.png"), recursive=True), key=os.path.getmtime)
        if rec and os.path.getmtime(rec[-1]) > t0: src = rec[-1]
    if not src:
        print("FAIL frame", out[-400:], flush=True); return False
    shutil.copy(src, dst)
    (HERE / "frames" / "provenance.json").write_text(json.dumps({"stage": {"prompt": prompt, "sha256": hashlib.sha256(dst.read_bytes()).hexdigest(),
        "generated": time.strftime("%Y-%m-%d %H:%M:%S"), "tool": "codex exec (built-in image generation) -i shuiling_ref.png -i ken_stage.png"}}, ensure_ascii=False, indent=1), encoding="utf-8")
    print("ok frame", round(time.time() - t0), flush=True); return True


def ledger(): return json.loads(LEDGER.read_text(encoding="utf-8")) if LEDGER.exists() else []
def spent(): return sum(r.get("credits") or 0 for r in ledger())


def gen_video(k, dur=6, res="720p"):
    import kie
    (HERE / "raw").mkdir(exist_ok=True); (HERE / "final").mkdir(exist_ok=True)
    n = len(list((HERE / "raw").glob(f"{k}_*.mp4"))) + 1
    small = WORK / f"{k}_first.jpg"; WORK.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(HERE / "frames" / "stage.png"), "-vf",
                    "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "2", str(small)], check=True)
    A, B = SHOTS[k]
    inp = {"prompt": " ".join([STRICT, "Stylised 3D cartoon animation exactly like the opening frame.",
                                f"Action, first half (about 3 seconds): {A}. Second half (about 3 seconds): {B}.", RULES]),
           "resolution": res, "aspect_ratio": "16:9", "duration": dur, "web_search": False, "generate_audio": False,
           "first_frame_url": kie.upload(small, upload_path="shuiling-mime", file_name=f"{k}_first.jpg")}
    (HERE / "raw" / f"{k}_{n}.request.json").write_text(json.dumps(inp, ensure_ascii=False, indent=1), encoding="utf-8")
    t0 = time.time(); tid = kie.create(MODEL, inp); d = kie.wait(tid)
    rec = dict(shot=k, res=res, take=n, taskId=tid, state=d["state"], credits=d.get("creditsConsumed"), secs=round(time.time() - t0), fail=d.get("failMsg") or "")
    if d["state"] == "success":
        raw = HERE / "raw" / f"{k}_{n}.mp4"
        kie.download(d["result"]["resultUrls"][0], raw); rec["file"] = f"raw/{k}_{n}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-an", "-c:v", "libx264", "-crf", "20", "-preset", "slow",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(HERE / "final" / f"{k}.mp4")], check=True)
    L = ledger(); L.append(rec); LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(rec, ensure_ascii=False), flush=True)
    return rec


if __name__ == "__main__":
    cmd, ids = sys.argv[1], (sys.argv[2:] or list(SHOTS))
    if cmd == "frame":
        gen_frame()
    elif cmd == "show":
        print(json.dumps(SHOTS, ensure_ascii=False, indent=1)); print(RULES)
    else:
        est = len(ids) * 6 * 9
        if spent() + est > BUDGET: sys.exit(f"已花 {spent()} 點，這次預估 {est}，會超過上限 {BUDGET}：先問老師。")
        for k in ids: gen_video(k)
        print("累計花費", spent(), "點", flush=True)
