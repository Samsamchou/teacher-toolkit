# 產生故事稿 HTML（上傳成 Google 文件）＋估片長。句子改這裡。
import json, pathlib, html
OPEN = [("旁白", "You wake up. You look in the mirror.", "你醒來，照了照鏡子。", "2D"),
        ("旁白", "Huh? You are Ken!", "咦？你變成 Ken 了！", "2D"),
        ("旁白", "What if you were Ken in Ershui?", "如果你是二水的 Ken 呢？（片名，副標 FREE TIME）", "2D"),
        ("旁白", "It's a new week. After school, you have free time!", "新的一週開始了。放學後，你有空閒時間！", "2D")]
S = [  # 問的人, 遊戲情境句（不改）, 新增時間句, Ken 答句（不改）, 串場句, 串場中文, 3D 鏡頭, 默劇
 ("媽媽", "Today is Monday. School is over. It's rainy. Time to go home.", "It's four ten.", "I study English in my free time.",
  "You read your English book. There's a quiz tomorrow!", "你讀英語課本，明天要小考！", "Ken 的房間：坐在書桌前寫字讀書（Mixamo writing）", "雙手捧書、翻頁；在手掌上寫字、舉手指「我懂了」"),
 ("爸爸", "It's Monday evening. It's rainy outside.", "It's seven thirty.", "I watch TV in my free time.",
  "You sit on the sofa with Mom. Ha ha! The show is so funny.", "你和媽媽坐在沙發上，哈哈！節目好好笑。", "客廳：坐沙發看電視大笑（Mixamo sitting_laughing）", "癱坐沙發按遙控器；指前方抱肚子大笑"),
 ("媽媽", "Today is Tuesday. It's a cool, sunny morning. Time to go to school.", "It's seven o'clock.", "I go jogging in my free time.",
  "You put on your running shoes. You jog to school. Good morning, school!", "你穿上運動鞋，慢跑去學校。學校早安！", "街上：沿街慢跑到二水國小東側門（Mixamo jogging）", "原地高抬腿慢跑；停下擦汗、比讚"),
 ("爸爸", "It's Tuesday afternoon. School is over. It's very hot.", "It's four twenty.", "I listen to music in my free time.",
  "You go to the library. It's cool inside. You put on your new headphones.", "你走到圖書館，裡面好涼。你戴上新耳機。", "圖書館：戴耳機點頭（程式姿勢＋耳機道具）", "雙手罩耳朵陶醉；點頭左右搖擺（無聲）"),
 ("媽媽", "It's Tuesday evening. Time to go home.", "It's six fifteen.", "I play the recorder in my free time.",
  "Mom picks you up at the library. At home, you play a song. Toot, toot!", "媽媽到圖書館接你。回到家，你吹了一首歌。嘟嘟！", "Ken 的房間：吹直笛（程式姿勢＋直笛道具）", "雙手一上一下放嘴前吹；鼓腮吹、腳打拍子"),
 ("爸爸", "It's Wednesday evening. It's cloudy and cold.", "It's eight o'clock.", "I play online games in my free time.",
  "You put on your headset. You play with Tom. You win!", "你戴上耳機麥克風，和 Tom 連線玩，你贏了！", "Ken 的房間：電腦前打字玩遊戲（Mixamo typing）", "雙手握手把狂按；雙拳高舉歡呼"),
 ("媽媽", "Today is Thursday. It's rainy after school.", "It's four forty.", "I surf the Internet in my free time.",
  "You look for photos of Ershui. Your report looks great!", "你上網找二水的照片，你的報告看起來好棒！", "Ken 的房間：電腦前上網（Mixamo typing，螢幕是二水照片）", "坐空氣椅移滑鼠；手指滑、湊近螢幕"),
 ("爸爸", "Today is Saturday. It's sunny and windy.", "It's nine thirty.", "I ride a bike in my free time.",
  "Your bike is fixed! You ride to Ershui Elementary School. Your friends are there.", "腳踏車修好了！你騎到二水國小，朋友都在那裡。", "街上：騎腳踏車（程式姿勢＋腳踏車）", "雙手握把手原地踩；按車鈴、左右傾斜"),
 ("媽媽", "It's Saturday afternoon. It's sunny.", "It's two fifty.", "I play basketball in my free time.",
  "You and your friends ride to the big lawn. Shoot! Score!", "你和朋友騎到大草原。投籃！進了！", "水心之初大草原：籃球架下運球（Mixamo dribble）", "蹲低單手運球；跳起投籃"),
 ("媽媽", "It's Saturday evening. The sky is clear.", "It's six forty.", "I go camping in my free time.",
  "Mom and Dad come to the lawn. You put up a tent. Look at all the stars!", "爸媽來到草原，你們搭起帳篷。看，滿天星星！", "大草原夜景：帳篷＋營燈，跪著敲營釘（Mixamo kneeling_idle）", "單膝跪地敲營釘；盤腿烤火、指星星"),
 ("爸爸", "Today is Sunday. It's a sunny morning.", "It's eight forty.", "I play baseball in my free time.",
  "Dad throws the ball. You hit it. Home run!", "爸爸投球，你一棒打出去。全壘打！", "大草原：揮棒擊球（Mixamo baseball_hit）", "側身握棒大揮棒；手遮額頭看球飛遠"),
]
END = [("旁白", "Monday, Tuesday, Wednesday, Thursday, Saturday, Sunday. What a free week!", "星期一到星期日……好棒的空閒一週！（11 個默劇小格飛入）", "2D"),
       ("旁白", "So, what if YOU were Ken in Ershui?", "所以，如果你是二水的 Ken 呢？", "2D"),
       ("旁白", "What do YOU do in your free time?", "你自己空閒時間都做什麼？（5 秒倒數，學生回答）", "2D")]
