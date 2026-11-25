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
from mathutils import Vector, Matrix, Quaternion
import engine as E
from animal_path import Path, heading_deg, ground_speed, fit_ground_speed, playback_scale, herd, min_gap   # noqa: F401  (Path re-exported)

FOOT_WORDS = ("foot", "toe", "hoof", "paw", "ankle")
CONTACT_BAND = 0.15          # a foot within 15 % of its lowest height range counts as planted
SLIDE_WARN_MM = 1.0          # GUESS: tabletop scale, more than 1 mm of planted-foot slide is visible in a close shot


class Animal:
    """One rigged animal (an E.Char underneath: same import, scale and ground handling as the pupils)."""

    def __init__(self, glb, height, loc=(0.0, 0.0), face_deg=0.0, fwd_fix=0.0, label=None, clip_speed_h=None, fix_legs=(), reverse_clip=False):
        before = set(bpy.data.actions)
        self.height = height
        # clip_speed_h: the clip's ground speed in body-heights per second, when the foot fit cannot find it (11/25 lion:
        # fit = 0). The Tripo quadruped Walk preset moves the bear 0.44 heights/s (bear fit, checked in its films).
        self.clip_speed_h = clip_speed_h
        # reverse_clip: Tripo rigged the model back to front (11/25 zebra: the rig 'head' is the tail, so the Walk preset
        # steps toward the tail and the zebras walked backwards). Play the clip reversed: it then steps toward the real head.
        self.reverse_clip = reverse_clip
        self.ch = E.Char(glb, loc, face_deg + (fwd_fix or 0.0), height=height)
        if self.ch in getattr(E, 'CHARS', []): E.CHARS.remove(self.ch)   # 11/25: camera autofocus wants a humanoid 'Head' bone
        self.arm, self.root = self.ch.arm, self.ch.root
        self.fwd_fix = fwd_fix          # None = measure it from the walk clip (feet push backwards)
        self.auto_fix = 0.0
        self.label = label or glb
        self.acts = [a for a in bpy.data.actions if a not in before]
        ad = self.arm.animation_data_create()
        ad.action = None                                   # everything is played through NLA strips
        for tr in list(ad.nla_tracks): ad.nla_tracks.remove(tr)
        self.track = ad.nla_tracks.new(); self.track.name = "clips"
        self.feet = self._find_feet()
        self._cycles = {}
        for broken, good in fix_legs: self.fix_leg(broken, good)
        print("DESK ANIMAL %s actions %s feet %s" % (self.label, [a.name for a in self.acts], self.feet), flush=True)

    # ---------- a leg the Tripo rigger missed ----------
    def fix_leg(self, broken_leaf, good_leaf, key="walk", n_chain=None):
        """11/25 horses: Tripo's quadruped Auto Rig often leaves one leg out of its named chains, so the Walk preset never
        moves it. Bake an IK target into the clip: the broken foot follows the mirror image of the good leg on the other
        side of the body (same end: front/hind), half a step later. Then an IK constraint bends the broken chain to it."""
        arm = self.arm; ad = arm.animation_data; act = self.action(key)
        names = {b.name.split(":")[-1]: b.name for b in arm.data.bones}
        bl = names.get(broken_leaf.split(":")[-1], broken_leaf); gl = names.get(good_leaf.split(":")[-1], good_leaf)
        # chain length: bones from the leaf up to (not including) the first named spine/head/root bone
        if n_chain is None:
            n_chain, b = 0, arm.data.bones[bl]
            while b is not None and not any(w in b.name for w in ("Spine", "Head", "Root")) and not (n_chain and "_Limb_0" in b.name and False):
                n_chain += 1; b = b.parent
        root_bone = next(b for b in arm.data.bones if b.parent is None)
        # 11/25 white horse: the Left/Right labels of the rig were not reliable -> the mirror plane comes from the two feet
        # themselves (rest pose): halfway between them, normal = their sideways offset (horizontal, across the walk)
        up = Vector((0, 0, 1))
        bt, gt = arm.data.bones[bl].tail_local.copy(), arm.data.bones[gl].tail_local.copy()
        if abs(bt.z - gt.z) > abs(bt.y - gt.y) and abs(bt.z - gt.z) > abs(bt.x - gt.x) and False: up = Vector((0, 1, 0))
        mid = (bt + gt) / 2
        # the target bone, child of the root bone
        bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode="EDIT")
        eb = arm.data.edit_bones.new("ikt_" + bl.split(":")[-1]); tail = arm.data.edit_bones[bl].tail.copy()
        eb.head = tail; eb.tail = tail + up * 0.05 * (arm.dimensions.length or 1.0); eb.parent = arm.data.edit_bones[root_bone.name]
        tname = eb.name
        bpy.ops.object.mode_set(mode="OBJECT")
        # good foot track over the clip (pose space), then mirrored and shifted half a period
        f0, f1 = (int(round(v)) for v in act.frame_range); keep_act = ad.action; ad.action = act
        mute = [(t, t.mute) for t in ad.nla_tracks]
        for t, _ in mute: t.mute = True
        pg = arm.pose.bones[gl]; track = []
        for fr in range(f0, f1 + 1):
            E.sc.frame_set(fr); bpy.context.view_layer.update(); track.append(pg.tail.copy())
        n = len(track)
        # walking direction = main horizontal axis of the good foot's motion; the mirror normal is across it
        hx = [p.x for p in track]; hy = [p.y for p in track]; mx_ = sum(hx) / n; my_ = sum(hy) / n
        sxx = sum((a - mx_) ** 2 for a in hx); syy = sum((b - my_) ** 2 for b in hy); sxy = sum((a - mx_) * (b - my_) for a, b in zip(hx, hy))
        ang = 0.5 * math.atan2(2 * sxy, sxx - syy); fwd = Vector((math.cos(ang), math.sin(ang), 0.0))
        d = bt - gt; d.z = 0.0; side = (d - fwd * d.dot(fwd)).normalized()
        xs = [p.dot(Vector((1, 0, 0))) for p in track]; ys = [p.dot(Vector((0, 1, 0))) for p in track]
        def ac(lag):
            return sum((xs[i] - xs[i + lag]) ** 2 + (ys[i] - ys[i + lag]) ** 2 for i in range(n - lag)) / max(1, n - lag)
        lags = list(range(8, max(9, n * 2 // 3))); acs = {g_: ac(g_) for g_ in lags}; amin = min(acs.values())
        P = next(g_ for g_ in lags if acs[g_] <= amin * 1.5 + 1e-12)     # the SHORTEST repeat (the clip holds ~3 steps)
        pt = arm.pose.bones[tname]
        for i, fr in enumerate(range(f0, f1 + 1)):
            q = track[(i + P // 2) % n] if n > 1 else track[0]
            m = q - 2 * (q - mid).dot(side) * side
            E.sc.frame_set(fr); bpy.context.view_layer.update()
            pt.matrix = Matrix.Translation(m) @ pt.matrix.to_3x3().to_4x4()
            bpy.context.view_layer.update()
            pt.keyframe_insert("location", frame=fr)
        for t, mt in mute: t.mute = mt
        ad.action = keep_act
        c = arm.pose.bones[bl].constraints.new("IK"); c.target = arm; c.subtarget = tname; c.chain_count = n_chain; c.use_tail = True
        # the broken leaf is a foot now; drop stub chains whose last bone is high above the ground
        if bl not in self.feet: self.feet = [f for f in self.feet if arm.data.bones[f].tail_local.length >= 0] + [bl]
        zs = {f: (arm.matrix_world @ arm.data.bones[f].tail_local).z for f in self.feet}
        lo = min(zs.values()); hi = max(zs.values())
        self.feet = sorted(self.feet, key=lambda f: zs[f])[:4]
        print("DESK ANIMAL %s fix_leg %s <- mirror of %s, chain %d, period %d frames" % (self.label, bl, gl, n_chain, P), flush=True)

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
        # Tripo quadruped rig (11/25 bear): legs are <n>_<Left|Right>_Limb_0..4, the last segment (Limb_4) is the foot
        # 11/25 lion: one leg had no Limb_4 -> the highest-numbered bone of every <n>_<Side>_Limb_<k> chain
        best = {}
        for b in self.arm.data.bones:
            n = b.name.split(":")[-1]
            if "_Limb_" in n:
                pre, k = n.rsplit("_Limb_", 1)
                if k.isdigit() and int(k) >= best.get(pre, (-1, ""))[0]: best[pre] = (int(k), b.name)
        if len(best) >= 4: return sorted(v for _, v in best.values())[:4]
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
        """(cycle length in frames, ground speed in m/s) of a clip, measured with the body standing still.
        Also learns the model's forward direction: planted feet push backwards (11/25: the gallery bear walked sideways
        with a guessed facing -> 4 mm of foot slide every 2 frames)."""
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
            Ri = self.root.matrix_world.inverted()
            for f, p in self._foot_world().items():
                q = Ri @ p; tracks[f].append((q.x, q.y, q.z))
        ad.action = None
        for t, m in mute: t.mute = m
        E.sc.frame_set(keep)
        k = self.root.matrix_world.to_scale().x
        # forward axis: the main axis of the foot motion; the FAST part of the cycle (swing) goes forward (11/25 v2)
        vel = []
        for tr in tracks.values():
            for a, b in zip(tr, tr[1:]): vel.append((b[0] - a[0], b[1] - a[1]))
        sxx = sum(x * x for x, y in vel); syy = sum(y * y for x, y in vel); sxy = sum(x * y for x, y in vel)
        ang = 0.5 * math.atan2(2 * sxy, sxx - syy); ax = (math.cos(ang), math.sin(ang))
        proj = sorted((x * ax[0] + y * ax[1] for x, y in vel), key=abs)
        fast = proj[int(len(proj) * 0.75):]
        sgn = 1.0 if sum(fast) >= 0 else -1.0
        if self.reverse_clip: sgn = -sgn                    # played backwards in time -> it travels the other way
        self.fwd_local = (ax[0] * sgn, ax[1] * sgn)
        self.auto_fix = -heading_deg(self.fwd_local)
        v_local, err = fit_ground_speed(tracks, E.FPS, self.fwd_local)
        v = v_local * k
        if self.clip_speed_h:
            print("DESK ANIMAL %s fit gave %.4f m/s; using clip_speed_h %.3f heights/s" % (self.label, v, self.clip_speed_h), flush=True)
            v = self.clip_speed_h * self.height
        print("DESK ANIMAL %s planted-feet fit: speed %.4f m/s, leftover slide %.2f mm/s" % (self.label, v, err * k * 1000), flush=True)
        self._cycles[key] = (max(1, f1 - f0), v)
        print("DESK ANIMAL %s clip %s frames %d ground_speed %.4f m/s forward_local (%.2f, %.2f) auto_fix %.1f deg"
              % (self.label, act.name, f1 - f0, v, getattr(self, "fwd_local", (0, 0))[0], getattr(self, "fwd_local", (0, 0))[1], self.auto_fix), flush=True)
        return self._cycles[key]

    def facing_fix(self):
        return self.auto_fix if self.fwd_fix is None else self.fwd_fix

    def forward_world(self):
        """The direction the animal really faces now (world)."""
        f = getattr(self, "fwd_local", (0.0, -1.0))
        return (self.root.matrix_world.to_3x3().normalized() @ Vector((f[0], f[1], 0.0))).normalized()

    def _strip(self, key, t0, t1, rate=1.0, phase=0.0):
        """Loop clip `key` from t0 to t1 seconds, `rate` x its own speed, starting `phase` (0..1) into the cycle."""
        act = self.action(key); n, _ = self.cycle(key)
        start = E.f(t0) - phase * n / rate
        s = self.track.strips.new("%s_%d" % (key, len(self.track.strips)), int(math.floor(start)), act)
        s.scale = 1.0 / rate
        s.repeat = max(1.0, (E.f(t1) - start) / (n / rate))
        s.blend_in = s.blend_out = 0.0
        s.use_reverse = bool(self.reverse_clip)
        s.extrapolation = "HOLD_FORWARD" if len(self.track.strips) == 1 else "NOTHING"
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
        body = (v if speed is None else speed) * speed_k          # speed None = the clip's own ground speed (rate 1)
        rate, clamped = playback_scale(body, v)
        if clamped:
            print("DESK WARN ANIMAL %s clip %s needs rate %.2f for body speed %.4f (clip %.4f): feet will slide, change the speed"
                  % (self.label, key, body / max(v, 1e-9), body, v), flush=True)
        self._strip(key, t0, t1, rate, phase)
        for fr in range(E.f(t0), E.f(t1) + 1, 2):
            t = fr / E.FPS
            p, h = path.at(start_d + body * (t - t0))
            left = Vector((-h[1], h[0], 0.0))
            x, y = p[0] + left.x * side, p[1] + left.y * side
            self.ch.at(t, loc=(x, y) if len(p) < 3 else (x, y, p[2]), face_deg=heading_deg(h) + self.facing_fix())
        return rate

    def graze(self, t0, t1, down_deg=38.0, ease_s=0.4):
        """Head down to the grass and back (11/25 rhino: Tripo has no quadruped 'eat' clip). Bends the neck/head chain
        (bones named Head_*) about the body's sideways axis on a second NLA track (COMBINE), easing in and out.
        The body should stand still meanwhile (end the walk at t0, start the next walk at t1)."""
        arm = self.arm; ad = arm.animation_data
        heads = sorted([b for b in arm.data.bones if "Head_" in b.name.split(":")[-1]], key=lambda b: b.name)
        if not heads: print("DESK WARN ANIMAL %s graze: no Head_ bones" % self.label, flush=True); return
        f = getattr(self, "fwd_local", (0.0, -1.0))
        # forward / sideways in ARMATURE space: the root (char) object holds the armature; use the armature's own axes
        Mi = arm.matrix_world.to_3x3().inverted() @ self.root.matrix_world.to_3x3()
        fwd_a = (Mi @ Vector((f[0], f[1], 0.0))).normalized(); up_a = (Mi @ Vector((0, 0, 1))).normalized()
        side_a = fwd_a.cross(up_a).normalized()
        act = bpy.data.actions.new("graze_%s" % self.label)
        per = -math.radians(down_deg) / len(heads)          # check 2 (rhino): +angle about side_a lifted the head 1.4 cm -> minus
        for b in heads:
            ax = (b.matrix_local.to_3x3().inverted() @ side_a).normalized()
            pb = arm.pose.bones[b.name]; pb.rotation_mode = "QUATERNION"
            for t, k in ((t0, 0.0), (t0 + ease_s, 1.0), (max(t0 + ease_s, t1 - ease_s), 1.0), (t1, 0.0)):
                pb.rotation_quaternion = Quaternion(ax, per * k)
                ad.action = act; pb.keyframe_insert("rotation_quaternion", frame=E.f(t))
        ad.action = None
        tr = ad.nla_tracks.new(); tr.name = "graze"
        st = tr.strips.new("graze", E.f(t0), act); st.blend_type = "COMBINE"; st.extrapolation = "NOTHING"
        for b in heads: arm.pose.bones[b.name].rotation_quaternion = (1, 0, 0, 0)
        print("DESK ANIMAL %s graze %.1f-%.1f s, %d head bones, %.0f deg" % (self.label, t0, t1, len(heads), down_deg), flush=True)
        tip = arm.pose.bones[heads[-1].name]
        for t in (max(0.0, t0 - 0.3), t0 + min(1.0, (t1 - t0) / 2)):
            E.sc.frame_set(E.f(t)); bpy.context.view_layer.update()
            print("DESK GRAZE %s t %.2f head tip z %.4f" % (self.label, t, (arm.matrix_world @ tip.tail).z), flush=True)

    def look(self, keys, name="look"):
        """Look around (11/25 India tiger: 'one stops and looks around'): turn the Head_* chain about the body's UP axis.
        keys = [(t, yaw_deg), ...], positive = to the animal's left. The body should stand still meanwhile."""
        arm = self.arm; ad = arm.animation_data
        heads = sorted([b for b in arm.data.bones if "Head_" in b.name.split(":")[-1]], key=lambda b: b.name)
        if not heads: print("DESK WARN ANIMAL %s look: no Head_ bones" % self.label, flush=True); return
        Mi = arm.matrix_world.to_3x3().inverted() @ self.root.matrix_world.to_3x3()
        up_a = (Mi @ Vector((0, 0, 1))).normalized()
        act = bpy.data.actions.new("%s_%s" % (name, self.label))
        for b in heads:
            ax = (b.matrix_local.to_3x3().inverted() @ up_a).normalized()
            pb = arm.pose.bones[b.name]; pb.rotation_mode = "QUATERNION"
            for t, deg in keys:
                pb.rotation_quaternion = Quaternion(ax, math.radians(deg) / len(heads))
                ad.action = act; pb.keyframe_insert("rotation_quaternion", frame=E.f(t))
        ad.action = None
        tr = ad.nla_tracks.new(); tr.name = name
        st = tr.strips.new(name, E.f(keys[0][0]), act); st.blend_type = "COMBINE"; st.extrapolation = "HOLD_FORWARD"
        for b in heads: arm.pose.bones[b.name].rotation_quaternion = (1, 0, 0, 0)
        tip = arm.pose.bones[heads[-1].name]
        for t, deg in keys:
            E.sc.frame_set(E.f(t)); bpy.context.view_layer.update()
            p = arm.matrix_world @ tip.tail
            print("DESK LOOK %s t %.2f yaw %.0f head tip %.4f %.4f" % (self.label, t, deg, p.x, p.y), flush=True)

    def climb(self, key, bottom, top, t0, t1, face_deg=0.0, phase=0.0):
        """Straight up a trunk from bottom (x, y, z) to top: the clip is a climbing clip; the body is lifted at the
        clip's own climbing speed if it has one, else evenly over t0..t1."""
        self._strip(key, t0, t1, 1.0, phase)
        for fr in range(E.f(t0), E.f(t1) + 1, 2):
            u = (fr / E.FPS - t0) / max(1e-6, t1 - t0)
            p = [bottom[i] + (top[i] - bottom[i]) * u for i in range(3)]
            self.ch.at(fr / E.FPS, loc=(p[0], p[1], p[2]), face_deg=face_deg + self.facing_fix())

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
        prev = None; slides = []
        frames = list(range(E.f(t0), E.f(t1) + 1, step))
        traj = []
        for fr in frames:
            E.sc.frame_set(fr); traj.append(a._foot_world())
            if a is animals[0] and fr <= E.f(t0) + 48:
                f0 = a.feet[0]; rt = a.root.matrix_world.translation; p = traj[-1][f0]
                print("DESK FOOT %s fr %d foot %.4f %.4f %.4f root %.4f %.4f" % (a.label, fr, p.x, p.y, p.z, rt.x, rt.y), flush=True)
        for p0, p1 in zip(traj, traj[1:]):
            d = sorted(math.hypot(p1[f].x - p0[f].x, p1[f].y - p0[f].y) * 1000 for f in a.feet)
            slides += d[:2]                                    # the two slowest feet are the planted ones (11/25 v2)
        slides.sort()
        mx = slides[-1] if slides else 0.0; med = slides[len(slides) // 2] if slides else 0.0
        print("CONTACT SLIDE %s max %.2f mm median %.2f mm planted_samples %d%s"
              % (a.label, mx, med, len(slides), "  WARN" if med > SLIDE_WARN_MM else ""), flush=True)
    for fr in range(E.f(t0), E.f(t1) + 1, step * 6):
        E.sc.frame_set(fr); bpy.context.view_layer.update()
        pts = [tuple(a.root.matrix_world.translation) for a in animals]
        if len(pts) > 1: worst_gap = min(worst_gap, min_gap(pts))
    if len(animals) > 1: print("CONTACT HERD closest_roots %.1f mm" % (worst_gap * 1000), flush=True)
