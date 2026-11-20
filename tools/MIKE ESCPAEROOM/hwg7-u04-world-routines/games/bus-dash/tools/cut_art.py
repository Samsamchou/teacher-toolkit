"""Cut the Codex sheets in art_source/<country>/ into Bus Dash sprites in art/<country>/.
Usage: python tools/cut_art.py taiwan [--gif]
Sheets: bg.png (street panorama), items.png (2 rows x 5: 6 good then 4 bad), bus.png (one bus facing right),
girl_v2.png / boy_v2.png (2 rows x 4: run_1..run_6 = one running cycle, then happy, sad), dust_v2.png (1 row x 4:
dust_1..dust_3, speed).  Shares the cutting helpers with Bento Catch.
Every hero pose is saved at the same scale; player_meta.json records where the head is (ax) so the game can keep
the head steady while the legs change.  --gif also writes qa/run_<who>.gif to check the cycle."""
import json, os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "bento-catch", "tools"))
from cut_art import ink, split_points, cutout

ITEMS = {"taiwan": [["dan_bing", "soy_milk", "rice_ball", "baozi", "sandwich"],
                    ["radish_cake", "puddle", "cone", "dog", "banana_peel"]],
         "usa": [["backpack", "lunchbox", "apple", "pencil_case", "book"],
                 ["water_bottle", "puddle", "skateboard", "trash_can", "squirrel"]],
         "kenya": [["chai", "mandazi", "chapati", "banana", "jumper"],
                   ["water_bottle", "puddle", "rock", "goat", "tyre"]]}
POSES = [["run_1", "run_2", "run_3", "run_4"], ["run_5", "run_6", "happy", "sad"]]
FX = ["dust_1", "dust_2", "dust_3", "speed"]
SCENERY_ROWS = {"taiwan": (350, 960), "usa": (360, 968), "kenya": (430, 1010)}       # the band of bg.png used as the scrolling scenery (top, bottom)
HERO_H = 420                                 # pixel height of the tallest running frame
# White background shut inside a sprite (the flood fill from the borders cannot reach it): the hole of a tyre,
# the gaps of a roof rack.  (country, sprite) -> vertical band (top, bottom as a fraction of the sprite height)
# in which big pure-white patches are made transparent.  Only listed sprites are touched, so white shirts, teeth
# and eyes elsewhere stay.
HOLES = {("kenya", "tyre"): (0.0, 1.0), ("kenya", "bus"): (0.0, 0.22)}


def clear_holes(spr, band, min_area=150):
    from scipy import ndimage
    a = np.asarray(spr).copy()
    white = (a[:, :, :3].min(axis=2) > 238) & (a[:, :, 3] > 0)
    lab, n = ndimage.label(white)
    top, bottom = band[0] * a.shape[0], band[1] * a.shape[0]
    hole = np.zeros(white.shape, bool)
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if (lab[sl] == i).sum() >= min_area and sl[0].start >= top and sl[0].stop <= bottom:
            hole |= lab == i
    hole = ndimage.binary_dilation(hole, iterations=2) & (a[:, :, :3].min(axis=2) > 200)   # take the soft white rim too
    a[:, :, 3] = np.where(hole, 0, a[:, :, 3])
    print("  holes cleared:", int(hole.sum()), "px")
    return Image.fromarray(a)


def grid(sheet, rows):
    m = ink(sheet)
    rc = split_points(m.sum(axis=1), len(rows), 0.15)
    for r, names in enumerate(rows):
        cc = split_points(m[rc[r]:rc[r + 1]].sum(axis=0), len(names))
        for c, name in enumerate(names):
            yield name, cutout(sheet.crop((cc[c], rc[r], cc[c + 1], rc[r + 1])), pad=4)


def main(country, gif):
    src, dst = os.path.join(ROOT, "art_source", country), os.path.join(ROOT, "art", country)
    os.makedirs(dst, exist_ok=True)
    bg = Image.open(os.path.join(src, "bg.png")).convert("RGB")
    top, bottom = SCENERY_ROWS[country]
    band = bg.crop((0, top, bg.width, bottom))
    band = band.resize((round(band.width * 432 / band.height), 432), Image.LANCZOS)
    band.save(os.path.join(dst, "scenery.png"), optimize=True); print("scenery", band.size)

    for name, spr in grid(Image.open(os.path.join(src, "items.png")), ITEMS[country]):
        if (country, name) in HOLES:
            spr = clear_holes(spr, HOLES[(country, name)])
        s = 220 / max(spr.size)
        spr.resize((round(spr.width * s), round(spr.height * s)), Image.LANCZOS).save(os.path.join(dst, name + ".png")); print("item", name)

    if os.path.exists(os.path.join(src, "girl_v2.png")):     # a country without its own hero sheets reuses another country's hero and dust sprites
        meta = {}
        for who in ("girl", "boy"):
            cut = dict(grid(Image.open(os.path.join(src, who + "_v2.png")), POSES))
            s = HERO_H / max(cut[n].height for n in cut if n.startswith("run_"))
            meta[who] = {}
            for name, spr in cut.items():
                spr = spr.resize((round(spr.width * s), round(spr.height * s)), Image.LANCZOS)
                spr.save(os.path.join(dst, f"{who}_{name}.png"))
                a = np.asarray(spr)[:, :, 3] > 60
                xs = np.where(a[: int(spr.height * 0.3)].any(axis=0))[0]          # the hat and head
                meta[who][name] = {"w": spr.width, "h": spr.height, "ax": round(float((xs.min() + xs.max()) / 2 / spr.width), 4)}
                print(who, name, spr.size, meta[who][name]["ax"])
            if gif:
                frames = []
                for i in range(1, 7):
                    im = Image.open(os.path.join(dst, f"{who}_run_{i}.png")); m = meta[who][f"run_{i}"]
                    canvas = Image.new("RGBA", (460, 460), (95, 95, 112, 255))
                    canvas.alpha_composite(im, (round(230 - m["ax"] * im.width), 440 - im.height))
                    frames.append(canvas.convert("P", palette=Image.ADAPTIVE))
                os.makedirs(os.path.join(ROOT, "qa"), exist_ok=True)
                frames[0].save(os.path.join(ROOT, "qa", f"run_{who}.gif"), save_all=True, append_images=frames[1:], duration=85, loop=0)
        json.dump(meta, open(os.path.join(dst, "player_meta.json"), "w"), indent=1)

        for name, spr in grid(Image.open(os.path.join(src, "dust_v2.png")), [FX]):
            s = 200 / max(spr.size)
            spr.resize((round(spr.width * s), round(spr.height * s)), Image.LANCZOS).save(os.path.join(dst, name + ".png")); print("fx", name)
    else:
        print("no girl_v2.png: hero and dust sprites are not cut (point data/%s.json at another country's files)" % country)

    bus = cutout(Image.open(os.path.join(src, "bus.png")))
    if (country, "bus") in HOLES:
        bus = clear_holes(bus, HOLES[(country, "bus")])
    s = 420 / bus.height
    bus.resize((round(bus.width * s), round(bus.height * s)), Image.LANCZOS).save(os.path.join(dst, "bus.png")); print("bus")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    main(args[0] if args else "taiwan", "--gif" in sys.argv)
