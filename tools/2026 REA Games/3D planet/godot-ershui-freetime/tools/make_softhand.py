# -*- coding: utf-8 -*-
"""水鈴的軟手：手指圓一點、厚一點（Q 版），輸出 assets/models/shuiling_softhand.glb（原模型 shuiling_rigged.glb 不動）

執行：python -I tools/make_softhand.py            → shuiling_softhand.glb
原因：Tripo 給水鈴的手只有約 120 個頂點，手指是細長尖三角形，近看像尖刺。
做法（只改手的頂點位置和法線，骨架、權重、貼圖、動畫全部不動；檔案結構完全相同，只改 BIN 裡的數字）：
 1. 手的範圍＝「手骨＋手指骨」權重合計 > 0.5 的頂點；離袖口越近（手骨權重越小）改得越少，袖口完全不動。
 2. 同一位置的頂點（貼圖接縫拆開的）先焊在一起，才找得到鄰居。
 3. Taubin 平滑（λ=0.5、μ=-0.53，各 8 輪）：尖角變圓、整體不縮小。
 4. 沿法線往外撐 INFLATE（模型單位；遊戲裡約 3.4 mm）：手指變厚一點。
 5. 指尖（離手腕最遠、只有一兩個鄰居的點）再往鄰居平均拉 40%：圓頭。
 6. 重算手的法線（面積加權）。
"""
import json
import os
import struct
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(os.path.dirname(HERE), "assets", "models")
SRC = os.path.join(MODELS, "shuiling_rigged.glb")
DST = os.path.join(MODELS, "shuiling_softhand.glb")
INFLATE = 0.0028      # 模型單位（模型高 0.98 → 遊戲 1.2，×1.22 ≈ 3.4 mm）
ROUNDS = 8
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def load_glb(path):
    d = open(path, "rb").read()
    o = 12
    chunks = []
    while o < len(d):
        cl, _ = struct.unpack("<II", d[o:o + 8])
        chunks.append(bytearray(d[o + 8:o + 8 + cl]))
        o += 8 + cl
    return d[:12], json.loads(chunks[0]), chunks[0], chunks[1]


def acc_view(g, b, i):
    a = g["accessors"][i]
    bv = g["bufferViews"][a["bufferView"]]
    dt = CT[a["componentType"]]
    n = NC[a["type"]]
    assert bv.get("byteStride", 0) in (0, np.dtype(dt).itemsize * n)
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    return off, np.frombuffer(bytes(b), dt, a["count"] * n, off).reshape(a["count"], n).copy()


def vertex_normals(P, T, idx):
    N = np.zeros_like(P)
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])   # 面積加權
    for k in range(3):
        np.add.at(N, T[:, k], fn)
    return N[idx]


