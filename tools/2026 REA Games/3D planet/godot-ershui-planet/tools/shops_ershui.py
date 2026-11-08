"""二水街屋清冊（老師 2026-11-08 核對；來源：資料/街屋清冊-初稿-20261108.md）。

- 只放店家、公共設施與廟；一般住家不放名字與門牌（RDQ ②）。
- 店名：在地店家用真名；連鎖品牌用通用名（RDQ 2B），例：7-ELEVEN／萊爾富 → 便利商店、八方雲集 → 水餃店。
- 位置：沿著 OSM 上同名道路，用幾個已知座標的門牌（ANCHORS）內插出門牌位置，再找那一側最近的臨街建築。
- kind：門面圖（tools/make_storefronts.py 畫的 2.5D 店面圖）＋招牌顏色。
"""
import math

# 已知座標的門牌（OSM 點或建築中心；資料/街屋清冊）
ANCHORS = {
    "光文路": [(1, 23.81300, 120.61800), (9, 23.8127731, 120.6180030), (103, 23.81187, 120.61686), (131, 23.81180, 120.61640)],
    "員集路四段": [(1, 23.81139, 120.61591), (8, 23.81136, 120.61611)],
    "員集路三段": [(739, 23.81120, 120.61542), (678, 23.81011, 120.61594), (488, 23.80972, 120.61934)],
    "惠民路": [(169, 23.8119492, 120.6194158), (199, 23.81222, 120.61877), (221, 23.81247, 120.61836)],
}

# (顯示名稱, 路, 門牌, 門面種類)
SHOPS = [
    ("自行車出租", "光文路", 6, "bike"),
    ("霖園茶業", "光文路", 10, "tealeaf"),
    ("禾田文創", "光文路", 18, "craft"),
    ("阿琴自助餐", "光文路", 34, "buffet"),
    ("德昌商號", "光文路", 38, "general"),
    ("彩券行", "光文路", 42, "lottery"),
    ("農業資材行", "光文路", 46, "agri"),
    ("真善美理髮廳", "光文路", 55, "hair"),
    ("手心蔥油餅", "光文路", 61, "snack"),
    ("羊肉羹魷魚羹", "光文路", 63, "noodle"),
    ("玉芳茶行", "光文路", 70, "tealeaf"),
    ("早餐店", "光文路", 71, "breakfast"),
    ("錫棟農葯行", "光文路", 76, "agri"),
    ("金永發行", "光文路", 77, "general"),
    ("川仁茗茶行", "光文路", 80, "tealeaf"),
    ("選物販賣", "光文路", 81, "claw"),
    ("二水國小炒麵", "光文路", 96, "noodle"),
    ("姐妹美容坊", "光文路", 98, "hair"),
    ("糧誠行 米糧", "光文路", 102, "rice"),
    ("長春藥局", "光文路", 103, "pharmacy"),
    ("漢堡早餐", "光文路", 105, "breakfast"),
    ("二八水古早味", "光文路", 111, "snack"),
    ("銘建醫事檢驗所", "光文路", 117, "clinic"),
    ("花果子", "光文路", 125, "general"),
    ("水煎包、麵線", "光文路", 129, "snack"),
    ("黎明小吃部", "員集路四段", 1, "snack"),
    ("安利藥局", "員集路四段", 3, "pharmacy"),
    ("便利商店", "員集路四段", 8, "convenience"),
    ("金豐利", "員集路四段", 13, "general"),
    ("新永昌鐘錶眼鏡", "員集路四段", 25, "clock"),
    ("樺蓉髮型設計", "員集路四段", 29, "hair"),
    ("順吉機車行", "員集路四段", 45, "scooter"),
    ("嘉一自助餐", "員集路四段", 49, "buffet"),
    ("雪莉髮型設計", "員集路四段", 51, "hair"),
    ("安康診所", "員集路四段", 54, "clinic"),
    ("贊成中藥房", "員集路四段", 100, "herbal"),
    ("益裕機車行", "員集路四段", 138, "scooter"),
    ("員集小吃店", "員集路三段", 508, "snack"),
    ("二水炒麵香", "員集路三段", 664, "noodle"),
    ("春苳紅茶", "員集路三段", 668, "drink"),
    ("阿添切仔麵", "員集路三段", 672, "noodle"),
    ("大明火燒麵", "員集路三段", 724, "noodle"),
    ("建源水果行", "員集路三段", 738, "fruit"),
    ("便利商店", "員集路三段", 739, "convenience"),
    ("電信服務中心", "員集路三段", 743, "telecom"),
    ("四神湯", "惠民路", 239, "snack"),
    ("火雞肉飯", "惠民路", 243, "noodle"),
    ("日日新商店", "惠民路", 251, "general"),
]

