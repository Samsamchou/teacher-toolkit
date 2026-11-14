# 水鈴版故事稿 HTML（上傳成 Google 文件）＋估片長。句子改這裡；之後 voices.json 也從這裡產生。
import pathlib, html, re
OPEN = [("旁白", "Ding-dong! Someone is at your door.", "叮咚！有人在按你家門鈴。", "2D"),
        ("旁白", "It's Shuiling! She is your good friend.", "是水鈴！她是你的好朋友。", "2D"),
        ("旁白", "What if you were Ken in Ershui?", "如果你是二水的 Ken 呢？（片名，副標 SHUILING'S FREE TIME）", "2D"),
        ("旁白", "Mom and Dad ask you about Shuiling's week. Can you answer?", "爸爸媽媽問你水鈴這一週做了什麼，你答得出來嗎？", "2D")]
S = [  # 問的人, 遊戲情境句（不改）, 新增時間句, Ken 答句（不改）, 串場句, 串場中文, 3D 鏡頭, 默劇（水鈴版，重點 A；重點 B）
 ("媽媽", "Today is Monday. School is over. It's cool and sunny.", "It's four thirty.", "She goes jogging in her free time.",
  "Shuiling jogs to the Ershui Water Park. She is so fast!", "水鈴一路慢跑到二八水水公園，她跑得好快！",
  "街上→二八水水公園：水鈴慢跑（Mixamo jogging）", "原地高抬腿慢跑；停下擦汗、比讚"),
 ("爸爸", "It's Monday evening. It's cold and windy.", "It's seven fifteen.", "She plays the recorder in her free time.",
  "At night, Shuiling plays a song on her recorder. Toot, toot!", "晚上水鈴用直笛吹了一首歌，嘟嘟！",
  "水鈴的房間：吹直笛（程式姿勢＋直笛道具）", "雙手一上一下放嘴前吹；鼓腮吹、腳打拍子"),
 ("媽媽", "Today is Tuesday. It's rainy after school.", "It's four ten.", "She studies English in her free time.",
  "Shuiling walks home in the rain. She opens her English book.", "水鈴冒雨走回家，打開英語課本。",
  "水鈴家書桌：寫字讀書（Mixamo writing）", "雙手捧書翻頁；在手掌上寫字、舉手指「我懂了」"),
 ("爸爸", "It's Tuesday evening. It's still rainy outside.", "It's eight o'clock.", "She watches TV in her free time.",
  "Shuiling sits on the sofa. Ha ha! The show is so funny.", "水鈴坐在沙發上，哈哈！節目好好笑。",
  "水鈴家客廳：坐沙發看電視大笑（Mixamo sitting_laughing）", "癱坐沙發按遙控器；指前方抱肚子大笑"),
 ("媽媽", "It's Wednesday afternoon. School is over. It's very hot.", "It's one thirty.", "She listens to music in her free time.",
  "It's too hot! Shuiling goes to the library. She puts on her headphones.", "太熱了！水鈴走到圖書館，戴上耳機。",
  "圖書館：戴耳機點頭（Mixamo sitting_idle＋耳機道具）", "雙手罩耳朵陶醉；點頭左右搖擺（無聲）"),
 ("爸爸", "It's Wednesday evening. It's cloudy and cold.", "It's six forty.", "She surfs the Internet in her free time.",
  "Shuiling walks home. She looks for pictures of rice fields online.", "水鈴走回家，上網找稻田的照片。",
  "水鈴家書桌：電腦前上網（Mixamo typing）", "坐空氣椅移滑鼠；手指滑、湊近螢幕"),
 ("媽媽", "It's Thursday evening. It's rainy and windy.", "It's seven thirty.", "She plays online games in her free time.",
  "Wind and rain outside! Shuiling plays an online game with you. She wins!", "外面風雨交加！水鈴和你連線玩遊戲，她贏了！",
  "水鈴的房間：電腦前打電動（Mixamo typing）", "雙手握手把狂按；雙拳高舉歡呼"),
 ("爸爸", "Today is Friday. School is over. It's sunny.", "It's four twenty.", "She plays basketball in her free time.",
  "After school, Shuiling shoots the ball. Swish! She scores!", "放學後水鈴投籃，唰！進了！",
  "學校旁籃球場：運球投籃（Mixamo dribble）", "蹲低單手運球；跳起投籃"),
 ("媽媽", "Today is Saturday. It's a sunny, windy morning.", "It's nine o'clock.", "She rides a bike in her free time.",
  "Shuiling rides her bike to the big lawn. The wind is so strong!", "水鈴騎腳踏車到大草原，風好大！",
  "街上→水心之初大草原：騎腳踏車（Mixamo driving＋腳踏車）", "雙手握把手原地踩；按車鈴、左右傾斜"),
 ("爸爸", "It's Saturday afternoon. It's warm and sunny.", "It's two forty.", "She plays baseball in her free time.",
  "Shuiling swings the bat and hits the ball. Home run!", "水鈴揮棒打中球，全壘打！",
  "大草原：揮棒擊球（Mixamo baseball_hit）", "側身握棒大揮棒；手遮額頭看球飛遠"),
 ("媽媽", "It's Sunday evening. It's cool. The sky is clear.", "It's six fifteen.", "She goes camping in her free time.",
  "Shuiling and her family camp at Babao Canal Park. Look at the stars!", "水鈴和家人在八堡圳公園露營，看，滿天星星！",
  "八堡圳公園夜景：帳篷＋營燈（Mixamo kneeling_idle）", "單膝跪地敲營釘；盤腿烤火、指星星"),
]
END = [("旁白", "Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. What a busy week, Shuiling!", "星期一到星期日……水鈴這週好忙！（11 個默劇小格飛入）", "2D"),
       ("旁白", "So, what if YOU were Ken in Ershui?", "所以，如果你是二水的 Ken 呢？", "2D"),
       ("旁白", "What does YOUR friend do in his or her free time?", "你的朋友空閒時間都做什麼？（5 秒倒數，學生回答）", "2D")]
