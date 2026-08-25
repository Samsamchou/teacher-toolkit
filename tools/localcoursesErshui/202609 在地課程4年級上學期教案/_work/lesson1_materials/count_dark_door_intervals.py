from PIL import Image
import numpy as np


path = r"C:\Users\User\.codex\visualizations\2026\08\25\01a03887-2ca6-7233-8e1e-37a3f0b56a27\images_final_ascii\05_full_scene_upper_qa.jpg"
array = np.asarray(Image.open(path).convert("L"))
band = array[210:390, :]
fraction_dark = (band < 90).mean(axis=0)
mask = fraction_dark > 0.35

segments = []
start = None
for index, value in enumerate(mask):
    if value and start is None:
        start = index
    if start is not None and (not value or index == len(mask) - 1):
        end = index if not value else index + 1
        if end - start > 20:
            segments.append((start, end, end - start, round(float(fraction_dark[start:end].mean()), 2)))
        start = None

print(segments)
print(f"count={len(segments)}")
