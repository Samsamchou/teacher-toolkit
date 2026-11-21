"""三段故事配音＋強制對齊（畫風 J 對嘴用）：python cutout/make_voices.py [id…]
→ audio/story/<id>.wav、<id>_phones.json、audio/story/manifest.json。edge-tts 0.8 倍；聲線和講解段一致。"""
import os, sys, json
import soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lipsync as L, phalign as AL

V = dict(ken=('en-US-GuyNeural', '+18Hz'), mom=('en-US-AriaNeural', '+0Hz'), dad=('en-US-AndrewNeural', '+0Hz'),
         shuiling=('en-US-AnaNeural', '+0Hz'), zunbo=('en-US-AnaNeural', '-25Hz'), narrator=('en-US-JennyNeural', '+0Hz'))
LINES = [
 # 故事 1（＋s）
 ('A01', 'ken', "I'm Ken. I play baseball in my free time."),
 ('A02', 'ken', "She's my mom. She plays baseball in her free time, too."),
 ('A03', 'narrator', "Today is Sunday. It's sunny."),
 ('A04', 'ken', "We play baseball at the park."),
 ('A05', 'narrator', "Mom throws the ball."),
 ('A06', 'narrator', "Ken hits the ball. Wow!"),
 ('A07', 'narrator', "Mom runs fast."),
 ('A08', 'narrator', "She gets the ball!"),
 ('AQ0', 'narrator', "Which word?"),
 ('AQ2', 'narrator', "Ken hits the ball."),
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
    json.dump(man, open(os.path.join(od, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('total', round(sum(m['dur'] for m in man), 1), 's')
