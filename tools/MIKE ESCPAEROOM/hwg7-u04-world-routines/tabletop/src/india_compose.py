"""India "go home" film (derived from egypt_compose.py / kenya_compose.py): Colab frames (even frames, shown 2 each = 12 fps
stop-motion) + voices + karaoke subtitles + little sounds + music -> MP4.
  python tabletop/src/india_compose.py <qa run dir with tout/IN1..IN4> [more run dirs]   (later dirs replace earlier shots)
  python tabletop/src/india_compose.py --audio-only <out.wav>                          (only the sound mix, for checking)
Output: tabletop/out/india_home.mp4 (1080p) and web/video/india.mp4 (720p, same quality settings, for the website after the
teacher's OK).
Subtitles: Comic Relief 82 px karaoke, raised 56 px (bottom margin 174 >= 84), the time words "two forty" in red, every line ends
0.2 s before the next one appears.
Sound (shared rules 6.4 / 13, teacher 11/20): every voice line at the same level; music 18 dB under the voice while someone speaks
(checked with 1-second RMS), in the parts without voice the music goes to 1/4 of the voice level (-12 dB; our reading of
"1/4"); no loudnorm on the ducked mix: the whole film gets ONE gain to -16 LUFS, then a limiter with level=false; measured again.
Little sounds are made here with numpy (no files): school bell, lid off (ting), lid on, auto-rickshaw engine (driving in, then
idling), brake squeak. Their times follow EVENTS in india_home.py. The picture and the sound fade out over the last 0.8 s (IN4).
"""
import json, re, shutil, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parents[1]
FONTDIR = Path.home() / 'AppData' / 'Local' / 'Microsoft' / 'Windows' / 'Fonts'
AUDIO = ROOT / 'audio'; OUT = ROOT / 'out'; WEB = ROOT.parent / 'web' / 'video'
MUSIC = AUDIO / 'music_holiday.wav'   # copy of 2026 Thanksgiving/opening-video/music/holiday/s7 instrumental (teacher's own generated track)
W, H, SR, FPS = 1920, 1080, 48000, 12
NAME, ID, PREFIX = 'india_home', 'india', 'india'
BADGE = 'India  {\\c&H0000D7FF&}2:40'
# keep in step with india_home.py (DUR, VOICE)
SHOTS = [('IN1', 5.6, [('q', 0.5), ('a', 2.6)]), ('IN2', 3.8, [('empty', 1.7)]), ('IN3', 3.0, [('comes', 1.0)]),
         ('IN4', 7.6, [('a', 0.5), ('by', 2.75)])]
JOIN = {}
# subtitle position per shot: 0 = default bottom (MarginV 174), > 0 from the top edge, < 0 distance from the bottom edge (>= 84)
SUB_POS = {'IN1': -100, 'IN2': 0, 'IN3': 0, 'IN4': 0}   # check on the first full render: IN1 line vs the clock, IN2 vs the box, IN4 vs his shoes
# little sounds: (shot, start s, kind, length s, dB relative to the voice level) -- times = EVENTS in india_home.py
SFX = [('IN1', 0.0, 'bell', 1.2, -16), ('IN2', 1.25, 'ting', 0.15, -14), ('IN3', 0.65, 'ting2', 0.08, -14),
       ('IN3', 0.0, 'engine_in', 3.0, -15), ('IN3', 1.4, 'brake', 0.35, -20), ('IN4', 0.0, 'engine_idle', 7.6, -22)]
FADE_OUT = 0.8                         # IN4 "...then fade out" (storyboard): picture and sound
RED = '&H003C3CE6&'; GOLD = '&H0000D7FF&'
KEY = {'two', 'forty'}
VOICE_RMS = 0.1                        # every voice line scaled to this RMS (speech parts) before the final -16 LUFS gain
MUSIC_UNDER_DB, MUSIC_GAP = -18.0, 0.25
TARGET_LUFS = -16.0


def run(cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=cwd)
    if r.returncode: print(r.stderr[-2500:]); raise SystemExit('ffmpeg failed')
    return r


