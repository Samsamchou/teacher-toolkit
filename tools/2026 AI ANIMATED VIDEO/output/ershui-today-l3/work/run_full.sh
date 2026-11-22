export MSYS_NO_PATHCONV=1
S=ershui3d
colab usage 2>&1 | grep -a -i balance
ok=0; for G in G4 A100 L4; do r=$(timeout 900 colab new -s $S --gpu $G 2>&1 | tail -1); echo "$G: $r"; echo "$r" | grep -q "READY" && { echo "GPU=$G"; ok=1; break; }; done
[ $ok = 1 ] || { echo "NO SESSION"; exit 1; }
for i in 1 2 3 4 5 6; do timeout 60 colab exec -s $S -f _bg.py --timeout 45 2>&1 | grep -a "STARTED" && break; done
timeout 120 colab upload -s $S ../src/b3d_cassia.py /content/src/b3d_cassia.py 2>&1 | tail -1 | cut -c1-60
timeout 120 colab upload -s $S job_full.py /content/job.py 2>&1 | tail -1 | cut -c1-60
for i in 1 2 3 4; do timeout 60 colab exec -s $S -f _go.py --timeout 45 2>&1 | grep -a "STARTED" && break; done
miss=0; mkdir -p ../renders/3d
for i in $(seq 1 400); do
  o=$(timeout 60 colab exec -s $S -f _ka.py --timeout 45 2>&1 | grep -a "KA")
  if [ -z "$o" ]; then miss=$((miss+1)); [ $miss -ge 8 ] && echo "LOST CONNECTION at tick $i" && break; else miss=0; fi
  for z in check A B; do
    if echo "$o" | grep -q "'$z.zip'" && [ ! -f ../renders/3d/$z.zip ]; then timeout 900 colab download -s $S /content/full/$z.zip ../renders/3d/$z.zip 2>&1 | tail -1 | cut -c1-60; echo "got $z $(date +%H:%M)"; fi
  done
  [ -f ../renders/3d/B.zip ] && break
  echo "tick $i $(date +%H:%M) $(echo "$o" | tail -c 200 | tr '\n' ' ')"
  timeout 50 ping -n 45 127.0.0.1 >/dev/null
done
timeout 60 colab exec -s $S -f _ka.py --timeout 45 2>&1 | grep -a "KA" | cut -c1-1500
colab stop -s $S 2>&1 | tail -1
colab usage 2>&1 | grep -a -i "balance\|active"
