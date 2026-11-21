"""Australia shower film (derived from uk_compose.py / singapore_compose.py): Colab frames (even frames, shown 2 each = 12 fps stop-motion) + voices + karaoke subtitles -> MP4.
  python tabletop/src/australia_compose.py <qa run dir with tout/AU1..AU4> [more run dirs]   (later dirs replace earlier shots with the same name)
Output: tabletop/out/australia_shower.mp4 (1080p) and web/video/australia.mp4 (720p, for the website; same settings as uk.mp4).
  Add --test to leave the results in the temp work folder only (dry run with fake frames).
Subtitles: Comic Relief 82 px karaoke, raised 56 px (bottom margin 174 >= 84), the time words "seven fifteen" in red, every line
  ends 0.2 s before the next one starts. AU4 has three lines: the answer, "I sing a song!" and the sung "La la la, la la la!".
Sound (shared rules 6.4 / 13, teacher 11/20): music bed 18 dB under the voice while he speaks (per-second RMS), 1/4 of that in the
  parts with no voice, whole film -16 LUFS by ONE gain + alimiter (level=false); no loudnorm on the ducked mix.
  Foley made here with ffmpeg (no files): towel swish, hourglass tap + sand trickle, bottle tap, soft footsteps.
ASCII only."""
import json, re, shutil, subprocess, sys, tempfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FONTDIR = Path.home() / 'AppData' / 'Local' / 'Microsoft' / 'Windows' / 'Fonts'
AUDIO = ROOT / 'audio'; OUT = ROOT / 'out'; WEB = ROOT.parent / 'web' / 'video'
MUSIC = AUDIO / 'music_holiday.wav'   # copy of 2026 Thanksgiving/opening-video/music/holiday/s7 instrumental (teacher's own generated track)
NAME, WEBNAME, BADGE = 'australia_shower', 'australia', 'Australia  {\\c&H0000D7FF&}7:15'
W, H, SR = 1920, 1080, 48000
# keep in step with australia_shower.py (DUR, VOICE)
SHOTS = [('AU1', 5.6, [('q', 0.4), ('a', 2.6)]), ('AU2', 3.8, [('soccer', 0.5)]), ('AU3', 3.0, [('four', 0.4)]),
         ('AU4', 7.6, [('a', 0.4), ('sing', 3.3), ('la', 4.95)])]
# subtitle position per shot: 0 = default bottom (MarginV 174), > 0 from the top edge, < 0 distance from the bottom edge (>= 84)
SUB_POS = {'AU1': -100, 'AU2': 0, 'AU3': 0, 'AU4': 0}
# sound effects: (shot, start s, kind, length s, level dB under the speech level) -- times follow the actions in australia_shower.py
SFX = [('AU2', 0.70, 'tap', 0.05, 18), ('AU2', 1.60, 'swish', 0.30, 12),
       ('AU3', 0.70, 'tap', 0.05, 18), ('AU3', 2.00, 'tap', 0.07, 13), ('AU3', 2.05, 'sand', 0.95, 26),
       ('AU4', 0.0, 'sand', 7.6, 30), ('AU4', 3.40, 'tap', 0.06, 16),       # round 4: he steps first (0.5-2.9 s), then takes the shampoo
       ('AU4', 1.10, 'step', 0.07, 16), ('AU4', 1.70, 'step', 0.07, 16), ('AU4', 2.30, 'step', 0.07, 16), ('AU4', 2.90, 'step', 0.07, 16)]
RED = '&H003C3CE6&'; GOLD = '&H0000D7FF&'
KEY = {'seven', 'fifteen'}
DUCK_DB, QUIET, TARGET_LUFS = 18.0, 0.25, -16.0


def run(cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=cwd)
    if r.returncode: print(r.stderr[-2500:]); raise SystemExit('ffmpeg failed')
    return r.stderr


