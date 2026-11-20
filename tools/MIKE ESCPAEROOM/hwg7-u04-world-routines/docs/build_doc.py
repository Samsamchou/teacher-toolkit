"""Build the Google-Doc HTML (research table + sentences + animation design) from research/countries.json."""
import json, html, hashlib
from pathlib import Path
root = Path(__file__).resolve().parent.parent
D = sorted(json.load(open(root/'research'/'countries.json', encoding='utf-8')), key=lambda c: c['route_order'])
e = lambda s: html.escape(str(s))
PUZ = ['鏡像密碼','物品形狀密碼','諧音密碼','電子鐘密碼','烏托邦密碼','手機密碼']
ROUT = [('get_up','get up'),('have_breakfast','have breakfast'),('go_to_school','go to school'),('school_starts','(school starts)'),('have_lunch','have lunch'),('go_home','go home'),('do_homework','do my homework'),('have_dinner','have dinner'),('take_shower','take a shower'),('go_to_bed','go to bed')]
TD = 'style="border:1px solid #999;padding:4px;vertical-align:top"'
TH = 'style="border:1px solid #999;padding:4px;background:#d9ead3"'
def table(head, rows):
    h = '<table style="border-collapse:collapse;width:100%"><tr>' + ''.join(f'<th {TH}>{e(x)}</th>' for x in head) + '</tr>'
    for r in rows: h += '<tr>' + ''.join(f'<td {TD}>{x}</td>' for x in r) + '</tr>'
    return h + '</table>'
o = ['<html><body style="font-family:Arial">']
o.append('<h1>HWG7 U04 Daily Routines：世界作息之旅——10 國小學生作息、情境句與動畫設計</h1>')
o.append('<p>研究日期：2026-11-19。本表所有時間都是「典型」例子，不代表該國每位學生或每所學校都相同；各國備註中標「估計」的項目是一般知識推估，沒有直接來源。</p>')
o.append('<h2>一、旅行路線</h2><p>' + ' → '.join(f"{e(c['country'])}" for c in D) + ' → Taiwan</p>')
o.append(table(['站','國家','抵達方式'], [[c['route_order'], e(c['country']), e(c['transport_in'])] for c in D]))
o.append('<h2>二、總表：問句、答案時間、目標句與延伸句</h2>')
o.append(table(['站','國家','問句','答案時間（密碼）','目標句','延伸情境句','解謎類型（輪流）'],
  [[c['route_order'], e(c['country']), e(c['question']), f"{e(c['answer_time'])}（{c['answer_time'].replace(':','')}）", e(c['target_sentence']),
    '<br>'.join(e(s) for s in c['extended_sentences']), PUZ[(c['route_order']-1)%6]] for c in D]))
o.append('<h2>三、各國典型作息時間對照</h2>')
o.append(table(['作息']+[c['country'] for c in D], [[e(lab)]+[e(c['times'].get(k,'')) for c in D] for k,lab in ROUT]))
o.append('<h2>四、六大數字解謎示範題（答案 0315、1645）</h2>')
o.append(table(['關卡','設計方式','0315','1645'],[
 ['1 鏡像密碼','數字和它的鏡像黏在一起','0｜3｜1｜5 各自鏡像相連','1｜6｜4｜5 各自鏡像相連'],
 ['2 物品形狀密碼','物品外形像數字（原書對照；0 補甜甜圈）','甜甜圈、耳朵、鉛筆、鉤子','鉛筆、哨子、旗子、鉤子'],
 ['3 諧音密碼','物品中文名稱諧音（原書對照；0 補鈴鐺）','鈴鐺、高山、衣服、武器','衣服、溜冰、柿子、武器'],
 ['4 電子鐘密碼','形狀代表七段顯示器的線段，上下兩個形狀拼成一個數字','梯形＋梯形、梯形＋三角形、長條＋長條、梯形＋三角形','長條＋長條、三角形＋圓形、梯形＋長條、梯形＋三角形'],
 ['5 烏托邦密碼','照符號對照表換成數字','大圓、T、直線、小圓','直線、圓加直柄、X、小圓'],
 ['6 手機密碼','照數字順序在九宮格連線','123698741、1236987／456、258、321456987','258、3214789654、1456／369、321456987'],
]))
o.append('<p>每張解謎卡都有四個畫面：題目、Hint 1、Hint 2、答案（電子鐘＋指針鐘＋英文報時）。</p>')
o.append('<h2>五、各國詳細資料與情境動畫設計</h2>')
for c in D:
    o.append(f"<h3>{c['route_order']}. {e(c['country'])}</h3>")
    o.append(f"<p><b>問句：</b>{e(c['question'])}<br><b>目標句：</b>{e(c['target_sentence'])}<br><b>延伸情境句：</b>{' '.join(e(s) for s in c['extended_sentences'])}</p>")
    o.append(f"<p><b>制服：</b>{e(c['uniform'])}<br><b>文化配件：</b>{e(c['accessory'])}<br><b>選用理由：</b>{e(c['accessory_reason'])}</p>")
    f = c['foods']; o.append(f"<p><b>早餐：</b>{e(f['breakfast'])}<br><b>午餐：</b>{e(f['lunch'])}<br><b>晚餐：</b>{e(f['dinner'])}</p>")
    o.append('<p><b>文化細節：</b></p><ul>' + ''.join(f'<li>{e(n)}</li>' for n in c['culture_notes']) + '</ul>')
    o.append(f"<p><b>時間備註：</b>{e(c['time_notes'])}</p>")
    o.append('<p><b>情境動畫分鏡：</b></p>')
    o.append(table(['鏡頭','畫面','英文台詞','道具'], [[s['shot'], e(s['visual']), e(s['line']), e(s['props'])] for s in c['storyboard']]))
    o.append('<p><b>來源：</b></p><ul>' + ''.join(f"<li><a href=\"{e(s['url'])}\">{e(s['title'])}</a>：{e(s['what_it_supports'])}</li>" for s in c['sources']) + '</ul>')
o.append('</body></html>')
out = root/'docs'/'world-routines-research.html'; out.write_text('\n'.join(o), encoding='utf-8')
print(out.as_posix()); print(hashlib.sha256(out.read_bytes()).hexdigest()); print(out.stat().st_size)
