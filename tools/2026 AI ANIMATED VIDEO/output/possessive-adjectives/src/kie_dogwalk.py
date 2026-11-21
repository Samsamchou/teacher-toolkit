"""第 6 段 They walk their dog…：KIE Seedance 2.0 Mini 首幀模式（老師 11/15 同意：先 480p 試拍，通過再 720p；上限 125 點）。
  python src/kie_dogwalk.py 480p   → renders/kie/dogwalk_480p_<n>.mp4
  python src/kie_dogwalk.py 720p
花費記在 renders/kie/ledger.json。
"""
import json, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")
import kie

MODEL, BUDGET = "bytedance/seedance-2-mini", 125
OUT = ROOT / "renders" / "kie"; OUT.mkdir(parents=True, exist_ok=True); LEDGER = OUT / "ledger.json"
WORK = Path(r"C:\Users\User\whatif-possessive-work\kie"); WORK.mkdir(parents=True, exist_ok=True)
PROMPT = (
    "Flat 2D vector cartoon animation exactly like the opening frame: same thin dark navy outlines, flat colours, same grandpa, grandma and brown dog Lucky. "
    "Grandpa and grandma walk slowly and happily along the country path toward the right of the frame, taking natural small steps with their legs moving, "
    "arms swinging gently. Grandpa keeps holding the red leash in his right hand the whole time; the leash stays connected to Lucky's red collar. "
    "Lucky trots in front with his tail wagging and tongue out, sometimes looking back at them. Grandma smiles and waves, then chats with grandpa. "
    "The rice fields sway softly in the breeze. The camera tracks smoothly sideways with them so they stay in frame. "
    "Keep their faces, clothes and colours exactly as in the opening frame. No text, no new people, no new objects."
)


def ledger(): return json.loads(LEDGER.read_text(encoding="utf-8")) if LEDGER.exists() else []


def main(res):
    spent = sum(r.get("credits") or 0 for r in ledger())
    if spent >= BUDGET: sys.exit(f"已花 {spent} 點，超過上限 {BUDGET}")
    n = len(list(OUT.glob(f"dogwalk_{res}_*.mp4"))) + 1
    small = WORK / "dogwalk_first.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(ROOT / "assets" / "raw" / "dogwalk_first.png"), "-vf",
                    "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "2", str(small)], check=True)
    inp = {"prompt": PROMPT, "resolution": res, "aspect_ratio": "16:9", "duration": 6, "web_search": False, "generate_audio": False,
           "first_frame_url": kie.upload(small, upload_path="possessive-dogwalk", file_name="dogwalk_first.jpg")}
    t0 = time.time(); tid = kie.create(MODEL, inp); d = kie.wait(tid)
    rec = dict(shot="dogwalk", res=res, take=n, taskId=tid, state=d["state"], credits=d.get("creditsConsumed"), secs=round(time.time() - t0), fail=d.get("failMsg") or "")
    if d["state"] == "success":
        raw = OUT / f"dogwalk_{res}_{n}.mp4"; kie.download(d["result"]["resultUrls"][0], raw); rec["file"] = raw.name
    L = ledger(); L.append(rec); LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(rec, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "480p")
