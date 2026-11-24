# Safari Count (HWG5 U4): walking / running / climbing animals for the tabletop (style H) films. Blender only (Colab only).
# An animal is a Tripo model rigged with Auto Rig (quadruped or humanoid) and exported as GLB WITH its animations
# (Preset "walk"/"run" or AI Animation clips, e.g. "the bear walks slowly"). Each clip becomes a Blender action.
#
#   import animals as A
#   bear = A.Animal("taiwan_bear", height=0.045, loc=(0.0, 0.1))
#   print(bear.actions())                                  # clip names found in the GLB
#   path = A.Path([(-0.15, 0.10), (0.0, 0.06), (0.15, 0.10)])
#   bear.walk("walk", path, t0=0.3, t1=4.5, speed=0.02)   # metres per second along the path
#   bear.play("idle", 4.5, 5.5)                             # stand still, play an in-place clip
#   A.report(bear, 0, 5.5)                                  # prints CONTACT SLIDE lines (feet must not slide)
#   herd = A.herd_walk("zebra", 8, 0.05, "walk", path, 0.2, 5.0, speed=0.018, spacing=0.03, rows=2)
#
# How the feet stay planted: the clip's own ground speed is measured from the feet (a planted foot moves backwards
# under the body at exactly the ground speed); the clip is then played faster/slower (NLA strip scale) so that speed
# equals the speed the body is moved along the path. If that needs a silly factor (outside 0.6..1.8) a WARN is printed:
# change the body speed instead. Phases are offset so animals in a herd never step together.
# Facing: E.Char assumes a model faces -y. If a Tripo animal faces another way, pass fwd_fix (degrees) once it is seen
# in the first check frame. Numbers marked GUESS are first guesses. ASCII only: colab exec reads files with cp950 on Windows.
import math
import bpy
from mathutils import Vector
import engine as E
from animal_path import Path, heading_deg, ground_speed, playback_scale, herd, min_gap   # noqa: F401  (Path re-exported)

FOOT_WORDS = ("foot", "toe", "hoof", "paw", "ankle")
CONTACT_BAND = 0.15          # a foot within 15 % of its lowest height range counts as planted
SLIDE_WARN_MM = 1.0          # GUESS: tabletop scale, more than 1 mm of planted-foot slide is visible in a close shot


class Animal:
    """One rigged animal (an E.Char underneath: same import, scale and ground handling as the pupils)."""

    def __init__(self, glb, height, loc=(0.0, 0.0), face_deg=0.0, fwd_fix=0.0, label=None):
        before = set(bpy.data.actions)
        self.ch = E.Char(glb, loc, face_deg + fwd_fix, height=height)
        self.arm, self.root = self.ch.arm, self.ch.root
        self.fwd_fix = fwd_fix
        self.label = label or glb
        self.acts = [a for a in bpy.data.actions if a not in before]
        ad = self.arm.animation_data_create()
        ad.action = None                                   # everything is played through NLA strips
        for tr in list(ad.nla_tracks): ad.nla_tracks.remove(tr)
        self.track = ad.nla_tracks.new(); self.track.name = "clips"
        self.feet = self._find_feet()
        self._cycles = {}
        print("ANIMAL %s actions %s feet %s" % (self.label, [a.name for a in self.acts], self.feet), flush=True)

    # ---------- clips ----------
    def actions(self):
        return [a.name for a in self.acts]

    def action(self, key):
        k = key.lower()
        hits = [a for a in self.acts if k in a.name.lower()]
        if not hits: raise KeyError("%s: no clip with '%s' in its name (have %s)" % (self.label, key, self.actions()))
        return hits[0]

    def _find_feet(self):
        """Foot bones by name; otherwise the 4 lowest leaf bones of the rest pose."""
        named = [b.name for b in self.arm.data.bones if any(w in b.name.lower() for w in FOOT_WORDS) and not b.children]
        if len(named) >= 2: return named[:4]
        leaves = [b for b in self.arm.data.bones if not b.children]
        leaves.sort(key=lambda b: (self.arm.matrix_world @ b.tail_local).z)
        return [b.name for b in leaves[:4]]

    def _foot_world(self):
        bpy.context.view_layer.update()
        Aw = self.arm.matrix_world
        return {f: Aw @ self.arm.pose.bones[f].tail for f in self.feet}

    def cycle(self, key):
        """(cycle length in frames, ground speed in m/s) of a clip, measured with the body standing still."""
        if key in self._cycles: return self._cycles[key]
        act = self.action(key); ad = self.arm.animation_data
        f0, f1 = (int(round(v)) for v in act.frame_range)
        mute = [(t, t.mute) for t in ad.nla_tracks]
        for t, _ in mute: t.mute = True
        ad.action = act
        tracks = {f: [] for f in self.feet}
        keep = E.sc.frame_current
        for fr in range(f0, f1 + 1):
            E.sc.frame_set(fr)
            for f, p in self._foot_world().items(): tracks[f].append((p.x, p.y, p.z))
        ad.action = None
        for t, m in mute: t.mute = m
        E.sc.frame_set(keep)
        v = ground_speed(tracks, E.FPS, CONTACT_BAND)
        self._cycles[key] = (max(1, f1 - f0), v)
        print("ANIMAL %s clip %s frames %d ground_speed %.4f m/s" % (self.label, act.name, f1 - f0, v), flush=True)
        return self._cycles[key]

    def _strip(self, key, t0, t1, rate=1.0, phase=0.0):
        """Loop clip `key` from t0 to t1 seconds, `rate` x its own speed, starting `phase` (0..1) into the cycle."""
        act = self.action(key); n, _ = self.cycle(key)
        start = E.f(t0) - phase * n / rate
        s = self.track.strips.new("%s_%d" % (key, len(self.track.strips)), int(math.floor(start)), act)
        s.scale = 1.0 / rate
        s.repeat = max(1.0, (E.f(t1) - start) / (n / rate))
        s.blend_in = s.blend_out = 0.0
        s.extend_mode = "HOLD_FORWARD" if len(self.track.strips) == 1 else "NOTHING"
        # strips on one track must not overlap: trim the previous one
        prev = [x for x in self.track.strips if x != s and x.frame_end > s.frame_start]
        for x in prev: x.frame_end = max(x.frame_start + 1, s.frame_start)
        return s

    # ---------- moves ----------
    def play(self, key, t0, t1, rate=1.0, phase=0.0):
        """In-place clip (idle, eat, lie down, yawn ...): the body does not travel."""
        return self._strip(key, t0, t1, rate, phase)

    def walk(self, key, path, t0, t1, speed, start_d=0.0, side=0.0, phase=0.0, speed_k=1.0):
        """Travel along `path` at `speed` m/s (x speed_k), `side` metres to the left of it, looping clip `key`
        at the rate that keeps planted feet planted."""
        _, v = self.cycle(key)
        body = speed * speed_k
        rate, clamped = playback_scale(body, v)
        if clamped:
            print("WARN ANIMAL %s clip %s needs rate %.2f for body speed %.4f (clip %.4f): feet will slide, change the speed"
                  % (self.label, key, body / max(v, 1e-9), body, v), flush=True)
        self._strip(key, t0, t1, rate, phase)
        for fr in range(E.f(t0), E.f(t1) + 1, 2):
            t = fr / E.FPS
            p, h = path.at(start_d + body * (t - t0))
            left = Vector((-h[1], h[0], 0.0))
            x, y = p[0] + left.x * side, p[1] + left.y * side
            self.ch.at(t, loc=(x, y) if len(p) < 3 else (x, y, p[2]), face_deg=heading_deg(h) + self.fwd_fix)
        return rate

    def climb(self, key, bottom, top, t0, t1, face_deg=0.0, phase=0.0):
        """Straight up a trunk from bottom (x, y, z) to top: the clip is a climbing clip; the body is lifted at the
        clip's own climbing speed if it has one, else evenly over t0..t1."""
        self._strip(key, t0, t1, 1.0, phase)
        for fr in range(E.f(t0), E.f(t1) + 1, 2):
            u = (fr / E.FPS - t0) / max(1e-6, t1 - t0)
            p = [bottom[i] + (top[i] - bottom[i]) * u for i in range(3)]
            self.ch.at(fr / E.FPS, loc=(p[0], p[1], p[2]), face_deg=face_deg + self.fwd_fix)

    def finish(self):
        """Hold the root between its 2-frame keys (stop-motion look like the pupils); NLA clips stay as they are."""
        E.constant(self.root)