def ts(t):
    t = max(0.0, t); return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def karaoke(words, text, end, top=0):
    """One Dialogue line from absolute word times; each word fills white -> gold as it is spoken (\\kf), time words in red.
    top > 0: from the top edge; top < 0: from the bottom edge with that margin (instead of the style's 174)."""
    parts, prev = (['{\\an8}'] if top > 0 else ['{\\an2}']) if top else [], words[0][1] - 0.2
    first = prev
    for w, a, b in words:
        if a - prev > 0.02: parts.append('{\\k%d}' % int(round((a - prev) * 100)))
        bare = w.strip(',.!?').lower(); tok = next((x for x in text.split() if x.strip(',.!?').lower() == bare), w)
        text = text.replace(tok, '', 1)
        col = '{\\1c%s\\2c%s}' % (RED, RED) if bare in KEY else ''
        parts.append('{\\kf%d}%s%s%s ' % (max(1, int(round((b - a) * 100))), col, tok, '{\\1c%s\\2c&H00FFFFFF&}' % GOLD if col else ''))
        prev = b
    return f'Dialogue: 0,{ts(first)},{ts(end)},Sub,,0,0,{abs(int(top)) if top else 0},,{"".join(parts).strip()}'


def timeline():
    """Shot starts (frame exact: n frames at 12 fps), voice placements and subtitle lines with their end times."""
    words = json.loads((AUDIO / f'{PREFIX}_words.json').read_text(encoding='utf-8'))
    starts, mix, lines, t0 = {}, [], [], 0.0
    for shot, dur, ls in SHOTS:
        need = int(round(dur * FPS)); starts[shot] = (t0, need)
        skip = set()
        for key, at in ls:
            mix.append((AUDIO / f'{PREFIX}_{key}.mp3', t0 + at))
            if key in skip: continue
            ws = [[w, max(0.0, a) + t0 + at, max(0.0, b) + t0 + at] for w, a, b in words[key]['words']]
            text = words[key]['text']
            if key in JOIN:
                k2, full = JOIN[key]; at2 = dict(ls)[k2]; skip.add(k2)
                ws += [[w, max(0.0, a) + t0 + at2, max(0.0, b) + t0 + at2] for w, a, b in words[k2]['words']]
                text = words[full]['text']
            lines.append(dict(key=key, words=ws, text=text, shot=shot, appear=ws[0][1] - 0.2, last=ws[-1][2], shot_end=t0 + need / FPS))
        t0 += need / FPS
    for i, L in enumerate(lines):
        L['end'] = L['shot_end'] - 0.05
        if i + 1 < len(lines): L['end'] = min(L['end'], lines[i + 1]['appear'] - 0.2)
        if L['end'] < L['last'] + 0.05: print(f"WARN subtitle {L['key']} ends {L['end']:.2f} before its last word {L['last']:.2f}")
    return starts, mix, lines, t0, words


# ---------------- sound ----------------
def decode(path, ss=0.0):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{ss}', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


def write_wav(path, x):
    st = np.stack([x, x], axis=1).astype(np.float32).tobytes()
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', str(path)], input=st, check=True)


def lufs(path):
    r = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', str(path), '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
    return float(m[-1]) if m else None


