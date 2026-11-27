"""make_voices.py — 24 句英文配音（edge-tts，0.8 倍）＋逐字時間（卡拉 OK 用）。
python -I make_voices.py [id…]  →  audio/lines/L01.wav、audio/lines/manifest.json
聲線沿用動詞 -s 影片：Ken＝Guy +18Hz、水鈴＝Ana、旁白＝Jenny；Santa＝Christopher −12Hz。"""
import asyncio, json, pathlib, subprocess, sys
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'audio' / 'lines'; OUT.mkdir(parents=True, exist_ok=True)
V = {'narrator': ('en-US-JennyNeural', '+0Hz'), 'ken': ('en-US-GuyNeural', '+18Hz'), 'shuiling': ('en-US-AnaNeural', '+0Hz'),
     'santa': ('en-US-ChristopherNeural', '-12Hz'), 'letter': ('en-US-ChristopherNeural', '-12Hz')}
RATE = '-20%'

async def tts(text, voice, pitch, mp3):
    words = []
    com = edge_tts.Communicate(text, voice, rate=RATE, pitch=pitch, boundary='WordBoundary')
    with open(mp3, 'wb') as f:
        async for ch in com.stream():
            if ch['type'] == 'audio': f.write(ch['data'])
            elif ch['type'] == 'WordBoundary': words.append({'w': ch['text'], 't0': ch['offset'] / 1e7, 't1': (ch['offset'] + ch['duration']) / 1e7})
    return words

def main(only):
    story = json.load(open(ROOT / 'script' / 'story_v1.json', encoding='utf-8'))
    man_p = OUT / 'manifest.json'
    man = {m['id']: m for m in json.load(open(man_p, encoding='utf-8'))} if man_p.exists() else {}
    for sc in story['scenes']:
        for l in sc['lines']:
            lid = f"L{l['id']:02d}"
            if only and lid not in only and lid in man: continue
            if not only and lid in man and (OUT / f'{lid}.wav').exists(): continue
            text = l['en'].replace('"', '')
            v, p = V[l['who']]
            mp3 = OUT / f'{lid}.mp3'
            words = asyncio.run(tts(text, v, p, mp3))
            wav = OUT / f'{lid}.wav'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-ar', '48000', '-ac', '1', str(wav)], check=True)
            dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(wav)], capture_output=True, text=True).stdout)
            mp3.unlink()
            man[lid] = {'id': lid, 'n': l['id'], 'scene': sc['n'], 'who': l['who'], 'text': l['en'], 'target': l.get('target'), 'dur': round(dur, 3), 'words': words}
            print(lid, l['who'], round(dur, 2), len(words), 'words', flush=True)
    ms = sorted(man.values(), key=lambda m: m['n'])
    json.dump(ms, open(man_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('total', round(sum(m['dur'] for m in ms), 1), 's')

if __name__ == '__main__':
    main(sys.argv[1:])
