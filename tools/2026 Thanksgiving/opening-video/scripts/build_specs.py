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
WAMP = "Wampanoag people (long dark hair, deerskin mantles and leggings, no feather headdress)"
PILGS = "Pilgrims (plain dark wool clothes, white collars and coifs, felt hats without buckles)"
SHOTS.update({
    "S04": dict(
        setting="the crowded wooden deck of the Mayflower at sea in 1620",
        subjects=[PIPPY, dict(key="crowd", desc=f"many {PILGS}", voice="silent")],
        action=("Starting from <Picture 1>, the ship rocks gently on the waves. Behind Pippy the passengers move: men pull the "
                "ropes hand over hand, a woman shifts a bundle in her arms, children lean on the railing and point at the sea, "
                "and the big sail ripples in the wind. In the lower left Pippy pats the wooden railing twice with his hand, then "
                "holds up his fingers one by one as if counting the people, gives up and scratches his hat, and talks to the "
                "camera with a cheerful face. After the line his lips close and he smiles."),
        sound="Ship deck: waves, creaking ropes, low crowd murmur, children laughing."),
    "S05": dict(
        setting="a rocky New England shore in 1620 with a small rowing boat on the pebbles",
        subjects=[PIPPY, dict(key="family", desc=f"a Pilgrim family of four, {PILGS}", voice="silent")],
        action=("Starting from <Picture 1>, the Pilgrim family steps off the rowing boat onto the pebbles one after another: the "
                "girl hops down, the mother lifts her skirt and steps over the water, and the father holds his hat in his hand "
                "and slowly turns his head to look around the new land. Small waves wash over the rocks. In the lower right "
                "Pippy turns to the camera, sweeps his open palm toward the family to introduce them, and talks with a warm "
                "face. After the line his lips close and he smiles."),
        sound="Rocky shore: small waves on rocks, footsteps on pebbles, wind."),
    "S06": dict(
        setting="the edge of a green forest above a Wampanoag village by the sea in 1620, dome-shaped bark houses",
        subjects=[PIPPY, dict(key="village", desc=WAMP, voice="silent")],
        action=("Starting from <Picture 1>, in the village the people go on with their work: a woman weaves a basket with quick "
                "hands, a man hangs fish on the drying rack, smoke rises slowly from a house, leaves sway in the breeze, and the "
                "small ship rocks far out at sea. In the lower left Pippy leans out from behind the tree trunk, looks at the "
                "village with wide curious eyes, then turns to the camera and talks quietly. After the line his lips close and "
                "he keeps peeking."),
        sound="Forest edge: birds singing, distant waves, rustling leaves, soft basket weaving."),
    "S07": dict(
        setting="the Pilgrims' snowy settlement in the first winter of 1620, small thatched houses covered in snow",
        subjects=[PIPPY, dict(key="settlers", desc=f"{PILGS} wrapped in blankets", voice="silent")],
        action=("Starting from <Picture 1>, heavy snow keeps falling and blowing sideways in the wind. The people around the "
                "small campfire pull their blankets tighter and shiver, rubbing their hands over the weak flames, and the fire "
                "flickers. In the lower right Pippy hugs himself and shivers hard, his whole body trembling and his teeth "
                "chattering, snow piling on his hat, and he talks to the camera with a cold, sad face. After the line his lips "
                "close and he keeps shivering."),
        sound="Winter: howling wind, crackling small fire, snow."),
    "S09": dict(   # v2（老師 11/04）：背景三人站定，只做小動作，不走動
        setting="a golden autumn harvest field in 1621 with tall corn, many pumpkins and red autumn trees",
        subjects=[PIPPY, dict(key="people", desc=f"exactly three people standing still: a Pilgrim woman, a Pilgrim man and a "
                                                  f"Wampanoag woman ({WAMP}), each holding a basket", voice="silent")],
        action=("Starting from <Picture 1>, the three people in the middle stay standing on the same spot the whole time, "
                "holding their baskets of corn and squash: the Pilgrim woman smiles and nods, the man lifts his basket a little "
                "higher, and the Wampanoag woman turns her head to smile at them. Nobody walks, and nobody else comes into the "
                "picture. A few red leaves drift down. In the lower left Pippy hugs the big pumpkin, wobbles a little from side "
                "to side under its weight, and talks to the camera with a happy, proud face. After the line his lips close and "
                "he smiles."),
        sound="Harvest field: rustling corn leaves, birds."),
    "S10": dict(
        setting="the outdoor harvest feast of 1621, long wooden tables full of food",
        subjects=[PIPPY, dict(key="feast", desc=f"{PILGS} and {WAMP}, with Massasoit the Wampanoag leader at the far end",
                              voice="silent")],
        action=("Starting from <Picture 1>, at the long table everyone eats together: people pass bowls of food across the table, "
                "two men laugh and nod, a woman serves corn, and Massasoit at the far end raises his hand in greeting. In the "
                "lower right Pippy turns his head to look at the people arriving at the table, then happily takes a bite of his "
                "corn, holds up three fingers to the camera, and talks with a cheerful face. After the line his lips close and "
                "he smiles."),
        sound="Outdoor feast: plates and bowls clinking, laughter and chatter, a crackling fire."),
    "S12": dict(
        setting="a quiet beach at golden sunset today",
        subjects=[PIPPY, dict(key="family", desc="a modern Wampanoag family in everyday modern clothes", voice="silent")],
        action=("Starting from <Picture 1>, the grandmother speaks softly to her grandson and gestures gently toward the sea, the "
                "boy listens and nods slowly, the parents listen quietly, and calm waves roll onto the sand in the warm light. "
                "In the lower right Pippy holds his hat against his chest with both hands and talks to the camera in a calm, "
                "gentle and respectful way, nothing silly. After the line his lips close and he stays still and calm."),
        sound="Sunset beach: gentle waves, soft breeze."),
})
# 開場與單字段（只念一次，0.8 倍）：S19、S20 念的是例句（voices/S19_1.mp3＝E19）
ONCE = {"S01", "S02", "S13", "S19", "S20", "S21"}
SHOTS.update({
    "S01": dict(
        setting="a sunny autumn backyard with a big pile of red and orange leaves and a pumpkin patch",
        subjects=[PIPPY],
        action=("Starting from <Picture 1>, Pippy bounces up and down once in front of the leaf pile so a few leaves fly up "
                "around him, then waves his hand side to side at the camera with a big smile and greets everyone, then spreads "
                "both arms wide on 'Happy Thanksgiving'. Leaves keep drifting down. After the line his lips close and he smiles."),
        sound="Autumn yard: rustling leaves, birds."),
    "S02": dict(
        setting="a cozy autumn reading corner with a giant open storybook on a low table",
        subjects=[PIPPY],
        action=("Starting from <Picture 1>, Pippy looks at the camera and talks with an excited face, then grabs the edge of the "
                "giant page with both hands and slowly turns it, and points at the book. The pages stay painted pictures with no "
                "writing. After the line his lips close and he smiles."),
        sound="Indoor: page turning, soft room tone."),
    "S13": dict(
        setting="a bright autumn classroom room with a blank chalkboard",
        subjects=[PIPPY],
        action=("Starting from <Picture 1>, Pippy shakes the fan of blank cards in his hand, holds them up high toward the "
                "camera, then cups his other hand next to his mouth as if inviting everyone to say the words with him. The "
                "cards stay completely blank. After the line his lips close and he smiles."),
        sound="Indoor: soft room tone, cards shuffling."),
    "S19": dict(
        setting="a warm Thanksgiving kitchen table with a slice of pumpkin pie on a plate",
        subjects=[PIPPY],
        action=("Starting from <Picture 1>, Pippy points at himself with both thumbs and puffs out his chest proudly, then turns "
                "and points at the slice of pumpkin pie on the plate and talks to the camera with a playful face. After the line "
                "his lips close and he grins."),
        sound="Kitchen: soft room tone."),
    "S20": dict(
        setting="a sunny autumn park with falling leaves",
        subjects=[PIPPY, dict(key="friends", desc="a corn-cob kid and a red apple kid, Pippy's friends", voice="silent")],
        action=("Starting from <Picture 1>, Pippy and his two friends hug each other tightly and sway happily from side to side. "
                "Then Pippy looks at the camera and talks warmly, and on the question he holds out one open hand toward the "
                "camera. The friends smile and keep their mouths closed. After the line his lips close and he smiles."),
        sound="Park: birds, leaves rustling."),
})
SHOTS["S21"] = dict(   # 結尾：沿用 S01 首幀（同一個落葉庭院），鏡頭不拉遠（H3 拉遠會爆）
    setting="a sunny autumn backyard with a big pile of red and orange leaves and a pumpkin patch",
    subjects=[PIPPY],
    action=("Starting from <Picture 1>, Pippy's raised hand waves slowly side to side at the camera while his other arm stays "
            "down at his side. He talks warmly to the audience, tilts his head on the question, and on 'Happy Thanksgiving' "
            "bounces once happily. Red and orange leaves keep drifting down. After the line his lips close and he keeps waving "
            "and smiling."),
    sound="Autumn yard: rustling leaves, birds.")
