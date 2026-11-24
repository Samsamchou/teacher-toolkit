"""Pure-Python helpers for walking / running animals (no bpy, so they can be tested on this computer).
Used by animals.py inside Blender (Colab only).

- Path: a smooth path through control points (Catmull-Rom), sampled and re-parameterised by arc length, so
  "distance travelled" maps to a position and a heading.
- ground_speed(): how fast a looping walk/run cycle moves the body over the ground, measured from the feet:
  while a foot is planted it slides backwards (relative to the body) at exactly the ground speed.
- playback_scale(): how much to speed up / slow down the cycle so its feet match the speed the body travels
  (no foot sliding), clamped so the motion never looks silly.
- herd(): offsets and phase shifts for N animals walking together (never in lock-step, never overlapping).
ASCII only: colab exec reads files with cp950 on Windows."""
import math, random


def _catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return tuple(0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2
                        + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3) for i in range(len(p1)))


class Path:
    """Smooth 2D/3D path through control points; at(d) -> (point, unit heading) at arc length d."""

    def __init__(self, pts, samples_per_seg=40, closed=False):
        pts = [tuple(float(v) for v in p) for p in pts]
        assert len(pts) >= 2, 'a path needs at least two points'
        self.closed = closed
        ext = ([pts[-1]] + pts + pts[:2]) if closed else ([pts[0]] + pts + [pts[-1]])
        segs = len(pts) if closed else len(pts) - 1
        self.pts = []
        for s in range(segs):
            p0, p1, p2, p3 = ext[s], ext[s + 1], ext[s + 2], ext[s + 3]
            for k in range(samples_per_seg):
                self.pts.append(_catmull(p0, p1, p2, p3, k / samples_per_seg))
        self.pts.append(pts[0] if closed else pts[-1])
        self.cum = [0.0]
        for a, b in zip(self.pts, self.pts[1:]):
            self.cum.append(self.cum[-1] + math.dist(a, b))
        self.length = self.cum[-1]

    def at(self, d):
        L = self.length
        d = d % L if self.closed else max(0.0, min(L, d))
        lo, hi = 0, len(self.cum) - 1
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if self.cum[mid] <= d: lo = mid
            else: hi = mid
        a, b = self.pts[lo], self.pts[hi]
        seg = self.cum[hi] - self.cum[lo] or 1e-12
        u = (d - self.cum[lo]) / seg
        p = tuple(a[i] + (b[i] - a[i]) * u for i in range(len(a)))
        h = tuple(b[i] - a[i] for i in range(len(a)))
        n = math.sqrt(sum(v * v for v in h)) or 1e-12
        return p, tuple(v / n for v in h)


def heading_deg(h):
    """Heading (x, y) -> face_deg for E.Char.at (a character faces -y at 0 deg; +deg turns -y towards +x)."""
    return math.degrees(math.atan2(h[0], -h[1]))


def ground_speed(foot_tracks, fps, contact_band=0.15):
    """foot_tracks: {foot: [(x, y, z), ...]} positions in the BODY's own frame (body still), one per frame of one cycle.
    A foot is planted when it is within contact_band of its lowest height range; then its backward speed
    = the speed the body moves over the ground. Returns the median planted speed (units per second)."""
    speeds = []
    for track in foot_tracks.values():
        zs = [p[2] for p in track]
        zmin, zmax = min(zs), max(zs)
        lim = zmin + contact_band * max(zmax - zmin, 1e-9)
        for a, b in zip(track, track[1:]):
            if a[2] <= lim and b[2] <= lim:
                speeds.append(math.hypot(b[0] - a[0], b[1] - a[1]) * fps)
    if not speeds: return 0.0
    speeds.sort()
    return speeds[len(speeds) // 2]


def playback_scale(body_speed, anim_speed, lo=0.6, hi=1.8):
    """Factor to play the cycle faster (>1) or slower (<1) so planted feet stay planted at body_speed.
    Returns (factor, clamped): if the needed factor is outside [lo, hi] it is clamped and clamped=True
    (then change the body speed instead, or the feet WILL slide)."""
    if anim_speed <= 1e-9: return 1.0, True
    k = body_speed / anim_speed
    return max(lo, min(hi, k)), not (lo <= k <= hi)


def herd(n, spacing, rows=1, jitter=0.25, seed=7):
    """N animals walking together: (along, side, phase 0..1, speed factor) per animal.
    Staggered rows, a little random jitter, phases spread so no two step together."""
    rnd = random.Random(seed); out = []
    per_row = math.ceil(n / rows)
    for i in range(n):
        r, c = divmod(i, per_row)
        along = -c * spacing + rnd.uniform(-jitter, jitter) * spacing
        side = (r - (rows - 1) / 2) * spacing * 0.9 + (spacing * 0.35 if c % 2 else 0) * (1 if rows > 1 else 0)
        out.append((along, side, (i * 0.618034) % 1.0, 1.0 + rnd.uniform(-0.06, 0.06)))
    return out


def min_gap(positions):
    """Smallest distance between any two points (2D) -- used to check animals never overlap."""
    best = float('inf')
    for i in range(len(positions)):
        for j in range(i + 1, len(positions)):
            best = min(best, math.dist(positions[i][:2], positions[j][:2]))
    return best


if __name__ == '__main__':
    # self-test on this computer:  python tabletop/src/animal_path.py
    P = Path([(0, 0), (1, 0), (2, 1)])
    assert abs(P.at(0)[0][0]) < 1e-9 and abs(P.at(P.length)[0][0] - 2) < 1e-6
    p, h = P.at(0.5); assert abs(h[1]) < 0.2 and h[0] > 0.9, h          # heading along +x at the start
    assert abs(heading_deg((0, -1))) < 1e-9 and abs(heading_deg((1, 0)) - 90) < 1e-9
    C = Path([(0, 0), (1, 0), (1, 1), (0, 1)], closed=True); assert abs(C.at(C.length + 0.1)[0][0] - C.at(0.1)[0][0]) < 1e-9
    # a fake 1-second walk cycle at 24 fps: a planted foot slides back 0.3 units in the first half second
    fps, N = 24, 24
    track = [(0, 0.15 - 0.3 * k / 12, 0.0) if k <= 12 else (0, -0.15 + 0.3 * (k - 12) / 12, 0.05 * math.sin(math.pi * (k - 12) / 12)) for k in range(N + 1)]
    v = ground_speed({'foot': track}, fps); assert abs(v - 0.6) < 1e-6, v
    k, cl = playback_scale(0.3, v); assert abs(k - 0.5) < 1e-9 or cl
    k, cl = playback_scale(0.48, v); assert abs(k - 0.8) < 1e-9 and not cl
    H = herd(8, 0.02, rows=2); assert len(H) == 8 and len({round(x[2], 3) for x in H}) == 8
    assert min_gap([(a, s) for a, s, _, _ in H]) > 0.005, min_gap([(a, s) for a, s, _, _ in H])
    print('animal_path self-test OK  (path length %.3f, walk speed %.2f)' % (P.length, v))
