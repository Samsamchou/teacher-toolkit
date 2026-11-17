"""Scene 2 試片（電車站，約 17 秒）：N04（V-3 街景）→ L07 Rocky、L08 Edison（程式）→ N05（3D-1 電車進站）。
python src/pilot_s2.py [--stills]   → renders/pilot/pilot_s2_v1_1080p.mp4（--stills 只出檢查圖）
AI／3D 影格放 C 槽暫存（不進雲端硬碟）：%TEMP%/vienna-frames/<clip>/f_0001.png
"""
import sys, os, math, json, subprocess, tempfile, glob
import numpy as np, cairo, soundfile as sf
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..'); sys.path.insert(0, HERE)
import cast as K, lipsync as L
from cast import E, hexc, rrect, poly, stroke, fs, LINE
W, H, FPS = 1920, 1080, 30
TMP = os.path.join(tempfile.gettempdir(), 'vienna-frames')
GROUND = 852


# ---------- 素材 ----------
def clip_frames(name, src):
    """把影片抽成 1920×1080、30fps PNG；回傳檔案清單。src 可以是 mp4 或 3D 影格資料夾（s1_f0000.png…）。"""
    od = os.path.join(TMP, name); os.makedirs(od, exist_ok=True)
    fs_ = sorted(glob.glob(os.path.join(od, 'f_*.png')))
    if fs_: return fs_
    if os.path.isdir(src):
        for i, f in enumerate(sorted(glob.glob(os.path.join(src, '*.png')))):
            Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS).save(os.path.join(od, f'f_{i + 1:04d}.png'))
    else:
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-vf', f'fps={FPS},scale={W}:{H}:flags=lanczos', os.path.join(od, 'f_%04d.png')], check=True)
    return sorted(glob.glob(os.path.join(od, 'f_*.png')))


_cache = {}
def draw_clip(c, files, i):
    f = files[max(0, min(len(files) - 1, i))]
    if _cache.get('f') != f: _cache['f'] = f; _cache['s'] = cairo.ImageSurface.create_from_png(f)
    c.set_source_surface(_cache['s'], 0, 0); c.paint()


def load_line(lid, t0):
    ph = json.load(open(os.path.join(ROOT, 'audio', 'lines', lid + '_phones.json'))); a, _ = sf.read(os.path.join(ROOT, 'audio', 'lines', lid + '.wav'))
    words = {}
    for p in ph:
        w = words.setdefault(p['wi'], [p['t0'] + t0, p['t1'] + t0, p['word']]); w[1] = p['t1'] + t0
    man = {m['id']: m for m in json.load(open(os.path.join(ROOT, 'audio', 'lines', 'manifest.json'), encoding='utf-8'))}[lid]
    return dict(id=lid, who=man['who'], text=man['text'], audio=a.astype(np.float32), t0=t0, t1=t0 + len(a)/L.SR, words=[tuple(words[k]) for k in sorted(words)], track=L.build_track(ph, t0))


def bell(t0, n, sr=L.SR):
    """電車鈴（兩聲 ding）：兩個泛音的衰減正弦。"""
    out = np.zeros(n, np.float32)
    for k in range(2):
        s = int((t0 + k*0.42)*sr); m = int(0.9*sr); tt = np.arange(m)/sr
        d = (0.5*np.sin(2*np.pi*1568*tt) + 0.3*np.sin(2*np.pi*3136*tt) + 0.15*np.sin(2*np.pi*2349*tt))*np.exp(-tt*5.5)
        out[s:s + m] += (d*0.22).astype(np.float32)[:max(0, n - s)]
    return out


def music(key, start, n, audio_voice, sr=L.SR):
    """配樂：重取樣到 24 kHz、RMS 正規化；沒人說話時 0.030（正常音量的 1/4 左右），有人說話再壓到 0.6 倍；頭尾淡入淡出。"""
    a, msr = sf.read(os.path.join(ROOT, 'audio', 'music', key + '.wav'))
    if a.ndim > 1: a = a.mean(axis=1)
    a = a[int(start*msr):int(start*msr) + int(n/sr*msr) + msr]
    x = np.interp(np.arange(n)/sr, np.arange(len(a))/msr, a).astype(np.float32)
    x *= 0.030/max(1e-6, float(np.sqrt(np.mean(x**2))))
    env = np.interp(np.arange(n)/sr, np.arange(len(audio_voice))/FPS, np.minimum(1.0, audio_voice*3))     # 0–1 人聲包絡
    k = int(0.35*sr); env = np.convolve(env, np.ones(k)/k, mode='same')                                    # 壓低與回復各約 0.35 秒
    x *= (1 - 0.4*np.clip(env*1.6, 0, 1))
    f = int(0.6*sr); x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
    return x.astype(np.float32)


