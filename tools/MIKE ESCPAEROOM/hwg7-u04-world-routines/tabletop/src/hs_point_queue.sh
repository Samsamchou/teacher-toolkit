#!/bin/bash
# 11/23: final renders of the eight clock-pointing shots (new palm-up point), on the second Colab session wrt2.
cd "$(dirname "$0")/.."
run() { local scene=$1; shift; python src/colab_run2.py final "$scene" "$@" > work2/_pq.log 2>&1; d=$(grep -a -o "qa.[0-9-]*" work2/_pq.log | tail -1); echo "BATCH $scene $* -> $d" >> work2/point_queue.log; }
echo "START $(date)" >> work2/point_queue.log
run uk_home "UK1 all"
run usa_lunch "US1 all"
run india_cricket "IN1 all"
run singapore_study "D1 all"
run australia_homework "D1 all"
run taiwan_getup "TW1 all"
run spain_lunch "SP1 all"
run kenya_dinner "KE1 all"
echo DONE_POINT >> work2/point_queue.log
