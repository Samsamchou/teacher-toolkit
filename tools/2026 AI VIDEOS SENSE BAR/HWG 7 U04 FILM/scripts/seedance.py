"""Generate action shots with KIE AI Seedance 2.0 Mini (bytedance/seedance-2-mini, 720p, 16:9).

  python scripts/seedance.py <mode> S03 [S09 ...]
    mode ref   : multimodal reference mode. Reference images = first frame + character sheets;
                 reference audio = approved English voice (voices_final/<shot>.wav, padded to >= 2.5 s) when the shot has a line.
                 generate_audio on, so the model can move the mouth to the voice (the film still uses voices_final/).
    mode first : first-frame mode. first_frame_url = approved first frame, no audio sent, generate_audio off.
Outputs seedance/<shot>/<mode>_<n>.mp4 and appends to seedance/ledger.json (credits).
Budget (RDQ spec 2026-10-24): about 1500 credits for all Seedance work; the script refuses to start past it.
"""
import json, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

FILM = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(FILM.parent / "kie"))
import kie  # noqa: E402

CFG = json.loads((FILM / "shots.json").read_text(encoding="utf-8"))
SHOTS = {s["id"]: s for s in CFG["shots"]}
OUT = FILM / "seedance"
LEDGER = OUT / "ledger.json"
BUDGET = 1500
MODEL = "bytedance/seedance-2-mini"
STYLE = ("Japanese anime TV series, clean cel-shaded 2D animation with confident line art, flat colors with soft gradients, "
         "smooth expressive character animation, cozy sci-fi winter world.")
RULES = ("Keep every character's face, hair, outfit and colors exactly as in the reference images. "
         "No captions, no subtitles, no readable text, letters or numbers anywhere. No new characters appear.")


def ledger():
    return json.loads(LEDGER.read_text(encoding="utf-8")) if LEDGER.exists() else []


def spent():
    return sum(r.get("credits", 0) or 0 for r in ledger())


def padded_voice(sid):
    src = FILM / "voices_final" / f"{sid}.wav"
    dst = OUT / sid / f"{sid}_ref.wav"
    dst.parent.mkdir(parents=True, exist_ok=True)
    # 0.3 s lead-in, then pad the end so the clip is at least 2.5 s (KIE minimum is 2 s)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-af", "adelay=300,apad=whole_dur=2.5",
                    "-ar", "48000", "-ac", "1", str(dst)], check=True)
    return dst


def prompt(s, mode):
    who = ", ".join(CFG["chars"][k] for k in s["refs"])
    p = [STYLE]
    if mode == "ref":
        p.append("Reference image 1 is the opening frame: match its composition, background, lighting and characters."
                 + (" The other reference images are the character sheets." if s["refs"] else ""))
    p.append(f"Scene: {s['frame']}")
    if who:
        p.append(f"Characters: {who}.")
    p.append(f"Action: {s['action']}")
    ln = s.get("line")
    if ln:
        name = ln["who"].capitalize()
        p.append(f'{name} says in clear English: "{ln["text"]}"'
                 + (" Her/his lip movements follow the reference audio exactly." if mode == "ref" else "")
                 + " Only the speaker's mouth moves.")
    elif s["refs"]:
        p.append("Nobody speaks; all mouths stay closed.")
    p.append(RULES)
    return " ".join(p)


def run(sid, mode):
    s = SHOTS[sid]
    od = OUT / sid
    od.mkdir(parents=True, exist_ok=True)
    n = len(list(od.glob(f"{mode}_*.mp4"))) + 1
    inp = {"prompt": prompt(s, mode), "resolution": "720p", "aspect_ratio": "16:9", "duration": int(round(s["dur"])),
           "web_search": False}
    frame_url = kie.upload(FILM / "frames" / f"{sid}.png", file_name=f"{sid}_first.png")
    if mode == "first":
        inp.update(first_frame_url=frame_url, generate_audio=False)
    else:
        refs = [frame_url] + [kie.upload(FILM / "chars" / f"{k}.png", file_name=f"char_{k}.png") for k in s["refs"][:8]]
        inp.update(reference_image_urls=refs, generate_audio=True)
        if s.get("line"):
            inp["reference_audio_urls"] = [kie.upload(padded_voice(sid), file_name=f"{sid}_voice.wav")]
    (od / f"{mode}_{n}.request.json").write_text(json.dumps(inp, ensure_ascii=False, indent=1), encoding="utf-8")
    t0 = time.time()
    tid = kie.create(MODEL, inp)
    d = kie.wait(tid)
    rec = dict(shot=sid, mode=mode, take=n, taskId=tid, state=d["state"], credits=d.get("creditsConsumed"),
               secs=round(time.time() - t0), fail=d.get("failMsg") or "")
    if d["state"] == "success":
        kie.download(d["result"]["resultUrls"][0], od / f"{mode}_{n}.mp4")
        rec["file"] = f"seedance/{sid}/{mode}_{n}.mp4"
    L = ledger(); L.append(rec)
    LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding="utf-8")
    return rec


if __name__ == "__main__":
    mode, ids = sys.argv[1], sys.argv[2:]
    OUT.mkdir(exist_ok=True)
    if spent() >= BUDGET:
        sys.exit(f"Seedance 已花 {spent()} credits，達到上限 {BUDGET}：先問老師。")
    print(f"開始前已花 {spent()} credits；KIE 餘額 {kie.call('GET', '/api/v1/chat/credit')['data']}", flush=True)
    with ThreadPoolExecutor(4) as ex:
        for r in ex.map(lambda i: run(i, mode), ids):
            print(json.dumps(r, ensure_ascii=False), flush=True)
    print(f"累計 Seedance 花費 {spent()} credits", flush=True)
