#!/bin/bash
# 一鏡一批：每鏡渲完立刻下載，Colab 斷線最多只損失一鏡
cd "$(dirname "$0")/.."
for s in "$@"; do
  for try in 1 2; do
    echo "START $s try$try $(date +%H:%M)"
    GPU=G4 python src/colab_3d.py $s all 28 100 > work/run_$s.log 2>&1
    n=$(ls renders/3d/$s/*.png 2>/dev/null | wc -l)
    echo "DONE $s frames=$n $(date +%H:%M)"
    [ "$n" -ge 139 ] && break
  done
done
python src/colab_3d.py stop > work/run_stop.log 2>&1
echo "ALLDONE $(date +%H:%M) balance $(colab usage 2>&1 | grep -i balance)"
