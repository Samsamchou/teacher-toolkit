"""talk_shots.py — 影片 5 對話華麗版的逐句鏡頭表（規格卡 rdq/RDQ-spec-video5-whos-he-20261104.md）。
每句：(Amy 姿勢, Emma 姿勢, 鏡頭, 鏡頭運動, 特效清單, 發光的家人)
鏡頭：wide＝全部人；two＝Amy＋Emma；amy／emma＝單人中景；fam＝Emma＋兩位家人（Emma 介紹家人時）
Amy 姿勢：ask（2026-11-04 新生，指向右側問 Who's he?）、wave、cheer；Emma：wave、right（向右介紹家人）、left（向左招呼 Amy）、self。
"""
SHOTS = {
 1: [('ask',   'wave',  'wide', 'pan',  ['question'], 'father'),   # Amy: Bye, Emma! Oh, look! Who's he?
     ('ask',   'right', 'fam',  'push', ['sparkle'],  'father'),   # Emma: He's my father.
     ('ask',   'right', 'wide', 'hold', ['question'], 'mother'),   # Amy: And who's she?
     ('ask',   'right', 'fam',  'push', ['sparkle'],  'mother'),   # Emma: She's my mother.
     ('wave',  'wave',  'wide', 'pan',  ['stars'],    None)],      # Amy: Hello! Nice to meet you!
 2: [('ask',   'wave',  'wide', 'push', ['question'], 'grandfather'),   # Amy: Hi, Emma! Who's he?
     ('ask',   'right', 'fam',  'push', ['sparkle'],  'grandfather'),   # Emma: He's my grandfather.
     ('ask',   'right', 'wide', 'hold', ['question'], 'grandmother'),   # Amy: Who's she?
     ('ask',   'right', 'fam',  'push', ['sparkle'],  'grandmother'),   # Emma: She's my grandmother.
     ('wave',  'self',  'wide', 'pan',  ['stars'],    None)],           # Amy: They are so nice!（cheer 沒有斜臉嘴型，說話句用 wave）
 3: [('wave',  'wave',  'wide', 'pan',  ['stars'],    None),        # Amy: Happy birthday, Emma!
     ('cheer', 'left',  'two',  'push', ['sparkle'],  None),        # Emma: Thank you, Amy! Come in!
     ('ask',   'wave',  'wide', 'hold', ['question'], 'sister'),    # Amy: Who's she?
     ('ask',   'right', 'fam',  'push', ['sparkle'],  'sister'),    # Emma: She's my sister.
     ('ask',   'right', 'wide', 'hold', ['question'], 'brother'),   # Amy: Who's he? He's so cute!
     ('ask',   'right', 'fam',  'push', ['sparkle'],  'brother')],  # Emma: He's my brother.
}
SCENE = {1: 'scene-schoolgate', 2: 'scene-park', 3: 'scene-party'}
FAMILY = {1: ['father', 'mother'], 2: ['grandfather', 'grandmother'], 3: ['sister', 'brother']}
