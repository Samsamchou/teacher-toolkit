"""三種卡片樣稿（A 著色邊框、B Pippy、C 明信片），輸出 HTML＋預覽 PNG。"""
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
ROWS = [("To:", "short", ""), ("I'm", "", "."), ("", "", "."), ("I'm thankful for", "", ""), ("because", "", "."),
        ("I'm thankful for", "", ""), ("because", "", "."), ("", "", "!"), ("From:", "short", "")]
HINT = {1: "你的名字", 2: "感恩節小知識（文化句）", 7: "結尾句"}


def rows(icons=None):
    out = []
    for i, (lead, kind, end) in enumerate(ROWS):
        ic = f'<span class="ic">{icons[i]}</span>' if icons and icons[i] else ('<span class="ic"></span>' if icons else "")
        h = f"<i>{HINT[i]}</i>" if i in HINT else ""
        style = ' style="justify-content:flex-end"' if lead == "From:" else ""
        out.append(f'<div class="row"{style}>{ic}<b>{lead}</b><span class="blank {kind}">{h}</span><b>{end}</b></div>')
    return "\n".join(out)


BASE = """@font-face{font-family:Comic;src:url(ComicRelief-Regular.ttf)}
@page{size:A4 landscape;margin:0}*{box-sizing:border-box;margin:0;padding:0}
html,body{width:297mm;height:210mm}
.card{position:relative;width:297mm;height:210mm;overflow:hidden;font-family:Comic,sans-serif;color:#4a2a12}
.row{display:flex;align-items:flex-end;height:15.4mm;font-size:6.4mm;white-space:nowrap}
.row b{font-weight:normal}.blank{position:relative;flex:1;border-bottom:.5mm solid #8a5a30;margin:0 1.5mm 1.6mm;min-width:12mm}
.short{flex:0 0 38mm}.blank i{position:absolute;left:1mm;bottom:-4.4mm;font-style:normal;font-size:2.9mm;color:#b89878}
.ic{display:inline-flex;width:8mm;height:8mm;margin-right:2mm;margin-bottom:.6mm;align-items:center;justify-content:center;border-radius:50%;font-size:4.6mm;color:#fff}
"""

LEAF = 'M0,-6 L1.4,-2.4 L4.6,-3.6 L3.4,-0.6 L6,0.6 L2.6,1.6 L3,4.4 L0.4,2.8 L0,6.5 L-0.4,2.8 L-3,4.4 L-2.6,1.6 L-6,0.6 L-3.4,-0.6 L-4.6,-3.6 L-1.4,-2.4 Z'

A = f"""<style>{BASE}
.card{{background:#fff}}
.bd{{position:absolute;inset:0;width:297mm;height:210mm;object-fit:fill}}
h1{{position:absolute;top:24mm;left:0;right:0;text-align:center;font-size:13mm;color:#000;
  -webkit-text-stroke:.5mm #000;color:#fff;letter-spacing:.6mm}}
.left{{position:absolute;left:34mm;top:44mm;width:138mm}}
.row{{height:14.2mm;font-size:6mm}}
.right{{position:absolute;right:33mm;top:46mm;width:84mm;height:120mm;border:.8mm solid #000;border-radius:5mm;background:#fff}}
.right span{{position:absolute;bottom:2.5mm;left:0;right:0;text-align:center;font-size:3.4mm;color:#999}}
</style><div class="card"><img class="bd" src="border_coloring.png">
<h1>Happy Thanksgiving!</h1><div class="left">{rows()}</div><div class="right"><span>Draw a picture 畫一張圖</span></div></div>"""