# 解說畫面的 AI 特寫（無對白，長度＝第二次念的 H3 片長）
XSHOTS = {
    "X05": dict(
        setting="a rocky shore in 1620, close-up of a Pilgrim family",
        subjects=[dict(key="family", desc=f"a Pilgrim family of four, {PILGS}", voice="silent")],
        camera="The camera starts on a close-up of the family and slowly pulls back to show more families behind them.",
        action=("Starting from <Picture 1>, the father puts his arm around the children, the mother smiles and the children "
                "look up at the parents. As the camera pulls back, more Pilgrim families behind them on the shore turn and look "
                "toward the camera, standing together. Nobody speaks; all mouths stay closed."),
        sound="Shore: wind and soft waves."),
    "X07": dict(
        setting="a dark snowy winter night in 1620, close-up of cold hands by a small campfire",
        subjects=[dict(key="hands", desc="a pair of red, cold adult hands in worn wool sleeves", voice="silent")],
        camera="The camera holds a steady close-up.",
        action=("Starting from <Picture 1>, the red cold hands tremble and shake over the small weak fire, rub together quickly, "
                "then reach toward the flames again. A puff of white breath drifts in from the top. Heavy snow keeps falling and "
                "the weak fire flickers and shrinks."),
        sound="Howling wind, crackling small fire."),
    "X09": dict(
        setting="an autumn corn field in 1621, close-up of hands harvesting corn",
        subjects=[dict(key="hands", desc="two hands, one with a deerskin sleeve and one with a dark wool sleeve", voice="silent")],
        camera="The camera holds a close-up, then slowly pans right and rises a little.",
        action=("Starting from <Picture 1>, the hands twist and snap the big yellow ear of corn off the tall stalk, then lay it on "
                "top of the full basket. The hands reach for another ear and pick it too. Red and orange leaves drift down, and "
                "the camera slowly moves past the pumpkins."),
        sound="Rustling corn leaves, snapping corn, basket."),
    "X12": dict(
        setting="a warm kitchen at home today, a modern Wampanoag grandmother and grandson at the table",
        subjects=[dict(key="family", desc="a modern Wampanoag grandmother in a cardigan and her grandson in a hoodie",
                       voice="silent")],
        camera="The camera holds a steady medium close-up with a very slow push in.",
        action=("Starting from <Picture 1>, the grandmother slowly turns a page of the old family photo album and points gently "
                "at a photo, then moves her finger along the coastline of the old map. The grandson leans closer, looks from the "
                "album to his grandmother and nods slowly. Quiet and respectful; nobody speaks, mouths stay closed."),
        sound="Quiet room: page turning, soft room tone."),
}
CONSTRAINTS = [
    "The 3D animation style, colors and lighting stay exactly as in the first frame for the whole clip.",
    "No new people or characters appear that are not already in the first frame.",
    "No captions, no subtitles, no readable text, letters or numbers appear anywhere.",
    "Every character keeps the same face, body, outfit and colors as in the first frame.",
    "Only Pippy speaks; everyone else keeps their mouth closed.",
    # 不寫 feather：寫了反而會長出羽毛（11/04 S02、S09 實測）
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


def build_x(xid, cfg):
    """Silent close-up for the explainer of read 2: same length as <S..>_2, silent guide track."""
    sid = "S" + xid[1:]; od = FILM / "h3" / xid
    od.mkdir(parents=True, exist_ok=True)
    Image.open(FILM / "frames" / f"{xid}.png").convert("RGB").resize(SIZE, Image.LANCZOS).save(od / "first.png")
    w = load(FILM / "voices" / f"{sid}_2.mp3")
    secs = frames_for(LINE_AT + len(w) / SR + TAIL) / FPS
    with wave.open(str(od / "guide.wav"), "wb") as g:
        g.setnchannels(1); g.setsampwidth(2); g.setframerate(SR); g.writeframes(np.zeros(int(secs * SR), "<i2").tobytes())
    spec = dict(
        duration=round(secs - 0.02, 3), size=list(SIZE), seed=20261104, steps=14, draft=True,
        style=STYLE, setting=cfg["setting"], first_frame="first.png", subjects=cfg["subjects"],
        audio={"fixed": {"file": "guide.wav"}},
        shots=[dict(camera=cfg["camera"], action=cfg["action"], dialogue=[])],
        constraints=["The 3D style, colors and lighting stay exactly as in the first frame.",
                     "No new people or characters appear that are not already in the first frame.",
                     "No captions, no subtitles, no readable text, letters or numbers appear anywhere.",
                     "Nobody speaks; every mouth stays closed.",
                     "Keep the top and bottom edges of the frame plain background."],
        soundscape=cfg["sound"], music="N/A",
    )
    (od / "spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding="utf-8")
    return f"{xid} {secs:.2f}s"


if __name__ == "__main__":
    only = sys.argv[1:]
    for xid, cfg in XSHOTS.items():
        if only and xid in only:
            print(build_x(xid, cfg))
    for sid, cfg in SHOTS.items():
        if only and sid not in only:
            continue
        for k in ((1,) if sid in ONCE else (1, 2)):
            print(build(sid, k, cfg))
