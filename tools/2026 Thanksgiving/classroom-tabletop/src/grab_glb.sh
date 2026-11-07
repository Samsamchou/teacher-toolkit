#!/bin/bash
# 等「下載」資料夾出現新的 tripo_convert_*.glb（比 props 裡已收的都新），改名搬到 props/<name>.glb
NAME=$1; DL=/c/Users/User/Downloads; P="G:/我的雲端硬碟/teacher-toolkit/tools/2026 Thanksgiving/classroom-tabletop/props"
SEEN="$P/.seen_glb"; touch "$SEEN"
for i in $(seq 1 90); do
  for f in $(ls -t $DL/tripo_convert_*.glb 2>/dev/null); do
    b=$(basename $f); grep -qx "$b" "$SEEN" && continue
    sleep 2; cp "$f" "$P/$NAME.glb"; echo "$b" >> "$SEEN"; echo "$NAME <- $b $(stat -c %s "$f") bytes"; exit 0
  done; sleep 2
done; echo "timeout $NAME"; exit 1
