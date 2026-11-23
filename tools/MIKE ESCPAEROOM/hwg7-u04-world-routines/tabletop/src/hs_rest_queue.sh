#!/bin/bash
# 11/23 evening: shots WITHOUT the clock-pointing pose (the pointing shots wait for the new palm-up point, teacher check first).
cd "$(dirname "$0")/.."
KE4UG_FRAMES=$(seq -s, 0 2 88)
run() { local scene=$1; shift; python src/colab_run.py final "$scene" "$@" > work/_hsq.log 2>&1; d=$(grep -o "qa.[0-9-]*" work/_hsq.log | tail -1); echo "BATCH $scene $* -> $d" >> work/hs_final_queue.log; }
echo "REST $(date)" >> work/hs_final_queue.log
run usa_lunch "US2 all"
run spain_lunch "SP2 all" "SP4 all"
run kenya_dinner "KE4 all"
run kenya_dinner "KE4UG $KE4UG_FRAMES"
run india_cricket "IN2 all" "IN3 all"
run india_cricket "IN4 all"
run singapore_study "D2 all" "D3 all"
run singapore_study "D4 all"
run australia_homework "D0 all" "D3 all"
run australia_homework "D4 all"
echo DONE_REST >> work/hs_final_queue.log
