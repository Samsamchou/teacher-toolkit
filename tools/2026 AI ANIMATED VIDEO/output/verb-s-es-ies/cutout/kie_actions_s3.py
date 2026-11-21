"""故事 3（Zun-Bo 的風箏）動作鏡頭：KIE Seedance 2.0 Mini 首幀模式。★ 還沒問老師、還沒報價同意 → 不要執行。★
  python cutout/kie_actions_s3.py <s3_fly|s3_try|s3_cry|s3_hurry|s3_help|s3_happy> <480p|720p>   → renders/kie/<shot>_<res>_<n>.mp4
花費記在 renders/kie/ledger_s3.json（和故事 1、2 的帳分開）。一次只跑一個鏡頭（同時跑會互相蓋掉 ledger）。
姿勢檢查點見 rdq/RDQ-spec-story3-actions-20261121.md。先 480p 試拍、老師通過才 720p。BUDGET 等老師同意的上限再改。
"""
import json, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL, BUDGET = "bytedance/seedance-2-mini", 100000          # 0＝還沒核准；老師同意後改成核准的點數上限
OUT = ROOT / "renders" / "kie"; LEDGER = OUT / "ledger_s3.json"
WORK = Path(r"C:\Users\User\whatif-verbs-work\kie")
STYLE = ("Flat 2D paper cutout puppet animation exactly like the opening frame: thick dark-brown outlines, flat colours. Same characters as the opening frame: Zun-Bo (robot with a teal helmet, orange headlamp on top, orange ear caps, "
         "white face with big dark-green eyes, white body with a teal chest panel and an orange valve wheel, teal boots), Ken (boy with black spiky hair, orange goggles on his forehead, navy and orange suit), "
         "Shuiling (girl with light-blue water-drop hair, wheat ears and white flowers, green dress with white puff sleeves). Fixed camera, no camera movement, no zoom, no cuts. "
         "Keep faces, clothes, colours and the windy grassy park with one big tree on the right exactly as in the opening frame; the wind blows from left to right (grass, leaves and the kite tail move to the right). "
         "There is exactly ONE red-and-yellow diamond kite. The thin white kite line stays connected the whole time, from the spool in the hands all the way to the kite; it never breaks and never disappears. "
         "No text, no letters, no extra people, no extra limbs, no extra hands, no extra kites, no power lines.")
