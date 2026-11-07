#!/usr/bin/env bash
# v3 流水線：Colab 一批一批正式渲染，每批渲完就在本機背景合成那幾句（不等全部渲完）。
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8
LOG=work/pipeline_v3.log; : > "$LOG"
python src/compose_all.py O >> "$LOG" 2>&1 &          # 片頭 24 秒（只用舊的書本畫面，不用重渲）
batch() {   # $1 = 要合成的段落；其餘 = colab 工作
    local secs="$1"; shift
    echo "RENDER $secs $(date +%H:%M)" >> "$LOG"
    python src/colab_run.py final "$@" >> "$LOG" 2>&1
    echo "RENDERED $secs $(date +%H:%M)" >> "$LOG"
    python src/compose_all.py $secs >> "$LOG" 2>&1 &
}
batch "S05 S06" "S05 r1 all" "S05 r2 all" "S06 r1 all" "S06 r2 all"
batch "S07 S08" "S07 r1 all" "S07 r2 all" "S08 r1 all" "S08 r2 all"
batch "S09" "S09 r1 all" "S09 r2 all"
batch "S10" "S10 r1 all" "S10 r2 all"
batch "S11 S12 Q" "S11 r1 all" "S11 r2 all" "S12 r1 all" "S12 r2 all"
wait
python src/compose_all.py film >> "$LOG" 2>&1
echo "ALLDONE $(date +%H:%M)" >> "$LOG"
