"""Taiwan breakfast film (derived from japan_compose.py): Colab frames (even frames, shown 2 each = 12 fps stop-motion) + voices + karaoke subtitles -> MP4.
  python tabletop/src/taiwan_compose.py <qa run dir with tout/B1..B4> [more run dirs]
Output: tabletop/out/taiwan_breakfast.mp4 (1080p) and web/video/taiwan.mp4 (720p, for the website).
Subtitles: Comic Relief 82 px karaoke, raised 56 px (teacher's rule), the time words in red."""
import json, re, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTDIR = Path.home() / 'AppData' / 'Local' / 'Microsoft' / 'Windows' / 'Fonts'
AUDIO = ROOT / 'audio'; OUT = ROOT / 'out'; WEB = ROOT.parent / 'web' / 'video'
MUSIC = AUDIO / 'music_holiday.wav'   # copy of 2026 Thanksgiving/opening-video/music/holiday/s7 instrumental (teacher's own generated track)
W, H = 1920, 1080
# keep in step with taiwan_breakfast.py (DUR, VOICE)
SHOTS = [('B1', 5.6, [('q', 0.4), ('a', 2.6)]), ('B2', 3.8, [('get', 0.5)]), ('B3', 3.0, [('zaoan', 0.9), ('gm', 1.75)]), ('B4', 8.2, [('eat', 0.5)])]
RED = '&H003C3CE6&'; GOLD = '&H0000D7FF&'
KEY = {'six', 'forty-five', 'forty', 'five'}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode: print(r.stderr[-2500:]); raise SystemExit('ffmpeg failed')


def ts(t):
    t = max(0.0, t); return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def karaoke(words, start, text, end, top=False):
    """One Dialogue line; each word fills from white to gold as it is spoken (\\kf), time words in red.
    top=True puts it over the blackboard (L1: the pupils stand low in the frame, a bottom line would cover them)."""
    # top > 0: from the top edge; top < 0: from the bottom edge with that margin (instead of the style's 174)
    parts, prev = (['{\\an8}'] if top > 0 else ['{\\an2}']) if top else [], start + words[0][1] - 0.2
    first = prev
    for w, a, b in words:
        a += start; b += start
        if a - prev > 0.02: parts.append('{\\k%d}' % int((a - prev) * 100))
        bare = w.strip(',.!?').lower(); tok = next((x for x in text.split() if x.strip(',.!?').lower() == bare), w)
        text = text.replace(tok, '', 1)
        col = '{\\1c%s\\2c%s}' % (RED, RED) if bare in KEY else ''
        parts.append('{\\kf%d}%s%s%s ' % (max(1, int((b - a) * 100)), col, tok, '{\\1c%s\\2c&H00FFFFFF&}' % GOLD if col else ''))
        prev = b
    return f'Dialogue: 0,{ts(first)},{ts(end)},Sub,,0,0,{abs(int(top)) if top else 0},,{"".join(parts).strip()}'


