import subprocess
r=subprocess.run("cd /content && python -u /content/gen.py > /content/gen.log 2>&1; grep -E \"^done|^total|Error|error\" /content/gen.log | tail -20; cd /content/out && zip -q -r /content/out7.zip . && ls -la /content/out",shell=True,capture_output=True,text=True)
print(r.stdout[-4000:])
