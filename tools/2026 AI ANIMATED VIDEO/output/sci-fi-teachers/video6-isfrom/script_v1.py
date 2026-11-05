"""script_v1.py — 影片 6〈Is she from India?〉腳本（HWG7 U01 Target Language，六年級上學期；
規格卡 rdq/RDQ-spec-video6-is-she-from-20261105.md，2026-11-05 confirmed：he＋she 都教、Amy 問 Ben 答＋照片卡、國旗＋地標）。
每一筆：(段落, 角色, 種類, 內容, 畫面)；角色 nova／cosmo／relay（接力）／amy／ben／-；種類 say、zh、turn（秒數）。
畫面標記：world＝十位朋友總覽、kid:X＝朋友照片卡（站在地標前）、flag:X＝程式畫國旗、card:＝字卡、he／she＝男女圖示、
cap＝國名第一個字母發光、the＝the 發光、swap＝She is → Is she、back＝Is she? → she is（老師截圖上的 Is → is 箭頭）、
merge:A=B＝縮寫合併、rise＝句尾 ↗、yes／no＝✔／✘、talk:N＝對話、scene:X、pass:1／2／3、focus:X＝對話畫面亮某張照片卡、quiz:X。
規則：Repeat after me；不寫音標與「／」；整串字用 relay；學生跟唸句子留 3 秒。
"""
CHUNK_TURN, SENT_TURN, QUICK_TURN = 2.0, 3.0, 2.0

