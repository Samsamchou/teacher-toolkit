"""talk_shots.py — 影片 6 對話華麗版的逐句鏡頭表（規格卡 rdq/RDQ-spec-video6-is-she-from-20261105.md）。
每句：(Amy 姿勢, Ben 姿勢, 鏡頭, 鏡頭運動, 特效清單, 發光的照片卡)
鏡頭：wide＝全部；two＝Amy＋Ben；amy／ben＝單人中景；pics＝Ben＋右側兩張照片卡（Ben 回答時）。
Amy 姿勢：ask（影片 5，指向右側）、wave、nod、puzzled、cheer（沒有斜臉嘴型，說話句不用）；Ben：sheet、nod、shake、excited、cheer（show 是抱吉他，不用）。
說話句一律用有斜臉嘴型的姿勢、不用近景（影片 2、3 的教訓）。
"""
SHOTS = {
 1: [('ask',     'sheet',   'wide', 'pan',  ['question'], 'Sofia'),   # Amy: Ben, look at this photo! Is she from Spain?
     ('ask',     'nod',     'pics', 'push', ['sparkle'],  'Sofia'),   # Ben: Yes, she is. She's Sofia.
     ('ask',     'nod',     'wide', 'hold', ['question'], 'Nam'),     # Amy: And is he from Japan?
     ('ask',     'shake',   'pics', 'push', ['sparkle'],  'Nam'),     # Ben: No, he isn't. He's from Vietnam. He's Nam.
     ('wave',    'cheer',   'wide', 'pan',  ['stars'],    None)],     # Amy: Cool!
 2: [('wave',    'excited', 'two',  'push', ['stars'],    None),      # Ben: Wow! Happy International Day, Amy!
     ('ask',     'sheet',   'wide', 'hold', ['question'], 'Wei'),     # Amy: Look, Ben! Is he from Singapore?
     ('ask',     'nod',     'pics', 'push', ['sparkle'],  'Wei'),     # Ben: Yes, he is.
     ('ask',     'nod',     'wide', 'hold', ['question'], 'Mia'),     # Amy: Is she from the UK?
     ('ask',     'shake',   'pics', 'push', ['sparkle'],  'Mia'),     # Ben: No, she isn't. She's from Australia.
     ('nod',     'nod',     'two',  'push', ['sparkle'],  None)],     # Amy: Oh, I see!
 3: [('puzzled', 'sheet',   'two',  'push', ['question'], None),      # Amy: Ben, who are your new pen pals?
     ('puzzled', 'nod',     'pics', 'push', ['sparkle'],  'Kai'),     # Ben: Look! He's Kai.
     ('ask',     'sheet',   'wide', 'hold', ['question'], 'Kai'),     # Amy: Is he from Taiwan, too?
     ('ask',     'nod',     'pics', 'push', ['sparkle'],  'Kai'),     # Ben: Yes, he is!
     ('ask',     'nod',     'wide', 'hold', ['question'], 'Lily'),    # Amy: Is she from the USA?
     ('ask',     'shake',   'pics', 'push', ['sparkle'],  'Lily'),    # Ben: No, she isn't. She's from the UK. She's Lily.
     ('wave',    'cheer',   'wide', 'pan',  ['stars'],    None)],     # Amy: Hello, Kai! Hello, Lily!
}
SCENE = {1: 'scene-photowall', 2: 'scene-intlday', 3: 'scene-videocall'}
PHOTOS = {1: ['Sofia', 'Nam'], 2: ['Wei', 'Mia'], 3: ['Kai', 'Lily']}
