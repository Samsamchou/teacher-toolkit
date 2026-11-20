import sys, os, math, subprocess, wave, cairo, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'scripts')); sys.path.insert(0, HERE)
from engine import *
import scene as WS   # western set pieces from the Silas scene (buildings, mountains, horse rider)
os.environ.setdefault('TIMING', os.path.join(HERE, 'sample_timing.json'))
from money_explainer import C, draw_char, head_y, bubble, qlist

DUR = 30.0

def town(c, t, mood='dusk'):
    m = MOODS[mood]; sky(c, m)
    if mood == 'night': stars(c, 0.6); sun(c, 1500, 170, 55, m, True)
    else: sun(c, 1380, 560, 70, m)
    cloud(c, 200 + t*8, 170, 1.0, hexc('d8708a', 0.5)); cloud(c, 1100 + t*5, 120, 1.3, hexc('e48a7e', 0.45))
    WS.mountains(c, 760, [(-100, 600), (150, 470), (330, 610), (560, 430), (760, 590), (980, 500), (1200, 610), (1500, 450), (1750, 600), (2000, 520)], hexc(m['far']))
    WS.building(c, 60, 300, 300, hexc('a8705a'), "HOTEL"); WS.building(c, 390, 340, 360, hexc('c99a6e'), "SALOON")
    WS.building(c, 1220, 300, 310, hexc('8e6a5e'), "BANK"); WS.building(c, 1550, 330, 280, hexc('b5805e'), "SHERIFF")
    g = cairo.LinearGradient(0, 750, 0, H); g.add_color_stop_rgba(0, *hexc('c98a5a')); g.add_color_stop_rgba(1, *hexc('8e5a3c'))
    c.rectangle(-400, 757, W+800, H); c.set_source(g); c.fill(); c.move_to(-400, 757); c.line_to(W+400, 757); stroke(c, 3)
    for x, y in WS.TUFTS: WS.tuft(c, x, y, hexc('6e4a2e'))

def camp(c, t):
    m = MOODS['night']; sky(c, m); stars(c, 0.8); sun(c, 1560, 160, 50, m, True)
    WS.mountains(c, 760, [(-100, 640), (300, 520), (620, 650), (1000, 560), (1400, 660), (1800, 540), (2100, 640)], hexc('1c2448'))
    for x in range(-40, W + 80, 120):
        poly(c, [(x, 760), (x + 50, 620 - (x*7 % 60)), (x + 100, 760)]); c.set_source_rgba(*hexc('141a36')); c.fill()
    g = cairo.LinearGradient(0, 750, 0, H); g.add_color_stop_rgba(0, *hexc('3a3048')); g.add_color_stop_rgba(1, *hexc('1e1828'))
    c.rectangle(0, 757, W, H); c.set_source(g); c.fill(); c.move_to(0, 757); c.line_to(W, 757); stroke(c, 3)
    poly(c, [(1340, 820), (1500, 560), (1660, 820)]); fs(c, hexc('d8c8a0')); poly(c, [(1460, 820), (1500, 640), (1540, 820)]); fs(c, hexc('3a2a22'))
    fl = 0.85 + 0.15*math.sin(t*13) + 0.08*math.sin(t*29)
    glow(c, 960, 900, 90, (1, 0.6, 0.25), 0.55*fl, 6)

def fire(c, t):
    for a in (-0.4, 0.4): c.save(); c.translate(960, 950); c.rotate(a); rrect(c, -70, -10, 140, 20, 8); fs(c, hexc('5a3a26')); c.restore()
    for i, (col, s) in enumerate(((hexc('e8502a'), 1.0), (hexc('f6a03a'), 0.7), (hexc('ffe08a'), 0.4))):
        h = (90 + 14*math.sin(t*11 + i)) * s; w_ = 52*s
        c.move_to(960 - w_, 945); c.curve_to(960 - w_, 945 - h*0.6, 960 - 8 + 6*math.sin(t*9), 945 - h*0.8, 960 + 4*math.sin(t*7 + i), 945 - h)
        c.curve_to(960 + 8, 945 - h*0.7, 960 + w_, 945 - h*0.5, 960 + w_, 945); c.close_path()
        c.set_source_rgba(*col); c.fill()

