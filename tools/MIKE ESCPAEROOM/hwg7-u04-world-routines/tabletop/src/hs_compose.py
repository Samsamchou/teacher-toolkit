"""he/she films, any station (generalised from taiwan_getup_compose.py): Colab frames (even frames, 12 fps stop-motion)
+ anchor / reporter voices (hs_voice.py) + karaoke subtitles -> MP4.
  python tabletop/src/hs_compose.py <station> <qa run dir> [more run dirs]
Output: tabletop/out/hs_<station>.mp4 (1080p) and web/video/hs/<station>.mp4 (720p).
Subtitles: Comic Relief 82 px karaoke, bottom margin 174 px (raised 56 px rule), time words in red. Loudness: whole film -16 LUFS,
music about 18 dB under the voices."""
import json, math, re, shutil, struct, subprocess, sys, tempfile, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTDIR = Path.home() / 'AppData' / 'Local' / 'Microsoft' / 'Windows' / 'Fonts'
AUDIO = ROOT / 'audio'; OUT = ROOT / 'out'; WEB = ROOT.parent / 'web' / 'video' / 'hs'
MUSIC = AUDIO / 'music_holiday.wav'
W, H = 1920, 1080
UKI = ROOT / 'qa' / '1120-192007' / 'tout'      # accepted I-version uk_homework final frames
# per station: shots (keep in step with the scene script's DUR / VOICE) and the name on the badge
STATIONS = {
    'japan': dict(name='Haruto', shots=[('JP1', 7.6, [('q', 0.4), ('a', 4.6)]), ('JP2', 3.6, [('wash', 0.4)]),
                                        ('JP3', 5.6, [('bath', 0.4)]), ('JP4', 4.2, [('bed', 0.4)])]),
    'uk': dict(name='Oliver', shots=[('UK1', 7.4, [('q', 0.4), ('a', 4.4)]), ('UK2', 3.4, [('ends', 0.3)]), ('UK3', 4.0, [('dad', 0.3)]),
                                     # the accepted I-version frames: tea (K4 from 3.4 s, the sip), then writing (K3 from 0.4 s); one line over both
                                     ('K4', 2.2, [('snack', 0.2, 2.4)], dict(src=UKI / 'K4', off=3.4)), ('K3', 2.4, [], dict(src=UKI / 'K3', off=0.4))]),
    'spain': dict(name='Lucia', shots=[('SP1', 7.4, [('q', 0.4), ('a', 4.4)]), ('SP2', 7.2, [('eat', 0.4)]), ('SP4', 4.0, [('rest', 0.3)])]),
    'kenya': dict(name='Amani', shots=[('KE1', 7.4, [('q', 0.4), ('a', 4.4)]), ('KE4', 9.0, [('fam', 0.3), ('eat', 6.0)]), ('KE4UG', 3.6, [('flour', 0.3)])]),
    'india': dict(name='Arjun', shots=[('IN1', 7.4, [('q', 0.4), ('a', 4.5)]), ('IN2', 4.4, [('friends', 0.3)]), ('IN3', 3.4, [('bag', 0.3)]), ('IN4', 3.6, [('home', 0.3)])]),
    'singapore': dict(name='Ling', shots=[('D1', 7.8, [('q', 0.4), ('a', 4.5)]), ('D2', 4.0, [('class', 0.3)]), ('D3', 4.4, [('read', 0.3)]), ('D4', 3.6, [('home', 0.3)])]),
    'australia': dict(name='Jack', shots=[('D1', 8.0, [('q', 0.4), ('a', 4.6)]), ('D0', 4.2, [('soccer', 0.3)]), ('D3', 4.4, [('table', 0.3)]), ('D4', 3.6, [('twenty', 0.3)])]),
    'egypt': dict(name='Omar', shots=[('EG1', 7.4, [('q', 0.4), ('a', 4.4)]), ('EG2', 4.0, [('walk', 0.3)]), ('EG3', 3.4, [('starts', 0.3)]), ('EG4', 3.8, [('bag', 0.3)])]),
    'usa': dict(name='Emma', shots=[('US1', 7.4, [('q', 0.4), ('a', 4.5)]), ('US2', 4.4, [('cafe', 0.3)]),
                                    ('US3', 4.6, [('food', 0.3)]), ('US4', 4.0, [('min', 0.3)])]),
}
STATION = sys.argv[1]; CFG = STATIONS[STATION]; SHOTS = CFG['shots']
RED = '&H003C3CE6&'; GOLD = '&H0000D7FF&'
KEY = {'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'fifteen', 'twenty', 'twenty-five', 'thirty', 'forty', 'forty-five', 'fifty', "o'clock"}


def run(cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=cwd)
    if r.returncode: print(r.stderr[-2500:]); raise SystemExit('ffmpeg failed')
    return r.stdout + r.stderr


def ts(t):
    t = max(0.0, t); return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def karaoke(words, start, text, end, top=0):
    """top > 0: line at the top edge with that margin (TW1: she sits low in the frame, a bottom line covered her legs)."""
    parts, prev = (['{\an8}'] if top else []), start + words[0][1] - 0.2
    first = prev
    for w, a, b in words:
        a += start; b += start
        if a - prev > 0.02: parts.append('{\\k%d}' % int((a - prev) * 100))
        bare = w.strip(',.!?').lower(); tok = next((x for x in text.split() if x.strip(',.!?').lower() == bare), w)
        text = text.replace(tok, '', 1)
        col = '{\\1c%s\\2c%s}' % (RED, RED) if bare in KEY else ''
        parts.append('{\\kf%d}%s%s%s ' % (max(1, int((b - a) * 100)), col, tok, '{\\1c%s\\2c&H00FFFFFF&}' % GOLD if col else ''))
        prev = b
    return f'Dialogue: 0,{ts(first)},{ts(end)},Sub,,0,0,{top},,{"".join(parts).strip()}'


def bell(path, dur):
    """A small twin-bell alarm: 2.6 kHz + 3.4 kHz struck 16 times a second, soft attack."""
    sr = 48000; n = int(dur * sr); out = []
    for i in range(n):
        t = i / sr; ph = (t * 16) % 1.0
        env = math.exp(-ph * 9.0) * (0.6 + 0.4 * (1 - math.exp(-t * 20)))
        out.append(0.35 * env * (math.sin(2 * math.pi * 2600 * t) + 0.6 * math.sin(2 * math.pi * 3400 * t)) / 1.6)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v)) * 32000)) for v in out))


