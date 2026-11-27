"""Like-question clue at the end of a station's last film (teacher 11/25, RDQ question-fixes 2C): the travel buddy says what
they like ("I love pandas!") so the pupil has evidence for "Yes, she does." / "No, he doesn't. He likes ___."
  python tabletop/src/safari_clue.py <station> <film key>        e.g. taiwan bears   (version 2: v2_taiwan elephants)
Reads tabletop/out/<station>_<key>.mp4 (from safari_compose.py), the bank's like.clue, the buddy voices web/audio/<station>-like-clue-<g|b>.mp3
and the buddy pictures (World Routines hero_boy / hero_girl). Writes tabletop/out/<station>_<key>_clue_<g|b>.mp4 (+ _720):
g = the pupil chose the girl, so the buddy is the boy; b = the buddy is the girl. Card = 3.2 s: the clean picture of the animal the clue names (else the last frame) dimmed, buddy on the left,
speech bubble with the clue and a heart, voice -16.3 LUFS like the answer, the same music bed 18 dB under it. ASCII only."""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = Path(__file__).resolve().parents[1]; PROJ = ROOT.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from safari_compose import run, lufs, MUSIC, OUT, FONTDIR   # noqa: E402
ART = PROJ.parent.parent / 'monster-in-my-mind-site' / 'public' / 'world-routines' / 'art3d'
W, H, CARD = 1920, 1080, 3.2


def card(last, buddy_png, text, dst):
    bg = ImageEnhance.Brightness(Image.open(last).convert('RGB').resize((W, H))).enhance(0.55)
    im = bg.convert('RGBA'); d = ImageDraw.Draw(im)
    kid = Image.open(buddy_png).convert('RGBA'); kid.thumbnail((620, 860))
    im.alpha_composite(kid, (150, H - kid.height - 60))
    font = ImageFont.truetype(str(FONTDIR / 'ComicRelief-Bold.ttf'), 120)
    emo = ImageFont.truetype('C:/Windows/Fonts/seguiemj.ttf', 109)
    tw = d.textlength(text, font=font); box = (780, 70, 780 + tw + 260, 330)   # above the animal, so it stays visible
    d.rounded_rectangle(box, 60, fill=(255, 253, 240, 255), outline=(240, 160, 40, 255), width=10)
    d.polygon([(box[0] + 40, 300), (box[0] - 120, 400), (box[0] + 110, 320)], fill=(255, 253, 240, 255))   # tail toward the buddy
    d.text((box[0] + 70, 135), text, font=font, fill=(60, 40, 30, 255))
    d.text((box[0] + 100 + tw, 145), '\u2764\ufe0f', font=emo, embedded_color=True)
    im.convert('RGB').save(dst)


def build(station, key):
    # version 2 (teacher 11/27): station 'v2_<country>' -> content/stations_v2.json, web/audio_v2/, out/v2_<country>_<key>...
    v2 = station.startswith('v2_'); sid = station[3:] if v2 else station
    bank = json.loads((PROJ / 'content' / ('stations_v2.json' if v2 else 'stations.json')).read_text(encoding='utf-8'))
    st = next(s for s in bank['stations'] if s['id'] == sid); text = st['like']['clue']
    film = OUT / f'{station}_{key}.mp4'
    work = Path(tempfile.gettempdir()) / f'sct_clue_{station}'; shutil.rmtree(work, ignore_errors=True); work.mkdir()
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(film)],
                               capture_output=True, text=True).stdout)
    # Background: the clean count picture (web/count/, no burned subtitle) of the animal the clue names, e.g. the panda for
    # "I love pandas!"; otherwise the film's last frame.
    named = [it for it in st['items'] if it['plural'].lower() in text.lower() or it['word'].lower() in text.lower()]
    pic = PROJ / 'web' / 'count' / (named[0].get('picture') or '-') if named else None
    if pic and pic.exists(): shutil.copy(pic, work / 'last.png')
    else: run(['ffmpeg', '-y', '-sseof', '-0.1', '-i', str(film), '-frames:v', '1', str(work / 'last.png')])
    for h, buddy in (('g', 'boy'), ('b', 'girl')):
        card(work / 'last.png', ART / f'hero_{buddy}.png', text, work / f'card_{h}.png')
        voice = PROJ / 'web' / ('audio_v2' if v2 else 'audio') / f'{sid}-like-clue-{h}.mp3'
        gv = -16.3 - lufs(voice); gm = -34.3 - lufs(MUSIC, ('-ss', '0.3', '-t', '6'))
        flt = [f'[1:a]adelay=400|400,aresample=48000,apad,atrim=0:{CARD},volume={gv:.2f}dB[v]',
               f'[2:a]atrim=0:{CARD},asetpts=PTS-STARTPTS,aresample=48000,volume={gm:.2f}dB,afade=t=in:d=0.4,afade=t=out:st={CARD - 0.8}:d=0.8[m]',
               '[v][m]amix=inputs=2:normalize=0,alimiter=limit=0.89[a]']
        run(['ffmpeg', '-y', '-loop', '1', '-framerate', '24', '-i', str(work / f'card_{h}.png'), '-i', str(voice), '-ss', '0.3', '-i', str(MUSIC),
             '-filter_complex', ';'.join(flt) + ';[0:v]fade=t=in:d=0.3,format=yuv420p[vv]', '-map', '[vv]', '-map', '[a]', '-t', f'{CARD}',
             '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', str(work / f'card_{h}.mp4')])
        name = f'{station}_{key}_clue_{h}'
        run(['ffmpeg', '-y', '-i', str(film), '-i', str(work / f'card_{h}.mp4'), '-filter_complex',
             '[0:v]fps=24,format=yuv420p[a];[1:v]fps=24,format=yuv420p[b];[0:a]aresample=48000[x];[1:a]aresample=48000[y];[a][x][b][y]concat=n=2:v=1:a=1[v][au]',
             '-map', '[v]', '-map', '[au]', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
             str(OUT / f'{name}.mp4')])
        run(['ffmpeg', '-y', '-i', str(OUT / f'{name}.mp4'), '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-c:a', 'copy',
             '-movflags', '+faststart', str(OUT / f'{name}_720.mp4')])
        shutil.copy(work / f'card_{h}.png', OUT / f'{name}_card.png')
        print(OUT / f'{name}.mp4', round(dur + CARD, 1), 's')


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