SHOTS = dict(
    s3_fly=dict(frame="ff3_fly.png", dur=5, prompt=(
        "Ken flies the kite with correct technique. He stands still with his back to the wind, holding the wooden spool with both hands in front of his chest, arms in front of his body, looking up at the kite the whole time. "
        "He gently lets out a little line and then gives small, calm pulls; the kite climbs a little higher and floats steadily high in the sky to the left of the tree, nose up, its tail streaming to the right in the wind. "
        "The line stays tight and gently curved between the spool and the kite. Zun-Bo, standing behind Ken, watches the kite and waves one open hand happily. Nobody walks away. ")),
    s3_try=dict(frame="ff3_try.png", dur=6, prompt=(
        "Zun-Bo tries to fly the kite but he is a beginner. He holds the spool with both hands in front of his chest and looks up, worried. For the first three seconds the kite wobbles left and right, tilts, and slowly loses height while the line goes slack and wavy; "
        "Zun-Bo pulls the line with small clumsy tugs and takes one small step back. Then a gust of wind pushes the kite to the right, and at about four seconds the kite drifts into the lower left side of the big tree's leafy crown and gets STUCK on a low branch; a few leaves shake and fall. "
        "The kite stays stuck in the tree and does not fall to the ground. The line now runs from Zun-Bo's spool up to the kite in the tree and hangs loose. Zun-Bo's shoulders drop and his mouth opens in dismay. Ken, standing behind him, puts both open hands on his cheeks in surprise. Nobody climbs the tree. ")),
    s3_cry=dict(frame="ff3_cry.png", dur=5, prompt=(
        "Zun-Bo cries because his kite is stuck in the tree. He stands in the same place facing the viewer, holding the spool low in front of his body with both hands the whole time; his hands stay low and never cover his face. "
        "Big light-blue tears roll down both of his cheeks and drip off one after another; his mouth is open in a sad wail; his shoulders shake up and down with small sobs. "
        "At about two seconds he slowly lifts his head and looks up at the kite in the tree on the right, then lowers his head again and keeps crying. "
        "The kite stays stuck in the lower branches of the tree and only its tail sways a little in the wind; it does not fall and does not fly. The slack kite line stays connected from the spool to the kite. "
        "Ken, standing a little behind him on the left, leans in a little toward Zun-Bo with a worried, caring face to comfort him; he does not touch the line or the spool. Nobody walks away, nobody climbs the tree. ")),
    s3_hurry=dict(frame="ff3_hurry.png", dur=5, prompt=(
        "Shuiling hurries to help: she runs fast from the left toward Zun-Bo, seen from the side. Natural running form: opposite arm and leg move together (when the left leg goes forward the right arm goes forward), "
        "both elbows stay bent about 90 degrees, arms swing forward and back beside her body (not across her chest), hands open and relaxed, knees drive forward, feet land under her body and push off the grass; her hair and dress bounce. "
        "She runs across the lawn and at about four seconds she slows down and stops next to Zun-Bo, facing him kindly. Zun-Bo stands still, crying with tears on his cheeks, holding the spool down in one hand; he turns his head toward her. "
        "The kite stays stuck in the tree on the right, its tail swaying; the loose line stays connected from the spool to the kite. Nobody climbs the tree. ")),
    s3_help=dict(frame="ff3_help.png", dur=5, prompt=(
        "Shuiling safely frees the kite. She stands on the grass with both feet on the ground the whole time and holds the long bamboo pole with both hands. She carefully pushes the tip of the pole up under the kite and gently lifts it off the low branch (she does not hit it). "
        "At about three seconds the kite comes free from the branch, a few leaves fall, and the wind lifts the kite up and away from the tree into the open sky on the left of the tree. "
        "Zun-Bo keeps the line loose while she works (he does not pull), then, when the kite is free, he gently takes up the slack so the line becomes tight; he looks up and starts to smile. Shuiling lowers the pole and smiles. "
        "Nobody climbs the tree, nobody uses a ladder, nobody jumps. ")),
    s3_happy=dict(frame="ff3_happy.png", dur=5, prompt=(
        "Zun-Bo flies the kite well now and he is very happy. He stands with his back to the wind, holding the spool with both hands in front of his chest, arms in front of his body, looking up at the kite with a big smile. "
        "He lets out a little line and the kite rises higher and flies steadily high in the sky to the left of the tree, nose up, tail streaming to the right; the line stays tight and nearly straight. "
        "Zun-Bo gives two small happy bounces on his feet. Behind him, Ken and Shuiling cheer: they raise their open hands, clap once and smile, looking up at the kite. They do not touch the line. ")),
)


def ledger(): return json.loads(LEDGER.read_text(encoding="utf-8")) if LEDGER.exists() else []


def main(shot, res):
    sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")
    import kie
    S = SHOTS[shot]; spent = sum(r.get("credits") or 0 for r in ledger())
    if spent >= BUDGET: sys.exit(f"已花 {spent} 點，上限 {BUDGET}（老師同意報價後才把 BUDGET 改成核准的點數）")
    OUT.mkdir(parents=True, exist_ok=True); WORK.mkdir(parents=True, exist_ok=True)
    n = len(list(OUT.glob(f"{shot}_{res}_*.mp4"))) + 1
    small = WORK / (shot + ".jpg")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(ROOT / "assets" / "firstframes" / S["frame"]), "-vf",
                    "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "2", str(small)], check=True)
    inp = {"prompt": STYLE + " " + S["prompt"], "resolution": res, "aspect_ratio": "16:9", "duration": S["dur"], "web_search": False, "generate_audio": False,
           "first_frame_url": kie.upload(small, upload_path="verbs-story3", file_name=shot + ".jpg")}
    t0 = time.time(); tid = kie.create(MODEL, inp); d = kie.wait(tid)
    rec = dict(shot=shot, res=res, take=n, taskId=tid, state=d["state"], credits=d.get("creditsConsumed"), secs=round(time.time() - t0), fail=d.get("failMsg") or "")
    if d["state"] == "success":
        raw = OUT / f"{shot}_{res}_{n}.mp4"; kie.download(d["result"]["resultUrls"][0], raw); rec["file"] = raw.name
    L = ledger(); L.append(rec); LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(rec, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in SHOTS: sys.exit("用法：python cutout/kie_actions_s3.py <" + "|".join(SHOTS) + "> <480p|720p>")
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "480p")
