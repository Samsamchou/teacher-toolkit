"""Compose the canonical students and mascot onto the open finale background.

The source cutouts are never modified and an existing output is never
overwritten.  This preserves the eight approved character identities instead
of asking ImageGen to redraw them.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = ROOT / "tmp" / "step5" / "FINALE-02-open-prepared.png"
OUTPUT = (
    ROOT
    / "assets"
    / "imagegen"
    / "masters"
    / "finale"
    / "FINALE-02-WelcomeGateOpen.png"
)

CHARACTERS = [
    "CHAR-01-Maya.png",
    "CHAR-02-Andy.png",
    "CHAR-03-Ken.png",
    "CHAR-04-Amy.png",
    "CHAR-05-Lynn.png",
    "CHAR-06-Mina.png",
    "CHAR-07-Alan.png",
    "CHAR-08-Wei.png",
]

# Four students on each side leave the open route visible in the middle.
CENTERS_X = [170, 360, 550, 740, 1308, 1498, 1688, 1878]
BASELINE_Y = [1490, 1500, 1492, 1504, 1504, 1492, 1500, 1490]
TARGET_HEIGHTS = [410, 430, 420, 405, 405, 420, 430, 410]


def visible_cutout(path: Path, target_height: int) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit(f"No visible alpha pixels: {path}")
    visible = image.crop(bbox)
    width = max(1, round(visible.width * target_height / visible.height))
    return visible.resize((width, target_height), Image.Resampling.LANCZOS)


def add_soft_shadow(canvas: Image.Image, box: tuple[int, int, int, int]) -> None:
    left, top, right, bottom = box
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    pad = max(10, (right - left) // 7)
    draw.ellipse(
        (left + pad, bottom - 18, right - pad, bottom + 18),
        fill=(58, 42, 25, 72),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    canvas.alpha_composite(shadow)


def main() -> None:
    if not BACKGROUND.is_file():
        raise SystemExit(f"Missing prepared background: {BACKGROUND}")
    if OUTPUT.exists():
        raise SystemExit(f"Refusing to overwrite: {OUTPUT}")

    canvas = Image.open(BACKGROUND).convert("RGBA")
    char_dir = ROOT / "assets" / "imagegen" / "masters" / "characters"

    prepared: list[tuple[Image.Image, int, int]] = []
    for name, center_x, baseline, height in zip(
        CHARACTERS, CENTERS_X, BASELINE_Y, TARGET_HEIGHTS, strict=True
    ):
        cutout = visible_cutout(char_dir / name, height)
        left = round(center_x - cutout.width / 2)
        top = baseline - cutout.height
        prepared.append((cutout, left, top))
        add_soft_shadow(canvas, (left, top, left + cutout.width, baseline))

    # Center-near figures are pasted last so overlaps look intentional.
    for index in [0, 7, 1, 6, 2, 5, 3, 4]:
        cutout, left, top = prepared[index]
        canvas.alpha_composite(cutout, (left, top))

    mascot_path = (
        ROOT
        / "assets"
        / "imagegen"
        / "masters"
        / "mascots"
        / "MASCOT-05-Finale.png"
    )
    mascot = visible_cutout(mascot_path, 285)
    mascot_left = (canvas.width - mascot.width) // 2
    mascot_top = 1510 - mascot.height
    add_soft_shadow(
        canvas,
        (mascot_left, mascot_top, mascot_left + mascot.width, 1510),
    )
    canvas.alpha_composite(mascot, (mascot_left, mascot_top))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT, format="PNG", optimize=True)
    print(f"output={OUTPUT}")
    print(f"size={canvas.width}x{canvas.height}")
    print("students=8")
    print("mascot=1")


if __name__ == "__main__":
    main()
