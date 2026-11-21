"""故事 1 動作鏡頭：KIE Seedance 2.0 Mini 首幀模式（老師 11/21 同意：先 480p 試拍、通過才 720p；上限 350 點）。
  python cutout/kie_actions.py <throw_hit|run|catch> <480p|720p>   → renders/kie/<shot>_<res>_<n>.mp4
花費記在 renders/kie/ledger.json。姿勢檢查點見 rdq/RDQ-spec-story1-actions-20261121.md。
"""
import json, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")
import kie

MODEL, BUDGET = "bytedance/seedance-2-mini", 100000   # 老師 11/21：這支片 KIE 上限取消（仍要記帳、做完報實際用量）
OUT = ROOT / "renders" / "kie"; OUT.mkdir(parents=True, exist_ok=True); LEDGER = OUT / "ledger.json"
WORK = Path(r"C:\Users\User\whatif-verbs-work\kie"); WORK.mkdir(parents=True, exist_ok=True)
STYLE = ("Flat 2D paper cutout puppet animation exactly like the opening frame: thick dark-brown outlines, flat colours, same mom (long dark hair, lavender cardigan, navy trousers, brown baseball glove on her left hand) "
         "and same boy Ken (black spiky hair, orange goggles, navy and orange suit). Fixed camera, no camera movement, no cuts. Keep faces, clothes, colours and the sunny baseball park background exactly as in the opening frame. "
         "No text, no new people, no extra balls, no extra bats, no extra arms or hands.")
SHOTS = dict(
    throw_hit=dict(frame="ff_throw_hit.png", dur=6, prompt=(
        "A clear, slow, easy-to-read baseball play in one continuous wide shot. First, Mom (on the left) throws the ball with correct right-handed throwing form: she stays sideways with her left shoulder pointing at Ken, "
        "takes the ball out of her glove, lifts her right elbow up to shoulder height with the forearm up in an L shape, steps toward Ken with her left foot, shifts her weight forward and throws overhand; "
        "her arm follows through down across her body. The single white baseball flies in a straight, level line across the frame from her hand directly toward Ken's bat, at chest height. It does NOT fly up into the sky. "
        "Then Ken (on the right, a left-handed batter) swings correctly: both hands stay together on the bat handle, he takes a small step with his front foot toward Mom, turns his hips and swings the bat level "
        "through the strike zone; the bat hits the ball exactly when the ball arrives, with a small star flash at the contact point. The ball then flies back up and away toward the upper left, over Mom's head. "
        "Ken finishes the swing with the bat over his front shoulder and smiles. ")),
    run=dict(frame="ff_run.png", dur=5, prompt=(
        "Mom runs fast toward the right across the baseball field, seen from the side. Natural running form: opposite arm and leg move together (when the left leg goes forward the right arm goes forward), "
        "elbows stay bent about 90 degrees, arms swing forward and back beside her body, knees drive forward, feet land under her body and push off the ground; her long hair bounces behind her. "
        "She keeps looking up and ahead at a ball in the sky (the ball is not visible). The camera tracks sideways with her so she stays in the left half of the frame while the trees and fence slide past. She keeps running the whole time. ")),
    catch=dict(frame="ff_catch.png", dur=5, prompt=(
        "Mom catches a fly ball. The single white baseball falls straight down from the sky into her open brown glove above her head; the moment it lands, she closes the glove and covers it with her right hand "
        "(a correct two-handed catch). She then lowers the glove to her chest, takes the ball out with her right hand and holds it up proudly with a big smile, and gives a small happy jump. "
        "Ken (on the right) watches the ball fall, then raises his free hand and cheers; he keeps the bat down at his side. ")),
)


def ledger(): return json.loads(LEDGER.read_text(encoding="utf-8")) if LEDGER.exists() else []


def main(shot, res):
    S = SHOTS[shot]; spent = sum(r.get("credits") or 0 for r in ledger())
    if spent >= BUDGET: sys.exit(f"已花 {spent} 點，超過上限 {BUDGET}")
    n = len(list(OUT.glob(f"{shot}_{res}_*.mp4"))) + 1
    small = WORK / (shot + ".jpg")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(ROOT / "assets" / "firstframes" / S["frame"]), "-vf",
                    "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "2", str(small)], check=True)
    inp = {"prompt": STYLE + " " + S["prompt"], "resolution": res, "aspect_ratio": "16:9", "duration": S["dur"], "web_search": False, "generate_audio": False,
           "first_frame_url": kie.upload(small, upload_path="verbs-story1", file_name=shot + ".jpg")}
    t0 = time.time(); tid = kie.create(MODEL, inp); d = kie.wait(tid)
    rec = dict(shot=shot, res=res, take=n, taskId=tid, state=d["state"], credits=d.get("creditsConsumed"), secs=round(time.time() - t0), fail=d.get("failMsg") or "")
    if d["state"] == "success":
        raw = OUT / f"{shot}_{res}_{n}.mp4"; kie.download(d["result"]["resultUrls"][0], raw); rec["file"] = raw.name
    L = ledger(); L.append(rec); LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(rec, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "480p")
