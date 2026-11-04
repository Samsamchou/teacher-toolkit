"""開場影片首幀：Codex CLI 內建生圖，Pippy 定妝照當參考圖。
  python scripts/gen_frames.py S03 S08      # frames/S03.png、frames/S08.png
Codex 不能寫 G 槽：在 C 槽暫存資料夾生成後複製回來；透明參考圖先鋪淺灰底。
"""
import shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

FILM = Path(__file__).resolve().parents[1]
WORK = Path(tempfile.gettempdir()) / "thanksgiving_frames_codex"
SIZE = (1536, 864)

STYLE = ("Soft 3D animated-feature style matching the attached Pippy character sheet: rounded clay-like shapes, gentle "
         "subsurface lighting, warm cinematic color, smooth clean surfaces, like a modern family animation film. "
         "16:9 landscape film frame. The image contains no writing of any kind: no letters, no numbers, no words, no logos, "
         "no watermark, no speech bubbles.")

PIPPY = ("Pippy (exactly the character in the attached reference sheet: a small round pumpkin pie with a golden crimped crust rim "
         "around his orange face, big brown eyes, rosy cheeks, a swirl of whipped cream on top, a small plain black tall hat "
         "with a brown band and no buckle, white collar, short cream arms, little brown boots)")

WAMP = ("drawn respectfully and historically accurate: long dark hair, deerskin mantles, leggings and breechcloths, "
        "no feather headdress, no face paint")
PILG = "Pilgrims in plain dark and earth-colored wool clothes, white collars and coifs, simple felt hats without buckles"
# 第一次念（H3 全畫面）共通：底下一條給字幕
BOTTOM = (" Composition rule: the bottom 18 percent of the frame is plain ground or floor with nothing important; Pippy's face "
          "and hat are fully visible above it.")
# 解說首幀共通：最上方、最下方、左下角留空給標籤、字幕、Pippy 小頭像
XRULE = (" Composition rules: keep the top 15 percent of the frame as plain soft blurred background, keep the bottom 20 percent "
         "plain with nothing important, and keep the lower-left corner (left 30 percent, bottom 40 percent) empty plain "
         "background. All important action stays in the middle and right area.")

