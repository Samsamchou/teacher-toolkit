"""讀 Colab check 模式的 .chk 檔，列出每段每個人物：頭頂最高到哪、臉最糊多少像素、有沒有被時間軸擋到。
  python src/chk_report.py qa/colab/<stamp>/tout
  規則（v2 RDQ）：畫面裡的主要人物（身高 > 畫面 15%）頭頂要在 0.92 以下（上緣留 8%）；臉的模糊直徑 ≤ 3 像素（1080p）；
  時間軸（右上角 x>0.78、y>0.87）不能擋到臉。
"""
import sys
from collections import defaultdict
from pathlib import Path

TOP, COC, BIG = 0.92, 3.0, 0.15
bad_total = 0
for p in sorted(Path(sys.argv[1]).glob("*.chk")):
    rows = [l.split() for l in p.read_text().splitlines() if l.startswith("CHK")]
    per = defaultdict(lambda: dict(top=0.0, coc=0.0, n=0, cut=0, blur=0, tl=0))
    for _, fr, name, ty, fy, cx, cy, coc, d, cz in rows:
        ty, fy, cx, cy, coc, cz = map(float, (ty, fy, cx, cy, coc, cz))
        if cz <= 0 or not (0 < cx < 1 and 0 < cy < 1): continue        # 臉不在畫面裡
        if ty - fy < BIG: continue                                       # 太小（遠景）不算主要人物
        q = per[name]; q["n"] += 1; q["top"] = max(q["top"], ty); q["coc"] = max(q["coc"], coc)
        q["cut"] += ty > TOP; q["blur"] += coc > COC; q["tl"] += cx > 0.78 and cy > 0.87
    print(f"== {p.stem}")
    for name, q in per.items():
        flag = []
        if q["cut"]: flag.append(f"頭太高 {q['cut']}/{q['n']}")
        if q["blur"]: flag.append(f"糊 {q['blur']}/{q['n']}")
        if q["tl"]: flag.append(f"時間軸 {q['tl']}/{q['n']}")
        bad_total += bool(flag)
        print(f"   {name:16s} 頭頂最高 {q['top']:.2f}  最糊 {q['coc']:.1f}px  {'  '.join(flag) or 'OK'}")
print("問題數：", bad_total)

# v3：腳底貼地（誤差 -1.0～+2.0 mm，走路小跳最多 1.5 mm）、人物不能跟桌子重疊、立牌要完整在畫面內且不被擋住
g_bad = defaultdict(list); fl_bad = defaultdict(list); bad2 = 0
for p in sorted(Path(sys.argv[1]).glob("*.chk")):
    for l in p.read_text().splitlines():
        a = l.split()
        if a[0] == "GND" and a[5] == "1":
            g, hit = float(a[3]), a[4]
            if not -1.0 <= g <= 2.0 or hit != "-": g_bad[(p.stem, a[2])].append(f"{a[1]}:{g:+.1f}mm{'' if hit == '-' else ' 撞' + hit}")
        if a[0] == "FLG":
            inside, occ, n = int(a[3]), int(a[4]), int(a[5])
            if 0 < inside < n or (inside == n and occ > 2): fl_bad[(p.stem, a[2])].append(f"{a[1]}:{inside}/{n}在內,{occ}被擋")
for k, v in list(g_bad.items()) + list(fl_bad.items()):
    bad2 += 1; print("  ✗", k[0], k[1], len(v), "格", " ".join(v[:4]))
print("貼地／桌子／立牌問題數：", bad2)
