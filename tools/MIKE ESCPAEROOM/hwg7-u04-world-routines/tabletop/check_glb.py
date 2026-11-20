"""Report each GLB in models/: bones, finger bones per hand, vertices weighted to each hand's fingers, triangle count."""
import json, struct, sys
from pathlib import Path
import numpy as np

CT = {5120: 'i1', 5121: 'u1', 5122: '<i2', 5123: '<u2', 5125: '<u4', 5126: '<f4'}
N = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
for path in sorted((Path(__file__).resolve().parent / 'models').glob('*.glb')):
    raw = path.read_bytes(); jl = struct.unpack('<I', raw[12:16])[0]
    g = json.loads(raw[20:20 + jl]); binary = raw[20 + jl + 8:]

    def acc(i):
        a = g['accessors'][i]; v = g['bufferViews'][a['bufferView']]; n = N[a['type']]
        dt = np.dtype(CT[a['componentType']]); start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = v.get('byteStride') or dt.itemsize * n
        if stride == dt.itemsize * n:
            return np.frombuffer(binary, dt, a['count'] * n, start).reshape(a['count'], n)
        return np.array([np.frombuffer(binary, dt, n, start + k * stride) for k in range(a['count'])])

    tris = sum(g['accessors'][p['indices']]['count'] // 3 for m in g['meshes'] for p in m['primitives'])
    line = f'{path.name}: {tris} tris'
    if g.get('skins'):
        joints = [g['nodes'][j]['name'] for j in g['skins'][0]['joints']]
        line += f', {len(joints)} bones'
        for side in ('Left', 'Right'):
            fingers = [k for k, n in enumerate(joints) if side + 'Hand' in n and n.split(side + 'Hand')[-1]]
            hand = [k for k, n in enumerate(joints) if n.endswith(side + 'Hand')]
            count = {'f': 0, 'h': 0}
            for m in g['meshes']:
                for p in m['primitives']:
                    J = acc(p['attributes']['JOINTS_0']); W = acc(p['attributes']['WEIGHTS_0']).astype(float)
                    top = J[np.arange(len(J)), W.argmax(1)]
                    count['f'] += int(np.isin(top, fingers).sum()); count['h'] += int(np.isin(top, hand).sum())
            line += f' | {side}: {len(fingers)} finger bones, {count["f"]} finger verts, {count["h"]} palm verts'
    print(line)
