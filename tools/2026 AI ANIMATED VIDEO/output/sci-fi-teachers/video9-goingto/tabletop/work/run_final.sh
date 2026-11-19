# 影片 9 情境 10 段正式渲染：一段一段跑、跑完就下載（已下載完整的段落跳過）
# 2026-11-19：曾同時跑 3 份佇列、搶同一段 → 加鎖（mkdir 是原子動作），只准一份
if ! mkdir work/run_final.lock 2>/dev/null; then echo "另一份佇列在跑（work/run_final.lock），結束"; exit 1; fi
trap 'rmdir work/run_final.lock' EXIT
for sid in POST OPEN SUPER LIB HOSP PARK BOOK MUSEUM STATION END; do
  need=$(python -I -c "import json;t=json.load(open('src/timing.json',encoding='utf-8'));print(int(t['$sid']['dur']*24)//2+1)")
  have=$(ls renders/$sid/f*.png 2>/dev/null | wc -l)
  if [ "$have" -ge $((need-1)) ]; then echo "$sid skip $have"; continue; fi
  extra=""; [ -n "$COLLECT" ] && [ "$sid" = "$COLLECT" ] && extra=--collect   # 已在 Colab 渲完的段落只下載
  echo "== $sid start $(date +%H:%M) need $need $extra"
  PYTHONIOENCODING=utf-8 COLAB_GPU=L4 python -I src/colab_bg9.py final $sid all $extra 2>&1 | grep -a -E "POLL|final|OUT|Error|Timeout|逾時" | tail -3
done
echo ALLDONE $(date +%H:%M)
python -I -c "import sys; sys.path.insert(0,'src'); import colab_run9 as R; R.start_idle_timer(); print('idle timer 20 min')"