FRAMES = {
    # ---- 其餘 8 句：第一次念的 Pippy 首幀 ----
    "S04": (f"Film frame on the busy deck of the Mayflower at sea in 1620. In the lower-left foreground stands {PIPPY}, about "
            f"one quarter of the frame height, patting the ship's wooden railing with one hand and smiling at the camera, mouth "
            f"gently closed, face fully visible. Behind him the deck is crowded with many {PILG}: men pulling ropes, women with "
            f"bundles, children leaning on the railing looking at the sea, a big cream sail above. Many people fill the deck so "
            f"it clearly feels like about one hundred passengers." + BOTTOM),
    "S05": (f"Film frame of a rocky New England shore in 1620, cold grey-blue morning. A small wooden rowing boat has landed on "
            f"the pebbles and a Pilgrim family (father, mother, a boy and a girl, {PILG}) is stepping onto the shore; the father "
            f"holds his hat in his hand and looks around. The Mayflower is anchored far out at sea. In the lower-right "
            f"foreground {PIPPY}, about one quarter of the frame height, turns toward the camera and holds out one open palm "
            f"toward the family as if introducing them, mouth gently closed, face fully visible." + BOTTOM),
    "S06": (f"Film frame at the edge of a green forest looking down at a Wampanoag village by the sea in 1620: dome-shaped "
            f"wetu houses covered with bark and woven mats, people {WAMP}, drying fish on wooden racks and weaving baskets, "
            f"canoes on the beach, and far out on the sea the small Mayflower. In the lower-left foreground {PIPPY}, about one "
            f"quarter of the frame height, peeks out from behind a tree trunk with a curious face, mouth gently closed, face "
            f"fully visible." + BOTTOM),
    "S07": (f"Film frame of the Pilgrims' first winter in 1620: heavy snow falling on a few small timber-framed houses with "
            f"thatched roofs covered in snow, and {PILG} wrapped in blankets huddled around a small campfire, shivering. Grey "
            f"cold light. In the lower-right foreground {PIPPY}, about one quarter of the frame height, is curled up shivering "
            f"in the snow, arms hugging himself, a little pile of snow on his hat, teeth chattering, mouth gently closed, face "
            f"fully visible." + BOTTOM),
    # S09 v2（老師 11/04）：背景的人站定不走動、人少，避免 H3 冒出新的人和羽毛
    "S09": (f"Film frame of a golden autumn harvest in 1621: tall corn plants with yellow ears on the left, many orange "
            f"pumpkins on the ground, red and orange trees and a calm bay far behind. In the middle ground exactly three people "
            f"stand still side by side, smiling and holding full baskets of corn and squash: a Pilgrim woman (plain brown dress, "
            f"white coif and collar), a Pilgrim man (dark wool coat, white collar, felt hat without buckle) and a Wampanoag woman "
            f"({WAMP}). Nobody else is in the picture; the far background is empty field and trees. In the lower-left "
            f"foreground {PIPPY}, about one quarter of the frame height, hugs an orange pumpkin bigger than himself, mouth "
            f"gently closed, face fully visible." + BOTTOM),
    # S11 holiday 插圖（念到 holiday 時從日曆旁滑入）
    "HOL": ("Warm film illustration that explains the word 'holiday' for children: a family in plain 1860s clothes (father "
            "in a dark vest, mother in a long dress, two children, a grandmother) sits together around a dining table at "
            "home on Thanksgiving Day, a roast turkey, pumpkin pie, corn and potatoes on the table, everyone smiling and "
            "relaxed, warm lamp light, autumn leaves outside the window. Cozy, happy, nobody is working. Keep the turkey and "
            "the table clearly visible in the middle of the picture."),
    "S10": (f"Film frame of the 1621 harvest feast outdoors: long wooden tables full of corn, squash, fish, roasted deer and "
            f"wild birds, {PILG} and many Wampanoag men ({WAMP}) sitting and eating together, passing food and laughing. At "
            f"the far end of the table sits Massasoit, the Wampanoag leader, an older dignified man with a deerskin mantle and "
            f"a simple shell-bead necklace. In the lower-right foreground {PIPPY}, about one quarter of the frame height, "
            f"stands by the end of the table holding a corn cob, smiling at the camera, mouth gently closed, face fully "
            f"visible." + BOTTOM),
    "S12": (f"Film frame of a quiet beach at golden sunset today. A modern Wampanoag family in everyday modern clothes "
            f"(jeans, sweaters, a jacket) sits on the sand: the grandmother is telling a story to her grandson, who listens "
            f"carefully, and the parents sit nearby. Calm gentle waves, warm soft light, peaceful and respectful mood. In the "
            f"lower-right foreground {PIPPY}, about one quarter of the frame height, holds his hat against his chest with "
            f"both hands, a calm gentle expression, mouth gently closed, face fully visible. Nothing silly or funny." + BOTTOM),

    # ---- 開場與單字段：Pippy 是主角，約佔畫面 40% 高，站在中間偏左 ----
    "S01": (f"Film frame of a sunny autumn backyard with a big pile of red and orange leaves, a wooden fence, a pumpkin patch "
            f"and colorful trees, leaves drifting in the air. {PIPPY} has just jumped out of the leaf pile in the center-left, "
            f"about 40 percent of the frame height, both feet on the ground, waving one hand at the camera with a big happy "
            f"smile, mouth gently closed, face fully visible." + BOTTOM),
    "S02": (f"Film frame of a cozy autumn reading corner by a window with autumn leaves outside. {PIPPY}, about 40 percent of "
            f"the frame height, stands in the center-left next to a giant open storybook on a low table; the open pages show "
            f"only a painted picture of a wooden sailing ship on the sea, no writing. Pippy holds the edge of the page with "
            f"one hand, ready to turn it, and looks at the camera with an excited face, mouth gently closed." + BOTTOM),
    "S13": (f"Film frame of a bright, cheerful classroom-like autumn room with a chalkboard (blank, no writing) and paper "
            f"leaves on the wall. {PIPPY}, about 40 percent of the frame height, stands in the center and holds up a fan of "
            f"five blank cream-colored cards in one hand like a magician, the other hand raised, smiling at the camera, mouth "
            f"gently closed. The cards are completely blank." + BOTTOM),
    "S19": (f"Film frame of a warm Thanksgiving kitchen table. On the right a slice of pumpkin pie with whipped cream sits on "
            f"a white plate. {PIPPY}, about 40 percent of the frame height, stands on the table at the center-left, pointing "
            f"at himself with both thumbs and grinning proudly at the camera, mouth gently closed, face fully visible." + BOTTOM),
    "S20": (f"Film frame of a sunny autumn park with falling leaves. {PIPPY}, about 40 percent of the frame height, stands in "
            f"the center giving a big group hug to two friends of the same size and the same soft 3D style: a smiling corn-cob "
            f"kid with green husk leaves like a little jacket, and a round red apple kid with a leaf on top. All three have "
            f"happy faces and closed mouths, Pippy's face fully visible and facing the camera." + BOTTOM),
    # 單字卡圖片（程式字卡用；畫面乾淨，主體置中）
    "C14": ("Picture-card illustration: the Mayflower, a 17th-century wooden sailing ship with three masts and full cream "
            "sails, sailing on blue waves under a bright sky, seen from the side, the whole ship centered with space around it."),
    "C15": (f"Picture-card illustration: a Pilgrim family of four ({PILG}) standing together and smiling on a rocky shore in "
            f"1620, the whole family centered, simple soft background."),
    "C16": ("Picture-card illustration: a big Thanksgiving feast, a long wooden table covered with lots of food (roast turkey, "
            "corn, pumpkins, pies, bread, potatoes, fruit), seen from a slightly high angle, warm light, no people."),
    "C17": ("Picture-card illustration: a golden roast turkey on a big platter with herbs and cranberries, centered, simple "
            "warm background."),
    "C18": ("Picture-card illustration: a big bowl of creamy mashed potatoes with melting butter on top, a few whole potatoes "
            "beside the bowl, centered, simple warm background."),

    # ---- 其餘 AI 解說首幀（第二次念）----
    "X05": (f"Close-up film frame that explains the word 'Pilgrims': a Pilgrim family of four (father, mother, a boy and a "
            f"girl, {PILG}) stands close together on a rocky shore in 1620, seen from the waist up, looking at the camera "
            f"with kind, tired, hopeful faces. Behind them, softly blurred, more Pilgrim families stand on the shore and a "
            f"small rowing boat rests on the pebbles. Cool morning light." + XRULE),
    "X07": ("Close-up film frame that explains 'very cold and hard winter': a pair of red, cold adult hands in worn wool "
            "sleeves held out toward a small weak campfire in the snow, frost on the sleeve, heavy snowflakes falling all "
            "around, a dark snowy night, a puff of white breath visible at the top right. Keep the right 18 percent of the "
            "frame plain dark snowy background (a thermometer will be added there later)." + XRULE),
    "X09": (f"Close-up film frame that explains 'harvest' in autumn 1621: two hands (one with a deerskin sleeve, one with a "
            f"dark wool sleeve) are picking a big yellow ear of corn from a tall green-gold corn stalk, above a woven basket "
            f"already full of corn ears; orange pumpkins sit beside the basket; red and orange autumn leaves in the soft "
            f"background." + XRULE),
    "X12": ("Close-up film frame of a modern Wampanoag family at home today, at a warm kitchen table: a grandmother in a "
            "cardigan opens an old family photo album and an old hand-drawn map of the home coastline, and her grandson in a "
            "hoodie leans in and listens carefully. Warm lamp light, quiet and respectful mood, no feathers, no costumes. "
            "The photos and the map show only pictures and coastline shapes, no writing." + XRULE),


    # 解說動畫首幀（第二次念）：版面要空出 最上方一條（標籤）、最下方一條（字幕）、左下角（Pippy 小頭像）
    "X08": ("Close-up film frame for a children's lesson that explains 'plant corn'. A small mound of rich brown soil sits "
            "in the center-right of the frame, seen from a low side angle. Two gentle adult hands (warm brown skin, a simple "
            "deerskin sleeve edge at the wrist) are making a small hole in the top of the mound with one finger, and the "
            "other hand holds three yellow corn kernels ready to drop in. A tiny metal watering can rests on the soil at the "
            "right. Soft spring morning light, blurred green field and trees far behind. Composition rules: keep the top "
            "15 percent of the frame as plain soft blurred background (no objects), keep the bottom 20 percent as plain flat "
            "soil with nothing important, and keep the lower-left corner (left 30 percent, bottom 40 percent) empty plain "
            "soil and background. All important action stays in the middle-right area."),

    "S03": (f"Film frame on the deck of the Mayflower, a 17th-century wooden sailing ship, crossing the wide blue Atlantic Ocean. "
            f"In the lower-right foreground stands {PIPPY}, about one quarter of the frame height, facing the camera in "
            f"three-quarter view, one hand holding his hat against the sea wind, the other hand pointing ahead, excited "
            f"expression, mouth gently closed, face fully visible and well lit. Behind him the ship's bow cuts through waves, "
            f"big cream-colored canvas sails full of wind, ropes and rigging, white sea spray, seagulls, bright sky with soft "
            f"clouds. Plenty of open sea visible so the sailing motion reads clearly."),
    "S08": (f"Film frame of a spring field near the coast of New England in 1621, freshly turned brown soil in small mounds, "
            f"green woods behind. In the middle ground Tisquantum, a Wampanoag man, kneels and places corn seeds into a small "
            f"soil mound with his hand, showing an English Pilgrim man kneeling beside him how to do it. Tisquantum is drawn "
            f"respectfully and historically: long dark hair, deerskin leggings and breechcloth, a simple deerskin mantle over one "
            f"shoulder, no feather headdress, no face paint. The Pilgrim man wears a plain dark wool coat, white collar and a "
            f"simple dark felt hat without a buckle, and watches carefully. In the lower-left foreground {PIPPY}, about one "
            f"quarter of the frame height, crouches by a soil mound holding a tiny watering can, looking toward the camera with "
            f"a happy face, mouth gently closed, face fully visible. Soft morning sunlight, gentle and warm."),
}


