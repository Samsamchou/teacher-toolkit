import os
print("KA", sorted(f for f in os.listdir("/content/full") if not f.startswith("_")) if os.path.isdir("/content/full") else [], os.path.exists("/content/job.done"), open("/content/job.log").read()[-400:] if os.path.exists("/content/job.log") else "")