def main():
    runs = [Path(p) for p in sys.argv[1:]]
    frames = {}
    for r in runs:
        for d in (r / 'tout').iterdir():
            if d.is_dir(): frames[d.name] = sorted(d.glob('f*.png'))
    words = json.loads((AUDIO / 'taiwan_words.json').read_text(encoding='utf-8'))
    work = Path(tempfile.gettempdir()) / 'wrt_compose'   # local disk: copying hundreds of PNGs inside Google Drive is very slow
    shutil.rmtree(work, ignore_errors=True); work.mkdir(parents=True, exist_ok=True)
    clips, ass, mix, t0 = [], [], [], 0.0
    for shot, dur, lines in SHOTS:
        fs = frames[shot]; need = int(round(dur * 12))
        if len(fs) < need: raise SystemExit(f'{shot}: {len(fs)} frames, need {need}')
        seq = work / shot; seq.mkdir(parents=True, exist_ok=True)
        for i, p in enumerate(fs[:need]): shutil.copy(p, seq / f'{i:04d}.png')
        clip = work / f'{shot}.mp4'; clips.append(clip)
        run(['ffmpeg', '-y', '-framerate', '12', '-i', str(seq / '%04d.png'), '-vf', f'scale={W}:{H},fps=24,format=yuv420p', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', str(clip)])
        for key, at in lines:
            mix.append((AUDIO / f'taiwan_{key}.mp3', t0 + at))
            w = words[key]
            if key == 'gm': continue                         # shown together with 'Zao an!'
            if key == 'zaoan':
                ass.append(f'Dialogue: 0,{ts(t0 + at)},{ts(t0 + dur - 0.1)},Sub,,0,0,0,,{{\\kf70}}Zao an! {{\\k15}}{{\\kf80}}Good morning!')
            elif key == 'eat':                               # two sentences: show them one at a time
                ws = w['words']; cut = next(i for i, x in enumerate(ws) if i > 0 and x[0] == 'I')
                ass.append(karaoke(ws[:cut], t0 + at, 'I eat egg pancakes and drink soy milk.', t0 + at + ws[cut][1] - 0.25, top=-96))   # B4 v2 camera: her head fills the upper middle, the clock the top left, so the line sits low over the table front (>= 84 px from the bottom edge)   # must end before the next line starts (0.2 s lead), or libass stacks the next line higher
                ass.append(karaoke(ws[cut:], t0 + at, 'I have breakfast at six forty-five.', t0 + dur - 0.05, top=-96))
            else:
                end = t0 + dur - 0.05 if key != 'q' else t0 + lines[1][1] - 0.05
                ass.append(karaoke(w['words'], t0 + at, w['text'], end, top=240 if shot == 'B1' else False))
        t0 += dur
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Comic Relief,82,{GOLD},&H00FFFFFF,&H00301A08,&H64000000,0,0,0,0,100,100,0,0,1,6,2,2,80,80,174,1
Style: Badge,Comic Relief,54,&H00FFFFFF,&H00FFFFFF,&H00403020,&HB4302010,1,0,0,0,100,100,0,0,3,14,0,7,48,48,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,{ts(0)},{ts(t0)},Badge,,0,0,0,,Taiwan  {{\\c{GOLD}}}6:45
"""
    (work / 'subs.ass').write_text(head + '\n'.join(ass) + '\n', encoding='utf-8')
    (work / 'list.txt').write_text(''.join(f"file '{c.as_posix()}'\n" for c in clips), encoding='utf-8')
    run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', str(work / 'list.txt'), '-c', 'copy', str(work / 'video.mp4')])
    ins, flt = [], []
    for i, (p, at) in enumerate(mix):
        ins += ['-i', str(p)]; ms = int(at * 1000); flt.append(f'[{i + 1}:a]adelay={ms}|{ms},aresample=48000[a{i}]')
    flt.append(''.join(f'[a{i}]' for i in range(len(mix))) + f'amix=inputs={len(mix)}:normalize=0,apad,atrim=0:{t0},loudnorm=I=-16:TP=-2:LRA=11[voice]')
    # very quiet music bed (teacher 11/19): the Thanksgiving "holiday" instrumental, about 18 dB under the voices, fade in / out
    ins += ['-ss', '0.3', '-i', str(MUSIC)]; m = len(mix) + 1
    flt.append(f'[{m}:a]atrim=0:{t0},asetpts=PTS-STARTPTS,aresample=48000,loudnorm=I=-34:TP=-9:LRA=11,'
               f'afade=t=in:d=0.6,afade=t=out:st={t0 - 1.2:.2f}:d=1.2[music]')
    flt.append('[voice][music]amix=inputs=2:normalize=0,alimiter=limit=0.89[aout]')
    OUT.mkdir(exist_ok=True); WEB.mkdir(parents=True, exist_ok=True)
    # Three small steps in the local work folder (one combined ffmpeg call hung for 8 minutes), then copy to Google Drive.
    # Inputs are shifted by one in the combined graph; here audio is mixed on its own, so input numbers start at 0.
    aflt = re.sub(r'\[(\d+):a\]', lambda g: f'[{int(g.group(1)) - 1}:a]', ';'.join(flt))
    run(['ffmpeg', '-y', *ins, '-filter_complex', aflt, '-map', '[aout]', '-t', f'{t0}', str(work / 'audio.wav')])
    fonts = work / 'fonts'; fonts.mkdir(exist_ok=True)
    for f in FONTDIR.glob('ComicRelief-*.ttf'): shutil.copy(f, fonts / f.name)
    r = subprocess.run(['ffmpeg', '-y', '-i', 'video.mp4', '-i', 'audio.wav', '-vf', 'ass=subs.ass:fontsdir=fonts', '-map', '0:v', '-map', '1:a',
                        '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
                        '-movflags', '+faststart', '-t', f'{t0}', 'film.mp4'], cwd=work, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode: print(r.stderr[-2500:]); raise SystemExit('ffmpeg failed')
    run(['ffmpeg', '-y', '-i', str(work / 'film.mp4'), '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-c:a', 'copy',
         '-movflags', '+faststart', str(work / 'film720.mp4')])
    shutil.copy(work / 'film.mp4', OUT / 'taiwan_breakfast.mp4'); shutil.copy(work / 'film720.mp4', WEB / 'taiwan.mp4')
    for p in (OUT / 'taiwan_breakfast.mp4', WEB / 'taiwan.mp4'): print(p, round(p.stat().st_size / 1e6, 2), 'MB')


if __name__ == '__main__':
    main()
