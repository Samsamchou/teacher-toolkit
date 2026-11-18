export MSYS_NO_PATHCONV=1
colab usage 2>&1 | grep -i balance
timeout 900 colab new -s vienna3d --gpu L4 2>&1 | tail -1
for i in 1 2 3 4 5 6; do timeout 60 colab exec -s vienna3d -f work/_bg.py --timeout 45 2>&1 | grep -a "STARTED" && break; done
timeout 120 colab upload -s vienna3d src/b3d_vienna.py /content/src/b3d_vienna.py 2>&1 | tail -1 | cut -c1-40
timeout 120 colab upload -s vienna3d work/_t6.py /content/job.py 2>&1 | tail -1 | cut -c1-40
for i in 1 2 3 4; do timeout 60 colab exec -s vienna3d -f work/_go.py --timeout 45 2>&1 | grep -a "STARTED" && break; done
miss=0
for i in $(seq 1 70); do
  o=$(timeout 60 colab exec -s vienna3d -f work/_ka.py --timeout 45 2>&1 | grep -a "KA")
  if [ -z "$o" ]; then miss=$((miss+1)); [ $miss -ge 8 ] && echo "LOST CONNECTION at tick $i" && break; else miss=0; fi
  for s in s3; do
    if echo "$o" | grep -q "'${s}.mp4'" && [ ! -f renders/3d/full/${s}.mp4 ]; then timeout 300 colab download -s vienna3d /content/full/${s}.mp4 renders/3d/full/${s}.mp4 2>&1 | tail -1 | cut -c1-60; echo "tick $i $(date +%H:%M)"; fi
  done
  echo "$o" | grep -q "\] True" && break
  timeout 50 ping -n 45 127.0.0.1 >/dev/null
done
echo "$o" | cut -c1-600
colab usage 2>&1 | grep -i balance
colab stop -s vienna3d 2>&1 | tail -1
colab usage 2>&1 | grep -i active
