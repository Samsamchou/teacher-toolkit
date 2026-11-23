# Patches a generated he/she scene file so "pointing at the clock" uses the natural pose of point_snip.py
# (teacher 11/23: elbow bent, palm up, index finger up towards the clock). Idempotent. Called at the end of each build script:
#   python apply_point.py usa_lunch india_cricket ...
import re, sys
from pathlib import Path
from point_snip import SNIP

HERE = Path(__file__).resolve().parent
LEARN = '''    if (ch.name, side) not in HL:
        w_, f_, a_, p_ = hand_frame(ch, side)
        HL[(ch.name, side)] = (to_local(ch, side, f_, point=False).normalized(), to_local(ch, side, p_, point=False).normalized())
'''


def patch(path):
    s = Path(path).read_text(encoding="utf-8")
    if "def point_hand" in s: print("already patched", Path(path).name); return
    snip = SNIP.replace('    wr = wpt(ch, side + "Hand")', LEARN + '    wr = wpt(ch, side + "Hand")', 1)
    assert "\ndef hand_M(" in s, "no hand_M in " + str(path)
    s = s.replace("\ndef hand_M(", snip + "\ndef hand_M(", 1)
    # arms: {b: v for ... E.P_point(X, right=False).items() if b.startswith("Left")} -> point_arm(X, False)
    s, n1 = re.subn(r'\{b: v for b, v in E\.P_point\((.*?), right=False\)\.items\(\) if b\.startswith\("Left"\)\}', r'point_arm(\1, False)', s)
    # Spain: both arms from P_point, the pointing side replaced
    s, n1b = re.subn(r'arms, head = E\.P_point\((\(pt\.x, pt\.y, pt\.z \+ 0\.06 \* k\)), right=use_right\), ',
                     r'arms, head = dict(E.P_point(\1, right=use_right), **point_arm(\1, use_right)), ', s)
    # hand: rest it, key it before the point starts, then palm-up point + the finger curls
    s, n2 = re.subn(r'\n( +)if t >= ans0 - 0\.15:\n( +)curl_hinge\(ch, "Left", G_POINT',
                    r'\n\1rest_hand(ch, "Left")\n\1if t < ans0 - 0.15: key_hand(ch, "Left", fr)\n\1if t >= ans0 - 0.15:\n\2point_hand(ch, "Left", CLOCK); curl_hinge(ch, "Left", G_POINT', s)
    s, n3 = re.subn(r'\n( +)if t >= ans0 - 0\.15: curl_hinge\(ch, "Left", G_POINT',
                    r'\n\1rest_hand(ch, "Left")\n\1if t < ans0 - 0.15: key_hand(ch, "Left", fr)\n\1if t >= ans0 - 0.15: point_hand(ch, "Left", CLOCK); curl_hinge(ch, "Left", G_POINT', s)
    s, n4 = re.subn(r'\n( +)if t >= ans0 - 0\.15:\n( +)curl\(ch, side, G_POINT\)',
                    r'\n\1rest_hand(ch, side)\n\1if t < ans0 - 0.15: key_hand(ch, side, fr)\n\1if t >= ans0 - 0.15:\n\2point_hand(ch, side, CLOCK); curl(ch, side, G_POINT)', s)
    # any other curl_hinge(ch, "Left", G_POINT (the thumb calibration pose before the frame loop)
    s, n5 = re.subn(r'(?<!CLOCK\); )curl_hinge\(ch, "Left", G_POINT', r'point_hand(ch, "Left", CLOCK); curl_hinge(ch, "Left", G_POINT', s)
    if "thumb_pose(" not in s:         # no fitted thumb in this scene: fold it with the shared search
        s = re.sub(r'(point_hand\(ch, (?:"Left"|side), CLOCK\); curl(?:_hinge)?\(ch, (?:"Left"|side), G_POINT[^\n;]*\))',
                   lambda m: m.group(1) + "; tuck_thumb(ch, %s)" % ("side" if "(ch, side," in m.group(1) else '"Left"'), s)
    s.encode("ascii")
    Path(path).write_text(s, encoding="utf-8", newline="\n")
    print("patched %s: arms %d+%d, hand %d/%d/%d, calibration %d" % (Path(path).name, n1, n1b, n2, n3, n4, n5))
    assert n1 + n1b >= 1 and n2 + n3 + n4 >= 1, "pointing code not found"


if __name__ == "__main__":
    for n in sys.argv[1:]: patch(HERE / (n + ".py"))
