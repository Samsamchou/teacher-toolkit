"""script_v1.py — 影片 5〈Who's he? Who's she?〉腳本（SF3 U01 句型，課本 p.29；規格卡 rdq/RDQ-spec-video5-whos-he-20261104.md，2026-11-04 confirmed）。
每一筆：(段落, 角色, 種類, 內容, 畫面)；角色 nova／cosmo／relay（接力）／amy／emma／-；種類 say、zh、turn（秒數）。
畫面標記：family＝全家福、mem:X＝家人大圖、card:＝字卡、he／she＝藍色男生／粉色女生圖示、zh:他／zh:她＝中文字卡、
merge:A=B＝縮寫合併動畫、fall＝句尾 ↘、talk:N＝對話、scene:X、pass:1／2、focus:X＝對話畫面亮某位家人、quiz:X＝猜猜看。
規則：Repeat after me；不寫音標與「／」；整串字用 relay；學生跟唸句子留 3 秒。
"""
CHUNK_TURN, SENT_TURN, QUICK_TURN = 2.0, 3.0, 2.0

def repeat(sec, who, text, turn, vis, rounds=2):
    """Repeat after me → 學生跟唸（預設兩輪）。"""
    out = [(sec, who, 'say', f'Repeat after me. {text}', vis + '；第 1 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]
    if rounds == 2: out += [(sec, who, 'say', text, vis + '；第 2 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]
    return out

HE = ['father', 'grandfather', 'brother']; SHE = ['mother', 'grandmother', 'sister']
def hs(m): return ('he', "He's") if m in HE else ('she', "She's")

S = []
# 1 開場：回顧影片 4 的六位家人（接力唸）
S += [('01-open', 'nova', 'say', "Hi, class! I'm Ms. Nova.", 'Nova 揮手 P02，名牌在臉旁'),
      ('01-open', 'cosmo', 'say', "And I'm Mr. Cosmo! Welcome back to our space classroom!", 'Cosmo 揮手 P02，名牌在臉旁'),
      ('01-open', 'nova', 'say', "Remember Emma's family? Let's say their names!", 'family'),
      ('01-open', 'relay', 'say', 'Father, mother, grandfather, grandmother, brother, sister!', 'family；接力，唸到誰亮誰'),
      ('01-open', 'cosmo', 'say', "Today, we will learn to ask about people. Who's he? Who's she?", "card:Who's he? / Who's she?"),
      ('01-open', 'nova', 'zh', "今天要學怎麼問「他是誰？」「她是誰？」，還有怎麼回答。", "card:Who's he? / Who's she?")]
# 2 he＝他（男生）、she＝她（女生）
S += [('02-heshe', 'cosmo', 'say', 'Look! He. He is a boy or a man.', 'he；card:he；zh:他；男生圖示'),
      ('02-heshe', 'nova', 'say', 'And she. She is a girl or a woman.', 'she；card:she；zh:她；女生圖示'),
      ('02-heshe', 'nova', 'zh', '男生用 he，就是單人旁的「他」；女生用 she，就是女字旁的「她」。中文唸起來一樣，英文可不一樣喔！', 'card:he = 他 / she = 她；he；she')]
S += repeat('02-heshe', 'cosmo', 'He. She.', CHUNK_TURN, 'card:he = 他 / she = 她；he；she', rounds=1)
S += [('02-heshe', 'cosmo', 'say', "Let's try! Father. He or she?", 'mem:father；card:He or she?'), ('02-heshe', '-', 'turn', QUICK_TURN, 'mem:father；card:He or she?；倒數條'),
      ('02-heshe', 'nova', 'say', 'He!', 'mem:father；card:he；he；揭曉'),
      ('02-heshe', 'nova', 'say', 'Grandmother. He or she?', 'mem:grandmother；card:He or she?'), ('02-heshe', '-', 'turn', QUICK_TURN, 'mem:grandmother；card:He or she?；倒數條'),
      ('02-heshe', 'cosmo', 'say', 'She!', 'mem:grandmother；card:she；she；揭曉'),
      ('02-heshe', 'cosmo', 'say', 'Brother. He or she?', 'mem:brother；card:He or she?'), ('02-heshe', '-', 'turn', QUICK_TURN, 'mem:brother；card:He or she?；倒數條'),
      ('02-heshe', 'nova', 'say', 'He!', 'mem:brother；card:he；he；揭曉'),
      ('02-heshe', 'nova', 'say', 'Sister. He or she?', 'mem:sister；card:He or she?'), ('02-heshe', '-', 'turn', QUICK_TURN, 'mem:sister；card:He or she?；倒數條'),
      ('02-heshe', 'cosmo', 'say', 'She! Great job!', 'mem:sister；card:she；she；揭曉')]
# 3 三個縮寫：He is → He's、She is → She's、Who is → Who's（合併動畫）
S += [('03-short', 'nova', 'say', "Now, three short words. He is... becomes He's!", "card:He is = He's；merge；he"),
      ('03-short', 'nova', 'zh', "He is 合在一起，i 拿掉，換成一個小撇號，就變成 He's。", "card:He is = He's；merge 完成；撇號發光；he")]
S += repeat('03-short', 'nova', "He is. He's.", CHUNK_TURN, "card:He is = He's；he", rounds=1)
S += [('03-short', 'cosmo', 'say', "She is... becomes She's!", "card:She is = She's；merge；she")]
S += repeat('03-short', 'cosmo', "She is. She's.", CHUNK_TURN, "card:She is = She's；she", rounds=1)
S += [('03-short', 'nova', 'say', "And Who is... becomes Who's!", "card:Who is = Who's；merge"),
      ('03-short', 'nova', 'zh', "Who 是「誰」。Who is 也一樣合起來，變成 Who's。", "card:Who is = Who's；merge 完成；撇號發光；zh:誰")]
S += repeat('03-short', 'nova', "Who is. Who's.", CHUNK_TURN, "card:Who is = Who's", rounds=1)
# 4 問句與答句（課本 p.29）
S += [('04-ask', 'cosmo', 'say', "Look at this man. Who's he?", "mem:father；card:Who's he?；fall；he"),
      ('04-ask', 'cosmo', 'zh', "Who's he? 就是「他是誰？」。問「誰」的問句，句尾語調要往下降。", "mem:father；card:Who's he?；fall；he；中文 他是誰？")]
S += repeat('04-ask', 'cosmo', "Who's he?", SENT_TURN, "mem:father；card:Who's he?；fall；he")
S += [('04-ask', 'nova', 'say', "He's my father.", "mem:father；card:He's my father.；he"),
      ('04-ask', 'nova', 'zh', "回答時說 He's my father.「他是我的爸爸。」", "mem:father；card:He's my father.；he；中文 他是我的爸爸。")]
S += repeat('04-ask', 'nova', "He's my father.", SENT_TURN, "mem:father；card:He's my father.；he")
S += [('04-ask', 'nova', 'say', "Now look at this woman. Who's she?", "mem:mother；card:Who's she?；fall；she"),
      ('04-ask', 'nova', 'zh', "Who's she? 就是「她是誰？」", "mem:mother；card:Who's she?；fall；she；中文 她是誰？")]
S += repeat('04-ask', 'nova', "Who's she?", SENT_TURN, "mem:mother；card:Who's she?；fall；she")
S += [('04-ask', 'cosmo', 'say', "She's my mother.", "mem:mother；card:She's my mother.；she"),
      ('04-ask', 'cosmo', 'zh', "回答 She's my mother.「她是我的媽媽。」問男生用 he，問女生用 she，回答也要跟著換喔！", "mem:mother；card:She's my mother.；she；中文 她是我的媽媽。")]
S += repeat('04-ask', 'cosmo', "She's my mother.", SENT_TURN, "mem:mother；card:She's my mother.；she")
# 5 老師示範（一問一答）
S += [('05-demo', 'nova', 'say', "Let's practice! Mr. Cosmo, who's he?", "mem:grandfather；card:Who's he?；fall；he；Nova 發問泡泡"),
      ('05-demo', 'cosmo', 'say', "He's my grandfather.", "mem:grandfather；card:He's my grandfather.；he；Cosmo 回答泡泡"),
      ('05-demo', 'cosmo', 'say', "Ms. Nova, who's she?", "mem:sister；card:Who's she?；fall；she；Cosmo 發問泡泡"),
      ('05-demo', 'nova', 'say', "She's my sister.", "mem:sister；card:She's my sister.；she；Nova 回答泡泡"),
      ('05-demo', 'cosmo', 'say', "Great! Now let's watch Amy and Emma.", '轉場')]
# 6 三部對話（Amy 問、Emma 答）：先無字幕、再有字幕；接著老師指著兩位家人各問一次 → 3 秒 → 揭曉 → Repeat after me 一次。
TALKS = [
 (1, 'schoolgate', ['father', 'mother'], [
     ('amy', 'Bye, Emma! Oh, look! Who\'s he?'), ('emma', "He's my father."),
     ('amy', "And who's she?"), ('emma', "She's my mother."), ('amy', 'Hello! Nice to meet you!')]),
 (2, 'park', ['grandfather', 'grandmother'], [
     ('amy', "Hi, Emma! Who's he?"), ('emma', "He's my grandfather."),
     ('amy', "Who's she?"), ('emma', "She's my grandmother."), ('amy', 'They are so nice!')]),
 (3, 'party', ['sister', 'brother'], [
     ('amy', 'Happy birthday, Emma!'), ('emma', 'Thank you, Amy! Come in!'),
     ('amy', "Who's she?"), ('emma', "She's my sister."),
     ('amy', "Who's he? He's so cute!"), ('emma', "He's my brother.")]),
]
S += [('06-talk', 'cosmo', 'say', 'Listen carefully!', '對話段標題；老師退到兩側'),
      ('06-talk', 'nova', 'zh', '仔細聽，Amy 問了誰？Emma 怎麼回答？', '對話段標題')]
for no, scene, mems, lines in TALKS:
    asker = 'nova' if no % 2 else 'cosmo'; other = 'cosmo' if asker == 'nova' else 'nova'
    for ps in (1, 2):
        if ps == 2: S += [('06-talk', asker, 'say', 'Listen again.', f'talk:{no}；scene:{scene}；pass:2')]
        S += [('06-talk', who, 'say', text, f'talk:{no}；scene:{scene}；pass:{ps}') for who, text in lines]
    for m in mems:
        p, a = hs(m); q = f"Who's {p}?"; ans = f'{a} my {m}.'
        S += [('06-talk', asker, 'say', q, f'talk:{no}；focus:{m}；card:{q}；fall；{p}'),
              ('06-talk', '-', 'turn', SENT_TURN, f'talk:{no}；focus:{m}；card:{q}；fall；{p}；倒數條'),
              ('06-talk', other, 'say', ans, f'talk:{no}；focus:{m}；揭曉；card:{ans}；{p}'),
              ('06-talk', asker, 'say', f'Repeat after me. {ans}', f'talk:{no}；focus:{m}；card:{ans}；{p}'),
              ('06-talk', '-', 'turn', SENT_TURN, f'talk:{no}；focus:{m}；card:{ans}；{p}')]
    # 跟著 Amy 和 Emma 唸：只挑問句與答句，播原聲一句（有字幕）→ 學生跟唸 3 秒（片長補到 10 分鐘以上）
    S += [('06-talk', other, 'say', 'Now be Amy and Emma. Repeat after them.', f'talk:{no}；scene:{scene}；pass:3')]
    for who, text in lines:
        if "who's" in text.lower() or "'s my" in text:
            # 2026-11-04 老師：學生跟唸時要看得到句子 → 原聲與留白都加該句字卡（He's 藍、She's 粉、問句 ↘），留白時字幕也顯示該句
            mk = ('；fall' if "who's" in text.lower() else '') + ('；she' if 'she' in text.lower() else '；he' if "he?" in text.lower() or text.startswith("He's") else '')
            S += [('06-talk', who, 'say', text, f'talk:{no}；scene:{scene}；pass:3；card:{text}{mk}'), ('06-talk', '-', 'turn', SENT_TURN, f'talk:{no}；scene:{scene}；pass:3；card:{text}{mk}；Your turn! 換你唸！')]
S += [('06-talk', 'cosmo', 'say', 'Wonderful, everyone!', 'Cosmo 比讚 P07')]
# 7 Game time 六題：亮一位家人 → 學生先說問句 → 學生說答句 → 揭曉（男女交錯）
QUIZ = ['grandmother', 'brother', 'mother', 'grandfather', 'sister', 'father']
S += [('07-quiz', 'nova', 'say', "Game time! Look at Emma's family. You ask, and you answer!", 'family'),
      ('07-quiz', 'nova', 'zh', '亮起來的是誰？先問「他是誰」或「她是誰」，再回答。', 'family')]
for k, m in enumerate(QUIZ):
    p, a = hs(m); q = f"Who's {p}?"; ans = f'{a} my {m}.'
    lead = 'Ask the question.' if k == 0 else 'Ask!'
    # 2026-11-04 老師：學生自己問答要有提示 → 半提示字卡（Who's ___? 加男女圖示／He's my ___.）
    S += [('07-quiz', 'cosmo', 'say', lead, f"family；quiz:{m}；card:Who's ___?；{p}"), ('07-quiz', '-', 'turn', SENT_TURN, f"family；quiz:{m}；card:Who's ___?；{p}；倒數條"),
          ('07-quiz', 'cosmo', 'say', q, f'family；quiz:{m}；card:{q}；fall；{p}'),
          ('07-quiz', 'nova', 'say', 'Now answer!', f"family；quiz:{m}；card:{a} my ___.；{p}"), ('07-quiz', '-', 'turn', SENT_TURN, f"family；quiz:{m}；card:{a} my ___.；{p}；倒數條"),
          ('07-quiz', 'nova', 'say', ans + (' Great job, class!' if k == len(QUIZ) - 1 else ''), f'family；quiz:{m}；揭曉；card:{ans}；{p}')]
# 8 複習與再見
S += [('08-end', 'nova', 'say', "Today we learned two questions. Who's he? Who's she?", "card:Who's he? / Who's she?；fall"),
      ('08-end', 'cosmo', 'say', "And the answers. He's my father. She's my mother.", "card:He's my father. / She's my mother.；he；she"),
      ('08-end', 'nova', 'zh', "問男生說 Who's he?，回答 He's my 加家人；問女生說 Who's she?，回答 She's my 加家人。記得 Who's、He's、She's 都是縮寫喔！", '三張字卡排在一起'),
      ('08-end', 'cosmo', 'say', 'See you next time!', 'Cosmo 比讚 P07'),
      ('08-end', 'nova', 'say', 'Bye-bye, class!', '兩位老師揮手 P02')]
SCRIPT = S
