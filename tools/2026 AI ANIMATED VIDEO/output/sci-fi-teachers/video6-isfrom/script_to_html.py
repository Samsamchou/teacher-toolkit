"""script_to_html.py — 把 script_v1.py 轉成 Google 文件用的 HTML（script_v1.html）。"""
import html, script_v1 as m

SEC = {'01-open': '1 開場', '02-country': '2 十個國家（國旗＋地標）', '03-from': '3 from＝來自', '04-ask': '4 問句 Is she from ...?',
       '05-answer': '5 回答 Yes, she is.／No, she isn\'t.', '06-demo': '6 老師示範', '07-talk': '7 三部對話（Amy 問、Ben 答）',
       '08-quiz': '8 Game time 六題', '09-end': '9 複習與再見'}
WHO = {'nova': 'Ms. Nova', 'cosmo': 'Mr. Cosmo', 'relay': '接力', 'amy': 'Amy', 'ben': 'Ben', '-': '（學生）'}
e = html.escape
out = ['<html><body>', '<h1>影片 6〈Is she from India?〉腳本 v1</h1>',
       '<p>出處：翰林 HWG7 U01 Target Language（六年級上學期）｜規格卡 RDQ-spec-video6-is-she-from-20261105（confirmed）｜'
       '推估長度約 12 分鐘（以實際配音為準）</p>',
       '<h2>十位朋友（照片卡：小朋友站在自己國家的地標前；國旗由程式畫）</h2><ul>']
out += [f'<li>{n}（{"女" if p == "she" else "男"}）— {e(c)} {z}｜{e(mk)}</li>' for n, p, c, z, mk in m.KIDS]
out += ['</ul><h2>三部對話</h2><ul>']
SC = {'photowall': '教室照片牆', 'intlday': '學校國際日（掛滿國旗的禮堂）', 'videocall': '家裡平板視訊（筆友）'}
for no, sc, asks, lines in m.TALKS:
    out.append(f'<li>對話 {no}｜{SC[sc]}｜照片卡：{"、".join(a for a, _ in asks)}</li>')
out.append('</ul>')
cur = None
for sec, who, kind, text, vis in m.SCRIPT:
    if sec != cur:
        if cur: out.append('</table>')
        out += [f'<h2>{e(SEC[sec])}</h2>', '<table border="1" cellpadding="4"><tr><th>角色</th><th>台詞</th><th>畫面</th></tr>']
        cur = sec
    line = f'（停 {text:g} 秒）' if kind == 'turn' else e(text)
    if kind == 'zh': line = '🀄 ' + line
    out.append(f'<tr><td>{WHO[who]}</td><td>{line}</td><td>{e(vis)}</td></tr>')
out += ['</table>', '<p>說明：🀄＝中文說明；（停 N 秒）＝學生跟唸或作答。語速 0.8 倍；Nova＝Ava／曉臻、Cosmo＝Guy／雲哲、Amy＝Ana、Ben＝Roger +40Hz。</p>', '</body></html>']
open('script_v1.html', 'w', encoding='utf-8').write('\n'.join(out))
print('ok', len(out))