def main():
    runs = [Path(p) for p in sys.argv[2:]]
    frames = {}
    for r in runs:
        for d in (r / 'tout').iterdir():
            if d.is_dir(): frames[d.name] = sorted(d.glob('f*.png'))
    words = json.loads((AUDIO / f'hs_{STATION}_words.json').read_text(encoding='utf-8'))
    work = Path(tempfile.gettempdir()) / f'hs_{STATION}_compose'
    shutil.rmtree(work, ignore_errors=True); work.mkdir(parents=True, exist_ok=True)
    clips, ass, mix, t0, starts = [], [], [], 0.0, {}
    for item in SHOTS:
        shot, dur, lines = item[:3]; opt = item[3] if len(item) > 3 else {}
        fs = sorted(Path(opt['src']).glob('f*.png')) if 'src' in opt else frames[shot]
        fs = fs[int(round(opt.get('off', 0) * 12)):]; need = int(round(dur * 12))
        if len(fs) < need: raise SystemExit(f'{shot}: {len(fs)} frames, need {need}')
        seq = work / shot; seq.mkdir(parents=True, exist_ok=True)
        for i, p in enumerate(fs[:need]): shutil.copy(p, seq / f'{i:04d}.png')
        clip = work / f'{shot}.mp4'; clips.append(clip)
        run(['ffmpeg', '-y', '-framerate', '12', '-i', str(seq / '%04d.png'), '-vf', f'scale={W}:{H},fps=24,format=yuv420p', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', str(clip)])
        starts[shot] = t0
        for k, ln in enumerate(lines):
            key, at = ln[0], ln[1]
            mix.append((AUDIO / f'hs_{STATION}_{key}.mp3', t0 + at))
            w = words[key]
            end = t0 + lines[k + 1][1] - 0.2 if k + 1 < len(lines) else t0 + dur - 0.05
            if len(ln) > 2: end = t0 + dur + ln[2] - 0.05                # the line runs on into the next (silent) shot
            ass.append(karaoke(w['words'], t0 + at, w['text'], end, top=0))
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
Dialogue: 1,{ts(0)},{ts(t0)},Badge,,0,0,0,,{ {'uk': 'UK', 'usa': 'USA'}.get(STATION, STATION.title())}  {{\\c{GOLD}}}{CFG['name']}
"""
    (work / 'subs.ass').write_text(head + '\n'.join(ass) + '\n', encoding='utf-8')
    (work / 'list.txt').write_text(''.join(f"file '{c.as_posix()}'\n" for c in clips), encoding='utf-8')
    run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', str(work / 'list.txt'), '-c', 'copy', str(work / 'video.mp4')])
    ins, flt, voices = [], [], []
    for i, item in enumerate(mix):
        p, at = item[0], item[1]; vol = item[2] if len(item) > 2 else 1.0
        ins += ['-i', str(p)]; ms = int(at * 1000)
        flt.append(f'[{i}:a]adelay={ms}|{ms},aresample=48000,volume={vol}[a{i}]'); voices.append(f'[a{i}]')
    flt.append(''.join(voices) + f'amix=inputs={len(mix)}:normalize=0,apad,atrim=0:{t0},loudnorm=I=-16:TP=-2:LRA=11[voice]')
    ins += ['-ss', '0.3', '-i', str(MUSIC)]; m = len(mix)
    flt.append(f'[{m}:a]atrim=0:{t0},asetpts=PTS-STARTPTS,aresample=48000,loudnorm=I=-34:TP=-9:LRA=11,'
               f'afade=t=in:d=0.6,afade=t=out:st={t0 - 1.2:.2f}:d=1.2[music]')
    flt.append('[voice][music]amix=inputs=2:normalize=0,alimiter=limit=0.89[aout]')
    run(['ffmpeg', '-y', *ins, '-filter_complex', ';'.join(flt), '-map', '[aout]', '-t', f'{t0}', str(work / 'audio_pre.wav')])
    lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', run(['ffmpeg', '-nostdin', '-i', str(work / 'audio_pre.wav'), '-af', 'ebur128=framelog=quiet', '-f', 'null', '-']))[-1])
    run(['ffmpeg', '-y', '-i', str(work / 'audio_pre.wav'), '-af', f'volume={-16 - lufs:.2f}dB,alimiter=limit=0.89:level=false', str(work / 'audio.wav')])
    fonts = work / 'fonts'; fonts.mkdir(exist_ok=True)
    for f in FONTDIR.glob('ComicRelief-*.ttf'): shutil.copy(f, fonts / f.name)
    run(['ffmpeg', '-y', '-i', 'video.mp4', '-i', 'audio.wav', '-vf', 'ass=subs.ass:fontsdir=fonts', '-map', '0:v', '-map', '1:a',
         '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
         '-movflags', '+faststart', '-t', f'{t0}', 'film.mp4'], cwd=work)
    run(['ffmpeg', '-y', '-i', str(work / 'film.mp4'), '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-c:a', 'copy',
         '-movflags', '+faststart', str(work / 'film720.mp4')])
    OUT.mkdir(exist_ok=True); WEB.mkdir(parents=True, exist_ok=True)
    shutil.copy(work / 'film.mp4', OUT / f'hs_{STATION}.mp4'); shutil.copy(work / 'film720.mp4', WEB / f'{STATION}.mp4')
    out_lufs = re.findall(r'I:\s+(-?[\d.]+) LUFS', run(['ffmpeg', '-nostdin', '-i', str(OUT / f'hs_{STATION}.mp4'), '-af', 'ebur128=framelog=quiet', '-f', 'null', '-']))[-1]
    print('film', round(t0, 2), 's, LUFS', out_lufs)
    for p in (OUT / f'hs_{STATION}.mp4', WEB / f'{STATION}.mp4'): print(p, round(p.stat().st_size / 1e6, 2), 'MB')


if __name__ == '__main__':
    main()
