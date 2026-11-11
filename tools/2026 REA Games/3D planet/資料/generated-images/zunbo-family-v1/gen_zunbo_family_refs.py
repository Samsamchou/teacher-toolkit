# 圳寶媽媽＋機車 定裝圖候選（各 3 款），用 Codex CLI 內建生圖（ChatGPT 方案，不另計費），附圳寶圖當參考。
# 用法：python -I gen_zunbo_family_refs.py            → 只產生缺少的圖
#       python -I gen_zunbo_family_refs.py mom_A ...   → 重做指定款（覆蓋）
import json, re, shutil, subprocess, os, glob, hashlib, time, sys
BASE = r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\資料\generated-images"
OUT = os.path.join(BASE, "zunbo-family-v1")
REF = os.path.join(BASE, "robot_zunbo.png")
WORK = r"C:\Users\User\AppData\Local\Temp\claude\5b34f038e9120482\c19d1837-142e-4994-ae13-cf5aaa41e2fc\scratchpad\codexwork_zunbofamily"
os.makedirs(OUT, exist_ok=True); os.makedirs(WORK, exist_ok=True)
shutil.copy(REF, os.path.join(WORK, "robot_zunbo.png"))   # Codex 沙盒讀不到 G 槽，參考圖先複製到 C 槽
MOM_HEAD = ("The attached image is Zun-Bo, a small chibi child robot mascot (teal, orange and cream toy-like 3D cartoon robot). "
  "Design his MOTHER: an adult robot from the same mechanical mascot family, same glossy toy-like 3D cartoon render style, same colour scheme "
  "(teal main colour, orange trims, cream white face plate and joints, small lime-yellow bolts), same kind of cream screen-face with big friendly teal eyes, "
  "soft blush and a gentle warm smile. She must clearly look like a grown-up woman robot and his mum, NOT a child: adult proportions about 4.5 heads tall, "
  "smaller head relative to the body than Zun-Bo, a slim waist, clearly long legs and long arms (arms long enough that the hands reach mid-thigh). ")
MOM_TAIL = ("Pose: standing straight in a symmetric A-pose, facing the camera exactly front-on, full body from the top of the head to the soles of the feet "
  "fully inside the frame with margin, legs slightly apart and not touching, arms straight and held away from the body about 40 degrees, not touching the body. "
  "BOTH hands open flat with palms facing forward, each hand has five clearly separated spread fingers (thumb plus four fingers) - no fists, no mitten hands, "
  "no closed hands. No props, nothing held, no water splashes, no ground shadow shape other than a very soft contact shadow. Plain pure white background. "
  "No text, no letters, no logos. This is a character reference sheet image for image-to-3D conversion and auto-rigging, so keep every limb clearly separated. ")
SC_HEAD = ("The attached image is Zun-Bo, a teal, orange and cream toy-like 3D cartoon robot mascot; it is ONLY a colour and render-style reference - "
  "do NOT put the robot or any character in the picture. Create a vehicle that belongs to his family in the same glossy toy-like 3D cartoon render style: "
  "a common Taiwanese 100-125cc step-through motor scooter (flat footboard, front leg shield, handlebar with two round mirrors, headlight, "
  "rear grab rail), slightly chunky cartoon proportions but realistic layout. ")
SC_TAIL = ("View: side three-quarter view (mostly side-on, turned about 25 degrees toward the camera, front of the scooter pointing left), the whole scooter inside the frame "
  "with margin, standing upright on its centre stand. Both wheels fully visible, perfectly round, with dark tyres. One long flat two-person seat, "
  "clearly long enough for an adult rider plus a small child passenger behind. No rider, no people, no characters, no helmet, no bags, no licence plate text, "
  "no text, no letters, no numbers, no logos, no brand marks, no stickers. Plain pure white background with only a very soft contact shadow. "
  "This is a reference image for image-to-3D conversion. ")
