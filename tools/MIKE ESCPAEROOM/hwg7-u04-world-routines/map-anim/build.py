"""World Routines map animations (RDQ spec ../rdq/RDQ-spec-world-routines-map-animation-20261122.md, confirmed 11/22).
Built with the kaz-map-animation skill (installed in ~/.claude/skills, proprietary: never copied into this repo, never modified).

python build.py leg japan          # flight clip Taiwan -> Japan (the pilot); any station id after taiwan works
python build.py leg japan --sheet  # contact sheet only (QC before the full render)

Steps per clip: edge-tts voice (Jenny -12%, same as the site's question voice) -> word times (faster-whisper on a numpy array:
PyAV in this Python can't open files) -> scene JSON (16:9, built-in satellite globe, the skill's own captions NOT used) ->
render.mjs (voice + the skill's quiet sound effects) -> music bed 18 dB under the voice, 1/4 of that with no voice ->
one gain to -16 LUFS (+ alimiter), measured on the written file -> Comic Relief karaoke subtitles (bottom margin 174 px at 1080p)
-> out/<name>.mp4 (1080p) and web/video/map_<name>.mp4 (720p, CRF 20).
No answer times in the flight clips: the station puzzle asks for that time, so the clip shows the routine with a "?:??" clock."""
import asyncio, json, math, os, re, shutil, subprocess, sys
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SKILL = Path.home() / '.claude' / 'skills' / 'kaz-map-animation'
SITE_BANK = ROOT.parent.parent / 'monster-in-my-mind-site' / 'functions' / 'routines-content.json'
MUSIC = ROOT / 'web' / 'music' / 'opening.mp3'
FONTDIR = Path.home() / 'AppData' / 'Local' / 'Microsoft' / 'Windows' / 'Fonts'
WORK = Path(os.environ.get('TEMP', '/tmp')) / 'wr_mapanim'
OUT = HERE / 'out'; WEB = ROOT / 'web' / 'video'
W, H, FPS, SR = 1920, 1080, 30, 48000
VOICE = dict(voice='en-US-JennyNeural', pitch='+0Hz', rate='-12%')
GOLD = '&H0000D7FF&'
DUCK_DB, QUIET, TARGET = 18.0, 0.25, -16.0
# --hs: the he/she trip (/world-routines-he-she, 11/24): its own bank (routine words, names), its own work / out / web folders
#       -> out/hs/*.mp4 and web/video/hs/map_<name>.mp4. Same flights, same voice; the opening clip is shared.
HS = '--hs' in sys.argv
if HS:
    SITE_BANK = SITE_BANK.with_name('routines-hs-content.json'); WORK = WORK / 'hs'; OUT = OUT / 'hs'; WEB = WEB / 'hs'

# lon/lat of each station's place (city where the pupil lives) and a label anchor
PLACE = {
    'taiwan': (120.55, 23.92, 'Taiwan'), 'japan': (139.69, 35.69, 'Japan'), 'usa': (-87.6, 41.9, 'the USA'),
    'uk': (-0.13, 51.5, 'the UK'), 'spain': (-3.7, 40.42, 'Spain'), 'egypt': (31.24, 30.04, 'Egypt'),
    'kenya': (36.82, -1.29, 'Kenya'), 'india': (77.2, 28.61, 'India'), 'singapore': (103.82, 1.35, 'Singapore'),
    'australia': (151.21, -33.87, 'Australia'),
}
COUNTRY = {'taiwan': 'Taiwan', 'japan': 'Japan', 'usa': 'United States of America', 'uk': 'United Kingdom', 'spain': 'Spain',
           'egypt': 'Egypt', 'kenya': 'Kenya', 'india': 'India', 'singapore': 'Singapore', 'australia': 'Australia'}
