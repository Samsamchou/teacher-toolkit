"""二水鐵道博物館默劇加音效（照 listen-3clues/video/make_mime_sfx.py；不放說話聲；整段 -20 LUFS）。
秒數照每秒 4 張＋拍照段每秒 10 張抽格：
  1.75 手往前（付錢）→ 投幣＋售票機嗶（新層 ticket，2.5 點）
  3.2–4.9 手背在後面慢慢踮腳走 → 輕輕的腳步（借環境音 amb:museum/footsteps）
  6.4–7.3 雙手比框框、眨一隻眼 → 6.8 相機快門喀嚓（借 amb:museum/shutter，剪一聲）
  python -I make_museum_sfx.py      # 生成缺的層＋混音 → listen-3clues/museum_mime_sfx.mp4＋外框 clues/video/museum.mp4
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "listen-3clues", "video"))
import make_mime_sfx as X

X.LAYERS["museum"] = {
    "ticket": "Paying at a museum ticket machine: a few coins dropped into a metal coin slot clinking one after another, then one short soft electronic beep and a small paper ticket printing with a quick whirr.",
}
X.PLAN["museum"] = [
    ("ticket", 1.75, 1.6, -1, "投幣＋售票機嗶（買票）"),
    ("amb:museum/footsteps", 3.2, 1.8, -5, "輕輕的腳步（安靜看展品）"),
    ("amb:museum/shutter", 6.8, 0.2, 2, "相機快門喀嚓（拍照）", [6.8]),
]

if __name__ == "__main__":
    X.gen("museum")
    X.mix("museum")
