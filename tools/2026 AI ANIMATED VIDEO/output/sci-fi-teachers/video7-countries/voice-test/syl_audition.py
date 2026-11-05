"""syl_audition.py — 拍音節唸法試聽：每個國名先唸整個字，再一拍一拍唸（送 TTS 的拼法另訂，畫面方塊仍顯示原本音節）。"""
import asyncio, subprocess, pathlib, edge_tts
HERE = pathlib.Path(__file__).resolve().parent
SPELL = {'Australia': 'Awss... tray... lee... uh.', 'India': 'In... dee... uh.', 'Japan': 'Juh... pan.', 'Singapore': 'Sing... uh... pore.',
         'Spain': 'Spain.', 'Taiwan': 'Tie... wahn.', 'the UK': 'U... K.', 'the USA': 'U... S... A.',
         'Korea': 'Kuh... ree... uh.', 'Vietnam': 'Vee... yet... nahm.'}   # Vietnam：et 會被拼成字母 E-T，用 yet
VOICES = ['en-US-AvaNeural', 'en-US-GuyNeural']
async def main():
    parts = []
    for i, (c, sp) in enumerate(SPELL.items()):
        v = VOICES[i % 2]
        for j, txt in enumerate((c + '.', sp)):
            f = HERE / f'syl-{i:02d}-{j}.mp3'; await edge_tts.Communicate(txt, v, rate='-20%').save(str(f)); parts.append(f)
    sil = HERE / 'sil.mp3'; lst = HERE / 'syl-list.txt'
    lst.write_text(''.join(f"file '{x.name}'\nfile 'sil.mp3'\n" for x in parts), encoding='utf-8')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-ar', '24000', '-ac', '1', '-b:a', '96k', str(HERE / 'syllables-audition-v3.mp3')], check=True)
    print('ok')
asyncio.run(main())
