"""做遊戲內建的中文字型子集（避免 iPad 上出現方框字）。

掃描 scripts/*.gd 的所有非英文字元，加上題庫 bank.json 的文字與常用標點，
把 Noto Sans TC 可變字型轉成常規／粗體兩個靜態子集字型。

用法：python -I -X utf8 tools/build_font.py <NotoSansTC 可變字型.ttf> <bank.json> [更多 bank.json ...]
輸出：assets/fonts/NotoSansTC-Regular-subset.ttf、NotoSansTC-Bold-subset.ttf（OFL，見 NotoSansTC-OFL.txt）
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
    for f in glob.glob(os.path.join(HERE, "scripts", "*.gd")) + sys.argv[2:]:
        text |= set(open(f, encoding="utf-8").read())
    chars = "".join(sorted(c for c in text if ord(c) > 127))
    chars += "".join(chr(i) for i in range(32, 127)) + "，。！？：；、「」（）…—♥♡★☆✓→／"
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
        print(out, os.path.getsize(out), "chars", len(set(chars)))


if __name__ == "__main__":
    main()
