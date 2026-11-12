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
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shops_ershui as SH   # 二水街屋清冊（11/08）

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OSM = os.path.join(os.path.dirname(HERE), "資料", "osm", "ershui-downtown-20261025.json")

LAT0, LON0 = 23.8113, 120.6175        # 地圖中心（車站與三角仔中間）→ 星球北極
MX = 111320.0 * math.cos(math.radians(LAT0))
MZ = 110560.0
K = 0.55                               # 真實 1 m → 遊戲 0.55 m（房子與道路一起縮）
RAD = 600.0                            # 只取中心 600 m 內（真實；老師 11/08 RDQ 1A：車站周邊步行範圍）
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
    dict(id="seven", zh="便利商店（民族路）", word="convenience store", lat=23.8097502, lon=120.6192371, kind="model", model="seven_eleven", size=8.0,
         cover={"y": 0.86, "h": 0.32, "text": "STORE", "color": "#388c6b"}),
    # 2026-11-08 重建（RDQ-spec-ershui-elementary-rebuild-20261108，真實大小）：整個校園照 OSM 輪廓＋疏散地圖；Ken 走到明德橋（西門）
    dict(id="school", zh="二水國小", word="school", lat=23.8108492, lon=120.6178161, kind="campus", size=20.0),
    dict(id="teatop", zh="飲料店（紅招牌）", word="tea shop", lat=23.812147, lon=120.6168422, kind="model", model="teatop", size=7.0,
         cover={"y": 0.62, "h": 0.16, "text": "TEA SHOP", "color": "#d9523f"}),
    dict(id="market", zh="二水超市", word="supermarket", lat=23.8122266, lon=120.6157864, kind="model", model="market", size=9.0),
    dict(id="health", zh="二水鄉衛生所", word="hospital", lat=23.8117953, lon=120.6154177, kind="osm", style="clinic", color="#f2f2ee", sign="衛生所"),
    dict(id="post", zh="二水郵局", word="post office", lat=23.8112695, lon=120.6155068, kind="model", model="post_office", size=8.0),
    dict(id="bookstore", zh="書店", word="bookstore", lat=23.8114329, lon=120.6157759, kind="model", model="bookstore", size=6.5),
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
    dict(id="tea2", zh="飲料店（藍招牌）", word="tea shop", lat=23.81205, lon=120.61695, kind="osm", style="store", color="#1f3a6e", sign="TEA"),   # 光文路82號，長春藥局對面；取代已歇業的清心福全
    # 市區外（放在外圈，接一條路進來）
    dict(id="fengbo", zh="豐柏廣場", word="park", lat=23.8229712, lon=120.6191649, kind="outer", style="park"),
    dict(id="fuxing", zh="復興國小", word="school", lat=23.8299315, lon=120.6051432, kind="outer", style="school", color="#f0e2b8"),
    dict(id="esjh", zh="二水國中", word="school", en="Ershui Junior High School", lat=23.8036185, lon=120.6453734, kind="local", style="school_area"),
    dict(id="yuanquan", zh="源泉國小", word="school", lat=23.8006135, lon=120.6429045, kind="local", style="school_area"),
    dict(id="lintemple", zh="林先生廟", word="", en="temple", lat=23.799267, lon=120.645229, kind="local", style="temple_small"),
    dict(id="baobao", zh="八堡圳公園", word="park", lat=23.802064, lon=120.6601012, kind="local", style="park"),
    # 2026-11-12 虛構地點（RDQ-spec-ershui-planet-railway-museum-20261112）：二水沒有這間博物館。放在車站西北、車站旁那條路與鐵道之間的空地
    # （公園綠地的東北角），正門朝路；紅磚扇形車庫造型（Colab Hunyuan3D-2 bld_museum）＋門前蒸汽火車頭（world.gd）。
    # 遊戲座標約 (-12.9, -132.8)；不吸附、不拿掉任何房子（附近 15 m 內沒有建築），所以其他房子的隨機外觀不變。
    dict(id="museum", zh="二水鐵道博物館", word="museum", en="Railway Museum", lat=23.8134839, lon=120.6172697, kind="model",
         model="bld_museum", size=16.0, lm=True, fictional=True),
]

