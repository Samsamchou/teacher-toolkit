"""Minimal KIE AI client (https://docs.kie.ai). Standard library only.

The key is read from the KIE_API_KEY environment variable, falling back to the Windows user
environment (HKCU\\Environment) so a key saved with SetEnvironmentVariable(..., 'User') works
without restarting the app. The key is never printed, logged or written to disk by this script.

  python kie/kie.py credits                      # remaining credits (free call, used as a connection test)
  python kie/kie.py task <taskId>                 # task status / result URLs (GET /api/v1/jobs/recordInfo)
  python kie/kie.py post <path> <body.json>       # create a task, e.g. post /api/v1/jobs/createTask body.json
  python kie/kie.py upload <file> [uploadPath]    # upload a local file, prints its public URL (deleted by KIE after 24 h)

As a module: upload(path) -> url, create(model, input) -> taskId, wait(taskId) -> data, download(url, dst).
"""
import json, mimetypes, os, sys, time, urllib.request, uuid
from pathlib import Path

BASE = "https://api.kie.ai"
UPLOAD = "https://kieai.redpandaai.co/api/file-stream-upload"


def api_key():
    k = os.environ.get("KIE_API_KEY")
    if not k and os.name == "nt":
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
                k = winreg.QueryValueEx(h, "KIE_API_KEY")[0]
        except OSError:
            k = None
    if not k:
        sys.exit("找不到 KIE_API_KEY：請先在自己的終端機把 API key 存成使用者環境變數。")
    return k.strip()


def _send(req, timeout=120):
    for k in range(4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                out = json.loads(r.read().decode("utf-8"))
            break
        except (urllib.error.URLError, TimeoutError) as e:
            if k == 3:
                raise
            time.sleep(5 * (k + 1))
    if out.get("code") != 200:  # KIE returns HTTP 200 with an error code in the body
        raise RuntimeError(f"KIE 回傳錯誤 code={out.get('code')}：{out.get('msg')}")
    return out


def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {api_key()}", "Content-Type": "application/json"})
    return _send(req)


def upload(path, upload_path="hwg7u04", file_name=None):
    p = Path(path)
    b = uuid.uuid4().hex
    name = file_name or p.name
    ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
    parts = [
        f'--{b}\r\nContent-Disposition: form-data; name="uploadPath"\r\n\r\n{upload_path}\r\n'.encode(),
        f'--{b}\r\nContent-Disposition: form-data; name="fileName"\r\n\r\n{name}\r\n'.encode(),
        f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: {ctype}\r\n\r\n'.encode(),
        p.read_bytes(), f"\r\n--{b}--\r\n".encode(),
    ]
    req = urllib.request.Request(UPLOAD, method="POST", data=b"".join(parts),
                                 headers={"Authorization": f"Bearer {api_key()}", "Content-Type": f"multipart/form-data; boundary={b}"})
    return _send(req, timeout=300)["data"]["downloadUrl"]


def create(model, inp):
    return call("POST", "/api/v1/jobs/createTask", {"model": model, "input": inp})["data"]["taskId"]


def wait(task_id, every=15, limit=3600):
    t0 = time.time()
    while time.time() - t0 < limit:
        d = call("GET", f"/api/v1/jobs/recordInfo?taskId={task_id}")["data"]
        if d["state"] in ("success", "fail"):
            if d.get("resultJson"):
                d["result"] = json.loads(d["resultJson"])
            return d
        time.sleep(every)
    raise TimeoutError(f"task {task_id} not finished after {limit}s")


def download(url, dst):
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=300) as r:
        Path(dst).write_bytes(r.read())
    return dst


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "credits"
    if cmd == "credits":
        print(f"連線成功，剩餘 credits：{call('GET', '/api/v1/chat/credit')['data']}")
    elif cmd == "task":
        print(json.dumps(call("GET", f"/api/v1/jobs/recordInfo?taskId={sys.argv[2]}")["data"], ensure_ascii=False, indent=1))
    elif cmd == "post":
        body = json.loads(open(sys.argv[3], encoding="utf-8").read())
        print(json.dumps(call("POST", sys.argv[2], body), ensure_ascii=False, indent=1))
    elif cmd == "upload":
        print(upload(sys.argv[2], *(sys.argv[3:4])))
    else:
        sys.exit(__doc__)
