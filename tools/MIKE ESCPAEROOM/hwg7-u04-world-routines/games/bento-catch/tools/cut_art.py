"""Cut the Codex sticker sheets in art_source/<country>/ into game sprites in art/<country>/.

Usage: python tools/cut_art.py japan
Sheets expected in art_source/<country>/: bg.png, items.png (2 rows x 5), player.png (1 row x 4:
idle, run (facing right), happy, sad).  Edit ITEMS below for another country (and CATCHER if the
tray/basket is not light green).

Method (pitfall learned 2026-11-19): gaps between stickers can be tiny, so we do NOT look for
blank gaps.  We split at the minimum-ink row/column near the expected k/n positions, then
flood-fill near-white from the borders to make the background transparent.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITEMS = {
    "japan": [["rice", "miso_soup", "grilled_fish", "milk", "tamagoyaki"],
              ["curry_rice", "sneaker", "eraser", "soccer_ball", "sock"]],
    "egypt": [["ful_medames", "taameya", "baladi_bread", "boiled_egg", "white_cheese"],
              ["tea", "slipper", "toy_car", "rubber_duck", "yarn_ball"]],
    "india": [["tiffin_box", "school_bag", "water_bottle", "notebook", "pencil_box"],
              ["mango", "kite", "spinning_top", "cricket_ball", "yoyo"]],
}
# Colour test for the thing the pupil catches with (tray / basket).
# "rgb": min G, min G-R, min G-B (Japan's pale mint tray, unchanged).
# "hsv": hue range in degrees + min saturation / value; used for the yellow-green tray (Egypt) and the
# woven basket (India), whose shading the rgb test only catches in thin strips (2026-11-20).
CATCHER = {
    "default": {"mode": "rgb", "g_min": 190, "g_minus_r": 40, "g_minus_b": 70},
    "egypt": {"mode": "hsv", "hue": [62, 115], "s_min": 0.35, "v_min": 0.45},
    "india": {"mode": "hsv", "hue": [62, 115], "s_min": 0.35, "v_min": 0.45},
}


def catcher_mask(a, cfg):
    """a = RGBA int array.  True where the pixel belongs to the tray / basket."""
    opaque = a[:, :, 3] > 200
    if cfg["mode"] == "rgb":
        return ((a[:, :, 1] > cfg["g_min"]) & (a[:, :, 1] - a[:, :, 0] > cfg["g_minus_r"])
                & (a[:, :, 1] - a[:, :, 2] > cfg["g_minus_b"]) & opaque)
    rgb = a[:, :, :3] / 255.0
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    d = mx - mn + 1e-9
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    hue = np.where(mx == r, (60 * (g - b) / d) % 360, np.where(mx == g, 60 * (b - r) / d + 120, 60 * (r - g) / d + 240))
    sat = d / (mx + 1e-9)
    return (hue >= cfg["hue"][0]) & (hue <= cfg["hue"][1]) & (sat > cfg["s_min"]) & (mx > cfg["v_min"]) & opaque
POSES = ["idle", "run", "happy", "sad"]


def ink(img):
    a = np.asarray(img.convert("RGB")).astype(np.int16)
    return a.min(axis=2) < 232


def split_points(profile, n, slack=0.08):
    """Cut positions: minimum-ink index near each k/n."""
    L = len(profile)
    cuts = [0]
    for k in range(1, n):
        c = int(L * k / n)
        w = int(L * slack)
        seg = profile[c - w:c + w]
        # prefer the middle of the emptiest stretch
        m = seg.min()
        idx = np.where(seg == m)[0]
        cuts.append(c - w + int(idx[len(idx) // 2]))
    cuts.append(L)
    return cuts


def cutout(cell, pad=6):
    """White background -> transparent via flood fill from the borders, then tight crop."""
    cell = cell.convert("RGB")
    big = Image.new("RGB", (cell.width + 8, cell.height + 8), (255, 255, 255))
    big.paste(cell, (4, 4))
    marker = (255, 0, 254)
    ImageDraw.floodfill(big, (0, 0), marker, thresh=40)
    a = np.asarray(big)
    bg = (a[:, :, 0] == 255) & (a[:, :, 1] == 0) & (a[:, :, 2] == 254)
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8))
    # drop tiny specks, soften the edge by 1 px
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    big = Image.new("RGB", big.size, (255, 255, 255))
    big.paste(cell, (4, 4))
    out = big.convert("RGBA")
    out.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(out.width, box[2] + pad), min(out.height, box[3] + pad))
    return out.crop(box)


def main(country):
    src = os.path.join(ROOT, "art_source", country)
    dst = os.path.join(ROOT, "art", country)
    os.makedirs(dst, exist_ok=True)

    bg = Image.open(os.path.join(src, "bg.png")).convert("RGB")
    w, h = bg.size
    tw = min(w, int(h * 16 / 9))
    th = int(tw * 9 / 16)
    bg = bg.crop(((w - tw) // 2, h - th, (w - tw) // 2 + tw, h)).resize((1600, 900), Image.LANCZOS)
    bg.save(os.path.join(dst, "bg.png"), optimize=True)

    sheet = Image.open(os.path.join(src, "items.png"))
    m = ink(sheet)
    rows = ITEMS[country]
    rc = split_points(m.sum(axis=1), len(rows), 0.15)
    for r, names in enumerate(rows):
        band = m[rc[r]:rc[r + 1]]
        cc = split_points(band.sum(axis=0), len(names))
        for c, name in enumerate(names):
            cell = sheet.crop((cc[c], rc[r], cc[c + 1], rc[r + 1]))
            spr = cutout(cell)
            s = 220 / max(spr.size)
            spr = spr.resize((round(spr.width * s), round(spr.height * s)), Image.LANCZOS)
            spr.save(os.path.join(dst, name + ".png"))
            print("item", name, spr.size)

    sheet = Image.open(os.path.join(src, "player.png"))
    m = ink(sheet)
    cc = split_points(m.sum(axis=0), len(POSES))
    cut = [cutout(sheet.crop((cc[i], 0, cc[i + 1], sheet.height)), pad=4) for i in range(len(POSES))]
    ref_h = cut[0].height           # idle pose defines the scale
    s = 520 / ref_h
    meta = {}
    for name, spr in zip(POSES, cut):
        spr = spr.resize((round(spr.width * s), round(spr.height * s)), Image.LANCZOS)
        spr.save(os.path.join(dst, "player_" + name + ".png"))
        a = np.asarray(spr).astype(np.int16)
        # catcher pixels (light-green tray by default; see CATCHER)
        g = catcher_mask(a, CATCHER.get(country, CATCHER["default"]))
        ys, xs = np.where(g)
        x0, x1 = np.percentile(xs, 1), np.percentile(xs, 99)
        y0 = np.percentile(ys, 2)
        meta[name] = {
            "size": [spr.width, spr.height],
            "tray_cx": round(float((x0 + x1) / 2 / spr.width), 4),
            "tray_y": round(float(y0 / spr.height), 4),
            "tray_hw": round(float((x1 - x0) / 2 / 520), 4),
        }
        print("pose", name, spr.size, meta[name])
    json.dump(meta, open(os.path.join(dst, "player_meta.json"), "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "japan")
