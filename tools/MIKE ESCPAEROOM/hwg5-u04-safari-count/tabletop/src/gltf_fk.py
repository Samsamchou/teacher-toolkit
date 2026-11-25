"""Forward kinematics of a GLB walk clip on this PC (numpy, no Blender): where each bone joint goes during the clip.
  python tabletop/src/gltf_fk.py <model.glb> [clip index]
Prints every leaf joint (no child joints) with its lowest height and its motion range in the rest-up/forward plane,
so the real feet (low + moving) can be told apart from the tail / ears. 11/25: the Japan lion and pony walk fits gave
speed 0 because the foot guess was wrong. ASCII only."""
import json, struct, sys
import numpy as np


def load(path):
    b = open(path, 'rb').read(); jl = struct.unpack('<I', b[12:16])[0]; J = json.loads(b[20:20 + jl])
    off = 20 + jl + 8; bl = struct.unpack('<I', b[20 + jl:24 + jl])[0]; BIN = b[off:off + bl]
    def acc(k):
        A = J['accessors'][k]; V = J['bufferViews'][A['bufferView']]; n = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[A['type']]
        o = V.get('byteOffset', 0) + A.get('byteOffset', 0)
        return np.frombuffer(BIN, np.float32, count=A['count'] * n, offset=o).reshape(A['count'], n)
    return J, acc


def qmat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def trs(t, r, s):
    M = np.eye(4); M[:3, :3] = qmat(r) * s; M[:3, 3] = t; return M


def tracks(path, clip=0, fps=24):
    J, acc = load(path); N = J['nodes']
    parent = {c: i for i, n in enumerate(N) for c in n.get('children', [])}
    base = {i: [np.array(n.get('translation', [0, 0, 0]), float), np.array(n.get('rotation', [0, 0, 0, 1]), float),
                np.array(n.get('scale', [1, 1, 1]), float)] for i, n in enumerate(N)}
    A = J['animations'][clip]; ch = []
    for c in A['channels']:
        s = A['samplers'][c['sampler']]; ch.append((c['target']['node'], c['target']['path'], acc(s['input'])[:, 0], acc(s['output'])))
    t1 = max(c[2][-1] for c in ch); times = np.arange(0, t1 + 1e-6, 1.0 / fps)
    joints = J['skins'][0]['joints']; out = {j: [] for j in joints}
    for t in times:
        cur = {i: [v.copy() for v in base[i]] for i in base}
        for node, p, ti, vo in ch:
            k = min(np.searchsorted(ti, t), len(ti) - 1)
            cur[node][{'translation': 0, 'rotation': 1, 'scale': 2}[p]] = vo[k].astype(float)
        G = {}
        def g(i):
            if i in G: return G[i]
            L = trs(*cur[i]); G[i] = g(parent[i]) @ L if i in parent else L; return G[i]
        for j in joints: out[j].append(g(j)[:3, 3].copy())
    return J, {j: np.array(v) for j, v in out.items()}, times


if __name__ == '__main__':
    J, T, times = tracks(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 0)
    N = J['nodes']; joints = set(J['skins'][0]['joints'])
    ys = np.concatenate([v[:, 1] for v in T.values()]); H = ys.max() - ys.min()
    print('frames', len(times), 'height range %.3f' % H)
    for j, v in sorted(T.items(), key=lambda kv: kv[1][:, 1].min()):
        leaf = not any(c in joints for c in N[j].get('children', []))
        rng = np.ptp(v, axis=0)
        print('%-26s %s low %.3f  move x %.3f y %.3f z %.3f' % (N[j].get('name', j), 'LEAF' if leaf else '    ', (v[:, 1].min() - ys.min()) / H, rng[0] / H, rng[1] / H, rng[2] / H))


def leg_feet(J):
    """Foot of each leg chain: the highest-numbered bone of every '<n>_<Side>_Limb_<k>' chain (11/25 lion: one leg had no Limb_4)."""
    best = {}
    for j in J['skins'][0]['joints']:
        n = J['nodes'][j].get('name', '').split('::')[-1]
        if '_Limb_' in n:
            pre, k = n.rsplit('_Limb_', 1)
            if k.isdigit() and int(k) >= best.get(pre, (-1, 0))[0]: best[pre] = (int(k), j)
    return [j for _, j in best.values()]


def fit(path, clip=0, fps=24):
    """Local version of animals.Animal.cycle(): ground speed (model units / s, rest scale) and leftover slide."""
    from animal_path import fit_ground_speed
    J, T, _ = tracks(path, clip, fps)
    feet = leg_feet(J)
    tr = {f: [(p[0], -p[2], p[1]) for p in T[f]] for f in feet}      # glTF Y-up -> z-up
    vel = [(b[0] - a[0], b[1] - a[1]) for t in tr.values() for a, b in zip(t, t[1:])]
    sxx = sum(x * x for x, y in vel); syy = sum(y * y for x, y in vel); sxy = sum(x * y for x, y in vel)
    import math
    ang = 0.5 * math.atan2(2 * sxy, sxx - syy); ax = (math.cos(ang), math.sin(ang))
    proj = sorted((x * ax[0] + y * ax[1] for x, y in vel), key=abs); fast = proj[int(len(proj) * 0.75):]
    sg = 1.0 if sum(fast) >= 0 else -1.0
    v, err = fit_ground_speed(tr, fps, (ax[0] * sg, ax[1] * sg))
    ys = np.concatenate([T[j][:, 1] for j in T]); H = ys.max() - ys.min()
    return [J['nodes'][f]['name'] for f in feet], v / H, err / H
