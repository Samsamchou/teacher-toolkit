"""空拍截圖對位：把 Google 地圖空拍截圖上的「像素位置」換成經緯度（2026-11-08，二水牙醫／德成／飲料店就是這樣放對的）。

做法：截圖上找 2 個以上「遊戲裡已經有正確經緯度」的點（例：便利商店、長春藥局、車站），
用相似變換（平移＋旋轉＋等比例縮放，最小平方）算出像素 → 公尺 → 經緯度。
再把要放的店：店名標記的像素位置、正門朝向的像素點（通常是門前的路），換成 lat/lon 與朝向。

用法：寫一個 JSON（例：資料/aerial/guangwen-20261108.json）
{
  "image": "guangwen.png",
  "anchors": [{"name": "長春藥局", "px": [550, 530], "lat": 23.81187, "lon": 120.61686},
              {"name": "謝毛宅",   "px": [240, 560], "lat": 23.811873, "lon": 120.616452}],
  "points":  [{"id": "teatop", "px": [690, 205], "face_px": [720, 250]}]
}
python -I tools/aerial_georef.py 資料/aerial/guangwen-20261108.json
→ 印出每個點的 lat、lon、朝向（正北 0 度、順時針），以及每個錨點的誤差（公尺），誤差 > 3 m 要換錨點。

注意：空拍圖只當「對位參考」，放在 資料/aerial/（不入庫、不放進遊戲畫面）。
"""
import json
import math
import sys

LAT0 = 23.8113
MZ = 110560.0


def mx(lat):
    return 111320.0 * math.cos(math.radians(lat))


def main() -> None:
    cfg = json.load(open(sys.argv[1], encoding="utf-8"))
    A = cfg["anchors"]
    assert len(A) >= 2, "至少要 2 個錨點"
    lat_ref = sum(a["lat"] for a in A) / len(A)
    lon_ref = sum(a["lon"] for a in A) / len(A)
    MX = mx(lat_ref)
    # 錨點：像素 (u, v)（v 往下）→ 公尺 (x 東, y 北)
    P = [(a["px"][0], -a["px"][1]) for a in A]
    Q = [((a["lon"] - lon_ref) * MX, (a["lat"] - lat_ref) * MZ) for a in A]
    pc = (sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P))
    qc = (sum(q[0] for q in Q) / len(Q), sum(q[1] for q in Q) / len(Q))
    # 複數最小平方：q - qc = s * (p - pc)，s = a + b i（旋轉＋縮放）
    num_re = num_im = den = 0.0
    for p, q in zip(P, Q):
        px, py = p[0] - pc[0], p[1] - pc[1]
        qx, qy = q[0] - qc[0], q[1] - qc[1]
        num_re += px * qx + py * qy
        num_im += px * qy - py * qx
        den += px * px + py * py
    a, b = num_re / den, num_im / den
    scale = math.hypot(a, b)
    rot = math.degrees(math.atan2(b, a))

    def to_m(px):
        u, v = px[0] - pc[0], -px[1] - pc[1]
        return (qc[0] + a * u - b * v, qc[1] + b * u + a * v)

    def to_ll(m):
        return lat_ref + m[1] / MZ, lon_ref + m[0] / MX

    print("比例 %.3f m/像素，旋轉 %.1f 度（0＝圖的上方就是正北）" % (scale, rot))
    for an, q in zip(A, Q):
        m = to_m(an["px"])
        print("  錨點 %-8s 誤差 %.1f m" % (an["name"], math.hypot(m[0] - q[0], m[1] - q[1])))
    for pt in cfg.get("points", []):
        m = to_m(pt["px"])
        la, lo = to_ll(m)
        line = '  %-10s lat=%.6f, lon=%.6f' % (pt["id"], la, lo)
        if "face_px" in pt:
            f = to_m(pt["face_px"])
            ang = math.degrees(math.atan2(f[0] - m[0], f[1] - m[1])) % 360
            line += "  正門朝向 %.0f 度（0＝北、90＝東）" % ang
        print(line)


if __name__ == "__main__":
    main()
