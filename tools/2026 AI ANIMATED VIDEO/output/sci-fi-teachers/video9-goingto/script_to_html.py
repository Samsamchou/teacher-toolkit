"""script_to_html.py — 把 script_v1.py 轉成 Google 文件用的 HTML（script_v1.html）。"""
import html, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import script_v1 as m

SEC = {'01-open': '1 開場', '02-rule': '2 有規則的字', '02-bank': '2-1 bank（短母音 a）', '02-park': '2-2 park（ar）',
       '02-super': '2-3 supermarket（er＋ar）', '02-book': '2-4 bookstore（oo）', '02-hosp': '2-5 hospital（短母音 o、i）',
       '02-station': '2-6 train station（ai、-tion）', '03-clap': '3 拍音節：museum、library、post office',
       '04-review': '4 九個字複習', '05-sent': "5 句型：Where are you going? I'm going to the ___.",
       '06-story': '6 情境動畫（畫風 H 桌上微縮二水，Ken）', '07-quiz': '7 Game time：2 ICONS 1 PLACE', '08-end': '8 複習與再見'}
WHO = {'nova': 'Ms. Nova', 'cosmo': 'Mr. Cosmo', 'ken': 'Ken', 'relay': '接力', '-': '（學生）'}
SNAME = {v: k for k, v in m.SOUND.items()}
e = html.escape
out = ['<html><body>', "<h1>影片 9〈I'm going to the ___.〉腳本 v1</h1>",
       '<p>出處：翰林 HWG5 U03 Places（五年級上學期）｜規格卡 RDQ-spec-video9-going-to-places、RDQ-spec-video9-vocab-phonics（confirmed）｜'
       '推估長度約 12 分鐘（以實際配音為準）</p>',
       '<h2>發音示範用的聲音</h2><ul>',
       '<li>短 a、er、短 o、短 i：老師錄音</li><li>ar、oo、long a：Wikimedia Commons 真人音檔（不用 TTS）</li>',
       '<li>-tion：音節，TTS 唸 shun</li><li>顏色：ar 紅、er 藍、oo 綠、短母音橘、ai 紫、-tion 粉紅</li></ul>',
       '<h2>拍音節</h2><ul>'] + [f'<li>{e(w)} → {e(m.syl_line(w))}</li>' for w in m.SYL] + ['</ul>']
cur = None
for sec, who, kind, text, vis in m.SCRIPT:
    if sec != cur:
        if cur: out.append('</table>')
        out += [f'<h2>{e(SEC[sec])}</h2>', '<table border="1" cellpadding="4"><tr><th>角色</th><th>台詞</th><th>畫面</th></tr>']
        cur = sec
    if kind == 'turn': line = f'（停 {text:g} 秒）'
    elif kind == 'sound': line = f'🔊（播 {SNAME.get(text, text)} 的發音）'
    else: line = ('🀄 ' if kind == 'zh' else '') + e(text)
    out.append(f'<tr><td>{WHO[who]}</td><td>{line}</td><td>{e(vis)}</td></tr>')
out += ['</table>', '<p>說明：🀄＝中文說明；🔊＝播發音音檔；（停 N 秒）＝學生跟唸或作答。語速 0.8 倍；Nova＝Ava／曉臻、Cosmo＝Guy／雲哲；'
        'Ken＝Guy 調高音（和網站一樣）。情境動畫台詞照網站 Guess 版，一字不改。</p>', '</body></html>']
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'script_v1.html'), 'w', encoding='utf-8').write('\n'.join(out))
print('ok', len(out))
