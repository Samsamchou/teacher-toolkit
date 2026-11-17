"""對嘴測試 v2：句 14（Beethoven）＋句 18（Amber）。
python test_lipsync.py <outdir> [--no-video]
輸出：lipsync_v2_1080p.mp4（正常速度）、lipsync_v2_slow_1080p.mp4（0.5 倍＋音素標示）、lipsync_v2_phoneme_check.jpg、viseme_chart_v2.png
"""
import sys, os, math, subprocess, json
import numpy as np, cairo, soundfile as sf
from PIL import Image, ImageDraw
import cast as K, lipsync as L
from cast import E, hexc, rrect, stroke
from qc_costume import room_bg, label
W, H, FPS = 1920, 1080, 30

LINES = [('beethoven', 'I play the piano in my free time.', 'en-GB-RyanNeural', 700),
         ('amber', 'I play the recorder in my free time.', 'en-US-AnaNeural', 1250)]
GROUND = 1010; ZOOM = 1.55; FOCUS = (975, 520)

def prepare(outdir):
    audio = [np.zeros(int(0.6*L.SR), np.float32)]; t = 0.6; segs = []
    for i, (who, text, voice, x) in enumerate(LINES):
        ln = L.make_line(text, voice, os.path.join(outdir, f'v2_line{i+1}'))
        segs.append(dict(who=who, text=text, words=[(a + t, b + t, w) for a, b, w in ln['words']], track=L.build_track(ln['phones'], t), t0=t, t1=t + ln['dur']))
        audio.append(ln['audio']); t += ln['dur']
        audio.append(np.zeros(int(0.8*L.SR), np.float32)); t += 0.8
    full = np.concatenate(audio); sf.write(os.path.join(outdir, 'lipsync_v2.wav'), full, L.SR)
    json.dump(segs, open(os.path.join(outdir, 'v2_track.json'), 'w'), indent=1)
    return segs, L.envelope(full, FPS), full

def blink(t, ph): return (t + ph) % 3.3 < 0.12

def karaoke(c, t, seg):
    if not seg or not (seg['t0'] - 0.2 <= t <= seg['t1'] + 0.3): return
    size = 54; E.font(c, size)
    ws = seg['text'].split(); widths = [c.text_extents(w + ' ').x_advance for w in ws]
    tot = sum(widths); x = W/2 - tot/2; y = H - 84 - 56
    rrect(c, x - 34, y - size - 10, tot + 68, size*1.55, 16); c.set_source_rgba(0.1, 0.07, 0.1, 0.78); c.fill()
    for i, (w, wd) in enumerate(zip(ws, widths)):
        on = i < len(seg['words']) and t >= seg['words'][i][0]
        c.move_to(x, y); c.set_source_rgba(*(hexc('ffd84a') if on else (1, 1, 1, 1))); c.show_text(w); x += wd

def camera(t, segs):
    for i, sg in enumerate(segs):
        if sg['t0'] - 0.35 <= t <= sg['t1'] + 0.25:
            who, _, _, x = LINES[i]; P = K.CAST[who]['P']
            return (x, GROUND + P['hy'] + P['R']*0.9), (2.3 if P['adult'] else 2.6)
    return FOCUS, ZOOM

def frame(c, t, segs, env, debug=False):
    (fx, fy), z = camera(t, segs)
    c.save(); c.translate(W/2, 470); c.scale(z, z); c.translate(-fx, -fy)
    room_bg(c); cur = None
    for i, (who, text, voice, x) in enumerate(LINES):
        seg = segs[i]; talking = L.speaking(seg['track'], t)
        if talking: cur = seg
        m = L.mouth_at(seg['track'], env, t) if talking else 'X'
        K.draw(c, who, t=t + i, pose='idle', expr='happy', mouth=m, blink=blink(t, i*1.3) and not talking, x=x, y=GROUND)
    c.restore()
    karaoke(c, t, cur or next((s for s in segs if s['t0'] - 0.2 <= t <= s['t1'] + 0.3), None))
    E.vignette(c, 0.35)
    if debug and cur: overlay(c, t, cur, env)

def overlay(c, t, seg, env):
    """慢速檢查用：上方時間軸（音量＋每個嘴形區塊＋播放線）。"""
    x0, x1, y0, hh = 120, W - 120, 40, 150; t0, t1 = seg['t0'] - 0.1, seg['t1'] + 0.1
    X = lambda tt: x0 + (tt - t0)/(t1 - t0)*(x1 - x0)
    rrect(c, x0 - 20, y0 - 14, x1 - x0 + 40, hh + 28, 14); c.set_source_rgba(0.1, 0.07, 0.1, 0.85); c.fill()
    for i in range(int(t0*FPS), int(t1*FPS) + 1):      # 音量條（真實聲音時間）
        if 0 <= i < len(env):
            v = env[i]*46; c.rectangle(X(i/FPS), y0 + 50 - v, (x1 - x0)/((t1 - t0)*FPS) - 1, v); c.set_source_rgba(0.5, 0.8, 1, 0.75); c.fill()
    cols = dict(A='e85a5a', G='f2a03a', E='5ab0e6', F='5ab0e6', D='7be06a', C='a8d870', B='d8d8d8', H='e6a0e0')
    for s in seg['track']:
        a, b = X(s[0] + L.LEAD), X(s[1] + L.LEAD)      # 區塊畫在「聲音時間」上
        rrect(c, a + 1, y0 + 58, max(4, b - a - 2), 44, 6); c.set_source_rgba(*hexc(cols[s[2]])); c.fill()
        E.text_c(c, s[2], (a + b)/2, y0 + 90, 26, hexc('2b1c17'))
        E.text_c(c, s[3].replace('0', '').replace('1', '').replace('2', ''), (a + b)/2, y0 + 128, 17, (1, 1, 1), False)
    for a, b, w in seg['words']:
        E.text_c(c, w, (X(a) + X(b))/2, y0 + 14, 22, (1, 0.85, 0.3))
    c.new_path(); c.move_to(X(t + L.LEAD), y0 - 8); c.line_to(X(t + L.LEAD), y0 + hh + 8); stroke(c, 3, (1, 1, 1))
    label(c, W - 230, 250, 'slow 0.5x', 30)

