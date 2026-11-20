"""Cut the Codex sheets into Luggage Belt sprites.
Usage: python tools/cut_art.py singapore | australia | shared
Country sheets in art_source/<country>/: bg.png (baggage hall, 1536x1024) and items.png (2 rows x 5: 6 good then 4 bad).
Shared sheets in art_source/shared/: bags.png (row 1: red, blue, yellow suitcase with an empty white circle;
row 2: open suitcase, trolley, belt entrance) and belt.png (one long straight belt section).
Shares the cutting helpers with Bento Catch (../bento-catch/tools/cut_art.py).
Writes art/shared/meta.json: where the clock circle is on each suitcase, the trolley platform, the open-suitcase mouth
and the belt surface, all as fractions of the sprite size, so the game can place things without magic numbers."""
import json, os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "bento-catch", "tools"))
from cut_art import ink, split_points, cutout

ITEMS = {"singapore": [["pyjamas", "teddy_bear", "toothbrush", "story_book", "pillow"],
                       ["night_light", "durian", "wet_umbrella", "chewing_gum", "air_horn"]],
         "australia": [["towel", "soap", "shampoo", "rubber_duck", "shower_cap"],
                       ["bath_puff", "muddy_ball", "muddy_shoe", "cactus", "muddy_flipflop"]]}
BG_TOP = 80          # bg.png 1536x1024 -> 16:9 crop starting at this row (keeps the windows, wall base and floor)
BAGS = [["case_red", "case_blue", "case_yellow"], ["case_open", "trolley", "hatch"]]


def grid(sheet, rows):
    m = ink(sheet)
    rc = split_points(m.sum(axis=1), len(rows), 0.15)
    for r, names in enumerate(rows):
        cc = split_points(m[rc[r]:rc[r + 1]].sum(axis=0), len(names))
        for c, name in enumerate(names):
            yield name, cutout(sheet.crop((cc[c], rc[r], cc[c + 1], rc[r + 1])), pad=4)


def scaled(spr, longest):
    s = longest / max(spr.size)
    return spr.resize((round(spr.width * s), round(spr.height * s)), Image.LANCZOS)


def country(name):
    src, dst = os.path.join(ROOT, "art_source", name), os.path.join(ROOT, "art", name)
    os.makedirs(dst, exist_ok=True)
    bg = Image.open(os.path.join(src, "bg.png")).convert("RGB")
    th = round(bg.width * 9 / 16)
    bg = bg.crop((0, BG_TOP, bg.width, BG_TOP + th)).resize((1600, 900), Image.LANCZOS)
    bg.save(os.path.join(dst, "bg.png"), optimize=True); print("bg", bg.size)
    for n, spr in grid(Image.open(os.path.join(src, "items.png")), ITEMS[name]):
        spr = scaled(spr, 240)
        spr.save(os.path.join(dst, n + ".png")); print("item", n, spr.size)


