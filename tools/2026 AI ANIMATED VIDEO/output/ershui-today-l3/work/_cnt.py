import os, glob, time
fs = sorted(glob.glob("/content/out/A/*.png"), key=os.path.getmtime)
print("CNT", len(fs), [round(os.path.getmtime(f) - os.path.getmtime(fs[0]), 1) for f in fs[-4:]] if fs else [], round(time.time()))