YOUR_TURN = 4.5   # Your turn! 新畫面：架構句＋s/es 提醒＋倒數 3 秒（約 4.5 秒）
wps = 2.4
sec = lambda s: len(s.split()) / wps + 0.6
total = sum(sec(t) for _, t, _, _ in OPEN) + 6 + sum(sec(t) for _, t, _, _ in END) + 5 + 4
rows = []
for i, (who, ctx, tm, ans, link, linkzh, shot, mime) in enumerate(S, 1):
    q = f"{ctx} {tm} What does she do in her free time?"
    total += sec(q) + 1.0 + 6.0 + 0.5 + YOUR_TURN + max(5.8, sec(ans) + 1.2) + sec(link) + 1.0
    rows.append((i, who, ctx, tm, ans, link, linkzh, shot, mime))
e = lambda s: html.escape(s, quote=False)
verb = lambda ans: ans.split()[1]                               # goes / plays / studies / watches ...
act = lambda ans: ans[4:-len(" in her free time.")]              # goes jogging
def hl(ans):                                                     # 字尾 s/es/ies 標紅
    v = verb(ans)
    suf = "ies" if v.endswith("ies") else ("es" if v.endswith(("shes", "ches", "sses", "xes", "zes", "oes")) else "s")   # rides = ride+s
    base = v[:-len(suf)]
    return e(ans).replace(v, f"{base}<span style='color:#c0392b'><b>{suf}</b></span>", 1)
