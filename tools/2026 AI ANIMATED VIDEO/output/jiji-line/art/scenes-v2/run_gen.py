"""run_gen.py — 用 gpt-image-2（OpenAI Images API，edit 端點＋v1 參考圖）生延長版新圖。
用法：python run_gen.py N01 [N02 ...]   （不帶參數 = 全部還沒生的）
每張輸出 <檔名>.png 與同名 .json 紀錄；已存在就跳過（不覆蓋）。金鑰由 helper 自行讀取，本檔不碰金鑰。
"""
import json, pathlib, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
ART = HERE.parent
TOOL = pathlib.Path.home() / '.claude/skills/gpt-image-2-api/scripts/gpt-image-2.mjs'
SIZE, QUALITY = '1680x944', 'medium'
P = json.loads((HERE / 'prompts.json').read_text(encoding='utf-8'))

def full_prompt(im):
    parts = [P['style'], 'Scene: ' + im['prompt']]
    if im.get('char'): parts.append(P['char'])
    if im.get('train'): parts.append(P['train'])
    return '\n\n'.join(parts)

def run(im):
    out = HERE / im['file']
    if out.exists():
        print('skip', im['id']); return True
    pdir = HERE / 'prompts'; pdir.mkdir(exist_ok=True)
    pf = pdir / f"{im['id']}.txt"; pf.write_text(full_prompt(im), encoding='utf-8')
    cmd = ['node', str(TOOL), 'edit', '--prompt-file', str(pf), '--output', str(out), '--size', SIZE, '--quality', QUALITY]
    for r in im['refs']:
        cmd += ['--input', str((ART / r).resolve())]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    print(im['id'], 'exit', res.returncode, (res.stdout + res.stderr).strip()[-600:])
    return res.returncode == 0

if __name__ == '__main__':
    ids = sys.argv[1:]
    todo = [im for im in P['images'] if not ids or im['id'] in ids]
    for im in todo:
        if not run(im):
            sys.exit(1)