# sea / air routes drawn on the map (lon, lat); the first point is the departure, the last the arrival
ROUTE = {
    'japan': [(121.9, 25.2), (124.5, 26.4), (128.5, 28.4), (132.5, 30.6), (136.0, 32.7), (138.9, 34.2), (139.75, 35.35)],
    # train: London -> Channel Tunnel -> Paris -> Bordeaux -> Madrid
    'spain': [(-0.13, 51.5), (1.3, 51.0), (2.35, 48.86), (0.7, 47.4), (-0.58, 44.84), (-1.8, 43.3), (-3.7, 40.42)],
    # ship: Singapore -> Java Sea -> Flores Sea -> Arafura Sea -> Torres Strait -> Coral Sea -> Sydney
    'australia': [(103.9, 1.2), (106.3, -1.2), (108.2, -3.4), (112.0, -5.6), (116.5, -6.6), (120.5, -7.3), (125.5, -7.6), (130.0, -8.6),
                  (135.0, -9.6), (140.0, -10.3), (142.4, -10.5), (144.6, -11.6), (146.2, -14.5), (148.2, -18.2), (151.5, -21.5),
                  (154.3, -25.0), (154.3, -29.0), (152.6, -32.6), (151.4, -33.85)],
}
# the plane to the USA crosses the Pacific: Japan is written 360 degrees to the west so the line does not run the long way round.
# The skill only draws a highlighted country at its own longitude, so the shifted country needs its own outline file
# (geo/extract_country.cjs copies the public-domain Natural Earth outline out of the skill's data, shifted).
LON_FIX = {'usa': {'a': -360.0}}
SHIFTED = {('usa', 'japan'): 'japan_west.geojson'}
# label anchor of each country: ([lon, lat] or None = the country's centre, labelDy in px)
LABEL = {'taiwan': (None, -95), 'japan': (None, -90), 'usa': ([-100, 39], 0), 'uk': ([-2, 54], -70), 'spain': ([-4, 39.2], 60),
         'egypt': ([29, 26], 0), 'kenya': ([38, 0.5], 70), 'india': ([79, 21], 0), 'singapore': ([103.8, 1.35], 60),
         'australia': ([134, -25], 0)}
ROUTINE_WORD = {'have breakfast': 'breakfast', 'have lunch': 'lunch', 'go to school': 'school', 'do my homework': 'homework',
                'have dinner': 'dinner', 'get up': 'get up', 'go home': 'go home', 'go to bed': 'bed', 'take a shower': 'shower',
                'play cricket': 'cricket', 'study English': 'English', 'do his homework': 'homework'}
LEGS = ['japan', 'usa', 'uk', 'spain', 'egypt', 'kenya', 'india', 'singapore', 'australia']
TRANSPORT_WORD = {'ship': 'by ship', 'plane': 'by plane', 'train': 'by train'}


def run(cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=cwd)
    if r.returncode: print(r.stdout[-1500:], r.stderr[-2500:]); raise SystemExit(f'failed: {cmd[0]}')
    return r.stdout + r.stderr


def stations():
    return {s['id']: s for s in json.load(open(SITE_BANK, encoding='utf-8'))['stations']}


async def tts(text, path):
    import edge_tts
    await edge_tts.Communicate(text, VOICE['voice'], pitch=VOICE['pitch'], rate=VOICE['rate']).save(str(path))


def load(path):
    """Any audio -> mono float at SR via ffmpeg (no PyAV)."""
    r =subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                       capture_output=True)
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


def words_of(wav):
    from faster_whisper import WhisperModel
    a, sr = sf.read(str(wav), dtype='float32')
    if a.ndim > 1: a = a.mean(axis=1)
    if sr != 16000:
        idx = np.arange(0, len(a), sr / 16000); a = np.interp(idx, np.arange(len(a)), a).astype(np.float32)
    m = WhisperModel('small', device='cpu', compute_type='int8')
    segs, _ = m.transcribe(a, language='en', word_timestamps=True)
    return [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]


def lufs_file(path):
    err = run(['ffmpeg', '-nostdin', '-i', str(path), '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'])
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', err)
    return float(m[-1]) if m else None


def rms(x):
    return float(np.sqrt(np.mean(x ** 2))) if len(x) else 0.0


def ts(t):
    t = max(0.0, t); return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def karaoke(ws, start, end):
    parts, prev = [], start
    for w, a, b in ws:
        if a - prev > 0.02: parts.append('{\\k%d}' % int(round((a - prev) * 100)))
        parts.append('{\\kf%d}%s ' % (max(1, int(round((b - a) * 100))), w))
        prev = b
    return f'Dialogue: 0,{ts(start)},{ts(end)},Sub,,0,0,0,,{"".join(parts).strip()}'


SAIL_T0, SAIL = 0.2, 3.2   # the transport icon travels the whole route (shot-2 seconds): start, duration


