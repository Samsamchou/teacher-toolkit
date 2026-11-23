# Shared text inserted by the he/she build scripts: a natural "point at the clock behind me" pose (teacher 11/23).
# The old pose aimed upper arm AND forearm straight at a clock behind/above the child and left the hand at its rest roll,
# so the wrist looked twisted backwards. Now: the upper arm goes out to the side (only a little backwards), the elbow
# bends, the forearm aims at the clock, and the hand is turned PALM UP with the index finger pointing at the clock.
SNIP = '''

def point_arm(d, right):
    """Elbow bent: upper arm out to the side (a little below the shoulder line), forearm raised, leaning towards the target."""
    d = Vector(d).normalized(); side = "Right" if right else "Left"; sg = -1 if right else 1
    up = Vector((sg * 0.95, 0.05, -0.30)).normalized()
    fo = (d * 0.55 + Vector((0, 0, 0.80))).normalized()
    return {side + "Arm": tuple(up), side + "ForeArm": tuple(fo)}


def point_hand(ch, side, target):
    """Hand palm up, wrist tipped back, index finger towards the world point target."""
    wr = wpt(ch, side + "Hand"); f = (Vector(target) - wr).normalized()
    f.y *= 0.30; f.normalize(); f.z = max(f.z, 0.72); f.normalize()   # finger UP, leaning a little to the clock; not into the screen (reads as a fist)
    set_hand_rot(ch, side, hand_q(ch, side, f, Vector((0, 0.25, 1))))
    ch.pb[side + "Hand"].location = (0, 0, 0); ch.pb[side + "Hand"].scale = (1, 1, 1)      # set_hand_rot writes pb.matrix: an unkeyed location = a long skin spike


_TUCK = {}
def tuck_thumb(ch, side):
    """Fold the thumb onto the curled middle finger (a pointing hand, not an 'L' or a 'V'): small search once, then reused."""
    b1, b3 = side + "HandThumb1", side + "HandThumb3"
    if b1 not in ch.pb or b3 not in ch.pb: return
    def pose(opp, abd, bends):
        for k in (1, 2, 3):
            if "%sHandThumb%d" % (side, k) in ch.pb: ch.pb["%sHandThumb%d" % (side, k)].rotation_quaternion = (1, 0, 0, 0)
        if opp: rot_bone(ch, b1, hand_frame(ch, side)[1], math.radians(opp))
        if abd: rot_bone(ch, b1, hand_frame(ch, side)[3], math.radians(abd))
        curl_hinge(ch, side, {"Thumb": bends}, fingers=("Thumb",))
    key = (ch.name, side)
    if key not in _TUCK:
        tgt = (wpt(ch, side + "HandMiddle2") + wpt(ch, side + "HandIndex2")) / 2
        best = None
        for opp in range(-100, 101, 20):
            for abd in range(-60, 61, 20):
                for bends in ((0, 0, 0), (30, 40, 0), (30, 40, 40), (45, 60, 60)):
                    pose(opp, abd, bends); dd = (wpt(ch, b3, True) - tgt).length
                    if best is None or dd < best[0]: best = (dd, opp, abd, bends)
        _TUCK[key] = best
        print("DESK TUCK %s %s opp %d abd %d bends %s dist %.4f" % (ch.name, side, best[1], best[2], best[3], best[0]), flush=True)
    pose(*_TUCK[key][1:])
    for k in (1, 2, 3):
        pbk = ch.pb.get("%sHandThumb%d" % (side, k))
        if pbk: pbk.location = (0, 0, 0); pbk.scale = (1, 1, 1)


_fin0p = E.Char.finish
def _finp(self):            # rot_bone / set_hand_rot write pb.matrix: clear the unkeyed location and scale (long skin spikes)
    for b_ in self.pb.values(): b_.location = (0, 0, 0); b_.scale = (1, 1, 1)
    return _fin0p(self)
E.Char.finish = _finp


def rest_hand(ch, side):
    """Back to the model's rest hand (before the point starts), so no pointing key leaks into earlier frames."""
    for b in [side + "Hand"] + ["%sHand%s%d" % (side, fg, k) for fg in ("Thumb", "Index", "Middle", "Ring", "Pinky") for k in (1, 2, 3, 4)]:
        if b in ch.pb: ch.pb[b].rotation_quaternion = (1, 0, 0, 0)

'''
