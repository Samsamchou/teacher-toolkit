"""World Routines map animations, the two world-view films (same spec card as build.py).

python build_world.py opening            # ~30 s: Taiwan -> the ten stops light up one by one along the route
python build_world.py ending             # recap after the 10th stamp: every stop with its routine and REAL time
python build_world.py opening --still 14 # one full frame at 14 s (QC before the full render)

Differences from the flight clips (build.py):
- word times come straight from edge-tts WordBoundary events (no Whisper needed for a long narration);
- one subtitle line per phrase, Comic Relief karaoke, same size and margin as the flight clips;
- the frame is rendered in parallel slices (render.mjs --from/--to) and joined, with --no-sfx: voice + quiet music only;
- the world view is centred on 125 E so the trip reads left to right from Europe to America; the USA then sits past 180 degrees,
  where the skill does not draw highlights, so it uses geo/usa_east.geojson (Natural Earth outline shifted +360).
"""
import asyncio, json, math, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import soundfile as sf

import build as B
from build import W, H, FPS, SR, HERE, OUT, WORK, SKILL, PLACE, COUNTRY

CAM = {'lon': 125.0, 'lat': -1.5, 'span': 320.0}   # centre a little south: Australia stays above the subtitle band
ORDER = ['taiwan', 'japan', 'usa', 'uk', 'spain', 'egypt', 'kenya', 'india', 'singapore', 'australia']
WLON = {'usa': 360.0}                                   # the USA is drawn east of Japan in this view
FILL = ['tint', 'zoneOrange', 'zoneGreen', 'zoneYellow', 'zonePurple', 'zoneTeal', 'zonePink', 'zoneRed', 'zoneBlue', 'zoneGreen']
# world-view anchors: country-name label and routine tag, [lon, lat] (USA already shifted)
WLABEL = {'taiwan': [133, 21], 'japan': [153, 37], 'usa': [262, 40], 'uk': [-13, 57], 'spain': [-17, 39], 'egypt': [26, 24],
          'kenya': [25, -2], 'india': [77, 16], 'singapore': [89, -3], 'australia': [133, -25]}
WTAG = {'taiwan': [141, 13], 'japan': [171, 47], 'usa': [258, 30], 'uk': [14, 64], 'spain': [-9, 28], 'egypt': [50, 37],
        'kenya': [55, -9], 'india': [80, 8], 'singapore': [103, -12], 'australia': [133, -32]}


def place(cid):
    return [PLACE[cid][0] + WLON.get(cid, 0), PLACE[cid][1]]


def hop(a, b):
    """Route pieces from stop a to stop b in the world view (USA -> UK leaves on the right and comes back on the left)."""
    pa, pb = place(a), place(b)
    if (a, b) == ('usa', 'uk'):
        east = B.air_route(pa, [pb[0] + 360, pb[1]])
        cut = next(i for i, p in enumerate(east) if p[0] > CAM['lon'] + CAM['span'] / 2 + 4)
        return [east[:cut + 1], [[p[0] - 360, p[1]] for p in east[cut - 1:]]]
    if b in B.ROUTE: return [[list(p) for p in B.ROUTE[b]]]            # the ship and train legs keep their real route
    return [B.air_route(pa, pb, 20)]


def region(cid, k, **kw):
    e = {'type': 'region', 'set': 'shifted' if cid in WLON else 'countries', 'names': [COUNTRY[cid]], 'style': 'tint' if k == 0 else 'zone',
         'label': PLACE[cid][2].replace('the ', ''), 'labelAt': WLABEL[cid], 'labelDy': 0, 'labelPill': False, 'labelStyle': {'size': 30}}
    if k: e['fill'] = FILL[k]
    e.update(kw); return e


def base_scene(title):
    return {'title': title, 'width': W, 'height': H, 'fps': FPS, 'projection': 'equirect', 'basemap': {'style': 'satellite'},
            'borders': {'countries': False, 'states': False},        # world view: no border lines at all (none disputed, less clutter)
            'geojson': {'shifted': 'usa_east.geojson'}, 'autoSfx': False}


async def tts_words(text, path):
    import edge_tts
    c = edge_tts.Communicate(text, B.VOICE['voice'], pitch=B.VOICE['pitch'], rate=B.VOICE['rate'], boundary='WordBoundary')
    words = []
    with open(path, 'wb') as f:
        async for ch in c.stream():
            if ch['type'] == 'audio': f.write(ch['data'])
            elif ch['type'] == 'WordBoundary': words.append((ch['text'], ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7))
    return words


