"""USA school-bus film (derived from uk_compose.py): Colab frames (even frames, shown 2 each = 12 fps stop-motion) + voices + karaoke
subtitles + quiet foley + music -> MP4.
  python tabletop/src/usa_compose.py <qa run dir with tout/US1..US4> [more run dirs]   (later dirs replace earlier shots with the same name)
  python tabletop/src/usa_compose.py --audio-only                                       (mix and check the sound only, no frames needed)
Output: tabletop/out/usa_school.mp4 (1080p) and web/video/usa.mp4 (720p, crf 20 = original quality, shared rule 7.11).
Subtitles: Comic Relief 82 px karaoke (white -> gold), the time words "seven thirty-five" in red, raised: bottom margin 174 (>= 84 px),
  a line always ends 0.2 s before the next one starts (libass would push the next line up otherwise). No Chinese subtitles.
Sound (teacher 11/20, shared rules 6.4 / 13.1-13.4), mixed in numpy, NOT with loudnorm (it is dynamic and undoes the ducking):
  every voice clip to the same level; music during talking = 18 dB under the voice (per-second RMS, measured and printed);
  music where nobody talks = 1/4 of its full level (full = music matched to the voice level); foley -6 dB (-11 dB where nobody talks);
  then ONE gain for the whole film to -16 LUFS (ffmpeg ebur128) and alimiter level=false. A check table is printed.
Timeline: each shot lasts round(DUR*12)/12 s, exactly as many frames as the video uses, so sound and subtitles stay on the pictures."""
import json, re, shutil, subprocess, sys, tempfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FONTDIR = Path.home() / 'AppData' / 'Local' / 'Microsoft' / 'Windows' / 'Fonts'
AUDIO = ROOT / 'audio'; OUT = ROOT / 'out'; WEB = ROOT.parent / 'web' / 'video'
MUSIC = AUDIO / 'music_holiday.wav'   # copy of 2026 Thanksgiving/opening-video/music/holiday/s7 instrumental (teacher's own generated track)
W, H, SR = 1920, 1080, 48000
# keep in step with usa_school.py (DUR, VOICE)
SHOTS = [('US1', 5.6, [('q', 0.4), ('a', 2.45)]), ('US2', 3.8, []), ('US3', 4.2, [('gm', 0.3)]), ('US4', 8.8, [('a2', 0.4), ('bus', 3.6)])]
# subtitle position per shot: 0 = default bottom (MarginV 174), > 0 from the top edge, < 0 distance from the bottom edge (>= 84)
SUB_POS = {'US1': 0, 'US2': 0, 'US3': 0, 'US4': 0}
# foley: (shot, start s, kind, length s) -- times follow the actions in usa_school.py
SFX = [('US1', 0.10, 'birds', 1.1), ('US2', 0.10, 'birds', 1.2), ('US2', 1.45, 'click', 0.07),
       ('US3', 0.30, 'engine', 3.25), ('US3', 3.30, 'brake', 0.55), ('US3', 3.55, 'door', 0.40)]
RED = '&H003C3CE6&'; GOLD = '&H0000D7FF&'
KEY = {'seven', 'thirty-five'}
VOICE_DBFS = -20.0         # every voice clip (its spoken part) is set to this RMS before the final gain
TALK_DB, QUIET_GAIN, SFX_DB, SFX_QUIET_DB = -18.0, 0.25, -6.0, -11.0
TARGET_LUFS = -16.0


def run(cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=cwd)
    if r.returncode: print(r.stderr[-2500:]); raise SystemExit('ffmpeg failed')
    return r.stdout + r.stderr


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
    return first, f'Dialogue: 0,{ts(first)},{ts(end)},Sub,,0,0,{abs(int(top)) if top else 0},,{"".join(parts).strip()}'


def decode(path, ss=0.0, t=None):
    cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{ss}', '-i', str(path)] + (['-t', f'{t}'] if t else []) + ['-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode: raise SystemExit('decode failed: %s' % path)
    return np.frombuffer(r.stdout, dtype='<f4').astype(np.float64)


def db(x):
    return 20 * np.log10(max(float(x), 1e-9))


