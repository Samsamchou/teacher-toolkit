"""H3 試做 spec（改自 SF3 R1 build_specs.py）。每句念兩次 → 每鏡兩段：<id>_1（0.8 倍）、<id>_2（0.7 倍），同一張首幀。
  python scripts/build_specs.py            -> h3/<id>_<k>/{spec.json, guide.wav, first.png}
然後：python "../../2026 AI VIDEOS SENSE BAR/shanshiba-workflow-32gvram-64gram/cloud/colab_h3.py" --name tg batch h3/*/spec.json
"""
import json, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np, soundfile as sf
from PIL import Image

FILM = Path(__file__).resolve().parents[1]
SR, FPS, SIZE, LINE_AT, TAIL = 48000, 24, (1344, 768), 0.5, 0.8

STYLE = ("a modern family 3D animated feature film with soft rounded clay-like shapes, gentle subsurface lighting, warm cinematic "
         "color and smooth expressive character animation, matching the first frame exactly")
PIPPY = dict(key="pippy",
             desc=("Pippy (a small round pumpkin-pie mascot: golden crimped crust rim around his orange face, big brown eyes, rosy "
                   "cheeks, whipped-cream swirl on top, small black tall hat with a brown band, white collar, short cream arms, "
                   "little brown boots)"),
             voice="a natural, cute, sweet young child's voice")
SHOTS = {
    "S03": dict(
        setting="the wooden deck of the Mayflower, a 17th-century sailing ship crossing the Atlantic Ocean in 1620",
        subjects=[PIPPY],
        action=("Starting from <Picture 1>, the ship sails forward through the big blue waves: the bow rises and dips, white spray "
                "bursts from the hull, the cream canvas sails swell and ripple in the strong wind, the ropes sway and the seagulls "
                "glide across the sky. Pippy stands on the deck in the lower right holding his hat against the wind with one hand, "
                "points ahead with the other and tells the story to the camera with an excited, amazed face. After the line his "
                "lips close and he keeps smiling as the ship rocks."),
        sound="Ocean ambience: rolling waves, wind in the sails, creaking wooden ship, distant seagulls."),
    "S08": dict(
        setting="a spring field near the coast of New England in 1621, small mounds of fresh soil, woods and a thatched house behind",
        subjects=[PIPPY,
                  dict(key="tisquantum", desc="Tisquantum (a Wampanoag man with long dark hair, deerskin mantle and leggings)",
                       voice="silent"),
                  dict(key="pilgrim", desc="a Pilgrim man (dark wool coat, white collar, dark felt hat, brown beard)", voice="silent")],
        action=("Starting from <Picture 1>, Tisquantum kneels in the soil, makes a small hole in the mound with his fingers, drops "
                "the corn seeds in one by one and gently covers them with soil, showing the Pilgrim man, who nods and copies him "
                "on the next mound. In the lower left Pippy pats the soil with his little hand, tips his tiny watering can so water "
                "sprinkles on the mound, then looks at the camera and tells the story with a happy face. Tisquantum and the Pilgrim "
                "man do not speak; only Pippy talks. After the line Pippy's lips close and he smiles. Petals drift in a light breeze."),
        sound="Spring field ambience: birds singing, a light breeze, soft digging in soil, sprinkling water."),
}
CONSTRAINTS = [
    "The 3D animation style, colors and lighting stay exactly as in the first frame for the whole clip.",
    "No new people or characters appear that are not already in the first frame.",
    "No captions, no subtitles, no readable text, letters or numbers appear anywhere.",
    "Every character keeps the same face, body, outfit and colors as in the first frame.",
    "Only Pippy speaks; everyone else keeps their mouth closed.",
]
TEXT = json.loads((FILM / "voices" / "words.json").read_text(encoding="utf-8"))


def frames_for(d):
    n = 0
    while 17 * n + 5 < d * FPS:
        n += 1
    return 17 * n + 5


def load(mp3):
    t = Path(tempfile.mkdtemp()) / "a.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ar", str(SR), "-ac", "1", str(t)], check=True)
    w, _ = sf.read(str(t), dtype="float32")
    idx = np.where(np.abs(w) > 0.01)[0]
    return w[max(0, idx[0] - 2400): idx[-1] + 2400] if len(idx) else w


def build(sid, k, cfg):
    od = FILM / "h3" / f"{sid}_{k}"
    od.mkdir(parents=True, exist_ok=True)
    Image.open(FILM / "frames" / f"{sid}.png").convert("RGB").resize(SIZE, Image.LANCZOS).save(od / "first.png")
    w = load(FILM / "voices" / f"{sid}_{k}.mp3")
    sf.write(str(FILM / "voices" / f"{sid}_{k}.wav"), w, SR, subtype="PCM_16")
    secs = frames_for(LINE_AT + len(w) / SR + TAIL) / FPS
    buf = np.zeros(int(secs * SR), dtype=np.float32)
    st = int(LINE_AT * SR)
    seg = w[: len(buf) - st]
    buf[st:st + len(seg)] = seg
    with wave.open(str(od / "guide.wav"), "wb") as g:
        g.setnchannels(1); g.setsampwidth(2); g.setframerate(SR)
        g.writeframes((np.clip(buf, -1, 1) * 32767).astype("<i2").tobytes())
    action = cfg["action"] + (" Everything moves a little slower and calmer this time." if k == 2 else "")
    spec = dict(
        duration=round(secs - 0.02, 3), size=list(SIZE), seed=20261103 + k, steps=14, draft=True,
        style=STYLE, setting=cfg["setting"], first_frame="first.png", subjects=cfg["subjects"],
        audio={"fixed": {"file": "guide.wav"}},
        shots=[dict(camera="The camera holds a steady shot with a very slow gentle push in.", action=action,
                    dialogue=[dict(subject="pippy", line=TEXT[sid]["text"], lang="English",
                                   after="Right after the line Pippy's lips close and stay closed.")])],
        constraints=CONSTRAINTS, soundscape=cfg["sound"], music="N/A",
    )
    (od / "spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding="utf-8")
    return f"{sid}_{k} {secs:.2f}s"


if __name__ == "__main__":
    only = sys.argv[1:]
    for sid, cfg in SHOTS.items():
        if only and sid not in only:
            continue
        for k in (1, 2):
            print(build(sid, k, cfg))
