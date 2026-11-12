"""把 Noto Sans TC（可變字型）轉成常規／粗體兩個靜態字型，並只保留遊戲用到的字。

用法：python -I tools/build_cjk_font.py <NotoSansTC[wght].ttf 路徑>
      python -I tools/build_cjk_font.py --check     只檢查：列出遊戲文字裡、目前字型沒有的字（沒有缺字就印 OK）
會掃描 scripts/、data/（含子資料夾）的 .gd／.json／.txt／.tscn，以及 tools/shops_ershui.py（店名、地標名），
加上常用標點與 ♥♡★☆✓。2026-11-12：之前只掃 scripts/*.gd、data/*.json，而且 11/08 加店家後沒重跑 → 預覽版缺 140 多字
（例：水餃店顯示成「水店」）。**每次改到中文字（地點、店名、題目）都要重跑，再 --import。**
輸出：assets/fonts/NotoSansTC-Regular-subset.ttf、NotoSansTC-Bold-subset.ttf（字型授權：OFL，見 NotoSansTC-OFL.txt）。
"""
import glob
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def game_chars() -> set:
    files = []
    for d in ("scripts", "data", "scenes"):
        for ext in ("gd", "json", "txt", "tscn"):
            files += glob.glob(os.path.join(HERE, d, "**", "*." + ext), recursive=True)
    files.append(os.path.join(HERE, "tools", "shops_ershui.py"))
    text = set()
    for f in files:
        text |= set(open(f, encoding="utf-8").read())
    # 表情符號不在 Noto Sans TC 裡（畫面也不用），不算缺字
    return {c for c in text if ord(c) > 127 and ord(c) < 0x10000}


def check() -> int:
    bad = []
    for name in ("Regular", "Bold"):
        cm = TTFont(os.path.join(HERE, "assets", "fonts", f"NotoSansTC-{name}-subset.ttf")).getBestCmap()
        miss = "".join(sorted(c for c in game_chars() if ord(c) not in cm))
        if miss:
            bad.append(f"{name} 缺 {len(miss)} 字：{miss}")
    print(" / ".join(bad) if bad else "OK 字型包含遊戲裡所有中文字")
    return 1 if bad else 0


def main() -> None:
    if sys.argv[1] == "--check":
        sys.exit(check())
    src = sys.argv[1]
    chars = "".join(sorted(game_chars()))
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
