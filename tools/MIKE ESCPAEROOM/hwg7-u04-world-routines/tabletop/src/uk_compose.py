"""UK homework film (derived from taiwan_compose.py): Colab frames (even frames, shown 2 each = 12 fps stop-motion) + voices + karaoke subtitles -> MP4.
  python tabletop/src/uk_compose.py <qa run dir with tout/K1..K4> [more run dirs]   (later dirs replace earlier shots with the same name)
Output: tabletop/out/uk_homework.mp4 (1080p) and web/video/uk.mp4 (720p, for the website).
Subtitles: Comic Relief 82 px karaoke, raised 56 px (teacher's rule), the time words "four thirty" in red.
Small sound effects are made here with ffmpeg noise (no files): page turn in K2, pencil scratching in K3, pencil tap and cup on saucer in K4."""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTDIR = Path.home() / 'AppData' / 'Local' / 'Microsoft' / 'Windows' / 'Fonts'
AUDIO = ROOT / 'audio'; OUT = ROOT / 'out'; WEB = ROOT.parent / 'web' / 'video'
MUSIC = AUDIO / 'music_holiday.wav'   # copy of 2026 Thanksgiving/opening-video/music/holiday/s7 instrumental (teacher's own generated track)
W, H = 1920, 1080
# keep in step with uk_homework.py (DUR, VOICE)
SHOTS = [('K1', 5.6, [('q', 0.4), ('a', 2.6)]), ('K2', 3.8, [('hw', 0.5)]), ('K3', 3.0, [('rw', 0.4)]), ('K4', 7.6, [('tea', 0.5)])]
# subtitle position per shot: 0 = default bottom (MarginV 174), > 0 from the top edge, < 0 distance from the bottom edge (>= 84)
SUB_POS = {'K1': 240, 'K2': 0, 'K3': 0, 'K4': -96}
# sound effects: (shot, start s, kind, length s) -- times follow the actions in uk_homework.py
SFX = [('K2', 2.0, 'flip', 0.3), ('K3', 0.25, 'scratch', 0.8), ('K3', 1.3, 'scratch', 0.75), ('K4', 1.3, 'tap', 0.08), ('K4', 6.0, 'clink', 0.25)]
RED = '&H003C3CE6&'; GOLD = '&H0000D7FF&'
KEY = {'four', 'thirty'}


def run(cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=cwd)
    if r.returncode: print(r.stderr[-2500:]); raise SystemExit('ffmpeg failed')


def ts(t):
    t = max(0.0, t); return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def karaoke(words, start, text, end, top=0):
    """One Dialogue line; each word fills from white to gold as it is spoken (\\kf), time words in red.
    top > 0: from the top edge; top < 0: from the bottom edge with that margin (instead of the style's 174)."""
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


def make_sfx(kind, dur, path):
    """Quiet little foley made from filtered noise / a sine ping."""
    src = {'flip': f'anoisesrc=d={dur}:c=pink:a=0.6,highpass=f=900,lowpass=f=7000,afade=t=in:d=0.03,afade=t=out:st={dur * 0.4:.2f}:d={dur * 0.6:.2f}',
           'scratch': f'anoisesrc=d={dur}:c=white:a=0.5,bandpass=f=4200:width_type=h:w=3500,tremolo=f=11:d=0.9,afade=t=in:d=0.05,afade=t=out:st={dur - 0.1:.2f}:d=0.1',
           'tap': f'anoisesrc=d={dur}:c=brown:a=0.9,lowpass=f=1800,afade=t=out:st=0.01:d={dur - 0.01:.2f}',
           'clink': f'sine=f=2600:d={dur},afade=t=out:st=0.0:d={dur:.2f}'}[kind]
    run(['ffmpeg', '-y', '-f', 'lavfi', '-i', src, '-ar', '48000', '-ac', '1', str(path)])


