"""匯出 Jump Island 網頁版之後執行（每次匯出都要跑，匯出會把 index.html 蓋回預設版）：

1. 套用二水 3D 闖關的中文錯誤頁（godot-ershui-quest/tools/patch_web_shell.py）。
2. 和二水 3D 闖關共用遊戲引擎（2026-11-09 RDQ 建議④）：jump3d 的 index.wasm／index.js 和 quest3d 的完全相同
   （同一個 Godot 4.7.2 範本），改成讀 ../quest3d/index.wasm、../quest3d/index.js，
   自己只留 index.pck；玩過二水闖關的學生不用再下載 39.5 MB（壓縮後約 7 MB）的引擎。
   先比對兩邊檔案的雜湊，不一樣就停下來（代表 Godot 版本不同，不能共用）。
3. 刪掉 jump3d 裡用不到的 index.wasm（避免部署時多傳 39.5 MB）。

用法：python -I -X utf8 tools/patch_jump_shell.py
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

PUB = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\site\public")
J, Q = PUB / "jump3d", PUB / "quest3d"
QUEST_PATCH = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 3D games\godot-ershui-quest\tools\patch_web_shell.py")
md5 = lambda p: hashlib.md5(p.read_bytes()).hexdigest()


def main() -> None:
    html = J / "index.html"
    subprocess.run([sys.executable, "-I", "-X", "utf8", str(QUEST_PATCH), str(html)], check=True)
    for f in ["index.js", "index.audio.worklet.js", "index.audio.position.worklet.js"]:
        if md5(J / f) != md5(Q / f):
            sys.exit(f"{f} 和 quest3d 不一樣，不能共用引擎（兩邊要用同一版 Godot 匯出）")
    if (J / "index.wasm").exists():
        if md5(J / "index.wasm") != md5(Q / "index.wasm"):
            sys.exit("index.wasm 和 quest3d 不一樣，不能共用引擎")
    s = html.read_text(encoding="utf-8")
    m = re.search(r"const GODOT_CONFIG = (\{.*?\});", s)
    cfg = json.loads(m.group(1))
    if cfg["executable"] != "../quest3d/index":
        sizes = cfg["fileSizes"]
        cfg["executable"] = "../quest3d/index"
        cfg["mainPack"] = "index.pck"
        cfg["fileSizes"] = {"index.pck": sizes["index.pck"], "../quest3d/index.wasm": sizes["index.wasm"]}
        s = s[:m.start(1)] + json.dumps(cfg, ensure_ascii=False, separators=(",", ":")) + s[m.end(1):]
        s = s.replace('<script src="index.js"></script>', '<script src="../quest3d/index.js"></script>', 1)
        html.write_text(s, encoding="utf-8")
    if (J / "index.wasm").exists():
        (J / "index.wasm").unlink()
    print("jump3d: 中文錯誤頁＋共用 ../quest3d 引擎", cfg["executable"], cfg["fileSizes"])


if __name__ == "__main__":
    main()
