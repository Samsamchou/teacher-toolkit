"""script_v1.py — 影片 9〈I'm going to the ___.〉腳本（HWG5 U03 Places，五年級上）。
規格卡：rdq/RDQ-spec-video9-going-to-places-20261118.md（情境動畫＋2 ICONS 練習）、rdq/RDQ-spec-video9-vocab-phonics-20261118.md（單字教學）。
每一筆：(段落, 角色, 種類, 內容, 畫面)；角色 nova／cosmo／ken／relay／-；種類 say、zh、sound（發音音檔，phonics-audio/processed/ 檔名）、turn（秒數）。
畫面標記（全形分號分隔）：word:X＝單字大卡（地點圖＋單字）；hi:X:色＝單字裡標顏色的字母；ex:A,B＝兩個例字卡；clap:X＝音節方塊＋拍手；
  places＝9 張地點卡總覽；card:＝字卡；story:SID＝桌上微縮情境動畫（畫風 H，聲音在 part9.wav）；icons:地點＝2 ICONS 1 PLACE。
發音：短 a、er、短 o、短 i 用老師錄音；ar、oo、long a 用 Wikimedia Commons（老師沒錄的音，不用 TTS）；-tion 是音節，用 TTS 唸 shun。
顏色：ar 紅、er 藍、oo 綠、短母音橘、ai 紫、-tion 粉紅。
"""
SOUND_TURN, WORD_TURN, SENT_TURN, CLAP_TURN = 2.0, 2.0, 3.0, 3.5

SOUND = {'short a': 'short-a-1', 'ar': 'En-us-are', 'er': 'ref-er-1', 'oo': 'Near-close_near-back_rounded_vowel',
         'short o': 'short-o-1', 'short i': 'short-i-1', 'long a': 'En-us-A_upper'}


def drill(sec, who, clip, vis):
    """發音：示範一次 → Repeat after me → 兩輪（播音＋2 秒）。"""
    return [(sec, who, 'sound', clip, vis + '；示範'),
            (sec, who, 'say', 'Repeat after me.', vis),
            (sec, who, 'sound', clip, vis + '；第 1 輪'), (sec, '-', 'turn', SOUND_TURN, vis + '；Your turn! 換你唸！'),
            (sec, who, 'sound', clip, vis + '；第 2 輪'), (sec, '-', 'turn', SOUND_TURN, vis + '；Your turn! 換你唸！')]