ICONS = ["✉", "★", "?", "♥", "", "♥", "", "!", "✎"]
B = f"""<style>{BASE}
.card{{background:linear-gradient(135deg,#fff4dc 0%,#ffe6c4 100%)}}
.frame{{position:absolute;inset:6mm;border-radius:10mm;border:3mm solid #e8833a;box-shadow:inset 0 0 0 1.2mm #fff4dc,inset 0 0 0 2mm #f6b26b}}
.title{{position:absolute;top:12mm;left:16mm;right:16mm;height:20mm;border-radius:10mm;background:#c8541f;color:#fff;
  font-size:12mm;text-align:center;line-height:20mm;letter-spacing:.6mm}}
.title:before,.title:after{{content:"";position:absolute;top:50%;width:9mm;height:9mm;margin-top:-4.5mm;border-radius:50%;background:#f6c344}}
.title:before{{left:6mm}}.title:after{{right:6mm}}
.left{{position:absolute;left:18mm;top:38mm;width:156mm;background:#fffdf7;border-radius:6mm;padding:1mm 5mm 3mm 3mm;box-shadow:0 .6mm 0 #f0c890}}
.row{{height:15mm}}
.row:nth-child(1) .ic,.row:nth-child(9) .ic{{background:#7a9a3a}}.row:nth-child(2) .ic{{background:#e8a33a}}
.row:nth-child(3) .ic{{background:#3a86c8}}.row:nth-child(4) .ic,.row:nth-child(6) .ic{{background:#d84a3a}}
.row:nth-child(8) .ic{{background:#9a5ac8}}
.right{{position:absolute;right:16mm;top:38mm;width:94mm;height:128mm;border:1mm dashed #e8833a;border-radius:8mm;background:#fff}}
.right span{{position:absolute;top:3mm;left:0;right:0;text-align:center;font-size:3.6mm;color:#c09070}}
.pippy{{position:absolute;right:6mm;bottom:5mm;width:44mm}}
.bub{{position:absolute;right:46mm;bottom:40mm;background:#fff;border:.6mm solid #c8541f;border-radius:5mm;padding:1.5mm 3mm;font-size:3.8mm;color:#c8541f}}
.leafs{{position:absolute;inset:0}}
</style><div class="card"><div class="frame"></div>
<svg class="leafs" viewBox="0 0 297 210" width="297mm" height="210mm"><g stroke="#a0522d" stroke-width=".5">
<path d="{LEAF}" transform="translate(12,190) rotate(30) scale(1.4)" fill="#e8c35a"/><path d="{LEAF}" transform="translate(22,198) rotate(-20)" fill="#e07b4f"/>
<path d="{LEAF}" transform="translate(150,200) rotate(10) scale(.9)" fill="#f2a65a"/></g></svg>
<div class="title">Happy Thanksgiving!</div>
<div class="left">{rows(ICONS)}</div>
<div class="right"><span>Draw a picture 畫一張圖</span></div>
<img class="pippy" src="pippy_cut.png"><div class="bub">I'm thankful for you!</div></div>"""

C = f"""<style>{BASE}
.card{{background:#fffdf6}}
.air{{position:absolute;inset:0;border:7mm solid transparent;
  border-image:repeating-linear-gradient(45deg,#d9482b 0 7mm,#fffdf6 7mm 12mm,#2f6db5 12mm 19mm,#fffdf6 19mm 24mm) 7}}
h1{{position:absolute;top:13mm;left:16mm;font-size:12mm;color:#c8541f;letter-spacing:.5mm}}
.sub{{position:absolute;top:29.5mm;left:17mm;font-size:4mm;color:#9a7a5a;letter-spacing:1mm}}
.left{{position:absolute;left:16mm;top:38mm;width:150mm}}
.div{{position:absolute;left:172mm;top:16mm;bottom:16mm;border-left:.5mm solid #c8b098}}
.stamp{{position:absolute;right:14mm;top:16mm;width:104mm;height:150mm;background:#fff;
  background-image:radial-gradient(circle,#fffdf6 1.7mm,#0000 1.8mm);background-size:6mm 6mm;background-position:-3mm -3mm;
  box-shadow:0 0 0 .3mm #e0d0b8}}
.inner{{position:absolute;inset:3.2mm;background:#fff}}.inner2{{position:absolute;inset:3mm;border:.6mm solid #d9b48a}}
.val{{position:absolute;right:6mm;bottom:3mm;font-size:6mm;color:#c8541f}}
.lbl{{position:absolute;left:0;right:0;top:3mm;text-align:center;font-size:3.3mm;color:#c0a080}}
.post{{position:absolute;right:92mm;top:150mm;width:34mm;height:34mm;border:.8mm solid #b04a3a;border-radius:50%;
  color:#b04a3a;font-size:3.4mm;text-align:center;padding-top:9mm;transform:rotate(-14deg);opacity:.85;line-height:4.6mm}}
.post:after{{content:"";position:absolute;left:30mm;top:9mm;width:30mm;height:12mm;
  background:repeating-linear-gradient(#0000 0 2mm,#b04a3a 2mm 2.6mm)}}
</style><div class="card"><div class="air"></div>
<h1>Happy Thanksgiving!</h1><div class="sub">A THANK-YOU POSTCARD · 感恩明信片</div>
<div class="left">{rows()}</div>
<div class="stamp"><div class="inner"><div class="inner2"></div><span class="lbl">Draw a picture 畫一張圖</span></div></div>
<div class="post">ERSHUI<br>NOV · 2026<br>THANKS</div></div>"""

pages = {"A": A, "B": B, "C": C}
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome")
    pg = b.new_page(viewport={"width": 1123, "height": 794}, device_scale_factor=1.2)
    for k, body in pages.items():
        if k == "A" and not (HERE / "border_coloring.png").exists(): continue
        f = HERE / f"variant_{k}.html"; f.write_text("<!doctype html><meta charset=utf-8>" + body, encoding="utf-8")
        pg.goto(f.resolve().as_uri()); pg.wait_for_timeout(600); pg.screenshot(path=str(HERE / f"variant_{k}.png"))
    b.close()
print("ok")
