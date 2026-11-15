#!/bin/bash
# 試片 3D 分 3 批渲（每批約 150 張、<25 分鐘），每批渲完就下載；失敗的批次重試一次
cd "$(dirname "$0")/.."
mkdir -p renders/3d/trial_all
for r in 0-298 300-598 600-898; do
  for try in 1 2; do
    for g in G4 L4; do
      FR_RANGE=$r GPU=$g python src/colab_3d.py trial all 48 100 > work/run_tb_$r.log 2>&1
      cp renders/3d/trial/*.png renders/3d/trial_all/ 2>/dev/null
      a=${r%-*}; b=${r#*-}; n=$(ls renders/3d/trial_all | awk -F'[f.]' -v a=$a -v b=$b '$2+0>=a && $2+0<=b' | wc -l)
      echo "BATCH $r try$try $g frames=$n $(date +%H:%M)"
      [ "$n" -ge 145 ] && break 2
    done
  done
done
python src/colab_3d.py stop > /dev/null 2>&1
rm -rf renders/3d/trial; mv renders/3d/trial_all renders/3d/trial
echo "ALL $(ls renders/3d/trial | wc -l) frames $(date +%H:%M) $(tail -1 work/colab_usage.log)"
python src/render.py video rd-trial-s01-v3 2>&1 | grep -E "video ->|PAGEERROR"
ffmpeg -v error -y -i renders/rd-trial-s01-v3.mp4 -vf scale=1280:-2 -c:v libx264 -crf 23 -c:a copy renders/rd-trial-s01-v3-720p.mp4
echo "COMPOSED $(date +%H:%M)"
