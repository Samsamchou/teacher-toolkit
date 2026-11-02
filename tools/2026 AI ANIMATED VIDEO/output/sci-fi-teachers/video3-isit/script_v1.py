"""script_v1.py — 影片 3（Is it ___ today?）腳本資料（HWG5 U02 P.13；規格卡 rdq/RDQ-spec-video3-is-it-today-20261102.md，2026-11-02 confirmed）。
從影片 2 的 script_v1.py 改寫。每一筆：(段落, 角色, 種類, 內容, 畫面)；角色 nova／cosmo／both／-；種類 say、zh、turn（秒數）。
畫面標記：card:=字卡、cal:=月曆翻到哪天、img:=插圖編號、quiz:=猜星期題目、talk:=對話；
新增：swap（It is → Is it 對調動畫）、merge（is not → isn't 合併動畫）、yes（綠色＋✔）、no（紅色＋✘）、rise（句尾 ↗ 上揚）。
"""
CHUNK_TURN, SENT_TURN = 2.0, 3.0

def repeat(sec, who, text, turn, vis):
    """Repeat after me → 學生跟唸，兩輪。"""
    return [(sec, who, 'say', f'Repeat after me. {text}', vis + '；第 1 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！'),
            (sec, who, 'say', text, vis + '；第 2 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]

def answer(day, asked):
    """回答 Is it <asked> today?：對了 Yes, it is.；不對 No, it isn't. It's <day>."""
    return ('Yes, it is.', 'yes') if day == asked else (f"No, it isn't. It's {day}.", 'no')

S = []
# 1 開場＋回顧影片 2（建議③）
S += [('01-open', 'nova', 'say', "Hi, class! I'm Ms. Nova.", 'Nova 揮手 P02，名牌在臉旁'),
      ('01-open', 'cosmo', 'say', "And I'm Mr. Cosmo! Welcome back to our space classroom!", 'Cosmo 揮手 P02，名牌在臉旁'),
      ('01-open', 'nova', 'say', 'Last time, we learned a question. What day is today?', 'card:What day is today?'),
      ('01-open', 'cosmo', 'say', "Let me check! It's Friday!", "cal:Friday；card:It's Friday."),
      ('01-open', 'nova', 'zh', 'What day is today? 是問「今天星期幾」，要回答星期幾。', 'card:What day is today?；下方出現「問：星期幾？」'),
      ('01-open', 'cosmo', 'say', 'Today, we will learn a new question. Is it Friday today?', 'card:Is it Friday today?；rise'),
      ('01-open', 'cosmo', 'zh', 'Is it Friday today? 是問「今天是星期五嗎？」，只要回答「是」或「不是」。', 'card:Is it Friday today?；下方出現「問：是不是？」；兩張字卡並排')]
# 2 句型變形：It is Monday today. → Is it Monday today?（建議①⑤）
ST, QU = 'card:It is Monday today.', 'card:Is it Monday today?'
S += [('02-swap', 'nova', 'say', 'Look at this sentence. It is Monday today.', f'cal:Monday；{ST}'),
      ('02-swap', 'nova', 'zh', '這是一句「直述句」：今天是星期一。最後是句點。', f'{ST}；句點發光'),
      ('02-swap', 'cosmo', 'say', 'Now watch. It and is change places!', f'{ST}；swap'),
      ('02-swap', 'cosmo', 'zh', '把 It 和 is 的位置對調，is 跑到最前面，句點變成問號，就變成問句了。', f'{QU}；swap 完成；問號發光'),
      ('02-swap', 'nova', 'say', 'Is it Monday today?', f'{QU}；rise'),
      ('02-swap', 'nova', 'zh', 'Is 開頭第一個字母要大寫。Is it Monday today? 就是「今天是星期一嗎？」', f'{QU}；I 放大發光；下方出現「今天是星期一嗎？」'),
      ('02-swap', 'cosmo', 'say', 'Listen. The end of the question goes up. Today?', f'{QU}；rise；箭頭動畫'),
      ('02-swap', 'cosmo', 'zh', '這種問「是不是」的問句，句尾語調要往上揚。', f'{QU}；rise')]
S += repeat('02-swap', 'nova', 'Is it Monday?', CHUNK_TURN, f'{QU}；Is it Monday 放大')
S += repeat('02-swap', 'cosmo', 'Is it Monday today?', SENT_TURN, f'{QU}；rise；整句放大')
# 3 回答 Yes, it is.（建議④）
S += [('03-yes', 'nova', 'say', 'Mr. Cosmo, is it Monday today?', 'cal:Monday；card:Is it Monday today?；rise'),
      ('03-yes', 'cosmo', 'say', 'Let me check! Yes, it is!', 'cal:Monday；card:Yes, it is.；yes'),
      ('03-yes', 'cosmo', 'zh', '月曆上是星期一，答對了，就說 Yes, it is.「是的，沒錯。」', 'card:Yes, it is.；yes；下方出現「是的，沒錯。」'),
      ('03-yes', 'nova', 'zh', '注意：回答時用 it is，不能縮寫成 it\'s。', 'card:Yes, it is.；yes；it is 發光')]
S += repeat('03-yes', 'cosmo', 'Yes, it is.', SENT_TURN, 'card:Yes, it is.；yes')
# 4 回答 No, it isn't. It's Tuesday.（建議②④）
S += [('04-no', 'cosmo', 'say', 'My turn. Ms. Nova, is it Monday today?', 'cal:Tuesday；card:Is it Monday today?；rise'),
      ('04-no', 'nova', 'say', "Hmm... No, it isn't. It's Tuesday.", "cal:Tuesday；card:No, it isn't. It's Tuesday.；no"),
      ('04-no', 'nova', 'zh', '月曆上是星期二，不是星期一，所以說 No, it isn\'t.「不，不是。」再告訴對方正確的答案：It\'s Tuesday.', "card:No, it isn't. It's Tuesday.；no；下方出現「不，不是。是星期二。」"),
      ('04-no', 'cosmo', 'say', "Look at isn't. Is not... becomes isn't!", "card:is not = isn't；merge"),
      ('04-no', 'cosmo', 'zh', "is not 合在一起，not 的 o 拿掉，換成一個小撇號，就變成 isn't。", "card:is not = isn't；merge 完成；撇號發光")]
S += repeat('04-no', 'cosmo', "Is not. Isn't.", CHUNK_TURN, "card:is not = isn't")
S += repeat('04-no', 'nova', "No, it isn't.", CHUNK_TURN, "card:No, it isn't.；no")
S += repeat('04-no', 'nova', "No, it isn't. It's Tuesday.", SENT_TURN, "card:No, it isn't. It's Tuesday.；no")
# 5 老師示範
S += [('05-demo', 'nova', 'say', "Let's practice together. Is it Thursday today?", 'cal:Thursday；card:Is it Thursday today?；rise；Nova 發問泡泡'),
      ('05-demo', 'cosmo', 'say', 'Yes, it is!', 'cal:Thursday；card:Yes, it is.；yes；Cosmo 回答泡泡'),
      ('05-demo', 'cosmo', 'say', 'Is it Sunday today?', 'cal:Saturday；card:Is it Sunday today?；rise；Cosmo 發問泡泡'),
      ('05-demo', 'nova', 'say', "No, it isn't. It's Saturday!", "cal:Saturday；card:No, it isn't. It's Saturday.；no；Nova 回答泡泡"),
      ('05-demo', 'cosmo', 'say', "Awesome! Now let's go to five places in our day.", '轉場')]
# 6 五種生活語境：(真正的星期, 問的星期, 語境句, 中文, 插圖)
CTX = [('Sunday', 'Sunday', 'I can read at home.', '我可以在家看書。', 'ctx2-sun-read'),
       ('Monday', 'Saturday', 'Time for school.', '上學時間到了。', 'ctx2-mon-school'),
       ('Wednesday', 'Wednesday', 'I have art class on Wednesday.', '我星期三有美術課。', 'v1-ctx-mon'),
       ('Thursday', 'Tuesday', 'I have music class.', '我有音樂課。', 'v1-ctx-wed'),
       ('Saturday', 'Saturday', "Let's play outside.", '我們去外面玩吧。', 'v1-ctx-sun')]
S += [('06-ctx', 'nova', 'zh', '接下來換你問、換你答！先看月曆，再決定說 Yes 還是 No。', '情境標題')]
for day, asked, sent, zh, img in CTX:
    sec = '06-ctx'; v = f'img:{img}；cal:{day}'; q = f'Is it {asked} today?'; a, yn = answer(day, asked)
    S += [(sec, 'nova', 'say', q, f'{v}；card:{q}；rise'),
          (sec, 'cosmo', 'say', f'{a} {sent}', f'{v}；card:{a} {sent}；{yn}'),
          (sec, 'cosmo', 'zh', f'{sent} 就是「{zh}」', f'{v}；card:{sent}；中文 {zh}'),
          (sec, 'nova', 'say', 'Your turn. Ask the question.', f'{v}；card:{q}；rise'), (sec, '-', 'turn', SENT_TURN, f'{v}；card:{q}；rise'),
          (sec, 'cosmo', 'say', f'Now answer. {a}', f'{v}；card:{a}；{yn}'), (sec, '-', 'turn', SENT_TURN, f'{v}；card:{a}；{yn}'),
          (sec, 'cosmo', 'say', 'One more time!', f'{v}；card:{a}；{yn}'), (sec, '-', 'turn', SENT_TURN, f'{v}；card:{a}；{yn}'),
          (sec, 'nova', 'say', f'{sent} Repeat after me. {sent}', f'{v}；card:{sent}'), (sec, '-', 'turn', SENT_TURN, f'{v}；card:{sent}')]
# 7 三部 Amy／Ben 對話（規格卡附錄，老師 2026-11-02 通過）：先無字幕、再有字幕；畫面不出現星期提示；
# 接著老師問 Is it ___ today? → 3 秒 → 揭曉答句（Yes 綠✔／No 紅✘）→ Repeat after me 一次。
# (編號, 場景, 真正的星期, 台詞, 發問老師, 老師問的星期)
TALKS = [
 (1, 'classroom', 'Monday', [('ben', 'Good morning, Amy! Is it Sunday today?'), ('amy', "No, it isn't. It's Monday."),
     ('ben', "Oh, no! I'm so sleepy."), ('amy', 'Look! We have P.E. class today.'), ('ben', "P.E. class? Yay! Let's go!")], 'nova', 'Monday'),
 (2, 'court', 'Friday', [('amy', 'Ben, is it Friday today?'), ('ben', 'Yes, it is!'),
     ('amy', "Great! Let's play basketball after school."), ('ben', 'Sure! I love Fridays!')], 'cosmo', 'Thursday'),
 (3, 'hallway', 'Tuesday', [('ben', 'Amy, is it Wednesday today? I have my crayons.'), ('amy', "No, it isn't. It's Tuesday."),
     ('ben', 'Tuesday? Oh, no! No art class today.'), ('amy', "That's OK. We have music class today. Let's sing!"), ('ben', 'Ha ha! OK!')], 'nova', 'Wednesday'),
]
S += [('07-talk', 'cosmo', 'say', "Now let's watch Amy and Ben. Listen carefully!", '對話段標題；老師退到兩側'),
      ('07-talk', 'nova', 'zh', '仔細聽，今天到底是星期幾？', '對話段標題')]
for no, scene, day, lines, asker, asked in TALKS:
    other = 'cosmo' if asker == 'nova' else 'nova'; q = f'Is it {asked} today?'; a, yn = answer(day, asked)
    for ps in (1, 2):
        if ps == 2: S += [('07-talk', asker, 'say', 'Listen again.', f'talk:{no}；scene:{scene}；pass:2')]
        S += [('07-talk', who, 'say', text, f'talk:{no}；scene:{scene}；pass:{ps}') for who, text in lines]
    S += [('07-talk', asker, 'say', q, f'talk:{no}；card:{q}；rise'), ('07-talk', '-', 'turn', SENT_TURN, f'talk:{no}；card:{q}；rise；倒數條'),
          ('07-talk', other, 'say', a, f'talk:{no}；揭曉；card:{a}；{yn}'),
          ('07-talk', asker, 'say', f'Repeat after me. {a}', f'talk:{no}；card:{a}；{yn}'),
          ('07-talk', '-', 'turn', SENT_TURN, f'talk:{no}；card:{a}；{yn}')]
S += [('07-talk', 'cosmo', 'say', 'Wonderful, everyone!', 'Cosmo 比讚 P07')]
# 8 看月曆猜猜看（3 題）：(月曆上的星期, 問的星期)
QUIZ = [('Game time! Look at the calendar.', 'Sunday', 'Sunday'), ('Next one.', 'Thursday', 'Friday'), ('Last one.', 'Wednesday', 'Wednesday')]
for k, (lead, day, asked) in enumerate(QUIZ):
    q = f'Is it {asked} today?'; a, yn = answer(day, asked)
    S += [('08-quiz', 'cosmo', 'say', f'{lead} {q}', f'quiz:{day}；card:{q}；rise'), ('08-quiz', '-', 'turn', SENT_TURN, f'quiz:{day}；倒數條'),
          ('08-quiz', 'nova', 'say', a + (' Great job, class!' if k == len(QUIZ) - 1 else ''), f'quiz:{day}；揭曉；card:{a}；{yn}')]
# 9 複習與再見
S += [('09-end', 'nova', 'say', 'Today we learned a new question. Is it Monday today?', 'card:Is it Monday today?；rise'),
      ('09-end', 'cosmo', 'say', "And two answers. Yes, it is. No, it isn't.", "card:Yes, it is. / No, it isn't.；yes；no"),
      ('09-end', 'nova', 'zh', "要問「今天是不是星期幾」，就說 Is it 加星期幾 today?；是的話說 Yes, it is.，不是的話說 No, it isn't.，再說出正確的星期。", '三張字卡排在一起'),
      ('09-end', 'cosmo', 'say', 'See you next time!', 'Cosmo 比讚 P07'),
      ('09-end', 'nova', 'say', 'Bye-bye, class!', '兩位老師揮手 P02')]
SCRIPT = S
