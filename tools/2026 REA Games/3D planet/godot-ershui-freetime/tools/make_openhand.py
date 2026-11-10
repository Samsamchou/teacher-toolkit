# -*- coding: utf-8 -*-
"""張開的右手（通用版）：把左手鏡射成右手，輸出 assets/models/<角色>_openhand.glb（不改原模型）

執行：python -I tools/make_openhand.py ken      → ken_openhand.glb
      python -I tools/make_openhand.py zunbo    → zunbo_openhand.glb
需要：tools/<角色>_openhand_corr.json（Godot 輸出的 T-pose 對齊資料；重做方法：
      CHAR=<角色>_rigged DUMP_CORR=<絕對路徑> Godot --path . res://scenes/openhand_check.tscn）

做法（全部離線，遊戲執行時不花時間）：
 1. 左手網格＝從指尖沿著網格往回走到切口（一圈邊界）。
 2. 鏡射矩陣 S（左手骨座標 → 右手骨座標）：在「對齊 Mixamo T-pose 之後」的世界裡左右對稱（x → -x）。
    原始姿勢不是 T-pose（Ken 右手舉高、圳寶左手舉高），所以不能直接在模型空間鏡射。
 3. 右手手指骨頭的靜止姿勢改成左手的鏡射；inverse bind matrix 跟著重算。
 4. 刪掉舊右手，新手接上去，新舊切口之間補一圈（沒有破洞）。
 5. 檔案內 walk／idle 動畫的右手手指軌道改成左手手指的鏡射。
 6. 貼圖不內嵌，直接用 <角色>_rigged_*.jpg/png（和原模型共用）。

角色差異（CFG）：
 - ken：切口用「手骨 y」；左手切在袖口裡的手腕、右手連手套一起刪；補皮用手背膚色。
 - zunbo：Tripo 把右手骨（RightHand）綁歪了約 75 度（拳頭沒有手指可參考），手骨 y 不是前臂方向
   → 切口改用「前臂方向」；右手骨的靜止旋轉也改成左手的鏡射（walk 動畫的右手腕軌道一起改成左手鏡射），
   不然新手在站姿／走路時會折到旁邊。左右兩邊都切在前臂橘色環（離手腕 9 公分），
   整段「藍綠色護腕＋手」一起換成左邊的鏡射；補的一圈用切口附近顏色的中位數。
"""
import json
import os
import struct
import sys
from collections import defaultdict

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MODELS = os.path.join(ROOT, "assets", "models")

CFG = {
    "ken": dict(axis="hand", left_cut=-0.02, right_cut=-0.03, seed="middle3", fix_hand_rest=False,
                bridge_uv="hand_back", generator="Tripo + tools/make_ken_openhand.py"),
    "zunbo": dict(axis="forearm", left_cut=-0.11, right_cut=-0.11, seed="tip", fix_hand_rest=True,
                  bridge_uv="loop_median", generator="Tripo + tools/make_openhand.py zunbo"),
}
C = {}               # 目前角色的設定（main() 填入）
SRC = DST = CORR = TEX_PREFIX = ""
D = np.diag([-1.0, 1.0, 1.0])   # 骨頭自己座標的鏡射（保留 y＝骨頭方向）


def setup(name):
    global SRC, DST, CORR, TEX_PREFIX
    C.clear()
    C.update(CFG[name])
    SRC = os.path.join(MODELS, name + "_rigged.glb")
    DST = os.path.join(MODELS, name + "_openhand.glb")
    CORR = os.path.join(HERE, name + "_openhand_corr.json")
    TEX_PREFIX = name + "_rigged_"   # Godot 匯入 <角色>_rigged.glb 時抽出的貼圖檔名開頭

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


# ───────── glb 讀寫 ─────────
def load_glb(path):
    d = open(path, "rb").read()
    o = 12
    chunks = []
    while o < len(d):
        cl, _ct = struct.unpack("<II", d[o:o + 8])
        chunks.append(d[o + 8:o + 8 + cl])
        o += 8 + cl
    return json.loads(chunks[0]), chunks[1]


def read_acc(g, b, i):
    a = g["accessors"][i]
    bv = g["bufferViews"][a["bufferView"]]
    dt = CT[a["componentType"]]
    n = NC[a["type"]]
    assert bv.get("byteStride", 0) in (0, np.dtype(dt).itemsize * n)
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    return np.frombuffer(b, dt, a["count"] * n, off).reshape(a["count"], n).copy()


