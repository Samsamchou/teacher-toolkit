"""script_v1.py — 影片 4〈Families〉腳本資料（四年級 SF3 U01；規格卡 rdq/RDQ-spec-video4-families-20261103.md，2026-11-03 confirmed）。
每一筆：(段落, 角色, 種類, 內容, 畫面)；角色 nova／cosmo／both／emma／-；種類 say、zh、sound（老師錄音，processed/ 檔名）、turn（秒數）。
畫面標記（全形分號分隔）：
  word:X＝單字大卡（X 的家人圖＋單字）；hi:er／th／a／i／o＝單字裡標橘色的字母；mem:X＝全家福裡指出 X；family＝全家福；
  card:＝字卡；he／she＝He's 藍色＋男生圖示／She's 粉紅色＋女生圖示；short:Y＝短稱；quiz:X＝猜猜看指著 X；talk:1＝Emma 介紹家人。
發音只用老師錄音：-er＝ref-er-1、th（有聲）＝dg-th-voiced、短 a＝short-a-1、短 i＝short-i-1、mother／brother 的 o 唸 /ʌ/＝short-u-1。
"""
SOUND_TURN, WORD_TURN, SENT_TURN = 2.0, 2.0, 3.0

def drill(sec, who, clip, vis):
    """發音：示範一次 → Repeat after me → 兩輪（播音＋2 秒）。"""
    return [(sec, who, 'sound', clip, vis + '；示範'),
            (sec, who, 'say', 'Repeat after me.', vis),
            (sec, who, 'sound', clip, vis + '；第 1 輪'), (sec, '-', 'turn', SOUND_TURN, vis + '；Your turn! 換你唸！'),
            (sec, who, 'sound', clip, vis + '；第 2 輪'), (sec, '-', 'turn', SOUND_TURN, vis + '；Your turn! 換你唸！')]

