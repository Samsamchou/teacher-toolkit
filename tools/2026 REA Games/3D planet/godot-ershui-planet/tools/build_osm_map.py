"""把二水市區的 OpenStreetMap 資料轉成遊戲地圖 data/map.json（取代舊的簡圖）。

- 投影：以市中心為原點的等距平面（公尺，x 往東、z 往南），再乘 K 縮成遊戲尺寸。
- 道路：OSM 的 secondary/tertiary/unclassified/residential/service… → 路網圖（只留最大連通塊，保證每個門口都走得到）。
- 建築：OSM 建築輪廓 → 依位置與種類指定外觀（研究：3D planet/資料/research-ershui-streetscape-20261025.md）。
- 地點：依座標找到 OSM 建築，換成 Tripo 模型或特別外觀；市區範圍外的學校、公園放在外圈，接一條路進來。
資料來源：© OpenStreetMap contributors（ODbL 1.0），下載檔 3D planet/資料/osm/ershui-downtown-20261025.json
用法：python -I tools/build_osm_map.py
"""
import json
import math
import os
import random
from collections import defaultdict

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OSM = os.path.join(os.path.dirname(HERE), "資料", "osm", "ershui-downtown-20261025.json")

LAT0, LON0 = 23.8113, 120.6175        # 地圖中心（車站與三角仔中間）→ 星球北極
MX = 111320.0 * math.cos(math.radians(LAT0))
MZ = 110560.0
K = 0.55                               # 真實 1 m → 遊戲 0.55 m（房子與道路一起縮）
RAD = 460.0                            # 只取中心 430 m 內（真實）
OUTER = RAD * K + 26.0                 # 市區外的地點放在這個半徑（遊戲 m）

ROAD_W = {"secondary": 5.2, "secondary_link": 4.4, "tertiary": 4.6, "tertiary_link": 4.0, "unclassified": 4.2,
          "residential": 3.8, "living_street": 3.4, "pedestrian": 3.2, "service": 3.0}

TRI = (23.81175, 120.61635)            # 三角仔
STATION = (23.81315, 120.618115)

