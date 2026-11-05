"""script_v1.py — 影片 7〈Countries — I'm from ___.〉腳本（HWG7 U01 Target Language A Countries，六年級上；
規格卡 rdq/RDQ-spec-video7-countries-from-20261105.md，2026-11-05 confirmed：7–9 分鐘、拍音節＋重音、十位朋友各自不同聲音自我介紹）。
放在影片 6〈Is she from India?〉之前上課；十位朋友、照片卡、國旗沿用影片 6。
每一筆：(段落, 角色, 種類, 內容, 畫面)；角色 nova／cosmo／relay／朋友名小寫（mia、raj…）／-；種類 say、zh、turn（秒數）。
畫面標記：world＝十人總覽、kid:X＝朋友照片卡、flag:X、card:、中文 X、clap:國名＝音節方塊＋拍手、cap＝大寫字母、the＝the 發光、
merge＝縮寫合併、he／she、find:A,B,C,D＝四張照片卡找人、quiz:X。
規則：Repeat after me；不寫音標與「／」；整串字用 relay；學生跟唸句子留 3 秒。
"""
CHUNK_TURN, SENT_TURN, CLAP_TURN = 2.0, 3.0, 3.5

def repeat(sec, who, text, turn, vis, rounds=2):
    out = [(sec, who, 'say', f'Repeat after me. {text}', vis + '；第 1 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]
    if rounds == 2: out += [(sec, who, 'say', text, vis + '；第 2 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]
    return out

# 十位朋友（和影片 6 相同）：(名字, he/she, 國名, 中文國名, 地標)
KIDS = [('Mia', 'she', 'Australia', '澳洲', 'Sydney Opera House'),
        ('Raj', 'he', 'India', '印度', 'Taj Mahal'),
        ('Yuki', 'she', 'Japan', '日本', 'Mount Fuji'),
        ('Wei', 'he', 'Singapore', '新加坡', 'Merlion'),
        ('Sofia', 'she', 'Spain', '西班牙', 'Sagrada Familia'),
        ('Kai', 'he', 'Taiwan', '臺灣', 'Taipei 101'),
        ('Lily', 'she', 'the UK', '英國', 'Big Ben'),
        ('Tom', 'he', 'the USA', '美國', 'Statue of Liberty'),
        ('Jisu', 'she', 'Korea', '韓國', 'Gyeongbokgung Palace'),
        ('Nam', 'he', 'Vietnam', '越南', 'Ha Long Bay')]
K = {k[0]: k for k in KIDS}
# 音節（畫面方塊）與重音位置（0 起算）；字典：Cambridge／Merriam-Webster。Australia 國小常拆 4 拍（也有人唸 3 拍 Aus-tral-ia）。
SYL = {'Australia': (['Aus', 'tra', 'li', 'a'], 1), 'India': (['In', 'di', 'a'], 0), 'Japan': (['Ja', 'pan'], 1),
       'Singapore': (['Sin', 'ga', 'pore'], 0), 'Spain': (['Spain'], 0), 'Taiwan': (['Tai', 'wan'], 1),
       'the UK': (['U', 'K'], 1), 'the USA': (['U', 'S', 'A'], 2), 'Korea': (['Ko', 're', 'a'], 1), 'Vietnam': (['Vi', 'et', 'nam'], 2)}   # 2026-11-05 老師：Vi-et-nam 三拍
# 拍音節時送給 TTS 的拼法（字幕仍顯示 syl_line）：全大寫會被拼成字母、Oss／Aws 會被唸成字母，2026-11-05 試聽 v2 定拼法
SYL_TTS = {'Australia': 'Awss... tray... lee... uh.', 'India': 'In... dee... uh.', 'Japan': 'Juh... pan.', 'Singapore': 'Sing... uh... pore.',
           'Spain': 'Spain.', 'Taiwan': 'Tie... wahn.', 'the UK': 'U... K.', 'the USA': 'U... S... A.',
           'Korea': 'Kuh... ree... uh.', 'Vietnam': 'Vee... yet... nahm.'}   # Vietnam：et 會被拼成字母 E-T，用 yet
def syl_line(c):
    """老師拍音節時唸的句子：每個音節用逗號隔開（配音時每個音節一拍），重音大寫。"""
    parts, st = SYL[c]
    return ', '.join(p.upper() if i == st and len(parts) > 1 else p for i, p in enumerate(parts)) + '!'

S = []
# 1 開場
S += [('01-open', 'nova', 'say', "Hi, class! I'm Ms. Nova.", 'Nova 揮手 P02，名牌在臉旁'),
      ('01-open', 'cosmo', 'say', "And I'm Mr. Cosmo! Welcome back to our space classroom!", 'Cosmo 揮手 P02，名牌在臉旁'),
      ('01-open', 'nova', 'say', 'Look! We have ten new friends from ten countries!', 'world；十張照片卡飛進來'),
      ('01-open', 'cosmo', 'say', "Today, we will learn the countries, and say: I'm from Taiwan!", "card:I'm from Taiwan."),
      ('01-open', 'nova', 'zh', '今天要認識十個國家，還要學會說「我來自哪裡」。', "card:I'm from Taiwan.")]

# 2 十個國名：照片卡＋國旗＋國名，Repeat after me 兩輪（Nova、Cosmo 輪流帶）
S += [('02-words', 'cosmo', 'say', "Let's learn the countries. Look at the flags!", 'world'),
      ('02-words', 'nova', 'zh', '看國旗、看地標，跟著唸兩次。', 'world')]
for i, (name, p, ctry, zh, mark) in enumerate(KIDS):
    S += repeat('02-words', 'cosmo' if i % 2 else 'nova', f'{ctry}.', CHUNK_TURN, f'kid:{name}；flag:{ctry}；card:{ctry}；中文 {zh}')
S += [('02-words', 'cosmo', 'say', "Let's say all ten countries together!", 'world'),
      ('02-words', 'relay', 'say', 'Australia, India, Japan, Singapore, Spain, Taiwan, the UK, the USA, Korea, Vietnam!', 'world；接力，唸到誰亮誰')]

# 3 拍音節＋重音：老師一拍一拍唸（每拍一聲拍手，重音那拍方塊放大、拍手大聲）→ 學生拍手跟唸
S += [('03-clap', 'nova', 'say', "Now, let's clap the beats!", 'clap:Japan；示範'),
      ('03-clap', 'nova', 'zh', '每個國名有幾拍？一拍拍一下手。大大的那一拍要唸得比較重、比較大聲。', 'clap:Japan；示範'),
      ('03-clap', 'cosmo', 'say', 'Clap and say with me!', 'clap:Japan；示範')]
for i, (name, p, ctry, zh, mark) in enumerate(KIDS):
    t = 'nova' if i % 2 == 0 else 'cosmo'; n = len(SYL[ctry][0])
    S += [('03-clap', t, 'say', f'{ctry}.', f'clap:{ctry}；flag:{ctry}；整個字'),
          ('03-clap', t, 'say', syl_line(ctry), f'clap:{ctry}；flag:{ctry}；拍手 {n} 下'),
          ('03-clap', '-', 'turn', CLAP_TURN, f'clap:{ctry}；flag:{ctry}；Your turn! 拍手跟唸！')]
S += [('03-clap', 'cosmo', 'zh', 'Spain 只有一拍；Australia 有四拍。the UK、the USA 是一個一個字母唸，最後一個字母最重。', 'clap:the USA；flag:the USA'),
      ('03-clap', 'nova', 'say', 'Great clapping!', 'Nova 比讚 P07')]

# 4 大寫與 the
S += [('04-cap', 'nova', 'say', 'Look at the first letters. A, I, J, S!', 'cap；四張國名卡；第一個字母發光'),
      ('04-cap', 'nova', 'zh', '國家名字的第一個字母一定要大寫。', 'cap；四張國名卡；大寫字母放大'),
      ('04-cap', 'cosmo', 'say', 'Now look. The UK. The USA. We say the!', 'the；card:the UK / the USA；the 發光'),
      ('04-cap', 'cosmo', 'zh', '英國和美國前面要加 the。the USA 是 the United States of America，美利堅合眾國。', 'the；card:the USA = the United States of America'),
      ('04-cap', 'nova', 'zh', 'the UK 是 the United Kingdom，聯合王國，就是英國。', 'the；card:the UK = the United Kingdom')]
# （the United States of America 跟唸拿掉：片長控制）

# 5 I'm from ___.：十位朋友用自己的聲音自我介紹 → 學生跟唸 I'm from ___.；I'm = I am；最後換學生說 I'm from Taiwan.
S += [('05-im', 'cosmo', 'say', "Now, our friends will say hello. Listen!", 'world'),
      ('05-im', 'nova', 'zh', "I'm from 就是「我來自」。聽朋友們自我介紹，跟著說 I'm from 加國家。", 'world')]
for i, (name, p, ctry, zh, mark) in enumerate(KIDS):
    line = f"I'm from {ctry}."
    S += [('05-im', name.lower(), 'say', f"Hi! I'm {name}. {line}", f'kid:{name}；flag:{ctry}；card:{line}；朋友說話'),
          ('05-im', '-', 'turn', SENT_TURN, f'kid:{name}；flag:{ctry}；card:{line}；Your turn! 換你唸！')]
S += [('05-im', 'nova', 'say', "Look at I'm. I am... becomes I'm!", "card:I am = I'm；merge"),
      ('05-im', 'nova', 'zh', "I am 合在一起，a 拿掉，換成一個小撇號，就變成 I'm。", "card:I am = I'm；merge 完成；撇號發光")]
S += repeat('05-im', 'nova', "I am. I'm.", CHUNK_TURN, "card:I am = I'm", rounds=1)
S += [('05-im', 'cosmo', 'say', "Now you! Where are you from? I'm from Taiwan!", "kid:Kai；flag:Taiwan；card:I'm from Taiwan."),
      ('05-im', 'cosmo', 'zh', '我們住在臺灣，所以說 I\'m from Taiwan.', "kid:Kai；flag:Taiwan；card:I'm from Taiwan.；中文 我來自臺灣。")]
S += repeat('05-im', 'cosmo', "I'm from Taiwan.", SENT_TURN, "kid:Kai；flag:Taiwan；card:I'm from Taiwan.")

# 6 He's from ___.／She's from ___.：介紹別人（男生 he 藍、女生 she 粉）
S += [('06-heshe', 'nova', 'say', "This is Raj. He's from India.", "kid:Raj；flag:India；card:He's from India.；he"),
      ('06-heshe', 'nova', 'zh', "介紹男生用 He's from，他來自。He's 就是 He is。", "kid:Raj；card:He is = He's；he；中文 他來自印度。"),
      ('06-heshe', 'cosmo', 'say', "This is Yuki. She's from Japan.", "kid:Yuki；flag:Japan；card:She's from Japan.；she"),
      ('06-heshe', 'cosmo', 'zh', "介紹女生用 She's from，她來自。She's 就是 She is。", "kid:Yuki；card:She is = She's；she；中文 她來自日本。")]
for name in ('Tom', 'Jisu'):   # 片長控制：兩位就好
    _, p, ctry, zh, _ = K[name]; ln = f"{'He' if p == 'he' else 'She'}'s from {ctry}."
    S += repeat('06-heshe', 'nova' if p == 'she' else 'cosmo', ln, SENT_TURN, f'kid:{name}；flag:{ctry}；card:{ln}；{p}', rounds=1)

# 7 Game time：看國旗說國名（4 題）＋聽 I'm from ___. 找人（3 題，四張照片卡選一）
S += [('07-quiz', 'nova', 'say', 'Game time! Look at the flag. Say the country!', 'flagquiz'),
      ('07-quiz', 'nova', 'zh', '看國旗，說出國家的名字。', 'flagquiz')]
for k, ctry in enumerate(['Spain', 'Korea', 'the UK', 'Vietnam']):
    t, o = ('cosmo', 'nova') if k % 2 else ('nova', 'cosmo')
    S += [('07-quiz', t, 'say', 'What country is it?' if k == 0 else 'And this one?', f'flag:{ctry}；quiz:{ctry}；card:?'),
          ('07-quiz', '-', 'turn', SENT_TURN, f'flag:{ctry}；quiz:{ctry}；card:?；倒數條'),
          ('07-quiz', o, 'say', f'{ctry}!', f'flag:{ctry}；quiz:{ctry}；揭曉；card:{ctry}')]
S += [('07-quiz', 'cosmo', 'say', 'Now listen. Who is it? Point to the friend!', 'find:Mia,Yuki,Sofia,Jisu'),
      ('07-quiz', 'cosmo', 'zh', '聽朋友說 I\'m from 哪裡，找出是誰！', 'find:Mia,Yuki,Sofia,Jisu')]
for name, opts in (('Sofia', 'Mia,Yuki,Sofia,Jisu'), ('Wei', 'Raj,Wei,Kai,Nam'), ('Lily', 'Lily,Tom,Mia,Raj')):
    _, p, ctry, zh, _ = K[name]; ln = f"{'He' if p == 'he' else 'She'}'s from {ctry}."
    S += [('07-quiz', name.lower(), 'say', f"I'm from {ctry}.", f'find:{opts}；聲音'),
          ('07-quiz', '-', 'turn', SENT_TURN, f'find:{opts}；倒數條'),
          ('07-quiz', 'nova' if p == 'she' else 'cosmo', 'say', f"It's {name}! {ln}", f'find:{opts}；揭曉:{name}；card:{ln}；{p}')]

# 8 複習＋預告影片 6
S += [('08-end', 'nova', 'say', "Today we learned ten countries. And we can say: I'm from Taiwan.", "card:I'm from Taiwan."),
      ('08-end', 'cosmo', 'say', "He's from India. She's from Japan.", "card:He's from India. / She's from Japan.；he；she"),
      ('08-end', 'nova', 'zh', "說自己用 I'm from，說男生用 He's from，說女生用 She's from。國名第一個字母要大寫，the UK、the USA 要加 the！", '三張字卡排在一起'),
      ('08-end', 'cosmo', 'say', 'Next time, we will ask: Is she from India?', 'card:Is she from India?；rise'),
      ('08-end', 'nova', 'say', 'Bye-bye, class!', '兩位老師揮手 P02')]
SCRIPT = S

if __name__ == '__main__':
    import re
    words = sum(len(re.findall(r"[A-Za-z']+", t)) for _, _, k, t, _ in S if k == 'say')
    zh = sum(len(t) for _, _, k, t, _ in S if k == 'zh'); turns = sum(t for _, _, k, t, _ in S if k == 'turn')
    est = (words / 2.0 * 1.25 + zh / 4.0 * 1.25 + turns + 0.6 * len(S)) * 0.865   # 0.865＝影片 5 實測校正
    print(f'{len(S)} 筆；英文 {words} 字、中文 {zh} 字、留白 {turns:.0f} 秒；推估 {est/60:.1f} 分鐘')
    for c in SYL: print(c, '→', syl_line(c))
