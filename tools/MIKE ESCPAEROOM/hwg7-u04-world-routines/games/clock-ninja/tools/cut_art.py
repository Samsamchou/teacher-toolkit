"""Cut the Codex sheets in art_source/<country>/ into Clock Ninja sprites in art/<country>/.
Usage: python tools/cut_art.py uk      (or spain, or fx for the shared effect sheet)
Sheets: bg.png (16:9 room with an empty middle), items.png (2 rows x 5: 6 good then 4 bad),
bag.png or plate.png (the one object the good things fly into), fx/fx.png (1 row x 4: slash, sparkle, sparkles, burst).
The hero is not cut here: art/hero/ is a copy of Bus Dash's art/taiwan/girl_*/boy_* and player_meta.json.
Shares the cutting helpers with Bento Catch (../bento-catch/tools/cut_art.py)."""
import os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "bento-catch", "tools"))
from cut_art import ink, split_points, cutout

ITEMS = {"uk": [["pencil", "exercise_book", "eraser", "ruler", "storybook"],
                ["spelling_cards", "game_controller", "phone", "tv_remote", "comic"]],
         "spain": [["tortilla", "salad", "bread", "tomato", "olives"],
                   ["orange", "football", "sock", "phone", "toy_car"]]}
HOLDER = {"uk": "bag", "spain": "plate"}
FX = ["slash", "sparkle", "sparkles", "burst"]


def grid(sheet, rows):
    m = ink(sheet)
    rc = split_points(m.sum(axis=1), len(rows), 0.15)
    for r, names in enumerate(rows):
        cc = split_points(m[rc[r]:rc[r + 1]].sum(axis=0), len(names))
        for c, name in enumerate(names):
            yield name, cutout(sheet.crop((cc[c], rc[r], cc[c + 1], rc[r + 1])), pad=4)


def runs(sheet, names, min_gap=24):
    """Sprites of different widths in one row: split at real white gaps, not at k/n."""
    col = ink(sheet).sum(axis=0) > 2
    spans, start, gap = [], None, 0
    for x, on in enumerate(col):
        if on:
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                spans.append((start, x - gap + 1)); start, gap = None, 0
    if start is not None:
        spans.append((start, len(col)))
    spans = sorted(sorted(spans, key=lambda s: s[1] - s[0])[-len(names):])      # drop specks
    assert len(spans) == len(names), spans
    for name, (a, b) in zip(names, spans):
        yield name, cutout(sheet.crop((max(0, a - 8), 0, min(sheet.width, b + 8), sheet.height)), pad=4)


def fit(spr, size):
    s = size / max(spr.size)
    return spr.resize((round(spr.width * s), round(spr.height * s)), Image.LANCZOS)


def main(country):
    src, dst = os.path.join(ROOT, "art_source", country), os.path.join(ROOT, "art", country)
    os.makedirs(dst, exist_ok=True)
    if country == "fx":
        for name, spr in runs(Image.open(os.path.join(src, "fx.png")), FX):
            fit(spr, 360 if name == "slash" else 160).save(os.path.join(dst, name + ".png")); print("fx", name, spr.size)
        return
    bg = Image.open(os.path.join(src, "bg.png")).convert("RGB")
    w, h = bg.size
    tw = min(w, int(h * 16 / 9))
    th = int(tw * 9 / 16)
    bg = bg.crop(((w - tw) // 2, h - th, (w - tw) // 2 + tw, h)).resize((1600, 900), Image.LANCZOS)   # keep the desk / table at the bottom
    bg.save(os.path.join(dst, "bg.png"), optimize=True); print("bg", bg.size)

    for name, spr in grid(Image.open(os.path.join(src, "items.png")), ITEMS[country]):
        fit(spr, 220).save(os.path.join(dst, name + ".png")); print("item", name, spr.size)

    hold = HOLDER[country]
    spr = cutout(Image.open(os.path.join(src, hold + ".png")))
    fit(spr, 480).save(os.path.join(dst, hold + ".png")); print("holder", hold, spr.size)


if __name__ == "__main__":
    for a in (sys.argv[1:] or ["uk", "spain", "fx"]):
        main(a)
