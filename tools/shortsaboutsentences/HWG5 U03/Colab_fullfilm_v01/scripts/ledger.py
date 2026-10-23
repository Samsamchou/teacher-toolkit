# Colab 用量與每段生成時間帳本：colab_ledger.json（機器可讀）＋ COLAB_用量紀錄.md（給老師看）。
# 用法：
#   python -X utf8 scripts/ledger.py event <kind> [note]        # 開機、停機等事件，並讀目前 Colab 餘額
#   python -X utf8 scripts/ledger.py job <clip> <take> <batch.log>  # 由 batch 紀錄抓 H3 生成秒數
#   python -X utf8 scripts/ledger.py report                     # 重算平均與總用量，寫 Markdown
import json, re, subprocess, sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
L = HERE / 'colab_ledger.json'
TW = timezone(timedelta(hours=8))
G4_RATE = 8.90   # units/hour（repo 實測 2026-10-10；以實際餘額差為準）
data = json.loads(L.read_text(encoding='utf-8')) if L.exists() else {'events': [], 'jobs': []}
now = lambda: datetime.now(TW).isoformat(timespec='seconds')


def balance():
    out = subprocess.run(['colab', 'usage'], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
    m = re.search(r'Current balance:\s*([\d.]+)', out)
    return float(m.group(1)) if m else None


def report():
    ev, jobs = data['events'], data['jobs']
    bals = [e['balance'] for e in ev if e.get('balance') is not None]
    used = round(bals[0] - bals[-1], 2) if len(bals) > 1 else None
    secs = [j['wall_sec'] for j in jobs if j.get('wall_sec')]   # 每段實際佔用的時間（兩段並行時已攤分）
    avg = sum(secs) / len(secs) if secs else None
    lines = ['# HWG5 U03 Colab 用量紀錄', '', f'更新：{now()}　G4 費率約 {G4_RATE} units／小時（開機中就計費，含閒置）', '',
             '## 每段生成時間', '', '| 段 | 第幾次 | 送出時間 | H3 生成秒數 | 整批含上傳下載（秒） | 估算 units |', '|---|---|---|---|---|---|']
    for j in jobs:
        est = round(j['wall_sec'] / 3600 * G4_RATE, 2) if j.get('wall_sec') else ''
        lines.append(f"| {j['clip']} | {j['take']} | {j['submitted'][11:16]} | {j.get('render_sec','')} | {j.get('wall_sec','')} | {est} |")
    lines += ['', f"**平均每段實際耗時：{avg:.0f} 秒（{avg/60:.1f} 分鐘），約 {avg/3600*G4_RATE:.2f} units／段**（不含開機安裝約 4 分鐘；兩段並行時每段生成秒數約加倍，但完成速度不變）" if avg else '平均：尚無資料', '',
              '## 開關機與餘額', '', '| 時間 | 事件 | 餘額（units） | 備註 |', '|---|---|---|---|']
    lines += [f"| {e['time'][5:16].replace('T',' ')} | {e['kind']} | {e.get('balance','')} | {e.get('note','')} |" for e in ev]
    lines += ['', f'**目前累計：{used} units**（以 Colab 餘額差計算；上限 40 units）' if used is not None else '', '',
              '說明：Colab 餘額有時延遲更新，最終數字以停機後的餘額為準。等待老師驗收時若機器開著，閒置也會計費。']
    (HERE / 'COLAB_用量紀錄.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    data['summary'] = {'avg_render_sec': avg, 'units_used_by_balance': used, 'jobs': len(jobs)}


cmd = sys.argv[1]
if cmd == 'event':
    data['events'].append({'time': sys.argv[4] if len(sys.argv) > 4 else now(), 'kind': sys.argv[2],
                           'note': sys.argv[3] if len(sys.argv) > 3 else '', 'balance': balance()})
elif cmd == 'job':
    clip, take, log = sys.argv[2], int(sys.argv[3]), Path(sys.argv[4])
    t = log.read_text(encoding='utf-8', errors='replace')
    r = re.search(r':\s*(OK|FAIL)\s*([\d.]+)\s*秒', t); w = re.search(r'完成 \d+/\d+ 鏡，(\d+) 秒', t)
    data['jobs'] = [j for j in data['jobs'] if not (j['clip'] == clip and j['take'] == take)]
    data['jobs'].append({'clip': clip, 'take': take, 'submitted': datetime.fromtimestamp(log.stat().st_ctime, TW).isoformat(timespec='seconds'),
                         'ok': bool(r and r.group(1) == 'OK'), 'render_sec': float(r.group(2)) if r else None,
                         'wall_sec': int(w.group(1)) if w else None})
elif cmd == 'batch':   # 多段一批：python ledger.py batch <take> <batch.log>；整批秒數平均分攤到每段
    take, log = int(sys.argv[2]), Path(sys.argv[3])
    t = log.read_text(encoding='utf-8', errors='replace')
    rows = re.findall(r'\d+_(C\d+):\s*(OK|FAIL)\s*([\d.]+)\s*秒', t); w = re.search(r'完成 \d+/(\d+) 鏡，(\d+) 秒', t)
    for clip, ok, sec in rows:
        data['jobs'] = [j for j in data['jobs'] if not (j['clip'] == clip and j['take'] == take)]
        data['jobs'].append({'clip': clip, 'take': take, 'submitted': datetime.fromtimestamp(log.stat().st_ctime, TW).isoformat(timespec='seconds'),
                             'ok': ok == 'OK', 'render_sec': float(sec), 'parallel': 2,
                             'wall_sec': round(int(w.group(2)) / int(w.group(1))) if w else None})
report()
L.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
print((HERE / 'COLAB_用量紀錄.md').read_text(encoding='utf-8'))