ITEMS = {
 "mom_A": MOM_HEAD + "Look A (classic, closest to Zun-Bo): the same rounded-rectangle teal helmet head as Zun-Bo with round orange ear caps, and a small round headlamp "
   "on top with a little orange bow beside it; she wears a short cream kitchen apron with an orange pocket over her teal body, the orange valve wheel emblem small on the chest above the apron. ",
 "mom_B": MOM_HEAD + "Look B (elegant): a round, softly egg-shaped teal helmet head with a hair-bun shaped dome on top (a teal 'hair bun' with an orange ring, like a mum's bun), "
   "small round orange earring-like ear caps, an orange neck scarf tied at the side, a teal body shaped like a simple knee-length A-line dress panel with a cream belt and a small orange valve wheel buckle, no apron. ",
 "mom_C": MOM_HEAD + "Look C (sporty modern): a wider, softly rounded-square teal helmet head with two curved hair-like antennae that sweep back like a ponytail ending in orange tips, "
   "a cream visor band across the top of the head, no headlamp; a short cream vest-like chest plate with orange piping and a small valve wheel on the left chest, teal trouser-like legs with orange knee rings and cream sneakers-like feet. ",
 "scooter_A": SC_HEAD + "Look A (classic everyday scooter): rounded friendly body in teal, cream-white front leg shield inner panel and side stripe, an orange seat, orange trim line, silver-grey wheels hubs, a round headlight on the handlebar cover. ",
 "scooter_B": SC_HEAD + "Look B (retro style scooter): softly curved vintage-looking body in cream white, teal side panels and front mudguard, a brown-orange long seat, a round chrome-ringed headlight, orange turn-signal lights, cream wheel hubs. ",
 "scooter_C": SC_HEAD + "Look C (sporty modern scooter): slightly more angular body in orange with teal lower panels and footboard, a cream-white long seat, a headlight set into the front leg shield, teal wheel hubs, a small cream rear top-rack (no box). ",
}
force = [a.lower() for a in sys.argv[1:]]
prov_path = os.path.join(OUT, "provenance.json")
log = json.load(open(prov_path, encoding="utf-8")) if os.path.exists(prov_path) else {}
for k, desc in ITEMS.items():
    dst = os.path.join(OUT, k + ".png")
    if force and k.lower() not in force: continue
    if os.path.exists(dst) and k.lower() not in force: continue
    tail = MOM_TAIL if k.startswith("mom") else SC_TAIL
    prompt = (f"Use your built-in image generation tool to create this image, using the attached image as reference: {desc}{tail}"
              f"Square image. Save the PNG as {k}.png in the current directory. Reply with the saved file path only.")
    stale = os.path.join(WORK, k + ".png")
    if os.path.exists(stale): os.remove(stale)
    t0 = time.time()
    r = subprocess.run("codex exec --skip-git-repo-check -s workspace-write -i robot_zunbo.png -", input=prompt, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", cwd=WORK, shell=True, timeout=900)
    out = r.stdout + r.stderr
    cands = [stale] + re.findall(r"[A-Za-z]:\[^\s\"'`]*?generated_images[^\s\"'`]*?\.png", out)
    src = next((c for c in cands if os.path.exists(c) and os.path.getmtime(c) > t0), None)
    if not src:
        rec = sorted(glob.glob(os.path.expanduser(r"~\.codex\generated_images\**\*.png"), recursive=True), key=os.path.getmtime)
        if rec and os.path.getmtime(rec[-1]) > t0: src = rec[-1]
    if src:
        shutil.copy(src, dst)
        log[k] = {"prompt": prompt, "reference": "generated-images/robot_zunbo.png", "sha256": hashlib.sha256(open(dst, "rb").read()).hexdigest(),
                  "src": src, "generated": time.strftime("%Y-%m-%d %H:%M:%S"), "tool": "codex exec -i (built-in image generation)"}
        print("ok", k, round(time.time() - t0), flush=True)
        json.dump(log, open(prov_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    else:
        print("FAIL", k, out[-600:], flush=True)
