# -*- coding: utf-8 -*-
"""把 test_home/、test_openhand/ 的截圖拼成三張總覽圖（白底、英文標題），存到 資料/freetime/

執行：python -I tools/openhand_sheets.py          （Ken 的三張）
      python -I tools/openhand_sheets.py zunbo    （圳寶：zunbo-openhand-check-v1.png）
先跑：Godot --path . res://scenes/home_check.tscn 和 res://scenes/openhand_check.tscn
      （圳寶：CHAR=zunbo_openhand CAMDIST=1.4 Godot --path . res://scenes/openhand_check.tscn）
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(os.path.dirname(ROOT), "資料", "freetime")
FONT = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 26)


def sheet(out, cols, cell, items, crop=None):
    """items：[(標題, 檔案路徑, 裁切框或 None)]；cell＝每格 (寬, 高)"""
    w, h = cell
    pad, top = 16, 40
    rows = (len(items) + cols - 1) // cols
    S = Image.new("RGB", (pad + cols * (w + pad), pad + rows * (h + top + pad)), "white")
    d = ImageDraw.Draw(S)
    for i, (title, path, box) in enumerate(items):
        im = Image.open(os.path.join(ROOT, path)).convert("RGB")
        if box:
            im = im.crop(box)
        # 維持比例縮放後置中裁切
        sc = max(w / im.width, h / im.height)
        im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
        x0 = (im.width - w) // 2
        y0 = (im.height - h) // 2
        im = im.crop((x0, y0, x0 + w, y0 + h))
        x = pad + (i % cols) * (w + pad)
        y = pad + (i // cols) * (h + top + pad)
        d.text((x + 2, y + 4), title, fill="black", font=FONT)
        S.paste(im, (x, y + top))
    S.save(os.path.join(OUT, out))
    print("saved", os.path.join(OUT, out), S.size)




def zunbo_sheet():
    """圳寶：版面同 Ken（20 格），從上往下看兩手會被大頭擋住 → 兩手並排改用前方視角；多一列 walk 動畫和切口"""
    C = (330, 60, 950, 660)
    B = (280, 0, 1000, 720)
    sheet("zunbo-openhand-check-v1.png", 4, (400, 400), [
        ("rest pose (front)", "test_openhand/rest_front.png", (300, 0, 1020, 720)),
        ("rest pose - right hand", "test_openhand/rest_hand.png", (200, 0, 920, 720)),
        ("stand (front)", "test_openhand/stand_front.png", B),
        ("stand - right side", "test_openhand/stand_right.png", B),
        ("right hand - palm", "test_openhand/hand_right_0.png", C),
        ("right hand - thumb side", "test_openhand/hand_right_1.png", C),
        ("right hand - back", "test_openhand/hand_right_2.png", C),
        ("stand - right hand close-up", "test_openhand/stand_hand_right_front.png", B),
        ("fingers curled 45 - palm", "test_openhand/curl45_right_0.png", C),
        ("fingers curled 45 - side", "test_openhand/curl45_right_1.png", C),
        ("fingers curled 80 - palm", "test_openhand/curl80_right_0.png", C),
        ("fingers curled 80 - side", "test_openhand/curl80_right_1.png", C),
        ("both hands - backs (right | left)", "test_openhand/pair_back_front.png", B),
        ("both hands - palms (right | left)", "test_openhand/pair_palm_front.png", B),
        ("left hand - palm (reference)", "test_openhand/hand_left_0.png", C),
        ("left hand - back (reference)", "test_openhand/hand_left_2.png", C),
        ("Mixamo cheering", "test_openhand/anim_cheering_1.png", (440, 120, 800, 480)),
        ("Mixamo dribble", "test_openhand/anim_dribble_1_wrist.png", B),
        ("Mixamo typing", "test_openhand/anim_typing_1_wrist.png", B),
        ("Mixamo typing (whole body)", "test_openhand/anim_typing_2.png", B),
        ("game walk (embedded anim)", "test_openhand/walk_1.png", (380, 0, 1100, 720)),
        ("game walk - right hand", "test_openhand/walk_1_right.png", B),
        ("forearm seam - right (new)", "test_openhand/cut_right_2.png", B),
        ("forearm - left (reference)", "test_openhand/cut_left_2.png", B),
    ])


if len(sys.argv) > 1 and sys.argv[1] == "zunbo":
    zunbo_sheet()
    sys.exit(0)

# 六個室內動作（2×3）
sheet("ken-home-interior-v4.png", 2, (640, 400), [
    ("overview", "test_home/overview.png", None),
    ("watch TV", "test_home/watch_tv.png", None),
    ("listen to music", "test_home/listen_music.png", None),
    ("study English", "test_home/study_english.png", None),
    ("surf the Internet", "test_home/surf_internet.png", None),
    ("play the recorder", "test_home/recorder.png", None),
])

# 手部特寫：讀英文、吹直笛各兩個角度
sheet("ken-home-hands-closeup-v4.png", 2, (800, 500), [
    ("study English - right hand, from the front", "test_home/study_english_rh_b.png", None),
    ("play the recorder - hands", "test_home/recorder_hands.png", None),
    ("study English - right hand, from the left", "test_home/study_english_rh_a.png", None),
    ("play the recorder - from Ken's right", "test_home/recorder_hands_r.png", None),
])

# 模型檢查：原始姿勢、站好、右手特寫、手指彎曲、兩手並排、動作
C = (330, 60, 950, 660)      # 手部特寫（手在畫面中間）
B = (390, 0, 890, 720)       # 全身
sheet("ken-openhand-check-v1.png", 4, (400, 400), [
    ("rest pose (front)", "test_openhand/rest_front.png", (280, 0, 1000, 720)),
    ("rest pose - right hand", "test_openhand/rest_hand.png", (480, 0, 1200, 720)),
    ("stand (front)", "test_openhand/stand_front.png", (280, 0, 1000, 720)),
    ("stand - right side", "test_openhand/stand_right.png", (280, 0, 1000, 720)),
    ("right hand - palm", "test_openhand/hand_right_0.png", C),
    ("right hand - thumb side", "test_openhand/hand_right_1.png", C),
    ("right hand - back", "test_openhand/hand_right_2.png", C),
    ("stand - right hand close-up", "test_openhand/stand_hand_right.png", (500, 0, 1220, 720)),
    ("fingers curled 45 - palm", "test_openhand/curl45_right_0.png", C),
    ("fingers curled 45 - side", "test_openhand/curl45_right_1.png", C),
    ("fingers curled 80 - palm", "test_openhand/curl80_right_0.png", C),
    ("fingers curled 80 - side", "test_openhand/curl80_right_1.png", C),
    ("both hands - backs (right | left)", "test_openhand/pair_back.png", (280, 0, 1000, 720)),
    ("both hands - palms (right | left)", "test_openhand/pair_palm.png", (280, 0, 1000, 720)),
    ("left hand - palm (reference)", "test_openhand/hand_left_0.png", C),
    ("left hand - back (reference)", "test_openhand/hand_left_2.png", C),
    ("Mixamo cheering", "test_openhand/anim_cheering_0_wrist.png", (280, 0, 1000, 720)),
    ("Mixamo dribble", "test_openhand/anim_dribble_1_wrist.png", (280, 0, 1000, 720)),
    ("Mixamo typing", "test_openhand/anim_typing_0_wrist.png", (280, 0, 1000, 720)),
    ("Mixamo typing (whole body)", "test_openhand/anim_typing_2.png", (280, 0, 1000, 720)),
])
