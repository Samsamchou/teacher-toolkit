"""audition.py — 影片 7 十位朋友的聲音試聽（每人不同聲音；edge-tts，語速 0.8 倍，音調調高像小孩）。"""
import asyncio, subprocess, pathlib, edge_tts
HERE = pathlib.Path(__file__).resolve().parent
V = [('Mia', 'Australia', 'en-AU-NatashaNeural', '+30Hz'), ('Raj', 'India', 'en-IN-PrabhatNeural', '+50Hz'),
     ('Yuki', 'Japan', 'en-US-JennyNeural', '+35Hz'), ('Wei', 'Singapore', 'en-SG-WayneNeural', '+50Hz'),
     ('Sofia', 'Spain', 'en-IE-EmilyNeural', '+30Hz'), ('Kai', 'Taiwan', 'en-HK-SamNeural', '+50Hz'),
     ('Lily', 'the UK', 'en-GB-MaisieNeural', '+0Hz'), ('Tom', 'the USA', 'en-US-EricNeural', '+50Hz'),
     ('Jisu', 'Korea', 'en-NZ-MollyNeural', '+30Hz'), ('Nam', 'Vietnam', 'en-PH-JamesNeural', '+50Hz')]
async def main():
    parts = []
    for i, (n, c, v, p) in enumerate(V):
        f = HERE / f'{i + 1:02d}-{n}.mp3'
        await edge_tts.Communicate(f"Hi! I'm {n}. I'm from {c}.", v, rate='-20%', pitch=p).save(str(f)); parts.append(f)
    lst = HERE / 'list.txt'; sil = HERE / 'sil.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '1.2', '-c:a', 'libmp3lame', str(sil)], check=True)
    lst.write_text(''.join(f"file '{x.name}'\nfile 'sil.mp3'\n" for x in parts), encoding='utf-8')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-ar', '24000', '-ac', '1', '-b:a', '96k', str(HERE / 'friends-audition-v1.mp3')], check=True)
    print('ok')
asyncio.run(main())
