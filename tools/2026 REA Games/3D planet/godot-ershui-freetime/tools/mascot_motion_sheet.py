"""[mascot] 水鈴、圳寶的動作合邏輯檢查圖（2026-11-10）。
沿用 tools/motion_sheet.py 的排版與判斷標準，只是讀 test_motion_mascots/<who>/（mascot_motion_check.gd 拍的）。
用法（在 godot-ershui-freetime 資料夾）：
  python -I tools/mascot_motion_sheet.py shuiling|zunbo [--draft]
  → ../資料/freetime/motion-check-<who>-v1.png（--draft 只輸出到 test_motion_mascots/<who>/sheet_draft.png）
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import motion_sheet as ms  # noqa: E402

ROOT = ms.ROOT
SRC = os.path.join(ROOT, "test_motion_mascots")

# 吉祥物專屬：籃球格子多印「球半徑」、腳踏車多印「手進握把頂點數」；其他沿用 motion_sheet.SHOW
EXTRA = {
    "baseball": [("body_in_bat", "body verts in bat", lambda v: v == 0), ("bat_in_head_pts", "bat pts in head", lambda v: v == 0)],
    "music": [("ear_pad_in_head", "verts in ear cups", lambda v: v == 0)],
    "camping": [("butt_cm", "bottom-ground", lambda v: -0.5 <= v <= 2), ("boot_sole_cm", "boot-ground", lambda v: -0.5 <= v <= 1)],
}


def rows_for(who):
    rows = []
    mt = {}
    for mode in ("outdoor", "indoor"):
        p = os.path.join(SRC, who, "metrics_%s.json" % mode)
        if os.path.exists(p):
            mt.update(json.load(open(p, encoding="utf-8")))
    for act, name in ms.ACTS:
        frames = mt.get(act, [])
        cells = []
        for k in range(4):
            m = frames[k] if k < len(frames) else {}
            lines = []
            show = [x for x in ms.SHOW.get(act, ms.INDOOR_SHOW) if not (act == 'baseball' and x[0] == 'bat_in_hand' )] + EXTRA.get(act, [])
            for key, short, rule in show:
                if key not in m:
                    continue
                v = m[key]
                j = ms.judge_contact(act, k, m, key, v)
                if j == "default":
                    j = rule(v) if (rule and not isinstance(v, bool)) else None
                if key == "feet_floor_cm":
                    j = -0.5 <= v <= 2.0   # 老師：坐著腳放在腳踏／地板上 0–2 cm
                unit = " cm" if key.endswith("_cm") else ""
                lines.append(("%s: %s%s" % (short, ms.fmt(v), unit), j))
            if "cycle" in m and k == 0:
                lines.insert(0, (str(m["cycle"]), bool(m.get("cycle_ok", True))))
            if "hud_safe" in m:
                lines.insert(0, ("HUD-safe: %s" % ("yes" if m["hud_safe"] else "NO " + str(m.get("hud_note", ""))[:28]), bool(m["hud_safe"])))
            cells.append((os.path.join(SRC, who, "%s_%d.png" % (act, k)), m.get("label", ["prepare", "contact", "mid-action", "end"][k]), lines[:10]))
        rows.append((name, cells))
    return rows


# 每格可放 9 行數字（v2 多了 HUD 一行）
def sheet9(title, rows, out, sub=""):
    LH = 20 * 10 + 34
    RH = ms.TH + LH + 16
    W = 200 + 4 * (ms.TW + 12)
    H = 110 + RH * len(rows)
    im = ms.Image.new("RGB", (W, H), "white")
    d = ms.ImageDraw.Draw(im)
    d.text((20, 18), title, fill="#111", font=ms.font(34, True))
    if sub:
        d.text((20, 62), sub, fill="#555", font=ms.font(18))
    y = 100
    for name, cells in rows:
        d.line([0, y - 6, W, y - 6], fill="#ddd", width=2)
        for li, part in enumerate(name.replace(" the ", "|the ").replace(chr(10), "|").split("|")):
            d.text((14, y + ms.TH // 2 - 30 + li * 28), part, fill="#7b5ea7", font=ms.font(22, True))
        for k, (path, label, lines) in enumerate(cells):
            ms.cell(d, im, 200 + k * (ms.TW + 12), y, path, label, lines)
        y += RH
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out)
    print("saved", out, im.size)


def main():
    who = sys.argv[1] if len(sys.argv) > 1 else "shuiling"
    draft = "--draft" in sys.argv
    nice = {"shuiling": "Shuiling", "zunbo": "Zun-Bo"}[who]
    ver = "v3" if "--v3" in sys.argv else ("v2" if "--v2" in sys.argv else "v1")
    out = os.path.join(SRC, who, "sheet_draft.png") if draft else os.path.join(ms.OUT, "motion-check-%s-%s.png" % (who, ver))
    sheet9("Motion logic check - %s x 11 activities (prepare / contact / mid / end)" % nice, rows_for(who), out,
             ("v3: pelvis rocks with the crank; whole-cycle (24 steps) and whole-swing worst cases in the first frame. " if "--v3" in sys.argv else ("v2: procedural run, procedural two-hand bat path, Zun-Bo sits by the fire, feet measured to the footrest. " if "--v2" in sys.argv else "")) + "Mascot-size props. Contacts measured on the posed mesh (cm). Green = within limit, red = outside, grey = info. "
             "Limits: hand-ball <=2, wheel-road +-1, foot-pedal <=2, ball-bat <=3 at contact.")


if __name__ == "__main__":
    main()
