"""script_v1.py — 影片 1（星期單字）腳本資料，對應 Google 文件「腳本初稿 v1」（2026-10-20 老師通過，待確認事項全部照建議）。
每一筆：(段落, 角色, 種類, 內容, 畫面)
  角色：nova / cosmo / both（兩人齊唸）
  種類：say（英文 TTS）、zh（中文 TTS）、sound（發音按鈕播真人音檔，內容＝processed/ 檔名）、turn（學生跟唸留白，內容＝秒數）
決定：Cosmo 英文 en-US-GuyNeural（AndrewNeural 經 whisper 檢查把 Say it 唸成 See you，改用 Guy）、中文 zh-TW-YunJheNeural；ay 只在第 2 段帶唸兩輪；情境句留 3 秒；ue 原用 En-us-blue，2026-10-20 老師改用 long u 試聽帶 No.2 字母名 U（En-us-u）。
"""
SOUND_TURN, WORD_TURN, SENT_TURN, REVIEW_TURN = 2.0, 2.0, 3.0, 8.0

def drill(sec, who, clip, vis):
    """重點音：示範一次 → Say it with me → 兩輪（播音＋2 秒）。"""
    return [(sec, who, 'sound', clip, vis + '；示範'),
            (sec, who, 'say', 'Say it with me.', vis),
            (sec, who, 'sound', clip, vis + '；第 1 輪'), (sec, '-', 'turn', SOUND_TURN, 'Your turn! 換你唸！'),
            (sec, who, 'sound', clip, vis + '；第 2 輪'), (sec, '-', 'turn', SOUND_TURN, 'Your turn! 換你唸！')]

def blend(sec, who, parts, word):
    """整字：拆開再合起 → Say it with me → 兩輪（2 秒）。"""
    return [(sec, who, 'say', f'{parts} {word}!', f'{word} 分開再合起'),
            (sec, who, 'say', f'Say it with me. {word}!', f'{word} 整字第 1 輪'), (sec, '-', 'turn', WORD_TURN, 'Your turn! 換你唸！'),
            (sec, who, 'say', f'{word}!', f'{word} 整字第 2 輪'), (sec, '-', 'turn', WORD_TURN, 'Your turn! 換你唸！')]

S = []
# 1 開場
S += [('01-open', 'nova', 'say', "Hi, class! I'm Ms. Nova.", 'Nova 揮手 P02，名牌在臉旁'),
      ('01-open', 'cosmo', 'say', "And I'm Mr. Cosmo! Welcome to our space classroom!", 'Cosmo 揮手 P02，名牌在臉旁'),
      ('01-open', 'nova', 'say', 'Today, we will learn the seven days of the week.', 'Days of the Week 標題，七張星期卡依序亮起'),
      ('01-open', 'cosmo', 'say', "Let's read them, sound by sound!", 'Cosmo 指向螢幕 P03'),
      ('01-open', 'nova', 'zh', '今天我們要用自然發音，一個音一個音，學會一星期七天的英文。', '中文字幕')]
# 2 共同結尾 -day
S += [('02-day', 'cosmo', 'say', 'Look! All seven words end with D, A, Y. Day!', '七張卡的 day 一起亮橘色'),
      ('02-day', 'nova', 'say', 'A and Y make this sound. Listen.', 'ay 底線＋發音按鈕')]
S += drill('02-day', 'nova', 'En-us-A_upper', 'ay 發音按鈕')
S += [('02-day', 'cosmo', 'say', 'Great job! Day!', 'Cosmo 比讚 P07')]
# 3 Sunday
S += [('03-sun', 'nova', 'say', 'Our first day is Sunday!', '星期卡 Sunday'),
      ('03-sun', 'nova', 'say', 'Look at the letter U. Listen.', 'u 橘色＋底線')]
S += drill('03-sun', 'nova', 'short-u-1', 'u 發音按鈕')
S += [('03-sun', 'cosmo', 'say', 'And A and Y say...', 'ay 亮一下'),
      ('03-sun', 'cosmo', 'sound', 'En-us-A_upper', 'ay 發音按鈕（提醒一次）'),
      ('03-sun', 'cosmo', 'say', 'Day!', 'day')]
