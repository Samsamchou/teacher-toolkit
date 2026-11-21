"""故事 3（＋ies：Zun-Bo 的風箏）配音＋強制對齊：python cutout/make_voices_s3.py [id…]
→ audio/story/C01–C09.wav、_phones.json、audio/story/manifest_s3.json（不動 manifest.json）。聲線 V 從 make_voices 匯入。
「Which word?」沿用 AQ0；三選一答案句沿用 C04、C07、C08。"""
import os, sys, json
import soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lipsync as L
from make_voices import V

LINES = [
 ('C01', 'zunbo', "Hi! I'm Zun-Bo. I study English in my free time."),
 ('C02', 'ken', "He's Zun-Bo. He studies English in his free time."),
 ('C03', 'narrator', "Today is Sunday. It's windy."),
 ('C04', 'narrator', "Ken flies a kite."),
 ('C05', 'narrator', "Zun-Bo tries to fly the kite, too."),
 ('C06', 'narrator', "Oh no! The kite is in the tree."),
 ('C07', 'narrator', "Zun-Bo cries."),
 ('C08', 'narrator', "Shuiling hurries to help."),
 ('C09', 'narrator', "Now Zun-Bo flies the kite. He is happy!"),
]

if __name__ == '__main__':
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); od = os.path.join(root, 'audio', 'story'); os.makedirs(od, exist_ok=True)
    only = sys.argv[1:]; man = []
    for lid, who, text in LINES:
        base = os.path.join(od, lid)
        if lid not in only and os.path.exists(base + '_phones.json'):
            a, sr = sf.read(base + '.wav')
        else:
            v, p = V[who]; a = L.make_line(text, v, base, pitch=p)['audio']; print('ok', lid, who, round(len(a)/L.SR, 2), flush=True)
        man.append(dict(id=lid, who=who, text=text, dur=round(len(a)/L.SR, 3)))
    json.dump(man, open(os.path.join(od, 'manifest_s3.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('total', round(sum(m['dur'] for m in man), 1), 's')
