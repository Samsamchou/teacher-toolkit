# 問路動畫故事稿 HTML（上傳成 Google 文件）＋估片長。句子與顏色對應改這裡。
import pathlib, html
ROADS = [  # 地點, 中文, 顏色, Road/Street, 回答者, Ken 道謝
 ("train station", "火車站", "Red", "Road", "Shuiling", "Thanks, Shuiling!"),
 ("post office", "郵局", "Blue", "Street", "Zun-Bo", "Thank you, Zun-Bo!"),
 ("school", "學校", "Green", "Road", "Grandma", "Thanks, Grandma!"),
 ("library", "圖書館", "Yellow", "Street", "Shuiling", "Thank you, Shuiling!"),
 ("hospital", "醫院", "White", "Road", "Zun-Bo", "Thanks, Zun-Bo!"),
 ("bookstore", "書店", "Orange", "Street", "Grandma", "Thank you, Grandma!"),
 ("supermarket", "超市", "Purple", "Road", "Shuiling", "Thanks, Shuiling!"),
 ("museum", "博物館", "Brown", "Street", "Zun-Bo", "Thank you, Zun-Bo!"),
]
OPEN = [("旁白", "Look! A little Ershui on the table!", "看！桌上有一個小小的二水！"),
        ("旁白", "The roads have colors. Red Road, Blue Street, Green Road...", "每條路都有顏色：紅色路、藍色街、綠色路……"),
        ("旁白", "A road is big. A street is small.", "Road 是大馬路，Street 是小街道。"),
        ("Ken", "Let's play a map game! I ask, you answer!", "我們來玩地圖遊戲！我問，你們答！")]
TURN = [("post office", "Blue Street"), ("school", "Green Road"), ("bookstore", "Orange Street"), ("museum", "Brown Street")]   # 老師 11/15：Your turn 加到 4 題
LINKS = {'train station': ('Choo-choo! The train is coming!', '嘟嘟！火車來了！'), 'post office': ('You put a letter in the red mailbox.', '你把信投進紅色郵筒。'), 'school': ('Ding-dong! The school bell rings.', '叮咚！學校的鐘聲響了。'), 'library': ('Shh! The library is very quiet.', '噓！圖書館很安靜。'), 'hospital': ('The doctor says, "Drink some water."', '醫生說：「多喝水喔。」'), 'bookstore': ('Look at all the comic books!', '哇，好多漫畫書！'), 'supermarket': ('Milk, bread and apples. Yum!', '牛奶、麵包和蘋果，好好吃！'), 'museum': ('Wow! An old, old train!', '哇！好老好老的火車！')}   # 老師 11/15：每題加一句串場
END = [("旁白", "Your turn! Ask your friend.", "換你了！問問你的朋友。"),
       ("旁白", "Now you know Ershui. Let's play the game!", "現在你認識二水了，一起來玩遊戲吧！")]
wps = 2.4; sec = lambda s: len(s.split()) / wps + 0.6
total = sum(sec(t) for _, t, _ in OPEN) + 8
for p, zh, c, k, who, thx in ROADS:
    total += sec(f"Where's the {p}?") + 0.6 + 3.0 + sec(f"It's on {c} {k}.") + 4.0 + sec(thx) + 0.8 + sec(LINKS[p][0]) + 2.0
