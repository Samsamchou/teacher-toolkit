"""gen_poses.py P02 P04 ... — 依 prompts.json 用 gpt-image-2 edit（高品質，1024×1536，參考 nova-sheet-v1-1.png）產生姿勢全身圖。
已存在的輸出會略過（不重複收費）。老師 2026-10-19 已核准 9 個姿勢的高品質費用。"""
import sys, json, subprocess, pathlib
HERE = pathlib.Path(__file__).resolve().parent
P = json.loads((HERE / 'prompts.json').read_text(encoding='utf-8'))
TOOL = str(pathlib.Path.home() / '.claude/skills/gpt-image-2-api/scripts/gpt-image-2.mjs')
for pid in sys.argv[1:]:
    out = HERE / f'nova-{pid}-pose-v1.png'
    if out.exists(): print(pid, 'skip'); continue
    pf = HERE / f'{pid}.prompt.txt'; pf.write_text(P['_common'] + ' ' + P[pid], encoding='utf-8')
    for attempt in range(2):   # 只在「沒收到回應」的網路錯誤時重試一次
        r = subprocess.run(['node', TOOL, 'edit', '--input', str(HERE.parent / 'nova-sheet-v1-1.png'), '--prompt-file', str(pf), '--output', str(out),
                            '--size', '1024x1536', '--quality', 'high', '--confirm-premium'], capture_output=True, text=True, encoding='utf-8')
        if out.exists(): print(pid, 'ok', flush=True); break
        print(pid, 'FAIL', (r.stdout + r.stderr)[-200:], flush=True)
        if 'before a response' not in (r.stdout + r.stderr): break
