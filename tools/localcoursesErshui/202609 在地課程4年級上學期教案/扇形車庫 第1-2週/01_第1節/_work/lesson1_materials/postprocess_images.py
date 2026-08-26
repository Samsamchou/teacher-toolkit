from pathlib import Path

from PIL import Image, ImageFilter


SOURCE_DIR = Path(r"C:\Users\User\.codex\generated_images\01a03887-2ca6-7233-8e1e-37a3f0b56a27")
OUTPUT_DIR = Path(r"C:\Users\User\.codex\visualizations\2026\08\25\01a03887-2ca6-7233-8e1e-37a3f0b56a27\images_final_ascii")

JOBS = [
    ("exec-9c6a57b9-273e-495f-a680-0159558d2f2c.png", "01_turntable.png", (1600, 1200)),
    ("exec-1ebc8925-777c-4da7-a381-8d9adf6da347.png", "02_radial_tracks.png", (1600, 1200)),
    ("exec-a15fdbd4-5856-4898-86e3-2e095eef0a1d.png", "03_roundhouse_doors.png", (1600, 1200)),
    ("exec-e3f2a58d-77fc-4c17-b565-2e448116b99b.png", "04_locomotive.png", (1600, 1200)),
    ("exec-564bad2a-0337-4d22-87da-57e690bdcbba.png", "05_full_scene.png", (4961, 3508)),
]


def centered_crop_to_ratio(image, target_size):
    target_ratio = target_size[0] / target_size[1]
    source_ratio = image.width / image.height
    if abs(source_ratio - target_ratio) < 1e-6:
        return image
    if source_ratio > target_ratio:
        crop_width = round(image.height * target_ratio)
        left = (image.width - crop_width) // 2
        return image.crop((left, 0, left + crop_width, image.height))
    crop_height = round(image.width / target_ratio)
    top = (image.height - crop_height) // 2
    return image.crop((0, top, image.width, top + crop_height))


def process(source_name, output_name, target_size):
    source_path = SOURCE_DIR / source_name
    output_path = OUTPUT_DIR / output_name
    with Image.open(source_path) as image:
        image = image.convert("RGB")
        cropped = centered_crop_to_ratio(image, target_size)
        resized = cropped.resize(target_size, Image.Resampling.LANCZOS)
        resized = resized.filter(ImageFilter.UnsharpMask(radius=1.2, percent=65, threshold=3))
        resized.save(output_path, format="PNG", dpi=(300, 300), optimize=True)
        print(f"{output_name}\tsource={image.size}\tcrop={cropped.size}\tfinal={resized.size}")


OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
for job in JOBS:
    process(*job)

with Image.open(OUTPUT_DIR / "05_full_scene.png") as full_scene:
    preview = full_scene.convert("RGB")
    preview.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
    preview.save(OUTPUT_DIR / "05_full_scene_preview.jpg", format="JPEG", quality=92, optimize=True)
    print(f"05_full_scene_preview.jpg\tfinal={preview.size}")
    upper = preview.crop((0, 160, preview.width, 760))
    upper.save(OUTPUT_DIR / "05_full_scene_upper_qa.jpg", format="JPEG", quality=94, optimize=True)
    print(f"05_full_scene_upper_qa.jpg\tfinal={upper.size}")
