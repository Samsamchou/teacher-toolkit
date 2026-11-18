"""[1118] 把 iPad 載入頁（存在 iPad 上＋MB／速度＋卡住重試）套到遊戲網頁資料夾。

用法：python -I apply_loader.py <資料夾，例如 staging 的 public/ershui-planet>
- 資料夾裡要已經放好這一版的 index.pck、index.wasm、index.js。
- 會寫 index.html（GODOT_CONFIG 的 fileSizes 換成實際大小）與 sw.js（VERSION＝pck＋wasm 的雜湊）。
- 每次換 pck 之後都要再跑一次，iPad 才會知道改版、重新下載。
規格：3D planet/rdq/RDQ-spec-planet-ipad-load-20261118.md
"""
import hashlib
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main(target):
    pck = os.path.join(target, "index.pck")
    wasm = os.path.join(target, "index.wasm")
    sizes = {"index.pck": os.path.getsize(pck), "index.wasm": os.path.getsize(wasm)}
    version = sha(pck)[:12] + "-" + sha(wasm)[:6]

    html = io.open(os.path.join(HERE, "index.template.html"), encoding="utf-8").read()
    html, n = re.subn(r'"fileSizes":\{[^}]*\}', '"fileSizes":' + json.dumps(sizes, separators=(",", ":")), html)
    assert n == 1, "fileSizes not found in template"
    io.open(os.path.join(target, "index.html"), "w", encoding="utf-8", newline="\n").write(html)

    sw = io.open(os.path.join(HERE, "sw.js"), encoding="utf-8").read()
    assert "__VERSION__" in sw
    io.open(os.path.join(target, "sw.js"), "w", encoding="utf-8", newline="\n").write(sw.replace("__VERSION__", version))
    print("ok", version, sizes)


if __name__ == "__main__":
    main(sys.argv[1])