def movavg(x, k):
    """Centred moving average of length k (cumulative sum: fast for 1-second windows)."""
    k = max(1, int(k)); c = np.concatenate([[0.0], np.cumsum(x, dtype=np.float64)])
    i = np.arange(len(x)); a = np.clip(i - k // 2, 0, len(x)); b = np.clip(i - k // 2 + k, 0, len(x))
    return (c[b] - c[a]) / np.maximum(1, b - a)


def active_rms(x):
    env = np.sqrt(movavg(x * x, 0.05 * SR))
    act = env > 0.1 * env.max()
    return float(np.sqrt(np.mean(x[act] ** 2))) if act.any() else 1e-9


def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band'); return signal.lfilter(b, a, x)


def lowpass(x, hi, order=2):
    b, a = signal.butter(order, hi / (SR / 2), 'low'); return signal.lfilter(b, a, x)


def synth(kind, dur):
    """Small foley made with numpy; peak-normalised to 1, the level is set by the dB in SFX."""
    n = int(dur * SR); t = np.arange(n) / SR; rng = np.random.default_rng(7)
    fade = lambda x, a, r: x * np.minimum(1, np.minimum(t / max(a, 1e-4), np.maximum(0, (dur - t)) / max(r, 1e-4)))
    if kind == 'rooster':                         # cock-a-doodle-doo: four syllables, harmonic tone with a nasal edge
        f = np.zeros(n); env = np.zeros(n)
        for (a, b, f0, f1) in ((0.00, 0.11, 520, 640), (0.13, 0.23, 650, 720), (0.26, 0.36, 720, 700), (0.42, 1.05, 820, 600)):
            i0, i1 = int(a * SR), min(n, int(b * SR)); u = np.linspace(0, 1, i1 - i0)
            f[i0:i1] = f0 + (f1 - f0) * (np.sin(np.pi * u) if b > 0.9 else u)
            env[i0:i1] = np.minimum(1, np.minimum(u / 0.12, (1 - u) / 0.2))
        f = np.where(f > 0, f, 600) * (1 + 0.03 * np.sin(2 * np.pi * 7 * t))
        ph = 2 * np.pi * np.cumsum(f) / SR
        x = sum(w * np.sin(k * ph) for k, w in ((1, 1.0), (2, 0.7), (3, 0.5), (4, 0.3), (5, 0.2), (6, 0.12)))
        x = bandpass(x + 0.15 * rng.standard_normal(n), 400, 5000) * env
    elif kind == 'yawn':
        x = decode(AUDIO / f'{PREFIX}_yawn.mp3')[:n]; x = np.pad(x, (0, n - len(x))); x = fade(x, 0.05, 0.25)
    elif kind == 'click':
        x = np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.006) + 0.6 * rng.standard_normal(n) * np.exp(-t / 0.002)
    elif kind == 'sip':
        x = lowpass(np.cumsum(rng.standard_normal(n)) * 0.02, 700) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)); x = fade(x, 0.06, 0.12)
    elif kind == 'clunk':                         # enamel cup set on wood
        x = (np.sin(2 * np.pi * 700 * t) + 0.5 * np.sin(2 * np.pi * 1530 * t)) * np.exp(-t / 0.03) + 0.4 * lowpass(rng.standard_normal(n), 2000) * np.exp(-t / 0.01)
    elif kind == 'bite':                          # soft fried dough
        x = bandpass(rng.standard_normal(n), 800, 3000) * np.exp(-t / 0.05) * (0.7 + 0.3 * np.sin(2 * np.pi * 25 * t))
    elif kind == 'tap':
        x = lowpass(rng.standard_normal(n), 1800) * np.exp(-t / 0.012)
    elif kind == 'bell':                          # electric school bell
        strike = np.abs(np.sin(2 * np.pi * 11 * t)) ** 3
        x = (np.sin(2 * np.pi * 1250 * t) + 0.6 * np.sin(2 * np.pi * 2930 * t) + 0.3 * np.sin(2 * np.pi * 4110 * t)) * (0.4 + 0.6 * strike); x = fade(x, 0.01, 0.35)
    elif kind in ('engine_in', 'engine_idle'):    # two-stroke putt-putt: noise bursts at the firing rate
        if kind == 'engine_in':
            rate = np.interp(t, [0, 1.7, dur], [17, 10, 9]); lvl = np.interp(t, [0, 0.15, 1.2, 1.7, dur], [0.0, 0.15, 1.0, 0.6, 0.5])
        else:
            rate = np.full(n, 9.0); lvl = np.full(n, 0.6)
        ph = np.cumsum(rate) / SR; pulse = np.exp(-((ph % 1.0) / 0.18))
        x = lowpass(np.cumsum(rng.standard_normal(n)) * 0.03, 650, 3) * pulse * lvl + 0.15 * lowpass(rng.standard_normal(n), 300) * lvl
        x = fade(x, 0.05, 0.3)
    elif kind == 'brake':
        f = np.linspace(2600, 2300, n); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.7 + 0.3 * np.sin(2 * np.pi * 30 * t)); x = fade(x, 0.04, 0.12)
    elif kind in ('ting', 'ting2'):               # steel lid off / pressed on
        d = 0.05 if kind == 'ting' else 0.02
        x = (np.sin(2 * np.pi * 3200 * t) + 0.5 * np.sin(2 * np.pi * 5100 * t)) * np.exp(-t / d)
    else:
        raise SystemExit('unknown sound ' + kind)
    return x / (np.abs(x).max() + 1e-9)


