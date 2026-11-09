"""感恩節卡片正式檔：A4 學生卡（空白）、A3 示範卡（Ian 示範稿）、A4 詞語庫參考單。輸出 PDF＋預覽 PNG。
  python card/make_print.py     （要先在 thankful-listen 執行 python -m http.server 8741 才能匯出示範插圖；插圖已存成 ex_*.png）
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
DATA = json.loads((HERE.parent.parent / "thankful-35" / "sentences.json").read_text(encoding="utf-8"))

ROWS = [("To:", "short", ""), ("I'm", "", "."), ("", "", "."), ("I'm thankful for", "", ""), ("because", "", "."),
        ("I'm thankful for", "", ""), ("because", "", "."), ("", "", "!"), ("From:", "short", "")]
HINT = {1: "你的名字", 2: "感恩節小知識（文化句）", 7: "結尾句"}
ICONS = ["✉", "★", "?", "♥", "", "♥", "", "!", "✎"]
EXAMPLE = ["Ms. Lin", "Ian", "People have turkey on Thanksgiving Day", "my mom", "she cooks for me",
           "my friends", "they play with me", "Happy Thanksgiving", "Ian"]
FACTS = [("People have turkey on Thanksgiving Day.", "人們在感恩節吃火雞。"),
         ("The Pilgrims came to America on the Mayflower.", "清教徒搭五月花號來到美洲。"),
         ("The Pilgrims had a harvest celebration in 1621.", "清教徒在 1621 年舉辦豐收慶祝。"),
         ("Families have a big feast together.", "家人一起享用豐盛大餐。"),
         ("People eat pumpkin pie for dessert.", "人們吃南瓜派當甜點。"),
         ("On Thanksgiving, people say what they are thankful for.", "感恩節時，人們說出自己感謝的事。")]
ENDS = [("Happy Thanksgiving!", "感恩節快樂！"), ("I like pumpkin pie.", "我喜歡南瓜派。"),
        ("Let's say \"thank you\" every day.", "讓我們每天都說謝謝。"), ("I will make a thank-you card for my mom.", "我要做一張感謝卡給媽媽。"),
        ("Have a happy Thanksgiving with your family!", "祝你和家人感恩節快樂！"), ("Thank you for listening!", "謝謝大家聆聽！")]
LEAF = 'M0,-6 L1.4,-2.4 L4.6,-3.6 L3.4,-0.6 L6,0.6 L2.6,1.6 L3,4.4 L0.4,2.8 L0,6.5 L-0.4,2.8 L-3,4.4 L-2.6,1.6 L-6,0.6 L-3.4,-0.6 L-4.6,-3.6 L-1.4,-2.4 Z'


def rows(fill=None):
    out = []
    for i, (lead, kind, end) in enumerate(ROWS):
        h = f"<i>{HINT[i]}</i>" if i in HINT and not fill else ""
        w = f'<em>{fill[i]}</em>' if fill else ""
        style = ' style="justify-content:flex-end"' if lead == "From:" else ""
        out.append(f'<div class="row"{style}><span class="ic">{ICONS[i]}</span><b>{lead}</b><span class="blank {kind}">{h}{w}</span><b>{end}</b></div>')
    return "\n".join(out)


CARD_CSS = """@font-face{font-family:Comic;src:url(ComicRelief-Regular.ttf)}
*{box-sizing:border-box;margin:0;padding:0}
.card{position:relative;width:297mm;height:210mm;overflow:hidden;font-family:Comic,sans-serif;color:#4a2a12;
  background:linear-gradient(135deg,#fff4dc 0%,#ffe6c4 100%);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.frame{position:absolute;inset:6mm;border-radius:10mm;border:3mm solid #e8833a;box-shadow:inset 0 0 0 1.2mm #fff4dc,inset 0 0 0 2mm #f6b26b}
.title{position:absolute;top:12mm;left:16mm;right:16mm;height:20mm;border-radius:10mm;background:#c8541f;color:#fff;font-size:12mm;text-align:center;line-height:20mm;letter-spacing:.6mm}
.title:before,.title:after{content:"";position:absolute;top:50%;width:9mm;height:9mm;margin-top:-4.5mm;border-radius:50%;background:#f6c344}
.title:before{left:6mm}.title:after{right:6mm}
.left{position:absolute;left:18mm;top:37mm;width:158mm;background:#fffdf7;border-radius:6mm;padding:1mm 5mm 3mm 3mm;box-shadow:0 .6mm 0 #f0c890}
.row{display:flex;align-items:flex-end;height:15.2mm;font-size:6.3mm;white-space:nowrap}
.row b{font-weight:normal}.blank{position:relative;flex:1;border-bottom:.5mm solid #8a5a30;margin:0 1.5mm 1.6mm;min-width:12mm}
.short{flex:0 0 40mm}.blank i{position:absolute;left:1mm;bottom:-4.4mm;font-style:normal;font-size:2.9mm;color:#b89878}
.blank em{position:absolute;left:1.5mm;bottom:.6mm;font-style:normal;font-size:6mm;color:#1f4fa0}
.ic{display:inline-flex;flex:0 0 8mm;width:8mm;height:8mm;margin-right:2mm;margin-bottom:.6mm;align-items:center;justify-content:center;border-radius:50%;font-size:4.6mm;color:#fff}
.row:nth-child(1) .ic,.row:nth-child(9) .ic{background:#7a9a3a}.row:nth-child(2) .ic{background:#e8a33a}
.row:nth-child(3) .ic{background:#3a86c8}.row:nth-child(4) .ic,.row:nth-child(6) .ic{background:#d84a3a}.row:nth-child(8) .ic{background:#9a5ac8}
.row:nth-child(5) .ic,.row:nth-child(7) .ic{background:none}
.right{position:absolute;right:16mm;top:37mm;width:92mm;height:129mm;border:1mm dashed #e8833a;border-radius:8mm;background:#fff;overflow:hidden}
.right span{position:absolute;top:3mm;left:0;right:0;text-align:center;font-size:3.6mm;color:#c09070}
.right img{display:block;width:84mm;margin:9mm auto 0;border-radius:4mm}
.pippy{position:absolute;right:5mm;bottom:5mm;width:44mm}
.bub{position:absolute;right:46mm;bottom:40mm;background:#fff;border:.6mm solid #c8541f;border-radius:5mm;padding:1.5mm 3mm;font-size:3.8mm;color:#c8541f}
.leafs{position:absolute;inset:0}
"""


def card(fill=None):
    pics = '<img src="ex_mom_1.png"><img src="ex_friends_1.png">' if fill else ""
    return f"""<div class="card"><div class="frame"></div>
<svg class="leafs" viewBox="0 0 297 210" width="297mm" height="210mm"><g stroke="#a0522d" stroke-width=".5">
<path d="{LEAF}" transform="translate(12,190) rotate(30) scale(1.4)" fill="#e8c35a"/><path d="{LEAF}" transform="translate(22,198) rotate(-20)" fill="#e07b4f"/>
<path d="{LEAF}" transform="translate(150,200) rotate(10) scale(.9)" fill="#f2a65a"/></g></svg>
<div class="title">Happy Thanksgiving!</div><div class="left">{rows(fill)}</div>
<div class="right"><span>Draw a picture 畫一張圖</span>{pics}</div>
<img class="pippy" src="pippy_cut.png"><div class="bub">I'm thankful for you!</div></div>"""


def wordbank():
    pron = {"mom": "she", "grandma": "she", "teacher": "she／he"}
    trs = []
    for g in DATA["groups"]:
        rs = "".join(f"<li>{it['reason']}<small>{it['zh'].split('，因為')[-1].rstrip('。')}</small></li>" for it in g["items"])
        trs.append(f"<tr><td class='tg'>{g['target']}<small>{g['zh_target']}</small></td><td><ol>{rs}</ol></td></tr>")
    facts = "".join(f"<li>{e}<small>{z}</small></li>" for e, z in FACTS)
    ends = "".join(f"<li>{e}<small>{z}</small></li>" for e, z in ENDS)
    return f"""<div class="wb"><div class="wtitle">Thanksgiving Word Bank 感恩節詞語庫</div>
<div class="pat">I'm thankful for <u>my mom</u> because <u>she cooks for me</u>.</div>
<table>{''.join(trs)}</table>
<div class="two"><div><h3>② 感恩節小知識（選 1 句）</h3><ol>{facts}</ol></div><div><h3>⑤ 結尾句（選 1 句）</h3><ol>{ends}</ol></div></div>
<img class="wp" src="pippy_cut.png"></div>"""


WB_CSS = """@font-face{font-family:Comic;src:url(ComicRelief-Regular.ttf)}*{box-sizing:border-box;margin:0;padding:0}
.wb{position:relative;width:210mm;height:297mm;padding:12mm 12mm;font-family:Comic,'Microsoft JhengHei',sans-serif;color:#4a2a12;background:#fff8ea;
  border:3mm solid #e8833a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wtitle{background:#c8541f;color:#fff;font-size:8.5mm;text-align:center;border-radius:8mm;padding:2.5mm}
.pat{text-align:center;font-size:5mm;margin:3mm 0}.pat u{color:#c8541f;text-decoration-color:#e8833a}
table{width:100%;border-collapse:separate;border-spacing:0 1.6mm}
td{background:#fff;vertical-align:middle;padding:1.4mm 3mm}
td.tg{width:36mm;border-radius:4mm 0 0 4mm;background:#e8833a;color:#fff;font-size:5mm;text-align:center}
td.tg small{display:block;font-size:3.3mm;font-family:'Microsoft JhengHei'}
td:last-child{border-radius:0 4mm 4mm 0}
td ol{display:grid;grid-template-columns:1fr 1fr;gap:.4mm 4mm;padding-left:5mm;font-size:3.7mm}
li small{color:#9a7a5a;font-family:'Microsoft JhengHei';font-size:2.9mm;margin-left:1.5mm}
.two{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:2mm}
.two>div{background:#fff;border-radius:4mm;padding:2.5mm 3mm}
.two h3{font-weight:normal;font-size:4.2mm;color:#c8541f;margin-bottom:1mm;font-family:'Microsoft JhengHei'}
.two ol{padding-left:5mm;font-size:3.5mm;line-height:1.45}.two li small{display:block;margin:0}
.wp{position:absolute;right:15mm;top:9mm;width:17mm}.wtitle{padding-right:20mm}
"""


def page(body, css, w, h):
    return f"<!doctype html><meta charset=utf-8><style>{css}@page{{size:{w} {h};margin:0}}html,body{{width:{w};height:{h}}}</style>{body}"


jobs = [("card_A4", card(), CARD_CSS, "297mm", "210mm", 1.0),
        ("example_A3", card(EXAMPLE), CARD_CSS, "420mm", "297mm", 420 / 297),
        ("wordbank_A4", wordbank(), WB_CSS, "210mm", "297mm", 1.0)]
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome"); pg = b.new_page(viewport={"width": 1123, "height": 1123})
    for name, body, css, w, h, z in jobs:
        if z != 1.0: body = f'<div style="zoom:{z}">{body}</div>'
        f = HERE / f"{name}.html"; f.write_text(page(body, css, w, h), encoding="utf-8")
        pg.goto(f.resolve().as_uri()); pg.wait_for_timeout(700)
        pg.pdf(path=str(HERE / f"{name}.pdf"), width=w, height=h, print_background=True)
        el = pg.query_selector(".card,.wb"); el.screenshot(path=str(HERE / f"{name}.png"))
    b.close()
print("ok")
