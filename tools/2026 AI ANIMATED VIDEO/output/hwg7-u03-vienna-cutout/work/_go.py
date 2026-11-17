import subprocess
subprocess.Popen("(rm -f /content/job.done; while [ ! -f /content/setup.done ]; do sleep 3; done; python3 /content/job.py > /content/job.log 2>&1; echo done > /content/job.done)", shell=True, start_new_session=True)
print("STARTED")
