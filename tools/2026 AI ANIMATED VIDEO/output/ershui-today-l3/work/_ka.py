import os
print("KA", sorted(f for f in os.listdir("/content/full") if not f.startswith("_")) if os.path.isdir("/content/full") else [], os.path.exists("/content/job.done"), open("/content/job.log").read()[-500:] if os.path.exists("/content/job.log") else "", open("/content/setup.log").read()[-200:] if os.path.exists("/content/setup.log") else "")