def travel_icons(icon, route, t0, dur):
    """The skill has no moving icon and its code must not be changed, so the trip is one icon element per frame,
    each alive for exactly one frame, placed at the head of the route line (same cubic in-out ease as the path draw)."""
    seg = [math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]) for i in range(len(route) - 1)]
    total = sum(seg)

    def at(prog):
        d = prog * total
        for i, L in enumerate(seg):
            if d <= L or i == len(seg) - 1:
                u = min(1.0, d / L) if L else 0
                return [route[i][0] + (route[i + 1][0] - route[i][0]) * u, route[i][1] + (route[i + 1][1] - route[i][1]) * u], i
            d -= L

    out = []
    n = int(round(dur * FPS))
    for f in range(n + 1):
        x = f / n
        prog = 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
        pt, i = at(prog)
        rot = 0
        if icon == 'plane':       # the plane drawing points LEFT; screen y grows southward
            rot = math.degrees(math.atan2(-(route[i + 1][1] - route[i][1]), route[i + 1][0] - route[i][0])) - 180
        el = {'type': 'icon', 'icon': icon, 'points': [pt], 'size': 92, 'color': 'white', 'rotate': round(rot, 1),
              't0': round(t0 + (f - 0.5) / FPS, 4), 'dur': 0.001, 'sfx': False}
        if f < n:
            el.update(t1=round(t0 + (f + 0.5) / FPS - 0.002, 4), outDur=0.001)
        else:                     # arrived: fade out as the red pin lands
            el.update(t1=round(t0 + dur + 0.15, 4), outDur=0.3)
        out.append(el)
    return out