def narrate(work, phrases, lead=0.5):
    """phrases: [(subtitle text, spoken text)]. One TTS call for natural flow; returns the voice array and, per phrase,
    (subtitle tokens with times, start, end). A subtitle with fewer tokens than spoken words gives its last token the rest."""
    spoken = ' '.join(p[1] for p in phrases)
    cache = work / 'vo.json'
    if cache.exists() and json.loads(cache.read_text(encoding='utf-8'))['text'] == spoken:
        words = json.loads(cache.read_text(encoding='utf-8'))['words']
    else:
        words = asyncio.run(tts_words(spoken, work / 'vo.mp3'))
        cache.write_text(json.dumps({'text': spoken, 'words': words}), encoding='utf-8')
    v = np.concatenate([np.zeros(int(lead * SR)), B.load(work / 'vo.mp3')])
    words = [(w, a + lead, b + lead) for w, a, b in words]
    out, i = [], 0
    for sub, sp in phrases:
        # count how many boundary words this phrase used: consume until the joined letters match
        want = ''.join(ch for ch in sp.lower() if ch.isalnum()); got = ''; j = i
        while j < len(words) and len(got) < len(want):
            got += ''.join(ch for ch in words[j][0].lower() if ch.isalnum()); j += 1
        if got != want: raise SystemExit(f'word boundaries do not match the phrase: {sp!r} vs {got!r}')
        ws = words[i:j]; toks = sub.split()
        if len(toks) > len(ws): raise SystemExit(f'subtitle has more tokens than spoken words: {sub!r}')
        tw = [(toks[k], ws[k][1], ws[k][2]) for k in range(len(toks) - 1)] + [(toks[-1], ws[len(toks) - 1][1], ws[-1][2])]
        out.append({'sub': sub, 'words': tw, 'raw': ws, 'start': ws[0][1], 'end': ws[-1][2]})
        i = j
    return v, out



def t_of(ph, word, nth=0):
    """Start time of a spoken word inside a phrase."""
    hits = [a for w, a, _ in ph['raw'] if w.strip('.,!?:').lower() == word.lower()]
    return hits[nth]


def render(work, scene, dur, still=None, jobs=3):
    (work / 'scene.json').write_text(json.dumps(scene, indent=1), encoding='utf-8')
    for f in (scene.get('geojson') or {}).values(): shutil.copy(HERE / 'geo' / f, work / f)
    (HERE / 'scenes').mkdir(exist_ok=True); shutil.copy(work / 'scene.json', HERE / 'scenes' / f'{work.name}.json')
    node = ['node', str(SKILL / 'scripts' / 'render.mjs'), str(work / 'scene.json')]
    if still is not None:
        B.run(node + [str(work / f'still_{still}.png'), '--still', str(still), '--no-sfx']); print('still', work / f'still_{still}.png'); return False
    cuts = [round(dur * k / jobs) for k in range(jobs)] + [dur]
    parts = [(work / f'part{k}.mp4', cuts[k], cuts[k + 1]) for k in range(jobs)]
    with ThreadPoolExecutor(jobs) as ex:
        list(ex.map(lambda p: B.run(node + [str(p[0]), '--from', str(p[1]), '--to', str(p[2]), '--no-sfx']), parts))
    (work / 'parts.txt').write_text(''.join(f"file '{p[0].name}'\n" for p in parts), encoding='utf-8')
    B.run(['ffmpeg', '-y', '-nostdin', '-f', 'concat', '-safe', '0', '-i', 'parts.txt', '-an', '-c:v', 'copy', 'raw.mp4'], cwd=work)
    return True