# 8 棟 Colab 3D 建築（RDQ 3C；模型 assets/models/bld_<id>.glb）
LANDMARKS = [
    dict(id="asia_inn", zh="亞洲旅社", en="Asia Hotel", addr=("光文路", 9), rel=("ok", 7.5, "station")),   # 老師 11/08：車站旁便利商店（光文路 9）隔壁第三間（往車站方向 3 間店寬）
    dict(id="dental", zh="詹貴賓牙醫診所", en="Dental Clinic", lat=23.812716, lon=120.617852, snap="光文路"),   # 老師 11/08 Google 空拍：便利商店往西南、德成百貨旁，正門朝光文路
    dict(id="decheng", zh="德成百貨行", en="Variety Store", lat=23.812690, lon=120.617783, snap="光文路"),
    dict(id="shoes", zh="美珍鞋坊", en="Shoe Shop", addr=("員集路四段", 2)),
    dict(id="ensheng", zh="恩生診所", en="Clinic", addr=("員集路四段", 8), shift=7.0),     # 老師 11/08：7-11 隔壁，不能壓到馬路
    dict(id="farmers", zh="二水鄉農會", en="Farmers' Association", lat=23.81011, lon=120.61594),
    dict(id="ande", zh="安德宮", en="Ande Temple", lat=23.80995, lon=120.61558),
    dict(id="dumpling", zh="水餃店", en="Dumpling Shop", lat=23.81116, lon=120.61569, snap="員集路三段"),   # 老師 11/08：店面在馬路旁
]


# 原本就有的地點，老師 11/08 指出「在一排房子後面」→ 改用門牌放在馬路旁（店面朝路）
# 老師 11/08 Google 空拍（比例由長春藥局、謝毛宅推算約 0.134 m/像素）：兩家飲料店在光文路同一側（西北側，和長春藥局對面），都在路邊
FRONT_FIX = {"teatop": ("光文路", 23.812264, 120.617045), "tea2": ("光文路", 23.812112, 120.616787)}
FRONT_OPPOSITE = (23.81187, 120.61686)   # 長春藥局（光文路 103）在另一側


def street_chains(ways, N, real=None):
    """同名道路的 OSM way 變成一條折線：同名的路可能分成好幾段（或車站前有環狀），
    先取「離已知門牌最近」的那一塊相連路段，再取裡面最遠兩端之間的最短路線。回傳 {路名: [(x,z),...]}。"""
    import heapq
    out = {}
    for name in ANCHORS:
        adj = {}
        for w in ways:
            t = w.get("tags", {})
            if t.get("name") != name or "highway" not in t:
                continue
            ids = [n for n in w["nodes"] if n in N]
            for a, b in zip(ids, ids[1:]):
                L = math.hypot(N[a][0] - N[b][0], N[a][1] - N[b][1])
                adj.setdefault(a, {})[b] = L
                adj.setdefault(b, {})[a] = L
        if not adj:
            continue
        comps, seen = [], set()
        for s in adj:
            if s in seen:
                continue
            comp, stack = set(), [s]
            while stack:
                u = stack.pop()
                if u not in comp:
                    comp.add(u)
                    stack.extend(adj[u])
            seen |= comp
            comps.append(comp)
        if real is not None:
            ap = [real(la, lo) for _, la, lo in ANCHORS[name]]
            comps.sort(key=lambda c: sum(min(math.hypot(N[n][0] - p[0], N[n][1] - p[1]) for n in c) for p in ap))
        else:
            comps.sort(key=len, reverse=True)
        comp = comps[0]

        def dij(src):
            dist, prev, pq = {src: 0.0}, {}, [(0.0, src)]
            while pq:
                d, u = heapq.heappop(pq)
                if d > dist[u]:
                    continue
                for v, L in adj[u].items():
                    if v in comp and d + L < dist.get(v, 1e18):
                        dist[v], prev[v] = d + L, u
                        heapq.heappush(pq, (d + L, v))
            return dist, prev
        d0, _ = dij(next(iter(comp)))
        a = max(d0, key=d0.get)
        da, prev = dij(a)
        b = max(da, key=da.get)
        path = [b]
        while path[-1] != a:
            path.append(prev[path[-1]])
        out[name] = [N[n] for n in path[::-1]]
    return out