def active_rms(x, gate_db=-45.0):
    """RMS of the 20 ms blocks that are not silence (the spoken / sounding part)."""
    n = int(SR * 0.02); k = len(x) // n
    if k == 0: return float(np.sqrt(np.mean(x ** 2))) if len(x) else 0.0
    b = np.sqrt(np.mean(x[:k * n].reshape(k, n) ** 2, axis=1))
    on = b[b > 10 ** (gate_db / 20) * max(1e-9, b.max())]
    return float(np.sqrt(np.mean(on ** 2))) if len(on) else 0.0


def make_sfx(kind, dur, path):
    """Quiet little foley made from noise / sine (no files): birds, lunchbox handle click, bus engine, air brake, door."""
    src = {'birds': f'sine=f=3200:d={dur},vibrato=f=14:d=0.9,tremolo=f=6:d=1.0,afade=t=in:d=0.05,afade=t=out:st={dur * 0.6:.2f}:d={dur * 0.4:.2f}',
           'click': f'anoisesrc=d={dur}:c=white:a=0.8,highpass=f=2500,afade=t=out:st=0.005:d={dur - 0.005:.3f}',
           'engine': f'anoisesrc=d={dur}:c=brown:a=0.9,lowpass=f=260,tremolo=f=9:d=0.35,afade=t=in:d=0.8,afade=t=out:st={dur - 0.6:.2f}:d=0.6',
           'brake': f'anoisesrc=d={dur}:c=white:a=0.6,highpass=f=3000,lowpass=f=9000,afade=t=in:d=0.02,afade=t=out:st={dur * 0.3:.2f}:d={dur * 0.7:.2f}',
           'door': f'anoisesrc=d={dur}:c=pink:a=0.6,bandpass=f=900:width_type=h:w=1200,afade=t=in:d=0.05,afade=t=out:st={dur * 0.5:.2f}:d={dur * 0.5:.2f}'}[kind]
    run(['ffmpeg', '-nostdin', '-y', '-f', 'lavfi', '-i', src, '-ar', str(SR), '-ac', '1', str(path)])


