# Builds tabletop/src/kenya_dinner.py (he/she Kenya: "She has dinner at seven thirty.") from the accepted I-version kenya_morning.py:
# same room, bed, window table, cup sip and hand-held bite; changed: evening (lamp on), clock 7:30, kenya_girl_home (teal outfit,
# make_recolor.py), the mandazi becomes a white ugali piece, an ugali mound + sukuma wiki on her plate, two more plates and cups for
# the family, a flour bag on the table, no traveller. New camera KE4UG: close-up of the ugali and the flour bag.
#   python tabletop/src/kenya_dinner_build.py
from pathlib import Path

HERE = Path(__file__).resolve().parent
s = (HERE / "kenya_morning.py").read_text(encoding="utf-8")


def rep(a, b, n=1):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, n)


head_end = s.index("import sys, os, math")
s = '''# World Routines Trip, he/she version - Kenya station "She has dinner at seven thirty." (tabletop style H), built by
# kenya_dinner_build.py from the accepted I-version kenya_morning.py (read its header for the hand rules).
#   KE1 (7.4 s) evening, lamp on: Amani sits on her bed and points at the 7:30 clock with her LEFT hand.
#       "This is Amani. What time does she have dinner?" / "She has dinner at seven thirty."
#   KE4 (9.0 s) the window table set for the family (three plates, three cups): a sip of tea, then one piece of ugali to the mouth.
#       "Her family eats dinner together." (0.3) / "She eats ugali and sukuma wiki." (on the bite)
#   KE4UG camera: close-up of her plate (ugali mound + sukuma wiki) and the flour bag. "Ugali is made from white corn flour."
# No traveller (anchor and reporter are voices only).
''' + s[head_end:]
rep('DUR = {"KE1": 5.6, "KE2": 3.8, "KE3": 3.0, "KE4": 9.0}', 'DUR = {"KE1": 7.4, "KE2": 3.8, "KE3": 3.0, "KE4": 9.0}')
rep('VOICE = {"q": 0.5, "a": 2.6,', 'VOICE = {"q": 0.4, "a": 4.4,')
rep('crust = E.felt("mandaziCrust", (0.62, 0.27, 0.05))', 'crust = E.felt("ugaliPiece", (0.96, 0.94, 0.86))      # he/she: a piece of ugali')
rep('ch = E.Char("kenya_girl_pyjamas", (0.30, -0.15), 0, height=PUPIL)', 'ch = E.Char("kenya_girl_home", (0.30, -0.15), 0, height=PUPIL)')
rep('clock(CLOCK[0], CLOCK[1], CLOCK[2], 5, 40)', 'clock(CLOCK[0], CLOCK[1], CLOCK[2], 7, 30)')
rep('    lights_state(-1, False); finish_lights()\n    hy = BED_FRONT', '    lights_state(-1, True); finish_lights()      # he/she: evening, the lamp is on\n    hy = BED_FRONT')
rep('    if CAMSUB == "main":\n        trav = stand("traveler_girl", GL, GF, girl, height=GIRL)', '    if False:                                    # he/she: no traveller\n        trav = stand("traveler_girl", GL, GF, girl, height=GIRL)')
rep('            arms, head = {}, (0, -14, 0)            # listening: head turned to the traveller (on her right, -x)',
    '            arms, head = {}, (0, 0, -4)              # he/she: no traveller')
