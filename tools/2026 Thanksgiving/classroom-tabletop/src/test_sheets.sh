#!/bin/bash
# 本機 EEVEE 縮圖：每段 r1/r2 各取幾張（40% 大小）
P="G:/我的雲端硬碟/teacher-toolkit/tools/2026 Thanksgiving"; T="$P/classroom-tabletop"; B=/c/Users/User/blender-5.2/blender-5.2.2-windows-x64/blender.exe
run(){ "$B" -b --factory-startup --python "$T/src/scenes.py" -- "$T/props" "$P/opening-video/work/fonts" $1 $2 sheet "$T/qa/t/$1$2" $3 BLENDER_EEVEE 16 ${4:-40} 2>&1 | grep -E "Error|Traceback|line [0-9]+" | head -8; }
for job in "$@"; do set -- $job; run $1 $2 $3 $4 & done; wait
