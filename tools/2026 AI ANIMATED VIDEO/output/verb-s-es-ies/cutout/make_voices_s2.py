"""故事 2（＋es）配音＋強制對齊：python cutout/make_voices_s2.py [id…]
→ audio/story/<id>.wav、<id>_phones.json、audio/story/manifest_s2.json（不動 manifest.json）。
聲線從 make_voices.V 來（和故事 1 一致）。AQ0「Which word?」沿用現成音檔，只把資料抄進 manifest_s2。"""
import os, sys, json
import soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lipsync as L
from make_voices import V

LINES = [
 ('B01', 'shuiling', "Hi! I'm Shuiling. I go jogging in my free time."),
 ('B02', 'ken', "She's Shuiling. She goes jogging in her free time."),
 ('B03', 'narrator', "Today is Saturday. It's cloudy."),
 ('B04', 'narrator', "She goes jogging by the river."),
 ('B05', 'narrator', "She passes the old train station. Toot, toot!"),
 ('B06', 'narrator', "At home, she watches TV. Ha ha!"),
 ('B07', 'narrator', "She does her homework, too."),
 ('BQ1', 'narrator', "She passes the old train station."),      # 三選一答案句（不含狀聲詞）
 ('BQ2', 'narrator', "At home, she watches TV."),
 ('AQ0', 'narrator', "Which word?"),                             # 沿用故事 1 的音檔，不重做
]
REUSE = {'AQ0'}

if __name__ == '__main__':
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); od = os.path.join(root, 'audio', 'story'); os.makedirs(od, exist_ok=True)
    only = sys.argv[1:]; man = []
    for lid, who, text in LINES:
        base = os.path.join(od, lid)
        if lid in REUSE or (lid not in only and os.path.exists(base + '_phones.json')):
            a, sr = sf.read(base + '.wav')
        else:
            v, p = V[who]; a = L.make_line(text, v, base, pitch=p)['audio']; print('ok', lid, who, round(len(a)/L.SR, 2), flush=True)
        man.append(dict(id=lid, who=who, text=text, dur=round(len(a)/L.SR, 3)))
    json.dump(man, open(os.path.join(od, 'manifest_s2.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('total', round(sum(m['dur'] for m in man), 1), 's')
