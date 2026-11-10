"""Free Time 兩種玩法的檢查表（英文標籤）→ 資料/freetime/modes-check-v1.png
來源：Godot 測試截圖 test_ft/（MODE A：--test；MODE B：PAIR=1 --test）＋網頁外框截圖 資料/freetime/frame-check/（web-*.png、f0*.png）
用法：python -I tools/modes_sheet.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FT = os.path.join(HERE, "test_shots")
FR = os.path.join(os.path.dirname(HERE), "資料", "freetime", "frame-check")
OUT = os.path.join(os.path.dirname(HERE), "資料", "freetime", "modes-check-v1.png")

SECTIONS = [
    ("MODE A · Class groups (projector, no login)", [
        (FT, "A00_title", "Mode select (title)"), (FT, "A01_setup", "Group setup + betting rule"),
        (FT, "A01_english_1scenario_locked", "Q1 LOCKED: tap Play first (options grey)"),
        (FT, "A01_english_1b_unlocked", "Q1 UNLOCKED after scenario audio"), (FT, "A01_english_2bets", "Q1 groups bet (option x 1-3)"),
        (FT, "A01_english_3moving", "Q1 Ken walks home"), (FT, "A01_english_4act", "Q1 indoor: study English"),
        (FT, "A02_tv_4act", "Q2 indoor: watch TV"), (FT, "A03_jogging_3moving", "Q3 Ken jogs to school"),
        (FT, "A03_jogging_4act", "Q3 outdoor: go jogging"), (FT, "A04_music_4act", "Q4 outdoor: listen to music"),
        (FT, "A05_recorder_4act", "Q5 indoor: play the recorder"), (FT, "A06_games_4act", "Q6 indoor: play online games"),
        (FT, "A07_internet_4act", "Q7 indoor: surf the Internet"), (FT, "A08_bike_3moving", "Q8 Ken rides to school"),
        (FT, "A08_bike_4act", "Q8 outdoor: ride a bike"), (FT, "A09_basketball_4act", "Q9 outdoor: play basketball"),
        (FT, "A10_camping_4act", "Q10 outdoor: go camping"), (FT, "A11_baseball_4act", "Q11 outdoor: play baseball"),
        (FT, "A99_result", "Final scoreboard + cheer"), (FT, "A99_result_b", "Celebration (confetti)"),
    ]),
    ("MODE B · Pair clue challenge (iPad, two IDs)", [
        (FR, "f01_login_error", "Pair login: error"), (FR, "f02_login_ok", "Pair login: 60101 + 60126"),
        (FT, "B00_title", "Pair title (in frame)"), (FT, "B01_english_1scenario_locked", "LOCKED: scenario Play, clue locked"),
        (FT, "B01_english_1b_clue_unlocked", "Clue UNLOCKED after audio (tap Clue)"),
        (FT, "B01_english_1c_clue_playing_answer_locked", "Clue playing, Answer still LOCKED"),
        (FT, "B01_english_2d_answer_unlocked", "Clue done: Answer UNLOCKED"),
        (FT, "B_clue_icons", "Clue: 3 icons (1st)"), (FT, "B_clue_icons_all", "Clue: 3 icons (all)"),
        (FT, "B_clue_sfx", "Clue: sound effect"), (FT, "B_clue_video", "Clue: silent video"),
        (FT, "B_clue_anim", "Clue: code animation"), (FR, "web-choice", "Answer: multiple choice"),
        (FR, "web-drag", "Answer: drag-and-drop"), (FR, "web-speak", "Answer: AI speaking (turns)"),
        (FR, "web-speak-result", "Speaking result (mock AI)"), (FT, "B01_english_4act", "Ken acts out answer"),
        (FT, "B99_result", "Game end"), (FR, "web-result", "Pair result (frame)"),
    ]),
    ("Code-animation clues (11 activities, wordless)", [(FT, f"clueanim_{a}", a) for a in
        ["jogging", "music", "baseball", "basketball", "bike", "english", "internet", "tv", "camping", "games", "recorder"]]),
]


def pick(d, name):
    for ext in (".png",):
        p = os.path.join(d, name + ext)
        if os.path.exists(p):
            return p
    # 前綴比對（例：B_clue_icons → B03_x_2clue_icons）
    key = name.replace("B_clue_", "2clue_")
    for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        if f.endswith(key + ".png"):
            return os.path.join(d, f)
    return None


def main():
    W, H, cols = 480, 270, 4
    font = ImageFont.truetype("arialbd.ttf", 17)
    hfont = ImageFont.truetype("arialbd.ttf", 26)
    blocks = []
    for title, cells in SECTIONS:
        rows = (len(cells) + cols - 1) // cols
        blocks.append((title, cells, rows))
    total_h = sum(44 + r * (H + 28) for _, _, r in blocks) + 10
    im = Image.new("RGB", (W * cols + 10 * (cols + 1), total_h), "white")
    dr = ImageDraw.Draw(im)
    y = 6
    missing = []
    for title, cells, rows in blocks:
        dr.text((10, y + 8), title, fill="#3a2a40", font=hfont)
        y += 44
        for i, (d, name, label) in enumerate(cells):
            x = 10 + (i % cols) * (W + 10)
            yy = y + (i // cols) * (H + 28)
            dr.text((x, yy + 4), label, fill="black", font=font)
            p = pick(d, name)
            if p:
                im.paste(Image.open(p).convert("RGB").resize((W, H)), (x, yy + 26))
            else:
                dr.rectangle((x, yy + 26, x + W, yy + 26 + H), outline="red", width=3)
                dr.text((x + 10, yy + 120), "missing: " + name, fill="red", font=font)
                missing.append(name)
        y += rows * (H + 28)
    im.save(OUT)
    print("saved", OUT, im.size, "missing:", missing)


main()