def _project(pts, p):
    """p 投影到折線上 → (弧長, 投影點, 該段方向)。"""
    best, acc = (1e18, 0.0, pts[0], (1.0, 0.0)), 0.0
    for a, b in zip(pts, pts[1:]):
        dx, dz = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dz) or 1e-9
        t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (L * L)))
        q = (a[0] + dx * t, a[1] + dz * t)
        d = math.hypot(p[0] - q[0], p[1] - q[1])
        if d < best[0]:
            best = (d, acc + L * t, q, (dx / L, dz / L))
        acc += L
    return best[1], best[2], best[3]


def _at(pts, s):
    acc = 0.0
    for a, b in zip(pts, pts[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if acc + L >= s or b is pts[-1]:
            t = 0.0 if L == 0 else max(0.0, min(1.0, (s - acc) / L))
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), ((b[0] - a[0]) / (L or 1), (b[1] - a[1]) / (L or 1))
        acc += L
    return pts[-1], (1.0, 0.0)


def locate(chains, real, street, no):
    """門牌 → (路邊點, 往店面那一側的法向量)。單號／雙號各在路的一側（依已知門牌判斷）。"""
    pts = chains[street]
    an = sorted((n, _project(pts, real(la, lo))) for n, la, lo in ANCHORS[street])
    # 門牌 → 弧長：已知門牌之間線性內插，兩端外插
    ns = [a[0] for a in an]
    ss = [a[1][0] for a in an]
    i = 0
    while i < len(ns) - 2 and no > ns[i + 1]:
        i += 1
    n0, n1, s0, s1 = ns[i], ns[i + 1], ss[i], ss[i + 1]
    s = s0 + (s1 - s0) * (no - n0) / ((n1 - n0) or 1)
    q, d = _at(pts, s)
    left = (-d[1], d[0])
    # 單號在哪一側：看已知的單號門牌點在路的哪一邊（沒有就假設左邊）
    side = 1.0
    for n, la, lo in ANCHORS[street]:
        if n % 2 == 1:
            _, qa, da = _project(pts, real(la, lo))
            pa = real(la, lo)
            cross = (pa[0] - qa[0]) * -da[1] + (pa[1] - qa[1]) * da[0]
            if abs(cross) > 0.5:
                side = 1.0 if cross > 0 else -1.0
                break
    if no % 2 == 0:
        side = -side
    return q, (left[0] * side, left[1] * side)


def shifted(chains, real, street, no, meters):
    """門牌 no 的路邊點，沿著「門牌變大」的方向移動 meters（負數＝往門牌小的方向）；同一側。"""
    q, nrm = locate(chains, real, street, no)
    q2, _ = locate(chains, real, street, no + 2)
    dx, dz = q2[0] - q[0], q2[1] - q[1]
    L = math.hypot(dx, dz) or 1.0
    return (q[0] + dx / L * meters, q[1] + dz / L * meters), nrm


def snap_front(chains, real, street, la, lo):
    """原本的點投影到那條路上：沿街位置不變，回傳 (路邊點, 往店那一側的法向量)。"""
    p = real(la, lo)
    _, q, d = _project(chains[street], p)
    vx, vz = p[0] - q[0], p[1] - q[1]
    L = math.hypot(vx, vz)
    if L < 0.5:
        return q, (-d[1], d[0])
    return q, (vx / L, vz / L)


def force_side(chains, real, street, q, nrm, ref_latlon):
    """把法向量 nrm 換到「和參考點（例：光文路 9 號便利商店）同一側」。"""
    pts = chains[street]
    pr = real(*ref_latlon)
    _, qr, dr = _project(pts, pr)
    ref = dr[0] * (pr[1] - qr[1]) - dr[1] * (pr[0] - qr[0])
    _, _, dq = _project(pts, q)
    mine = dq[0] * nrm[1] - dq[1] * nrm[0]
    return nrm if (ref > 0) == (mine > 0) else (-nrm[0], -nrm[1])