def repeat(sec, who, text, turn, vis, rounds=2):
    """Repeat after me → 學生跟唸（預設兩輪）。"""
    out = [(sec, who, 'say', f'Repeat after me. {text}', vis + '；第 1 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]
    if rounds == 2: out += [(sec, who, 'say', text, vis + '；第 2 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]
    return out

# 十位朋友：(名字, he/she, 國名, 中文國名, 地標)；課本 8 國＋老師補充 Korea、Vietnam；男女各 5
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
def cap(s): return s[0].upper() + s[1:]
def be(p): return "He's" if p == 'he' else "She's"

S = []
# 1 開場
S += [('01-open', 'nova', 'say', "Hi, class! I'm Ms. Nova.", 'Nova 揮手 P02，名牌在臉旁'),
      ('01-open', 'cosmo', 'say', "And I'm Mr. Cosmo! Welcome back to our space classroom!", 'Cosmo 揮手 P02，名牌在臉旁'),
      ('01-open', 'nova', 'say', 'Look! We have ten new friends from around the world!', 'world；十張照片卡飛進來'),
      ('01-open', 'cosmo', 'say', 'Today, we will learn to ask: Is she from India? Is he from Japan?', 'card:Is she from India?；rise'),
      ('01-open', 'nova', 'zh', '今天要學怎麼問「她是從印度來的嗎？」，還有怎麼回答「是」或「不是」。', 'card:Is she from India?；rise')]

# 2 十個國家：國旗＋地標；先一國一國帶唸，再講大寫與 the，最後接力唸
S += [('02-country', 'cosmo', 'say', "First, let's learn ten countries.", 'world'),
      ('02-country', 'nova', 'zh', '先來認識十個國家。看國旗、看地標，跟著唸。', 'world'),
      ('02-country', 'cosmo', 'say', 'Repeat after me.', 'world')]
for i, (name, p, ctry, zh, mark) in enumerate(KIDS):   # 每國唸一次 → 學生跟唸 2 秒（Nova、Cosmo 輪流）
    v = f'kid:{name}；flag:{ctry}；card:{ctry}；中文 {zh}'
    S += [('02-country', 'cosmo' if i % 2 else 'nova', 'say', f'{ctry}.', v),
          ('02-country', '-', 'turn', CHUNK_TURN, v + '；Your turn! 換你唸！')]
S += [('02-country', 'nova', 'say', 'Look at the first letters. A, I, J, S!', 'cap；四張國名卡 Australia India Japan Singapore；第一個字母發光'),
      ('02-country', 'nova', 'zh', '國家名字的第一個字母一定要大寫。', 'cap；四張國名卡；大寫字母放大'),
      ('02-country', 'cosmo', 'say', 'Now look. The UK. The USA. We say the!', 'the；card:the UK / the USA；the 發光'),
      ('02-country', 'cosmo', 'zh', '英國和美國前面要加 the。the USA 是 the United States of America，美利堅合眾國。', 'the；card:the USA = the United States of America'),
      ('02-country', 'nova', 'zh', 'the UK 是 the United Kingdom，「聯合王國」，也就是英國。', 'the；card:the UK = the United Kingdom'),
      ('02-country', 'cosmo', 'say', "Let's say all ten countries together!", 'world'),
      ('02-country', 'relay', 'say', 'Australia, India, Japan, Singapore, Spain, Taiwan, the UK, the USA, Korea, Vietnam!', 'world；接力，唸到誰亮誰（國旗＋國名）')]

# 3 from＝來自：He is from... / She is from...
S += [('03-from', 'nova', 'say', 'This is Raj. He is from India.', 'kid:Raj；flag:India；card:He is from India.；he'),
      ('03-from', 'nova', 'zh', 'from 是「來自」。He is from India. 就是「他來自印度」。男生用 he。', 'kid:Raj；card:He is from India.；he；from 發光；中文 他來自印度。'),
      ('03-from', 'cosmo', 'say', 'This is Yuki. She is from Japan.', 'kid:Yuki；flag:Japan；card:She is from Japan.；she'),
      ('03-from', 'cosmo', 'zh', '女生用 she。She is from Japan.「她來自日本。」', 'kid:Yuki；card:She is from Japan.；she；中文 她來自日本。')]
S += repeat('03-from', 'nova', 'She is from Japan.', SENT_TURN, 'kid:Yuki；card:She is from Japan.；she', rounds=1)

# 4 問句：She is from India. → Is she from India?（swap、句尾 ↗）
ST, QU = 'card:She is from India.', 'card:Is she from India?'
S += [('04-ask', 'cosmo', 'say', 'Look at this sentence. She is from India.', f'{ST}；she'),
      ('04-ask', 'cosmo', 'say', 'Now watch. She and is change places!', f'{ST}；swap'),
      ('04-ask', 'cosmo', 'zh', 'She 和 is 對調，Is 跑到最前面要大寫，句點變問號，就變成問句。', f'{QU}；swap 完成；Is 發光；問號發光'),
      ('04-ask', 'nova', 'say', 'Is she from India?', f'{QU}；rise；she'),
      ('04-ask', 'nova', 'zh', '意思是「她來自印度嗎？」問是不是的問句，句尾要上揚。', f'{QU}；rise；箭頭動畫；中文 她來自印度嗎？')]
S += repeat('04-ask', 'nova', 'Is she from India?', SENT_TURN, f'{QU}；rise；she')
S += [('04-ask', 'cosmo', 'say', 'For a boy, we say he. Is he from India?', 'card:Is he from India?；rise；he'),
      ('04-ask', 'cosmo', 'zh', '問男生就把 she 換成 he。', 'card:Is he from India?；rise；he；中文 他來自印度嗎？')]
S += repeat('04-ask', 'cosmo', 'Is he from India?', SENT_TURN, 'card:Is he from India?；rise；he', rounds=1)

# 5 回答：Yes, she is.／No, she isn't. She's from the UK.
S += [('05-answer', 'nova', 'say', 'Mr. Cosmo, look at Lily. Is she from India?', 'kid:Lily；flag:the UK；card:Is she from India?；rise；she'),
      ('05-answer', 'cosmo', 'say', "No, she isn't. She's from the UK.", "kid:Lily；flag:the UK；card:No, she isn't. She's from the UK.；no；she"),
      ('05-answer', 'cosmo', 'zh', 'Lily 不是從印度來的，所以要說 No, she isn\'t。接著說出正確答案 She\'s from the UK。', "kid:Lily；card:No, she isn't. She's from the UK.；no；中文 不，她不是。她來自英國。"),
      ('05-answer', 'nova', 'say', "Look at isn't. Is not... becomes isn't!", "card:is not = isn't；merge"),
      ('05-answer', 'nova', 'zh', "is not 合在一起，o 拿掉，換成一個小撇號，就變成 isn't。", "card:is not = isn't；merge 完成；撇號發光"),
      ('05-answer', 'cosmo', 'say', "And She is... becomes She's!", "card:She is = She's；merge；she")]
S += repeat('05-answer', 'nova', "Is not. Isn't.", CHUNK_TURN, "card:is not = isn't", rounds=1)
S += repeat('05-answer', 'cosmo', "No, she isn't. She's from the UK.", SENT_TURN, "card:No, she isn't. She's from the UK.；no；she")
S += [('05-answer', 'cosmo', 'say', 'Ms. Nova, look at Mia. Is she from Australia?', 'kid:Mia；flag:Australia；card:Is she from Australia?；rise；she'),
      ('05-answer', 'nova', 'say', 'Yes, she is!', 'kid:Mia；flag:Australia；card:Yes, she is.；yes；she'),
      ('05-answer', 'nova', 'zh', '答對了就說 Yes, she is.「是的，她是。」問句跑到前面的 Is，回答時又回到 she 後面。', 'card:Is she ...? → Yes, she is.；back；is 箭頭飛回句尾'),
      ('05-answer', 'cosmo', 'zh', '注意：Yes 的答句要說 she is，不能縮寫成 she\'s。', 'card:Yes, she is.；yes；she is 發光')]
S += repeat('05-answer', 'nova', 'Yes, she is.', SENT_TURN, 'card:Yes, she is.；yes；she')
S += [('05-answer', 'cosmo', 'zh', '問男生就用 he 回答：Yes, he is. 或 No, he isn\'t. He\'s from 加國家。', "card:Yes, he is. / No, he isn't.；he")]
S += repeat('05-answer', 'cosmo', "Yes, he is. No, he isn't.", SENT_TURN, "card:Yes, he is. / No, he isn't.；he", rounds=1)

# 6 老師示範
S += [('06-demo', 'nova', 'say', "Let's practice! Mr. Cosmo, look at Tom. Is he from the USA?", 'kid:Tom；flag:the USA；card:Is he from the USA?；rise；he；Nova 發問泡泡'),
      ('06-demo', 'cosmo', 'say', 'Yes, he is!', 'kid:Tom；card:Yes, he is.；yes；he；Cosmo 回答泡泡'),
      ('06-demo', 'cosmo', 'say', 'Ms. Nova, look at Jisu. Is she from Japan?', 'kid:Jisu；flag:Korea；card:Is she from Japan?；rise；she；Cosmo 發問泡泡'),
      ('06-demo', 'nova', 'say', "No, she isn't. She's from Korea.", "kid:Jisu；card:No, she isn't. She's from Korea.；no；she；Nova 回答泡泡"),
      ('06-demo', 'cosmo', 'say', "Great! Now let's watch Amy and Ben.", '轉場')]

# 7 三部對話（Amy 問、Ben 答；右側照片卡）：先無字幕、再有字幕；老師指照片卡問 → 3 秒 → 揭曉 → Repeat after me；再跟著 Amy 和 Ben 唸
# (編號, 場景, [(照片卡朋友, 老師問的國家)], 台詞)
TALKS = [
 (1, 'photowall', [('Sofia', 'Spain'), ('Nam', 'Japan')], [
     ('amy', 'Ben, look at this photo! Is she from Spain?'), ('ben', "Yes, she is. She's Sofia."),
     ('amy', 'And is he from Japan?'), ('ben', "No, he isn't. He's from Vietnam. He's Nam."), ('amy', 'Cool!')]),
 (2, 'intlday', [('Wei', 'Singapore'), ('Mia', 'the UK')], [
     ('ben', 'Wow! Happy International Day, Amy!'), ('amy', 'Look, Ben! Is he from Singapore?'), ('ben', 'Yes, he is.'),
     ('amy', 'Is she from the UK?'), ('ben', "No, she isn't. She's from Australia."), ('amy', 'Oh, I see!')]),
 (3, 'videocall', [('Kai', 'Taiwan'), ('Lily', 'the USA')], [
     ('amy', 'Ben, who are your new pen pals?'), ('ben', "Look! He's Kai."), ('amy', 'Is he from Taiwan, too?'), ('ben', 'Yes, he is!'),
     ('amy', 'Is she from the USA?'), ('ben', "No, she isn't. She's from the UK. She's Lily."), ('amy', 'Hello, Kai! Hello, Lily!')]),
]
def answer(name, asked):
    _, p, ctry, _, _ = K[name]
    return (f'Yes, {p} is.', 'yes') if ctry == asked else (f"No, {p} isn't. {be(p)} from {ctry}.", 'no')

S += [('07-talk', 'cosmo', 'say', 'Listen carefully!', '對話段標題；老師退到兩側'),
      ('07-talk', 'nova', 'zh', '仔細聽，照片裡的朋友是從哪個國家來的？', '對話段標題')]
for no, scene, asks, lines in TALKS:
    asker = 'nova' if no % 2 else 'cosmo'; other = 'cosmo' if asker == 'nova' else 'nova'
    for ps in (1, 2):
        if ps == 2: S += [('07-talk', asker, 'say', 'Listen again.', f'talk:{no}；scene:{scene}；pass:2')]
        S += [('07-talk', who, 'say', text, f'talk:{no}；scene:{scene}；pass:{ps}') for who, text in lines]
    for name, asked in asks:
        p = K[name][1]; q = f'Is {p} from {asked}?'; a, yn = answer(name, asked)
        S += [('07-talk', asker, 'say', q, f'talk:{no}；focus:{name}；card:{q}；rise；{p}'),
              ('07-talk', '-', 'turn', SENT_TURN, f'talk:{no}；focus:{name}；card:{q}；rise；{p}；倒數條'),
              ('07-talk', other, 'say', a, f'talk:{no}；focus:{name}；揭曉；card:{a}；{yn}；{p}'),
              ('07-talk', asker, 'say', f'Repeat after me. {a}', f'talk:{no}；focus:{name}；card:{a}；{yn}；{p}'),
              ('07-talk', '-', 'turn', SENT_TURN, f'talk:{no}；focus:{name}；card:{a}；{yn}；{p}')]
    # （影片 5 的「跟著 Amy 和 Ben 唸」pass:3 拿掉：片長控制在 12 分鐘內，同樣的句子上面已練過）
S += [('07-talk', 'cosmo', 'say', 'Wonderful, everyone!', 'Cosmo 比讚 P07')]

# 8 Game time 六題（Yes 三題、No 三題，男女交錯）：老師問 → 學生答 3 秒 → 揭曉；後兩題學生先問（半提示字卡）
QUIZ = [('Raj', 'India'), ('Yuki', 'Korea'), ('Kai', 'Taiwan'), ('Sofia', 'the USA'), ('Nam', 'Vietnam'), ('Jisu', 'Singapore')]
S += [('08-quiz', 'nova', 'say', 'Game time! Look at the photo and the flag. Answer the question!', 'world'),
      ('08-quiz', 'nova', 'zh', '看照片和國旗，回答 Yes 還是 No。說 No 的時候，別忘了說出正確的國家！', 'world')]
for k, (name, asked) in enumerate(QUIZ):
    p = K[name][1]; q = f'Is {p} from {asked}?'; a, yn = answer(name, asked)
    t, o = ('cosmo', 'nova') if k % 2 else ('nova', 'cosmo')
    v = f'kid:{name}；flag:{K[name][2]}；quiz:{name}'
    if k < 4:
        S += [('08-quiz', t, 'say', q, f'{v}；card:{q}；rise；{p}')]
    else:   # 後兩題：學生自己問（半提示字卡 Is he from ___?），老師再問一次
        S += [('08-quiz', t, 'say', 'Now you ask!', f'{v}；card:Is {p} from {asked}?；rise；{p}'),
              ('08-quiz', '-', 'turn', SENT_TURN, f'{v}；card:Is {p} from {asked}?；rise；{p}；倒數條'),
              ('08-quiz', t, 'say', q, f'{v}；card:{q}；rise；{p}')]
    S += [('08-quiz', '-', 'turn', SENT_TURN, f'{v}；card:Yes or No?；{p}；倒數條'),
          ('08-quiz', o, 'say', a + (' Great job, class!' if k == len(QUIZ) - 1 else ''), f'{v}；揭曉；card:{a}；{yn}；{p}')]

# 9 複習與再見
S += [('09-end', 'nova', 'say', 'Today we learned a question. Is she from India? Is he from India?', 'card:Is she from India? / Is he from India?；rise'),
      ('09-end', 'cosmo', 'say', "And the answers. Yes, she is. No, she isn't. She's from the UK.", "card:Yes, she is. / No, she isn't. She's from the UK.；yes；no"),
      ('09-end', 'nova', 'zh', "Is 放最前面、句尾上揚；是就說 Yes，不是就說 No，再說出正確的國家。國名要大寫，the UK、the USA 要加 the！", '三張字卡排在一起'),
      ('09-end', 'cosmo', 'say', 'See you next time!', 'Cosmo 比讚 P07'),
      ('09-end', 'nova', 'say', 'Bye-bye, class!', '兩位老師揮手 P02')]
SCRIPT = S

if __name__ == '__main__':
    import re
    words = sum(len(re.findall(r"[A-Za-z']+", t)) for _, _, k, t, _ in S if k == 'say')
    zh = sum(len(t) for _, _, k, t, _ in S if k == 'zh'); turns = sum(t for _, _, k, t, _ in S if k == 'turn')
    est = words / 2.0 * 1.25 + zh / 4.0 * 1.25 + turns + 0.6 * len(S)
    print(f'{len(S)} 筆；英文 {words} 字、中文 {zh} 字、留白 {turns:.0f} 秒；推估 {est/60:.1f} 分鐘')
