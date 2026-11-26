# Builds public/basketball/hold.png: the six animals holding the ball with both paws (3 columns x 2 rows of 384x512 cells).
# Input: the three generated pictures (two animals each, flat magenta background) in a working folder.
# Each animal is cut out, scaled to the same height as its empty-handed "ready" pose and stood on the same foot line,
# so swapping between the two pictures in the game does not make the animal jump.
# Run: python scripts/prepare-basketball-hold.py <folder with hold-cat-dog.png, hold-rabbit-panda.png, hold-fox-penguin.png>
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SHEETS = [("cat-dog", ["cat", "dog"]), ("rabbit-panda", ["rabbit", "panda"]), ("fox-penguin", ["fox", "penguin"])]
CELL_W, CELL_H = 384, 512


def solid_box(alpha, threshold=128):
    """Bounding box of the clearly opaque pixels (the old sheets have a faint glow that fills the whole cell)."""
    return Image.fromarray(((np.asarray(alpha) > threshold) * 255).astype("uint8")).getbbox()


def cut_out(image):
    """Flat magenta background -> transparency, with the magenta fringe removed from the white sticker border."""
    rgb = np.asarray(image.convert("RGB")).astype("float32")
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # Distance from pure magenta. Purple jerseys and pink ears are far from it, so they are never touched.
    distance = np.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2)
    # Background = areas of near-pure magenta (the surround and any pocket between an arm and the body),
    # grown by two pixels to take in the blended fringe on the white border.
    labels, count = ndimage.label(distance < 60)
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, count + 1))
    background = np.isin(labels, [i + 1 for i, size in enumerate(sizes) if size > 200])
    fringe = ndimage.binary_dilation(background, iterations=2) & ~background
    alpha = np.where(background, 0.0, 1.0)
    alpha = np.where(fringe, np.clip((distance - 70) / 110, 0, 1), alpha)
    # The fringe is white border mixed with magenta: give it back its green so it reads as white.
    g = np.where(fringe, np.maximum(g, np.maximum(r, b) - 12), g)
    out = np.dstack([r, g, b, alpha * 255]).astype("uint8")
    result = Image.fromarray(out, "RGBA")
    result.putalpha(result.getchannel("A").filter(ImageFilter.GaussianBlur(0.5)))
    return result


def feet_centre(alpha, box):
    """Horizontal centre of the lowest 12% of the character (the shoes)."""
    left, top, right, bottom = box
    band = np.asarray(alpha.crop((left, bottom - int((bottom - top) * 0.12), right, bottom))) > 128
    columns = np.nonzero(band.any(axis=0))[0]
    return left + (columns.min() + columns.max()) / 2


def main(folder):
    folder = Path(folder)
    atlas = Image.new("RGBA", (CELL_W * 3, CELL_H * 2), (0, 0, 0, 0))
    report = {}
    for column, (sheet, animals) in enumerate(SHEETS):
        old = Image.open(ROOT / "public" / "basketball" / f"{sheet}.png").convert("RGBA")
        new = cut_out(Image.open(folder / f"hold-{sheet}.png"))
        half = new.width // 2
        for row, animal in enumerate(animals):
            ready = old.crop((0, row * CELL_H, CELL_W, (row + 1) * CELL_H))
            ready_box = solid_box(ready.getchannel("A"))
            piece = new.crop((row * half, 0, (row + 1) * half, new.height))
            box = solid_box(piece.getchannel("A"))
            piece = piece.crop(box)
            scale = (ready_box[3] - ready_box[1]) / piece.height
            piece = piece.resize((round(piece.width * scale), round(piece.height * scale)), Image.LANCZOS)
            piece_box = (0, 0, piece.width, piece.height)
            x = round(feet_centre(ready.getchannel("A"), ready_box) - feet_centre(piece.getchannel("A"), piece_box))
            x = max(0, min(CELL_W - piece.width, x)) if piece.width <= CELL_W else (CELL_W - piece.width) // 2
            y = ready_box[3] - piece.height
            cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
            cell.alpha_composite(piece, (x, y)) if x >= 0 else cell.paste(piece, (x, y), piece)
            atlas.alpha_composite(cell, (column * CELL_W, row * CELL_H))
            report[animal] = {"col": column, "row": row, "scale": round(scale, 3), "offset": [x, y], "size": list(piece.size)}
    target = ROOT / "public" / "basketball" / "hold.png"
    atlas.save(target, optimize=True)
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    print(json.dumps({"file": str(target), "sha256": digest, "bytes": target.stat().st_size, "cells": report}, indent=1))


if __name__ == "__main__":
    main(sys.argv[1])