def repeat(sec, who, text, turn, vis, rounds=2):
    out = [(sec, who, 'say', f'Repeat after me. {text}', vis + '；第 1 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]
    if rounds == 2: out += [(sec, who, 'say', text, vis + '；第 2 輪'), (sec, '-', 'turn', turn, vis + '；Your turn! 換你唸！')]
    return out


# 音節字（Cambridge 美式）：方塊、重音位置；送 TTS 的拼法另寫
SYL = {'museum': (['mu', 'se', 'um'], 1), 'library': (['li', 'brar', 'y'], 0), 'post office': (['post', 'of', 'fice'], 0),
       'hospital': (['hos', 'pi', 'tal'], 0)}
SYL_TTS = {'museum': 'Mew... ZEE... um.', 'library': 'LIE... brare... ree.', 'post office': 'POHST... aw... fiss.', 'hospital': 'HOSS... pih... tull.'}


def syl_line(w):
    parts, st = SYL[w]
    return ', '.join(p.upper() if i == st else p for i, p in enumerate(parts)) + '!'


S = []
# 1 開場
S += [('01-open', 'nova', 'say', "Hi, class! I'm Ms. Nova.", 'Nova 揮手 P02，名牌在臉旁'),
      ('01-open', 'cosmo', 'say', "And I'm Mr. Cosmo! Where are you going today?", 'Cosmo 揮手 P02'),
      ('01-open', 'nova', 'say', "Today, let's learn places in a town!", 'places（9 張地點卡）'),
      ('01-open', 'nova', 'zh', '今天要學城鎮裡的地方，還要學會說「我要去哪裡」。', 'places')]

# 2 有規則的字：bank → park → supermarket → bookstore → hospital → train station
S += [('02-rule', 'cosmo', 'say', 'Some words have letters that make special sounds. Look and listen!', 'places；規則字亮起'),
      ('02-rule', 'cosmo', 'zh', '先學有規則的字。看顏色，聽聲音。', 'places')]
# bank：短 a
v = 'word:bank；hi:a:橘'
S += [('02-bank', 'nova', 'say', 'This is a bank. Look at the letter A.', v)]
S += drill('02-bank', 'nova', SOUND['short a'], v + '；a 發音按鈕')
S += [('02-bank', 'nova', 'say', 'Cat. Hat. Bank!', v + '；ex:cat,hat；a 都是橘色')]
S += repeat('02-bank', 'nova', 'Bank.', WORD_TURN, v)
S += [('02-bank', 'cosmo', 'zh', 'bank 就是「銀行」。短母音 a，嘴巴張大往兩邊拉。', v + '；「銀行」')]
# park：ar
v = 'word:park；hi:ar:紅'
S += [('02-park', 'cosmo', 'say', 'This is a park. Look at A and R. Together, they make this sound.', v)]
S += drill('02-park', 'cosmo', SOUND['ar'], v + '；ar 發音按鈕')
S += [('02-park', 'cosmo', 'say', 'Car. Star. Park!', v + '；ex:car,star；ar 都是紅色')]
S += repeat('02-park', 'cosmo', 'Park.', WORD_TURN, v)
S += [('02-park', 'nova', 'zh', 'park 就是「公園」。a 和 r 在一起，嘴巴張大，舌頭往後捲。', v + '；「公園」')]
# supermarket：er＋ar
v = 'word:supermarket；hi:er:藍；hi:ar:紅'
S += [('02-super', 'nova', 'say', 'This is a supermarket. Look at E and R.', v + '；er 先亮')]
S += drill('02-super', 'nova', SOUND['er'], v + '；er 發音按鈕')
S += [('02-super', 'nova', 'say', 'Sister. Brother. Super!', v + '；ex:sister,brother；er 都是藍色'),
      ('02-super', 'cosmo', 'say', 'And look! A and R again. Market!', v + '；ar 亮；和 park 一樣'),
      ('02-super', 'cosmo', 'say', 'Su... per... mar... ket. Supermarket!', v + '；分開再合起')]
S += repeat('02-super', 'cosmo', 'Supermarket.', WORD_TURN, v)
S += [('02-super', 'nova', 'zh', 'supermarket 就是「超市」。前面的 er 和 park 學過的 ar，都在這個字裡。', v + '；「超市」')]
# bookstore：只教 book 的 oo
v = 'word:bookstore；hi:oo:綠'
S += [('02-book', 'cosmo', 'say', 'This is a bookstore. Look at O and O in book.', v)]
S += drill('02-book', 'cosmo', SOUND['oo'], v + '；oo 發音按鈕')
S += [('02-book', 'cosmo', 'say', 'Look. Cook. Book!', v + '；ex:look,cook；oo 都是綠色'),
      ('02-book', 'nova', 'say', 'Book... store. Bookstore!', v + '；book＋store 合起來')]
S += repeat('02-book', 'nova', 'Bookstore.', WORD_TURN, v)
S += [('02-book', 'cosmo', 'zh', 'bookstore 就是「書店」，book 書，加上 store 商店。oo 在這裡唸短短的音。', v + '；「書店」')]
# hospital：短 o、短 i
v = 'word:hospital；hi:o:橘；hi:i:橘'
S += [('02-hosp', 'nova', 'say', 'This is a hospital. Look at the letter O.', v + '；o 先亮')]
S += drill('02-hosp', 'nova', SOUND['short o'], v + '；o 發音按鈕')
S += [('02-hosp', 'nova', 'say', 'Hot. Dog. Hos!', v + '；ex:hot,dog'),
      ('02-hosp', 'cosmo', 'say', 'Now look at the letter I.', v + '；i 亮')]
S += drill('02-hosp', 'cosmo', SOUND['short i'], v + '；i 發音按鈕')
S += [('02-hosp', 'cosmo', 'say', 'Sit. Pig. Pi!', v + '；ex:sit,pig'),
      ('02-hosp', 'nova', 'say', 'hospital.', v + '；clap:hospital；整個字'),
      ('02-hosp', 'nova', 'say', syl_line('hospital'), v + '；clap:hospital；拍手 3 下'),
      ('02-hosp', '-', 'turn', CLAP_TURN, v + '；clap:hospital；Your turn! 拍手跟唸！')]
S += repeat('02-hosp', 'nova', 'Hospital.', WORD_TURN, v)
S += [('02-hosp', 'cosmo', 'zh', 'hospital 就是「醫院」。o 和 i 都是短母音，第一拍最重。', v + '；「醫院」')]
# train station：ai＝long a、-tion
v = 'word:train station；hi:ai:紫；hi:tion:粉紅'
S += [('02-station', 'cosmo', 'say', 'This is a train station. Look at A and I in train. They say A!', v + '；ai 亮')]
S += drill('02-station', 'cosmo', SOUND['long a'], v + '；ai 發音按鈕')
S += [('02-station', 'cosmo', 'say', 'Rain. Wait. Train!', v + '；ex:rain,wait；ai 都是紫色'),
      ('02-station', 'nova', 'say', 'Now look at T, I, O, N. It says shun.', v + '；tion 亮'),
      ('02-station', 'nova', 'say', 'Sta... tion. Station!', v + '；分開再合起')]
S += repeat('02-station', 'nova', 'Train station.', WORD_TURN, v)
S += [('02-station', 'cosmo', 'zh', 'train station 就是「火車站」。ai 唸成字母 A 的音；tion 唸 shun。', v + '；「火車站」')]

# 3 拍音節：museum、library、post office
S += [('03-clap', 'nova', 'say', "These words have no easy rules. Let's clap the beats!", 'clap:museum；示範'),
      ('03-clap', 'nova', 'zh', '這幾個字沒有好用的規則，我們拍手數音節。大大的那一拍要唸得比較重。', 'clap:museum；示範')]
for i, w in enumerate(['museum', 'library', 'post office']):
    t = 'nova' if i % 2 == 0 else 'cosmo'
    S += [('03-clap', t, 'say', f'This is a {w}. {w.capitalize()}.', f'word:{w}；clap:{w}；整個字'),
          ('03-clap', t, 'say', syl_line(w), f'clap:{w}；拍手 3 下'),
          ('03-clap', '-', 'turn', CLAP_TURN, f'clap:{w}；Your turn! 拍手跟唸！')]
    S += repeat('03-clap', t, f'{w.capitalize()}.', WORD_TURN, f'word:{w}', rounds=1)
S += [('03-clap', 'cosmo', 'zh', 'museum 是「博物館」，重音在第二拍；library 是「圖書館」；post office 是「郵局」。', 'word:museum；word:library；word:post office'),
      ('03-clap', 'cosmo', 'say', 'Post. Most. Host. The O is long!', 'card:post most host；ost 圈起來；o 上面有長音符號'),
      ('03-clap', 'cosmo', 'zh', 'ost 小家族：post、most、host 的 o 都唸長長的 o，不是短母音。', 'card:post most host')]

# 4 九個字快速複習
S += [('04-review', 'nova', 'say', "Let's say them all together!", 'places'),
      ('04-review', 'relay', 'say', 'Bank, park, supermarket, bookstore, hospital, train station, museum, library, post office!', 'places；接力，唸到誰亮誰')]

# 5 句型：Where are you going? I'm going to the ___.
S += [('05-sent', 'cosmo', 'say', 'Where are you going?', 'card:Where are you going?；Cosmo 問'),
      ('05-sent', 'nova', 'say', "I'm going to the park.", "card:I'm going to the park.；word:park"),
      ('05-sent', 'nova', 'zh', "Where are you going? 是問「你要去哪裡？」回答 I'm going to the，再加地方，就是「我要去……」。", "card:I'm going to the ___.；「我要去……」"),
      ('05-sent', 'cosmo', 'zh', "I'm 就是 I am。地方前面記得加 the。", "card:I'm = I am；the 圈起來")]
S += repeat('05-sent', 'cosmo', 'Where are you going?', SENT_TURN, 'card:Where are you going?', rounds=1)
S += repeat('05-sent', 'nova', "I'm going to the park.", SENT_TURN, "card:I'm going to the park.；word:park", rounds=1)
S += repeat('05-sent', 'nova', "I'm going to the library.", SENT_TURN, "card:I'm going to the library.；word:library", rounds=1)

# 6 情境動畫（畫風 H 桌上微縮，聲音在 part9.wav；台詞照網站 Guess 版 listen.json）
STORY = [('POST', 'Monday', 'cloudy', 'I want to send a letter.', 'post office'),
         ('SUPER', 'Sunday', 'sunny', 'I want to buy some cookies.', 'supermarket'),
         ('LIB', 'Wednesday', 'rainy', 'I want to read some books.', 'library'),
         ('HOSP', 'Thursday', 'cold', 'I want to see a doctor.', 'hospital'),
         ('PARK', 'Saturday', 'sunny', 'I want to fly a kite.', 'park'),
         ('BOOK', 'Thursday', 'sunny', 'I want to buy a comic book.', 'bookstore'),
         ('MUSEUM', 'Sunday', 'cloudy', 'I want to see old trains.', 'museum'),
         ('STATION', 'Monday', 'rainy', 'I want to take a train.', 'train station')]
S += [('06-story', 'nova', 'say', "This is Ken. Let's go around Ershui with Ken!", 'story:OPEN；桌上微縮二水小鎮全景'),
      ('06-story', 'cosmo', 'zh', 'Ken 要去哪裡？先聽他說，再猜猜看，然後換你說。', 'story:OPEN')]
for sid, day, wx, reason, place in STORY:
    S += [('06-story', 'ken', 'say', f"It's {day}. It's {wx} today.", f'story:{sid}；DAY 卡 {day}；WEATHER 卡 {wx}'),
          ('06-story', 'ken', 'say', reason, f'story:{sid}'),
          ('06-story', 'nova', 'say', 'Where are you going?', f'story:{sid}'),
          ('06-story', '-', 'turn', 3.0, f'story:{sid}；Guess! 3、2、1'),
          ('06-story', 'ken', 'say', f"I'm going to the {place}.", f'story:{sid}；Ken 走到 {place}，招牌跳出來'),
          ('06-story', '-', 'turn', SENT_TURN, f'story:{sid}；Your turn!')]

# 7 2 ICONS 1 PLACE（圖示沿用網站 Guess 版）
ICONS = [('library', '眼鏡＋書架'), ('hospital', '藥瓶＋聽診器'), ('park', '風箏＋盪鞦韆'), ('post office', '包裹＋郵票'), ('bookstore', '標價的書＋裝書的紙袋')]
S += [('07-quiz', 'cosmo', 'say', 'Game time! Two icons, one place. Where are you going?', 'icons:library；兩個圖示'),
      ('07-quiz', 'cosmo', 'zh', "看兩個圖示，猜地方，用 I'm going to the 說說看。", 'icons:library')]
for k, (place, desc) in enumerate(ICONS):
    t, o = ('cosmo', 'nova') if k % 2 == 0 else ('nova', 'cosmo')
    S += ([] if k == 0 else [('07-quiz', t, 'say', 'Where are you going?', f'icons:{place}；{desc}')]) + \
         [('07-quiz', '-', 'turn', SENT_TURN, f'icons:{place}；{desc}；倒數條'),
          ('07-quiz', o, 'say', f"I'm going to the {place}!", f"icons:{place}；揭曉 word:{place}；card:I'm going to the {place}.")]

# 8 複習＋結尾
S += [('08-end', 'nova', 'say', 'Where are you going?', 'card:Where are you going?'),
      ('08-end', 'cosmo', 'say', "I'm going to the supermarket!", "card:I'm going to the supermarket.；word:supermarket"),
      ('08-end', 'nova', 'zh', "今天學了九個地方。問人要去哪裡：Where are you going? 回答：I'm going to the，加上地方。", 'places'),
      ('08-end', 'cosmo', 'say', 'Where are YOU going after school? Tell your friends!', 'places'),
      ('08-end', 'nova', 'say', 'Bye-bye, class!', '兩位老師揮手 P02')]
SCRIPT = S

if __name__ == '__main__':
    import re
    words = sum(len(re.findall(r"[A-Za-z']+", t)) for _, _, k, t, _ in S if k == 'say')
    zh = sum(len(t) for _, _, k, t, _ in S if k == 'zh'); turns = sum(t for _, _, k, t, _ in S if k == 'turn')
    snd = sum(1 for _, _, k, *_ in S if k == 'sound')
    est = (words / 2.0 * 1.25 + zh / 4.0 * 1.25 + turns + snd * 1.2 + 0.6 * len(S)) * 0.865
    print(f'{len(S)} 筆；英文 {words} 字、中文 {zh} 字、發音 {snd} 次、留白 {turns:.0f} 秒；推估 {est/60:.1f} 分鐘')
    secs = {}
    for s, *_ in S: secs[s] = secs.get(s, 0) + 1
    print(secs)
    for w in SYL: print(w, '→', syl_line(w))
