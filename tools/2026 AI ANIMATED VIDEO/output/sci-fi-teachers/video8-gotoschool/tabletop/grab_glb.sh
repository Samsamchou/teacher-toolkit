#!/bin/bash
# 等「下載」資料夾出現新的 tripo_convert_*.glb（或 Tripo 匯出的 *.glb），改名搬到 props/<name>.glb（從感恩節版 grab_glb.sh 改）
NAME=$1; DL=/c/Users/User/Downloads; P="G:/我的雲端硬碟/teacher-toolkit/tools/2026 AI ANIMATED VIDEO/output/sci-fi-teachers/video8-gotoschool/tabletop/props"
SEEN="$P/.seen_glb"; touch "$SEEN"; START=$(date +%s)
for i in $(seq 1 120); do
  for f in $(ls -t $DL/*.glb 2>/dev/null); do
    b=$(basename "$f"); grep -qx "$b" "$SEEN" && continue
    [ $(stat -c %Y "$f") -lt $((START-120)) ] && continue
    s1=$(stat -c %s "$f"); sleep 3; s2=$(stat -c %s "$f"); [ "$s1" != "$s2" ] && continue
    cp "$f" "$P/$NAME.glb"; echo "$b" >> "$SEEN"; echo "$NAME <- $b $s2 bytes"; exit 0
  done; sleep 2
done; echo "timeout $NAME"; exit 1
