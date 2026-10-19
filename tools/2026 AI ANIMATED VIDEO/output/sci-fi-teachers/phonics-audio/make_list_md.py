"""make_list_md.py — 把 download-list.json 整理成給老師確認的 download-list.md。"""
import json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
rows = json.loads((HERE / 'download-list.json').read_text(encoding='utf-8'))
who = lambda r: ((r.get('artist') or '').replace('No machine-readable author provided.', '').replace('assumed (based on copyright claims)', '').strip()[:30]) or '未標示'
kb = lambda r: f"{round(r['bytes'] / 1024)} KB"
lic = {}
for r in rows: lic[r['license']] = lic.get(r['license'], 0) + 1
L = ['# 發音音檔下載清單（待老師確認，尚未下載）', '',
     '來源：**維基共享資源 Wikimedia Commons**（commons.wikimedia.org），2026-10-19 以 API 查詢檔案資訊與授權。',
     f"共 **{len(rows)} 個 .ogg 檔，約 {round(sum(r['bytes'] for r in rows) / 1024)} KB**；授權：" + '、'.join(f'{k} {v} 個' for k, v in lic.items()), '',
     '## 授權要點（請確認）',
     '- **CC BY-SA 3.0**：可以放進影片，但要標註作者與授權（片尾字卡）；若影片**對外公開分享**，影片本身也要用相同或相容的 CC BY-SA 授權。只在自己班上播放沒有問題。',
     '- **公有領域**：無限制。', '',
     '## A. 單獨發音（IPA 標準錄音，語音學示範音）', '',
     '| 自然發音 | IPA | 例字 | 檔名 | 大小 | 授權 | 作者 |', '|---|---|---|---|---|---|---|']
for r in rows:
    if r['tag'] == 'word': continue
    note = f" ⚠ {r['note']}" if r.get('note') else ''
    L.append(f"| {r['tag']}{note} | /{r['ipa']}/ | {r['example']} | {r['file']} | {kb(r)} | {r['license']} | {who(r)} |")
L += ['', '## B. 美式英語單字錄音（Wiktionary 真人美式發音）', '',
      '用途：七個星期單字的完整發音；雙母音（/eɪ/ /aɪ/ /juː/）與美式捲舌 /ɝ/ 沒有單獨的標準錄音，改用字母名 A、I、U 與 er／her／fur 等短字。', '',
      '| 例字 | 檔名 | 大小 | 授權 | 作者 |', '|---|---|---|---|---|']
for r in rows:
    if r['tag'] == 'word': L.append(f"| {r['example']} | {r['file']} | {kb(r)} | {r['license']} | {who(r)} |")
L += ['', '## 使用方式',
      '- 下載到 `phonics-audio/raw/`，保留原檔與 `sources.json`（網址、作者、授權、SHA-256）。',
      '- 每個音先看波形、裁掉前後空白、統一音量，挑選後先給老師試聽，再放進影片。',
      '- 影片中由全息螢幕「發音按鈕」播放，Nova 同步做嘴形並帶唸兩輪；片尾字卡列出所有用到的音檔作者與授權。']
(HERE / 'download-list.md').write_text('\n'.join(L) + '\n', encoding='utf-8'); print(len(rows), 'rows')