total += sec(END[0][1]) + sum(5 + sec(f"Where's the {p}?") + sec(f"It's on {a}.") + 1.5 for p, a in TURN) + sec(END[1][1]) + 4
e = lambda s: html.escape(s, quote=False)
COL = {"Red": "#e03131", "Blue": "#1971c2", "Green": "#2f9e44", "Yellow": "#f59f00", "White": "#868e96", "Orange": "#fd7e14", "Purple": "#7048e8", "Brown": "#8b5a2b"}
h = ["<html><head><meta charset='utf-8'><title>Where's the ___? 問路動畫 故事文字稿 v2</title></head><body>",
     "<h1>Where's the ___? It's on ___ Road/Street.｜二水桌上小鎮問路動畫｜故事文字稿 v2</h1>",
     "<p>2026-11-15｜依 RDQ 規格卡 <i>RDQ-spec-where-road-ershui-20261115.md</i>（已確認）。畫風 H 桌上微縮：桌上的二水迷你小鎮，路漆成顏色、插小路牌，鏡頭從高處俯瞰再飛近建築。上課投影，先看片再玩小行星「問路」模式。</p>",
     f"<p><b>v2（老師 11/15）：</b>每題加一句串場、Your turn 加到 4 題。</p><p><b>請老師看三件事：</b>① 顏色對應表可以嗎？② 回答的人輪流（水鈴→圳寶→奶奶）可以嗎？③ 片長估約 <b>{int(total // 60)} 分 {int(total % 60):02d} 秒</b>。</p>",
     "<p><b>記號：</b>【俯瞰】鏡頭從高處看整個小鎮；【找找看 3 秒】地圖上跳出地點圖示，學生在地圖上找；【揭曉】答案那條路發亮、路牌放大；【飛近】鏡頭飛到建築前。</p>",
     "<p><b>不改的句子：</b>Where's the ___? / It's on ___ Road. / It's on ___ Street. 和遊戲一樣；Ken 的開場、道謝和旁白是新加的。<b>注意：</b>遊戲每場的路顏色會換，片子固定用下表這一組。</p>",
     "<h2>顏色對應表（Road 寬馬路 4 條、Street 窄街道 4 條）</h2><table border='1'><tr><th>#</th><th>地點</th><th>路</th><th>種類</th><th>回答的人</th></tr>"]
for i, (p, zh, c, k, who, thx) in enumerate(ROADS, 1):
    h.append(f"<tr><td>{i}</td><td>{e(p)}（{zh}）</td><td><b style='color:{COL[c]}'>{c} {k}</b></td><td>{'寬馬路' if k == 'Road' else '窄街道'}</td><td>{who}</td></tr>")
h.append("</table><h2>開場</h2><ol>")
for who, t, zh in OPEN: h.append(f"<li>【俯瞰】{who}：<b>{e(t)}</b><br>{zh}</li>")
h.append("</ol><h2>8 題問路</h2>")
for i, (p, zh, c, k, who, thx) in enumerate(ROADS, 1):
    h.append(f"<h3>{i}. {e(p)}（{zh}）</h3><ul>")
    h.append(f"<li>【俯瞰】Ken：<b>Where's the {e(p)}?</b>　（地圖上跳出{zh}圖示）</li>")
    h.append("<li>【找找看 3 秒】旁白：<b>Find it!</b>　倒數 3-2-1</li>")
    h.append(f"<li>【揭曉＋飛近】{who}：<b>It's on <span style='color:{COL[c]}'>{c} {k}</span>.</b>　（{c} {k} 發亮、路牌放大，鏡頭飛到{zh}前）</li>")
    h.append(f"<li>Ken：<b>{e(thx)}</b></li>")
    h.append(f"<li>【串場】旁白：<b>{e(LINKS[p][0])}</b><br>{LINKS[p][1]}（建築前的小動畫）</li></ul>")
h.append("<h2>Your turn!（片尾練習）</h2><ol>")
h.append(f"<li>旁白：<b>{e(END[0][1])}</b><br>{END[0][2]}</li>")
for p, a in TURN:
    h.append(f"<li>畫面：地點圖示＋<b>Where's the {e(p)}?</b>，倒數 5 秒讓學生兩兩互問 → 揭曉 <b>It's on {e(a)}.</b></li>")
h.append(f"<li>旁白：<b>{e(END[1][1])}</b><br>{END[1][2]}</li></ol><p>片尾：桌上小鎮全景＋片名。</p></body></html>")
pathlib.Path(__file__).with_name("story-v2.html").write_text("\n".join(h), encoding="utf-8")
print(f"est {total:.0f}s = {int(total // 60)}:{int(total % 60):02d}")