S += blend('03-sun', 'cosmo', 'Sun, day.', 'Sunday')
S += [('03-sun', 'nova', 'zh', 'Sunday 是星期日。', '卡上出現「星期日」')]
# 4 Monday
S += [('04-mon', 'cosmo', 'say', 'Next is Monday!', '星期卡 Monday'),
      ('04-mon', 'cosmo', 'say', 'Look at the letter O. In Monday, O makes the same sound as U in Sunday. Listen.', 'o 橘色＋底線')]
S += drill('04-mon', 'cosmo', 'short-u-1', 'o 發音按鈕')
S += blend('04-mon', 'nova', 'Mon, day.', 'Monday')
S += [('04-mon', 'cosmo', 'zh', 'Monday 是星期一。', '卡上出現「星期一」')]
# 5 Tuesday
S += [('05-tue', 'nova', 'say', 'Here comes Tuesday!', '星期卡 Tuesday'),
      ('05-tue', 'nova', 'say', 'Look at U and E. Together, they make this sound. Listen.', 'ue 橘色＋底線')]
S += drill('05-tue', 'nova', 'En-us-u', 'ue 發音按鈕')
S += blend('05-tue', 'cosmo', 'Tues, day.', 'Tuesday')
S += [('05-tue', 'nova', 'zh', 'Tuesday 是星期二。', '卡上出現「星期二」')]
# 6 Wednesday
S += [('06-wed', 'cosmo', 'say', 'Now, Wednesday! This one is tricky.', '星期卡 Wednesday，Cosmo 思考 P06'),
      ('06-wed', 'cosmo', 'say', 'Look at the letter E. Listen.', '第一個 e 橘色＋底線')]
S += drill('06-wed', 'cosmo', 'short-e-1', 'e 發音按鈕')
S += [('06-wed', 'nova', 'say', "Look! The first letter D is quiet. We don't say it.", '第一個 d 變灰＋紅色 ✗'),
      ('06-wed', 'nova', 'zh', '小提醒：Wednesday 的第一個 d 不發音。', '中文字幕')]
S += blend('06-wed', 'cosmo', 'Wednes, day.', 'Wednesday')
S += [('06-wed', 'cosmo', 'zh', 'Wednesday 是星期三。', '卡上出現「星期三」')]
# 7 Thursday
S += [('07-thu', 'nova', 'say', 'Next is Thursday!', '星期卡 Thursday'),
      ('07-thu', 'nova', 'say', 'T and H make this sound. Listen.', 'th 橘色＋底線')]
S += drill('07-thu', 'nova', 'dg-th-voiceless', 'th 發音按鈕')
S += [('07-thu', 'cosmo', 'say', 'And U and R make this sound. Listen.', 'ur 橘色＋底線')]
S += drill('07-thu', 'cosmo', 'En-us-er', 'ur 發音按鈕')
S += blend('07-thu', 'nova', 'Thurs, day.', 'Thursday')
S += [('07-thu', 'nova', 'zh', 'Thursday 是星期四。', '卡上出現「星期四」')]
# 8 Friday
S += [('08-fri', 'cosmo', 'say', "Yay, it's Friday!", '星期卡 Friday，Cosmo 驚喜 P10'),
      ('08-fri', 'cosmo', 'say', 'Look at the letter I. In Friday, I says its name. Listen.', 'i 橘色＋底線')]
S += drill('08-fri', 'cosmo', 'En-us-I', 'i 發音按鈕')
S += blend('08-fri', 'nova', 'Fri, day.', 'Friday')
S += [('08-fri', 'cosmo', 'zh', 'Friday 是星期五。', '卡上出現「星期五」')]
# 9 Saturday
S += [('09-sat', 'nova', 'say', 'The last day is Saturday!', '星期卡 Saturday'),
      ('09-sat', 'nova', 'say', 'Look at the first letter A. Listen.', '第一個 a 橘色＋底線')]
