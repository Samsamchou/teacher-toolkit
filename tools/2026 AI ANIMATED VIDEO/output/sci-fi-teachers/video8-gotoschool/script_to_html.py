"""script_to_html.py — 把 script_v1.py 轉成 Google 文件用的 HTML（script_v1.html）。"""
import html, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import script_v1 as m

SEC = {'01-open': '1 開場（周老師照片）', '02-words': '2 交通工具單字（騎／搭、by／on foot）', '03-clap': '3 拍音節',
       '04-igo': '4 I go to school ___.（十位朋友）', '05-goes': '5 文法：I go／He、She、人名 goes',
       '06-story': '6 情境動畫（畫風 H 桌上微縮）', '07-quiz': '7 Game time', '08-end': '8 複習與再見'}
WHO = {'nova': 'Ms. Nova', 'cosmo': 'Mr. Cosmo', 'relay': '接力', '-': '（學生）'}
WHO.update({k[0].lower(): k[0] for k in m.KIDS})
e = html.escape
out = ['<html><body>', '<h1>影片 8〈I go to school by bus.〉腳本 v1</h1>',
       '<p>出處：翰林 HWG7 U02 Transportation＋p.29 文法（六年級上學期）｜規格卡 RDQ-spec-video8-go-to-school-20261108（confirmed）｜'
       '推估長度約 12 分鐘（以實際配音為準）</p>',
       '<h2>十位朋友與交通工具（沿用影片 7 的朋友與聲音；情境動畫裡是紙片立牌）</h2><ul>']
out += [f'<li>{n}（{"女" if p == "she" else "男"}，{e(c)}）— {e(r)}｜{z}</li>' for n, p, c, r, z in m.KIDS]
out += ['</ul><h2>拍音節</h2><ul>'] + [f'<li>{e(w)} → {e(m.syl_line(w))}</li>' for w in m.SYL] + ['</ul>']
cur = None
for sec, who, kind, text, vis in m.SCRIPT:
    if sec != cur:
        if cur: out.append('</table>')
        out += [f'<h2>{e(SEC[sec])}</h2>', '<table border="1" cellpadding="4"><tr><th>角色</th><th>台詞</th><th>畫面</th></tr>']
        cur = sec
    line = f'（停 {text:g} 秒）' if kind == 'turn' else e(text)
    if kind == 'zh': line = '🀄 ' + line
    out.append(f'<tr><td>{WHO[who]}</td><td>{line}</td><td>{e(vis)}</td></tr>')
out += ['</table>', '<p>說明：🀄＝中文說明；（停 N 秒）＝學生跟唸或作答。語速 0.8 倍；Nova＝Ava／曉臻、Cosmo＝Guy／雲哲；'
        '十位朋友沿用影片 7 各自的聲音。名人照片不放進影片。</p>', '</body></html>']
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'script_v1.html'), 'w', encoding='utf-8').write('\n'.join(out))
print('ok', len(out))
