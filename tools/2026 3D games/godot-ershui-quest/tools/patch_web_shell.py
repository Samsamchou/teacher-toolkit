"""匯出網頁版之後執行：把 Godot 預設的紅底英文錯誤，換成給學生看的大字中文步驟。

用法（每次匯出 quest3d 之後都要跑一次，匯出會把 index.html 蓋回預設版）：
  python -I -X utf8 tools/patch_web_shell.py "../../escape room HWG5-U01-U02/site/public/quest3d/index.html"

改了三件事（2026-11-06，iPad 第 9 代打幾場後當機、重進出現 'program.name=id' 紅字）：
1. 開始前先試借 WebGL2；Safari 不給（通常是剛才記憶體不夠當掉、Safari 暫停這頁的 3D）就直接顯示中文步驟。
2. 任何啟動失敗都顯示同一份中文步驟，原本的英文訊息縮小放在最下面給老師看。
3. 遊戲中途 3D 畫面被 Safari 收回（webglcontextlost）時也顯示中文步驟，不會只剩白畫面。
重複執行不會重複修改（看 MARK）。
"""
import sys
from pathlib import Path

MARK = "/* ershui-friendly-error */"

CSS = MARK + """
#status-notice.friendly { background:#fffaf0; color:#1f2a5a; border:4px solid #f0a020; border-radius:20px;
  max-width:680px; margin:0 auto; padding:28px 32px; text-align:left; font-family:system-ui,-apple-system,'PingFang TC',sans-serif; }
#status-notice.friendly h2 { font-size:30px; margin:0 0 14px; }
#status-notice.friendly ol { font-size:24px; line-height:1.6; margin:0 0 14px; padding-left:1.4em; }
#status-notice.friendly p { font-size:20px; margin:6px 0; }
#status-notice.friendly small { display:block; font-size:12px; color:#888; margin-top:14px; word-break:break-all; }
"""

HELPER = """	// ---- 給學生看的中文步驟（tools/patch_web_shell.py） ----
	function showFriendly(detail) {
		statusNotice.className = 'friendly';
		statusNotice.innerHTML = '<h2>遊戲畫面沒辦法開啟</h2>'
			+ '<ol><li>把這個分頁<b>整個關掉</b>。</li>'
			+ '<li>從螢幕下方往上滑，把 <b>Safari 滑掉</b>，再重新打開。</li>'
			+ '<li>還是不行就<b>重新開機</b>。</li></ol>'
			+ '<p>你的進度已經存好，重新進來會接著玩。</p>'
			+ '<p>The game screen could not start. Close this tab, restart Safari, then try again.</p>'
			+ '<small></small>';
		statusNotice.querySelector('small').textContent = detail || '';
		statusOverlay.style.visibility = 'visible';
		statusProgress.style.display = 'none';
		statusNotice.style.display = 'block';
		initializing = false;
	}
	function webglAvailable() {
		try {
			const c = document.createElement('canvas');
			const gl = c.getContext('webgl2');
			if (!gl) {
				return false;
			}
			const lose = gl.getExtension('WEBGL_lose_context');
			if (lose) {
				lose.loseContext();
			}
			return true;
		} catch (e) {
			return false;
		}
	}
	document.getElementById('canvas').addEventListener('webglcontextlost', function () {
		showFriendly('webglcontextlost');
	});
"""


def main() -> None:
    p = Path(sys.argv[1])
    s = p.read_text(encoding="utf-8")
    if MARK in s:
        print("already patched:", p)
        return
    s = s.replace("#status-progress, #status-notice {", CSS + "\n#status-progress, #status-notice {", 1)
    old_fail = """	function displayFailureNotice(err) {
		console.error(err);"""
    new_fail = HELPER + """
	function displayFailureNotice(err) {
		console.error(err);
		showFriendly(err instanceof Error ? err.message : String(err || ''));
		return;"""
    if old_fail not in s:
        sys.exit("找不到 displayFailureNotice，Godot 版本的網頁外框可能改了")
    s = s.replace(old_fail, new_fail, 1)
    old_start = """	} else {
		setStatusMode('progress');
		engine.startGame({"""
    new_start = """	} else if (!webglAvailable()) {
		showFriendly('WebGL2 unavailable (getContext returned null)');
	} else {
		setStatusMode('progress');
		engine.startGame({"""
    if old_start not in s:
        sys.exit("找不到 engine.startGame，Godot 版本的網頁外框可能改了")
    s = s.replace(old_start, new_start, 1)
    p.write_text(s, encoding="utf-8")
    print("patched:", p)


if __name__ == "__main__":
    main()