# id, zh, word（單字；空＝只是地標）, lat, lon, kind（model / osm / waterpark / lawn / park / school / outer…）
PLACES = [
    dict(id="station", zh="二水火車站", word="train station", lat=23.81315, lon=120.618115, kind="model", model="train_station", size=26.0),
    dict(id="inn", zh="二八水驛站", word="restaurant", lat=23.8116694, lon=120.6198485, kind="model", model="station_inn", size=9.0),
    dict(id="ok", zh="便利商店（光文路）", word="convenience store", lat=23.8127731, lon=120.6180030, kind="osm", style="store", color="#3aa6d8", sign="STORE"),
    dict(id="qizao", zh="齊造園", word="restaurant", lat=23.8119492, lon=120.6194158, kind="osm", style="shop", color="#e3c08a", sign="RESTAURANT"),
    dict(id="seven", zh="便利商店（二八水）", word="convenience store", lat=23.8097502, lon=120.6192371, kind="model", model="seven_eleven", size=8.0,
         cover={"y": 0.86, "h": 0.32, "text": "STORE", "color": "#388c6b"}),
    dict(id="school", zh="二水國小", word="school", lat=23.8108492, lon=120.6178161, kind="model", model="school", size=24.0, clear=26.0),
    dict(id="teatop", zh="台灣第一味", word="tea shop", lat=23.812147, lon=120.6168422, kind="model", model="teatop", size=7.0,
         cover={"y": 0.62, "h": 0.16, "text": "TEA SHOP", "color": "#d9523f"}),
    dict(id="market", zh="二水超市", word="supermarket", lat=23.8122266, lon=120.6157864, kind="model", model="market", size=9.0),
    dict(id="health", zh="二水鄉衛生所", word="hospital", lat=23.8117953, lon=120.6154177, kind="osm", style="clinic", color="#f2f2ee", sign="衛生所"),
    dict(id="post", zh="二水郵局", word="post office", lat=23.8112695, lon=120.6155068, kind="model", model="post_office", size=8.0),
    dict(id="bookstore", zh="大盟書局", word="bookstore", lat=23.8114329, lon=120.6157759, kind="model", model="bookstore", size=6.5),
    dict(id="pxmart", zh="超市（民生路）", word="supermarket", lat=23.8123857, lon=120.6134788, kind="model", model="pxmart", size=14.0, clear=10.0),
    dict(id="library", zh="二水鄉立圖書館", word="library", lat=23.81001, lon=120.616798, kind="model", model="library", size=11.0, clear=9.0),
    dict(id="farm", zh="八堡圳農情館", word="", en="Farm Center", lat=23.8081589, lon=120.6228446, kind="outer", style="model", model="farm_centre", size=10.0),
    dict(id="waterpark", zh="二八水水公園", word="park", lat=23.8144329, lon=120.6161627, kind="waterpark"),
    dict(id="lawn", zh="水心之初大草原", word="park", lat=23.8090318, lon=120.6232998, kind="outer", style="lawn"),
    # 沿路的公家機關與老建築（不出題，是街景地標）
    dict(id="police", zh="二水分駐所", word="", en="Police Station", osm=1164499513, kind="osm", style="police", sign="二水分駐所"),
    dict(id="fire", zh="二水消防分隊", word="", en="Fire Station", osm=1004981756, kind="osm", style="fire", sign="消防分隊"),
    dict(id="township", zh="二水鄉公所", word="", en="Township Office", osm=831118102, kind="osm", style="office", sign="二水鄉公所"),
    dict(id="ande", zh="安德宮", word="", en="Temple", osm=554614906, kind="osm", style="temple"),
    dict(id="zhang", zh="張老嚶宅", word="", en="Old Brick House", lat=23.811691, lon=120.616226, kind="osm", style="A", wide=True),
    dict(id="zheng", zh="鄭鼎宅", word="", en="Old Brick House", lat=23.811707, lon=120.616500, kind="osm", style="A", plaque="鄭"),
    dict(id="xiemao", zh="謝毛宅", word="", en="Old Brick House", lat=23.811873, lon=120.616452, kind="osm", style="A", plaque="M 商店"),
    dict(id="hall", zh="中山堂（舊公會堂）", word="", en="Old Town Hall", lat=23.810877, lon=120.615269, kind="osm", style="B", ruin=True, plaque="中山堂"),
    dict(id="honghe", zh="宏和醫院（老建築）", word="", en="Old Clinic", lat=23.8095, lon=120.6161, kind="osm", style="B", plaque="院醫和宏"),
    dict(id="dorm7", zh="二水驛第七號官舍", word="", en="Old Railway House", lat=23.812403, lon=120.618645, kind="osm", style="E"),
    dict(id="tea2", zh="五分田（光化店）", word="tea shop", lat=23.81205, lon=120.61695, kind="osm", style="store", color="#1f3a6e", sign="TEA"),   # 光文路82號，長春藥局對面；取代已歇業的清心福全
    # 市區外（放在外圈，接一條路進來）
    dict(id="fengbo", zh="豐柏廣場", word="park", lat=23.8229712, lon=120.6191649, kind="outer", style="park"),
    dict(id="fuxing", zh="復興國小", word="school", lat=23.8299315, lon=120.6051432, kind="outer", style="school", color="#f0e2b8"),
    dict(id="esjh", zh="二水國中", word="school", en="Ershui Junior High School", lat=23.8036185, lon=120.6453734, kind="local", style="school_area"),
    dict(id="yuanquan", zh="源泉國小", word="school", lat=23.8006135, lon=120.6429045, kind="local", style="school_area"),
    dict(id="lintemple", zh="林先生廟", word="", en="temple", lat=23.799267, lon=120.645229, kind="local", style="temple_small"),
    dict(id="baobao", zh="八堡圳公園", word="park", lat=23.802064, lon=120.6601012, kind="local", style="park"),
]

SETS = [
    {"name": "Set 1 車站散步", "targets": ["teatop", "post", "library", "market", "school", "bookstore", "health", "inn", "seven", "waterpark", "station", "lawn"]},
    {"name": "Set 2 越過鐵路", "targets": ["tea2", "post", "library", "pxmart", "fuxing", "bookstore", "health", "qizao", "ok", "fengbo", "station", "teatop"]},
    {"name": "Set 3 八堡圳之旅", "targets": ["teatop", "post", "library", "market", "yuanquan", "bookstore", "health", "inn", "seven", "baobao", "station", "school"]},
    {"name": "Set 4 東西南北", "targets": ["tea2", "post", "library", "pxmart", "esjh", "bookstore", "health", "qizao", "ok", "lawn", "station", "waterpark"]},
    {"name": "Set 5 二水全攻略", "targets": ["teatop", "post", "library", "pxmart", "school", "bookstore", "health", "inn", "seven", "fengbo", "station", "esjh"]},
]
WORDS = ["park", "post office", "supermarket", "library", "school", "train station",
         "tea shop", "bookstore", "hospital", "restaurant", "convenience store"]