wps = 2.4
sec = lambda s: len(s.split()) / wps + 0.6
total = sum(sec(t) for _, t, _, _ in OPEN) + 6 + sum(sec(t) for _, t, _, _ in END) + 5 + 4
rows = []
for i, (who, ctx, tm, ans, link, linkzh, shot, mime) in enumerate(S, 1):
    q = f"{ctx} {tm} What do you do in your free time?"
    total += sec(q) + 1.0 + 6.0 + 1.0 + max(5.8, sec(ans) + 1.2) + sec(link) + 1.0
    rows.append((i, who, ctx, tm, ans, link, linkzh, shot, mime))
e = lambda s: html.escape(s, quote=False)
h = [f"<html><head><meta charset='utf-8'><title>What if you were Ken in Ershui? Free Time 故事文字稿 v1</title></head><body>",
     "<h1>What if you were Ken in Ershui?（Free Time）｜故事文字稿 v1</h1>",
     "<p>2026-11-13｜依 RDQ 規格卡 <i>RDQ-spec-whatif-ken-freetime-20261113.md</i>（已確認）。HWG7 U03，六年級上課投影，先看片再玩 Free Time 小行星。</p>",
     f"<p><b>請老師看三件事：</b>① 串場句連得起來嗎？② 每天的時間合不合理？③ 片長：照 0.8 倍語速估算約 <b>{int(total // 60)} 分 {int(total % 60):02d} 秒</b>，比規格卡的 5 分鐘長——因為每段多了 6 秒默劇，遊戲的情境句也比 Ken 版長。要縮短可以：(a) 默劇只播前 4 秒（約省 20 秒）；(b) 拿掉 2、6、7 三句串場句（約省 15 秒）。</p>",
     "<p><b>記號：</b>【2D】扁平夜色畫面（程式動畫）；【默劇】遊戲的默劇影片 6 秒＋音效（listen to music 無聲），放在舞台框裡，播完停頓 1 秒，老師可在這裡暫停讓學生猜；【3D】Ken 在真實地點做那個活動（Blender）。</p>",
     "<p><b>不改的句子：</b>情境句和 Ken 的答句（I ___ in my free time.）都和遊戲路線 A 一模一樣；<b>只新增時間句</b>（紅字）和串場句。</p>",
     "<h2>角色與聲音</h2><ul><li><b>Ken</b>：主角，回答「I ___ in my free time.」（同 Ken 版的男童聲）。</li>",
     "<li><b>問的人</b>：Ken 的媽媽 Mom（6 次）、爸爸 Dad（5 次），問「What do you do in your free time?」——新做的 2D 角色，聲音在樣張時給老師聽。</li>",
     "<li><b>旁白 Narrator</b>：說開場、串場、結尾，用「you」把觀眾當成 Ken。</li></ul>",
     "<h2>一週總表</h2><table border='1'><tr><th>#</th><th>星期</th><th>時間</th><th>問的人</th><th>活動</th><th>3D 鏡頭</th></tr>"]
for i, who, ctx, tm, ans, *_r, shot, mime in rows:
    day = ctx.split("Today is ")[-1].split(".")[0] if "Today is" in ctx else ctx.split("It's ")[1].split(" ")[0]
    h.append(f"<tr><td>{i}</td><td>{e(day)}</td><td>{e(tm[5:-1])}</td><td>{who}</td><td>{e(ans[2:-17])}</td><td>{e(shot)}</td></tr>")
h.append("</table><h2>開場</h2><ol>")
for who, t, zh, m in OPEN: h.append(f"<li>【{m}】{who}：<b>{e(t)}</b><br>{zh}</li>")
h.append("</ol>")
for i, who, ctx, tm, ans, link, linkzh, shot, mime in rows:
    h.append(f"<h2>{i}. {e(ans[2:-17])}</h2><ul>")
    h.append(f"<li>【2D】{who}：<b>{e(ctx)} <span style='color:#c0392b'>{e(tm)}</span> What do you do in your free time?</b></li>")
    h.append(f"<li>【默劇 6 秒】{e(mime)}（停頓 1 秒讓學生猜）</li>")
    h.append(f"<li>【3D】Ken：<b>{e(ans)}</b>　｜　{e(shot)}</li>")
    h.append(f"<li>【2D】旁白：<b>{e(link)}</b><br>{linkzh}</li></ul>")
h.append("<h2>結尾</h2><ol>")
for who, t, zh, m in END: h.append(f"<li>【{m}】{who}：<b>{e(t)}</b><br>{zh}</li>")
h.append("</ol><p>片尾：片名＋大問號。</p></body></html>")
pathlib.Path(__file__).with_name("story-v1.html").write_text("\n".join(h), encoding="utf-8")
print(f"est {total:.0f}s = {int(total // 60)}:{int(total % 60):02d}")