def ts(t):
    t = max(0.0, t); return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def karaoke(words, text, end, top=0):
    """One Dialogue line from words [(word, abs start, abs end)]: each word fills white -> gold (\\kf), time words red.
    top > 0: from the top edge; top < 0: from the bottom edge with that margin (instead of the style's 174)."""
    start = words[0][1] - 0.2
    parts, prev = (['{\\an8}'] if top > 0 else ['{\\an2}']) if top else [], start
    for w, a, b in words:
        if a - prev > 0.02: parts.append('{\\k%d}' % int(round((a - prev) * 100)))
        bare = w.strip(',.!?').lower(); tok = next((x for x in text.split() if x.strip(',.!?').lower() == bare), w)
        text = text.replace(tok, '', 1)
        col = '{\\1c%s\\2c%s}' % (RED, RED) if bare in KEY else ''
        parts.append('{\\kf%d}%s%s%s ' % (max(1, int(round((b - a) * 100))), col, tok, '{\\1c%s\\2c&H00FFFFFF&}' % GOLD if col else ''))
        prev = b
    return f'Dialogue: 0,{ts(start)},{ts(end)},Sub,,0,0,{abs(int(top)) if top else 0},,{"".join(parts).strip()}', start


def make_sfx(kind, dur, path):
    src = {'flip': f'anoisesrc=d={dur}:c=pink:a=0.6,highpass=f=900,lowpass=f=7000,afade=t=in:d=0.03,afade=t=out:st={dur * 0.4:.2f}:d={dur * 0.6:.2f}',
           'tap': f'anoisesrc=d={dur}:c=brown:a=0.9,lowpass=f=1800,afade=t=out:st=0.01:d={dur - 0.01:.2f}',
           'click': f'sine=f=1900:d={dur},afade=t=out:st=0.0:d={dur:.2f}',
           'swish': f'anoisesrc=d={dur}:c=pink:a=0.6,bandpass=f=1800:width_type=h:w=2500,afade=t=in:d={dur * 0.4:.2f},afade=t=out:st={dur * 0.4:.2f}:d={dur * 0.6:.2f}',
           'sand': f'anoisesrc=d={dur}:c=white:a=0.3,highpass=f=4000,tremolo=f=17:d=0.6,afade=t=in:d=0.1,afade=t=out:st={max(0.0, dur - 0.2):.2f}:d=0.2',
           'step': f'anoisesrc=d={dur}:c=brown:a=0.8,lowpass=f=900,afade=t=out:st=0.01:d={dur - 0.01:.2f}'}[kind]
    run(['ffmpeg', '-y', '-nostdin', '-f', 'lavfi', '-i', src, '-ar', str(SR), '-ac', '1', str(path)])


def load(path, ss=0.0, t=None):
    cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{ss}']
    if t: cmd += ['-t', f'{t}']
    cmd += ['-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode: raise SystemExit(f'decode failed {path}')
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)


def db(x):
    return 20 * np.log10(max(1e-9, x))


def rms(x):
    return float(np.sqrt(np.mean(x * x))) if len(x) else 0.0


def lufs_file(path):
    """11/21: measure the written WAV itself (load() + repeat gave -16 while the file was really -19 LUFS)."""
    err = run(['ffmpeg', '-nostdin', '-i', str(path), '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'])
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', err)
    return float(m[-1]) if m else None


def lufs_of(stereo, work):
    raw = work / 'meter.f32'; stereo.astype(np.float32).tofile(raw)
    err = run(['ffmpeg', '-nostdin', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw), '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'])
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', err)
    return float(m[-1]) if m else None


