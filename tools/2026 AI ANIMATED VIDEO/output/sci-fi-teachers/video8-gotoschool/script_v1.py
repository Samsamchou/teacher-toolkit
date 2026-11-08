"""script_v1.py — 影片 8〈I go to school by bus.〉腳本（HWG7 U02 Listen, Say, and Number「Transportation」＋ p.29 文法，六年級上；
規格卡 rdq/RDQ-spec-video8-go-to-school-20261108.md，2026-11-08 confirmed：10–12 分鐘、只教 I／He／She、情境動畫用畫風 H 桌上微縮）。
十位朋友、聲音、國旗沿用影片 7；每位朋友一種交通工具。
每一筆：(段落, 角色, 種類, 內容, 畫面)；角色 nova／cosmo／relay／朋友名小寫／-；種類 say、zh、turn（秒數）。
畫面標記：photo:chou＝老師本人照片、ride:X＝交通工具圖卡、kid:X＝朋友＋交通工具卡、card:、中文 X、clap:X＝音節方塊＋拍手、
byon＝by／on 對照卡、grammar＝I→go、He/She/人名→goes 表、goes＝go→goes 變身、he／she、story:X＝桌上微縮情境動畫（畫風 H）、quiz:X、gogoes:X。
規則：Repeat after me；不寫音標與「／」；整串字用 relay；學生跟唸句子留 3 秒。
"""
CHUNK_TURN, SENT_TURN, CLAP_TURN = 2.0, 3.0, 3.5