def riders(c, t, n, base_x, speed, y=870, sc=1.0):
    for i in range(n):
        c.save(); c.translate(base_x + t*speed - i*330, y); c.scale(sc, sc); WS.horse_rider(c, t + i*0.37); c.restore()

class Sh:
    def __init__(s, t0, t1, bg, chars=(), ov=None, fg=None, zoom=(1.0, 1.12), mood='dusk'):
        s.t0, s.t1, s.bg, s.chars, s.ov, s.fg, s.zoom, s.mood = t0, t1, bg, list(chars), ov, fg, zoom, mood
    def render(s, c, t):
        lt = t - s.t0; z = lerp(s.zoom[0], s.zoom[1], ease(lt/(s.t1 - s.t0)))
        def cam(d):
            zz = 1 + (z-1)*d; c.translate(W/2, H*0.58); c.scale(zz, zz); c.translate(-W/2 - lt*5*d, -H*0.58)
        c.save(); cam(0.6); s.bg(c, t); c.restore()
        c.save(); cam(1.0)
        for i, ch in enumerate(s.chars): draw_char(c, ch, t, lt, i*3 + 1)
        if s.fg: s.fg(c, t)
        c.restore()
        dust(c, t, MOODS[s.mood]['dust']); vignette(c, 0.6)
        if s.ov: c.save(); cam(0.85); s.ov(c, lt); c.restore()

def say(c, lt, ch, t0, t1, txt, dx=0, dy=-150, think=False):
    hx, hy = ch['x'], head_y(ch) - 40
    bx, by = clamp(hx + dx, 340, W - 340), max(150, hy + dy)
    bubble(c, lt, t0, t1, bx, by, txt, tip=(hx - bx, hy - by - 20), think=think)

# ---------------- shot list ----------------
def sil_bg(c, t):
    sky(c, (0, 0, 0) and MOODS['gold']); WS.sun(c, W*0.5, 780, 260, (1, 0.7, 0.45))
    WS.mountains(c, 900, [(-100, 760), (260, 640), (520, 780), (900, 690), (1300, 790), (1600, 660), (2050, 760)], hexc('5a2d55'))
    c.rectangle(0, 860, W, H); c.set_source_rgb(0.1, 0.06, 0.11); c.fill()
def sil_fg(c, t): riders(c, t, 3, 300, 90)
def o0(c, lt):
    tag(c, lt, 0.8, 300, 170, "1887", None, rot=-0.08)
    bigword(c, lt, 1.8, 960, 300, "THE DUSTWATER GANG", 80, (1, 0.86, 0.35), t1=4.7)

boone = C('boone', 960, 1.3, pose='hips', expr='sly')
ruth = C('ruth', 560, 1.25, pose='cross', expr='neutral', e=[(2.6, 'sly')])
pip = C('pip', 1360, 1.2, pose='idle', expr='happy', g=[(4.4, 'wave')], flip=True)
def o1(c, lt):
    tag(c, lt, 0.4, 960, 150, "BOONE", "the boss")
    tag(c, lt, 2.0, 400, 300, "RUTH", "never misses", rot=0.04)
    tag(c, lt, 3.6, 1450, 330, "PIP", "first week on the job")
    rating(c, lt, 1.4, 1560, 120, "MENACE")
def rating(c, lt, t0, x, y, label):
    if lt < t0: return
    a = clamp((lt - t0)/0.25); font(c, 34); e = c.text_extents(label)
    c.move_to(x - e.width/2 - e.x_bearing, y); c.set_source_rgba(1, 1, 1, a); c.show_text(label)
    for i in range(5):
        s = back_out((lt - t0 - 0.25 - i*0.12)/0.25)
        if s <= 0: continue
        c.save(); c.translate(x - 96 + i*48, y + 46); c.scale(S(s), S(s)); WS.star(c, 0, 0, 20); c.restore()