def repeat(sec, who, text, turn, vis):
    """Repeat after me → 學生跟唸，兩輪。"""
    return [(sec, who, 'say', f'Repeat after me. {text}', vis + '；第 1 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！'),
            (sec, who, 'say', text, vis + '；第 2 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]

S = []
# 1 開場：Emma 一家拍全家福
S += [('01-open', 'nova', 'say', "Hi, class! I'm Ms. Nova.", 'Nova 揮手 P02，名牌在臉旁'),
      ('01-open', 'cosmo', 'say', "And I'm Mr. Cosmo! Welcome back to our space classroom!", 'Cosmo 揮手 P02，名牌在臉旁'),
      ('01-open', 'nova', 'say', "Look! This is Emma's family.", 'family；標題 Families'),
      ('01-open', 'cosmo', 'say', 'They are taking a family picture in the living room.', 'family；相機閃光'),
      ('01-open', 'nova', 'zh', '今天我們要學家人的英文，還有怎麼介紹家人。', 'family')]
# 2 共同結尾 -er
S += [('02-er', 'cosmo', 'say', 'Here are six family words.', '六張單字卡排兩排'),
      ('02-er', 'nova', 'say', 'Look! Every word ends with E, R.', '六張卡的 er 一起亮橘色；hi:er'),
      ('02-er', 'nova', 'say', 'E and R make this sound. Listen.', 'er 底線＋發音按鈕；hi:er')]
S += drill('02-er', 'nova', 'ref-er-1', 'er 發音按鈕；hi:er')
# 2026-11-03 v1.1 老師：音標被 TTS 唸成「斜線」→ 句中插老師錄音（字幕照舊顯示音標，TTS_FIX 把音標從念稿拿掉）
S += [('02-er', 'cosmo', 'zh', '字尾的 er，嘴巴微微張開、舌頭往後捲，唸 /ɚ/。', 'hi:er'),
      ('02-er', 'cosmo', 'sound', 'ref-er-1', 'hi:er；句中')]
# 3 th（有聲）
S += [('03-th', 'cosmo', 'say', 'Now look at T and H.', '五張有 th 的卡亮起；hi:th'),
      ('03-th', 'cosmo', 'say', 'Put your tongue between your teeth. Listen.', 'th 發音按鈕；舌頭放在牙齒中間的小圖；hi:th')]
S += drill('03-th', 'cosmo', 'dg-th-voiced', 'th 發音按鈕；hi:th')
S += [('03-th', 'nova', 'zh', 'th 要把舌頭輕輕放在上下牙齒中間，喉嚨會震動。father、mother、brother、grandfather、grandmother 都有這個音。', 'hi:th')]
# 4 短母音
S += [('04-vowel', 'nova', 'say', 'Now, short vowels! Look at the letter A in grand.', 'grand 的 a 橘色；hi:a')]
S += drill('04-vowel', 'nova', 'short-a-1', 'a 發音按鈕；hi:a')
S += [('04-vowel', 'cosmo', 'say', 'Look at the letter I in sister.', 'sister 的 i 橘色；hi:i')]
S += drill('04-vowel', 'cosmo', 'short-i-1', 'i 發音按鈕；hi:i')
S += [('04-vowel', 'nova', 'say', 'Look at the letter O in mother and brother. Here, O sounds like U. Listen.', 'mother、brother 的 o 橘色；o 上方出現 u；hi:o')]
S += drill('04-vowel', 'nova', 'short-u-1', 'o 發音按鈕；hi:o')
S += [('04-vowel', 'nova', 'zh', '小提醒：mother 和 brother 的 o，唸起來像短 u 的 /ʌ/，', 'hi:o'),
      ('04-vowel', 'nova', 'sound', 'short-u-1', 'hi:o；句中'),
      ('04-vowel', 'nova', 'zh', '不是短 o。', 'hi:o；句中'),
      ('04-vowel', 'cosmo', 'zh', '還有，father 的 a 唸 /ɑ/，', 'word:father；hi:a'),
      ('04-vowel', 'cosmo', 'sound', 'short-o-1', 'word:father；hi:a；句中'),
      ('04-vowel', 'cosmo', 'zh', '像短 o 的音，嘴巴張大，和 grand 的短 a 不一樣。', 'word:father；hi:a；句中')]   # KK 短 o＝/ɑ/
# 5 六個家人單字（每個：介紹 → 分開再合起 → 跟唸兩輪 → 短稱 → 中文）
WORDS = [('father', 'Fa... ther.', 'he', 'dad', '爸爸'), ('mother', 'Mo... ther.', 'she', 'mom', '媽媽'),
         ('grandfather', 'Grand... fa... ther.', 'he', 'grandpa', '爺爺／外公'), ('grandmother', 'Grand... mo... ther.', 'she', 'grandma', '奶奶／外婆'),
         ('brother', 'Bro... ther.', 'he', None, '哥哥／弟弟'), ('sister', 'Sis... ter.', 'she', None, '姊姊／妹妹')]
for k, (w, parts, hs, short, zh) in enumerate(WORDS):
    sec = f'05-{w}'; who, oth = ('nova', 'cosmo') if k % 2 == 0 else ('cosmo', 'nova'); v = f'word:{w}；mem:{w}'
    S += [(sec, who, 'say', f'Who is this? This is Emma\'s {w}.', v),
          (sec, who, 'say', f'{parts} {w.capitalize()}!', v + '；分開再合起；hi:th；hi:er')]
    S += repeat(sec, who, w.capitalize() + '.', WORD_TURN, v + '；整字')
    if short:
        S += [(sec, oth, 'say', f'We can also say {short}.', f'{v}；short:{short}')]
        S += [(sec, oth, 'say', f'Repeat after me. {short.capitalize()}.', f'{v}；short:{short}'), (sec, '-', 'turn', WORD_TURN, f'{v}；short:{short}；Your turn! 換你唸！')]
    S += [(sec, oth, 'zh', f'{w} 就是「' + zh.replace('／', '」或「') + '」。', f'{v}；「{zh}」')]   # 2026-11-04 老師：「／」會被唸成斜線，台詞改「或」
# 6 句型 He's my ___. / She's my ___.
S += [('06-sent', 'cosmo', 'say', "Now let's say a sentence. He's my father.", "mem:father；card:He's my father.；he"),
      ('06-sent', 'cosmo', 'zh', "He's 就是 He is，「他是」。男生用 He's：father、grandfather、brother。", "card:He's = He is；he；「他是」"),
      ('06-sent', 'nova', 'say', "She's my mother.", "mem:mother；card:She's my mother.；she"),
      ('06-sent', 'nova', 'zh', "She's 就是 She is，「她是」。女生用 She's：mother、grandmother、sister。", "card:She's = She is；she；「她是」")]
S += repeat('06-sent', 'cosmo', "He's my father.", SENT_TURN, "mem:father；card:He's my father.；he")
S += repeat('06-sent', 'nova', "She's my mother.", SENT_TURN, "mem:mother；card:She's my mother.；she")
# 7 Emma 介紹家人（華麗剪紙對話）：先看一次（有字幕）→ 老師帶每句 Repeat after me 一次
TALK = [('emma', "Hi! I'm Emma. This is my family."), ('emma', "He's my father. He's my dad."), ('emma', "She's my mother. She's my mom."),
        ('emma', "He's my grandfather. He's my grandpa."), ('emma', "She's my grandmother. She's my grandma."),
        ('emma', "She's my sister."), ('emma', "He's my brother."), ('emma', "And this is me. It's me!")]
TALKS = [(1, 'livingroom', None, TALK, 'nova', None)]
S += [('07-talk', 'cosmo', 'say', "Now let's listen to Emma!", '對話段標題；老師退到兩側'),
      ('07-talk', 'nova', 'zh', '聽 Emma 介紹她的家人。', '對話段標題')]
S += [('07-talk', who, 'say', text, 'talk:1；scene:livingroom；pass:2') for who, text in TALK]
S += [('07-talk', 'nova', 'say', "Your turn! Let's say it like Emma.", 'talk:1；card:Your turn!')]
for i, (who, text) in enumerate(TALK[1:]):
    tl = 'he' if text.startswith("He's") else 'she' if text.startswith("She's") else ''
    teacher = 'nova' if i % 2 == 0 else 'cosmo'
    S += [('07-talk', teacher, 'say', f'Repeat after me. {text}', f'talk:1；card:{text}；{tl}'), ('07-talk', '-', 'turn', SENT_TURN, f'talk:1；card:{text}；{tl}')]
S += [('07-talk', 'cosmo', 'say', 'Wonderful, everyone!', 'Cosmo 比讚 P07')]
# 8 猜猜看（2026-11-04 老師：六位家人都要練，男女交錯）：指著家人 → 學生說句子 → 揭曉
QUIZ = [('Game time! Look at Emma\'s family. Who is he?', 'grandfather', "He's my grandfather.", 'he'),
        ('Next one. Who is she?', 'sister', "She's my sister.", 'she'),
        ('Next one. Who is she?', 'mother', "She's my mother.", 'she'),
        ('Next one. Who is he?', 'brother', "He's my brother.", 'he'),
        ('Next one. Who is she?', 'grandmother', "She's my grandmother.", 'she'),
        ('Last one. Who is he?', 'father', "He's my father.", 'he')]
for k, (q, mem, ans, hs) in enumerate(QUIZ):
    S += [('08-quiz', 'cosmo', 'say', q, f'family；quiz:{mem}'), ('08-quiz', '-', 'turn', SENT_TURN, f'family；quiz:{mem}；倒數條'),
          ('08-quiz', 'nova', 'say', ans + (' Great job, class!' if k == len(QUIZ) - 1 else ''), f'family；quiz:{mem}；揭曉；card:{ans}；{hs}')]
# 9 複習與再見
S += [('09-end', 'nova', 'say', 'Today we learned six family words.', '六張單字卡排兩排'),
      ('09-end', 'relay', 'say', 'Father, mother, grandfather, grandmother, brother, sister!', '六張卡依序亮起'),
      ('09-end', 'cosmo', 'say', "And two sentences. He's my father. She's my mother.", "card:He's my ___. / She's my ___.；he；she"),
      ('09-end', 'nova', 'zh', "介紹男生家人用 He's my，女生家人用 She's my；說自己就是 It's me.", '三張字卡排在一起'),
      ('09-end', 'cosmo', 'say', 'See you next time!', 'Cosmo 比讚 P07'),
      ('09-end', 'nova', 'say', 'Bye-bye, class!', '兩位老師揮手 P02')]
SCRIPT = S