def mix(n, voices, sfx, work):
    """Voices at their times; music ducked to (speech level - 18 dB), 1/4 of that where nobody speaks; one gain to -16 LUFS."""
    voice = np.zeros(n)
    for p, at in voices:
        x = load(p); i = int(at * SR); j = min(n, i + len(x)); voice[i:j] += x[:j - i]
    # speech mask: 20 ms frames over -45 dBFS, gaps shorter than 1.0 s bridged (the music does not come up between sentences)
    fr = SR // 50; nf = n // fr
    act = np.array([rms(voice[k * fr:(k + 1) * fr]) > 10 ** (-45 / 20) for k in range(nf)])
    idx = np.flatnonzero(act)
    speech = np.zeros(nf, bool)
    if len(idx):
        speech[idx] = True
        for a, b in zip(idx, idx[1:]):
            if b - a < 50: speech[a:b] = True
    sp = np.repeat(speech, fr); sp = np.concatenate([sp, np.zeros(n - len(sp), bool)])
    v_level = rms(voice[sp]) if sp.any() else rms(voice)
    music = load(MUSIC, ss=0.3, t=n / SR + 0.1)[:n]
    if len(music) < n: music = np.concatenate([music, np.zeros(n - len(music))])
    # music level measured over 1 s windows (every 0.25 s): its gain follows it, so the bed stays 18 dB under the speech level
    target = 10 ** ((db(v_level) - DUCK_DB) / 20)
    cs = np.concatenate([[0.0], np.cumsum(music * music)]); hop = SR // 4; centers = np.arange(0, n, hop); lv = []
    for c in centers:
        a, b = max(0, c - SR // 2), min(n, c + SR // 2); lv.append(np.sqrt(max(1e-12, (cs[b] - cs[a]) / max(1, b - a))))
    lv = np.interp(np.arange(n), centers, np.array(lv))
    gm = target / np.maximum(lv, 1e-4); gm = np.minimum(gm, 4 * np.median(gm))       # no huge boost in near-silent bits
    env = np.where(sp, 1.0, QUIET) * gm
    k = int(0.3 * SR); env = np.convolve(env, np.ones(k) / k, mode='same')          # 0.3 s ramps
    t = np.arange(n) / SR; fade = np.clip(t / 0.6, 0, 1) * np.clip((n / SR - t) / 1.2, 0, 1)
    music = music * env * fade
    fx = np.zeros(n)
    for j, (p, at, under) in enumerate(sfx):
        x = load(p); a = np.abs(x) > 1e-4
        x = x * (10 ** ((db(v_level) - under) / 20) / max(1e-9, rms(x[a]) if a.any() else rms(x)))
        i = int(at * SR); jj = min(n, i + len(x)); fx[i:jj] += x[:jj - i]
    out = voice + music + fx
    stereo = np.repeat(out[:, None], 2, axis=1)
    L0 = lufs_of(stereo, work); gain = 10 ** ((TARGET_LUFS - L0) / 20) if L0 is not None else 1.0
    raw = work / 'mix.f32'; (stereo * gain).astype(np.float32).tofile(raw)
    run(['ffmpeg', '-y', '-nostdin', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw), '-af', 'alimiter=limit=0.891:level=false',
         '-c:a', 'pcm_s16le', str(work / 'audio.wav')])
    final = load(work / 'audio.wav')
    L1 = lufs_file(work / 'audio.wav')
    if L1 is not None and abs(L1 - TARGET_LUFS) > 1.0:                                   # rule 13.1: short tracks, correct once
        run(['ffmpeg', '-y', '-nostdin', '-i', str(work / 'audio.wav'), '-af', f'volume={TARGET_LUFS - L1:.2f}dB,alimiter=limit=0.891:level=false',
             '-c:a', 'pcm_s16le', str(work / 'audio2.wav')])
        shutil.move(str(work / 'audio2.wav'), str(work / 'audio.wav'))
        L1 = lufs_file(work / 'audio.wav')
    print(f'loudness: mix {L0} LUFS -> gain {db(gain):+.1f} dB -> final {L1} LUFS (target {TARGET_LUFS})')
    print('second  voice dB  music dB  (speech seconds: music should be ~18 dB under the voice; no-voice seconds ~12 dB lower still)')
    for s in range(int(n / SR + 0.999)):
        a, b = s * SR, min(n, (s + 1) * SR)
        vv, mm = rms(voice[a:b] * gain), rms(music[a:b] * gain)
        print(f'{s:5d}  {db(vv):8.1f}  {db(mm):8.1f}  {"speech" if sp[a:b].mean() > 0.5 else "no voice"}')