def herd_walk(glb, n, height, key, path, t0, t1, speed, spacing, rows=1, seed=7, fwd_fix=0.0, label=None):
    """N animals of one model walking one path together: staggered along/side offsets, spread phases, +-6 % speeds."""
    out = []
    for i, (along, side, phase, k) in enumerate(herd(n, spacing, rows, seed=seed)):
        a = Animal(glb, height, fwd_fix=fwd_fix, label="%s%d" % (label or glb, i + 1))
        a.walk(key, path, t0, t1, speed, start_d=along, side=side, phase=phase, speed_k=k)
        out.append(a)
    return out


def report(animals, t0, t1, step=2):
    """CONTACT SLIDE lines: how far each planted foot slides on the ground (mm), and the closest two animals."""
    if not isinstance(animals, (list, tuple)): animals = [animals]
    worst_gap = float("inf")
    for a in animals:
        lows = {}
        prev = None; slides = []
        frames = list(range(E.f(t0), E.f(t1) + 1, step))
        traj = []
        for fr in frames:
            E.sc.frame_set(fr); traj.append(a._foot_world())
        for f in a.feet:
            zs = [p[f].z for p in traj]; lows[f] = min(zs) + CONTACT_BAND * max(max(zs) - min(zs), 1e-9)
        for p0, p1 in zip(traj, traj[1:]):
            for f in a.feet:
                if p0[f].z <= lows[f] and p1[f].z <= lows[f]:
                    slides.append(math.hypot(p1[f].x - p0[f].x, p1[f].y - p0[f].y) * 1000)
        slides.sort()
        mx = slides[-1] if slides else 0.0; med = slides[len(slides) // 2] if slides else 0.0
        print("CONTACT SLIDE %s max %.2f mm median %.2f mm planted_samples %d%s"
              % (a.label, mx, med, len(slides), "  WARN" if med > SLIDE_WARN_MM else ""), flush=True)
    for fr in range(E.f(t0), E.f(t1) + 1, step * 6):
        E.sc.frame_set(fr); bpy.context.view_layer.update()
        pts = [tuple(a.root.matrix_world.translation) for a in animals]
        if len(pts) > 1: worst_gap = min(worst_gap, min_gap(pts))
    if len(animals) > 1: print("CONTACT HERD closest_roots %.1f mm" % (worst_gap * 1000), flush=True)
