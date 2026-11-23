#!/bin/bash
# Resume of hs_final_queue.sh after the 11/23 shutdown: UK and USA US3/US4 are done; USA US1/US2 failed; Spain batch 1 was cut off.
cd "$(dirname "$0")/.."
KE4UG_FRAMES=$(seq -s, 0 2 88)
run() { local scene=$1; shift; python src/colab_run.py final "$scene" "$@" > work/_hsq.log 2>&1; d=$(grep -o "qa.[0-9-]*" work/_hsq.log | tail -1); echo "BATCH $scene $* -> $d" >> work/hs_final_queue.log; }
echo "RESUME $(date)" >> work/hs_final_queue.log
run usa_lunch "US1 all" "US2 all"
run spain_lunch "SP1 all" "SP4 all"
run spain_lunch "SP2 all"
run kenya_dinner "KE1 all" "KE4UG $KE4UG_FRAMES"
run kenya_dinner "KE4 all"
run india_cricket "IN1 all" "IN2 all"
run india_cricket "IN3 all" "IN4 all"
run singapore_study "D1 all" "D2 all"
run singapore_study "D3 all" "D4 all"
run australia_homework "D0 all" "D1 all"
run australia_homework "D3 all" "D4 all"
echo DONE >> work/hs_final_queue.log
