"""故事 2 動作鏡頭：KIE Seedance 2.0 Mini 首幀模式（和 kie_actions.py 同一套做法）。
※ 要花 KIE 點數 — 老師同意報價後才能執行；先 480p 試拍、通過才 720p。一次只跑一個鏡頭（同時跑會互相蓋掉 ledger）。
  python cutout/kie_actions_s2.py <jog|station|tv|homework> <480p|720p>   → renders/kie/<shot>_<res>_<n>.mp4
花費記在 renders/kie/ledger_s2.json（故事 2 自己一本）。姿勢檢查點見 rdq/RDQ-spec-story2-actions-20261121.md。
"""
import json, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")

MODEL, BUDGET = "bytedance/seedance-2-mini", 100000          # BUDGET＝故事 2 的點數上限；老師同意後由主對話填（0＝還沒同意，不能跑）
OUT = ROOT / "renders" / "kie"; OUT.mkdir(parents=True, exist_ok=True); LEDGER = OUT / "ledger_s2.json"
WORK = Path(r"C:\Users\User\whatif-verbs-work\kie")
STYLE = ("Flat 2D paper cutout puppet animation exactly like the opening frame: thick dark-brown outlines, flat colours, the same girl Shuiling (light-blue water-drop hair with a curled tip, golden wheat ears and small white flowers "
         "in her hair, green dress with white puff sleeves, white belt with a small gold bell, white socks, green shoes). Keep her face, hair, clothes, colours and the background exactly as in the opening frame. "
         "Exactly one girl with two arms and two legs; her hands stay open with visible fingers. No cuts. "
         "IMPORTANT: no text, no letters, no subtitles, no new people, no animals walking in, no extra arms, hands or legs, nothing new enters the frame.")
SHOTS = dict(
    jog=dict(frame="ff2_jog.png", dur=5, prompt=(
        "Shuiling jogs at an easy, steady pace toward the right along the riverside path, seen from the side. Natural relaxed jogging form: her body stays upright and tall with only a very slight forward lean, head up, eyes looking ahead; "
        "opposite arm and leg move together (when the left leg goes forward the right arm goes forward, then they switch); both elbows stay bent about 90 degrees and the arms swing gently forward and back beside her body, never across her chest; "
        "her knees lift only a little, each foot lands softly under her body and pushes off the ground; small light bouncing steps, her hair curls and the gold bell bounce a little. She keeps a happy closed-mouth smile and keeps jogging the whole time, "
        "about three steps per second. She never walks, never stops, never waves, never jumps. The camera tracks sideways with her at the same speed, so she stays in the left third of the frame while the fence, the river, the trees and the hills slide past to the left. "
        "No zoom. Cloudy sky, no sun. ")),
    station=dict(frame="ff2_station.png", dur=6, prompt=(   # v2（11/21）：試拍 1 的車站和火車 2.5 秒後就滑出畫面 → 背景只慢慢移、全程留在畫面裡
        "Shuiling jogs at an easy, steady pace toward the right along the path, seen from the side, passing an old train station. Same relaxed jogging form the whole time: upright body, opposite arm and leg move together, "
        "both elbows bent about 90 degrees, arms swinging forward and back beside her body, feet landing softly under her body; she never walks and never stops. She stays in the left third of the frame. "
        "She jogs slowly and the station is far behind the fence, so the background moves only VERY slowly: during the whole shot the station building and the black steam locomotive drift only a little to the left, "
        "less than one fifth of the frame width. IMPORTANT: the whole station building and the whole black steam locomotive stay clearly visible inside the frame from the first frame to the last frame; "
        "they never leave the frame and are never hidden. The locomotive stays standing still on its track; nobody is on it. After about three seconds the locomotive blows its whistle twice: two short round puffs "
        "of white steam pop up from its chimney, one after the other, and Shuiling turns her head a little toward the locomotive and smiles while she keeps jogging. No zoom. Cloudy sky, no sun. ")),
    tv=dict(frame="ff2_tv.png", dur=6, prompt=(
        "Fixed camera, no camera movement, no zoom, no pan. Shuiling sits on the orange sofa and watches TV. She stays seated the whole time with correct sitting posture: her back rests against the sofa back, her knees stay bent, and BOTH feet stay flat on the floor. "
        "Her right hand keeps holding the grey remote control on her lap; her left hand stays resting on the sofa cushion. She keeps looking at the TV screen on the left. On the TV screen the orange cartoon cat keeps jumping after the yellow butterfly and "
        "misses it in a funny way. For the first three seconds Shuiling watches with a smile; after about three seconds she laughs happily: her mouth opens wide, her eyes close into happy curves, her head tips back a little and her shoulders shake up and down "
        "two or three times. She does not stand up, does not lift her feet onto the sofa, does not drop the remote, and no second remote, cup or food appears. ")),
    homework=dict(frame="ff2_homework.png", dur=5, prompt=(   # v2（11/21）：試拍 1 約 1 秒時畫面跳一下、露出桌腳和腳 → 鏡頭鎖死
        "LOCKED-OFF camera: the framing stays EXACTLY the same as the opening frame from the first frame to the last frame: no camera movement, no zoom in, no zoom out, no pan, no tilt, no reframing, no cut. "
        "The bottom part of the picture stays the plain flat wooden desk front the whole time; her legs, her feet, the chair legs and the floor are NEVER visible. "
        "The desk, window, shelf, plant, book and pencil cup never change shape or position. Shuiling sits at the desk and does her homework, sitting upright the whole time. "
        "Her LEFT hand stays flat and open on the paper to hold it still. Her RIGHT hand keeps the same pencil grip as in the opening frame: the pencil is pinched near its tip by the thumb and index finger and rests on the middle finger, "
        "and the pencil keeps leaning back toward her right shoulder, with the pink eraser end pointing at her shoulder, never toward her face and never straight up. The pencil tip stays touching the paper and writes slowly "
        "from left to right along one line with small finger and wrist movements, then her hand moves down to the next line and writes again. Only thin grey pencil lines appear on the paper, no readable letters. "
        "Her eyes follow the pencil tip; she keeps a calm happy smile and gives one small satisfied nod near the end. She does not lift the pencil into the air, does not change hands, does not turn the page, "
        "and no second pencil or extra paper appears. ")),
)


