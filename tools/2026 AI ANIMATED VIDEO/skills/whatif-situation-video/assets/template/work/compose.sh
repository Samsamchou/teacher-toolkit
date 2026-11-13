#!/bin/bash
# 3D 渲完 → 字幕版（＋720p）→ 聽力版（＋720p）
cd "$(dirname "$0")/.."
for s in s02 s03 s03run s04 s05 s06 s07 s08 s09 s10 s11; do echo -n "$s:$(ls renders/3d/$s/*.png 2>/dev/null | wc -l) "; done; echo
echo "SUBSTART $(date +%H:%M)"
python src/render.py video whatif-NAME-full-v1 2>&1 | grep -E "PAGEERROR|Error|video ->|frame 0/" 
ffmpeg -v error -y -i renders/whatif-NAME-full-v1.mp4 -vf scale=1280:-2 -c:v libx264 -crf 23 -preset medium -c:a copy renders/whatif-NAME-full-v1-720p.mp4
echo "SUBDONE $(date +%H:%M)"
python src/render.py video whatif-NAME-full-v1-listening --nokara 2>&1 | grep -E "PAGEERROR|Error|video ->"
ffmpeg -v error -y -i renders/whatif-NAME-full-v1-listening.mp4 -vf scale=1280:-2 -c:v libx264 -crf 23 -preset medium -c:a copy renders/whatif-NAME-full-v1-listening-720p.mp4
echo "LISTENDONE $(date +%H:%M)"
