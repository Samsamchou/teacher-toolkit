"""動作合邏輯檢查圖（2026-11-10）：把 motion_check.gd 拍的 4 格關鍵畫面＋量到的接觸數字排成一張圖。
用法（在 godot-ershui-freetime 資料夾）：
  python -I tools/motion_sheet.py ken|shuiling|zunbo     → ../資料/freetime/motion-check-<who>-v1.png
  python -I tools/motion_sheet.py movement               → ../資料/freetime/motion-check-movement-clues-v1.png
  python -I tools/motion_sheet.py beforeafter            → ../資料/freetime/motion-fix-before-after-v1.png
數字是網格量的（cm），綠＝在標準內、紅＝超出。標準：手到球 ≤2、輪子貼地 ±1、腳到踏板 ≤2、棒子碰球那一格 ≤3。
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(os.path.dirname(ROOT), "資料", "freetime")
FONT = os.path.join(ROOT, "assets", "fonts", "ComicRelief-Regular.ttf")
FONTB = os.path.join(ROOT, "assets", "fonts", "ComicRelief-Bold.ttf")
V = os.environ.get("MOTION_V", "v1")

ACTS = [
    ("jogging", "go jogging"), ("music", "listen to music"), ("baseball", "play baseball"),
    ("basketball", "play basketball"), ("bike", "ride a bike"), ("english", "study English"),
    ("internet", "surf the Internet"), ("tv", "watch TV"), ("camping", "go camping"),
    ("games", "play online games"), ("recorder", "play the recorder"),
]


def ok_range(lo, hi):
    return lambda v: lo <= v <= hi


# 每個活動要印的數字：(key, 短名, 判斷)；判斷 None＝只顯示
SHOW = {
    "bike": [("foot_left_pedal_gap_cm", "L foot-pedal", ok_range(-0.5, 2)), ("foot_right_pedal_gap_cm", "R foot-pedal", ok_range(-0.5, 2)),
             ("wheel_rear_gap_cm", "rear wheel-road", ok_range(-1, 1)), ("wheel_front_gap_cm", "front wheel-road", ok_range(-1, 1)),
             ("seat_gap_cm", "seat", ok_range(-0.5, 2)), ("hand_left_grip_gap_cm", "L hand-grip", ok_range(-0.5, 2)), ("hand_right_grip_gap_cm", "R hand-grip", ok_range(-0.5, 2))],
    "basketball": [("hand_ball_gap_cm", "hand-ball", None), ("ball_floor_gap_cm", "ball-floor", None), ("contact", "in hand", None)],
    "baseball": [("ball_bat_gap_cm", "ball-bat", None), ("hand_left_bat_gap_cm", "L hand-bat", None), ("hand_right_bat_gap_cm", "R hand-bat", None),
                 ("bat_ground_gap_cm", "bat-ground", ok_range(-1, 1)), ("hips_to_base_cm", "hips-base", ok_range(0, 25)), ("bat_in_hand", "bat in hand", None)],
    "jogging": [("planted_slide_cm", "planted foot slides", ok_range(0, 2)), ("lowest_foot_cm", "lowest foot (whole cycle)", ok_range(0, 0.5)),
                ("left_foot_cm", "L foot", None), ("right_foot_cm", "R foot", None), ("play_rate", "anim rate x", None)],
    "walk": [("planted_slide_cm", "planted foot slides", ok_range(0, 2)), ("lowest_foot_cm", "lowest foot (whole cycle)", ok_range(0, 0.5)),
             ("left_foot_cm", "L foot", None), ("right_foot_cm", "R foot", None), ("play_rate", "anim rate x", None)],
    "music": [("headphone_gap_cm", "headphones-hair", ok_range(0, 0.5)), ("headphone_in_hair", "verts inside phones", ok_range(0, 0)), ("feet_cm", "feet-ground", ok_range(-0.5, 1)), ("below_ground_verts", "verts under ground", ok_range(0, 0))],
    "camping": [("knee_cm", "knee-ground", ok_range(-0.5, 1.5)), ("feet_cm", "feet-ground", ok_range(-0.5, 1.5)), ("body_to_fire_cm", "body-fire", ok_range(40, 999)),
                ("below_ground_verts", "verts under ground", ok_range(0, 0))],
}
INDOOR_SHOW = [("seat_gap_cm", "seat (cushion sinks)", ok_range(-1.5, 1.5)), ("feet_floor_cm", "feet-floor", ok_range(-0.6, 3)), ("hand_gap_cm", "hand-object", ok_range(-0.5, 2)),
               ("tool_gap_cm", "tool-object", ok_range(-0.5, 1)), ("body_in_furniture", "verts >1cm in cushion", ok_range(0, 10)), ("stand_in_furniture", "verts in furniture", ok_range(0, 0)),
               ("feet_cm", "feet-ground", ok_range(-0.6, 1))]


def judge_contact(act, k, m, key, v):
    """依活動與格子補判斷（例：運球只有「在手上」那幾格要求手到球 ≤2）"""
    if act == "basketball":
        if key == "hand_ball_gap_cm":
            return (0 <= v <= 2) if m.get("contact") or k in (0, 1, 3) else None
        if key == "ball_floor_gap_cm":
            return (0 <= v <= 1) if k == 2 else None
    if act == "baseball":
        if key == "ball_bat_gap_cm":
            return (0 <= v <= 3) if k == 1 else None
        if key in ("hand_left_bat_gap_cm", "hand_right_bat_gap_cm"):
            return (-1.0 <= v <= 2) if k <= 1 else None
        if key == "bat_in_hand":
            return (v is False) if k == 3 else None
    return "default"


def fmt(v):
    if isinstance(v, bool):
        return "yes" if v else "no"
    if isinstance(v, (int,)) and not isinstance(v, bool):
        return str(v)
    if isinstance(v, float):
        return "%.1f" % v
    return str(v)


def font(sz, bold=False):
    try:
        return ImageFont.truetype(FONTB if bold else FONT, sz)
    except OSError:
        return ImageFont.load_default()


TW, TH = 360, 270   # 每格縮圖


def cell(draw, im, x, y, path, label, lines):
    if path and os.path.exists(path):
        t = Image.open(path).convert("RGB")
        t.thumbnail((TW, TH))
        im.paste(t, (x + (TW - t.width) // 2, y))
    else:
        draw.rectangle([x, y, x + TW, y + TH], outline="#bbb")
        draw.text((x + 10, y + TH // 2), "(no frame)", fill="#999", font=font(16))
    draw.text((x + 4, y + TH + 4), label, fill="#222", font=font(17, True))
    yy = y + TH + 28
    for txt, ok in lines:
        col = "#1a7f37" if ok is True else ("#c92a2a" if ok is False else "#444")
        draw.text((x + 6, yy), txt, fill=col, font=font(16))
        yy += 20


def rows_for(who):
    rows = []
    mt = {}
    for mode in ("outdoor", "indoor"):
        p = os.path.join(ROOT, "test_motion", who, "metrics_%s.json" % mode)
        if os.path.exists(p):
            mt.update(json.load(open(p, encoding="utf-8")))
    for act, name in ACTS:
        frames = mt.get(act, [])
        cells = []
        for k in range(4):
            m = frames[k] if k < len(frames) else {}
            lines = []
            show = SHOW.get(act, INDOOR_SHOW)
            for key, short, rule in show:
                if key not in m:
                    continue
                v = m[key]
                j = judge_contact(act, k, m, key, v)
                if j == "default":
                    j = rule(v) if (rule and not isinstance(v, bool)) else None
                lines.append(("%s: %s%s" % (short, fmt(v), "" if isinstance(v, (bool, int)) and not isinstance(v, float) else " cm" if key.endswith("_cm") else ""), j))
            cells.append((os.path.join(ROOT, "test_motion", who, "%s_%d.png" % (act, k)), m.get("label", ["prepare", "contact", "mid-action", "end"][k]), lines[:7]))
        rows.append(("%s" % name, cells))
    return rows


def sheet(title, rows, out, sub=""):
    LH = 20 * 7 + 34
    RH = TH + LH + 16
    W = 200 + 4 * (TW + 12)
    H = 110 + RH * len(rows)
    im = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(im)
    d.text((20, 18), title, fill="#111", font=font(34, True))
    if sub:
        d.text((20, 62), sub, fill="#555", font=font(18))
    y = 100
    for name, cells in rows:
        d.line([0, y - 6, W, y - 6], fill="#ddd", width=2)
        for li, part in enumerate(name.replace(" the ", "|the ").replace(chr(10), "|").split("|")):
            d.text((14, y + TH // 2 - 30 + li * 28), part, fill="#7b5ea7", font=font(22, True))
        for k, (path, label, lines) in enumerate(cells):
            cell(d, im, 200 + k * (TW + 12), y, path, label, lines)
        y += RH
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out)
    print("saved", out, im.size)


def main():
    what = sys.argv[1] if len(sys.argv) > 1 else "ken"
    if what in ("ken", "shuiling", "zunbo"):
        nice = {"ken": "Ken", "shuiling": "Shuiling", "zunbo": "Zun-Bo"}[what]
        sheet("Motion logic check - %s x 11 activities (prepare / contact / mid / end)" % nice, rows_for(what),
              os.path.join(OUT, "motion-check-%s-%s.png" % (what, V)),
              "Contacts measured on the posed mesh (cm). Green = within limit, red = outside, grey = info only. Limits: hand-ball <=2, wheel-road +-1, foot-pedal <=2, ball-bat <=3 at contact.")
    elif what == "movement":
        mv = json.load(open(os.path.join(ROOT, "test_motion", "movement.json"), encoding="utf-8"))
        rows = []
        for r in mv["rows"]:
            cells = []
            for c in r["cells"]:
                cells.append((os.path.join(ROOT, c["img"]), c["label"], [(t, o) for t, o in c.get("lines", [])]))
            rows.append((r["name"], cells))
        sheet("Movement - logic check (Ken)", rows, os.path.join(OUT, "motion-check-movement-%s.png" % V), mv.get("sub", ""))
    elif what == "beforeafter":
        ba = json.load(open(os.path.join(ROOT, "test_motion", "before_after.json"), encoding="utf-8"))
        W = 1400
        rows = ba["rows"]
        H = 110 + len(rows) * 440
        im = Image.new("RGB", (W, H), "white")
        d = ImageDraw.Draw(im)
        d.text((20, 18), "5 reported problems - before / after (2026-11-10)", fill="#111", font=font(34, True))
        y = 90
        for r in rows:
            d.text((20, y), r["title"], fill="#7b5ea7", font=font(24, True))
            for i, side in enumerate(["before", "after"]):
                p = r[side]
                x = 20 + i * 690
                if p and os.path.exists(p):
                    t = Image.open(p).convert("RGB")
                    t.thumbnail((670, 330))
                    im.paste(t, (x, y + 36))
                txt = ("BEFORE: " if i == 0 else "AFTER: ") + r[side + "_note"]
                words, lines, cur = txt.split(" "), [], ""
                for w in words:
                    if len(cur) + len(w) > 62:
                        lines.append(cur)
                        cur = w
                    else:
                        cur = (cur + " " + w).strip()
                lines.append(cur)
                for li, t in enumerate(lines[:2]):
                    d.text((x, y + 368 + li * 22), t, fill="#c92a2a" if i == 0 else "#1a7f37", font=font(18))
            y += 440
        out = os.path.join(OUT, "motion-fix-before-after-%s.png" % V)
        im.save(out)
        print("saved", out, im.size)


if __name__ == "__main__":
    main()