def ledger(): return json.loads(LEDGER.read_text(encoding="utf-8")) if LEDGER.exists() else []


def main(shot, res):
    import kie                                           # 只有真的要拍時才載入
    S = SHOTS[shot]; spent = sum(r.get("credits") or 0 for r in ledger())
    if spent >= BUDGET: sys.exit(f"已花 {spent} 點，上限 {BUDGET}（0＝老師還沒同意報價，不能拍）")
    WORK.mkdir(parents=True, exist_ok=True)
    n = len(list(OUT.glob(f"{shot}_{res}_*.mp4"))) + 1
    small = WORK / ("s2_" + shot + ".jpg")
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(ROOT / "assets" / "firstframes" / S["frame"]), "-vf",
                    "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "2", str(small)], check=True)
    inp = {"prompt": STYLE + " " + S["prompt"], "resolution": res, "aspect_ratio": "16:9", "duration": S["dur"], "web_search": False, "generate_audio": False,
           "first_frame_url": kie.upload(small, upload_path="verbs-story2", file_name=shot + ".jpg")}
    t0 = time.time(); tid = kie.create(MODEL, inp); d = kie.wait(tid)
    rec = dict(shot=shot, res=res, take=n, taskId=tid, state=d["state"], credits=d.get("creditsConsumed"), secs=round(time.time() - t0), fail=d.get("failMsg") or "")
    if d["state"] == "success":
        raw = OUT / f"{shot}_{res}_{n}.mp4"; kie.download(d["result"]["resultUrls"][0], raw); rec["file"] = raw.name
    L = ledger(); L.append(rec); LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(rec, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in SHOTS: sys.exit("用法：python cutout/kie_actions_s2.py <jog|station|tv|homework> <480p|720p>")
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "480p")
