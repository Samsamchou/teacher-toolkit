from pathlib import Path

from PIL import Image, ImageOps


REFERENCE_IMAGES = [
    Path(r"C:\Users\User\AppData\Local\Temp\codex-clipboard-0cf7c481-fe8e-4542-a65f-2957d4edfd9d.png"),
    Path(r"C:\Users\User\AppData\Local\Temp\codex-clipboard-f4653211-59df-4e60-a9dd-bfb4fce2c41c.png"),
    Path(r"C:\Users\User\AppData\Local\Temp\codex-clipboard-c5abd3c5-2260-484a-b188-d29c62c84ab6.png"),
    Path(r"C:\Users\User\AppData\Local\Temp\codex-clipboard-b37af77e-a801-4bb5-afa7-2aff67904642.png"),
]

OUTPUT = (
    Path(__file__).resolve().parent
    / "lesson2_imagegen_revision"
    / "style_references_2x2.png"
)


def contain(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    tile = Image.new("RGB", size, "white")
    fitted = ImageOps.contain(image.convert("RGB"), (size[0] - 32, size[1] - 32))
    x = (size[0] - fitted.width) // 2
    y = (size[1] - fitted.height) // 2
    tile.paste(fitted, (x, y))
    return tile


def main() -> None:
    missing = [str(path) for path in REFERENCE_IMAGES if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing reference images: " + "; ".join(missing))

    cell = (800, 1100)
    gap = 36
    margin = 48
    board = Image.new(
        "RGB",
        (margin * 2 + cell[0] * 2 + gap, margin * 2 + cell[1] * 2 + gap),
        "white",
    )

    for index, path in enumerate(REFERENCE_IMAGES):
        with Image.open(path) as source:
            tile = contain(source, cell)
        col = index % 2
        row = index // 2
        x = margin + col * (cell[0] + gap)
        y = margin + row * (cell[1] + gap)
        board.paste(tile, (x, y))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    board.save(OUTPUT, dpi=(150, 150))
    print(f"OUTPUT={OUTPUT}")
    print(f"SIZE={board.width}x{board.height}")


if __name__ == "__main__":
    main()
