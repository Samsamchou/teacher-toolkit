"""audition.py — Amy／Ben 學生聲音試聽帶（2026-10-29 規格卡 RDQ-spec-video2-dialogues）。
Amy：en-US-AnaNeural；Ben 候選：幾個男聲提高音調。每個候選唸同一段第 2 部台詞，whisper 檢查。輸出 audition.mp3／audition.md。"""
import asyncio, subprocess, sys, numpy as np, edge_tts, soundfile as sf
from faster_whisper import WhisperModel
sys.stdout.reconfigure(encoding='utf-8')
SR = 24000; RATE = '-20%'
AMY = [('Amy', 'en-US-AnaNeural', '+0Hz', "Ben, relax. Today is Saturday.")]
BEN = [(f'Ben {k}', v, p, "Oh, no! I'm late for school! Saturday? No school today?") for k, (v, p) in enumerate(
       [('en-US-ChristopherNeural', '+40Hz'), ('en-US-EricNeural', '+40Hz'), ('en-US-BrianNeural', '+35Hz'), ('en-US-RogerNeural', '+40Hz')], 1)]
m = WhisperModel('small.en', device='cpu', compute_type='int8')
async def tts(text, voice, pitch):
    await edge_tts.Communicate(text, voice, rate=RATE, pitch=pitch).save('t.mp3')
    return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', 't.mp3', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32).copy()
async def main():
    buf, t, md = [], 0.0, ['# Amy／Ben 聲音試聽帶', '', '| 時間 | 候選 | 聲音 | 音高 | whisper |', '|---|---|---|---|---|']
    gap = np.zeros(int(1.2 * SR), np.float32)
    for name, v, p, text in AMY + BEN:
        a = await tts(text, v, p)
        a16 = np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a).astype(np.float32)
        heard = ' '.join(x.text.strip() for x in m.transcribe(a16, language='en', beam_size=5)[0])
        md.append(f'| {t:5.1f}s | {name} | {v} | {p} | {heard} |'); print(name, v, p, '=>', heard, flush=True)
        buf += [a, gap]; t += (len(a) + len(gap)) / SR
    sf.write('audition.wav', np.concatenate(buf), SR, subtype='PCM_16')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'audition.wav', '-b:a', '160k', 'audition.mp3'], check=True)
    open('audition.md', 'w', encoding='utf-8').write('\n'.join(md) + '\n')
asyncio.run(main())