def ebur(path):
    out = run(['ffmpeg', '-nostdin', '-hide_banner', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', out); p = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', out)
    return float(m[-1]), (float(p[-1]) if p else None)


def timeline():
    """Shot starts / lengths in seconds as the video has them (whole 12 fps frames)."""
    starts, t0 = {}, 0.0
    for shot, dur, lines in SHOTS:
        starts[shot] = t0; t0 += round(dur * 12) / 12
    return starts, t0


def mix_audio(work, words):
    starts, total = timeline()
    N = int(round(total * SR))
    voice = np.zeros(N); sfx = np.zeros(N)
    spans = []
    for shot, dur, lines in SHOTS:
        for key, at in lines:
            x = decode(AUDIO / f'usa_{key}.mp3'); r = active_rms(x)
            x = x * (10 ** (VOICE_DBFS / 20) / max(r, 1e-9))
            i0 = int(round((starts[shot] + at) * SR)); i1 = min(N, i0 + len(x))
            voice[i0:i1] += x[:i1 - i0]
            ws = words[key]['words']
            spans.append((starts[shot] + at + ws[0][1] - 0.12, starts[shot] + at + ws[-1][2] + 0.25))
    talking = np.zeros(N, dtype=bool)
    for a, b in spans: talking[max(0, int(a * SR)):min(N, int(b * SR))] = True
    for j, (shot, at, kind, d) in enumerate(SFX):
        p = work / f'sfx{j}.wav'; make_sfx(kind, d, p)
        x = decode(p); x = x * (10 ** (VOICE_DBFS / 20) / max(active_rms(x), 1e-9))
        i0 = int(round((starts[shot] + at) * SR)); i1 = min(N, i0 + len(x))
        g = SFX_DB if talking[min(N - 1, i0 + (i1 - i0) // 2)] else SFX_QUIET_DB
        sfx[i0:i1] += x[:i1 - i0] * 10 ** (g / 20)
    music = decode(MUSIC, ss=0.3, t=total + 0.1)[:N]
    if len(music) < N: music = np.pad(music, (0, N - len(music)))
    music = music * (10 ** (VOICE_DBFS / 20) / max(active_rms(music), 1e-9))      # "full" = as loud as the voices
    # talking gain: measured per second so that the music is 18 dB under the voice (rule 6.4)
    sec = SR; diffs = []
    for s in range(int(total)):
        a, b = s * sec, (s + 1) * sec
        if talking[a:b].mean() > 0.8:
            diffs.append(db(np.sqrt(np.mean(voice[a:b] ** 2))) - db(np.sqrt(np.mean(music[a:b] ** 2))))
    talk_gain = 10 ** ((TALK_DB + float(np.median(diffs) if diffs else 0.0)) / 20) if diffs else 10 ** (TALK_DB / 20)
    env = np.where(talking, talk_gain, QUIET_GAIN).astype(np.float64)
    ramp = int(0.15 * SR); k = np.ones(ramp) / ramp
    env = np.convolve(np.pad(env, (ramp, ramp), mode='edge'), k, mode='same')[ramp:-ramp]   # 0.15 s ramps, no clicks
    fade_in, fade_out = int(0.6 * SR), int(1.2 * SR)
    env[:fade_in] *= np.linspace(0, 1, fade_in); env[-fade_out:] *= np.linspace(1, 0, fade_out)
    mus = music * env
    mix = voice + sfx + mus
    raw = work / 'mix_pre.wav'
    write_wav(raw, mix)
    I, pk = ebur(raw)
    g = 10 ** ((TARGET_LUFS - I) / 20)
    write_wav(raw, mix * g)
    run(['ffmpeg', '-nostdin', '-y', '-i', str(raw), '-af', 'alimiter=limit=0.891:level=false', '-ac', '2', '-ar', str(SR), str(work / 'audio.wav')])
    I2, pk2 = ebur(work / 'audio.wav')
    if abs(I2 - TARGET_LUFS) > 1.0:                                      # one fix-up with a plain volume (rule 13.1)
        run(['ffmpeg', '-nostdin', '-y', '-i', str(work / 'audio.wav'), '-af', f'volume={TARGET_LUFS - I2:.2f}dB', str(work / 'audio2.wav')])
        shutil.move(str(work / 'audio2.wav'), str(work / 'audio.wav')); I2, pk2 = ebur(work / 'audio.wav')
    # check table: per-second voice and music level after the final gain
    print('sec  voice_dB  music_dB  diff  part')
    tk, qt = [], []
    for s in range(int(np.ceil(total))):
        a, b = s * sec, min(N, (s + 1) * sec)
        v, m = db(np.sqrt(np.mean((voice[a:b] * g) ** 2))), db(np.sqrt(np.mean((mus[a:b] * g) ** 2)))
        part = 'talk' if talking[a:b].mean() > 0.8 else ('quiet' if talking[a:b].mean() < 0.05 else 'mixed')
        if part == 'talk': tk.append(v - m)
        if part == 'quiet': qt.append(m - db(np.sqrt(np.mean((music[a:b] * g) ** 2))))     # vs the same seconds at full level
        print(f'{s:3d}  {v:8.1f}  {m:8.1f}  {v - m:5.1f}  {part}')
    print(f'MIX talking: music under voice median {np.median(tk) if tk else float("nan"):.1f} dB (target 18) | '
          f'quiet parts: music {np.median(qt) if qt else float("nan"):.1f} dB re full (target {db(QUIET_GAIN):.1f}) | '
          f'film {I2:.1f} LUFS (target {TARGET_LUFS}), peak {pk2} dBFS')
    return total


def write_wav(path, x):
    p = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_f32le', str(path)],
                       input=np.asarray(x, dtype='<f8').tobytes(), capture_output=True)
    if p.returncode: print(p.stderr.decode('utf-8', 'replace')[-1500:]); raise SystemExit('wav write failed')


def subtitles(words):
    starts, total = timeline()
    items = []                                                        # (abs start of the line, key, text, words, shot)
    for shot, dur, lines in SHOTS:
        for key, at in lines:
            w = words[key]; t0 = starts[shot] + at
            if key == 'bus':                                          # two sentences: one at a time
                ws = w['words']; cut = next(i for i, x in enumerate(ws) if x[0] == 'The')
                items.append((t0, ws[:cut], 'I go to school by school bus.', shot, t0 + ws[cut][1] - 0.2))
                items.append((t0, ws[cut:], 'The bus is yellow.', shot, None))
            else:
                items.append((t0, w['words'], w['text'], shot, None))
    ass = []
    for i, (t0, ws, text, shot, end) in enumerate(items):
        shot_end = starts[shot] + round(dict((s, d) for s, d, _ in SHOTS)[shot] * 12) / 12 - 0.05
        nxt = (items[i + 1][0] + items[i + 1][1][0][1] - 0.2) if i + 1 < len(items) else 1e9   # next line's first appearance
        end = min(end or shot_end, shot_end, nxt - 0.2)
        first, line = karaoke(ws, t0, text, end, top=SUB_POS[shot])
        ass.append(line); print(f'SUB {first:6.2f}-{end:6.2f} {text}')
    return ass


def main():
    words = json.loads((AUDIO / 'usa_words.json').read_text(encoding='utf-8'))
    work = Path(tempfile.gettempdir()) / 'wrt_compose_usa'      # local disk: copying hundreds of PNGs inside Google Drive is very slow
    shutil.rmtree(work, ignore_errors=True); work.mkdir(parents=True, exist_ok=True)
    if sys.argv[1:] == ['--audio-only']:
        mix_audio(work, words); subtitles(words); print(work / 'audio.wav'); return
    runs = [Path(p) for p in sys.argv[1:]]
    frames = {}
    for r in runs:
        for d in (r / 'tout').iterdir():
            if d.is_dir(): frames[d.name] = sorted(d.glob('f*.png'))
    clips = []
    for shot, dur, lines in SHOTS:
        fs = frames.get(shot, []); need = int(round(dur * 12))
        if len(fs) < need: raise SystemExit(f'{shot}: {len(fs)} frames, need {need}')
        seq = work / shot; seq.mkdir(parents=True, exist_ok=True)
        for i, p in enumerate(fs[:need]): shutil.copy(p, seq / f'{i:04d}.png')
        clip = work / f'{shot}.mp4'; clips.append(clip)
        run(['ffmpeg', '-nostdin', '-y', '-framerate', '12', '-i', str(seq / '%04d.png'), '-vf', f'scale={W}:{H},fps=24,format=yuv420p', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', str(clip)])
    total = mix_audio(work, words)
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
Dialogue: 1,{ts(0)},{ts(total)},Badge,,0,0,0,,USA  {{\\c{GOLD}}}7:35
"""
    (work / 'subs.ass').write_text(head + '\n'.join(subtitles(words)) + '\n', encoding='utf-8')
    (work / 'list.txt').write_text(''.join(f"file '{c.as_posix()}'\n" for c in clips), encoding='utf-8')
    # silent picture first (stream copy), then the full sound track trimmed to the picture length (no -shortest, rule 6.5)
    run(['ffmpeg', '-nostdin', '-y', '-f', 'concat', '-safe', '0', '-i', str(work / 'list.txt'), '-c', 'copy', str(work / 'video.mp4')])
    fonts = work / 'fonts'; fonts.mkdir(exist_ok=True)
    for f in FONTDIR.glob('ComicRelief-*.ttf'): shutil.copy(f, fonts / f.name)
    run(['ffmpeg', '-nostdin', '-y', '-i', 'video.mp4', '-i', 'audio.wav', '-vf', 'ass=subs.ass:fontsdir=fonts', '-map', '0:v', '-map', '1:a',
         '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-af', 'apad', '-t', f'{total:.4f}',
         '-movflags', '+faststart', 'film.mp4'], cwd=work)
    run(['ffmpeg', '-nostdin', '-y', '-i', str(work / 'film.mp4'), '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-c:a', 'copy',
         '-movflags', '+faststart', str(work / 'film720.mp4')])
    OUT.mkdir(exist_ok=True); WEB.mkdir(parents=True, exist_ok=True)
    shutil.copy(work / 'film.mp4', OUT / 'usa_school.mp4'); shutil.copy(work / 'film720.mp4', WEB / 'usa.mp4')
    want = int(round(total * 24))
    for p in (OUT / 'usa_school.mp4', WEB / 'usa.mp4'):
        nb = run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames,width,height', '-of', 'csv=p=0', str(p)]).strip()
        print(p, round(p.stat().st_size / 1e6, 2), 'MB', 'frames,size:', nb, 'want frames', want)


if __name__ == '__main__':
    main()