def shared():
    src, dst = os.path.join(ROOT, "art_source", "shared"), os.path.join(ROOT, "art", "shared")
    os.makedirs(dst, exist_ok=True)
    meta = {}
    for n, spr in grid(Image.open(os.path.join(src, "bags.png")), BAGS):
        spr = scaled(spr, 420)
        a = np.asarray(spr).astype(np.int16)
        op = a[:, :, 3] > 200
        if n.startswith("case_") and n != "case_open":
            # the empty white circle on the front: near-white opaque pixels away from the edges
            wh = op & (a[:, :, :3].min(axis=2) > 232)
            h, w = wh.shape
            wh[: int(h * 0.15)] = False
            # the circle is clipped by the suitcase sides, so its width is not the diameter: take the centre column
            # (middle of the widest white row) and the longest unbroken white run down that column = top..bottom
            rows = wh.sum(axis=1)
            xs = np.where(wh[int(np.argmax(rows))])[0]
            cx = int((xs.min() + xs.max()) / 2)
            col = wh[:, cx - 2:cx + 3].all(axis=1)
            best, start = (0, 0, 0), None
            for y, v in enumerate(list(col) + [False]):
                if v and start is None:
                    start = y
                elif not v and start is not None:
                    best = max(best, (y - start, start, y))
                    start = None
            _, y0, y1 = best
            meta[n] = {"cx": round(cx / w, 4), "cy": round((y0 + y1) / 2 / h, 4), "r": round((y1 - y0) / 2 / w, 4)}
            # the hole inside the pull handle stays white after the flood fill: clear near-white pixels above the body
            top = int(h * 0.16)
            hole = (a[:top, :, :3].min(axis=2) > 225)
            arr = np.asarray(spr).copy()
            arr[:top][hole, 3] = 0
            spr = Image.fromarray(arr)
        elif n == "trolley":
            # the platform = the row (in the lower half) with the widest run of opaque pixels
            h, w = op.shape
            rows = op.sum(axis=1)
            lo = int(h * 0.5)
            y = lo + int(np.argmax(rows[lo:int(h * 0.92)]))
            while y > lo and rows[y - 1] > rows[y] * 0.8:
                y -= 1
            xs = np.where(op[y + 3])[0]
            meta[n] = {"top": round(y / h, 4), "x0": round(float(xs.min()) / w, 4), "x1": round(float(xs.max()) / w, 4)}
        elif n == "case_open":
            # the grey lining of the lower (base) part = where packed things disappear
            h, w = op.shape
            g = op & (np.abs(a[:, :, 0] - a[:, :, 2]) < 14) & (a[:, :, :3].min(axis=2) > 150) & (a[:, :, :3].max(axis=2) < 225)
            g[: int(h * 0.5)] = False
            ys, xs = np.where(g)
            meta[n] = {"cx": round(float(np.median(xs)) / w, 4), "cy": round(float(np.percentile(ys, 40)) / h, 4),
                       "x0": round(float(np.percentile(xs, 2)) / w, 4), "x1": round(float(np.percentile(xs, 98)) / w, 4)}
        spr.save(os.path.join(dst, n + ".png")); print(n, spr.size, meta.get(n, ""))

    # belt: crop a whole number of slats so the tile repeats; the steel skirt is averaged into a seamless gradient
    belt = Image.open(os.path.join(src, "belt.png")).convert("RGB")
    m = ink(belt)
    ys = np.where(m.mean(axis=1) > 0.5)[0]
    top, bot = int(ys.min()), int(ys.max()) + 1
    arr = np.asarray(belt.crop((0, top, belt.width, bot))).astype(np.float64)
    h = arr.shape[0]
    lum = arr.mean(axis=2)
    # the slat band: rows where the brightness changes a lot from column to column
    var = np.abs(np.diff(lum, axis=1)).mean(axis=1)
    slat_rows = np.where(var > var.max() * 0.35)[0]
    s0, s1 = int(slat_rows.min()), int(slat_rows.max()) + 1
    prof = lum[s0:s1].mean(axis=0)
    prof = prof - prof.mean()
    ac = np.correlate(prof, prof, "full")[len(prof) - 1:]
    period = int(np.argmax(ac[25:120])) + 25
    n = max(1, round(560 / period))
    x0 = int(np.argmin(prof[200:200 + period])) + 200          # start at a dark gap between two slats
    tile = arr[:, x0:x0 + period * n].copy()
    skirt = slice(s1 + 2, h)
    tile[skirt] = arr[skirt, 100:-100].mean(axis=1, keepdims=True)
    tile = Image.fromarray(np.clip(tile, 0, 255).astype(np.uint8))
    tile = tile.resize((round(tile.width * 160 / h), 160), Image.LANCZOS)
    tile.save(os.path.join(dst, "belt.png"), optimize=True)
    meta["belt"] = {"slats_top": round(s0 / h, 4), "slats_bottom": round(s1 / h, 4), "period_px": period, "slats": n}
    print("belt", tile.size, meta["belt"])
    json.dump(meta, open(os.path.join(dst, "meta.json"), "w"), indent=1)


def hero():
    """art_source/hero/<who>_stand.png (one standing figure each) -> art/hero/<who>_stand.png + its head position in
    player_meta.json.  happy / sad are copied from ../bus-dash/art/taiwan/ unchanged."""
    src, dst = os.path.join(ROOT, "art_source", "hero"), os.path.join(ROOT, "art", "hero")
    path = os.path.join(dst, "player_meta.json")
    meta = json.load(open(path))
    for who in ("girl", "boy"):
        spr = cutout(Image.open(os.path.join(src, who + "_stand.png")), pad=4)
        s = 410 / spr.height              # the same scale as the Bus Dash sprites (tallest running frame 420 px)
        spr = spr.resize((round(spr.width * s), round(spr.height * s)), Image.LANCZOS)
        spr.save(os.path.join(dst, who + "_stand.png"))
        a = np.asarray(spr)[:, :, 3] > 60
        xs = np.where(a[: int(spr.height * 0.3)].any(axis=0))[0]          # the hat and head
        meta[who]["stand"] = {"w": spr.width, "h": spr.height, "ax": round(float((xs.min() + xs.max()) / 2 / spr.width), 4)}
        print(who, "stand", spr.size, meta[who]["stand"])
    json.dump(meta, open(path, "w"), indent=1)


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "singapore"
    {"shared": shared, "hero": hero}.get(which, lambda: country(which))()
