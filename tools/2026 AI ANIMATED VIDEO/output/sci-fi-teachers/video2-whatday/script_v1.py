"""script_v1.py — 影片 2（What day is today?）腳本資料，對應 Google 文件「科幻雙老師英語動畫｜影片2 What day is today?｜腳本初稿 v1」
（2026-10-20 老師通過：所有 Say it with me 改成 Repeat after me；待確認事項照建議）。
每一筆：(段落, 角色, 種類, 內容, 畫面)；角色 nova／cosmo／both／-；種類 say、zh、turn（秒數）。
畫面標記：card:=字卡、cal:=月曆翻到哪天、img:=插圖編號（v1-xxx＝沿用影片 1）、quiz:=猜星期題目。
"""
CHUNK_TURN, SENT_TURN = 2.0, 3.0

def repeat(sec, who, text, turn, vis):
    """Repeat after me → 學生跟唸，兩輪。"""
    return [(sec, who, 'say', f'Repeat after me. {text}', vis + '；第 1 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！'),
            (sec, who, 'say', text, vis + '；第 2 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]

S = []
# 1 開場
S += [('01-open', 'nova', 'say', "Hi, class! I'm Ms. Nova.", 'Nova 揮手 P02，名牌在臉旁'),
      ('01-open', 'cosmo', 'say', "And I'm Mr. Cosmo! Welcome back to our space classroom!", 'Cosmo 揮手 P02，名牌在臉旁'),
      ('01-open', 'nova', 'say', 'Do you remember the seven days of the week?', '七張星期卡排成一列'),
      ('01-open', 'both', 'say', 'Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday!', '每張卡依序亮起'),
      ('01-open', 'cosmo', 'say', 'Great! Today, we will learn how to ask about the day, and how to answer.', '標題 What day is today?'),
      ('01-open', 'nova', 'zh', '今天我們要學怎麼問「今天星期幾」，還有怎麼回答。', '中文字幕')]
# 2 問句 What day is today?
Q1 = 'card:What day is today?'
S += [('02-q1', 'cosmo', 'say', 'Here is our question. What day is today?', Q1),
      ('02-q1', 'nova', 'say', 'Look at "What day". What day means...', Q1 + '；What day 發光'),
      ('02-q1', 'nova', 'zh', 'What day 就是「星期幾」。', Q1 + '；What day 下方出現「星期幾」'),
      ('02-q1', 'cosmo', 'say', 'And look at "today". Today is this day, right now!', Q1 + '；today 發光；img:today-noon'),
      ('02-q1', 'cosmo', 'zh', 'today 就是「今天」。', Q1 + '；today 下方出現「今天」；img:today-noon'),
      ('02-q1', 'nova', 'zh', '合起來，What day is today? 就是「今天星期幾？」', Q1 + '；整句下方出現「今天星期幾？」'),
      ('02-q1', 'nova', 'say', "Let's read it. What day.", Q1 + '；What day 放大')]
S += repeat('02-q1', 'nova', 'What day.', CHUNK_TURN, Q1 + '；What day 放大')
S += repeat('02-q1', 'cosmo', 'Is today.', CHUNK_TURN, Q1 + '；is today 放大')
S += [('02-q1', 'nova', 'say', 'Now the whole question. What day is today?', Q1 + '；整句放大')]
S += repeat('02-q1', 'nova', 'What day is today?', SENT_TURN, Q1 + '；整句放大')
S += [('02-q1', 'cosmo', 'say', 'Great! Remember, the question ends with a question mark.', Q1 + '；問號放大閃一下')]
# 3 答句 It's Friday.
S += [('03-ans', 'nova', 'say', 'Mr. Cosmo, what day is today?', Q1 + '；Nova 看向 Cosmo'),
      ('03-ans', 'cosmo', 'say', "Let me check! It's Friday!", "cal:Friday；card:It's Friday."),
      ('03-ans', 'nova', 'say', "Look at \"It's\". It's is a short way to say \"It is\".", "card:It's Friday.；It's 拆成 It is"),
      ('03-ans', 'nova', 'zh', "It's 就是 It is 的縮寫。把 is 的 i 拿掉，換成一個小撇號，就變成 It's。", "card:It's Friday.；i 飛走、撇號飛進來"),
      ('03-ans', 'cosmo', 'zh', "所以 It's Friday 和 It is Friday 意思一樣，都是「今天是星期五」。", "card:It's Friday.；兩句並排＋等號")]
S += repeat('03-ans', 'cosmo', 'It is Friday.', SENT_TURN, 'card:It is Friday.')
S += repeat('03-ans', 'nova', "It's Friday.", SENT_TURN, "card:It's Friday.")
S += [('03-ans', 'nova', 'zh', '回答時，星期幾的第一個字母要大寫，最後別忘了句點。', "card:It's Friday.；F 放大發光、句點閃一下")]
# 4 問句 What day is it?
Q2 = 'card:What day is it?'
S += [('04-q2', 'cosmo', 'say', 'We can ask in another way. What day is it?', Q2 + '；What day is today? 在上方'),
      ('04-q2', 'nova', 'say', 'The two questions mean the same thing.', Q2 + '；兩句中間等號'),
      ('04-q2', 'nova', 'zh', 'What day is it? 也是問「今天星期幾？」這裡的 it 指的是「今天這一天」，不用翻成「它」。', Q2 + '；it 發光＋「今天這一天」')]
S += repeat('04-q2', 'cosmo', 'What day is it?', SENT_TURN, Q2)
S += [('04-q2', 'nova', 'say', "And the answer is the same. It's Friday!", Q2 + "；答句 It's Friday. 接在下方")]
# 5 老師示範對話
S += [('05-demo', 'nova', 'say', "Let's practice together. What day is it?", 'cal:Monday；Nova 發問泡泡'),
      ('05-demo', 'cosmo', 'say', "It's Monday!", 'cal:Monday；Cosmo 回答泡泡'),
      ('05-demo', 'cosmo', 'say', 'My turn. What day is today?', 'cal:Tuesday；Cosmo 發問泡泡'),
      ('05-demo', 'nova', 'say', "It's Tuesday!", 'cal:Tuesday；Nova 回答泡泡'),
      ('05-demo', 'cosmo', 'say', "Awesome! Now let's go to five places in our day.", '轉場')]
# 6 五種生活語境
CTX = [('Sunday', 'What day is today?', 'I can read at home.', '我可以在家看書。', 'ctx2-sun-read'),
       ('Monday', 'What day is it?', 'Time for school.', '上學時間到了。', 'ctx2-mon-school'),
       ('Wednesday', 'What day is today?', 'I have art on Wednesday.', '我星期三有美術課。', 'v1-ctx-mon'),
       ('Thursday', 'What day is it?', 'I have music class.', '我有音樂課。', 'v1-ctx-wed'),
       ('Saturday', 'What day is today?', "Let's play outside.", '我們去外面玩吧。', 'v1-ctx-sun')]
S += [('06-ctx', 'nova', 'zh', '接下來換你問、換你答！', '情境標題')]
for day, q, sent, zh, img in CTX:
    sec = '06-ctx'; v = f'img:{img}；cal:{day}'
    # 2026-10-20 老師選 A：問句、答句各練兩輪，並加語境句的中文意思
    S += [(sec, 'nova', 'say', q, f'{v}；card:{q}'),
          (sec, 'cosmo', 'say', f"It's {day}. {sent}", f"{v}；card:It's {day}. {sent}"),
          (sec, 'cosmo', 'zh', f'{sent} 就是「{zh}」', f'{v}；card:{sent}；中文 {zh}'),
          (sec, 'nova', 'say', 'Your turn. Ask the question.', f'{v}；card:{q}'), (sec, '-', 'turn', SENT_TURN, f'{v}；card:{q}'),
          (sec, 'nova', 'say', 'One more time!', f'{v}；card:{q}'), (sec, '-', 'turn', SENT_TURN, f'{v}；card:{q}'),
          (sec, 'cosmo', 'say', f"Now answer. It's {day}.", f"{v}；card:It's {day}."), (sec, '-', 'turn', SENT_TURN, f"{v}；card:It's {day}."),
          (sec, 'cosmo', 'say', 'One more time!', f"{v}；card:It's {day}."), (sec, '-', 'turn', SENT_TURN, f"{v}；card:It's {day}."),
          (sec, 'nova', 'say', f'{sent} Repeat after me. {sent}', f'{v}；card:{sent}'), (sec, '-', 'turn', SENT_TURN, f'{v}；card:{sent}')]
# 7 分組問答（2026-10-20 老師選 B）：A 組問、B 組答，月曆翻五天，再交換
GROUP = [('A', 'B', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']), ('B', 'A', ['Saturday', 'Sunday', 'Wednesday', 'Friday', 'Tuesday'])]
S += [('07-group', 'cosmo', 'say', "Now let's play in groups. Group A, ask the question. Group B, answer.", 'group:A→B'),
      ('07-group', 'nova', 'zh', 'A 組問問題，B 組回答。看月曆回答喔！', 'group:A→B')]
for r, (ask, ans, days) in enumerate(GROUP):
    if r == 1:
        S += [('07-group', 'nova', 'say', 'Now switch! Group B, ask. Group A, answer.', 'group:B→A'),
              ('07-group', 'cosmo', 'zh', '換過來！B 組問，A 組答。', 'group:B→A')]
    for k, day in enumerate(days):
        q = 'What day is today?' if k % 2 == 0 else 'What day is it?'
        S += [('07-group', 'cosmo' if ask == 'A' else 'nova', 'say', f'Group {ask}!', f'group:{ask}→{ans}；cal:{day}；card:{q}'),
              ('07-group', '-', 'turn', SENT_TURN, f'group:{ask}→{ans}；cal:{day}；card:{q}'),
              ('07-group', 'nova' if ask == 'A' else 'cosmo', 'say', f'Group {ans}!', f"group:{ask}→{ans}；cal:{day}；card:It's {day}."),
              ('07-group', '-', 'turn', SENT_TURN, f"group:{ask}→{ans}；cal:{day}；card:It's {day}.")]
S += [('07-group', 'cosmo', 'say', 'Wonderful, everyone!', 'Cosmo 比讚 P07')]
# 8 看月曆猜星期（2026-10-20 老師選 C：3 題加到 5 題）
QUIZ = [('Game time! Look at the calendar.', 'What day is it?', 'Tuesday'),
        ('Next one.', 'What day is it?', 'Friday'), ('Next one.', 'What day is today?', 'Sunday'),
        ('Next one.', 'What day is it?', 'Wednesday'), ('Last one.', 'What day is today?', 'Thursday')]
for k, (lead, q, day) in enumerate(QUIZ):
    S += [('08-quiz', 'cosmo', 'say', f'{lead} {q}', f'quiz:{day}；card:{q}'), ('08-quiz', '-', 'turn', SENT_TURN, f'quiz:{day}；倒數條'),
          ('08-quiz', 'nova', 'say', f"It's {day}!" + (' Great job, class!' if k == len(QUIZ) - 1 else ''), f"quiz:{day}；揭曉；card:It's {day}.")]
# 9 複習與再見
S += [('09-end', 'nova', 'say', 'Today we learned two questions. What day is today? What day is it?', 'card:What day is today? / What day is it?'),
      ('09-end', 'cosmo', 'say', "And one answer. It's Friday.", "card:It's Friday."),
      ('09-end', 'nova', 'zh', "問「今天星期幾」可以說 What day is today? 或 What day is it?；回答用 It's 加上星期幾。", '三張字卡排在一起'),
      ('09-end', 'cosmo', 'say', 'See you next time!', 'Cosmo 比讚 P07'),
      ('09-end', 'nova', 'say', 'Bye-bye, class!', '兩位老師揮手 P02')]
SCRIPT = S