# ---------- 畫面 ----------
def karaoke(c, t, seg):
    """卡拉 OK 字幕：唸到的字變黃。太長的句子自動分兩行（不縮小字）。底邊離畫面底 ≥ 84＋56 px。"""
    if not seg or not (seg['t0'] - 0.15 <= t <= seg['t1'] + 0.35): return
    size = 58; E.font(c, size); ws = seg['text'].split(); sp = c.text_extents('a b').x_advance - c.text_extents('ab').x_advance
    wd = [c.text_extents(w).x_advance for w in ws]; rows = [list(range(len(ws)))]
    if sum(wd) + sp*(len(ws) - 1) > W - 300:
        half = sum(wd)/2; acc = 0; k = 0
        while k < len(ws) - 1 and acc + wd[k] < half: acc += wd[k]; k += 1
        rows = [list(range(k)), list(range(k, len(ws)))]
    lh = size*1.45; yb = H - 84 - 56
    for r, idx in enumerate(rows):
        tot = sum(wd[i] for i in idx) + sp*(len(idx) - 1); x = W/2 - tot/2; y = yb - (len(rows) - 1 - r)*lh
        rrect(c, x - 36, y - size - 12, tot + 72, size*1.6, 18); c.set_source_rgba(0.1, 0.07, 0.1, 0.8); c.fill()
        for i in idx:
            on = i < len(seg['words']) and t >= seg['words'][i][0]
            c.move_to(x, y); c.set_source_rgba(*(hexc('ffd84a') if on else (1, 1, 1, 1))); c.show_text(ws[i]); x += wd[i] + sp


def tram_stop_bg(c, t):
    g = cairo.LinearGradient(0, 0, 0, 700)
    for k, col in ((0, '7fb6e6'), (0.7, 'b4d8f2'), (1, 'e6f2f8')): g.add_color_stop_rgba(k, *hexc(col))
    c.set_source(g); c.paint()
    E.cloud(c, 300 + t*4, 130, 1.0, (1, 1, 1, 0.85)); E.cloud(c, 1350 + t*3, 100, 1.25, (1, 1, 1, 0.8))
    cols = ['f2e2b8', 'f3c7c2', 'cfe3cf', 'f4ead2', 'cfd9e6']; x = -60
    for i in range(6):                                           # 粉彩樓房（和 V-3、3D-1 同色系）
        w = 330 + (i % 3)*30; hgt = 520 + (i*70) % 150; y0 = 760 - hgt; col = hexc(cols[i % 5])
        c.rectangle(x, y0, w, hgt); fs(c, col); c.rectangle(x + w - 34, y0, 34, hgt); c.set_source_rgba(*K.darker(col, 0.86)); c.fill()
        c.rectangle(x - 8, y0 - 26, w + 16, 30); fs(c, hexc('b8604c'))
        for r in range(3):
            for k in range(3):
                wx = x + 46 + k*((w - 150)/2); wy = y0 + 60 + r*130
                if wy + 80 > 700: continue
                rrect(c, wx, wy, 58, 84, 6); fs(c, hexc('a9cfe8'), 2.6)
        if i % 2 == 1:                                            # 遮陽棚
            ax = x + 60; c.rectangle(ax, 640, w - 120, 110); fs(c, hexc('bfe0f2'), 2.6)
            for k in range(6):
                c.rectangle(ax - 14 + k*(w - 92)/6, 610, (w - 92)/6, 44); fs(c, hexc('d9534a' if k % 2 == 0 else 'fbf6ea'), 2.6)
        x += w
    c.rectangle(0, 760, W, 190); c.set_source_rgba(*hexc('e3d6bd')); c.fill()                     # 人行道
    c.move_to(0, 760); c.line_to(W, 760); stroke(c, 3.2)
    c.rectangle(0, 950, W, 130); c.set_source_rgba(*hexc('8f8f96')); c.fill(); c.move_to(0, 950); c.line_to(W, 950); stroke(c, 3.2)
    for y in (990, 1040): c.move_to(0, y); c.line_to(W, y); stroke(c, 5, hexc('4a4a52'))             # 軌道
    # 站牌（和 3D-1 同款：黃圈綠心）＋候車亭
    px = 1700; c.rectangle(px - 7, 470, 14, 460); fs(c, hexc('3a4a40'))
    c.arc(px, 440, 62, 0, math.tau); fs(c, hexc('f2c53d')); c.arc(px, 440, 42, 0, math.tau); fs(c, hexc('3f7a52'))
    sx = 90; c.rectangle(sx, 520, 300, 22); fs(c, hexc('3f7a52'))
    for xx in (sx + 14, sx + 274): c.rectangle(xx, 542, 12, 390); fs(c, hexc('3a4a40'))
    c.rectangle(sx + 26, 560, 248, 260); c.set_source_rgba(0.75, 0.88, 0.94, 0.45); c.fill_preserve(); stroke(c, 2.6)
    rrect(c, sx + 40, 850, 220, 22, 8); fs(c, hexc('8a5a2c'))


