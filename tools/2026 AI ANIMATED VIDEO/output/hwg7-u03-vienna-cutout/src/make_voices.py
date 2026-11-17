"""全片配音＋強制對齊：python src/make_voices.py  → audio/lines/<id>.wav、<id>_phones.json、audio/lines/manifest.json、audio/voice_reel.mp3（試聽）
對話 21 句（L01–L21）＋旁白 12 句（N01–N12）。edge-tts 0.8 倍。群體句（L11、L21）由多個聲線混音，嘴型用第一個聲線的對齊。"""
import os, sys, json, subprocess
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lipsync as L

V = dict(amber=('en-US-AnaNeural', '+0Hz'), mia=('en-GB-MaisieNeural', '+0Hz'), lena=('en-GB-LibbyNeural', '+12Hz'),
         teddy=('en-US-BrianNeural', '+32Hz'), edison=('en-US-AndrewNeural', '+38Hz'), rocky=('en-US-RogerNeural', '+26Hz'),
         abu=('en-US-SteffanNeural', '-6Hz'), mozart=('en-GB-ThomasNeural', '+0Hz'), beethoven=('en-GB-RyanNeural', '+0Hz'), narrator=('en-US-AvaNeural', '+0Hz'))
LINES = [
 ('N01', 'narrator', "It's a sunny day in Vienna, the city of music."),
 ('N02', 'narrator', "Amber, Teddy, Mia, Edison, Rocky and Robot Abu visit a big, beautiful garden."),
 ('L01', 'amber', "Wow! Vienna is so beautiful!"),
 ('L02', 'teddy', "Look! The flowers make a music note!"),
 ('N03', 'narrator', "A girl rides her bike into the garden."),
 ('L03', 'lena', "Hi! I'm Lena. I live in Vienna."),
 ('L04', 'mia', "How do you go to the park, Lena?"),
 ('L05', 'lena', "I go there by bike."),
 ('L06', 'lena', "Let's go to the opera house!"),
 ('N04', 'narrator', "The kids walk to the tram stop."),
 ('L07', 'rocky', "How can we go there?"),
 ('L08', 'edison', "We can go there by tram. Look!"),
 ('N05', 'narrator', "Ding, ding! Here comes the red tram."),
 ('N06', 'narrator', "At the opera house, many people play Mozart's music together."),
 ('L09', 'amber', "The music is beautiful. I love Mozart!"),
 ('L10', 'abu', "Let's visit Mozart!"),
 ('N07', 'narrator', "Abu pushes a button. Whoosh! They go back in time!"),
 ('N08', 'narrator', "Now they are in Mozart's room."),
 ('L11', 'amber+teddy', "Hi, Mister Mozart. We're your fans."),
 ('L12', 'mozart', "Oh, welcome! This is Beethoven."),
 ('L13', 'abu', "What do you do in your free time?"),
 ('L14', 'beethoven', "I play the piano in my free time."),
 ('L15', 'edison', "What does Mozart do in his free time?"),
 ('L16', 'beethoven', "He writes music in his free time."),
 ('N09', 'narrator', "Then Mozart has a question for the kids."),
 ('L17', 'mozart', "And you? What do you do in your free time?"),
 ('L18', 'amber', "I play the recorder in my free time."),
 ('L19', 'mozart', "What does he do in his free time?"),
 ('L20', 'teddy', "He plays online games in his free time."),
 ('N10', 'narrator', "Everyone laughs."),
 ('N11', 'narrator', "The sun goes down. It's time to go home."),
 ('L21', 'amber+teddy', "Bye, Vienna! Bye, Mozart!"),
 ('N12', 'narrator', "What a wonderful day in Vienna!"),
]

def robot(base, a):
    """Abu 機器人效果：相位歸零（單調金屬聲）55%＋原聲 45%，再加一點短回音；長度不變，對齊資料照用原聲。"""
    sf.write(base + '_dry.wav', a, L.SR)
    fx = ("[0:a]asplit=2[d][w];[w]afftfilt=real='hypot(re,im)*cos(0)':imag='hypot(re,im)*sin(0)':win_size=512:overlap=0.75,highpass=f=180[r];"
          "[d][r]amix=inputs=2:weights='0.45 0.55':normalize=0,aecho=0.8:0.7:18:0.25,alimiter=limit=0.95[o]")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', base + '_dry.wav', '-filter_complex', fx, '-map', '[o]', '-ar', str(L.SR), '-ac', '1', base + '_fx.wav'], check=True)
    b, _ = sf.read(base + '_fx.wav'); b = b[:len(a)]; b = np.pad(b, (0, len(a) - len(b))).astype(np.float32)
    b *= (np.sqrt(np.mean(a**2))/max(1e-6, np.sqrt(np.mean(b**2))))          # 音量對齊原聲
    b = b/max(1.0, np.abs(b).max()/0.97); sf.write(base + '.wav', b, L.SR); return b


if __name__ == '__main__':
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); od = os.path.join(root, 'audio', 'lines'); os.makedirs(od, exist_ok=True)
    only = sys.argv[1:]; man = []; reel = []
    for lid, who, text in LINES:
        base = os.path.join(od, lid); whos = who.split('+')
        if lid not in only and os.path.exists(base + '_phones.json'):
            a, sr = sf.read(base + '.wav'); ph = json.load(open(base + '_phones.json'))
        else:
            v, p = V[whos[0]]; ln = L.make_line(text, v, base, pitch=p); a = ln['audio']; ph = ln['phones']
            for k, w in enumerate(whos[1:]):                 # 群體句：其他聲線混進來（不對齊，只當合聲）
                v, p = V[w]; o = L.make_line(text, v, base + f'_x{k}', pitch=p)['audio']
                n = max(len(a), len(o)); a = np.pad(a, (0, n - len(a))) + 0.8*np.pad(o, (0, n - len(o)))
            if len(whos) > 1: a = a/max(1.0, np.abs(a).max()/0.95); sf.write(base + '.wav', a, L.SR)
            if who == 'abu': a = robot(base, a)
            print('ok', lid, who, round(len(a)/L.SR, 2), flush=True)
        man.append(dict(id=lid, who=who, text=text, dur=round(len(a)/L.SR, 3)))
        reel += [a.astype(np.float32), np.zeros(int(0.45*L.SR), np.float32)]
    json.dump(man, open(os.path.join(od, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sf.write(os.path.join(root, 'audio', 'voice_reel.wav'), np.concatenate(reel), L.SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(root, 'audio', 'voice_reel.wav'), '-b:a', '128k', os.path.join(root, 'audio', 'voice_reel.mp3')], check=True)
    print('total voice', round(sum(m['dur'] for m in man), 1), 's; reel ok')
