"""new_song_setup.py — 為一首新歌建立 2D 動畫專案資料夾，複製最新已驗收引擎，並把檔名／長度換成新歌。
用法:
  python -I new_song_setup.py "<歌名>" "<mp3 路徑>" "<歌詞 docx 路徑>" [--project "<2026 AI ANIMATED VIDEO 根目錄>"] [--from every-day-is-fun]
結果:
  output/<slug>/sources/      原檔副本（原檔不動）＋ sources.sha256
  output/<slug>/src/          analyze_song.py、align_lines.py、annotate_timing.py（取自本 skill 的 scripts/ 通用版，自動讀 sources/）
  output/<slug>/2d-v1/engine/ 引擎（engine.js、cast.js、group.js、edif.js、chorus.js、player.html、render*.py、qa_*.py）
  output/<slug>/2d-v1/lipsync/ song_words.py、song_lipsync.py
  其餘空資料夾：data、planning、qa、2d-v1/{scenes,renders,qa}
最後印出「新歌還要手動改的地方」清單。不覆蓋已存在的資料夾。
"""
import argparse, hashlib, pathlib, re, shutil, subprocess, sys
sys.stdout.reconfigure(encoding="utf-8")

ap = argparse.ArgumentParser()
ap.add_argument('title'); ap.add_argument('mp3'); ap.add_argument('docx')
ap.add_argument('--project', default=r'G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI ANIMATED VIDEO')
ap.add_argument('--from', dest='src_song', default='every-day-is-fun', help='從哪一首已驗收歌曲複製引擎（預設最新的 every-day-is-fun）')
a = ap.parse_args()
proj = pathlib.Path(a.project); out = proj / 'output'
slug = re.sub(r'[^a-z0-9]+', '-', a.title.lower()).strip('-')
dst = out / slug; src = out / a.src_song
if dst.exists(): sys.exit(f'已存在，不覆蓋：{dst}')
if not (src / '2d-v1' / 'engine').exists(): sys.exit(f'找不到來源引擎：{src}')
mp3, docx = pathlib.Path(a.mp3), pathlib.Path(a.docx)
for p in (mp3, docx):
    if not p.exists(): sys.exit(f'找不到檔案：{p}')

for d in ['sources', 'data', 'planning', 'qa', 'src', '2d-v1/engine', '2d-v1/lipsync', '2d-v1/scenes', '2d-v1/renders', '2d-v1/qa']:
    (dst / d).mkdir(parents=True, exist_ok=True)
lines = []
for p in (mp3, docx):
    shutil.copy2(p, dst / 'sources' / p.name)
    h1 = hashlib.sha256(p.read_bytes()).hexdigest(); h2 = hashlib.sha256((dst / 'sources' / p.name).read_bytes()).hexdigest()
    assert h1 == h2, f'複製後雜湊不符：{p.name}'
    lines.append(f'{h1}  {p.name}')
(dst / 'sources' / 'sources.sha256').write_text('\n'.join(lines) + '\n', encoding='utf-8')
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp3)]).decode().strip())

old_mp3, old_docx = 'Every Day Is Fun.mp3', 'Every Day Is Fun 歌詞.docx'
old_prefix, new_prefix = 'Every-Day-Is-Fun-2D-v1-', re.sub(r'[^A-Za-z0-9]+', '-', a.title).strip('-') + '-2D-v1-'
def copy_edit(s: pathlib.Path, d: pathlib.Path):
    t = s.read_text(encoding='utf-8')
    t = t.replace(old_mp3, mp3.name).replace(old_docx, docx.name).replace(old_prefix, new_prefix)
    if s.name == 'render_all.py':
        t = re.sub(r"SCENES = \[.*?\]\n", "SCENES = []   # TODO：依分鏡表填入場景檔名（例如 's00-intro', 's01-...'），起訖必須首尾相接\n", t, flags=re.S)
        t = re.sub(r"TOTAL = round\([\d.]+ \* FPS\).*\n", f"TOTAL = round({dur:.3f} * FPS)   # 全曲 {dur:.3f} 秒\n", t)
        t = t.replace('0–190.0 s', f'0–{dur:.3f} s')
    if s.name == 'song_words.py':
        t = re.sub(r"'dur': [\d.]+", f"'dur': {dur:.3f}", t).replace('（Every Day Is Fun）', f'（{a.title}）')
    d.write_text(t, encoding='utf-8')
for f in ['engine.js', 'cast.js', 'group.js', 'edif.js', 'chorus.js', 'player.html', 'render.py', 'render_all.py', 'qa_full.py', 'qa_lines.py']:
    copy_edit(src / '2d-v1' / 'engine' / f, dst / '2d-v1' / 'engine' / f)
for f in ['song_words.py', 'song_lipsync.py']:
    copy_edit(src / '2d-v1' / 'lipsync' / f, dst / '2d-v1' / 'lipsync' / f)
skill_scripts = pathlib.Path(__file__).resolve().parent                     # 分析腳本用 skill 內的通用版 / generic analysis scripts
for f in ['analyze_song.py', 'align_lines.py', 'annotate_timing.py']:
    shutil.copy2(skill_scripts / f, dst / 'src' / f)

print(f'已建立 {dst}（歌長 {dur:.3f} 秒，{round(dur * 30)} 格 @30fps）')
print('''
新歌還要手動改的地方 / TODO：
 1. 演唱順序預設＝Word 檔順序；若 ASR 顯示段落重複或多唱，寫 planning/sung-sequence.txt（見 src/align_lines.py 開頭說明）再重跑。
 2. engine/qa_full.py：對齊檢查的 10 個時間窗（t0 清單）改成平均分布在新歌長度內。
 3. engine/cast.js：角色名稱（Amy／Andy 是上一首的設定）、胸前徽章、需要的新角色。
 4. engine/edif.js、engine/chorus.js：是上一首的道具（星期卡、學科卡）與副歌編舞，依新歌主題改寫或另寫。
 5. engine/group.js 的 grpBunting：彩旗內容（目前是星期字母）。
 6. engine/render_all.py 的 SCENES：分鏡表確認後再填。
 7. 先跑 src/analyze_song.py → src/align_lines.py → src/annotate_timing.py，再寫分鏡表；分鏡表定案後把場景邊界寫進 planning/scenes.json 重跑 annotate_timing.py 確認沒有句子跨場景。教師確認後才寫場景。
''')
