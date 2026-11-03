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

FRAMES = {
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
