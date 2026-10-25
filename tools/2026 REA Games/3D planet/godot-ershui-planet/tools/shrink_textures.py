"""縮小 Tripo 模型拆出的貼圖（沿用 godot-ershui-quest 10/23 的設定，網頁版 pck 從 160 MB 降下來）。

建築／公園道具底色 768、小道具與 Ken 底色 512／1024、粗糙度 256、法線 512；壓縮用 Basis Universal。
改的是 assets/models/*.jpg|png.import 的 [params]，之後要重新 --import。
用法：python -I tools/shrink_textures.py
"""
import glob
import os
import re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SMALL = ("tree", "street_lamp", "scooter", "car_")


def limit(name: str) -> int:
    if "_normal" in name:
        return 512
    if "_rm" in name:
        return 256
    if name.startswith(("ken", "shuiling", "zunbo", "chibi", "robot", "cute")):
        return 1024
    if name.startswith(SMALL):
        return 512
    if name.startswith("bld_"):
        return 768
    return 768


def main() -> None:
    n = 0
    for f in glob.glob(os.path.join(HERE, "assets", "models", "*.import")):
        base = os.path.basename(f)[:-7]
        if not base.lower().endswith((".jpg", ".png")):
            continue
        t = open(f, encoding="utf-8").read()
        t = re.sub(r"process/size_limit=\d+", f"process/size_limit={limit(base)}", t)
        t = re.sub(r"compress/mode=\d+", "compress/mode=4", t)
        open(f, "w", encoding="utf-8", newline="\n").write(t)
        n += 1
    print("updated", n)


if __name__ == "__main__":
    main()
