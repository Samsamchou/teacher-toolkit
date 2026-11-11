"""[routes] 圳寶媽媽騎機車載圳寶：近看檢查圖（側面、前 3/4、手、腳、安全帽，每格附量到的數字；英文標籤）。

來源：test_route_sheet/scooter_ride/*.png、metrics.json（Godot res://scenes/scooter_bake.tscn 產生）
產出：../資料/freetime/zunbo-scooter-ride-check-v<N>.png
用法：python -I tools/scooter_ride_sheet.py [版本，預設 1]
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ver = sys.argv[1] if len(sys.argv) > 1 else "1"
SRC = os.path.join(HERE, "test_route_sheet", "scooter_ride")
M = json.load(open(os.path.join(SRC, "metrics.json"), encoding="utf-8"))
R = M["ride"]
ME = M["mesh"]
FB = os.path.join(HERE, "assets", "fonts", "ComicRelief-Bold.ttf")
FR = os.path.join(HERE, "assets", "fonts", "ComicRelief-Regular.ttf")
f_title = ImageFont.truetype(FB, 40)
f_head = ImageFont.truetype(FB, 22)
f_txt = ImageFont.truetype(FR, 18)
CW, CH, CAP, COLS = 640, 360, 100, 4
GOOD, BAD, INK, GREY = (43, 138, 62), (201, 42, 42), (40, 32, 52), (105, 100, 118)


def chk(label, key, lo, hi, unit="cm", scale=1.0, fmt="%.2f"):
    v = R.get(key)
    if v is None:
        return (label + " n/a", False)
    v = float(v) * scale
    return ((label + " " + fmt + " " + unit) % v, lo <= v <= hi)


def info(t):
    return (t, None)


FA = M.get("facing", {})
cells = [
    ("ride_front_faces", "Front: both faces (mom in front, Zun-Bo behind)", [(("Zun-Bo faces forward: %.0f deg from the scooter's heading" % FA.get("zunbo_face_angle_from_forward_deg", -1)), FA.get("zunbo_face_dot_forward", 0) > 0.5),
                                                                        info("mom's face %.0f deg (she looks down the road, leaning)" % FA.get("mom_face_angle_from_forward_deg", -1)),
                                                                        info("round discs on Zun-Bo's head sides are his ear caps")]),
    ("close_helmet_front", "Helmet front: face and eyes visible", [(("penetration %d verts of %d covered" % (int(R.get("helmet_penetration_pts", -1)), int(R.get("helmet_head_pts_covered", 0)))), int(R.get("helmet_penetration_pts", -1)) == 0),
                                                                  chk("min head-shell gap", "helmet_min_gap_mm", 3.0, 8.0, "mm", 1.0, "%.1f"),
                                                                  info("orange shell, cream stripe, teal rim + visor, chin strap")]),
    ("close_helmet_side", "Helmet side: rim sits above the ear cap", [info("smooth envelope of the head mesh, then shrunk to 5 mm"), info("other body verts inside: %d" % int(R.get("helmet_other_body_pts_inside", -1)))]),
    ("ride_side_left", "Side (left)", [chk("mom bottom-seat", "mom_seat_gap_cm", -0.5, 1.0), chk("Zun-Bo bottom-seat/rail", "seat_bottom_gap_cm", -0.5, 1.0),
                                       info("Zun-Bo verts inside seat/rail: %d" % int(R.get("zunbo_pts_in_seat_or_rail", -1))),
                                       info("Zun-Bo is %.1f cm behind mom's back" % -float(R.get("passenger_front_minus_rider_back_cm", 0)))]),
    ("ride_side_right", "Side (right)", [chk("front wheel-road", "wheel_front_road_gap_cm", -1.0, 1.0), chk("rear wheel-road", "wheel_rear_road_gap_cm", -1.0, 1.0),
                                         info("wheel radius %.1f cm, wheelbase %.2f m" % (ME["wheel_r_cm"], ME["wheelbase_m"])),
                                         info("scooter scale x%.2f, mom %.2f m tall" % (ME["scale"], ME["mom_h"]))]),
    ("ride_front34", "Front 3/4", [info("handlebar straightened %.1f deg in code" % abs(ME["handlebar_turn_deg"])),
                                   info("mom leans %.0f deg to reach the grips (arm reach %.0f%%)" % (M["mom_pose"]["lean"], 100 * M["mom_pose"]["reach"]))]),
    ("ride_back34", "Back 3/4", [info("Zun-Bo holds: %s / %s" % (R.get("zunbo_hand_left_holds"), R.get("zunbo_hand_right_holds"))),
                                 info("his arms are %.0f cm; mom's waist is %.0f cm away" % (M.get("zunbo_left_arm_len_cm", 0), M.get("zunbo_left_mom_dist_cm", 0)))]),
    ("close_hand_left", "Mom left hand on grip", [chk("hand-grip", "mom_hand_left_grip_gap_cm", -0.05, 2.0), info("hand verts inside grip: %d" % int(R.get("mom_hand_left_in_grip", -1))),
                                                  info("grip radius %.1f cm (measured on mesh)" % ME["grip_r_cm"])]),
    ("close_hand_right", "Mom right hand on grip", [chk("hand-grip", "mom_hand_right_grip_gap_cm", -0.05, 2.0), info("hand verts inside grip: %d" % int(R.get("mom_hand_right_in_grip", -1)))]),
    ("close_feet_left", "Mom left foot on footboard", [chk("sole-footboard", "mom_foot_left_board_gap_cm", -0.3, 1.0)]),
    ("close_feet_right", "Mom right foot on footboard", [chk("sole-footboard", "mom_foot_right_board_gap_cm", -0.3, 1.0)]),
    ("close_helmet_back", "Helmet from behind", [info("covers the back of the head; stripe runs front to back")]),
    ("close_zunbo_hand_left", "Zun-Bo left hand on rear grab rail", [chk("hand-hold", "zunbo_hand_left_hold_gap_cm", -0.05, 2.0), chk("right hand-hold", "zunbo_hand_right_hold_gap_cm", -0.05, 2.0)]),
    ("wheels_0p2m", "Wheels after rolling 0.20 m", [info("turned %.1f deg = 0.20 m / radius" % M.get("wheel_turn_deg_per_0p2m", 0)), chk("slip", "wheel_slip_cm", 0.0, 0.5),
                                                    info("%d wheel triangles cut from the Tripo mesh" % ME["wheel_tris_cut"])]),
    ("checklist_mom_rest_outline03", "Checklist 1: rest pose, game outline (fit_model 0.3)", [info("65 mixamorig bones, A-pose, both hands open"), info("finger verts L 914 / R 893; no built-in animation")]),
    ("scooter_only_side", "Scooter after code fixes", [info("centre stand removed (%d triangles)" % ME["stand_tris_cut"]), info("code-built wheels: dark tyre, silver hub, 5 spokes")]),
    ("scooter_only_top", "Top: handlebar straight", [info("grips L %s" % ME["grip_left"]), info("grips R %s" % ME["grip_right"])]),
    ("wheels_0m", "Wheels at 0 m (compare spokes)", [info("wheel rolls with distance: angle = distance / radius")]),
]
rows = (len(cells) + COLS - 1) // COLS
W = COLS * CW + (COLS + 1) * 14
H = 96 + rows * (CH + CAP + 14) + 36
sheet = Image.new("RGB", (W, H), (250, 247, 240))
dr = ImageDraw.Draw(sheet)
dr.text((18, 14), "Zun-Bo's scooter ride check v%s — mom (Tripo, rigged) + scooter (Tripo) + Zun-Bo with fitted helmet" % ver, font=f_title, fill=INK)
dr.text((20, 62), "All numbers are measured on the posed meshes.  green = within tolerance, red = outside, grey = information", font=f_txt, fill=GREY)
bad = 0
for i, (key, head, ls) in enumerate(cells):
    x = 14 + (i % COLS) * (CW + 14)
    y = 96 + (i // COLS) * (CH + CAP + 14)
    p = os.path.join(SRC, key + ".png")
    if os.path.exists(p):
        sheet.paste(Image.open(p).convert("RGB").resize((CW, CH), Image.LANCZOS), (x, y))
    dr.rectangle([x, y, x + CW, y + CH], outline=INK, width=2)
    dr.text((x + 4, y + CH + 4), head, font=f_head, fill=INK)
    for j, (t, ok) in enumerate(ls[:3]):
        col = GREY if ok is None else (GOOD if ok else BAD)
        if ok is False:
            bad += 1
        dr.text((x + 4, y + CH + 32 + j * 21), t[:70], font=f_txt, fill=col)
dr.text((18, H - 30), "Known limits: mom's arms are short (43 cm) so she leans forward; Zun-Bo's arms (27 cm) cannot reach her waist, so he holds the rear grab rail.   red items: %d" % bad, font=f_txt, fill=INK)
out = os.path.normpath(os.path.join(HERE, "..", "資料", "freetime", "zunbo-scooter-ride-check-v%s.png" % ver))
sheet.save(out)
print("saved", sheet.size, "red", bad)