g_boone = C('boone', 560, 1.28, pose='hips', expr='sly', e=[(3.4, 'angry')])
g_ruth = C('ruth', 300, 1.2, pose='cross', expr='angry')
g_pip = C('pip', 800, 1.15, pose='idle', expr='worried', e=[(1.0, 'shock')], g=[(1.0, 'up')])
sher = C('sheriff', 1500, 1.32, pose='hips', expr='neutral', flip=True, talk=[(0.6, 2.4)], g=[(3.8, 'point')], e=[(3.8, 'angry')])
def o2(c, lt):
    tag(c, lt, 0.2, 1500, 140, "SHERIFF HOLT", "30 years, zero smiles", rot=0.04)
    say(c, lt, sher, 0.6, 3.2, "You boys lost?", dx=-160, dy=-60)
    say(c, lt, g_boone, 3.4, 5.9, "Just passin' through, Sheriff.", dx=80, dy=-80)
    stamp(c, lt, 4.2, 1130, 430, "WANTED: $500", rot=0.07)

c_boone = C('boone', 560, 1.2, pose='hold', expr='neutral', talk=[(0.5, 2.3)])
c_ruth = C("ruth", 1280, 1.15, pose='cross', expr='sly', flip=True)
c_pip = C('pip', 1700, 1.05, pose='sad', expr='worried', flip=True, e=[(3.0, 'sad')])
def o3(c, lt):
    say(c, lt, c_boone, 0.4, 2.8, "We hit the bank at dawn.", dx=80, dy=-70)
    say(c, lt, c_pip, 3.0, 6.0, "I just wanted a horse...", dx=-200, dy=-60, think=True)
    qlist(c, lt, 1180, 230, "THE PLAN", [(0.9, "Ride in quiet", None), (1.5, "Grab the gold", None), (2.1, "Don't get caught", 'q')], w=460, t0=0.7)

def end_fg(c, t): riders(c, t - 24, 3, 700, 120)
def o4(c, lt):
    bigword(c, lt, 2.6, 960, 260, "TO BE CONTINUED...", 76, (1, 0.86, 0.35))

SHOTS = [
    Sh(0, 5, sil_bg, fg=sil_fg, ov=o0, mood='gold'),
    Sh(5, 11, lambda c, t: town(c, t), [ruth, boone, pip], o1),
    Sh(11, 18, lambda c, t: town(c, t), [g_ruth, g_boone, g_pip, sher], o2),
    Sh(18, 24, camp, [c_boone, c_ruth, c_pip], o3, fg=fire, mood='night'),
    Sh(24, 30, sil_bg, fg=end_fg, ov=o4, mood='gold'),
]

def frame(t):
    surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(surf)
    sh = next((s for s in SHOTS if s.t0 <= t < s.t1), SHOTS[-1]); sh.render(c, t)
    f = 0
    if sh is not SHOTS[0]: f = max(f, 1 - ease((t - sh.t0)/0.3))
    if sh is not SHOTS[-1]: f = max(f, ease((t - (sh.t1 - 0.25))/0.25))
    f = max(f, 1 - ease(t/0.6), ease((t - (DUR - 0.8))/0.8))
    if f > 0: c.set_source_rgba(0, 0, 0, f); c.paint()
    return surf

# ---------------- sound effects ----------------
SR = 44100; rng = np.random.default_rng(3)
def env(n, a=0.003, dec=8): t = np.arange(n)/SR; return np.minimum(1, t/a)*np.exp(-t*dec)
def tone(f0, f1, dur, dec, amp):
    n = int(dur*SR); t = np.arange(n)/SR; f = (f0 - f1)*np.exp(-t*25) + f1; return amp*np.sin(2*np.pi*np.cumsum(f)/SR)*env(n, 0.002, dec)