def main():
    runs = [Path(p) for p in sys.argv[1:]]
    frames = {}
    for r in runs:
        for d in (r / 'tout').iterdir():
            if d.is_dir(): frames[d.name] = sorted(d.glob('f*.png'))
    words = json.loads((AUDIO / 'uk_words.json').read_text(encoding='utf-8'))
    work = Path(tempfile.gettempdir()) / 'wrt_compose_uk'   # local disk: copying hundreds of PNGs inside Google Drive is very slow
    shutil.rmtree(work, ignore_errors=True); work.mkdir(parents=True, exist_ok=True)
    clips, ass, mix, starts, t0 = [], [], [], {}, 0.0
    for shot, dur, lines in SHOTS:
        starts[shot] = t0
        fs = frames[shot]; need = int(round(dur * 12))
        if len(fs) < need: raise SystemExit(f'{shot}: {len(fs)} frames, need {need}')
        seq = work / shot; seq.mkdir(parents=True, exist_ok=True)
        for i, p in enumerate(fs[:need]): shutil.copy(p, seq / f'{i:04d}.png')
        clip = work / f'{shot}.mp4'; clips.append(clip)
        run(['ffmpeg', '-y', '-framerate', '12', '-i', str(seq / '%04d.png'), '-vf', f'scale={W}:{H},fps=24,format=yuv420p', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', str(clip)])
        for key, at in lines:
            mix.append((AUDIO / f'uk_{key}.mp3', t0 + at))
            w = words[key]
            if key == 'tea':                                  # two sentences: show them one at a time
                ws = w['words']; cut = next(i for i, x in enumerate(ws) if x[0] == 'Then')
                # must end before the next line starts (0.2 s lead), or libass stacks the next line higher
                ass.append(karaoke(ws[:cut], t0 + at, 'I do my homework at four thirty.', t0 + at + ws[cut][1] - 0.25, top=SUB_POS[shot]))
                ass.append(karaoke(ws[cut:], t0 + at, 'Then I have tea.', t0 + dur - 0.05, top=SUB_POS[shot]))
            else:
                end = t0 + dur - 0.05 if key != 'q' else t0 + lines[1][1] - 0.05
                ass.append(karaoke(w['words'], t0 + at, w['text'], end, top=SUB_POS[shot]))
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
Dialogue: 1,{ts(0)},{ts(t0)},Badge,,0,0,0,,UK  {{\\c{GOLD}}}4:30
"""
    (work / 'subs.ass').write_text(head + '\n'.join(ass) + '\n', encoding='utf-8')
    (work / 'list.txt').write_text(''.join(f"file '{c.as_posix()}'\n" for c in clips), encoding='utf-8')
    run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', str(work / 'list.txt'), '-c', 'copy', str(work / 'video.mp4')])
    # audio graph (inputs numbered from 0): voices -> loudnorm -16; foley quiet and NOT loudnormed with the voices; music very quiet
    ins, flt = [], []
    for i, (p, at) in enumerate(mix):
        ins += ['-i', str(p)]; ms = int(at * 1000); flt.append(f'[{i}:a]adelay={ms}|{ms},aresample=48000[a{i}]')
    flt.append(''.join(f'[a{i}]' for i in range(len(mix))) + f'amix=inputs={len(mix)}:normalize=0,apad,atrim=0:{t0},loudnorm=I=-16:TP=-2:LRA=11[voice]')
    n = len(mix)
    for j, (shot, at, kind, d) in enumerate(SFX):
        p = work / f'sfx{j}.wav'; make_sfx(kind, d, p)
        ins += ['-i', str(p)]; ms = int((starts[shot] + at) * 1000); flt.append(f'[{n + j}:a]adelay={ms}|{ms},aresample=48000[s{j}]')
    flt.append(''.join(f'[s{j}]' for j in range(len(SFX))) + f'amix=inputs={len(SFX)}:normalize=0,apad,atrim=0:{t0},volume=0.22[sfx]')
    # very quiet music bed (teacher 11/19): the Thanksgiving "holiday" instrumental, about 18 dB under the voices, fade in / out
    m = n + len(SFX); ins += ['-ss', '0.3', '-i', str(MUSIC)]
    flt.append(f'[{m}:a]atrim=0:{t0},asetpts=PTS-STARTPTS,aresample=48000,loudnorm=I=-34:TP=-9:LRA=11,'
               f'afade=t=in:d=0.6,afade=t=out:st={t0 - 1.2:.2f}:d=1.2[music]')
    flt.append('[voice][sfx][music]amix=inputs=3:normalize=0,alimiter=limit=0.89[aout]')
    OUT.mkdir(exist_ok=True); WEB.mkdir(parents=True, exist_ok=True)
    # Three small steps in the local work folder (one combined ffmpeg call hung for 8 minutes), then copy to Google Drive.
    run(['ffmpeg', '-y', *ins, '-filter_complex', ';'.join(flt), '-map', '[aout]', '-t', f'{t0}', str(work / 'audio.wav')])
    fonts = work / 'fonts'; fonts.mkdir(exist_ok=True)
    for f in FONTDIR.glob('ComicRelief-*.ttf'): shutil.copy(f, fonts / f.name)
    run(['ffmpeg', '-y', '-i', 'video.mp4', '-i', 'audio.wav', '-vf', 'ass=subs.ass:fontsdir=fonts', '-map', '0:v', '-map', '1:a',
         '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
         '-movflags', '+faststart', '-t', f'{t0}', 'film.mp4'], cwd=work)
    run(['ffmpeg', '-y', '-i', str(work / 'film.mp4'), '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-c:a', 'copy',
         '-movflags', '+faststart', str(work / 'film720.mp4')])
    shutil.copy(work / 'film.mp4', OUT / 'uk_homework.mp4'); shutil.copy(work / 'film720.mp4', WEB / 'uk.mp4')
    for p in (OUT / 'uk_homework.mp4', WEB / 'uk.mp4'): print(p, round(p.stat().st_size / 1e6, 2), 'MB')


if __name__ == '__main__':
    main()
