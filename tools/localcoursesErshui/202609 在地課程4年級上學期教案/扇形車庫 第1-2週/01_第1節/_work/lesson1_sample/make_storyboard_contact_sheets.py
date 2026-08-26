from pathlib import Path
import re
import sys

from PIL import Image, ImageDraw, ImageFont


COLS = 4
ROWS = 4
TILE_W = 320
TILE_H = 180
LABEL_H = 28


def main():
    frames_dir = Path(sys.argv[1])
    frames = sorted(frames_dir.glob("frame-*.png"))
    if not frames:
        raise RuntimeError("No frames found")

    font = ImageFont.load_default(size=18)
    per_sheet = COLS * ROWS
    for sheet_index in range((len(frames) + per_sheet - 1) // per_sheet):
        group = frames[sheet_index * per_sheet : (sheet_index + 1) * per_sheet]
        sheet = Image.new("RGB", (COLS * TILE_W, ROWS * (TILE_H + LABEL_H)), "white")
        draw = ImageDraw.Draw(sheet)
        for slot, path in enumerate(group):
            row, col = divmod(slot, COLS)
            x = col * TILE_W
            y = row * (TILE_H + LABEL_H)
            frame = Image.open(path).convert("RGB")
            sheet.paste(frame, (x, y))
            match = re.search(r"-(\d{3})-(\d{2}\.\d)s", path.stem)
            label = f"#{match.group(1)}  {match.group(2)}s" if match else path.stem
            draw.rectangle((x, y + TILE_H, x + TILE_W, y + TILE_H + LABEL_H), fill="white")
            draw.text((x + 6, y + TILE_H + 3), label, fill="black", font=font)
        out = frames_dir / f"contact-sheet-{sheet_index + 1:02d}.png"
        sheet.save(out)
        print(out)


if __name__ == "__main__":
    main()
