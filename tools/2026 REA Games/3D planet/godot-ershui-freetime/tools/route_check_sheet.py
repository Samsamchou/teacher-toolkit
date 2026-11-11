"""[routes] 路線檢查圖：每題演出關鍵畫面 1 格（共 11 格）＋那一格在「姿勢套好的網格」上量到的接觸數字（英文標籤）。

來源：test_route_sheet/<路線>/qNN.png、metrics.json（Godot：ROUTE=<路線> SHEET=1 --test 產生）
產出：../資料/freetime/route-check-<名字>-v<N>.png
用法：python -I tools/route_check_sheet.py ken_b|shuiling|zunbo [版本，預設 1]
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rid = sys.argv[1]
ver = sys.argv[2] if len(sys.argv) > 2 else "1"
NAME = {"ken_a": "kena", "ken_b": "kenb", "shuiling": "shuiling", "zunbo": "zunbo"}[rid]
TITLE = {"ken_a": "Ken A (I / my)", "ken_b": "Ken B (I / my)", "shuiling": "Shuiling (She / her)", "zunbo": "Zun-Bo (He / his)"}[rid]
SRC = os.path.join(HERE, "test_route_sheet", rid)
D = json.load(open(os.path.join(HERE, "data", "freetime_%s.json" % rid), encoding="utf-8"))
M = json.load(open(os.path.join(SRC, "metrics.json"), encoding="utf-8"))
FB = os.path.join(HERE, "assets", "fonts", "ComicRelief-Bold.ttf")
FR = os.path.join(HERE, "assets", "fonts", "ComicRelief-Regular.ttf")
f_title = ImageFont.truetype(FB, 40)
f_head = ImageFont.truetype(FB, 23)
f_txt = ImageFont.truetype(FR, 19)
CW, CH, CAP = 640, 360, 118
COLS = 4
PH = D["phrases"]
GOOD, BAD, INK = (43, 138, 62), (201, 42, 42), (40, 32, 52)


def g(m, k, d=None):
    v = m.get(k, d)
    return v


def lines_for(act, m):
    """回傳 [(文字, 合格?)]；合格？None＝只是資訊"""
    out = []
    def num(k):
        v = m.get(k)
        return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None
    def add(label, k, lo, hi, unit="cm", scale=1.0, fmt="%.1f"):
        v = num(k)
        if v is None:
            return
        v *= scale
        out.append((("%s " + fmt + " %s") % (label, v, unit), lo <= v <= hi))
    if act == "scooter":
        add("front wheel-road", "wheel_front_road_gap_cm", -1.0, 1.0)
        add("rear wheel-road", "wheel_rear_road_gap_cm", -1.0, 1.0)
        add("wheel roll vs distance slip", "wheel_slip_cm", 0.0, 0.5)
        add("Zun-Bo bottom-seat", "seat_bottom_gap_cm", -0.5, 1.0)
        add("helmet-head min gap", "helmet_min_gap_mm", 0.01, 60.0, "mm")
        v = m.get("helmet_penetration_pts")
        if v is not None:
            out.append(("helmet penetration %d verts (of %d covered)" % (int(v), int(m.get("helmet_head_pts_covered", 0))), int(v) == 0))
        for sd in ("left", "right"):
            add("mom %s hand-grip" % sd, "mom_hand_%s_grip_gap_cm" % sd, -0.5, 2.0)
        for sd in ("left", "right"):
            add("mom %s foot-footboard" % sd, "mom_foot_%s_board_gap_cm" % sd, -0.5, 1.0)
        add("mom bottom-seat", "mom_seat_gap_cm", -0.5, 1.0)
        for sd in ("left", "right"):
            add("Zun-Bo %s hand-hold" % sd, "zunbo_hand_%s_hold_gap_cm" % sd, -0.5, 2.0)
    elif act == "jogging":
        add("lowest sole above road", "feet_lowest_cm", -0.5, 12.0)
        add("ground speed", "ground_speed_mps", 0.3, 3.0, "m/s", 1.0, "%.2f")
        if m.get("procedural_gait"):
            out.append(("procedural gait: planted foot pinned to road", None))
    elif act == "bike":
        for sd in ("left", "right"):
            add("%s foot-pedal" % sd, "foot_%s_pedal_gap_cm" % sd, -0.5, 2.0)
        add("bottom-saddle", "seat_gap_cm", -0.5, 2.0)
        add("rear wheel-road", "wheel_rear_gap_cm", -1.0, 1.0)
        add("front wheel-road", "wheel_front_gap_cm", -1.0, 1.0)
        for sd in ("left", "right"):
            add("%s hand-grip" % sd, "hand_%s_grip_gap_cm" % sd, -0.5, 2.0)
    elif act == "basketball":
        add("hand-ball", "hand_ball_gap_cm", -0.5, 2.0)
        add("ball-floor", "ball_floor_gap_cm", -0.5, 200.0)
        if "contact" in m:
            out.append(("ball in palm this frame: %s" % m["contact"], bool(m["contact"])))
        if "body_in_ball" in m:
            out.append(("body verts inside ball: %d" % int(m["body_in_ball"]), int(m["body_in_ball"]) == 0))
    elif act == "baseball":
        add("ball-bat at contact", "ball_bat_gap_cm", -1.0, 2.0)
        for sd in ("left", "right"):
            add("%s hand-bat" % sd, "hand_%s_bat_gap_cm" % sd, -0.5, 2.0)
        for k in ("body_in_bat", "bat_in_head_pts"):
            if k in m:
                out.append(("%s: %d" % (k.replace("_", " "), int(m[k])), int(m[k]) == 0))
    elif act == "camping":
        add("lowest body point-ground", "lowest_cm", -0.5, 2.0)
        add("feet-ground", "feet_cm", -0.5, 2.0)
        add("body-campfire", "body_to_fire_cm", 30.0, 400.0, "cm", 1.0, "%.0f")
        if "below_ground_verts" in m:
            out.append(("verts below ground: %d" % int(m["below_ground_verts"]), int(m["below_ground_verts"]) == 0))
    elif act == "music" and "feet_cm" in m:
        add("feet-ground", "feet_cm", -0.5, 2.0)
        add("ear pad-head (>= 3 mm)", "ear_pad_gap_cm", 2.95, 10.0, "mm", 10.0)
        if "ear_pad_in_head" in m:
            out.append(("head verts inside ear pads: %d" % int(m["ear_pad_in_head"]), int(m["ear_pad_in_head"]) == 0))
    if not out:   # 室內（烤好的已驗收姿勢）：列出量測欄位
        skip = {"hud_safe", "act", "label", "source", "skirt_settled", "hud_note"}
        for k, v in m.items():
            if k in skip or isinstance(v, str):
                continue
            if isinstance(v, bool):
                out.append(("%s: %s" % (k.replace("_", " "), v), None))
            elif isinstance(v, (int, float)):
                unit = "cm" if k.endswith("_cm") else ("mm" if k.endswith("_mm") else "")
                nm = k[:-3] if unit else k
                out.append(("%s %.1f %s" % (nm.replace("_", " "), float(v), unit), None))
        if m.get("skirt_settled"):
            out.append(("skirt settled on the seat (Pose.settle_skirt)", None))
    if "hud_safe" in m:
        out.append(("key objects clear of HUD: %s" % m["hud_safe"], bool(m["hud_safe"])))
    return out


cells = []
for it in D["items"]:
    key = it["id"]
    cells.append((key, "Q%d  %s" % (it["n"], it["options"][it["answer"]]), it["act"], it))
extra = sorted(k for k in M if k.startswith("scooter_"))
for k in extra[:1]:
    cells.append((k, "Scooter trip (%s): mom rides, Zun-Bo behind with helmet" % k.replace("scooter_", "").upper(), "scooter", None))
rows = (len(cells) + COLS - 1) // COLS
W = COLS * CW + (COLS + 1) * 14
H = 96 + rows * (CH + CAP + 14) + 40
sheet = Image.new("RGB", (W, H), (250, 247, 240))
dr = ImageDraw.Draw(sheet)
dr.text((18, 14), "Route check v%s — %s — one act-out key frame per question" % (ver, TITLE), font=f_title, fill=INK)
dr.text((20, 62), "Numbers are measured on the posed mesh in the same frame as the picture.  green = within tolerance, red = outside, grey = information", font=f_txt, fill=(90, 80, 100))
bad_total = 0
for i, (key, head, act, it) in enumerate(cells):
    x = 14 + (i % COLS) * (CW + 14)
    y = 96 + (i // COLS) * (CH + CAP + 14)
    p = os.path.join(SRC, key + ".png")
    if os.path.exists(p):
        sheet.paste(Image.open(p).convert("RGB").resize((CW, CH), Image.LANCZOS), (x, y))
    else:
        dr.rectangle([x, y, x + CW, y + CH], fill=(220, 220, 225))
        dr.text((x + 20, y + 160), "missing frame " + key, font=f_head, fill=BAD)
        bad_total += 1
    dr.rectangle([x, y, x + CW, y + CH], outline=INK, width=2)
    dr.text((x + 4, y + CH + 4), head[:58], font=f_head, fill=INK)
    ls = lines_for(act, M.get(key, {}))
    # 兩欄排
    col_w = CW // 2
    for j, (t, ok) in enumerate(ls[:8]):
        cx = x + 4 + (j % 2) * col_w
        cy = y + CH + 32 + (j // 2) * 21
        col = (110, 105, 120) if ok is None else (GOOD if ok else BAD)
        if ok is False:
            bad_total += 1
        dr.text((cx, cy), t[:38], font=f_txt, fill=col)
dr.text((18, H - 34), "Travel: Ken walks / jogs / rides his bike; Shuiling and Zun-Bo use the mascot procedural gait and kids' bike (mascot_motion.gd); Zun-Bo's mom drives him by scooter.   red items: %d" % bad_total, font=f_txt, fill=INK)
out = os.path.normpath(os.path.join(HERE, "..", "資料", "freetime", "route-check-%s-v%s.png" % (NAME, ver)))
sheet.save(out)
print("saved", out.encode("ascii", "replace").decode(), sheet.size, "red", bad_total)