CASTX = [('lena', 420), ('mia', 600), ('amber', 780), ('rocky', 970), ('edison', 1180), ('teddy', 1390), ('abu', 1570)]


def scene_stop(c, t, tl):
    """tl: 這一場的時間資料（lines、t0）。"""
    l7, l8 = tl['L07'], tl['L08']
    # 鏡頭：全景 → 推近 Rocky → 移到 Edison → 拉回
    def cam_at(tt):
        keys = [(tl['b0'], (960, 600, 1.0)), (l7['t0'] - 0.25, (970, 560, 1.55)), (l7['t1'] + 0.1, (970, 560, 1.55)), (l8['t0'] - 0.1, (1180, 560, 1.55)),
                (l8['t1'] - 0.75, (1180, 560, 1.55)), (l8['t1'] + 0.15, (1060, 590, 1.12)), (tl['b1'], (1080, 590, 1.16))]
        for (ta, a), (tb, b) in zip(keys, keys[1:]):
            if tt <= tb:
                k = E.ease((tt - ta)/max(1e-6, tb - ta)); return tuple(E.lerp(a[i], b[i], k) for i in range(3))
        return keys[-1][1]
    fx, fy, z = cam_at(t)
    c.save(); c.translate(W/2, H/2); c.scale(z, z); c.translate(-fx, -fy)
    tram_stop_bg(c, t)
    look = t >= l8['words'][-1][0] - 0.1                              # 「Look!」起大家看右邊
    for i, (who, x) in enumerate(CASTX):
        talk7 = who == 'rocky' and L.speaking(l7['track'], t); talk8 = who == 'edison' and L.speaking(l8['track'], t)
        m = L.mouth_at(l7['track'], tl['env'], t) if talk7 else L.mouth_at(l8['track'], tl['env'], t) if talk8 else 'X'
        pose, expr = 'idle', 'happy'
        if who == 'rocky': pose, expr = ('chin', 'think') if l7['t0'] - 0.3 <= t <= l8['t0'] + 0.4 else ('idle', 'happy')
        if who == 'edison' and t >= l8['t0'] - 0.1: pose = 'point' if look else 'present'
        if look and who != 'edison': expr = 'surprised' if t < l8['t1'] + 0.5 else 'excited'
        if look and who in ('teddy', 'abu') and t > l8['t1'] + 0.2: pose = 'cheer'
        bl = ((t + i*1.3) % 3.3 < 0.12) and not (talk7 or talk8)
        bob = -6*abs(math.sin((t - l8['t1'])*7)) if (look and t > l8['t1'] + 0.2 and who in ('mia', 'amber', 'teddy')) else 0     # 小跳（腳仍落地：只在相位峰值離地 6px）
        K.draw(c, who, t=t + i*0.7, pose=pose, expr=expr, mouth=m, blink=bl, x=x, y=GROUND + bob, scale=0.86)
    c.restore()
    E.stamp(c, t, l8['words'][3][0], 1500, 250, 'BY TRAM', size=58)


