"""Build one h3_shot spec per shot (repo format; same rules as pipeline/template_local/make_film.py, but English).
  python scripts/build_specs.py [S02 S05 ...]      -> h3/<id>/{spec.json, guide.wav, first.png}
Lines use the fixed VoxCPM2 voice (voices/<id>.wav) as the guide track, starting at LINE_AT seconds.
Shots without a line get a silent guide (otherwise characters mumble); narration is mixed in post.
Then: python ../shanshiba-workflow-32gvram-64gram/cloud/colab_h3.py --name u04 batch h3/*/spec.json
"""
import json, sys, wave
from pathlib import Path
import numpy as np, soundfile as sf
from PIL import Image

FILM = Path(__file__).resolve().parents[1]
CFG = json.loads((FILM / "shots.json").read_text(encoding="utf-8"))
SEEDS = json.loads((FILM / "seeds.json").read_text(encoding="utf-8")) if (FILM / "seeds.json").exists() else {}
SR, FPS, SIZE, LINE_AT, TAIL = 48000, 24, (1344, 768), 0.6, 0.9

STYLE = ("a Japanese anime TV series in clean cel-shaded 2D animation with confident line art, flat colors with soft gradients "
         "and smooth expressive character animation, matching the first frame exactly")
SETTING = {
    "field": "a snowy Finnish landscape at night under green and violet Northern Lights",
    "classroom": "a cozy sci-fi elf school classroom inside a wooden log cabin",
    "yard": "a snowy yard outside the elf school cabin at blue twilight",
    "workshop": "a warm elf gift workshop with a glowing conveyor belt",
    "hotspring": "a snowy night by a steaming hot spring and a frozen lake under the Northern Lights",
}
SOUND = {
    "field": "Soft winter wind, sled runners on snow, faint reindeer bells.",
    "classroom": "Quiet cozy classroom room tone, a crackling fireplace far away.",
    "yard": "Soft winter wind and crunching snow.",
    "workshop": "Gentle workshop sounds: rustling wrapping paper, a soft conveyor hum.",
    "hotspring": "Bubbling hot water, a light winter breeze, gentle splashes.",
}
VOICE = {
    "teddy": "a bright, cheerful ten-year-old American boy's voice",
    "amber": "a lively, cheerful ten-year-old American girl's voice",
    "abu": "a light, friendly, slightly high child voice of a cute little robot",
    "joy": "a playful, sweet young girl elf's voice",
    "alan": "a happy, bouncy young boy elf's voice",
    "santa": "a deep, warm, jolly old man's voice",
}
CONSTRAINTS = [
    "The animation style, colors and line art stay exactly as in the first frame for the whole clip.",
    "No new people or characters appear that are not already in the first frame.",
    "No captions, no subtitles, no readable text, letters or numbers appear anywhere.",
    "Every character keeps the same face, hair, outfit and colors as in the first frame.",
]


def frames_for(d):
    n = 0
    while 17 * n + 5 < d * FPS:
        n += 1
    return 17 * n + 5


def wav_secs(f):
    return sf.info(str(f)).duration


def build(s):
    od = FILM / "h3" / s["id"]
    od.mkdir(parents=True, exist_ok=True)
    Image.open(FILM / "frames" / f"{s['id']}.png").convert("RGB").resize(SIZE, Image.LANCZOS).save(od / "first.png")
    secs = s["dur"]
    voice = None
    if s.get("line"):
        voice = FILM / "voices_final" / f"{s['id']}.wav"
        secs = max(secs, LINE_AT + wav_secs(voice) + TAIL)
    if s.get("narr"):
        secs = max(secs, wav_secs(FILM / "voices_final" / f"{s['id']}_narr.wav") + 0.8)
    secs = frames_for(secs) / FPS
    buf = np.zeros(int(secs * SR), dtype=np.float32)
    dialogue = []
    if voice:
        w, sr = sf.read(str(voice), dtype="float32")
        if w.ndim > 1:
            w = w.mean(axis=1)
        if sr != SR:
            w = np.interp(np.linspace(0, len(w), int(len(w) * SR / sr), endpoint=False), np.arange(len(w)), w).astype(np.float32)
        st = int(LINE_AT * SR)
        seg = w[: len(buf) - st]
        buf[st:st + len(seg)] = seg
        ln = s["line"]
        dialogue = [dict(subject=ln["who"], line=ln["text"], lang="English",
                         after="Right after the line the speaker's lips close and stay closed.")]
    with wave.open(str(od / "guide.wav"), "wb") as g:
        g.setnchannels(1); g.setsampwidth(2); g.setframerate(SR)
        g.writeframes((np.clip(buf, -1, 1) * 32767).astype("<i2").tobytes())
    action = s.get("h3_action") or s["action"]   # h3_action = repo 2026-10-23 style: 50-120 words, "Starting from <Picture 1>, ..."
    if not dialogue and s["refs"]:
        action += " Nobody speaks; all mouths stay closed."
    spec = dict(
        duration=round(secs - 0.02, 3), size=list(SIZE), seed=SEEDS.get(s["id"], 20261023), steps=14, draft=True,
        style=STYLE, setting=SETTING[s["scene"]], first_frame="first.png",
        subjects=[dict(key=k, desc=CFG["chars"][k], voice=VOICE[k]) for k in s["refs"]],
        audio={"fixed": {"file": "guide.wav"}},
        shots=[dict(camera="The camera holds a static shot on a tripod.", action=action, dialogue=dialogue)],
        constraints=CONSTRAINTS, soundscape=SOUND[s["scene"]], music="N/A",
    )
    (od / "spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding="utf-8")
    return f"{s['id']} {secs:.2f}s {'line' if voice else 'silent'}"


if __name__ == "__main__":
    only = sys.argv[1:]
    for s in CFG["shots"]:
        if not only or s["id"] in only:
            print(build(s))
