"""talk_shots.py — 影片 3 對話華麗版的逐句鏡頭表（規格卡 RDQ-spec-video3-is-it-today-20261102；從影片 2 改寫）。
每句：(Amy 姿勢, Ben 姿勢, 鏡頭, 鏡頭運動, 特效清單)
鏡頭：wide＝兩人全身；two＝兩人中景；amy／ben＝單人中景（說話句一律不用近景，嘴型才看得清楚）
運動：push＝慢慢推近；pushfast＝快速推近；pan＝往右平移；shake＝晃動；hold＝固定
特效：sparkle、question、question2bang、paint、sweat、cloud、glow、stars、speed、notes、spin
新姿勢：nod（點頭說 Yes）、shake（搖頭說 No），影片 3 新生。
"""
SHOTS = {
 1: [('sheet',   'excited', 'two',  'push',     ['question']),          # Ben: Good morning, Amy! Is it Sunday today?
     ('shake',   'excited', 'amy',  'hold',     ['glow']),              # Amy: No, it isn't. It's Monday.
     ('shake',   'frozen',  'ben',  'pushfast', ['sweat', 'cloud']),    # Ben: Oh, no! I'm so sleepy.
     ('point',   'frozen',  'amy',  'push',     ['sparkle']),           # Amy: Look! We have P.E. class today.
     ('cheer',   'cheer',   'wide', 'pan',      ['stars'])],            # Ben: P.E. class? Yay! Let's go!
 2: [('basketball', 'sheet', 'amy', 'hold',     ['spin']),              # Amy: Ben, is it Friday today?
     ('basketball', 'nod',  'ben',  'push',     ['sparkle']),           # Ben: Yes, it is!
     ('basketball', 'nod',  'two',  'push',     ['spin']),              # Amy: Great! Let's play basketball after school.
     ('cheer',   'cheer',   'wide', 'pan',      ['stars'])],            # Ben: Sure! I love Fridays!
 3: [('sheet',   'crayons', 'ben',  'push',     ['question']),          # Ben: Amy, is it Wednesday today? I have my crayons.
     ('shake',   'crayons', 'amy',  'hold',     ['glow']),              # Amy: No, it isn't. It's Tuesday.
     ('shake',   'frozen',  'ben',  'pushfast', ['question2bang']),     # Ben: Tuesday? Oh, no! No art class today.
     ('sing',    'frozen',  'amy',  'hold',     ['notes']),             # Amy: That's OK. We have music class today. Let's sing!
     ('sing',    'nod',     'two',  'push',     ['notes', 'stars'])],   # Ben: Ha ha! OK!
}
SCENE = {1: 'scene-classroom', 2: 'scene-court', 3: 'scene-hallway'}