def real(lat, lon):
    return ((lon - LON0) * MX, -(lat - LAT0) * MZ)


# 地圖由幾塊「真實街區」組成：市區（原比例 K）＋東南方的源泉一帶、八堡圳公園一帶。
# 街區內部照真實位置與比例；街區之間的距離壓縮（真實約 2.5–4 km），用聯外道路接起來。
OSM_FILES = [os.path.join(os.path.dirname(HERE), "資料", "osm", "ershui-%s-20261025.json" % a) for a in ("downtown", "southeast")]
REGIONS = [
    {"id": "town", "c": (0.0, 0.0), "rad": RAD, "anchor": (0.0, 0.0)},
    {"id": "se", "c": real(23.8014, 120.6445), "rad": 290.0, "anchor": None, "name": "源泉一帶（二水國中、源泉國小、林先生廟）"},
    {"id": "bb", "c": real(23.802064, 120.6601), "rad": 110.0, "anchor": None, "name": "八堡圳公園一帶"},
]
_se, _bb = REGIONS[1], REGIONS[2]
_a_se = math.atan2(_se["c"][1], _se["c"][0])
_r_se = RAD * K + 30.0 + _se["rad"] * K
_se["anchor"] = (math.cos(_a_se) * _r_se, math.sin(_a_se) * _r_se)
_a_bb_real = math.atan2(_bb["c"][1], _bb["c"][0])
_d = (_se["rad"] * K + _bb["rad"] * K + 20.0) / _r_se
_a_bb = _a_se + (_d if _a_bb_real > _a_se else -_d)
_bb["anchor"] = (math.cos(_a_bb) * _r_se, math.sin(_a_bb) * _r_se)


def region_of(p):
    for Rg in REGIONS:
        if math.hypot(p[0] - Rg["c"][0], p[1] - Rg["c"][1]) <= Rg["rad"]:
            return Rg
    return None


def game(p):
    Rg = region_of(p) or REGIONS[0]
    return [round(Rg["anchor"][0] + (p[0] - Rg["c"][0]) * K, 2), round(Rg["anchor"][1] + (p[1] - Rg["c"][1]) * K, 2)]


def dp_simplify(pts, tol):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    best, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        d = seg_dist_only(pts[i], a, b)
        if d > best:
            best, idx = d, i
    if best <= tol:
        return [a, b]
    return dp_simplify(pts[:idx + 1], tol)[:-1] + dp_simplify(pts[idx:], tol)


def seg_dist(p, a, b):
    ax, az = b[0] - a[0], b[1] - a[1]
    L2 = ax * ax + az * az
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((p[0] - a[0]) * ax + (p[1] - a[1]) * az) / L2))
    q = (a[0] + ax * t, a[1] + az * t)
    return math.hypot(p[0] - q[0], p[1] - q[1]), q


def seg_dist_only(p, a, b):
    return seg_dist(p, a, b)[0]


def area(poly):
    return 0.5 * sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))


def centroid(poly):
    return (sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly))


def inside(p, poly):
    c = False
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]
        if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1] + 1e-12) + a[0]:
            c = not c
    return c