def noise(dur, smooth, amp, shape=True):
    n = int(dur*SR); x = np.convolve(rng.standard_normal(n), np.ones(smooth)/smooth, 'same'); t = np.arange(n)/SR
    return amp*x/np.abs(x).max()*(np.sin(np.pi*t/dur)**2 if shape else 1)
def hoof_loop(dur):
    out = np.zeros(int(dur*SR)); s = 0.0
    while s < dur - 0.2:
        for o in (0, 0.09, 0.2):
            i = int((s + o)*SR); h = tone(180, 70, 0.08, 40, 0.35) + noise(0.08, 3, 0.15, False)*env(int(0.08*SR), 0.001, 50)
            out[i:i + len(h)] += h[:len(out) - i]
        s += 0.45
    return out
def sfx_track():
    tr = np.zeros(int((DUR + 1)*SR))
    def put(t, s): i = int(t*SR); tr[i:i + len(s)] += s[:len(tr) - i]
    wind = noise(DUR, 400, 0.05, False); tr[:len(wind)] += wind  # prairie wind bed
    put(0.3, hoof_loop(4.6)*0.8); put(24.0, hoof_loop(5.6)*0.8)
    for t in (5, 11, 18, 24): put(t - 0.2, noise(0.5, 30, 0.35))           # whooshes
    for t in (0.8, 5.4, 7.0, 8.6, 11.2, 4.2 + 11): put(t, tone(900, 300, 0.12, 30, 0.45))  # pops
    put(1.8, tone(90, 40, 0.6, 6, 0.6)); put(26.6, tone(90, 40, 0.6, 6, 0.6))  # title booms
    for i in range(5): put(6.65 + i*0.12, tone(1500, 1500, 0.15, 30, 0.2))      # star dings
    put(15.2, tone(140, 50, 0.35, 14, 0.9))                                    # stamp thud
    for t, n in ((11.6, 14), (14.4, 26), (18.4, 22), (21.0, 22)):
        for j in range(0, n, 3): put(t + 0.06*j/3*1.0, noise(0.03, 1, 0.14, False)*env(int(0.03*SR), 0.0005, 180))  # typing ticks
    for t in (18.7, 19.6, 20.2, 20.8): put(t, tone(1200, 1200, 0.08, 60, 0.3))  # list ticks
    # campfire crackle 18-24
    for k in range(70):
        t = 18 + rng.uniform(0, 6); put(t, noise(0.02, 1, rng.uniform(0.05, 0.18), False)*env(int(0.02*SR), 0.0005, 200))
    put(18.0, noise(6.0, 60, 0.07))
    # spur jingle when sheriff appears
    for j in range(4): put(11.3 + j*0.07, tone(3200, 3000, 0.25, 18, 0.12))
    return np.clip(tr, -1, 1)

if __name__ == '__main__':
    if sys.argv[1] == 'qc':
        from PIL import Image
        ts = [3.5, 9.8, 16.4, 22.6]; sheet = Image.new('RGB', (1920, 1080))
        for i, t in enumerate(ts):
            frame(t).write_to_png('/tmp/w.png'); sheet.paste(Image.open('/tmp/w.png').resize((960, 540)), ((i % 2)*960, (i//2)*540))
        sheet.save('wqc.jpg', quality=85); sys.exit()
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "w_video.mp4"], stdin=subprocess.PIPE)
    for i in range(int(DUR*FPS)): p.stdin.write(bytes(frame(i/FPS).get_data()))
    p.stdin.close(); p.wait()
    tr = sfx_track()
    with wave.open('w_sfx.wav', 'w') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((tr*32767*0.9).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", "w_video.mp4", "-i", "w_sfx.wav", "-af", "loudnorm=I=-16:TP=-1.5", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "Dustwater_Gang_30s.mp4"])
