from email import policy
from email.parser import BytesParser
from io import BytesIO
from pathlib import Path
import sys

from PIL import Image


STEP_SECONDS = 1 / 1.015625
TILE_WIDTH = 320
TILE_HEIGHT = 180
ROWS = 3
COLS = 3
VIDEO_DURATION = 64.0


def main():
    source = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    message = BytesParser(policy=policy.default).parsebytes(source.read_bytes())
    images = []
    for part in message.walk():
        if part.get_content_maintype() != "image":
            continue
        payload = part.get_payload(decode=True)
        if not payload:
            continue
        image = Image.open(BytesIO(payload)).convert("RGB")
        images.append((part.get("Content-Location", ""), image.copy()))

    if not images:
        raise RuntimeError("No storyboard images found")

    images.sort(key=lambda item: item[0])
    frame_index = 0
    records = []
    for sprite_index, (_, sprite) in enumerate(images):
        sprite.save(out_dir / f"sprite-{sprite_index:02d}.jpg", quality=95)
        for row in range(ROWS):
            for col in range(COLS):
                seconds = frame_index * STEP_SECONDS
                if seconds >= VIDEO_DURATION:
                    break
                left = col * TILE_WIDTH
                top = row * TILE_HEIGHT
                frame = sprite.crop((left, top, left + TILE_WIDTH, top + TILE_HEIGHT))
                filename = f"frame-{frame_index:03d}-{seconds:05.1f}s.png"
                frame.save(out_dir / filename)
                records.append(f"{frame_index:03d}\t{seconds:05.1f}\t{filename}")
                frame_index += 1

    (out_dir / "frames.tsv").write_text(
        "index\tseconds\tfilename\n" + "\n".join(records) + "\n",
        encoding="utf-8",
    )
    print(f"sprites={len(images)} frames={frame_index}")


if __name__ == "__main__":
    main()
