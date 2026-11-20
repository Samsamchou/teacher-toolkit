#!/bin/bash
# 平行生參考圖；Codex 寫不進 G 槽，先存暫存資料夾再複製回 refs/
S="C:/Users/User/AppData/Local/Temp/claude/aaf16480e401efc6/e6a137bb-76c3-4e54-9854-ecac5ed35a82/scratchpad/refs"; R="G:/我的雲端硬碟/teacher-toolkit/tools/MIKE ESCPAEROOM/hwg7-u04-world-routines/tabletop/refs"
for n in "$@"; do
  ( mkdir -p "$S/$n" && cd "$S/$n" && python "$R/ref_prompts.py" $n > p.txt && codex exec --skip-git-repo-check -s workspace-write - < p.txt > log.txt 2>&1; cp "$S/$n/$n.png" "$R/" && echo "done $n" || echo "FAIL $n" ) &
done
wait