def main():
    runs = [Path(p) for p in sys.argv[1:] if not p.startswith('--')]
    frames = {}
    for r in runs:
        for d in (r / 'tout').iterdir():
            if d.is_dir(): frames[d.name] = sorted(d.glob('f*.png'))
    words = json.loads((AUDIO / 'australia_words.json').read_text(encoding='utf-8'))
    work = Path(tempfile.gettempdir()) / 'wrt_compose_australia'   # local disk: copying hundreds of PNGs inside Google Drive is very slow
    shutil.rmtree(work, ignore_errors=True); work.mkdir(parents=True, exist_ok=True)
    clips, voices, starts, t0 = [], [], {}, 0.0
    for shot, dur, lines in SHOTS:
        starts[shot] = t0
        fs = frames[shot]; need = int(round(dur * 12))
        if len(fs) < need: raise SystemExit(f'{shot}: {len(fs)} frames, need {need}')
        seq = work / shot; seq.mkdir(parents=True, exist_ok=True)
        for i, p in enumerate(fs[:need]): shutil.copy(p, seq / f'{i:04d}.png')
        clip = work / f'{shot}.mp4'; clips.append(clip)
        run(['ffmpeg', '-y', '-nostdin', '-framerate', '12', '-i', str(seq / '%04d.png'), '-vf', f'scale={W}:{H},fps=24,format=yuv420p', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', str(clip)])
        for key, at in lines: voices.append((AUDIO / f'australia_{key}.mp3', t0 + at))
        t0 += dur
    # subtitle lines (absolute times); each one ends 0.2 s before the next one appears
    ab = lambda key, shot, at: [(w, starts[shot] + at + a, starts[shot] + at + b) for w, a, b in words[key]['words']]
    L = [('q', ab('q', 'AU1', 0.4), words['q']['text'], 'AU1'),
         ('a', ab('a', 'AU1', 2.6), words['a']['text'], 'AU1'),
         ('soccer', ab('soccer', 'AU2', 0.5), words['soccer']['text'], 'AU2'),
         ('four', ab('four', 'AU3', 0.4), words['four']['text'], 'AU3'),
         ('a4', ab('a', 'AU4', 0.4), words['a']['text'], 'AU4'),
         ('sing', ab('sing', 'AU4', 3.3), words['sing']['text'], 'AU4'),
         ('la', ab('la', 'AU4', 4.95), 'La la la, la la la!', 'AU4')]
    ends = {'q': None, 'a': starts['AU2'] - 0.05, 'soccer': starts['AU3'] - 0.05, 'four': starts['AU4'] - 0.05, 'a4': None, 'sing': None, 'la': t0 - 0.05}
    ass = []
    for i, (key, ws, text, shot) in enumerate(L):
        end = ends[key] if ends[key] is not None else L[i + 1][1][0][1] - 0.2 - 0.2
        if i + 1 < len(L): end = min(end, L[i + 1][1][0][1] - 0.2 - 0.2)
        line, st = karaoke(ws, text, end, top=SUB_POS[shot])
        ass.append(line)
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
Dialogue: 1,{ts(0)},{ts(t0)},Badge,,0,0,0,,{BADGE}
"""
    (work / 'subs.ass').write_text(head + '\n'.join(ass) + '\n', encoding='utf-8')
    (work / 'list.txt').write_text(''.join(f"file '{c.as_posix()}'\n" for c in clips), encoding='utf-8')
    run(['ffmpeg', '-y', '-nostdin', '-f', 'concat', '-safe', '0', '-i', str(work / 'list.txt'), '-c', 'copy', str(work / 'video.mp4')])
    sfx = []
    for j, (shot, at, kind, d, under) in enumerate(SFX):
        p = work / f'sfx{j}.wav'; make_sfx(kind, d, p); sfx.append((p, starts[shot] + at, under))
    mix(int(round(t0 * SR)), voices, sfx, work)
    OUT.mkdir(exist_ok=True); WEB.mkdir(parents=True, exist_ok=True)
    fonts = work / 'fonts'; fonts.mkdir(exist_ok=True)
    for f in FONTDIR.glob('ComicRelief-*.ttf'): shutil.copy(f, fonts / f.name)
    # three small steps in the local work folder (one combined ffmpeg call hung for 8 minutes), then copy to Google Drive; no -shortest
    run(['ffmpeg', '-y', '-nostdin', '-i', 'video.mp4', '-i', 'audio.wav', '-vf', 'ass=subs.ass:fontsdir=fonts', '-map', '0:v', '-map', '1:a',
         '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
         '-movflags', '+faststart', '-t', f'{t0}', 'film.mp4'], cwd=work)
    run(['ffmpeg', '-y', '-nostdin', '-i', str(work / 'film.mp4'), '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-c:a', 'copy',
         '-movflags', '+faststart', str(work / 'film720.mp4')])
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0',
                        str(work / 'film.mp4')], capture_output=True, text=True)
    print('frames', r.stdout.strip(), 'expected', round(t0 * 24))
    if '--test' in sys.argv:                     # dry run (fake frames): leave the results in the work folder only
        print('TEST run: not copied to out/ or web/video/:', work / 'film.mp4'); return
    shutil.copy(work / 'film.mp4', OUT / f'{NAME}.mp4'); shutil.copy(work / 'film720.mp4', WEB / f'{WEBNAME}.mp4')
    for p in (OUT / f'{NAME}.mp4', WEB / f'{WEBNAME}.mp4'): print(p, round(p.stat().st_size / 1e6, 2), 'MB')


if __name__ == '__main__':
    main()
