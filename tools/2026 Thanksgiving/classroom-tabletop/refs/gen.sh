#!/bin/bash
# 平行生 7 張參考圖；Codex 存在 scratch，再複製回 refs/
S=/c/Users/User/AppData/Local/Temp/claude/9c567b2d1be164f4/74b0241f-f091-47af-b845-0bdd72b37570/scratchpad/codex
R="G:/我的雲端硬碟/teacher-toolkit/tools/2026 Thanksgiving/classroom-tabletop/refs"
for n in "$@"; do
  ( mkdir -p $S/$n && cd $S/$n && python "$R/char_prompts.py" $n > p.txt && codex exec --skip-git-repo-check -s workspace-write - < p.txt > log.txt 2>&1; cp $S/$n/$n.png "$R/" && echo "done $n" || echo "FAIL $n" ) &
done
wait
