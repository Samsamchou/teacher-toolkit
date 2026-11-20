"""Generate station audio with edge-tts: question (traveller), answer + extended sentences (local pupil)."""
import asyncio, json, sys
from pathlib import Path
import edge_tts
root = Path(__file__).resolve().parent
content = json.loads((root.parent.parent.parent/'monster-in-my-mind-site'/'functions'/'routines-content.json').read_text(encoding='utf-8'))
BOY = dict(voice='en-US-ChristopherNeural', pitch='+50Hz', rate='-12%')
GIRL = dict(voice='en-US-AnaNeural', pitch='+0Hz', rate='-12%')
ASK = dict(voice='en-US-JennyNeural', pitch='+0Hz', rate='-12%')
GENDER = {'taiwan':GIRL,'japan':BOY,'usa':GIRL,'uk':BOY,'spain':GIRL,'egypt':BOY,'kenya':GIRL,'india':BOY,'singapore':GIRL,'australia':BOY}
async def say(text, path, v):
    if path.exists() and '--force' not in sys.argv: return
    await edge_tts.Communicate(text, v['voice'], pitch=v['pitch'], rate=v['rate']).save(str(path))
async def main():
    jobs = []
    for s in content['stations']:
        v = GENDER[s['id']]
        jobs += [say(s['question'], root/'audio'/f"{s['id']}-q.mp3", ASK), say(s['spoken'], root/'audio'/f"{s['id']}-a.mp3", v)]
        for i, line in enumerate(s['extended']): jobs.append(say(line, root/'audio'/f"{s['id']}-x{i+1}.mp3", v))
    for j in jobs: await j
asyncio.run(main()); print(len(list((root/'audio').glob('*.mp3'))))