def make_audio(starts, mix, total, path):
    N = int(round(total * SR)); voice = np.zeros(N); sfx = np.zeros(N)
    for p, at in mix:
        x = decode(p); x = x * (VOICE_RMS / active_rms(x)); i = int(round(at * SR))
        seg = x[:max(0, N - i)]; voice[i:i + len(seg)] += seg
    for shot, at, kind, d, db in SFX:
        x = synth(kind, d) * VOICE_RMS * 2.5 * 10 ** (db / 20); i = int(round((starts[shot][0] + at) * SR))
        seg = x[:max(0, N - i)]; sfx[i:i + len(seg)] += seg
    # music: one steady bed, ducked by a gain curve from the voice activity
    m = decode(MUSIC, 0.3)
    while len(m) < N: m = np.concatenate([m, m])
    m = m[:N]
    win = SR                                                               # 1-second RMS (shared rule 6.4)
    m_rms = np.sqrt(movavg(m * m, win)) + 1e-6
    v_env = np.sqrt(movavg(voice * voice, 0.05 * SR))
    speak = v_env > 0.1 * VOICE_RMS
    speak = movavg(speak.astype(float), 0.4 * SR) > 0          # start ducking 0.2 s before a word, keep it 0.2 s after
    # under speech: 18 dB (+1.5 dB margin for the ramps) below the voice's own 1-second RMS over the speaking samples
    v_loc = np.sqrt(movavg(voice * voice, win) / np.maximum(movavg(speak.astype(float), win), 1e-3))
    v_loc = np.minimum(np.maximum(v_loc, 0.3 * VOICE_RMS), VOICE_RMS)
    target = np.where(speak, v_loc * 10 ** ((MUSIC_UNDER_DB - 1.5) / 20), VOICE_RMS * MUSIC_GAP)
    g = movavg(target / m_rms, 0.25 * SR)
    g = np.where(movavg(speak.astype(float), 0.25 * SR) > 0, np.minimum(g, (v_loc * 10 ** ((MUSIC_UNDER_DB - 1.5) / 20)) / m_rms), g)   # no ramp lifts the music under a word   # smooth 0.25 s ramps
    music = m * g
    tt = np.arange(N) / SR
    music *= np.minimum(1, np.minimum(tt / 0.6, np.maximum(0, total - tt) / 1.2))       # fade in 0.6 s, fade out 1.2 s
    x = voice + music + sfx
    if FADE_OUT > 0: x *= np.minimum(1, np.maximum(0, total - tt) / FADE_OUT)
    # check (1-second blocks): voice vs music while speaking, music vs voice level in the parts without voice
    diffs, gaps = [], []
    for s in range(int(total)):
        a, b = s * SR, (s + 1) * SR
        vr = np.sqrt(np.mean(voice[a:b][speak[a:b]] ** 2)) if speak[a:b].mean() > 0.5 else None
        mr = np.sqrt(np.mean(music[a:b] ** 2)) + 1e-9
        if vr: diffs.append(20 * np.log10(vr / (np.sqrt(np.mean(music[a:b][speak[a:b]] ** 2)) + 1e-9)))   # same speaking samples
        elif speak[a:b].mean() == 0 and s >= 1 and s < int(total) - 2: gaps.append(20 * np.log10(mr / VOICE_RMS))
    print('MIX voice-over-music while speaking (1 s RMS): ' + ', '.join(f'{d:.1f}' for d in diffs) + ' dB (want about 18)')
    print('MIX music in the parts without voice: ' + ', '.join(f'{d:.1f}' for d in gaps) + ' dB re voice (want about -12 = 1/4)')
    raw = path.with_name('mix_raw.wav'); write_wav(raw, x)
    L = lufs(raw); gain = TARGET_LUFS - L
    for k in range(3):                                                  # one gain, limiter with level=false, measure, correct
        run(['ffmpeg', '-nostdin', '-y', '-i', str(raw), '-af', f'volume={gain:.2f}dB,alimiter=limit=0.89:level=false', '-c:a', 'pcm_s16le', str(path)])
        L2 = lufs(path); print(f'MIX loudness {L2:.1f} LUFS (raw {L:.1f}, gain {gain:+.1f} dB)')
        if L2 is None or abs(L2 - TARGET_LUFS) <= 1.0: break
        gain += TARGET_LUFS - L2
    return path


