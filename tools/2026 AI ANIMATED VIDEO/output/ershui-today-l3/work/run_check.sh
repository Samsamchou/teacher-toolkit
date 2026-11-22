export MSYS_NO_PATHCONV=1
S=ershui3d
colab usage 2>&1 | grep -a -i balance
for R in $(seq 1 15); do for G in G4 A100; do timeout 900 colab new -s $S --gpu $G 2>&1 | tail -1; colab ls 2>&1 | grep -q ershui3d && { echo "GPU=$G"; break; }; echo "$G unavailable $(date +%H:%M)"; done; colab ls 2>&1 | grep -q ershui3d && break; timeout 120 ping -n 115 127.0.0.1 >/dev/null; done
colab ls 2>&1 | grep -q ershui3d || { echo "NO SESSION"; exit 1; }
for i in 1 2 3 4 5 6; do timeout 60 colab exec -s $S -f _bg.py --timeout 45 2>&1 | grep -a "STARTED" && break; done
timeout 120 colab upload -s $S ../src/b3d_cassia.py /content/src/b3d_cassia.py 2>&1 | tail -1 | cut -c1-60
timeout 120 colab upload -s $S job_check.py /content/job.py 2>&1 | tail -1 | cut -c1-60
for i in 1 2 3 4; do timeout 60 colab exec -s $S -f _go.py --timeout 45 2>&1 | grep -a "STARTED" && break; done
miss=0; mkdir -p ../renders/3d
for i in $(seq 1 60); do
  o=$(timeout 60 colab exec -s $S -f _ka.py --timeout 45 2>&1 | grep -a "KA")
  if [ -z "$o" ]; then miss=$((miss+1)); [ $miss -ge 8 ] && echo "LOST CONNECTION at tick $i" && break; else miss=0; fi
  if echo "$o" | grep -q "'check.zip'"; then timeout 300 colab download -s $S /content/full/check.zip ../renders/3d/check.zip 2>&1 | tail -1 | cut -c1-60; echo "got check $(date +%H:%M)"; break; fi
  echo "tick $i $(date +%H:%M) $(echo "$o" | tail -c 160 | tr '\n' ' ')"
  timeout 50 ping -n 45 127.0.0.1 >/dev/null
done
timeout 60 colab exec -s $S -f _ka.py --timeout 45 2>&1 | grep -a "KA" | cut -c1-1200
colab stop -s $S 2>&1 | tail -1
colab usage 2>&1 | grep -a -i "balance\|active"