def quat_to_mat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def mat_to_quat(m):
    t = np.trace(m)
    if t > 0:
        s = np.sqrt(t + 1.0) * 2
        q = [(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, 0.25 * s]
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = np.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        q = [0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s]
    elif m[1, 1] > m[2, 2]:
        s = np.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        q = [(m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s]
    else:
        s = np.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        q = [(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s, (m[1, 0] - m[0, 1]) / s]
    q = np.array(q)
    return q / np.linalg.norm(q)


def node_local(n):
    M = np.eye(4)
    M[:3, :3] = quat_to_mat(n.get("rotation", [0, 0, 0, 1])) * np.array(n.get("scale", [1, 1, 1]))
    M[:3, 3] = n.get("translation", [0, 0, 0])
    return M


def node_globals(g):
    par = {}
    for i, n in enumerate(g["nodes"]):
        for c in n.get("children", []):
            par[c] = i
    G = {}

    def get(i):
        if i not in G:
            L = node_local(g["nodes"][i])
            G[i] = L if i not in par else get(par[i]) @ L
        return G[i]
    for i in range(len(g["nodes"])):
        get(i)
    return G, par


def arc(a, b):
    """最短弧旋轉（和 retarget.gd 的做法一樣）"""
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    ax = np.cross(a, b)
    s = np.linalg.norm(ax)
    if s < 1e-9:
        return np.eye(3)
    ax /= s
    ang = np.arctan2(s, a @ b)
    K = np.array([[0, -ax[2], ax[1]], [ax[2], 0, -ax[0]], [-ax[1], ax[0], 0]])
    return np.eye(3) + np.sin(ang) * K + (1 - np.cos(ang)) * K @ K


# ───────── 網格工具 ─────────
def flood_hand(T, Lw, arm_w, seed, ycut):
    """從 seed（指尖）沿三角形往回走；只走「y > ycut 而且屬於這隻手臂」的三角形。回傳三角形遮罩"""
    ok = (Lw[:, 1] > ycut) & (arm_w > 0.5)
    tri_ok = ok[T].all(1)
    adj = defaultdict(set)
    for t in T[tri_ok]:
        adj[t[0]].update((t[1], t[2]))
        adj[t[1]].update((t[0], t[2]))
        adj[t[2]].update((t[0], t[1]))
    seen = {seed}
    q = [seed]
    while q:
        x = q.pop()
        for y in adj[x]:
            if y not in seen:
                seen.add(y)
                q.append(y)
    sv = np.zeros(len(ok), bool)
    sv[list(seen)] = True
    return tri_ok & sv[T].all(1)


def boundary_loops(Tsel):
    """選到的三角形的邊界：回傳幾圈（每圈是依序的焊接頂點編號）"""
    ec = defaultdict(int)
    for t in Tsel:
        for a, c in ((0, 1), (1, 2), (2, 0)):
            ec[tuple(sorted((int(t[a]), int(t[c]))))] += 1
    nb = defaultdict(list)
    for (a, c), v in ec.items():
        if v == 1:
            nb[a].append(c)
            nb[c].append(a)
    loops = []
    left = set(nb.keys())
    while left:
        s = left.pop()
        lp = [s]
        cur = s
        while True:
            nxt = [y for y in nb[cur] if y in left]
            if not nxt:
                break
            cur = nxt[0]
            left.remove(cur)
            lp.append(cur)
        loops.append(lp)
    return loops


def pick_skin_uv(g, UV, lv, w_hand, y_local):
    """手背靠手腕那一帶（左手骨座標 y 0.01～0.04）顏色最接近中位數的頂點的 UV"""
    from PIL import Image
    im = None
    for m in g["images"]:
        if "basecolor" in m["name"]:
            ext = ".png" if m.get("mimeType") == "image/png" else ".jpg"
            im = np.asarray(Image.open(os.path.join(os.path.dirname(DST), TEX_PREFIX + m["name"] + ext)).convert("RGB")).astype(float)
    cand = [v for v in lv if w_hand[v] > 0.8 and 0.01 < y_local[v] < 0.04]
    cols = np.array([im[min(int(UV[v][1] * im.shape[0]), im.shape[0] - 1), min(int(UV[v][0] * im.shape[1]), im.shape[1] - 1)] for v in cand])
    med = np.median(cols, axis=0)
    best = cand[int(np.argmin(np.abs(cols - med).sum(1)))]
    print("手腕補皮膚色：", med.astype(int), "UV", np.round(UV[best], 4))
    return UV[best]


def pick_loop_uv(g, UV, verts):
    """切口一圈頂點的貼圖顏色取中位數，回傳顏色最接近的那個頂點的 UV（補的一圈全用這個顏色）"""
    from PIL import Image
    im = None
    for m in g["images"]:
        if "basecolor" in m["name"]:
            ext = ".png" if m.get("mimeType") == "image/png" else ".jpg"
            im = np.asarray(Image.open(os.path.join(os.path.dirname(DST), TEX_PREFIX + m["name"] + ext)).convert("RGB")).astype(float)
    cand = list(verts)
    cols = np.array([im[min(int(UV[v][1] * im.shape[0]), im.shape[0] - 1), min(int(UV[v][0] * im.shape[1]), im.shape[1] - 1)] for v in cand])
    med = np.median(cols, axis=0)
    best = cand[int(np.argmin(np.abs(cols - med).sum(1)))]
    print("切口補色：", med.astype(int), "UV", np.round(UV[best], 4))
    return UV[best]


def main(name="ken"):
    sys.stdout.reconfigure(encoding="utf-8")
    setup(name)
    g, b = load_glb(SRC)
    corr = json.load(open(CORR, encoding="utf-8"))
    names = [n.get("name", "").split(":")[-1] for n in g["nodes"]]
    idx = {n: i for i, n in enumerate(names)}
    G, par = node_globals(g)
    skin = g["skins"][0]
    J = skin["joints"]
    joint_of = {n: k for k, n in enumerate(J)}   # 節點 → skin 內的 joint 編號
    prim = g["meshes"][0]["primitives"][0]
    at = prim["attributes"]
    P = read_acc(g, b, at["POSITION"]).astype(np.float64)
    N = read_acc(g, b, at["NORMAL"]).astype(np.float64)
    UV = read_acc(g, b, at["TEXCOORD_0"])
    JN = read_acc(g, b, at["JOINTS_0"]).astype(np.int64)
    W = read_acc(g, b, at["WEIGHTS_0"]).astype(np.float64)
    I = read_acc(g, b, prim["indices"]).reshape(-1, 3).astype(np.int64)
    nv = len(P)
    WN = np.zeros((nv, len(names)))   # 每個頂點對每個節點的權重
    for k in range(4):
        np.add.at(WN, (np.arange(nv), np.array(J)[JN[:, k]]), W[:, k])
    # 焊接（UV 接縫把同一點拆成好幾個頂點）
    key = np.round(P * 1e5).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    inv = inv.ravel()
    T = inv[I]
    nw = inv.max() + 1

    def side_info(side, ycut):
        h = idx[side + "Hand"]
        if C["axis"] == "hand":      # 切口垂直手骨 y
            L = (np.linalg.inv(G[h]) @ np.c_[P, np.ones(nv)].T).T[:, :3]
        else:                        # 切口垂直前臂方向（前臂骨 → 手骨），y＝離手腕多遠
            o = G[h][:3, 3]
            ax = o - G[idx[side + "ForeArm"]][:3, 3]
            ax /= np.linalg.norm(ax)
            L = np.zeros((nv, 3))
            L[:, 1] = (P - o) @ ax
            L[:, 0] = np.linalg.norm((P - o) - np.outer(L[:, 1], ax), axis=1)   # x 放離軸距離（只拿來挑起點）
        Lw = np.zeros((nw, 3))
        Lw[inv] = L
        arm = [i for i, n in enumerate(names) if n.startswith(side + "Hand") or n in (side + "ForeArm", side + "Arm")]
        aw = np.zeros(nw)
        aw[inv] = WN[:, arm].sum(1)
        if C["seed"] == "middle3":
            seed = inv[np.argmax(WN[:, idx[side + "HandMiddle3"]])]
        else:   # 圳寶右手的中指骨幾乎沒綁到頂點 → 起點改用「沿前臂方向最遠、離軸不遠」的手臂頂點（指尖／拳頭頂）
            cand = np.nonzero((aw > 0.5) & (Lw[:, 0] < 0.12))[0]
            seed = cand[np.argmax(Lw[cand, 1])]
        tm = flood_hand(T, Lw, aw, seed, ycut)
        loops = boundary_loops(T[tm])
        assert len(loops) == 1, "%s 手的邊界不是剛好一圈：%s" % (side, [len(x) for x in loops])
        return tm, loops[0], Lw

    left_tm, left_loop, _ = side_info("Left", C["left_cut"])
    right_tm, right_loop, _ = side_info("Right", C["right_cut"])
    print("左手三角形 %d、邊界 %d 點；右手（刪除）三角形 %d、邊界 %d 點" % (left_tm.sum(), len(left_loop), right_tm.sum(), len(right_loop)))

    # ───────── 鏡射矩陣 S：左手骨座標 → 右手骨座標 ─────────
    cb = lambda k: np.array(corr["corr"][k], float).T     # corr：對齊 T-pose 後的世界旋轉
    Mx = np.diag([-1.0, 1.0, 1.0])                         # T-pose 世界的左右鏡射（Mixamo 來源骨架兩臂正好是 ±X）
    HL = cb("lefthand")
    rh_node = g["nodes"][idx["RightHand"]]
    old_rh_rot = quat_to_mat(rh_node.get("rotation", [0, 0, 0, 1]))
    new_rh_rot = node_local(rh_node)[:3, :3]   # 不改時照原樣（含節點 scale，和舊版 Ken 輸出完全一樣）
    if C["fix_hand_rest"]:
        # 右手骨的靜止旋轉（相對前臂）＝左手相對左前臂的鏡射（在 T-pose 世界裡）
        FL, FR = cb("leftforearm"), cb("rightforearm")
        RLloc = quat_to_mat(g["nodes"][idx["LeftHand"]].get("rotation", [0, 0, 0, 1]))
        new_rh_rot = FR.T @ Mx @ FL @ RLloc @ D
        ang = np.degrees(np.arccos(np.clip((np.trace(old_rh_rot.T @ new_rh_rot) - 1) / 2, -1, 1)))
        print("右手骨靜止旋轉改成左手鏡射：和原本差 %.1f 度" % ang)
        rh_node["rotation"] = [float(x) for x in mat_to_quat(new_rh_rot)]
    B0 = cb("rightforearm") @ new_rh_rot
    mL = np.array(g["nodes"][idx["LeftHandMiddle1"]]["translation"], float)
    ds_r = np.array(corr["src_dir"]["righthand"], float)
    ds_l = np.array(corr["src_dir"]["lefthand"], float)
    print("來源骨架左右對稱誤差（手 → 中指方向）", np.abs(Mx @ ds_l - ds_r).max())
    # 新右手的「手腕 → 中指根」方向（右手骨座標）取左手的鏡射；retarget 會用最短弧把它轉到來源方向 → HR
    HR = arc(B0 @ (D @ mL), ds_r) @ B0
    S = HR.T @ Mx @ HL
    if C["fix_hand_rest"]:
        # 新中指根方向其實是 S·mL（不是 D·mL）→ 反覆算到收斂，retarget 對齊後才完全對稱
        for _ in range(20):
            HR = arc(B0 @ (S @ mL), ds_r) @ B0
            S = HR.T @ Mx @ HL
    assert abs(np.linalg.det(S) + 1) < 1e-6
    roll = np.degrees(np.arctan2((S @ D)[0, 2], (S @ D)[0, 0]))
    print("S =\n", np.round(S, 4), "\n（等於單純鏡射 diag(-1,1,1) 再繞骨頭軸轉 %.1f 度）" % roll)
    print("檢查：S·左中指根 = %s；單純鏡射 = %s（差 %.2f mm）" % (np.round(S @ mL, 4), np.round(D @ mL, 4), np.linalg.norm(S @ mL - D @ mL) * 1000))

    # ───────── 右手手指骨頭：靜止姿勢改成左手的鏡射 ─────────
    fingers = ["Thumb", "Index", "Middle", "Ring", "Pinky"]
    old_right_local = {}
    for f in fingers:
        for k in range(1, 5):
            ln = g["nodes"][idx["LeftHand%s%d" % (f, k)]]
            rn = g["nodes"][idx["RightHand%s%d" % (f, k)]]
            old_right_local[rn["name"]] = node_local(rn)
            Rl = quat_to_mat(ln.get("rotation", [0, 0, 0, 1]))
            tl = np.array(ln.get("translation", [0, 0, 0]), float)
            if k == 1:
                Rr = S @ Rl @ D
                tr = S @ tl
            else:
                Rr = D @ Rl @ D
                tr = D @ tl
            rn["rotation"] = [float(x) for x in mat_to_quat(Rr)]
            rn["translation"] = [float(x) for x in tr]
            rn.pop("scale", None)
    G2, _ = node_globals(g)
    # 驗證：新右手每個手指關節（右手骨座標）＝ S × 左手關節（左手骨座標）；並列出原本拳頭關節差多少
    GLi = np.linalg.inv(G[idx["LeftHand"]])
    GRi = np.linalg.inv(G2[idx["RightHand"]])
    GRi_old = np.linalg.inv(G[idx["RightHand"]])
    worst_new = 0.0
    worst_old = 0.0
    for f in fingers:
        for k in range(1, 5):
            pl = (GLi @ G[idx["LeftHand%s%d" % (f, k)]])[:3, 3]
            pr = (GRi @ G2[idx["RightHand%s%d" % (f, k)]])[:3, 3]
            po = (GRi_old @ G[idx["RightHand%s%d" % (f, k)]])[:3, 3]
            worst_new = max(worst_new, np.linalg.norm(S @ pl - pr))
            worst_old = max(worst_old, np.linalg.norm(S @ pl - po))
    print("手指關節鏡射誤差：新骨架最大 %.4f mm；原本（拳頭）骨架最大 %.1f mm" % (worst_new * 1000, worst_old * 1000))
    # T-pose 世界再驗一次：左手關節鏡射（x → -x）＝右手關節（相對手腕）
    worst_t = 0.0
    for f in fingers:
        for k in range(1, 5):
            pl = HL @ (GLi @ G[idx["LeftHand%s%d" % (f, k)]])[:3, 3]
            pr = HR @ (GRi @ G2[idx["RightHand%s%d" % (f, k)]])[:3, 3]
            worst_t = max(worst_t, np.linalg.norm(Mx @ pl - pr))
    print("T-pose 世界左右對稱誤差（20 個手指關節）最大 %.4f mm" % (worst_t * 1000))

    IBM = read_acc(g, b, skin["inverseBindMatrices"]).astype(np.float64).reshape(-1, 4, 4).transpose(0, 2, 1)
    for k, j in enumerate(J):
        if names[j].startswith("RightHand") and (names[j] != "RightHand" or C["fix_hand_rest"]):
            IBM[k] = np.linalg.inv(G2[j])

    # ───────── 新網格 ─────────
    keep_tri = ~right_tm
    # 還有沒有剩下的右手頂點（例如小道具的碎片）？有就一起刪
    rh_nodes = [i for i, n in enumerate(names) if n.startswith("RightHand")]
    rh_w = WN[:, rh_nodes].sum(1)
    extra = keep_tri & (rh_w[I] > 0.5).all(1)
    print("額外刪除的右手殘留三角形：%d" % extra.sum())
    keep_tri &= ~extra
    used = np.zeros(nv, bool)
    used[I[keep_tri].ravel()] = True
    remap = -np.ones(nv, np.int64)
    remap[used] = np.arange(used.sum())
    oP, oN, oUV, oJ, oW = [P[used]], [N[used]], [UV[used]], [JN[used]], [W[used]]
    oI = [remap[I[keep_tri]]]
    base = int(used.sum())
    # 左手 → 鏡射成右手
    lt = I[left_tm]
    lv = np.unique(lt.ravel())
    lmap = -np.ones(nv, np.int64)
    lmap[lv] = base + np.arange(len(lv))
    XF = G2[idx["RightHand"]] @ np.block([[S, np.zeros((3, 1))], [np.zeros((1, 3)), np.ones((1, 1))]]) @ np.linalg.inv(G[idx["LeftHand"]])
    hP = (XF @ np.c_[P[lv], np.ones(len(lv))].T).T[:, :3]
    hN = (XF[:3, :3] @ N[lv].T).T
    hN /= np.linalg.norm(hN, axis=1, keepdims=True)
    l2r = {}
    for k, j in enumerate(J):
        if names[j].startswith("Left"):
            l2r[k] = joint_of[idx["Right" + names[j][4:]]]
    hJ = JN[lv].copy()
    for k, r in l2r.items():
        hJ[JN[lv] == k] = r
    bad = [names[J[k]] for k in np.unique(JN[lv][W[lv] > 0]) if k not in l2r]
    assert not bad, "左手頂點有不是左邊骨頭的權重：%s" % bad
    oP.append(hP)
    oN.append(hN)
    oUV.append(UV[lv])
    oJ.append(hJ)
    oW.append(W[lv])
    oI.append(lmap[lt][:, [0, 2, 1]])   # 鏡射後三角形要反過來繞
    base += len(lv)

    # ───────── 手腕接合：新手的手腕一圈（A） ↔ 袖口裡舊手腕的洞（B），中間補一圈皮膚 ─────────
    rep_of = {}   # 焊接點 → 一個代表頂點
    for vi in range(nv):
        rep_of.setdefault(int(inv[vi]), vi)
    # 代表頂點要選「屬於那一邊」的：A 用左手三角形裡的頂點、B 用留下來的頂點
    repA = {}
    for vi in lv:
        repA.setdefault(int(inv[vi]), int(vi))
    repB = {}
    for vi in np.nonzero(used)[0]:
        repB.setdefault(int(inv[vi]), int(vi))
    A_src = [repA[w] for w in left_loop]
    # 原模型這裡有一個點只屬於被刪掉的三角形（原本就缺一片）→ 洞的邊只取留下來的點
    B_src = [repB[w] for w in right_loop if w in repB]
    GRH = G2[idx["RightHand"]]
    if C["axis"] == "forearm":   # 接合用的座標：原點＝右手腕、y＝前臂方向（圳寶的手骨 y 不沿前臂）
        ax = GRH[:3, 3] - G2[idx["RightForeArm"]][:3, 3]
        ax /= np.linalg.norm(ax)
        xx = np.cross(ax, [0.0, 0.0, 1.0])
        xx /= np.linalg.norm(xx)
        GRH = np.eye(4)
        GRH[:3, 0], GRH[:3, 1], GRH[:3, 2] = xx, ax, np.cross(xx, ax)
        GRH[:3, 3] = G2[idx["RightHand"]][:3, 3]
    GRHi = np.linalg.inv(GRH)
    A_pos = hP[[int(lmap[v] - (base - len(lv))) for v in A_src]]
    B_pos = P[B_src]
    to_local = lambda X: (GRHi @ np.c_[X, np.ones(len(X))].T).T[:, :3]
    Al = to_local(A_pos)
    Bl = to_local(B_pos)
    print("手腕接合：新手手腕圈 y=%.4f、半徑 %.4f～%.4f；袖口洞 y=%.4f、半徑 %.4f～%.4f（右手骨座標）" % (
        Al[:, 1].mean(), np.hypot(Al[:, 0] - Al[:, 0].mean(), Al[:, 2] - Al[:, 2].mean()).min(), np.hypot(Al[:, 0] - Al[:, 0].mean(), Al[:, 2] - Al[:, 2].mean()).max(),
        Bl[:, 1].mean(), np.hypot(Bl[:, 0] - Bl[:, 0].mean(), Bl[:, 2] - Bl[:, 2].mean()).min(), np.hypot(Bl[:, 0] - Bl[:, 0].mean(), Bl[:, 2] - Bl[:, 2].mean()).max()))
    cen = (Al.mean(0) + Bl.mean(0)) * 0.5
    angA = np.arctan2(Al[:, 2] - cen[2], Al[:, 0] - cen[0])
    angB = np.arctan2(Bl[:, 2] - cen[2], Bl[:, 0] - cen[0])
    oa = np.argsort(angA)
    ob = np.argsort(angB)
    # B 圈：新頂點（位置＝洞的邊、權重＝原本袖口那個點、UV＝角度最近的手腕點 → 皮膚色）
    bP, bN, bUV, bJ, bW = [], [], [], [], []
    axis_w = GRH[:3, 1]
    for k in range(len(B_src)):
        dth = np.abs(np.angle(np.exp(1j * (angA - angB[k]))))
        na = A_src[int(np.argmin(dth))]
        bP.append(B_pos[k])
        r = B_pos[k] - (GRH[:3, 3] + axis_w * ((B_pos[k] - GRH[:3, 3]) @ axis_w))
        bN.append(r / np.linalg.norm(r))
        bUV.append(UV[na])
        bJ.append(JN[B_src[k]])
        bW.append(W[B_src[k]])
    # 補的這圈皮膚全部用同一個膚色 UV（手腕 UV 剛好在貼圖接縫上，直接內插會拉出灰色條紋）
    if C["bridge_uv"] == "hand_back":
        skin_uv = pick_skin_uv(g, UV, lv, WN[:, idx["LeftHand"]], (np.linalg.inv(G[idx["LeftHand"]]) @ np.c_[P, np.ones(nv)].T).T[:, 1])
    else:   # 兩個切口上所有頂點（含 UV 接縫拆開的）顏色中位數
        loopw = set(left_loop) | set(right_loop)
        skin_uv = pick_loop_uv(g, UV, [v for v in range(nv) if int(inv[v]) in loopw])
    bUV = [skin_uv for _ in bUV]
    nB = len(B_src)
    for k in range(len(A_src)):       # A 圈：位置同新手的手腕點，另開頂點（膚色 UV、朝外法線）
        v = A_src[k]
        bP.append(A_pos[k])
        r = A_pos[k] - (GRH[:3, 3] + axis_w * ((A_pos[k] - GRH[:3, 3]) @ axis_w))
        bN.append(r / np.linalg.norm(r))
        bUV.append(skin_uv)
        bJ.append(hJ[int(lmap[v]) - (base - len(lv))])
        bW.append(W[v])
    b_idx = [base + k for k in range(nB)]
    a_idx = [base + nB + k for k in range(len(A_src))]
    # 兩圈依角度排好，一路往前接三角形
    ia, ib = 0, 0
    na_, nb_ = len(oa), len(ob)
    # 起點：B 的第一個點對到角度最近的 A
    start_a = int(np.argmin(np.abs(np.angle(np.exp(1j * (angA[oa] - angB[ob[0]]))))))
    oa = np.roll(oa, -start_a)
    sa = np.unwrap(np.r_[angA[oa], angA[oa[0]] + 2 * np.pi])
    sb = np.unwrap(np.r_[angB[ob], angB[ob[0]] + 2 * np.pi])
    sa += np.round((sb[0] - sa[0]) / (2 * np.pi)) * 2 * np.pi
    tris = []
    while ia < na_ or ib < nb_:
        a0 = a_idx[oa[ia % na_]]
        b0 = b_idx[ob[ib % nb_]]
        if ib >= nb_ or (ia < na_ and sa[ia + 1] <= sb[ib + 1]):
            tris.append([a0, a_idx[oa[(ia + 1) % na_]], b0])
            ia += 1
        else:
            tris.append([b0, a0, b_idx[ob[(ib + 1) % nb_]]])
            ib += 1
    allP = np.vstack(oP + [np.array(bP)])
    tris = np.array(tris)
    # 朝外：三角形法線要和「離手臂軸往外」同方向
    flipped = 0
    for t in tris:
        c = allP[t].mean(0)
        nrm = np.cross(allP[t[1]] - allP[t[0]], allP[t[2]] - allP[t[0]])
        rad = c - (GRH[:3, 3] + axis_w * ((c - GRH[:3, 3]) @ axis_w))
        if nrm @ rad < 0:
            t[1], t[2] = t[2], t[1]
            flipped += 1
    print("手腕補皮：%d 個三角形（翻面 %d 個）" % (len(tris), flipped))
    oP.append(np.array(bP))
    oN.append(np.array(bN))
    oUV.append(np.array(bUV))
    oJ.append(np.array(bJ))
    oW.append(np.array(bW))
    oI.append(tris)

    P2 = np.vstack(oP).astype(np.float32)
    N2 = np.vstack(oN).astype(np.float32)
    UV2 = np.vstack(oUV).astype(np.float32)
    J2 = np.vstack(oJ).astype(np.uint8)
    W2 = np.vstack(oW).astype(np.float32)
    I2 = np.vstack(oI).astype(np.uint16).reshape(-1, 1)
    assert len(P2) < 65536
    print("新網格：頂點 %d（原 %d）、三角形 %d（原 %d）" % (len(P2), nv, len(I2) // 3, len(I)))

    # ───────── 輸出：重排 buffer（貼圖改外部檔，和 ken_rigged 共用） ─────────
    data = {}
    for i in range(len(g["accessors"])):
        data[i] = read_acc(g, b, i)
    data[at["POSITION"]] = P2
    data[at["NORMAL"]] = N2
    data[at["TEXCOORD_0"]] = UV2
    data[at["JOINTS_0"]] = J2
    data[at["WEIGHTS_0"]] = W2
    data[prim["indices"]] = I2
    data[skin["inverseBindMatrices"]] = IBM.transpose(0, 2, 1).reshape(-1, 16).astype(np.float32)
    targets = {at[k]: 34962 for k in at}
    targets[prim["indices"]] = 34963

    # 動畫：右手手指的軌道 ← 左手手指軌道的鏡射
    def new_accessor(arr, typ):
        g["accessors"].append({"componentType": 5126, "count": len(arr), "type": typ})
        data[len(g["accessors"]) - 1] = arr.astype(np.float32)
        return len(g["accessors"]) - 1

    n_tracks = 0
    for an in g.get("animations", []):
        chan = {(c["target"]["node"], c["target"]["path"]): c for c in an["channels"]}
        rc = chan.get((idx["RightHand"], "rotation"))
        lc = chan.get((idx["LeftHand"], "rotation"))
        if C["fix_hand_rest"] and rc is not None:
            # 右手腕軌道＝左手腕軌道的鏡射（和新的靜止旋轉同一個公式）；左邊沒有軌道就拿掉、用靜止姿勢
            if lc is None:
                an["channels"].remove(rc)
            else:
                ls = an["samplers"][lc["sampler"]]
                src = data[ls["output"]].astype(np.float64)
                out = np.zeros_like(src)
                prev = None
                for r in range(len(src)):
                    q = mat_to_quat(FR.T @ Mx @ FL @ quat_to_mat(src[r]) @ D)
                    if prev is not None and q @ prev < 0:
                        q = -q
                    out[r] = q
                    prev = q
                an["samplers"].append({"input": ls["input"], "output": new_accessor(out, "VEC4"), "interpolation": ls.get("interpolation", "LINEAR")})
                rc["sampler"] = len(an["samplers"]) - 1
                n_tracks += 1
        for f in fingers:
            for k in range(1, 5):
                rn = idx["RightHand%s%d" % (f, k)]
                ln = idx["LeftHand%s%d" % (f, k)]
                for path in ("rotation", "translation", "scale"):
                    rc = chan.get((rn, path))
                    lc = chan.get((ln, path))
                    if rc is None:
                        continue
                    if lc is None:   # 左邊沒有這條軌道 → 右邊這條拿掉（用靜止姿勢）
                        an["channels"].remove(rc)
                        continue
                    ls = an["samplers"][lc["sampler"]]
                    src = data[ls["output"]].astype(np.float64)
                    if path == "rotation":
                        out = np.zeros_like(src)
                        prev = None
                        for r in range(len(src)):
                            Rl = quat_to_mat(src[r])
                            q = mat_to_quat((S @ Rl @ D) if k == 1 else (D @ Rl @ D))
                            if prev is not None and q @ prev < 0:
                                q = -q
                            out[r] = q
                            prev = q
                        typ = "VEC4"
                    elif path == "translation":
                        out = (((S if k == 1 else D) @ src.T).T)
                        typ = "VEC3"
                    else:
                        out = src
                        typ = "VEC3"
                    an["samplers"].append({"input": ls["input"], "output": new_accessor(out, typ), "interpolation": ls.get("interpolation", "LINEAR")})
                    rc["sampler"] = len(an["samplers"]) - 1
                    n_tracks += 1
    print("動畫：右手手指軌道改成左手鏡射 %d 條" % n_tracks)

    # 沒用到的 accessor 不寫資料（舊的右手手指軌道）
    used_acc = set(at.values()) | {prim["indices"], skin["inverseBindMatrices"]}
    for an in g.get("animations", []):
        ch_s = {c["sampler"] for c in an["channels"]}
        for si, s in enumerate(an["samplers"]):
            if si in ch_s:
                used_acc.update((s["input"], s["output"]))
    blob = bytearray()
    views = []
    for i, a in enumerate(g["accessors"]):
        arr = data[i] if i in used_acc else np.zeros((1, NC[a["type"]]), CT[a["componentType"]])
        arr = np.ascontiguousarray(arr.astype(CT[a["componentType"]]))
        while len(blob) % 4:
            blob.append(0)
        bv = {"buffer": 0, "byteOffset": len(blob), "byteLength": arr.nbytes}
        if i in targets:
            bv["target"] = targets[i]
        blob += arr.tobytes()
        views.append(bv)
        a["bufferView"] = i
        a.pop("byteOffset", None)
        a["count"] = len(arr)
        if i == at["POSITION"]:
            a["min"] = [float(x) for x in arr.min(0)]
            a["max"] = [float(x) for x in arr.max(0)]
        elif i not in used_acc:
            a.pop("min", None)
            a.pop("max", None)
    while len(blob) % 4:
        blob.append(0)
    g["bufferViews"] = views
    g["buffers"] = [{"byteLength": len(blob)}]
    for im in g["images"]:
        ext = ".png" if im.get("mimeType") == "image/png" else ".jpg"
        fn = TEX_PREFIX + im["name"] + ext
        assert os.path.exists(os.path.join(os.path.dirname(DST), fn)), "找不到貼圖 " + fn
        im.pop("bufferView", None)
        im.pop("mimeType", None)
        im["uri"] = fn
    g["asset"]["generator"] = C["generator"]
    js = json.dumps(g, separators=(",", ":")).encode("utf-8")
    while len(js) % 4:
        js += b" "
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(DST, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A))
        f.write(js)
        f.write(struct.pack("<II", len(blob), 0x004E4942))
        f.write(bytes(blob))
    print("寫出 %s（%.0f KB）" % (DST, total / 1024))


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "ken"))