def main():
    args = sys.argv[1:]
    starts, mix, lines, total, words = timeline()
    for L in lines: print(f"SUB {L['shot']} {L['key']:5s} {L['appear']:6.2f} -> {L['end']:6.2f} (last word {L['last']:.2f})  {L['text']}")
    print(f'total {total:.3f} s, {sum(n for _, n in starts.values())} frames at 12 fps')
    work = Path(tempfile.gettempdir()) / f'wrt_compose_{ID}'   # local disk: copying hundreds of PNGs inside Google Drive is very slow
    shutil.rmtree(work, ignore_errors=True); work.mkdir(parents=True, exist_ok=True)
    if args and args[0] == '--audio-only':
        out = Path(args[1]).resolve(); out.parent.mkdir(parents=True, exist_ok=True)
        make_audio(starts, mix, total, out); print(out); return
    runs = [Path(p) for p in args]
    frames = {}
    for r in runs:
        for d in (r / 'tout').iterdir():
            if d.is_dir(): frames[d.name] = sorted(d.glob('f*.png'))
    clips = []
    for shot, dur, ls in SHOTS:
        fs = frames.get(shot, []); need = starts[shot][1]
        if len(fs) < need: raise SystemExit(f'{shot}: {len(fs)} frames, need {need}')
        seq = work / shot; seq.mkdir(parents=True, exist_ok=True)
        for i, p in enumerate(fs[:need]): shutil.copy(p, seq / f'{i:04d}.png')
        clip = work / f'{shot}.mp4'; clips.append(clip)
        run(['ffmpeg', '-nostdin', '-y', '-framerate', '12', '-i', str(seq / '%04d.png'), '-vf', f'scale={W}:{H},fps=24,format=yuv420p', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', str(clip)])
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
Dialogue: 1,{ts(0)},{ts(total)},Badge,,0,0,0,,{BADGE}
"""
    ass = [karaoke(L['words'], L['text'], L['end'], top=SUB_POS[L['shot']]) for L in lines]
    (work / 'subs.ass').write_text(head + '\n'.join(ass) + '\n', encoding='utf-8')
    (work / 'list.txt').write_text(''.join(f"file '{c.as_posix()}'\n" for c in clips), encoding='utf-8')
    run(['ffmpeg', '-nostdin', '-y', '-f', 'concat', '-safe', '0', '-i', str(work / 'list.txt'), '-c', 'copy', str(work / 'video.mp4')])
    make_audio(starts, mix, total, work / 'audio.wav')
    fonts = work / 'fonts'; fonts.mkdir(exist_ok=True)
    for f in FONTDIR.glob('ComicRelief-*.ttf'): shutil.copy(f, fonts / f.name)
    vf = 'ass=subs.ass:fontsdir=fonts' + (f',fade=t=out:st={total - FADE_OUT:.3f}:d={FADE_OUT}' if FADE_OUT > 0 else '')
    # three small steps in the local work folder (one combined ffmpeg call hung for 8 minutes), no -shortest (audio is exactly the film length)
    run(['ffmpeg', '-nostdin', '-y', '-i', 'video.mp4', '-i', 'audio.wav', '-vf', vf, '-map', '0:v', '-map', '1:a',
         '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
         '-movflags', '+faststart', '-t', f'{total:.4f}', 'film.mp4'], cwd=work)
    run(['ffmpeg', '-nostdin', '-y', '-i', str(work / 'film.mp4'), '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-c:a', 'copy',
         '-movflags', '+faststart', str(work / 'film720.mp4')])
    want = sum(n for _, n in starts.values()) * 2
    for f in ('film.mp4', 'film720.mp4'):
        r = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets,width,height', '-of', 'csv=p=0', str(work / f)])
        print(f, r.stdout.strip(), f'(want {want} frames)')
    OUT.mkdir(exist_ok=True); WEB.mkdir(parents=True, exist_ok=True)
    shutil.copy(work / 'film.mp4', OUT / f'{NAME}.mp4'); shutil.copy(work / 'film720.mp4', WEB / f'{ID}.mp4')
    for p in (OUT / f'{NAME}.mp4', WEB / f'{ID}.mp4'): print(p, round(p.stat().st_size / 1e6, 2), 'MB')


if __name__ == '__main__':
    main()
