# Builds tabletop/src/spain_lunch.py (he/she Spain: "She has lunch at two o'clock.") from the accepted I-version spain_dinner.py:
# same girl, mum, table, chairs, fork bite and hands; changed: daytime, clock 2:00, the tortilla becomes grilled fish, soup bowls and a
# fruit bowl instead of the dinner-set model, no traveller, SP4 is resting after lunch (no wave).   python tabletop/src/spain_lunch_build.py
from pathlib import Path

HERE = Path(__file__).resolve().parent
s = (HERE / "spain_dinner.py").read_text(encoding="utf-8")


def rep(a, b, n=1):
    global s
    assert s.count(a) >= n and a in s, a[:70]
    s = s.replace(a, b, n)


head_end = s.index("import sys, os, math")
s = '''# World Routines Trip, he/she version - Spain station "She has lunch at two o'clock." (tabletop style H), built by spain_lunch_build.py
# from the accepted I-version spain_dinner.py (read its header for the hand and chair rules).
#   SP1 (7.4 s) daytime dining room: Lucia stands behind the table and points at the 2:00 clock with her LEFT hand; mum sits at the end.
#       "This is Lucia. What time does she have lunch?" / "She has lunch at two o'clock."
#   SP2 (7.2 s) seated: fork, one bite of grilled fish (her RIGHT hand), mum nods on "with her family"; soup bowls and a fruit bowl
#       on the table. "Lunch is her big meal. She eats soup, fish and fruit with her family."
#   SP4 (4.0 s) after lunch she rests: sits back, hands down, head tilted, a slow breath. "Then she rests for a while."
# No traveller in the he/she films (anchor and reporter are voices only).
''' + s[head_end:]
rep('DUR = {"SP1": 5.6, "SP2": 5.0, "SP3": 3.0, "SP4": 7.6}', 'DUR = {"SP1": 7.4, "SP2": 7.2, "SP3": 3.0, "SP4": 4.0}')
rep('VOICE = {"q": 0.4, "a": 2.6, "eat": 0.5, "late": 0.5}', 'VOICE = {"q": 0.4, "a": 4.4, "eat": 0.4, "rest": 0.3}')
rep('FAMILY0, FAMILY1 = VOICE["eat"] + 2.38, VOICE["eat"] + 3.43', 'FAMILY0, FAMILY1 = VOICE["eat"] + FAM_AT[0], VOICE["eat"] + FAM_AT[1]')
rep('CAMSUB = SHOT[3:] or "main"', 'CAMSUB = SHOT[3:] or "main"', 1)
s = s.replace('FAMILY0, FAMILY1 = VOICE["eat"] + FAM_AT[0]', 'FAM_AT = (5.41, 6.51)      # "with her family" inside the eat line (audio/hs_spain_words.json)\nFAMILY0, FAMILY1 = VOICE["eat"] + FAM_AT[0]', 1)
# daytime outside
rep('E.emission("nightSky", (0.05, 0.08, 0.22), 1.0)', 'E.emission("daySky", (0.55, 0.78, 1.0), 1.6)')
rep('    for i in range(14):\n        E.ball((win_x - 0.3', '    for i in range(0):\n        E.ball((win_x - 0.3')
rep('moon.data.energy = env("MOON", "1.2"); moon.data.color = (0.62, 0.72, 1.0)', 'moon.data.energy = 3.0; moon.data.color = (1.0, 0.95, 0.85)      # afternoon sun through the window')
rep('clock(CLOCK[0], CLOCK[1], CLOCK[2], 9, 15)', 'clock(CLOCK[0], CLOCK[1], CLOCK[2], 2, 0)')
# the food: grilled fish instead of tortilla; soup bowls and a fruit bowl instead of the dinner-set model
rep('egg = E.felt("tortilla", (0.98, 0.76, 0.30)); crust = E.felt("tortillaCrust", (0.80, 0.50, 0.16))',
    'egg = E.felt("fish", (0.97, 0.90, 0.82)); crust = E.felt("fishSkin", (0.62, 0.48, 0.36))')
rep('if os.path.exists(f"{PROPS}/spain_dinner_set.glb"):\n    tray_root = E.place',
    'if False:\n    tray_root = E.place')
rep('WIN_X = x_c - 0.050\n', '''WIN_X = x_c - 0.050
# soup: two small bowls (hers left of her plate area, mum's in front of her place); fruit bowl in the middle
soup_m = E.felt("soup", (0.90, 0.55, 0.20)); bowl_m = E.mat("bowl", (0.96, 0.95, 0.90), 0.35)
for k, (bx, by) in enumerate(((TRAY_AT[0] - 0.006, TRAY_AT[1]), (TRAY_AT[0] + 0.009, TRAY_AT[1] + 0.002))):
    E.cyl((bx, by, TOP + 0.0018), 0.0034, 0.0034, bowl_m, verts=24, name="soupBowl%d" % k)
    E.cyl((bx, by, TOP + 0.0034), 0.0029, 0.0004, soup_m, verts=24, name="soupTop%d" % k)
fx, fy = TRAY_AT[0] + 0.001, TRAY_AT[1] - 0.007
E.cyl((fx, fy, TOP + 0.0012), 0.0045, 0.0022, E.felt("fruitBowl", (0.30, 0.55, 0.80)), verts=24, name="fruitBowl")
for k, (dx, dy, c) in enumerate(((-0.0015, 0.0, (1.0, 0.55, 0.05)), (0.0016, 0.0006, (1.0, 0.55, 0.05)), (0.0, -0.0016, (0.55, 0.15, 0.45)), (0.0004, 0.0014, (0.85, 0.85, 0.15)))):
    E.ball((fx + dx, fy + dy, TOP + 0.0034), 0.0014, E.felt("fruit%d" % k, c), "fruit")
''')
# no traveller
rep('    stand("traveler_girl", GL, GF, girl, height=GIRL)\n', '    pass                                                   # he/she: no traveller in the picture\n')
rep('            arms, head = E.P_stand(), (0, -14, 0)            # listening: head turned to the traveller (on her right, -x)',
    '            arms, head = E.P_stand(), (0, 0, -4)              # he/she: no traveller; she looks at the table')
rep('    if CAMSUB == "main" and SHOT == "SP4":\n        GLT', '    if False:\n        GLT')
# SP4: resting, no wave
rep('        HEAD_W = (0, -10, -2)        # face to the camera, eyes and head a little to the traveller (her right)',
    '        HEAD_W = (8, 0, 6)           # he/she SP4: resting after lunch, head tilted, a little back')
rep('            if t < W0: rdirs = r_ik', '            if True: rdirs = r_ik      # he/she: no wave, both hands resting')
rep('            if t < W0 + 0.15:\n                turn_hand(ch, "Right", R_OFF[0], fr)', '            if True:\n                turn_hand(ch, "Right", R_OFF[0], fr)')
(HERE / "spain_lunch.py").write_text(s, encoding="utf-8", newline="\n")
print("wrote spain_lunch.py")