def main() -> None:
    rnd = random.Random(20261025)
    els = []
    for f in OSM_FILES:
        els += json.load(open(f, encoding="utf-8"))["elements"]
    N = {e["id"]: real(e["lat"], e["lon"]) for e in els if e["type"] == "node"}
    seen_w = set()
    ways = []
    for e in els:
        if e["type"] == "way" and e["id"] not in seen_w:
            seen_w.add(e["id"])
            ways.append(e)

    # ---------- 道路 ----------
    use = defaultdict(int)
    road_ways = []
    for w in ways:
        t = w.get("tags", {})
        hw = t.get("highway")
        if hw not in ROAD_W:
            continue
        if hw == "service" and t.get("service") in ("parking_aisle", "driveway", "drive-through"):
            continue
        ids = [n for n in w["nodes"] if n in N]
        road_ways.append((ids, ROAD_W[hw], t.get("name", "")))
        for n in ids:
            use[n] += 1
        use[ids[0]] += 1
        use[ids[-1]] += 1
    edges = []
    for ids, wd, name in road_ways:
        # 切成「保留點」之間的線段：交叉點、端點、Douglas-Peucker 轉折點
        pts = [N[n] for n in ids]
        keep_idx = {0, len(ids) - 1} | {i for i, n in enumerate(ids) if use[n] > 1}
        sp = dp_simplify(pts, 1.5)
        for i, p in enumerate(pts):
            if p in sp:
                keep_idx.add(i)
        ks = sorted(keep_idx)
        for a, b in zip(ks, ks[1:]):
            pa, pb = pts[a], pts[b]
            ra, rb = region_of(pa), region_of(pb)
            if ra is None or ra is not rb:
                continue
            edges.append([ids[a], ids[b], wd, name])
    # 最大連通塊
    adj = defaultdict(set)
    for a, b, *_ in edges:
        adj[a].add(b)
        adj[b].add(a)
    # 每個街區各留最大的連通塊（之後再用聯外道路接起來）
    seen, best_by = set(), {}
    for s in adj:
        if s in seen:
            continue
        comp, stack = set(), [s]
        while stack:
            u = stack.pop()
            if u in comp:
                continue
            comp.add(u)
            stack.extend(adj[u] - comp)
        seen |= comp
        rid = region_of(N[s])["id"]
        if len(comp) > len(best_by.get(rid, ())):
            best_by[rid] = comp
    best = set().union(*best_by.values())
    node_region = {n: region_of(N[n])["id"] for n in best}
    edges = [e for e in edges if e[0] in best and e[1] in best]
    nodes = {}
    for a, b, *_ in edges:
        for n in (a, b):
            nodes["n%d" % n] = game(N[n])
    gedges = [["n%d" % a, "n%d" % b, wd, name] for a, b, wd, name in edges]
    key_region = {"n%d" % n: r for n, r in node_region.items()}

    # 聯外道路：市區 → 源泉一帶（員集路方向）→ 八堡圳公園一帶
    def connect(ra, rb, name):
        A = next(r for r in REGIONS if r["id"] == ra)
        B = next(r for r in REGIONS if r["id"] == rb)
        dx, dz = B["anchor"][0] - A["anchor"][0], B["anchor"][1] - A["anchor"][1]
        L = math.hypot(dx, dz)
        dx, dz = dx / L, dz / L
        ka = [k for k in nodes if key_region.get(k) == ra]
        kb = [k for k in nodes if key_region.get(k) == rb]
        na = max(ka, key=lambda k: (nodes[k][0] - A["anchor"][0]) * dx + (nodes[k][1] - A["anchor"][1]) * dz)
        nb = min(kb, key=lambda k: math.hypot(nodes[k][0] - nodes[na][0], nodes[k][1] - nodes[na][1]))
        gedges.append([na, nb, 4.6, name])

    connect("town", "se", "員集路（往源泉，距離已壓縮）")
    connect("se", "bb", "往八堡圳公園（距離已壓縮）")
    segs = [(nodes[a], nodes[b]) for a, b, *_ in gedges]

    def nearest_road(p):
        best = (1e9, None, None)
        for i, (a, b) in enumerate(segs):
            d, q = seg_dist(p, a, b)
            if d < best[0]:
                best = (d, [round(q[0], 2), round(q[1], 2)], i)
        return best

    # ---------- 建築 ----------
    blds = []
    for w in ways:
        t = w.get("tags", {})
        if "building" not in t:
            continue
        ids = [n for n in w["nodes"] if n in N]
        if len(ids) < 4:
            continue
        poly = [N[n] for n in ids[:-1]] if ids[0] == ids[-1] else [N[n] for n in ids]
        c = centroid(poly)
        if region_of(c) is None:
            continue
        if area(poly) < 0:
            poly = poly[::-1]
        poly = dp_simplify(poly + [poly[0]], 0.35)[:-1]
        if len(poly) < 3 or abs(area(poly)) < 12.0:
            continue
        blds.append({"id": w["id"], "poly_r": poly, "c_r": c, "tag": t.get("building"), "name": t.get("name", ""),
                     "levels": t.get("building:levels", ""), "amenity": t.get("amenity", "")})

    def find_building(P):
        if "osm" in P:
            for b in blds:
                if b["id"] == P["osm"]:
                    return b
            return None
        p = real(P["lat"], P["lon"])
        for b in blds:
            if b["id"] not in removed and inside(p, b["poly_r"]):
                return b
        cand = [(math.hypot(b["c_r"][0] - p[0], b["c_r"][1] - p[1]), b) for b in blds if b["id"] not in removed]
        cand.sort(key=lambda x: x[0])
        return cand[0][1] if cand and cand[0][0] < 18.0 else None

    # 市區外的地點：照真實方位放在外圈，但彼此至少隔 20 度，避免疊在一起
    outs = sorted((math.atan2(*reversed(real(P["lat"], P["lon"]))), P["id"]) for P in PLACES if P["kind"] == "outer")
    angs = [a for a, _ in outs]
    gap = math.radians(18)
    # 依序往後推，至少隔 gap；再整體往回移一半，讓這一群仍然對準真實方位
    orig = list(angs)
    for i in range(1, len(angs)):
        angs[i] = max(angs[i], angs[i - 1] + gap)
    shift = (sum(angs) - sum(orig)) / len(angs)
    angs = [x - shift for x in angs]
    outer_ang = {pid: a for (_, pid), a in zip(outs, angs)}
    removed = set()
    places = []
    extra_nodes, extra_edges = {}, []
    for P in PLACES:
        Q = {k: v for k, v in P.items() if k not in ("lat", "lon", "osm")}
        if P["kind"] == "outer":
            p = real(P["lat"], P["lon"])
            ang = outer_ang[P["id"]]
            pos = [round(math.cos(ang) * (OUTER + 14.0), 2), round(math.sin(ang) * (OUTER + 14.0), 2)]
            door = [round(math.cos(ang) * OUTER, 2), round(math.sin(ang) * OUTER, 2)]
            # 從最靠近這個方向的路網點拉一條聯外道路
            far = max(nodes.items(), key=lambda kv: (kv[1][0] * math.cos(ang) + kv[1][1] * math.sin(ang)) - 0.35 * abs(-kv[1][0] * math.sin(ang) + kv[1][1] * math.cos(ang)))
            nid = "x_" + P["id"]
            extra_nodes[nid] = door
            extra_edges.append([far[0], nid, 4.4, "往" + P["zh"]])
            Q.update(pos=pos, door=door, real_km=round(math.hypot(*p) / 1000.0, 2))
            places.append(Q)
            continue
        if P["kind"] == "local":
            # 東南街區的地點：照真實位置；有 OSM 建築的廟用真實輪廓，學校與公園用校區／園區中心
            pos = game(real(P["lat"], P["lon"]))
            b = find_building(P) if P.get("style") == "temple_small" else None
            if b is not None:
                pos = game(b["c_r"])
                Q.update(kind="osm", style="temple", poly=[game(q) for q in b["poly_r"]])
                removed.add(b["id"])
            else:
                Q["kind"] = "outer"
            d, door, _ = nearest_road(pos)
            Q.update(pos=pos, door=door, door_dist=round(d, 2))
            if P.get("style") == "park":
                for bb in blds:
                    gb = game(bb["c_r"])
                    if math.hypot(gb[0] - pos[0], gb[1] - pos[1]) < 11.0:
                        removed.add(bb["id"])
            places.append(Q)
            continue
        b = find_building(P)
        if b is None and "lat" not in P:
            print("SKIP（不在市區範圍）", P["id"])
            continue
        if b is not None:
            c = b["c_r"]
            if "lat" not in P:
                Q["latlon"] = None
        else:
            c = real(P["lat"], P["lon"])
        pos = game(c)
        d, door, _ = nearest_road(pos)
        Q.update(pos=pos, door=door, door_dist=round(d, 2))
        if b is not None and P["kind"] in ("osm",):
            Q["poly"] = [game(q) for q in b["poly_r"]]
            removed.add(b["id"])
        elif b is not None and P["kind"] == "model":
            removed.add(b["id"])
        clear = P.get("clear", 0.0)
        if clear:
            for bb in blds:
                gb = game(bb["c_r"])
                if math.hypot(gb[0] - pos[0], gb[1] - pos[1]) < clear:
                    removed.add(bb["id"])
        if P["kind"] in ("waterpark", "lawn"):
            for bb in blds:
                gb = game(bb["c_r"])
                if math.hypot(gb[0] - pos[0], gb[1] - pos[1]) < 11.0:
                    removed.add(bb["id"])
        places.append(Q)
    nodes.update(extra_nodes)
    gedges += extra_edges
    segs = [(nodes[a], nodes[b]) for a, b, *_ in gedges]

    # 一般建築的外觀：依實景研究的比例（紅磚洋樓刻意提高）＋位置
    tri = real(*TRI)
    st = real(*STATION)
    out_b = []
    for b in blds:
        if b["id"] in removed:
            continue
        poly = [game(q) for q in b["poly_r"]]
        c = game(b["c_r"])
        # 臨街面：中點離道路最近的那一條邊
        best = (1e9, 0)
        for i in range(len(poly)):
            a, q = poly[i], poly[(i + 1) % len(poly)]
            if math.hypot(q[0] - a[0], q[1] - a[1]) < 1.2:
                continue
            mid = ((a[0] + q[0]) / 2, (a[1] + q[1]) / 2)
            d = min(seg_dist_only(mid, s0, s1) for s0, s1 in segs)
            if d < best[0]:
                best = (d, i)
        r = rnd.random()
        dt = math.hypot(b["c_r"][0] - tri[0], b["c_r"][1] - tri[1])
        ds = math.hypot(b["c_r"][0] - st[0], b["c_r"][1] - st[1])
        tag = b["tag"]
        street = best[0] < 6.0
        if tag in ("industrial", "warehouse", "garage", "shed", "roof"):
            style = "T"   # 鐵皮
        elif tag == "temple":
            style = "temple"
        elif tag == "school":
            style = "school_b"
        elif not street:
            style = "D" if r < 0.45 else ("C" if r < 0.85 else "T")
        elif dt < 70:
            style = "A" if r < 0.4 else ("D" if r < 0.7 else "C")
        elif ds < 90 and r < 0.15:
            style = "E"
        else:
            style = "A" if r < 0.1 else ("B" if r < 0.14 else ("D" if r < 0.38 else "C"))
        lv = b["levels"]
        out_b.append({"poly": poly, "front": best[1], "street": street, "style": style,
                      "levels": int(float(lv)) if lv else 0, "id": b["id"]})

    # 鐵路、水道、綠地
    rails, water, green = [], [], []
    for w in ways:
        t = w.get("tags", {})
        pts = [N[n] for n in w["nodes"] if n in N]
        if not pts:
            continue
        r0 = region_of(pts[0]) or region_of(pts[-1]) or region_of(pts[len(pts) // 2])
        if r0 is None:
            continue
        pts = [p for p in pts if region_of(p) is r0]
        if len(pts) < 2:
            continue
        g = [game(p) for p in dp_simplify(pts, 0.8)]
        if t.get("railway") == "rail" and r0["id"] == "town":
            rails.append(g)
        elif t.get("waterway") in ("canal", "ditch", "stream", "drain", "river"):
            water.append({"pts": g, "w": 2.6 if t.get("waterway") in ("canal", "river") else 1.4})
        elif t.get("leisure") in ("park", "pitch", "playground", "garden") or t.get("landuse") in ("grass", "farmland", "orchard", "meadow", "recreation_ground"):
            if pts[0] == pts[-1] and len(pts) > 3:
                green.append({"poly": [game(p) for p in dp_simplify(pts, 1.0)][:-1], "kind": t.get("leisure") or t.get("landuse")})
    # 鐵路的大致方向（讓火車沿著它繞星球）
    rp = [p for r in rails for p in r]
    if rp:
        mx = sum(p[0] for p in rp) / len(rp)
        mz = sum(p[1] for p in rp) / len(rp)
        sxx = sum((p[0] - mx) ** 2 for p in rp)
        sxz = sum((p[0] - mx) * (p[1] - mz) for p in rp)
        szz = sum((p[1] - mz) ** 2 for p in rp)
        ang = 0.5 * math.atan2(2 * sxz, sxx - szz)
        rail_line = {"o": [round(mx, 2), round(mz, 2)], "d": [round(math.cos(ang), 4), round(math.sin(ang), 4)]}
    else:
        rail_line = None

    for s in SETS:
        ids = {p["id"]: p for p in places}
        assert set(WORDS) <= {ids[t]["word"] for t in s["targets"]}, s["name"]
    out = {"K": K, "nodes": nodes, "edges": gedges, "places": places, "buildings": out_b,
           "rails": rails, "rail_line": rail_line, "water": water, "green": green, "words": WORDS,
           "source": "© OpenStreetMap contributors (ODbL 1.0), downloaded 2026-10-25"}
    json.dump(out, open(os.path.join(HERE, "data", "map.json"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump({"sets": SETS, "first_options": ["tea shop", "post office", "library", "supermarket"]},
              open(os.path.join(HERE, "data", "sets.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    from collections import Counter
    print("nodes", len(nodes), "edges", len(gedges), "buildings", len(out_b), Counter(b["style"] for b in out_b))
    print("rails", len(rails), "water", len(water), "green", len(green))
    for p in places:
        print(p["id"], p["pos"], "door", p["door"], "d=%s" % p.get("door_dist"), "poly" if "poly" in p else "")


if __name__ == "__main__":
    main()
