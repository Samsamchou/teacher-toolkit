"""Safari Count films: Colab frames (even frames, 12 fps stop-motion like World Routines) + answer voice + karaoke subtitle + quiet music.
  python tabletop/src/safari_compose.py <SHOT> <qa run dir> [<SHOT> <run dir> ...]      e.g. TW1 tabletop/qa/1125-120000
Output: tabletop/out/<station>_<key>.mp4 (1080p) and tabletop/out/<station>_<key>_720.mp4 (for the website, copied there later).
Spec 4C: Comic Relief karaoke 82 px raised 56 px (MarginV 174 at 1080p), number + animal words in red, music about 18 dB
under the voice, film -16 LUFS. The answer ends 0.5 s before the end, during the 1 s counting hold. ASCII only."""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTDIR = Path.home() / 'AppData' / 'Local' / 'Microsoft' / 'Windows' / 'Fonts'
AUDIO = ROOT / 'audio'; OUT = ROOT / 'out'
MUSIC = AUDIO / 'music_holiday.wav'      # the teacher's own instrumental (copied from World Routines, same bed as those films)
W, H = 1920, 1080
# SHOT -> (station, item key, duration s, badge) -- keep in step with the scene scripts (DUR)
CLIPS = {'TW1': ('taiwan', 'panda', 6.0, 'Taiwan'), 'TW2': ('taiwan', 'bears', 7.0, 'Taiwan'),
         'JP1': ('japan', 'lions', 6.5, 'Japan'), 'JP2': ('japan', 'horses', 7.0, 'Japan'),
         'KE1': ('kenya', 'zebras', 7.0, 'Kenya'), 'KE2': ('kenya', 'rhino', 7.0, 'Kenya'),
         'IN1': ('india', 'tigers', 7.0, 'India'), 'IN2': ('india', 'monkeys', 7.0, 'India'),
         'SG1': ('singapore', 'elephants', 7.0, 'Singapore'), 'SG2': ('singapore', 'turtles', 7.0, 'Singapore'),
         'AU1': ('australia', 'koalas', 7.0, 'Australia'), 'AU2': ('australia', 'lion', 7.0, 'Australia')}
RED = '&H003C3CE6&'; GOLD = '&H0000D7FF&'
NUM = {'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'}


def run(cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=cwd)
    if r.returncode: print(r.stderr[-2500:]); raise SystemExit('ffmpeg failed')


def lufs(path, extra=()):
    """Integrated loudness of a file (ffmpeg ebur128). loudnorm on a 1.4 s line padded to 6 s left the film at -24 LUFS (11/25),
    so the voice and the music get a fixed gain from a measurement instead."""
    r = subprocess.run(['ffmpeg', '-hide_banner', *extra, '-i', str(path), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    return float([l for l in r.stderr.splitlines() if l.strip().startswith('I:')][-1].split()[1])


def ts(t):
    t = max(0.0, t); return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def karaoke(words, start, end, animal):
    parts, prev = [], start + words[0][1] - 0.2; first = prev
    for w, a, b in words:
        a += start; b += start
        if a - prev > 0.02: parts.append('{\\k%d}' % int((a - prev) * 100))
        bare = w.strip(',.!?').lower()
        red = bare in NUM or bare.startswith(animal[:4])
        col = '{\\1c%s\\2c%s}' % (RED, RED) if red else ''
        parts.append('{\\kf%d}%s%s%s ' % (max(1, int((b - a) * 100)), col, w, '{\\1c%s\\2c&H00FFFFFF&}' % GOLD if red else ''))
        prev = b
    txt = ''.join(parts).strip()
    if not txt.rstrip('}').endswith('.'): txt += '.'
    return f'Dialogue: 0,{ts(first)},{ts(end)},Sub,,0,0,0,,{txt}'


def build(shot, rundir):
    station, key, dur, badge = CLIPS[shot]
    d = Path(rundir) / shot
    fs = sorted(d.glob('f*.png')) or sorted((Path(rundir) / 'tout' / shot).glob('f*.png'))
    need = int(round(dur * 12))
    if len(fs) < need: raise SystemExit(f'{shot}: {len(fs)} frames in {d}, need {need}')
    wj = json.loads((AUDIO / 'safari_words.json').read_text(encoding='utf-8'))[f'{station}_{key}_a']
    vlen = wj['words'][-1][2]; at = dur - 0.5 - vlen
    work = Path(tempfile.gettempdir()) / f'sct_compose_{shot}'
    shutil.rmtree(work, ignore_errors=True); (work / 'seq').mkdir(parents=True)
    for i, p in enumerate(fs[:need]): shutil.copy(p, work / 'seq' / f'{i:04d}.png')
    run(['ffmpeg', '-y', '-framerate', '12', '-i', str(work / 'seq' / '%04d.png'), '-vf', f'scale={W}:{H},fps=24,format=yuv420p',
         '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', str(work / 'video.mp4')])
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
Dialogue: 1,{ts(0)},{ts(dur)},Badge,,0,0,0,,{badge}
"""
    (work / 'subs.ass').write_text(head + karaoke(wj['words'], at, dur, key) + '\n', encoding='utf-8')
    ms = int(at * 1000)
    gv = -16.3 - lufs(AUDIO / f'{station}_{key}_a.mp3')                       # measured: -15.0 gave a -14.8 film
    gm = -34.3 - lufs(MUSIC, ('-ss', '0.3', '-t', f'{dur}'))                     # music 18 dB under the voice
    flt = [f'[0:a]adelay={ms}|{ms},aresample=48000,apad,atrim=0:{dur},volume={gv:.2f}dB[voice]',
           f'[1:a]atrim=0:{dur},asetpts=PTS-STARTPTS,aresample=48000,volume={gm:.2f}dB,'
           f'afade=t=in:d=0.6,afade=t=out:st={dur - 1.0:.2f}:d=1.0[music]',
           '[voice][music]amix=inputs=2:normalize=0,alimiter=limit=0.89[aout]']
    run(['ffmpeg', '-y', '-i', str(AUDIO / f'{station}_{key}_a.mp3'), '-ss', '0.3', '-i', str(MUSIC), '-filter_complex', ';'.join(flt),
         '-map', '[aout]', '-t', f'{dur}', str(work / 'audio.wav')])
    fonts = work / 'fonts'; fonts.mkdir(exist_ok=True)
    for f in FONTDIR.glob('ComicRelief-*.ttf'): shutil.copy(f, fonts / f.name)
    run(['ffmpeg', '-y', '-i', 'video.mp4', '-i', 'audio.wav', '-vf', 'ass=subs.ass:fontsdir=fonts', '-map', '0:v', '-map', '1:a',
         '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
         '-movflags', '+faststart', '-t', f'{dur}', 'film.mp4'], cwd=work)
    run(['ffmpeg', '-y', '-i', str(work / 'film.mp4'), '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-c:a', 'copy',
         '-movflags', '+faststart', str(work / 'film720.mp4')])
    OUT.mkdir(exist_ok=True); name = f'{station}_{key}'
    shutil.copy(work / 'film.mp4', OUT / f'{name}.mp4'); shutil.copy(work / 'film720.mp4', OUT / f'{name}_720.mp4')
    for p in (OUT / f'{name}.mp4', OUT / f'{name}_720.mp4'): print(p, round(p.stat().st_size / 1e6, 2), 'MB')


if __name__ == '__main__':
    a = sys.argv[1:]
    for i in range(0, len(a), 2): build(a[i], a[i + 1])