rep('        hstr.default_value = 0.5 + 1.8 * fr / max(1, E.f(T));', '        hstr.default_value = 0.0;')
# the family's places, the ugali mound and greens on her plate, the flour bag (after the cup is made)
rep('cup = make_cup()\n', '''cup = make_cup()
plate_m = E.mat("famPlate", (0.95, 0.95, 0.92), 0.35); ugali_m = E.felt("ugali", (0.97, 0.95, 0.88)); sukuma_m = E.felt("sukuma", (0.18, 0.45, 0.15))
# teacher 11/23: the orange mandazi (breakfast, part of the Tripo table mesh) showed beside the ugali, and the greens were one dot.
# The Tripo plate and its mandazi pile are CUT OUT of the table mesh; a flat enamel plate, the ugali mound and a heap of
# sukuma wiki take their place. (A dish tall enough to cover the pile looked like a cake tin and hid her body.)
import bmesh
def cut_plate(root, cx, cy, r, zmin):
    n = 0
    for ob in [root] + list(root.children_recursive):
        if ob.type != "MESH": continue
        bpy.context.view_layer.update(); Mw = ob.matrix_world.copy()
        bm = bmesh.new(); bm.from_mesh(ob.data)
        dead = [v for v in bm.verts if ((Mw @ v.co).x - cx) ** 2 + ((Mw @ v.co).y - cy) ** 2 < r * r and (Mw @ v.co).z > zmin]
        n += len(dead); bmesh.ops.delete(bm, geom=dead, context="VERTS"); bm.to_mesh(ob.data); bm.free(); ob.data.update()
    return n
print("DESK CUTPLATE removed %d vertices of the Tripo plate + mandazi" % cut_plate(table_root, PLC[0], PLC[1], PL_R + 0.0034, CUP_Z + 0.0006), flush=True)
DISH_H = 0.0016
E.cyl((PLC[0], PLC[1], CUP_Z + 0.0003), PL_R + 0.0044, 0.0018, E.mat("dishEnamel", (0.95, 0.95, 0.92), 0.30), verts=48, name="dinnerPlate")
E.cyl((PLC[0], PLC[1], CUP_Z + 0.0012), PL_R + 0.0046, 0.0004, E.mat("dishRim", (0.10, 0.20, 0.55), 0.35), verts=48, name="dinnerPlateRim")
E.cyl((PLC[0], PLC[1], CUP_Z + 0.0014), PL_R + 0.0036, 0.0004, E.mat("dishEnamel", (0.95, 0.95, 0.92), 0.30), verts=48, name="dinnerPlateBed")
E.ball((PLC[0] - 0.0040, PLC[1] + 0.0025, CUP_Z + DISH_H), 0.0068, ugali_m, "ugaliMound").scale = (1, 1, 0.55)
sukuma_d = E.felt("sukumaDark", (0.08, 0.30, 0.10))
for k in range(46):                                   # a heap of chopped greens beside the ugali (deterministic scatter)
    a_ = k * 2.399963; r_ = 0.0042 * math.sqrt((k + 0.5) / 46.0)
    lf = E.ball((PLC[0] + 0.0058 + r_ * math.cos(a_), PLC[1] - 0.0042 + r_ * math.sin(a_), CUP_Z + DISH_H + 0.0009 + 0.0016 * (1 - r_ / 0.0042) + 0.0003 * (k % 3)),
                0.0013, sukuma_m if k % 3 else sukuma_d, "sukuma")
    lf.scale = (1.5, 0.8, 0.35); lf.rotation_euler = (0.3 * math.sin(k), 0.3 * math.cos(k * 1.7), a_)
for k, dx in enumerate((-0.030, 0.030)):          # two more places for the family
    E.cyl((PLC[0] + dx, PLC[1] + 0.006, CUP_Z + 0.0004), 0.0050, 0.0008, plate_m, verts=32, name="famPlate%d" % k)
    E.ball((PLC[0] + dx, PLC[1] + 0.006, CUP_Z + 0.0018), 0.0028, ugali_m, "famUgali%d" % k).scale = (1, 1, 0.6)
    E.cyl((PLC[0] + dx + 0.008, PLC[1] + 0.002, CUP_Z + 0.0020), 0.0024, 0.0040, E.mat("enamelF", (0.90, 0.90, 0.87), 0.25), verts=24, name="famCup%d" % k)
FLOUR = (PLC[0] + 0.016, PLC[1] + 0.012, CUP_Z)
E.box((FLOUR[0], FLOUR[1], FLOUR[2] + 0.0050), (0.0060, 0.0040, 0.0100), E.felt("flourBag", (0.92, 0.90, 0.80)), "flourBag", bevel=0.0008)
E.box((FLOUR[0], FLOUR[1] - 0.0021, FLOUR[2] + 0.0055), (0.0040, 0.0003, 0.0035), E.felt("flourLabel", (0.95, 0.75, 0.15)), "flourLabel", bevel=0)
E.ball((FLOUR[0], FLOUR[1] - 0.0024, FLOUR[2] + 0.0055), 0.0009, E.felt("cornIcon", (0.98, 0.85, 0.20)), "cornIcon").scale = (0.6, 0.3, 1.2)
''')
rep('''    if CAMSUB in HANDCAM:
        aim, off, lens = HANDCAM[CAMSUB]''', '''    HANDCAM["UG"] = (Vector((PLC[0] + 0.006, PLC[1] + 0.004, CUP_Z + 0.0030)), Vector((0.02, -0.11, 0.065)), 105)   # he/she: ugali + flour bag
    if CAMSUB in HANDCAM:
        aim, off, lens = HANDCAM[CAMSUB]''')
rep("aim0 = Vector((-0.005, 0.12, FLOOR + 0.062))", "aim0 = Vector((0.026, 0.12, FLOOR + 0.066))")      # he/she 11/23: closer, girl left - clock right
rep("cam_move(42, aim0 + Vector((-0.015, -0.53, 0.07))", "cam_move(56, aim0 + Vector((-0.015, -0.53, 0.07))")
(HERE / "kenya_dinner.py").write_text(s, encoding="utf-8", newline="\n")
s.encode("ascii")
print("wrote kenya_dinner.py")
