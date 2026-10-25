"""把 Noto Sans TC（可變字型）轉成常規／粗體兩個靜態字型，並只保留遊戲用到的字。

用法：python -I tools/build_cjk_font.py <NotoSansTC[wght].ttf 路徑>
會掃描 scripts/*.gd 與 data/*.json 裡出現的所有非英文字元，加上常用標點與 ♥♡★☆✓。
輸出：assets/fonts/NotoSansTC-Regular-subset.ttf、NotoSansTC-Bold-subset.ttf（字型授權：OFL，見 NotoSansTC-OFL.txt）。
"""
import glob
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main() -> None:
    src = sys.argv[1]
    text = set()
    for f in glob.glob(os.path.join(HERE, "scripts", "*.gd")) + glob.glob(os.path.join(HERE, "data", "*.json")):
        text |= set(open(f, encoding="utf-8").read())
    chars = "".join(sorted(c for c in text if ord(c) > 127))
    chars += "".join(chr(i) for i in range(32, 127)) + "，。！？：；、「」（）…—♥♡★☆✓"
    for name, weight in [("Regular", 400), ("Bold", 700)]:
        font = instancer.instantiateVariableFont(TTFont(src), {"wght": weight})
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        sub = subset.Subsetter(opts)
        sub.populate(text=chars)
        sub.subset(font)
        out = os.path.join(HERE, "assets", "fonts", f"NotoSansTC-{name}-subset.ttf")
        font.save(out)
        print(out, os.path.getsize(out))


if __name__ == "__main__":
    main()