def render(outdir, segs, env, full, slow=False):
    name = 'lipsync_v2_slow_1080p.mp4' if slow else 'lipsync_v2_1080p.mp4'; mp4 = os.path.join(outdir, name)
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', os.path.join(outdir, 'lipsync_v2.wav')]
    if slow: cmd += ['-af', 'atempo=0.5']
    cmd += ['-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', mp4]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE); s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    step = 0.5/FPS if slow else 1/FPS; dur = len(full)/L.SR
    for n in range(int(dur/step)):
        c = cairo.Context(s); frame(c, n*step, segs, env, debug=slow); s.flush(); p.stdin.write(bytes(s.get_data()))
    p.stdin.close(); p.wait(); print('ok', name)

def check_sheet(outdir, segs, env):
    cells = []; surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    for si, seg in enumerate(segs):
        who = LINES[si][0]; P = K.CAST[who]['P']
        for s in seg['track']:
            t = (s[0] + s[1])/2
            c = cairo.Context(surf); frame(c, t, segs, env); surf.flush()
            im = Image.frombuffer('RGBA', (W, H), bytes(surf.get_data()), 'raw', 'BGRA', 0, 1).convert('RGB')
            _, z = camera(t, segs); fy = 470 - P['R']*0.9*z; r = 185
            crop = im.crop((W//2 - r, int(fy - r*0.8), W//2 + r, int(fy + r*1.2))).resize((240, 240))
            d = ImageDraw.Draw(crop); d.rectangle((0, 206, 240, 240), fill=(25, 18, 25))
            d.text((6, 210), f'{s[4].strip(".,!?")} /{s[3]}/ {s[2]}', fill=(255, 255, 255)); d.text((6, 224), f'{s[0]+L.LEAD:.2f}-{s[1]+L.LEAD:.2f}s  {round((s[1]-s[0])*FPS)}f', fill=(255, 220, 90))
            cells.append(crop)
    cols = 8; rows = math.ceil(len(cells)/cols); sheet = Image.new('RGB', (cols*240, rows*240), (40, 40, 40))
    for i, im in enumerate(cells): sheet.paste(im, ((i % cols)*240, (i//cols)*240))
    sheet.save(os.path.join(outdir, 'lipsync_v2_phoneme_check.jpg'), quality=92); print('ok check sheet', len(cells))

def viseme_chart(outdir):
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); c = cairo.Context(s)
    c.set_source_rgba(*hexc('f3ead6')); c.paint()
    info = [('X', 'rest'), ('A', 'M B P'), ('B', 'EE S T K N'), ('C', 'E AE (a)'), ('D', 'AH AY'), ('E', 'O OW ER R'), ('F', 'OO W'), ('G', 'F V'), ('H', 'L TH')]
    for i, (v, lab) in enumerate(info):
        x = 150 + (i % 5)*372; y = 470 + (i//5)*500
        for j, who in enumerate(('amber', 'beethoven')):
            P = K.CAST[who]['P']; sc = 1.5 if who == 'amber' else 1.6
            c.save(); c.rectangle(x - 120 + j*172, y - 330, 170, 300); c.clip()
            K.draw(c, who, t=0, expr='neutral', mouth=v, x=x - 35 + j*172, y=y - 170 - P['hy']*sc, scale=sc); c.restore()
        label(c, x + 50, y + 10, f'{v}: {lab}', 30)
    E.bigword(c, 10, 0, W/2, 70, 'Mouth shapes v2 (bigger, jaw moves)', 48, col=hexc('2b1c17'))
    s.write_to_png(os.path.join(outdir, 'viseme_chart_v2.png')); print('ok chart')

if __name__ == '__main__':
    outdir = os.path.abspath(sys.argv[1]); os.makedirs(outdir, exist_ok=True)
    viseme_chart(outdir)
    segs, env, full = prepare(outdir)
    for s in segs: print(s['who'], [(round(a + L.LEAD, 2), round((b - a)*FPS), v, ph) for a, b, v, ph, w in s['track']])
    check_sheet(outdir, segs, env)
    if '--no-video' not in sys.argv:
        render(outdir, segs, env, full); render(outdir, segs, env, full, slow=True)