def repeat(sec, who, text, turn, vis, rounds=2):
    out = [(sec, who, 'say', f'Repeat after me. {text}', vis + '；第 1 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]
    if rounds == 2: out += [(sec, who, 'say', text, vis + '；第 2 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]
    return out

# 單字（課本 8＋school＋老師補充 2）：(英文, 中文, 動詞種類)
WORDS = [('by bike', '騎腳踏車', '騎'), ('by bus', '搭公車', '搭'), ('by car', '搭汽車', '搭'), ('by metro. By MRT', '搭捷運', '搭'),
         ('by scooter', '騎機車', '騎'), ('by taxi', '搭計程車', '搭'), ('by train', '搭火車', '搭'),
         ('on foot', '走路', '走'), ('by boat', '搭船', '搭'), ('by plane', '搭飛機', '搭'), ('school', '學校', '')]
# 十位朋友：(名字, he/she, 國名, 交通工具, 中文句意)
KIDS = [('Mia', 'she', 'Australia', 'by boat', '她搭船上學。'),
        ('Raj', 'he', 'India', 'by train', '他搭火車上學。'),
        ('Yuki', 'she', 'Japan', 'by bike', '她騎腳踏車上學。'),
        ('Wei', 'he', 'Singapore', 'by MRT', '他搭捷運上學。'),
        ('Sofia', 'she', 'Spain', 'by plane', '她搭飛機上學。'),
        ('Kai', 'he', 'Taiwan', 'by scooter', '他坐機車上學。'),
        ('Lily', 'she', 'the UK', 'by bus', '她搭公車上學。'),
        ('Tom', 'he', 'the USA', 'by car', '他搭汽車上學。'),
        ('Jisu', 'she', 'Korea', 'by taxi', '她搭計程車上學。'),
        ('Nam', 'he', 'Vietnam', 'on foot', '他走路上學。')]
K = {k[0]: k for k in KIDS}
# 拍音節（字典：Cambridge）：方塊與重音位置；送給 TTS 的拼法另寫（全大寫會被拼成字母）
SYL = {'metro': (['me', 'tro'], 0), 'MRT': (['M', 'R', 'T'], 2), 'scooter': (['scoo', 'ter'], 0), 'taxi': (['tax', 'i'], 0)}
SYL_TTS = {'metro': 'Meh... troh.', 'MRT': 'M... R... T.', 'scooter': 'Skoo... ter.', 'taxi': 'Tack... see.'}
def syl_line(w):
    parts, st = SYL[w]
    return ', '.join(p.upper() if i == st and len(parts) > 1 and len(p) > 1 else p for i, p in enumerate(parts)) + '!'
def he(p): return 'He' if p == 'he' else 'She'

S = []
# 1 開場：Mr. Chou 本人照片（Canva 第 2 頁）
S += [('01-open', 'nova', 'say', "Hi, class! I'm Ms. Nova.", 'Nova 揮手 P02，名牌在臉旁'),
      ('01-open', 'cosmo', 'say', "And I'm Mr. Cosmo! How do you go to school?", 'Cosmo 揮手 P02'),
      ('01-open', 'nova', 'say', 'Look! This is Mr. Chou, your English teacher. He goes to school by car.', 'photo:chou；card:He goes to school by car.'),
      ('01-open', 'nova', 'zh', '這是周老師。他搭汽車上學。今天要學交通工具，還要學會說「我怎麼上學」。', 'photo:chou；中文 他搭汽車上學。')]

# 2 單字：交通工具圖卡＋Repeat after me 兩輪；騎／搭；by 和 on foot
S += [('02-words', 'cosmo', 'say', "Let's learn how we go to school!", 'ride 總覽（十一張圖卡）'),
      ('02-words', 'nova', 'zh', '看圖，跟著唸兩次。', 'ride 總覽')]
for i, (w, zh, v) in enumerate(WORDS):
    S += repeat('02-words', 'cosmo' if i % 2 else 'nova', f'{w[0].upper() + w[1:]}.', CHUNK_TURN, f'ride:{w}；card:{w}；中文 {zh}', rounds=1 if w == 'school' else 2)
S += [('02-words', 'cosmo', 'zh', 'metro 和 MRT 都是捷運。MRT 是三個字母，一個一個唸。', 'ride:by metro；card:by metro = by MRT'),
      ('02-words', 'nova', 'say', 'By bike. By scooter. We ride!', 'byon；騎：bike、scooter 亮'),
      ('02-words', 'nova', 'zh', '腳踏車、機車是「騎」；公車、汽車、捷運、計程車、火車、船、飛機是「搭」。', 'byon；騎／搭 兩欄'),
      ('02-words', 'cosmo', 'say', 'Walking? Say: on foot. Not by foot!', 'byon；on foot 發光；by foot 打叉'),
      ('02-words', 'cosmo', 'zh', '走路要說 on foot，不能說 by foot。其他交通工具前面都用 by。', 'byon；on 圈起來')]
S += repeat('02-words', 'cosmo', 'On foot.', CHUNK_TURN, 'byon；ride:on foot', rounds=1)
S += [('02-words', 'nova', 'say', "Let's say them all together!", 'ride 總覽'),
      ('02-words', 'relay', 'say', 'By bike, by bus, by car, by metro, by MRT, by scooter, by taxi, by train, on foot, by boat, by plane!', 'ride 總覽；接力，唸到誰亮誰')]

# 3 拍音節：bike 一拍對照；metro、MRT、scooter、taxi
S += [('03-clap', 'nova', 'say', "Now, let's clap the beats!", 'clap:metro；示範'),
      ('03-clap', 'nova', 'zh', '一拍拍一下手。大大的那一拍要唸得比較重。', 'clap:metro；示範')]
for i, w in enumerate(SYL):
    t = 'nova' if i % 2 == 0 else 'cosmo'; n = len(SYL[w][0])
    S += [('03-clap', t, 'say', f'{w}.', f'clap:{w}；ride:{w}；整個字'),
          ('03-clap', t, 'say', syl_line(w), f'clap:{w}；拍手 {n} 下'),
          ('03-clap', '-', 'turn', CLAP_TURN, f'clap:{w}；Your turn! 拍手跟唸！')]
S += [('03-clap', 'cosmo', 'zh', 'bike、bus、car、train 都只有一拍；MRT 是一個一個字母唸，最後一個字母最重。', 'clap:MRT'),
      ('03-clap', 'nova', 'say', 'Great clapping!', 'Nova 比讚 P07')]

# 4 I go to school ___.：十位朋友用自己的聲音說 → 學生跟唸
S += [('04-igo', 'cosmo', 'say', 'Now, our friends will tell us. Listen!', 'world（朋友＋交通工具卡）'),
      ('04-igo', 'nova', 'zh', 'I go to school 就是「我去上學」，後面加交通工具。聽朋友說，跟著唸。', 'world')]
for name, p, ctry, ride, zh in KIDS:
    line = f'I go to school {ride}.'
    S += [('04-igo', name.lower(), 'say', f"I'm {name}. {line}", f'kid:{name}；ride:{ride}；card:{line}；朋友說話'),
          ('04-igo', '-', 'turn', SENT_TURN, f'kid:{name}；card:{line}；Your turn! 換你唸！')]
S += [('04-igo', 'cosmo', 'say', 'Now you! How do you go to school?', 'card:I go to school ___.'),
      ('04-igo', 'cosmo', 'zh', '你怎麼上學？走路就說 on foot，坐爸媽的機車就說 by scooter。', 'card:I go to school ___.；ride:on foot；ride:by scooter')]
S += repeat('04-igo', 'cosmo', 'I go to school on foot.', SENT_TURN, 'card:I go to school on foot.；ride:on foot', rounds=1)
S += repeat('04-igo', 'nova', 'I go to school by scooter.', SENT_TURN, 'card:I go to school by scooter.；ride:by scooter', rounds=1)

# 5 文法：I → go；He／She／人名 → goes；go → goes 變身＋唸法
S += [('05-goes', 'nova', 'say', 'Now look. I go. But he goes. She goes.', 'grammar；I go 亮'),
      ('05-goes', 'nova', 'zh', '說自己用 I go。說他、說她，或說一個人的名字，go 要變成 goes。', 'grammar；He、She、人名 亮；go 變 goes'),
      ('05-goes', 'cosmo', 'say', 'Go... plus E, S... goes!', 'goes；e、s 飛進來發光'),
      ('05-goes', 'cosmo', 'zh', 'go 後面加 e、s。注意聽，goes 的最後有一個 z 的聲音。', 'goes；完成')]
S += repeat('05-goes', 'cosmo', 'Go. Goes.', CHUNK_TURN, 'goes')
S += [('05-goes', 'nova', 'say', 'This is Lily. She goes to school by bus.', 'kid:Lily；card:She goes to school by bus.；she'),
      ('05-goes', 'nova', 'zh', '介紹女生用 She goes，她去上學。', 'kid:Lily；she；中文 她搭公車上學。'),
      ('05-goes', 'cosmo', 'say', 'This is Raj. He goes to school by train.', 'kid:Raj；card:He goes to school by train.；he'),
      ('05-goes', 'cosmo', 'zh', '介紹男生用 He goes，他去上學。', 'kid:Raj；he；中文 他搭火車上學。'),
      ('05-goes', 'nova', 'say', 'Yuki goes to school by bike. A name... goes!', 'kid:Yuki；card:Yuki goes to school by bike.；人名 圈起來'),
      ('05-goes', 'nova', 'zh', '直接說名字也一樣，要用 goes。', 'kid:Yuki；人名 圈起來')]
S += repeat('05-goes', 'nova', 'She goes to school by bus.', SENT_TURN, 'kid:Lily；card:She goes to school by bus.；she', rounds=1)
S += repeat('05-goes', 'cosmo', 'He goes to school by train.', SENT_TURN, 'kid:Raj；card:He goes to school by train.；he', rounds=1)

# 6 情境動畫（畫風 H 桌上微縮）：桌上小鎮的早晨，十位朋友搭不同交通工具到紙箱學校
S += [('06-story', 'nova', 'say', "It's morning in Story Town. Let's watch!", 'story:open；桌上小鎮全景、紙箱學校、太陽升起'),
      ('06-story', 'cosmo', 'zh', '看朋友們怎麼上學。先聽，再換你說 He goes 或 She goes。', 'story:open')]
for name, p, ctry, ride, zh in KIDS:
    S += [('06-story', name.lower(), 'say', f'I go to school {ride}.', f'story:{name}；{name} 立牌＋{ride} 出發；字幕'),
          ('06-story', 'nova' if p == 'she' else 'cosmo', 'say', f'{he(p)} goes to school {ride}.', f'story:{name}；card:{he(p)} goes to school {ride}.；{p}'),
          ('06-story', '-', 'turn', SENT_TURN, f'story:{name}；card:{he(p)} goes to school {ride}.；Your turn! 換你唸！')]
S += [('06-story', 'nova', 'say', 'Everyone is at school. Good morning!', 'story:end；十位朋友在紙箱學校前；鐘響')]

# 7 Game time：看情境動畫猜交通工具（3 題）＋聽句子選 go／goes（3 題）
S += [('07-quiz', 'cosmo', 'say', 'Game time! How does she go to school?', 'quiz:by boat；story 片段，交通工具先遮住'),
      ('07-quiz', 'cosmo', 'zh', '看動畫，說出交通工具。', 'quiz:by boat')]
for k, (name, ride) in enumerate([('Mia', 'by boat'), ('Jisu', 'by taxi'), ('Nam', 'on foot')]):
    p = K[name][1]; t, o = ('cosmo', 'nova') if k % 2 == 0 else ('nova', 'cosmo')
    S += ([] if k == 0 else [('07-quiz', t, 'say', f'And {name}?', f'quiz:{ride}；story 片段遮住')]) + \
         [('07-quiz', '-', 'turn', SENT_TURN, f'quiz:{ride}；倒數條'),
          ('07-quiz', o, 'say', f'{he(p)} goes to school {ride}!', f'quiz:{ride}；揭曉；card:{he(p)} goes to school {ride}.')]
S += [('07-quiz', 'nova', 'say', 'Now, go or goes? Listen!', 'gogoes；兩個按鈕 go／goes'),
      ('07-quiz', 'nova', 'zh', '聽句子，選 go 還是 goes。', 'gogoes')]
for subj, ride in [('I', 'by bike'), ('Wei', 'by MRT'), ('She', 'by plane')]:
    ans = 'go' if subj == 'I' else 'goes'
    S += [('07-quiz', 'cosmo', 'say', f'{subj}... blank... to school {ride}.', f'gogoes:{subj} ___ to school {ride}.'),
          ('07-quiz', '-', 'turn', SENT_TURN, f'gogoes:{subj} ___ to school {ride}.；倒數條'),
          ('07-quiz', 'nova', 'say', f'{ans.capitalize()}! {subj} {ans} to school {ride}.', f'gogoes:{subj} {ans} to school {ride}.；揭曉 {ans}')]

# 8 複習
S += [('08-end', 'nova', 'say', 'Today we learned: I go to school by bus.', 'card:I go to school by bus.'),
      ('08-end', 'cosmo', 'say', 'He goes to school by train. She goes to school by bike.', 'card:He goes… / She goes…；he；she'),
      ('08-end', 'nova', 'zh', '說自己用 I go；說他、她或名字用 goes。走路是 on foot，其他用 by！', '三張字卡排在一起＋by／on'),
      ('08-end', 'cosmo', 'say', 'How do you go to school? Tell your friends!', 'ride 總覽'),
      ('08-end', 'nova', 'say', 'Bye-bye, class!', '兩位老師揮手 P02')]
SCRIPT = S

if __name__ == '__main__':
    import re
    words = sum(len(re.findall(r"[A-Za-z']+", t)) for _, _, k, t, _ in S if k == 'say')
    zh = sum(len(t) for _, _, k, t, _ in S if k == 'zh'); turns = sum(t for _, _, k, t, _ in S if k == 'turn')
    est = (words / 2.0 * 1.25 + zh / 4.0 * 1.25 + turns + 0.6 * len(S)) * 0.865
    print(f'{len(S)} 筆；英文 {words} 字、中文 {zh} 字、留白 {turns:.0f} 秒；推估 {est/60:.1f} 分鐘')
    secs = {}
    for s, *_ in S: secs[s] = secs.get(s, 0) + 1
    print(secs)
    for w in SYL: print(w, '→', syl_line(w))
