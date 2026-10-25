"""下載二水市區的 OpenStreetMap 資料（道路、建築輪廓、鐵路、水道、設施），存到 3D planet/資料/osm/。

資料授權：© OpenStreetMap contributors，ODbL 1.0（遊戲內與說明要標示出處）。
用法：python -I tools/fetch_osm.py
"""
import json
import os
import urllib.parse
import urllib.request
from collections import Counter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(os.path.dirname(HERE), "資料", "osm")
import sys
AREAS = {"downtown": "23.8040,120.6100,23.8175,120.6260",   # 南,西,北,東：二水車站周邊約 1.5 km × 1.6 km
         "southeast": "23.7960,120.6380,23.8060,120.6640"}  # 二水國中、源泉國小、林先生廟、八堡圳公園
AREA = sys.argv[1] if len(sys.argv) > 1 else "downtown"
BBOX = AREAS[AREA]

QUERY = f"""[out:json][timeout:90];
(
  way["highway"]({BBOX});
  way["building"]({BBOX});
  relation["building"]({BBOX});
  way["railway"]({BBOX});
  way["waterway"]({BBOX});
  way["leisure"]({BBOX});
  way["landuse"]({BBOX});
  way["amenity"]({BBOX});
  node["amenity"]({BBOX});
  node["shop"]({BBOX});
  node["tourism"]({BBOX});
  node["historic"]({BBOX});
  way["historic"]({BBOX});
);
out body;
>;
out skel qt;"""


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    req = urllib.request.Request(
        "https://overpass-api.de/api/interpreter",
        data=urllib.parse.urlencode({"data": QUERY}).encode(),
        headers={"User-Agent": "ershui-planet-classroom-game/0.1 (teacher project)", "Accept": "application/json"},
    )
    raw = urllib.request.urlopen(req, timeout=120).read()
    path = os.path.join(OUT, "ershui-%s-20261025.json" % AREA)
    open(path, "wb").write(raw)
    j = json.loads(raw)
    els = j["elements"]
    ways = [e for e in els if e["type"] == "way"]
    tagged = [e for e in els if "tags" in e]
    print("saved", path, len(raw) // 1024, "KB; ways", len(ways), "tagged", len(tagged))
    print("highway", Counter(w["tags"].get("highway") for w in ways if "highway" in w.get("tags", {})).most_common())
    bl = [w for w in ways if "building" in w.get("tags", {})]
    print("buildings", len(bl), Counter(w["tags"].get("building") for w in bl).most_common(8))
    print("with levels", sum(1 for w in bl if "building:levels" in w["tags"]))
    for e in tagged:
        t = e["tags"]
        if t.get("amenity") in ("police", "fire_station", "townhall", "post_office", "library", "school", "hospital",
                                "clinic", "place_of_worship", "bank", "marketplace", "restaurant", "cafe", "fast_food") \
                or t.get("shop") in ("convenience", "supermarket", "books", "tea", "beverages") or "historic" in t:
            print(t.get("amenity") or t.get("shop") or t.get("historic"), "|", t.get("name"), "|", e["type"], e["id"])


if __name__ == "__main__":
    main()
