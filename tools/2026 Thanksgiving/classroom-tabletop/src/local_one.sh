#!/bin/bash
# 本機一次只開一個 Blender：依序跑每個 "SID SHOT frames"
P="G:/我的雲端硬碟/teacher-toolkit/tools/2026 Thanksgiving"; T="$P/classroom-tabletop"; B=/c/Users/User/blender-5.2/blender-5.2.2-windows-x64/blender.exe
for job in "$@"; do set -- $job
  "$B" -b --factory-startup --python "$T/src/scenes.py" -- "$T/props" "$P/opening-video/work/fonts" $1 $2 sheet "$T/qa/t3/$1$2" $3 BLENDER_EEVEE 16 40 2>&1 | grep -E "Error|Traceback|line [0-9]+" | head -6
  echo "done $1 $2"
done