def finish(work, name, dur, v, phrases):
    """Music bed 18 dB under the voice (1/4 of that where nobody speaks), -16 LUFS, Comic Relief karaoke, 1080p + 720p."""
    n = int(round(dur * SR))
    vv = np.pad(v, (0, max(0, n - len(v))))[:n]
    m = B.load(B.MUSIC); m = np.tile(m, int(np.ceil(n / len(m))))[:n]
    speak = np.zeros(n, bool)
    for ph in phrases: speak[int(ph['start'] * SR):int(ph['end'] * SR)] = True
    g = B.rms(vv[speak]) * 10 ** (-B.DUCK_DB / 20) / max(B.rms(m), 1e-9)
    env = np.where(speak, g, g * B.QUIET).astype(np.float64)
    ramp = int(0.4 * SR); env = np.convolve(env, np.ones(ramp) / ramp, mode='same')
    fade = int(0.6 * SR); env[-fade:] *= np.linspace(1, 0, fade); env[:int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))
    mixd = vv + m * env
    tmp = work / 'mix_pre.wav'; sf.write(str(tmp), np.stack([mixd, mixd], 1).astype(np.float32), SR)
    B.run(['ffmpeg', '-y', '-nostdin', '-i', str(tmp), '-af', f'volume={B.TARGET - B.lufs_file(tmp):.2f}dB,alimiter=limit=0.89:level=false',
           '-ar', str(SR), str(work / 'audio.wav')])
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Comic Relief,82,{B.GOLD},&H00FFFFFF,&H00301A08,&H64000000,0,0,0,0,100,100,0,0,1,6,2,2,80,80,174,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for k, ph in enumerate(phrases):
        end = min(phrases[k + 1]['start'] - 0.22, ph['end'] + 1.2) if k + 1 < len(phrases) else min(dur - 0.3, ph['end'] + 1.5)
        lines.append(B.karaoke(ph['words'], ph['start'] - 0.2, end))
    (work / 'subs.ass').write_text(head + '\n'.join(lines) + '\n', encoding='utf-8')
    fonts = work / 'fonts'; fonts.mkdir(exist_ok=True)
    for f in B.FONTDIR.glob('ComicRelief-*.ttf'): shutil.copy(f, fonts / f.name)
    B.run(['ffmpeg', '-y', '-nostdin', '-i', 'raw.mp4', '-i', 'audio.wav', '-vf', 'ass=subs.ass:fontsdir=fonts', '-map', '0:v', '-map', '1:a',
           '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
           '-t', f'{dur}', 'film.mp4'], cwd=work)
    B.run(['ffmpeg', '-y', '-nostdin', '-i', 'film.mp4', '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium',
           '-c:a', 'copy', '-movflags', '+faststart', 'film720.mp4'], cwd=work)
    OUT.mkdir(exist_ok=True)
    shutil.copy(work / 'film.mp4', OUT / f'{name}.mp4'); shutil.copy(work / 'film720.mp4', OUT / f'{name}_720.mp4')
    B.WEB.mkdir(parents=True, exist_ok=True); shutil.copy(work / 'film720.mp4', B.WEB / f'map_{name}.mp4')   # the site plays the 720p copy
    print('final LUFS', B.lufs_file(work / 'film.mp4'), 'dur', dur, 'wrote', OUT / f'{name}.mp4')


def opening(still=None):
    name = 'opening'; work = WORK / name; work.mkdir(parents=True, exist_ok=True)
    P = lambda s: (s, s)
    phrases = [P('Hello, travelers!'), P("Let's take a trip around the world."), P('We start at home, in Taiwan.'),
               P('Then Japan, the USA, the UK,'), P('Spain, Egypt, Kenya,'), P('India, Singapore, and Australia.'),
               P('Ten stops! What do kids do every day?'), P('What time do they get up?'), P('What time do they go to bed?'),
               P("Let's find out!")]
    v, ph = narrate(work, phrases)
    dur = math.ceil(ph[-1]['end'] + 2.2)
    said = {'taiwan': t_of(ph[2], 'Taiwan'), 'japan': t_of(ph[3], 'Japan'), 'usa': t_of(ph[3], 'USA'), 'uk': t_of(ph[3], 'UK'),
            'spain': t_of(ph[4], 'Spain'), 'egypt': t_of(ph[4], 'Egypt'), 'kenya': t_of(ph[4], 'Kenya'),
            'india': t_of(ph[5], 'India'), 'singapore': t_of(ph[5], 'Singapore'), 'australia': t_of(ph[5], 'Australia')}
    cut = round(ph[2]['start'] - 0.3, 2)                       # shot 1: fly out from Taiwan to the whole world
    home = place('taiwan')
    s1 = {'start': 0, 'end': cut, 'fadeIn': 0.4,
          'cam': {'from': {'lon': home[0] + 6, 'lat': home[1] - 3, 'span': 70}, 'to': CAM, 'ease': 'inOut', 't0': 0.3, 'dur': cut - 0.5},
          'elements': [{'type': 'pin', 'lon': home[0], 'lat': home[1], 'color': 'blue', 't0': 0.4}]}
    el = [{'type': 'pin', 'lon': home[0], 'lat': home[1], 'color': 'blue', 't0': 0, 'dur': 0.01}]
    for k, cid in enumerate(ORDER):
        t = said[cid] - cut
        el.append(region(cid, k, reveal='pop', t0=t))
        if k:
            pieces = hop(ORDER[k - 1], cid); d = 0.55 / len(pieces)
            for q, pts in enumerate(pieces):
                el.append({'type': 'path', 'points': [list(p) for p in pts], 'color': 'sand', 'width': 6, 'glow': True, 'drawDur': d, 't0': max(0, t - 0.5 + q * d)})
            el.append({'type': 'dot', 'lon': place(cid)[0], 'lat': place(cid)[1], 'color': 'red', 'r': 9, 't0': t + 0.05})
    el.append({'type': 'number', 'x': W / 2, 'y': 150, 'countFrom': 1, 'countTo': 10, 'countDur': 0.7, 'suffix': ' stops', 'size': 110,
               't0': ph[6]['start'] - cut})
    s2 = {'start': cut, 'end': dur, 'fadeOut': 0.5, 'cam': CAM, 'elements': el}
    scene = base_scene('World Routines opening'); scene['shots'] = [s1, s2]
    if render(work, scene, dur, still): finish(work, name, dur, v, ph)