SETS = [
    {"name": "Set 1 車站散步", "targets": ["teatop", "post", "library", "market", "school", "bookstore", "health", "inn", "seven", "waterpark", "station", "museum"]},
    {"name": "Set 2 越過鐵路", "targets": ["tea2", "post", "library", "pxmart", "fuxing", "bookstore", "health", "qizao", "ok", "fengbo", "station", "museum"]},
    {"name": "Set 3 八堡圳之旅", "targets": ["teatop", "post", "library", "market", "yuanquan", "bookstore", "health", "inn", "seven", "baobao", "station", "museum"]},
    {"name": "Set 4 東西南北", "targets": ["tea2", "post", "library", "pxmart", "esjh", "bookstore", "health", "qizao", "ok", "lawn", "station", "museum"]},
    {"name": "Set 5 二水全攻略", "targets": ["teatop", "post", "library", "pxmart", "school", "bookstore", "health", "inn", "seven", "fengbo", "station", "museum"]},
]
# 2026-11-12：加 museum（虛構的二水鐵道博物館）。每套第 12 站（原本重複單字的地點）換成博物館，仍是 12 題。
WORDS = ["park", "post office", "supermarket", "library", "school", "train station",
         "tea shop", "bookstore", "hospital", "restaurant", "convenience store", "museum"]


def real(lat, lon):
    return ((lon - LON0) * MX, -(lat - LAT0) * MZ)


