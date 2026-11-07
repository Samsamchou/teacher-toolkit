#!/bin/bash
# 最多同時 3 個 Codex（不吃本機效能，但保守一點）
S=/c/Users/User/AppData/Local/Temp/claude/9c567b2d1be164f4/74b0241f-f091-47af-b845-0bdd72b37570/scratchpad/codex
R="G:/我的雲端硬碟/teacher-toolkit/tools/2026 Thanksgiving/classroom-tabletop/refs"
one(){ n=$1; mkdir -p $S/$n; cd $S/$n; python "$R/batch2_prompts.py" $n > p.txt
  if [ $n = tisquantum ] || [ $n = massasoit ]; then cp "$R/wampanoag_man.png" ref.png; codex exec --skip-git-repo-check -s workspace-write -i ref.png - < p.txt > log.txt 2>&1
  else codex exec --skip-git-repo-check -s workspace-write - < p.txt > log.txt 2>&1; fi
  cp $S/$n/$n.png "$R/" 2>/dev/null && echo "done $n" || echo "FAIL $n"; }
one tisquantum & one massasoit & one cottage & wait
one corn & one harvest_basket & one feast_table & wait
one desk_calendar