S += drill('09-sat', 'nova', 'short-a-1', 'a 發音按鈕')
# 2026-10-20 老師：Saturday 的 ur 唸 /ɚ/，和 teacher 的 -er 相同，不是 Thursday 的 ur；音檔用老師錄的 references/er.mp3（processed/ref-er-1.wav）
S += [('09-sat', 'cosmo', 'say', 'And here, U and R sound like the end of teacher. Listen.', 'ur 橘色＋底線'),
      ('09-sat', 'cosmo', 'sound', 'ref-er-1', 'ur 發音按鈕（提醒一次）')]
S += blend('09-sat', 'cosmo', 'Sat, ur, day.', 'Saturday')
S += [('09-sat', 'nova', 'zh', 'Saturday 是星期六。', '卡上出現「星期六」')]
# 10 七種生活語境
CTX = [('nova', 'Today is Sunday. Let\'s play outside.', 'ctx-sun'),
       ('cosmo', "It's Monday. I have art class on Monday.", 'ctx-mon'),
       ('nova', "It's Tuesday. I have PE class on Tuesday.", 'ctx-tue'),
       ('cosmo', "It's Wednesday. I have music class on Wednesday.", 'ctx-wed'),
       ('nova', "Today is Thursday. Let's read a story.", 'ctx-thu'),
       ('cosmo', "It's Friday. Let's go to the park after school.", 'ctx-fri'),
       ('nova', "Today is Saturday. Let's play basketball.", 'ctx-sat')]
S += [('10-ctx', 'cosmo', 'say', "Now let's use the days in sentences!", '情境標題')]
for who, sent, img in CTX:
    S += [('10-ctx', who, 'say', sent, f'情境插圖 {img}；句子字卡'),
          ('10-ctx', who, 'say', f'Say it with me. {sent}', f'情境插圖 {img}；句子字卡'),
          ('10-ctx', '-', 'turn', SENT_TURN, 'Your turn! 換你唸！')]
# 11 大寫規則
S += [('11-cap', 'cosmo', 'say', 'Days of the week are special names. They always start with a capital letter.', '七個字的第一個字母放大發光'),
      ('11-cap', 'nova', 'zh', '星期的英文是專有名詞，第一個字母一定要大寫。', '中文字幕'),
      ('11-cap', 'cosmo', 'say', 'Is this right? Small s, sunday?', '螢幕寫 sunday，Cosmo 思考 P06'),
      ('11-cap', 'nova', 'say', 'No! We need a capital S. Sunday!', 's 變大寫 S＋打勾，Nova 空中寫字 P09')]
# 12 縮寫
S += [('12-abbr', 'nova', 'say', 'We can write the days in a short way. Take the first three letters, and add a dot.', 'Sunday 收成 Sun.'),
      ('12-abbr', 'nova', 'zh', '縮寫就是取前三個字母，再加上一個點。', '中文字幕'),
      ('12-abbr', 'cosmo', 'say', 'Sunday, S, U, N. Sun. Monday, M, O, N. Mon. Tuesday, T, U, E. Tue.', '縮成 Sun. Mon. Tue.'),
      ('12-abbr', 'nova', 'say', 'Wednesday, W, E, D. Wed. Thursday, T, H, U. Thu.', '縮成 Wed. Thu.'),
      ('12-abbr', 'cosmo', 'say', 'Friday, F, R, I. Fri. Saturday, S, A, T. Sat.', '縮成 Fri. Sat.'),
      ('12-abbr', 'nova', 'zh', '別忘了，縮寫的第一個字母也要大寫，最後要加點喔！', '七個縮寫排成一列')]
# 13 複習與再見
S += [('13-end', 'cosmo', 'say', "Let's say all seven days together!", '七張星期卡排成一圈'),
      ('13-end', 'both', 'say', 'Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday!', '每張卡依序亮起'),
      ('13-end', 'nova', 'say', 'Your turn! Say all seven days.', 'Your turn! 換你唸！'),
      ('13-end', '-', 'turn', REVIEW_TURN, '卡片依序亮起當提示'),
      ('13-end', 'cosmo', 'say', 'Awesome! See you next time!', 'Cosmo 比讚 P07'),
      ('13-end', 'nova', 'say', 'Bye-bye, class!', '兩位老師揮手 P02')]
SCRIPT = S