# 地圖由幾塊「真實街區」組成：市區（原比例 K）＋東南方的源泉一帶、八堡圳公園一帶。
# 街區內部照真實位置與比例；街區之間的距離壓縮（真實約 2.5–4 km），用聯外道路接起來。
OSM_FILES = [os.path.join(os.path.dirname(HERE), "資料", "osm", a) for a in ("ershui-downtown-20261108.json", "ershui-southeast-20261025.json")]
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

    # ---------- 二水街屋清冊（11/08）：8 棟新地標＋沿街店家，用門牌內插找位置 ----------
    chains = SH.street_chains(ways, N, real)
    print("streets", {k: len(v) for k, v in chains.items()})

    def to_latlon(p):
        return LAT0 - p[1] / MZ, p[0] / MX + LON0

    LM_SIZE = {"asia_inn": 7.0, "dental": 5.5, "decheng": 6.0, "shoes": 6.5, "ensheng": 5.5, "farmers": 10.0, "ande": 10.0, "dumpling": 5.5}
    for L in SH.LANDMARKS:
        if "addr" in L:
            q, nrm = SH.shifted(chains, real, L["addr"][0], L["addr"][1], L.get("shift", 0.0))
            if L.get("side_ref"):
                nrm = SH.force_side(chains, real, L["addr"][0], q, nrm, L["side_ref"])
            # 建築中心＝路中線往內（半個路寬＋半棟深），整棟在路邊、不壓到馬路
            back = {"員集路三段": 6.2, "員集路四段": 6.2}.get(L["addr"][0], 5.4) + LM_SIZE[L["id"]] / K * 0.5 + 0.5
            pt = (q[0] + nrm[0] * back, q[1] + nrm[1] * back)
            # 路有轉彎時，離路中線可能不夠遠 → 沿著離路最近的方向推回去，整棟不壓到馬路
            _, q2, _ = SH._project(chains[L["addr"][0]], pt)
            vx, vz = pt[0] - q2[0], pt[1] - q2[1]
            vl = math.hypot(vx, vz)
            if 0.01 < vl < back:
                pt = (q2[0] + vx / vl * back, q2[1] + vz / vl * back)
            la, lo = to_latlon(pt)
        elif "along" in L:
            # 老師 11/08：和便利商店（光文路 9）同一側，沿著路往三角仔方向數過去 N 公尺
            st, ref, meters = L["along"]
            pts = chains[st]
            s_ref, _, _ = SH._project(pts, real(*ref))
            q, dq = SH._at(pts, s_ref + meters)
            nrm = SH.force_side(chains, real, st, q, (-dq[1], dq[0]), ref)
            back = 5.4 + LM_SIZE[L["id"]] / K * 0.5 + 0.5
            la, lo = to_latlon((q[0] + nrm[0] * back, q[1] + nrm[1] * back))
        elif "snap" in L:
            q, nrm = SH.snap_front(chains, real, L["snap"], L["lat"], L["lon"])
            back = {"員集路三段": 6.2, "員集路四段": 6.2}.get(L["snap"], 5.4) + LM_SIZE[L["id"]] / K * 0.5 + 0.5
            la, lo = to_latlon((q[0] + nrm[0] * back, q[1] + nrm[1] * back))
        else:
            la, lo = L["lat"], L["lon"]
        PLACES.append(dict(id=L["id"], zh=L["zh"], word="", en=L["en"], lat=la, lon=lo, kind="osm", style="shop",
                           size=LM_SIZE[L["id"]], lm=True, rel=L.get("rel"), reldoor=L.get("reldoor")))
    for P in PLACES:
        if P["id"] in SH.FRONT_FIX:
            st, P["lat"], P["lon"] = SH.FRONT_FIX[P["id"]]
            sz = P.get("size", 7.0)
            q, nrm = SH.snap_front(chains, real, st, P["lat"], P["lon"])
            nrm = SH.force_side(chains, real, st, q, nrm, SH.FRONT_OPPOSITE)
            nrm = (-nrm[0], -nrm[1])   # 和長春藥局相反的那一側
            back = {"員集路三段": 6.2, "員集路四段": 6.2}.get(st, 5.4) + sz / K * 0.5 + 0.5
            P["lat"], P["lon"] = to_latlon((q[0] + nrm[0] * back, q[1] + nrm[1] * back))
            P["size"] = sz
            P["lm"] = True
    # ---------- 二水國小校園（11/08 重建）----------
    # 角色：OSM 校舍 id → 用途；北教學大樓＋行政大樓是同一棟 L 形（米白）；南教學大樓＝紫紅磚主樓（老師核對配置圖 v3）
    SCHOOL_WAY = 387649066
    SCHOOL_ROLE = {1431118349: ("ladmin", 3), 1004983035: ("main", 4), 1431118369: ("gym", 3), 1431118308: ("stage", 1),
                   1431118423: ("small", 3), 1431118311: ("small", 1), 1431118321: ("small", 1)}
    wmap = {w["id"]: w for w in ways}
    camp_r = [N[n] for n in wmap[SCHOOL_WAY]["nodes"] if n in N][:-1]
    cc = centroid(camp_r)

    def off(dx, dz):   # 配置圖上量的：校園中心往東 dx、往南 dz（真實公尺）
        return (cc[0] + dx, cc[1] + dz)
    th = math.radians(-34.0)
    campus = {
        "outline": [game(q) for q in camp_r],
        "track": None,
        "blds": [], "gates": [], "trees": [],
    }
    for wid, (role, fl) in SCHOOL_ROLE.items():
        if wid in wmap:
            pr = [N[n] for n in wmap[wid]["nodes"] if n in N]
            if pr[0] == pr[-1]:
                pr = pr[:-1]
            if area(pr) < 0:
                pr = pr[::-1]
            campus["blds"].append({"role": role, "floors": fl, "poly": [game(q) for q in dp_simplify(pr + [pr[0]], 0.4)[:-1]]})
    # 操場：在校舍之間找「最大、而且離每棟校舍（含群育館、司令台）至少 1.5 m、在校界內」的跑道（老師：群育館不可以跟操場重疊）
    def samples_r(poly):
        out = list(poly)
        for i in range(len(poly)):
            a2, b3 = poly[i], poly[(i + 1) % len(poly)]
            for t in (0.25, 0.5, 0.75):
                out.append((a2[0] + (b3[0] - a2[0]) * t, a2[1] + (b3[1] - a2[1]) * t))
        return out
    bld_pts = []
    for wid in SCHOOL_ROLE:
        if wid in wmap:
            bld_pts += samples_r([N[n] for n in wmap[wid]["nodes"] if n in N])
    edge_pts = samples_r(camp_r)
    ux, uz = math.cos(th), math.sin(th)

    def gap(cx, cz, A, Bw, q):
        u = (q[0] - cx) * ux + (q[1] - cz) * uz
        v = -(q[0] - cx) * uz + (q[1] - cz) * ux
        return math.hypot(max(abs(u) - (A - Bw), 0.0), v) - Bw
    best_t = None
    for A in [x * 0.5 for x in range(120, 60, -1)]:
        Bw = A * 0.53
        found = None
        for dx in range(-30, 31, 2):
            for dz in range(-30, 31, 2):
                cx, cz = off(-4.6 + dx, 13.5 + dz)
                if min(gap(cx, cz, A, Bw, q) for q in bld_pts) < 1.5:
                    continue
                if min(gap(cx, cz, A, Bw, q) for q in edge_pts) < 2.0:
                    continue
                d0 = dx * dx + dz * dz
                if found is None or d0 < found[0]:
                    found = (d0, cx, cz)
        if found:
            best_t = (A, Bw, found[1], found[2])
            break
    A, Bw, tcx, tcz = best_t
    print("TRACK half-length %.1f m, half-width %.1f m" % (A, Bw))
    campus["track"] = {"c": game((tcx, tcz)), "a": A * K, "b": Bw * K, "dir": [ux, uz]}
    if 1302402017 in wmap:
        campus["courts"] = [game(N[n]) for n in wmap[1302402017]["nodes"] if n in N][:-1]
    br = [N[n] for n in wmap[1311714594]["nodes"] if n in N]
    campus["bridge"] = [game(br[0]), game(br[-1])]
    # 校門（配置圖 v3 的位置）：main＝光文路正門（窄門），side＝光文路側門，east＝東側門，west＝西門（明德橋）
    for kind, dx, dz in [("main", -64.6, -58.5), ("side", 53.8, -76.2), ("east", 123.0, -8.5)]:
        campus["gates"].append({"kind": kind, "p": game(off(dx, dz))})
    # 西門（有時鐘柱的那座，老師 11/08）：就在明德橋靠校園那一端，再往校園裡 2.5 m
    e0, e1 = (br[0], br[-1]) if inside(br[-1], camp_r) or math.hypot(br[-1][0] - cc[0], br[-1][1] - cc[1]) < math.hypot(br[0][0] - cc[0], br[0][1] - cc[1]) else (br[-1], br[0])
    bl = math.hypot(e1[0] - e0[0], e1[1] - e0[1]) or 1.0
    west_r = (e1[0] + (e1[0] - e0[0]) / bl * 2.5, e1[1] + (e1[1] - e0[1]) / bl * 2.5)
    campus["gates"].append({"kind": "west", "p": game(west_r)})
    campus["roundabout"] = game(off(-55.8, -7.7))
    # 樹：沿校界內側每 14 m 一棵（避開校舍與操場），外加一棵大老樹＋白長椅
    def in_track(q):
        return gap(tcx, tcz, A, Bw, q) < 2.5
    sb = [[N[n] for n in wmap[w]["nodes"] if n in N] for w in SCHOOL_ROLE if w in wmap]
    for i in range(len(camp_r)):
        a, b2 = camp_r[i], camp_r[(i + 1) % len(camp_r)]
        L = math.hypot(b2[0] - a[0], b2[1] - a[1])
        n = int(L // 14)
        for k in range(1, n):
            t = k / n
            q = (a[0] + (b2[0] - a[0]) * t, a[1] + (b2[1] - a[1]) * t)
            q = (q[0] + (cc[0] - q[0]) * 6.0 / max(1.0, math.hypot(cc[0] - q[0], cc[1] - q[1])),
                 q[1] + (cc[1] - q[1]) * 6.0 / max(1.0, math.hypot(cc[0] - q[0], cc[1] - q[1])))
            if in_track(q) or any(inside(q, pb) for pb in sb):
                continue
            campus["trees"].append(game(q))
    campus["bigtree"] = game(off(-35.0, -30.0))
    for P in PLACES:
        if P["id"] == "school":
            # 地點中心放在西門裡面一點（鏡頭看得到明德橋、西門、群育館）；門口（Ken 走到的地方）＝明德橋
            P["lat"], P["lon"] = to_latlon(off(-52.0, 80.0))
    removed_campus = {w for w in SCHOOL_ROLE}
    shop_spots = []
    for name, street, no, kind in SH.SHOPS:
        if name in SH.PIN:
            continue   # 用座標釘的店最後才放（見下方 PIN）
        q, nrm = SH.locate(chains, real, street, no)
        shop_spots.append((name, kind, street, no, q, nrm))

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
        if P.get("lm"):
            # 新地標（Colab 模型）：放在算好的位置，不吸附到旁邊的大建築；底下原本的房子拿掉
            c = real(P["lat"], P["lon"])
            if P.get("rel"):
                # 跟某個地點「同一排、往某方向數過去幾間」：沿那棟的臨街方向平移（遊戲公尺）
                base = next(x for x in places if x["id"] == P["rel"][0])
                toward = next(x for x in places if x["id"] == P["rel"][2])
                fx, fz = base["door"][0] - base["pos"][0], base["door"][1] - base["pos"][1]
                fl = math.hypot(fx, fz) or 1.0
                ax, az = fz / fl, -fx / fl
                if (toward["pos"][0] - base["pos"][0]) * ax + (toward["pos"][1] - base["pos"][1]) * az < 0:
                    ax, az = -ax, -az
                g = (base["pos"][0] + ax * P["rel"][1], base["pos"][1] + az * P["rel"][1])
                c = (g[0] / K, g[1] / K)
            if P.get("reldoor"):
                # 從某地點的「門口（路邊）」沿店面線往某方向走 N 遊戲公尺，再往店那一側退：半個路寬＋半棟
                base = next(x for x in places if x["id"] == P["reldoor"][0])
                toward = next((x for x in places if x["id"] == P["reldoor"][2]), None) or next(x for x in PLACES if x["id"] == P["reldoor"][2])
                tp = toward["pos"] if "pos" in toward else game(real(toward["lat"], toward["lon"]))
                fx, fz = base["door"][0] - base["pos"][0], base["door"][1] - base["pos"][1]
                fl = math.hypot(fx, fz) or 1.0
                fx, fz = fx / fl, fz / fl
                ax, az = fz, -fx
                if (tp[0] - base["door"][0]) * ax + (tp[1] - base["door"][1]) * az < 0:
                    ax, az = -ax, -az
                bk = 2.3 + P["size"] * 0.5 + 0.4
                g = (base["door"][0] + ax * P["reldoor"][1] - fx * bk, base["door"][1] + az * P["reldoor"][1] - fz * bk)
                c = (g[0] / K, g[1] / K)
            rr = P["size"] / K * 0.6
            for bb in blds:
                if bb["id"] not in removed and (math.hypot(bb["c_r"][0] - c[0], bb["c_r"][1] - c[1]) < rr or inside(c, bb["poly_r"])):
                    removed.add(bb["id"])
            pos = game(c)
            d, door, _ = nearest_road(pos)
            Q.pop("lm", None)
            Q.pop("rel", None)
            Q.pop("reldoor", None)
            Q.update(pos=pos, door=door, door_dist=round(d, 2))
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
        if P["kind"] == "campus":
            for bb in blds:
                if bb["id"] in removed_campus or inside(bb["c_r"], camp_r) or math.hypot(bb["c_r"][0] - west_r[0], bb["c_r"][1] - west_r[1]) < 9.0:
                    removed.add(bb["id"])
            # 老師 11/12 iPad：Ken 到學校「站在河流上面」（門口原本是明德橋正中間＝圳水上）
            # → 改站在橋頭靠校門那端的紅磚廣場（離圳岸約 2 m），面向西門（look）
            wg = campus["gates"][3]["p"] if len(campus["gates"]) > 3 else campus["bridge"][1]
            b0, b1 = campus["bridge"][0], campus["bridge"][1]
            mid = b0 if math.hypot(b0[0] - wg[0], b0[1] - wg[1]) < math.hypot(b1[0] - wg[0], b1[1] - wg[1]) else b1
            Q["door"] = [round(mid[0], 2), round(mid[1], 2)]
            Q["look"] = [round(wg[0], 2), round(wg[1], 2)]
            Q["door_dist"] = round(math.hypot(Q["pos"][0] - mid[0], Q["pos"][1] - mid[1]), 2)
        if P["kind"] in ("waterpark", "lawn"):
            for bb in blds:
                gb = game(bb["c_r"])
                if math.hypot(gb[0] - pos[0], gb[1] - pos[1]) < 11.0:
                    removed.add(bb["id"])
        places.append(Q)
    # 老師 11/08：亞洲旅社和旁邊的便利商店要「面對火車站前的廣場」（不是面對警察局）→ 門口改成朝車站那一側最近的路
    FACE_TOWARD = {"ok": "station", "asia_inn": "station"}   # 牙醫、德成百貨改照 Google 空拍放在光文路旁、正門朝光文路（shops_ershui snap）
    byid = {q["id"]: q for q in places}
    for pid, tid in FACE_TOWARD.items():
        if pid not in byid or tid not in byid:
            continue
        Q = byid[pid]
        pos, tgt = Q["pos"], byid[tid]["pos"]
        tv = (tgt[0] - pos[0], tgt[1] - pos[1])
        tl = math.hypot(*tv) or 1.0
        probe = (pos[0] + tv[0] / tl * 6.0, pos[1] + tv[1] / tl * 6.0)   # 店的正前方（朝車站）
        d, q, _ = nearest_road(probe)
        Q["door"] = [q[0], q[1]]
        Q["door_dist"] = round(math.hypot(q[0] - pos[0], q[1] - pos[1]), 2)
        Q["face"] = [round(tv[0] / tl, 3), round(tv[1] / tl, 3)]       # 建築正面朝向（world.gd 用）
    nodes.update(extra_nodes)
    gedges += extra_edges
    segs = [(nodes[a], nodes[b]) for a, b, *_ in gedges]

    # 店家 → 該側最近的臨街建築（同一棟只放一家）
    # 店家 → 門牌那一側的建築；OSM 沒畫到的店面（二水很多街屋 OSM 沒有）就照門牌位置補一棟 5 m 寬的店面。
    # 再沿 4 條主要街道把空著的臨街面補上一般透天（不放名字、門牌）。老師 11/08：街道兩旁都要有建築。
    road_r = []   # 真實座標的道路線段（給「新蓋的房子不能壓到路」）
    for ids, wd, nm in road_ways:
        for a, b2 in zip(ids, ids[1:]):
            road_r.append((N[a], N[b2], wd / K / 2.0 + 0.6))
    place_r = []
    for P in PLACES:
        if "lat" in P and P["kind"] not in ("outer", "local"):
            place_r.append((real(P["lat"], P["lon"]), P.get("size", 10.0) / K * 0.55 + 2.0))
    kept = [b for b in blds if b["id"] not in removed]
    synth = []

    def rect(q, nrm, along, off, w, dpt):
        f0 = (q[0] + nrm[0] * off - along[0] * w / 2, q[1] + nrm[1] * off - along[1] * w / 2)
        f1 = (q[0] + nrm[0] * off + along[0] * w / 2, q[1] + nrm[1] * off + along[1] * w / 2)
        return [f0, f1, (f1[0] + nrm[0] * dpt, f1[1] + nrm[1] * dpt), (f0[0] + nrm[0] * dpt, f0[1] + nrm[1] * dpt)]

    def samples(poly):
        pts = list(poly) + [centroid(poly)]
        for i in range(len(poly)):
            a, b2 = poly[i], poly[(i + 1) % len(poly)]
            pts.append(((a[0] + b2[0]) / 2, (a[1] + b2[1]) / 2))
        return pts

    def hits_building(poly):
        sp = samples(poly)
        c = centroid(poly)
        for b in kept + synth:
            bc = b["c_r"]
            if math.hypot(bc[0] - c[0], bc[1] - c[1]) > 40:
                continue
            if any(inside(x, b["poly_r"]) for x in sp) or any(inside(x, poly) for x in b["poly_r"]):
                return b
        return None

    def free(poly):
        if region_of(centroid(poly)) is not REGIONS[0]:
            return False
        if any(inside(x, camp_r) for x in samples(poly)):
            return False
        for x in samples(poly):
            for a, b2, hw in road_r:
                if seg_dist_only(x, a, b2) < hw:
                    return False
            for pc, pr in place_r:
                if math.hypot(x[0] - pc[0], x[1] - pc[1]) < pr:
                    return False
        return hits_building(poly) is None

    shop_of = {}
    shop_log = []
    OFF = {"員集路三段": 6.2, "員集路四段": 6.2, "光文路": 5.4, "惠民路": 5.4}
    for name, kind, street, no, q, nrm in shop_spots:
        along = (nrm[1], -nrm[0])
        off = OFF.get(street, 5.4)
        got = None
        probe = (q[0] + nrm[0] * (off + 4.0), q[1] + nrm[1] * (off + 4.0))
        for b in kept:
            if b["id"] not in shop_of and inside(probe, b["poly_r"]):
                got = b
                break
        if got is None:
            for sh in (0.0, 3.0, -3.0, 6.0, -6.0, 9.0, -9.0):
                qq = (q[0] + along[0] * sh, q[1] + along[1] * sh)
                poly = rect(qq, nrm, along, off, 5.0, 10.0)
                if free(poly):
                    got = {"id": "s%d" % len(synth), "poly_r": poly, "c_r": centroid(poly), "tag": "yes", "name": name, "levels": "", "amenity": ""}
                    synth.append(got)
                    break
                hb = hits_building(poly)
                if hb is not None and hb["id"] not in shop_of and hb["id"] not in removed:
                    got = hb
                    break
        if got is not None:
            shop_of[got["id"]] = {"name": name, "kind": kind}
            shop_log.append((name, street, no, got["id"]))
        else:
            shop_log.append((name, street, no, None))
    n_shop_synth = len(synth)
    for street in ("光文路", "員集路三段", "員集路四段", "惠民路"):
        pts = chains.get(street)
        if not pts:
            continue
        off = OFF[street]
        acc = 0.0
        for a, b2 in zip(pts, pts[1:]):
            L = math.hypot(b2[0] - a[0], b2[1] - a[1])
            if L < 0.5:
                continue
            along = ((b2[0] - a[0]) / L, (b2[1] - a[1]) / L)
            t = 2.5
            while t < L - 2.5:
                q = (a[0] + along[0] * t, a[1] + along[1] * t)
                for sgn in (1.0, -1.0):
                    nrm = (-along[1] * sgn, along[0] * sgn)
                    poly = rect(q, nrm, along, off, 5.0, 9.0 + (t * 7.0 % 3.0))
                    if free(poly):
                        synth.append({"id": "s%d" % len(synth), "poly_r": poly, "c_r": centroid(poly), "tag": "yes", "name": "", "levels": "", "amenity": ""})
                t += 5.2
    # 還沒有房子的店：找同一側、20 m 內最近、還沒放店的房子（包含剛補的透天）
    for k, x in enumerate(shop_log):
        if x[3] is not None:
            continue
        name, street, no = x[0], x[1], x[2]
        spot = next(sp for sp in shop_spots if sp[0] == name and sp[2] == street and sp[3] == no)
        q, nrm = spot[4], spot[5]
        best = None
        for bb in kept + synth:
            if bb["id"] in shop_of:
                continue
            v = (bb["c_r"][0] - q[0], bb["c_r"][1] - q[1])
            d = math.hypot(*v)
            same = v[0] * nrm[0] + v[1] * nrm[1] > 1.0
            score = d if same else d + 12.0     # 同一側優先；那一側真的沒房子（學校、空地）才放對面
            if d < 24.0 and (best is None or score < best[0]):
                best = (score, bb)
        if best:
            shop_of[best[1]["id"]] = {"name": name, "kind": spot[1]}
            shop_log[k] = (name, street, no, best[1]["id"])
    # 用 Google 地圖座標釘的店（shops_ershui.PIN）：投影到那條路、換到參考點（便利商店）那一側，
    # 補一棟 5 m 寬店屋；不壓路、不碰任何房子、不進地點範圍。放在所有補的房子最後面，別的房子的外觀亂數不會錯位。
    for name, (street, la, lo, ref) in SH.PIN.items():
        kind = next(k for n, st, no, k in SH.SHOPS if n == name)
        q, nrm = SH.snap_front(chains, real, street, la, lo)
        nrm = SH.force_side(chains, real, street, q, nrm, ref)
        along = (nrm[1], -nrm[0])
        pin_r = real(la, lo)
        best = None

        def pin_ok(poly):
            for x in samples(poly):
                for a, b2, hw in road_r:
                    if seg_dist_only(x, a, b2) < hw:
                        return False
                for P in places:
                    if P["id"] in ("station",) or "size" not in P:
                        continue
                    pc = (P["pos"][0] / K, P["pos"][1] / K)
                    if math.hypot(x[0] - pc[0], x[1] - pc[1]) < P["size"] / K * 0.62 + 0.5:   # 模型會轉向，用比半邊大一點的圓
                        return False
            return hits_building(poly) is None

        for dpt in (9.0, 8.0, 7.0, 6.0, 5.0):
            for sh in (0.0, 1.5, -1.5, 3.0, -3.0, 4.5, -4.5, 6.0, -6.0):
                qq = (q[0] + along[0] * sh, q[1] + along[1] * sh)
                poly = rect(qq, nrm, along, OFF.get(street, 5.4), 5.0, dpt)
                if pin_ok(poly):
                    d0 = math.hypot(centroid(poly)[0] - pin_r[0], centroid(poly)[1] - pin_r[1])
                    if best is None or d0 < best[0]:
                        best = (d0, poly)
            if best:
                break
        if best:
            got = {"id": "s%d" % len(synth), "poly_r": best[1], "c_r": centroid(best[1]), "tag": "yes", "name": name, "levels": "", "amenity": ""}
            synth.append(got)
            shop_of[got["id"]] = {"name": name, "kind": kind}
            shop_log.append((name, street, "PIN", got["id"]))
            print("PIN", name, "game", game(got["c_r"]), "dist to Google point (real m) %.1f" % best[0])
        else:
            shop_log.append((name, street, "PIN", None))
            print("PIN FAILED", name)
    blds += synth
    print("shops placed", sum(1 for x in shop_log if x[3]), "/", len(shop_log), "new shop houses", n_shop_synth, "new street houses", len(synth) - n_shop_synth)
    for x in shop_log:
        if x[3] is None:
            print("  NO BUILDING", x[1], x[2])

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
        ob = {"poly": poly, "front": best[1], "street": street, "style": style,
              "levels": int(float(lv)) if lv else 0, "id": b["id"]}
        if b["id"] in shop_of:
            ob.update(shop=shop_of[b["id"]], style="C", street=True)   # 店家一律畫成臨街店面
        out_b.append(ob)

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
    out = {"K": K, "nodes": nodes, "edges": gedges, "places": places, "buildings": out_b, "campus": campus,
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
