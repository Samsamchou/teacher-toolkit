"""talk_shots.py — 對話動畫華麗版的逐句鏡頭表（對應 talk-storyboard-v2.md，老師 2026-10-30 通過）。
每句：(Amy 姿勢, Ben 姿勢, 鏡頭, 鏡頭運動, 特效清單)
鏡頭：wide＝兩人全身；two＝兩人中景；amy／ben＝單人中景；amy-close／ben-close＝單人近景；ben-insert＝道具特寫（Ben 手上）
運動：push＝慢慢推近；pushfast＝快速推近；pan＝往右平移；shake＝晃動；hold＝固定
特效：sparkle、question、question2bang、paint、sweat、cloud、glow、stars、speed、notes、spin
"""
SHOTS = {
 1: [('wave',    'sheet',   'wide',       'pan',      ['glow']),
     ('sheet',   'crayons', 'ben',        'push',     ['sparkle']),
     ('puzzled', 'crayons', 'amy-close',  'push',     ['question']),
     ('puzzled', 'excited', 'ben',        'hold',     ['paint']),
     ('shocked', 'sheet',   'amy-close',  'pushfast', ['sweat', 'cloud', 'shake']),
     ('sheet',   'offer',   'two',        'push',     ['sparkle']),
     ('hug',     'sheet',   'two',        'push',     ['stars'])],
 2: [('sheet',   'panic',   'wide',       'shake',    ['sweat', 'speed']),
     ('calm',    'panic',   'amy',        'hold',     ['glow']),
     ('calm',    'frozen',  'ben-close',  'push',     ['question2bang']),
     ('basketball', 'frozen', 'amy',      'hold',     ['spin']),
     ('cheer',   'cheer',   'wide',       'pan',      ['stars'])],
 3: [('point',   'case',    'wide',       'hold',     []),
     ('point',   'show',    'ben-insert', 'push',     ['sparkle']),
     ('puzzled', 'show',    'amy',        'hold',     ['stars']),
     ('sheet',   'strum',   'ben',        'hold',     ['notes']),
     ('sing',    'strum',   'two',        'push',     ['notes', 'stars'])],
}
SCENE = {1: 'scene-classroom', 2: 'scene-home', 3: 'scene-hallway'}