def ending(still=None):
    name = 'ending'; work = WORK / name; work.mkdir(parents=True, exist_ok=True)
    S = B.stations()
    phrases = [('You did it!', 'You did it!'), ('Ten stops around the world!', 'Ten stops around the world!')]
    for cid in ORDER:
        c = PLACE[cid][2].replace('the ', '')
        if B.HS:   # he/she trip: 'In Taiwan, Mei gets up at 6:30.'
            s = S[cid]; who = lambda t: s['name'] + t[len(s['pronoun']):]
            phrases.append((f'{c}: {who(s["display"])}', f'In {PLACE[cid][2]}, {who(s["spoken"])}'))
        else:
            phrases.append((f'{c}: {S[cid]["display"]}', f'{c}. {S[cid]["spoken"]}'))
    phrases += [('Great job, world reporter!', 'Great job, world reporter!') if B.HS else ('Great job, world traveler!', 'Great job, world traveler!')]
    v, ph = narrate(work, phrases)
    dur = math.ceil(ph[-1]['end'] + 2.4)
    el = []
    for k in range(1, len(ORDER)):                              # the whole route is already on the map, thin
        for pts in hop(ORDER[k - 1], ORDER[k]):
            el.append({'type': 'path', 'points': [list(p) for p in pts], 'color': 'sand', 'width': 4, 'glow': False, 'draw': False, 't0': 0.2, 'dur': 0.8})
    for k, cid in enumerate(ORDER):
        p = ph[2 + k]; s = S[cid]
        el.append(region(cid, k, reveal='pop', t0=p['start']))
        el.append({'type': 'dot', 'lon': place(cid)[0], 'lat': place(cid)[1], 'color': 'blue' if k == 0 else 'red', 'r': 9, 't0': p['start'] + 0.05})
        el.append({'type': 'timeTag', 'lon': WTAG[cid][0], 'lat': WTAG[cid][1], 'size': 30, 't0': p['raw'][1][1],
                   'text': f'{B.ROUTINE_WORD[s["routine"]]}  {s["hour"] % 12 or 12}:{s["minute"]:02d}'})
    el.append({'type': 'number', 'x': W / 2, 'y': 150, 'text': '10 / 10', 'size': 110, 't0': ph[-1]['start']})
    scene = base_scene('World Routines ending')
    scene['shots'] = [{'start': 0, 'end': dur, 'fadeIn': 0.4, 'fadeOut': 0.6, 'cam': CAM, 'elements': el}]
    if render(work, scene, dur, still): finish(work, name, dur, v, ph)


if __name__ == '__main__':
    still = float(sys.argv[sys.argv.index('--still') + 1]) if '--still' in sys.argv else None
    if B.HS and len(sys.argv) >= 2 and sys.argv[1] == 'opening': raise SystemExit('the he/she trip shares the I opening clip')
    if len(sys.argv) >= 2 and sys.argv[1] in ('opening', 'ending'):
        {'opening': opening, 'ending': ending}[sys.argv[1]](still)
    else:
        print(__doc__)
