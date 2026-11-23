#!/bin/bash
# 11/23 night: final re-renders after the teacher approved the grip / desk / Kenya fixes. Two Colab sessions in parallel:
#   A (wrt,  colab_run.py,  work/)  Kenya + India      B (wrt2, colab_run2.py, work2/)  Singapore + Australia
# Each finished batch writes "BATCH <q> <scene> <shots> -> <qa dir>" to work/hs_fix_queue.log; "DONE_A" / "DONE_B" at the end.
cd "$(dirname "$0")/.."
LOG=work/hs_fix_queue.log
run() { local runner=$1 tag=$2 scene=$3; shift 3; python src/$runner final "$scene" "$@" > work/_fix_$tag.log 2>&1; d=$(grep -a -o "qa.[0-9-]*" work/_fix_$tag.log | tail -1); echo "BATCH $tag $scene $* -> $d" >> $LOG; }
KE4UG_FRAMES=$(seq -s, 0 2 88)
qa() {
  run colab_run.py A kenya_dinner "KE1 all"
  run colab_run.py A kenya_dinner "KE4 all"
  run colab_run.py A kenya_dinner "KE4UG $KE4UG_FRAMES"
  run colab_run.py A india_cricket "IN1 all"
  run colab_run.py A india_cricket "IN2 all" "IN3 all"
  echo DONE_A >> $LOG
}
qb() {
  run colab_run2.py B singapore_study "D1 all"
  run colab_run2.py B singapore_study "D2 all" "D3 all"
  run colab_run2.py B australia_homework "D1 all"
  run colab_run2.py B australia_homework "D2 all" "D3 all"
  echo DONE_B >> $LOG
}
echo "START $(date)" >> $LOG
qa & sleep 90; qb; wait