def build():
    T = {}; t = 0.35
    v3 = clip_frames('V3', os.path.join(ROOT, 'seedance', 'V3', '720p_1.mp4'))
    s1mp4 = os.path.join(ROOT, 'renders', '3d', 'full', 's1.mp4'); has3d = os.path.exists(s1mp4)
    s1 = clip_frames('s1_full', s1mp4) if has3d else clip_frames('s1_1s', os.path.join(ROOT, 'renders', '3d', 'test1s', 's1_1s.mp4'))
    T['N04'] = load_line('N04', t); T['a1'] = max(len(v3)/FPS - 0.2, T['N04']['t1'] + 0.5)
    T['b0'] = T['a1']; T['L07'] = load_line('L07', T['b0'] + 0.7); T['L08'] = load_line('L08', T['L07']['t1'] + 0.5); T['b1'] = T['L08']['t1'] + 1.0
    T['c0'] = T['b1']; T['N05'] = load_line('N05', T['c0'] + 0.35); T['end'] = max(T['c0'] + 4.0, T['N05']['t1'] + 0.6)
    n = int(T['end']*L.SR) + 1; audio = np.zeros(n, np.float32)
    for k in ('N04', 'L07', 'L08', 'N05'):
        s = int(T[k]['t0']*L.SR); a = T[k]['audio']; audio[s:s + len(a)] += a[:n - s]
    T['env'] = L.envelope(audio, FPS)                                     # 嘴型音量只看人聲
    audio += bell(T['c0'] + 0.05, n)
    audio += music('k525_1_allegro', 0.0, n, audio_voice=T['env'])
    T['audio'] = np.clip(audio, -1, 1); T['v3'] = v3; T['s1'] = s1; T['has3d'] = has3d
    return T


def frame(c, t, T):
    X = 0.3                                                               # 轉場交叉淡化秒數
    def A(): draw_clip(c, T['v3'], int(t*FPS))
    def B(): scene_stop(c, t, T)
    def C():
        n = len(T['s1']); i = int((t - T['c0'])*FPS) if T['has3d'] else int((t - T['c0'])/(T['end'] - T['c0'])*n)
        draw_clip(c, T['s1'], i)
    if t < T['a1']:
        A()
    elif t < T['c0']:
        B()
        if t < T['b0'] + X: c.push_group(); A(); c.pop_group_to_source(); c.paint_with_alpha(1 - (t - T['b0'])/X)
    else:
        C()
        if t < T['c0'] + X: c.push_group(); B(); c.pop_group_to_source(); c.paint_with_alpha(1 - (t - T['c0'])/X)
    if t < T['a1']: E.tag(c, t, 0.5, 300, 150, 'VIENNA', 'on the street')
    E.vignette(c, 0.3)
    cur = next((T[k] for k in ('N04', 'L07', 'L08', 'N05') if T[k]['t0'] - 0.15 <= t <= T[k]['t1'] + 0.35), None)
    karaoke(c, t, cur)


if __name__ == '__main__':
    E.FONT = 'Comic Relief'
    od = os.path.join(ROOT, 'renders', 'pilot'); os.makedirs(od, exist_ok=True); T = build()
    print({k: (round(T[k]['t0'], 2), round(T[k]['t1'], 2)) for k in ('N04', 'L07', 'L08', 'N05')}, 'end', round(T['end'], 2), '3d full' if T['has3d'] else '3d = 1s test clip (placeholder)')
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    if '--stills' in sys.argv:
        ts = [1.5, T['b0'] + 0.5, (T['L07']['t0'] + T['L07']['t1'])/2, T['L08']['t0'] + 0.6, T['L08']['t1'] - 0.1, T['L08']['t1'] + 0.6, T['c0'] + 1.5, T['end'] - 0.6]
        sheet = Image.new('RGB', (960*4, 540*2))
        for i, t in enumerate(ts):
            c = cairo.Context(surf); frame(c, t, T); surf.flush()
            im = Image.frombuffer('RGBA', (W, H), bytes(surf.get_data()), 'raw', 'BGRA', 0, 1).convert('RGB').resize((960, 540)); sheet.paste(im, ((i % 4)*960, (i//4)*540))
        sheet.save(os.path.join(od, 'pilot_s2_check.jpg'), quality=90); print('ok stills'); sys.exit()
    wav = os.path.join(od, 'pilot_s2.wav'); sf.write(wav, T['audio'], L.SR); mp4 = os.path.join(od, 'pilot_s2_v1_1080p.mp4')
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', wav,
                          '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', mp4], stdin=subprocess.PIPE)
    for n in range(int(T['end']*FPS)):
        c = cairo.Context(surf); frame(c, n/FPS, T); surf.flush(); p.stdin.write(bytes(surf.get_data()))
    p.stdin.close(); p.wait(); print('ok', mp4)