def main():
    head, g, js, b = load_glb(SRC)
    prim = g["meshes"][0]["primitives"][0]
    at = prim["attributes"]
    p_off, P = acc_view(g, b, at["POSITION"])
    n_off, N = acc_view(g, b, at["NORMAL"])
    _, J = acc_view(g, b, at["JOINTS_0"])
    _, W = acc_view(g, b, at["WEIGHTS_0"])
    _, I = acc_view(g, b, prim["indices"])
    T = I.reshape(-1, 3).astype(np.int64)
    W = W.astype(np.float64)
    if W.max() > 1.5:
        W = W / 255.0
    names = [g["nodes"][j]["name"] for j in g["skins"][0]["joints"]]
    is_f = np.array([("Hand" in n) and not n.endswith("Hand") for n in names])
    is_h = np.array([n.endswith("LeftHand") or n.endswith("RightHand") for n in names])
    fw = (W * is_f[J]).sum(1)
    hw = (W * (is_f | is_h)[J]).sum(1)
    sel = hw > 0.5
    amt = np.clip((hw - 0.5) / 0.4, 0.0, 1.0)   # 袖口附近改得少
    print("手的頂點 %d（手指權重>0.5：%d）" % (sel.sum(), (fw > 0.5).sum()))

    # 焊接同位置頂點
    key = np.round(P / 1e-6).astype(np.int64)
    _, weld, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.reshape(-1)
    Pw = P[weld].astype(np.float64)
    Tw = inv[T]
    nW = len(Pw)
    sel_w = np.zeros(nW, bool)
    amt_w = np.zeros(nW)
    np.maximum.at(amt_w, inv, amt * sel)
    sel_w[inv[sel]] = True
    nb = [set() for _ in range(nW)]
    for a, c, d in Tw:
        nb[a].update((c, d))
        nb[c].update((a, d))
        nb[d].update((a, c))
    hv = np.where(sel_w)[0]

    def smooth(X, lam):
        Y = X.copy()
        for v in hv:
            if nb[v]:
                avg = X[list(nb[v])].mean(0)
                Y[v] = X[v] + lam * amt_w[v] * (avg - X[v])
        return Y

    X = Pw.copy()
    for _ in range(ROUNDS):
        X = smooth(X, 0.5)
        X = smooth(X, -0.53)
    Nn = vertex_normals(X, Tw, np.arange(nW))
    Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-12
    X[hv] += Nn[hv] * INFLATE * amt_w[hv, None]
    # 指尖圓頭：手指權重高、在手的範圍邊緣（離手中心最遠的 15%）
    cen_l = X[hv][X[hv][:, 0] > 0].mean(0)
    cen_r = X[hv][X[hv][:, 0] < 0].mean(0)
    dist = np.array([np.linalg.norm(X[v] - (cen_l if X[v, 0] > 0 else cen_r)) for v in hv])
    tips = hv[dist > np.quantile(dist, 0.85)]
    for v in tips:
        avg = X[list(nb[v])].mean(0)
        X[v] = X[v] + 0.4 * amt_w[v] * (avg - X[v])
    # 7. 手指長度補回來：平滑會讓手指縮短 → 每根手指沿「指根 → 原本指尖」方向往外拉，
    #    越靠指尖拉越多（指根不動），讓新的指尖落在原本指尖 ±1 mm 內；手指還是一樣圓、一樣粗
    _, IBM = acc_view(g, b, g["skins"][0]["inverseBindMatrices"])
    IBM = IBM.reshape(-1, 4, 4).transpose(0, 2, 1)   # glTF 是 column-major
    jpos = np.array([np.linalg.inv(m)[:3, 3] for m in IBM])
    dom = J[np.arange(len(J)), np.argmax(W, axis=1)]   # 每個頂點權重最大的骨頭
    dom_w = dom[weld]   # 焊接後每組用代表頂點的主骨
    report = []
    for side in ["Left", "Right"]:
        for fn in ["Thumb", "Index", "Middle", "Ring", "Pinky"]:
            jidx = [i for i, n in enumerate(names) if (side + "Hand" + fn) in n]
            if not jidx:
                continue
            root_j = [i for i in jidx if names[i].endswith(fn + "1")]
            root = jpos[root_j[0]] if root_j else jpos[jidx[0]]
            grp = np.array([v for v in hv if dom_w[v] in jidx])
            if len(grp) == 0:
                continue
            d0 = Pw[grp] - root
            tip_i = grp[np.argmax(np.linalg.norm(d0, axis=1))]
            dirv = (Pw[tip_i] - root)
            L0 = np.linalg.norm(dirv)
            dirv /= L0
            proj_old = (Pw[grp] - root) @ dirv
            proj_new = (X[grp] - root) @ dirv
            need = proj_old.max() - proj_new.max()
            # 指尖點整個拉回原位（越靠指尖越多，指根不動）
            off = Pw[tip_i] - X[tip_i]
            pn = (X[grp] - root) @ dirv
            dtip = np.linalg.norm(X[grp] - X[tip_i], axis=1)
            Rf = 0.6 * L0   # 影響範圍：手指長的 6 成，離指尖越遠越少
            t2 = np.clip(1.0 - dtip / Rf, 0.0, 1.0) ** 2
            X[grp] += np.outer(t2, off)
            # 拉完如果別的點反而比原本指尖更長，整根往指根收回（只收超出的部分）
            over = ((X[grp] - root) @ dirv).max() - proj_old.max()
            if over > 0:
                pnn = np.clip((X[grp] - root) @ dirv / max(proj_old.max(), 1e-6), 0.0, 1.0) ** 3
                X[grp] -= np.outer(pnn * over, dirv)
            after = ((X[grp] - root) @ dirv).max() - proj_old.max()
            tip_err = np.linalg.norm(X[tip_i] - Pw[tip_i])
            report.append((side + fn, need, after, tip_err))
    for nm, need, after, te in report:
        print("  %-12s 平滑後短了 %5.2f mm → 補回後長度差 %+.2f mm、指尖點離原位置 %.2f mm（遊戲尺寸）" % (nm, need * 1224, after * 1224, te * 1224))
    moved = np.linalg.norm(X - Pw, axis=1)
    print("移動量（模型單位）：平均 %.4f、最大 %.4f；指尖圓頭 %d 點" % (moved[hv].mean(), moved.max(), len(tips)))

    # 寫回（未焊接的每個頂點拿焊接點的新位置）；手的法線重算
    P2 = P.copy()
    P2[sel | (amt > 0)] = X[inv][sel | (amt > 0)].astype(np.float32)
    Nn2 = vertex_normals(X, Tw, np.arange(nW))
    Nn2 /= np.linalg.norm(Nn2, axis=1, keepdims=True) + 1e-12
    N2 = N.copy()
    N2[sel] = Nn2[inv][sel].astype(np.float32)
    b[p_off:p_off + P2.nbytes] = P2.astype(np.float32).tobytes()
    b[n_off:n_off + N2.nbytes] = N2.astype(np.float32).tobytes()
    a = g["accessors"][at["POSITION"]]
    a["min"] = [float(x) for x in P2.min(0)]
    a["max"] = [float(x) for x in P2.max(0)]
    g["asset"]["generator"] = "Tripo + tools/make_softhand.py"
    js2 = json.dumps(g, separators=(",", ":")).encode("utf-8")
    while len(js2) % 4:
        js2 += b" "
    total = 12 + 8 + len(js2) + 8 + len(b)
    with open(DST, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js2), 0x4E4F534A))
        f.write(js2)
        f.write(struct.pack("<II", len(b), 0x004E4942))
        f.write(bytes(b))
    print("寫出 %s（%.0f KB）" % (DST, total / 1024))


if __name__ == "__main__":
    sys.exit(main())