h = ["<html><head><meta charset='utf-8'><title>What if you were Ken in Ershui? Shuiling's Free Time 故事文字稿 v1</title></head><body>",
     "<h1>What if you were Ken in Ershui?（Shuiling's Free Time）｜故事文字稿 v1</h1>",
     "<p>2026-11-14｜依 RDQ 規格卡 <i>RDQ-spec-whatif-shuiling-freetime-20261114.md</i>（已確認）。HWG7 U03 第三人稱：What does she do in her free time? / She ___ in her free time.</p>",
     f"<p><b>請老師看四件事：</b>① 開場「水鈴來按門鈴」可以嗎？② 串場句連得起來嗎？③ 每天的時間合不合理（星期三下午放學＝1:30）？④ 片長：照 0.8 倍語速估算約 <b>{int(total // 60)} 分 {int(total % 60):02d} 秒</b>。</p>",
     "<p><b>記號：</b>【2D】扁平夜色畫面；【默劇】KIE 水鈴版默劇 6 秒＋音效（listen to music 無聲），播完停頓；"
     "【Your turn】另一張新畫面：架構句 <b>She ____ in her free time.</b>＋提醒「動詞加 s／es」＋倒數 3 秒，學生扮演 Ken 回答；"
     "【Ken 答】Ken 的聲音＋卡拉 OK 念出答案，字尾 s／es 換色（下面紅字）；【3D】水鈴在真實地點做活動。</p>",
     "<p><b>不改的句子：</b>情境句和答句（She ___ in her free time.）都和遊戲水鈴路線一模一樣；<b>只新增時間句</b>和串場句。</p>",
     "<h2>角色與聲音</h2><ul><li><b>Ken</b>：念出正確答案（同 Ken 版男童聲）；學生扮演 Ken 先回答。</li>",
     "<li><b>問的人</b>：Ken 的媽媽 Mom（6 次）、爸爸 Dad（5 次），沿用 Ken 版角色與聲音（媽媽 A＋爸爸 B）。</li>",
     "<li><b>水鈴</b>：默劇和 3D 都由水鈴表演，不說話。</li><li><b>旁白 Narrator</b>：開場、Your turn、串場、結尾。</li></ul>",
     "<h2>一週總表</h2><table border='1'><tr><th>#</th><th>星期</th><th>時間</th><th>問的人</th><th>答句</th><th>3D 鏡頭</th></tr>"]
for i, who, ctx, tm, ans, link, linkzh, shot, mime in rows:
    day = ctx.split("Today is ")[-1].split(".")[0] if "Today is" in ctx else ctx.split("It's ")[1].split(" ")[0]
    h.append(f"<tr><td>{i}</td><td>{e(day)}</td><td>{e(tm[5:-1])}</td><td>{who}</td><td>{hl(ans)}</td><td>{e(shot)}</td></tr>")
h.append("</table><h2>開場</h2><ol>")
for who, t, zh, m in OPEN: h.append(f"<li>【{m}】{who}：<b>{e(t)}</b><br>{zh}</li>")
h.append("</ol>")
for i, who, ctx, tm, ans, link, linkzh, shot, mime in rows:
    h.append(f"<h2>{i}. {e(act(ans))}</h2><ul>")
    h.append(f"<li>【2D】{who}：<b>{e(ctx)} <span style='color:#c0392b'>{e(tm)}</span> What does she do in her free time?</b></li>")
    h.append(f"<li>【默劇 6 秒】水鈴：{e(mime)}</li>")
    h.append("<li>【Your turn 3 秒】旁白：<b>Your turn!</b>　畫面：<b>She ____ in her free time.</b>（動詞加 s／es）倒數 3-2-1</li>")
    h.append(f"<li>【Ken 答＋3D】Ken：<b>{hl(ans)}</b>　｜　{e(shot)}</li>")
    h.append(f"<li>【2D】旁白：<b>{e(link)}</b><br>{linkzh}</li></ul>")
h.append("<h2>結尾</h2><ol>")
for who, t, zh, m in END: h.append(f"<li>【{m}】{who}：<b>{e(t)}</b><br>{zh}</li>")
h.append("</ol><p>片尾：片名＋大問號。</p></body></html>")
pathlib.Path(__file__).with_name("story-v1.html").write_text("\n".join(h), encoding="utf-8")
print(f"est {total:.0f}s = {int(total // 60)}:{int(total % 60):02d}")