def air_route(pa, pb, n=28):
    """Curved flight line (quadratic bezier): east-west trips bow to the north, north-south trips bow a little east."""
    dx, dy = pb[0] - pa[0], pb[1] - pa[1]
    dist = math.hypot(dx, dy)
    cx, cy = (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2
    if abs(dx) >= abs(dy): cy = min(66.0, cy + 0.2 * dist)
    else: cx += 0.18 * dist
    return [((1 - u) ** 2 * pa[0] + 2 * u * (1 - u) * cx + u * u * pb[0], (1 - u) ** 2 * pa[1] + 2 * u * (1 - u) * cy + u * u * pb[1])
            for u in (k / n for k in range(n + 1))]


def leg_scene(sid, S, vo_at, dur):
    """Flight clip: departure country tint + pin -> destination country solid + label -> the transport icon travels the route
    -> camera pushes to the destination -> routine tag with a '?:??' clock (the time is the station's puzzle answer)."""
    order = [s for s in sorted(S.values(), key=lambda s: s['order'])]
    i = next(k for k, s in enumerate(order) if s['id'] == sid)
    a, b = order[i - 1], order[i]
    fix = LON_FIX.get(sid, {})
    pa = (PLACE[a['id']][0] + fix.get('a', 0), PLACE[a['id']][1], PLACE[a['id']][2])
    pb = (PLACE[b['id']][0] + fix.get('b', 0), PLACE[b['id']][1], PLACE[b['id']][2])
    icon = {'ship': 'ship', 'plane': 'plane', 'train': 'train'}.get(b['transport'], 'plane')
    route = ROUTE.get(sid) or (air_route(pa, pb) if icon == 'plane' else [pa[:2], pb[:2]])
    mid = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
    span0 = max(24.0, abs(pa[0] - pb[0]) * 1.7, abs(pa[1] - pb[1]) * 2.4 * W / H)
    far = span0 > 70                # long trip: the camera ends much closer to the destination
    z, wx, wy = (0.62, 0.75, 0.7) if far else (0.88, 0.55, 0.4)
    word = ROUTINE_WORD[b['routine']]
    dl = span0 * H / W * 0.10      # shift the view south: both places stay above the subtitle band (y < 820 at 1080p)
    span1 = span0 * z
    cam0 = {'lon': mid[0], 'lat': mid[1] - dl, 'span': span0}
    cam1 = {'lon': mid[0] * (1 - wx) + pb[0] * wx, 'lat': mid[1] * (1 - wy) + pb[1] * wy - dl * z, 'span': span1}

    def region(cid, style, **kw):
        at, dy = LABEL[cid]
        e = {'type': 'region', 'set': 'countries', 'names': [COUNTRY[cid]], 'style': style, 'label': PLACE[cid][2].replace('the ', ''), 'labelDy': dy}
        if at: e['labelAt'] = [at[0] + (fix.get('b', 0) if cid == sid else fix.get('a', 0)), at[1]]
        if (sid, cid) in SHIFTED: e['set'] = 'shifted'
        e.update(kw); return e
    tag = {'type': 'tag', 'text': f'Stop {b["order"]} / 10', 'x': 60, 'y': 60}
    # Singapore is too small to show as a coloured country: a pinging orange dot marks it instead
    tiny = [{'type': 'dot', 'lon': pb[0], 'lat': pb[1], 'r': 16, 'color': 'orange', 'ping': True, 'sfx': False}] if sid == 'singapore' else []
    return {
        'title': f'World Routines flight {a["id"]} -> {sid}', 'width': W, 'height': H, 'fps': FPS,
        'projection': 'equirect', 'basemap': {'style': 'satellite'},
        'borders': {'countries': sid != 'india' and a['id'] != 'india', 'states': False},   # no disputed border lines around India
        'sfxVolume': 0.3,
        **({'geojson': {'shifted': SHIFTED[(sid, a['id'])]}} if (sid, a['id']) in SHIFTED else {}),
        'shots': [
            {'start': 0, 'end': 2.4, 'fadeIn': 0.3,
             'cam': {'from': {'lon': pa[0] + (mid[0] - pa[0]) * 0.2, 'lat': pa[1] + (mid[1] - pa[1]) * 0.2 - dl * 0.8, 'span': span0 * 0.8}, 'to': cam0},
             'elements': [
                 dict(tag, t0=0.1),
                 region(a['id'], 'tint', reveal='pop', t0=0.15),
                 {'type': 'pin', 'lon': pa[0], 'lat': pa[1], 'color': 'blue', 't0': 0.35},
                 region(sid, 'solid', reveal='pop', t0=vo_at, pulse=True),
                 *[dict(e, t0=vo_at) for e in tiny],
             ]},
            {'start': 2.4, 'end': dur, 'fadeOut': 0.35,
             'cam': {'from': cam0, 'to': cam1, 'ease': 'inOut', 't0': 0.6, 'dur': 3.0},
             'elements': [
                 region(a['id'], 'tint', reveal='fade', dur=0.01, t0=0, sfx=False),
                 region(sid, 'solid', reveal='fade', dur=0.01, t0=0, sfx=False),
                 dict(tag, t0=0, dur=0.01, sfx=False),
                 *[dict(e, t0=0, dur=0.01) for e in tiny],
                 {'type': 'pin', 'lon': pa[0], 'lat': pa[1], 'color': 'blue', 't0': 0, 'dur': 0.01, 'sfx': False},
                 {'type': 'path', 'points': [list(p) for p in route], 'color': 'sand', 'width': 10, 'glow': True, 'dashed': b['transport'] == 'ship',
                  'drawDur': SAIL, 't0': SAIL_T0},
                 *travel_icons(icon, route, SAIL_T0, SAIL),
                 {'type': 'pin', 'lon': pb[0], 'lat': pb[1], 'color': 'red', 't0': SAIL_T0 + SAIL - 0.1},
                 {'type': 'timeTag', 'lon': pb[0] + span1 * 0.125, 'lat': pb[1] - span1 * 0.068, 'text': f'{word}  ?:??', 'size': 40, 't0': SAIL_T0 + SAIL + 0.35},
             ]},
        ],
    }


def build_leg(sid, sheet_only=False):
    S = stations(); b = S[sid]
    name = f'leg_{sid}'
    work = WORK / name; work.mkdir(parents=True, exist_ok=True)
    text = f"Next stop: {PLACE[sid][2]}! Let's go {TRANSPORT_WORD.get(b['transport'], 'by plane')}!"
    vo_raw, vo = work / 'vo.mp3', work / 'vo.wav'
    said = (work / 'vo.txt').read_text(encoding='utf-8') if (work / 'vo.txt').exists() else ''
    if not vo_raw.exists() or said != text:
        asyncio.run(tts(text, vo_raw)); (work / 'vo.txt').write_text(text, encoding='utf-8')
    VO_AT = 0.45
    v = load(vo_raw); v = np.concatenate([np.zeros(int(VO_AT * SR)), v])
    sf.write(str(vo), v, SR)
    ws = words_of(vo)                                             # times already include the VO_AT lead-in
    toks = text.split()
    if len(toks) == len(ws): ws = [(tok, a, b_) for tok, (_, a, b_) in zip(toks, ws)]   # subtitle shows the script, not Whisper's punctuation
    w0, a0, b0 = ws[0]
    if a0 < VO_AT or b0 - a0 > 0.6: ws[0] = (w0, max(VO_AT + 0.02, b0 - 0.45), b0)       # Whisper snaps the first word to 0 s
    hit = next((a for w, a, _ in ws if w.strip('!.,:').lower() == PLACE[sid][2].split()[-1].lower()), VO_AT + 1.0)
    voice_end = ws[-1][2]
    dur = round(max(6.4, voice_end + 3.6), 2)
    scene = leg_scene(sid, S, hit, dur)
    (work / 'scene.json').write_text(json.dumps(scene, indent=1), encoding='utf-8')
    for f in (scene.get('geojson') or {}).values(): shutil.copy(HERE / 'geo' / f, work / f)
    (HERE / 'scenes').mkdir(exist_ok=True); shutil.copy(work / 'scene.json', HERE / 'scenes' / f'{name}.json')
    node = ['node', str(SKILL / 'scripts' / 'render.mjs'), str(work / 'scene.json')]
    if sheet_only:
        run(node + [str(work / 'sheet.png'), '--contact', '--scale', '0.5']); print('sheet', work / 'sheet.png'); return
    run(node + [str(work / 'raw.mp4'), '--audio', str(vo)])
    # music bed: 18 dB under the voice while she speaks, 1/4 of that elsewhere; one gain to -16 LUFS on the whole mix
    n = int(round(dur * SR))
    fx = load(work / 'raw.mp4'); fx = np.pad(fx, (0, max(0, n - len(fx))))[:n]       # voice + the skill's sound effects
    vv = np.pad(v, (0, max(0, n - len(v))))[:n]
    m = load(MUSIC); m = np.tile(m, int(np.ceil(n / len(m))))[:n] if len(m) else np.zeros(n)
    i0, i1 = int(ws[0][1] * SR), int(voice_end * SR)
    speech_rms = rms(vv[i0:i1]); target = speech_rms * 10 ** (-DUCK_DB / 20)
    g = target / max(rms(m), 1e-9)
    env = np.full(n, g * QUIET); env[i0:i1] = g
    ramp = int(0.4 * SR); env = np.convolve(env, np.ones(ramp) / ramp, mode='same')
    fade = int(0.35 * SR); env[-fade:] *= np.linspace(1, 0, fade); env[:int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))
    mixd = fx + m * env
    tmp = work / 'mix_pre.wav'; sf.write(str(tmp), np.stack([mixd, mixd], 1).astype(np.float32), SR)
    gain_db = TARGET - lufs_file(tmp)
    run(['ffmpeg', '-y', '-nostdin', '-i', str(tmp), '-af', f'volume={gain_db:.2f}dB,alimiter=limit=0.89:level=false', '-ar', str(SR), str(work / 'audio.wav')])
    print('audio LUFS', lufs_file(work / 'audio.wav'))
    # Comic Relief karaoke subtitle, bottom margin 174 px at 1080p (>= 84)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Comic Relief,82,{GOLD},&H00FFFFFF,&H00301A08,&H64000000,0,0,0,0,100,100,0,0,1,6,2,2,80,80,174,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    (work / 'subs.ass').write_text(head + karaoke(ws, ws[0][1] - 0.2, dur - 0.3) + '\n', encoding='utf-8')
    fonts = work / 'fonts'; fonts.mkdir(exist_ok=True)
    for f in FONTDIR.glob('ComicRelief-*.ttf'): shutil.copy(f, fonts / f.name)
    run(['ffmpeg', '-y', '-nostdin', '-i', 'raw.mp4', '-i', 'audio.wav', '-vf', 'ass=subs.ass:fontsdir=fonts', '-map', '0:v', '-map', '1:a',
         '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
         '-t', f'{dur}', 'film.mp4'], cwd=work)
    run(['ffmpeg', '-y', '-nostdin', '-i', 'film.mp4', '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium',
         '-c:a', 'copy', '-movflags', '+faststart', 'film720.mp4'], cwd=work)
    print('final LUFS', lufs_file(work / 'film.mp4'), 'dur', dur, 'words', ws)
    OUT.mkdir(parents=True, exist_ok=True); WEB.mkdir(parents=True, exist_ok=True)
    shutil.copy(work / 'film.mp4', OUT / f'{name}.mp4'); shutil.copy(work / 'film720.mp4', OUT / f'{name}_720.mp4')
    shutil.copy(work / 'film720.mp4', WEB / f'map_{name}.mp4')          # the site plays the 720p copy
    print('wrote', OUT / f'{name}.mp4')


if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == 'leg':
        for sid in (LEGS if sys.argv[2] == 'all' else sys.argv[2].split(',')):
            build_leg(sid, sheet_only='--sheet' in sys.argv)
    else:
        print(__doc__)