def flat_copy(src, dst):
    im = Image.open(src)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA"); bg = Image.new("RGBA", im.size, (225, 225, 225, 255)); bg.alpha_composite(im); im = bg
    im.convert("RGB").save(dst)


def job(sid):
    d = WORK / sid
    shutil.rmtree(d, ignore_errors=True); d.mkdir(parents=True)
    flat_copy(FILM / "chars" / "pippy.png", d / "ref_pippy.png")
    prompt = (f"Use your built-in image generation tool to create one image.\n\n{FRAMES[sid]}\n\nStyle: {STYLE}\n\n"
              "Save the PNG as out.png in the current directory. Reply with the saved file path only.")
    codex = shutil.which("codex") or shutil.which("codex.cmd")
    r = subprocess.run([codex, "exec", "--skip-git-repo-check", "-s", "workspace-write", "-i", "ref_pippy.png", "-"], cwd=d,
                       input=prompt, capture_output=True, text=True, encoding="utf-8", errors="replace")
    (d / "log.txt").write_text(r.stdout + r.stderr, encoding="utf-8")
    out = d / "out.png"
    if not out.exists():
        for line in reversed((r.stdout or "").splitlines()):
            p = Path(line.strip().strip("`"))
            if p.suffix.lower() == ".png" and p.exists():
                shutil.copy(p, out); break
    if not out.exists():
        return f"{sid} FAILED (log: {d / 'log.txt'})"
    im = Image.open(out).convert("RGB"); w, h = im.size
    tw = min(w, int(h * 16 / 9)); th = int(tw * 9 / 16)
    im = im.crop(((w - tw) // 2, (h - th) // 2, (w - tw) // 2 + tw, (h - th) // 2 + th)).resize(SIZE, Image.LANCZOS)
    dst = FILM / "frames" / f"{sid}.png"; dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst); dst.with_suffix(".prompt.txt").write_text(prompt, encoding="utf-8")
    return f"{sid} OK"


if __name__ == "__main__":
    ids = sys.argv[1:] or list(FRAMES)
    with ThreadPoolExecutor(4) as ex:
        for m in ex.map(job, ids):
            print(m, flush=True)
