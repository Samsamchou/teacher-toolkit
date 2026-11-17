"""四個道具姿勢 4 格檢查圖：python qc_props.py <outdir>"""
import sys, os, math, cairo
from PIL import Image
import cast as K
from cast import E, hexc, rrect, poly, stroke, fs, darker, LINE, seg, ik, mitten, SKIN
from qc_costume import garden_bg, room_bg, label
W, H = 1920, 1080

def note(c, x, y, s=1.0, a=1.0, col=LINE):
    c.save(); c.translate(x, y); c.scale(s, s)
    c.new_path(); c.save(); c.rotate(-0.35); c.scale(1.3, 1); c.arc(0, 0, 9, 0, 6.3); c.restore(); c.set_source_rgba(col[0], col[1], col[2], a); c.fill()
    c.new_path(); c.move_to(10, -3); c.line_to(10, -42); c.curve_to(18, -36, 26, -30, 22, -18); c.set_line_width(4); c.stroke()
    c.restore()

def frame_label(c, i, txt):
    label(c, 150, 70, f'frame {i+1}')
    label(c, W/2, 1030, txt, 30)

# ---------------- 1. 直笛 ----------------
def recorder_frame(c, i):
    garden_bg(c); c.rectangle(0, 0, W, H); c.set_source_rgba(1, 1, 1, 0.25); c.fill()
    t = i*0.3; sc = 2.0; ox, oy = W/2, 1330
    P = K.KID; R = P['R']; mx, my = 0, P['hy'] + R*0.56
    ang = 0.2                                  # 往畫面右下斜（正面看會縮短，實際約 45° 朝前）
    L = 190; ux, uy = math.sin(ang), math.cos(ang)
    top = (mx + ux*4, my + 4); bell = (mx + ux*L, my + uy*L)
    upper = (mx + ux*L*0.36, my + uy*L*0.36)    # 左手（角色左＝畫面右）
    lower = (mx + ux*L*0.72, my + uy*L*0.72)    # 右手
    lift = 0.5 - 0.5*math.cos(i*math.pi)               # 手指連續抬起、按下
    def rec(c):
        c.save(); c.translate(*top); c.rotate(-ang)
        poly(c, [(-8, -4), (8, -4), (12, L), (-12, L)]); fs(c, hexc('f3e6c4'), 3)
        poly(c, [(-12, L - 26), (12, L - 26), (17, L + 6), (-17, L + 6)]); fs(c, hexc('e8d4a8'), 3)
        rrect(c, -10, -6, 20, 30, 6); fs(c, hexc('f7eed6'), 2.6)
        for k in range(7):
            c.new_path(); c.arc(0, 40 + k*20, 3.2, 0, 6.3); c.set_source_rgb(*LINE); c.fill()
        c.restore()
    c.save(); c.translate(ox, oy); c.scale(sc, sc)
    K.draw(c, 'amber', t=t, expr='blow', hands={1: (upper[0] + 2, upper[1] - 2*lift), -1: (lower[0] - 2, lower[1])}, grips=(-1, 1), under_hands=rec)
    c.restore()
    bx, by = ox + bell[0]*sc, oy + bell[1]*sc
    for k in range(int(i) + 1):
        tt = (i - k)*0.6 + 0.3
        note(c, bx + 60 + tt*140, by - 40 - tt*120 + math.sin(tt*3)*20, 1.4, max(0.2, 1 - tt*0.35))
    frame_label(c, i, 'Recorder: LEFT hand on top, RIGHT hand below, fingers across holes, elbows down')

# ---------------- 2. 平板 ----------------
def tablet_frame(c, i):
    c.set_source_rgba(*hexc('2c2f48')); c.paint()
    E.glow(c, W/2, 520, 160, (0.45, 0.85, 1.0), 0.35, 4)
    t = i*0.25; sc = 2.0; ox, oy = W/2, 1300
    ty = -205; tw0, tw1, th = 150, 176, 92      # 梯形：上窄下寬（螢幕微微朝上）
    def tab(c):
        c.save(); c.translate(0, ty)
        poly(c, [(-tw0/2 - 10, -th/2 - 8), (tw0/2 + 10, -th/2 - 8), (tw1/2 + 12, th/2 + 8), (-tw1/2 - 12, th/2 + 8)]); fs(c, hexc('2e3240'), 3)
        c.save(); poly(c, [(-tw0/2, -th/2), (tw0/2, -th/2), (tw1/2, th/2), (-tw1/2, th/2)]); c.clip()
        c.set_source_rgba(*hexc('8fd6ff')); c.paint()
        # 原創小遊戲：綠色小圓仔跳平台吃星星
        for k, (px, py) in enumerate(((-60, 26), (0, 6), (58, -14))):
            rrect(c, px - 26, py, 52, 9, 3); fs(c, hexc('5aa04a'), 1.6)
        JP = [(-60, 26), (-30, -10), (0, 6), (30, -32)]; ja = JP[int(i)]; jb = JP[min(3, int(i) + 1)]; jf = i - int(i)
        jump = (ja[0] + (jb[0] - ja[0])*jf, ja[1] + (jb[1] - ja[1])*jf - 22*math.sin(math.pi*jf))      # 連續跳躍（拋物線）
        c.new_path(); c.arc(jump[0], jump[1] - 10, 9, 0, 6.3); fs(c, hexc('7be06a'), 1.8)
        c.new_path(); c.arc(jump[0] + 3, jump[1] - 12, 2, 0, 6.3); c.set_source_rgb(*LINE); c.fill()
        for k, (sx, sy) in enumerate(((0, -10), (58, -30))):
            if (k == 0 and i >= 2) or (k == 1 and i >= 3): continue
            st = [(sx + (7 if j % 2 == 0 else 3)*math.cos(-math.pi/2 + j*math.pi/5), sy + (7 if j % 2 == 0 else 3)*math.sin(-math.pi/2 + j*math.pi/5)) for j in range(10)]
            poly(c, st); fs(c, hexc('ffd84a'), 1.4)
        E.text_c(c, f'{0 if i < 2 else 10 if i < 3 else 20}', -tw0/2 + 22, -th/2 + 18, 14)
        c.restore(); c.restore()
    c.save(); c.translate(ox, oy); c.scale(sc, sc)
    K.draw(c, 'rocky', t=t, expr='focus', mouth=[0, 0.5, 0, 0.8][int(i)], hands={-1: (-tw1/2 - 8, ty + 6 + 3*math.sin(i*7)), 1: (tw1/2 + 8, ty + 6 + 3*math.sin(i*7 + 2))}, grips=(-1, 1), under_hands=tab)
    c.restore()
    # 螢幕光照在臉上
    g = cairo.RadialGradient(ox, oy + (K.KID['hy'] + 40)*sc, 20, ox, oy + (K.KID['hy'] + 40)*sc, 200)
    g.add_color_stop_rgba(0, 0.55, 0.9, 1, 0.22); g.add_color_stop_rgba(1, 0.55, 0.9, 1, 0); c.set_source(g); c.paint()
    if i >= 2: E.stamp(c, 10, 0, 1500, 300, 'ONLINE GAMES', rot=0.08)
    frame_label(c, i, 'Tablet: BOTH hands grip the sides, screen lights the face, original game only')

# ---------------- 3. 鋼琴（側面坐姿） ----------------
def pianist(c, t, press):
    d = K.CAST['beethoven']; skin = SKIN[d['skin']]; coat = d['topc']; pants = d['botc']
    # 琴椅
    rrect(c, -250, -214, 190, 26, 6); fs(c, hexc('6a3e24'))
    for x in (-236, -88): rrect(c, x, -190, 16, 190, 4); fs(c, hexc('4a2a18'))
    # 燕尾垂在椅後
    poly(c, [(-210, -240), (-170, -240), (-182, -120), (-226, -128)]); fs(c, darker(coat, 0.8), 3)
    # 腿：大腿水平坐在椅面、小腿垂直到地、腳踩踏板
    hip = (-160, -230); knee = (-30, -224); ankle = (-34, -30)
    seg(c, hip[0], hip[1], knee[0], knee[1], 40, pants)
    seg(c, knee[0], knee[1], ankle[0], ankle[1], 36, pants)
    rrect(c, -56, -32, 70, 30, 12); fs(c, d['shoes'])
    rrect(c, 0, -14, 46, 10, 3); fs(c, hexc('d9b44a'), 2.4)   # 踏板
    # 身體（略前傾）
    body = lambda: (c.new_path(), c.move_to(-200, -230), c.curve_to(-214, -330, -196, -420, -150, -470), c.line_to(-80, -462),
                    c.curve_to(-70, -400, -96, -300, -110, -228), c.close_path())
    E.shade(c, body, lambda: c.rectangle(-130, -500, 100, 300), coat, darker(coat))
    poly(c, [(-92, -462), (-72, -440), (-80, -400), (-96, -404)]); fs(c, hexc('fbfaf6'), 2.6)   # 領巾
    # 頭（側面朝右）
    c.save(); c.translate(-112, -526); R = 50
    hair = [(0.55, -0.85), (0.1, -1.25), (-0.5, -1.35), (-1.05, -1.0), (-1.45, -0.6), (-1.25, -0.35), (-1.5, 0.0), (-1.15, 0.2), (-1.3, 0.55), (-0.85, 0.55), (-0.6, 0.3), (0.2, -0.45), (0.5, -0.55)]
    E.shade(c, lambda: (c.new_path(), c.arc(0, 0, R, 0, 6.3)), lambda: c.rectangle(-R*1.2, -R*1.2, R*0.8, R*2.4), skin, darker(skin, 0.86))
    poly(c, [(R*0.9, -R*0.05), (R*1.22, R*0.32), (R*0.88, R*0.4)]); fs(c, skin, 2.6)
    c.new_path(); c.arc(R*0.5, -R*0.05, 5, 0, 6.3); c.set_source_rgb(*LINE); c.fill()
    c.new_path(); c.move_to(R*0.3, -R*0.32); c.line_to(R*0.75, -R*0.28); c.set_source_rgba(*d['hc']); c.set_line_width(7); c.set_line_cap(1); c.stroke()
    c.new_path(); c.move_to(R*0.62, R*0.62); c.line_to(R*0.86, R*0.58); stroke(c, 3)
    c.new_path(); c.save(); c.translate(-R*0.15, R*0.1); c.scale(0.6, 0.9); c.arc(0, 0, R*0.25, 0, 6.3); c.restore(); fs(c, skin, 2.4)
    E.shade(c, lambda: poly(c, [(x*R, y*R) for x, y in hair]), lambda: c.rectangle(-R*0.4, -R*2, R*2, R*4), d['hc'], darker(d['hc'], 0.6))
    c.restore()
    return body

def piano_frame(c, i):
    room_bg(c); t = i*0.2; ii = int(i); pf = i - ii; mv = E.ease((pf - 0.55)/0.45)        # 前 55% 按著鍵，後 45% 抬手移到下一個鍵
    c.save(); c.translate(560, 1000); c.scale(1.45, 1.45)
    # 三角鋼琴側面（琴蓋打開）
    bx0 = 40
    E.shade(c, lambda: (c.new_path(), c.move_to(bx0, -330), c.line_to(bx0 + 560, -330), c.curve_to(bx0 + 640, -330, bx0 + 660, -250, bx0 + 600, -230),
                        c.line_to(bx0, -230), c.close_path()), lambda: c.rectangle(bx0, -260, 700, 40), hexc('241e22'), hexc('15111a'))
    poly(c, [(bx0 + 30, -332), (bx0 + 560, -332), (bx0 + 470, -560)]); fs(c, hexc('2e272c'))
    c.new_path(); c.move_to(bx0 + 300, -332); c.line_to(bx0 + 330, -450); stroke(c, 5)
    for x in (bx0 + 30, bx0 + 560): rrect(c, x, -232, 22, 232, 6); fs(c, hexc('241e22'))
    # 琴鍵（俯角作弊，看得到鍵面）
    kx0, kx1, ky = -40, bx0 + 10, -318
    poly(c, [(kx0 - 20, ky + 16), (kx1, ky + 16), (kx1, ky + 34), (kx0 - 20, ky + 34)]); fs(c, hexc('241e22'), 2.6)
    keys = 8; kw = (kx1 - kx0)/keys
    for k in range(keys):
        pressed = pf < 0.55 and ((k == [2, 5, 3, 6][ii]) or (k == [6, 2, 6, 3][ii] and ii % 2 == 1))
        xa = kx0 + k*kw - 20*(1 - k/keys)*0.0
        poly(c, [(xa, ky), (xa + kw, ky), (xa + kw - 4, ky + 16), (xa - 4, ky + 16)]); fs(c, hexc('c9c2b4') if pressed else hexc('fbf8f0'), 2)
    for k in (1, 2, 4, 5, 6):
        xa = kx0 + k*kw - 6; poly(c, [(xa, ky - 2), (xa + 12, ky - 2), (xa + 10, ky + 8), (xa - 2, ky + 8)]); fs(c, hexc('1a1618'), 1.6)
    # 演奏者
    d = K.CAST['beethoven']; skin = SKIN[d['skin']]; coat = d['topc']
    pianist(c, t, None)
    # 雙臂（同側只看得到近側手臂，遠側手畫在後面較暗）
    A1, A2 = [2, 5, 3, 6], [6, 2, 6, 3]; nx = min(3, ii + 1)
    hk = A1[ii] + (A1[nx] - A1[ii])*mv; hk2 = A2[ii] + (A2[nx] - A2[ii])*mv; rise = 16*math.sin(math.pi*mv)
    for kk, shade_k in ((hk2, 0.75), (hk, 1.0)):
        hx = kx0 + kk*kw + kw/2; hy = ky - 10 + (3 if shade_k == 1.0 else 0) - rise
        sx, sy = -128, -440
        (ex, ey), (hx2, hy2) = ik(sx, sy, hx, hy, 100, 94, 1)
        if ey < sy + 30: ey = sy + 60
        col = darker(coat, shade_k)
        seg(c, sx, sy, ex, ey, 30, col); seg(c, ex, ey, hx2, hy2, 28, col)
        poly(c, [(hx2 - 16, hy2 - 22), (hx2 + 4, hy2 - 30), (hx2 + 10, hy2 - 18), (hx2 - 10, hy2 - 10)]); fs(c, hexc('fbfaf6'), 2)
        c.new_path(); c.save(); c.translate(hx2 + 6, hy2 + 2); c.scale(1.4, 0.75); c.arc(0, 0, 13, 0, 6.3); c.restore(); fs(c, darker(skin, shade_k), 2.6)
    c.restore()
    for k in range(ii + 1):
        tt = (i - k)*0.7 + 0.2
        note(c, 1100 + tt*160, 360 - tt*110 + math.sin(tt*4)*20, 1.6, max(0.25, 1 - tt*0.3))
    frame_label(c, i, 'Piano: sits on bench, thighs flat, shins hang down, foot on pedal, hands press keys')

# ---------------- 4. 羽毛筆（特寫） ----------------
def quill_frame(c, i):
    c.set_source_rgba(*hexc('8a5a3a')); c.paint()
    c.save(); c.translate(W/2, 560); c.rotate(-0.04)
    rrect(c, -760, -360, 1520, 720, 6); fs(c, hexc('f4e8c8'), 3)
    for k in range(5): c.new_path(); c.move_to(-660, -120 + k*34); c.line_to(660, -120 + k*34); stroke(c, 2.2, hexc('7a6a5a'))
    c.restore()
    pts = [(-420, -52), (-200, -86), (20, -18), (240, -120)]      # 音符位置（相對紙中心）
    def P(p): ca, sa = math.cos(-0.04), math.sin(-0.04); return (W/2 + p[0]*ca - p[1]*sa, 560 + p[0]*sa + p[1]*ca)
    ii = int(i); qf = i - ii; nx = min(3, ii + 1); mv = E.ease((qf - 0.5)/0.5)      # 前半格寫（筆尖在紙上小幅畫圈），後半格抬筆移到下一個位置
    for k in range(ii + (1 if qf >= 0.3 else 0)):
        x, y = P(pts[k]); note(c, x + 12, y + 2, 1.6)
    cur = (pts[ii][0] + (pts[nx][0] - pts[ii][0])*mv, pts[ii][1] + (pts[nx][1] - pts[ii][1])*mv)
    wig = (1 - mv)*(qf < 0.5); tip = P((cur[0] + 7*math.cos(qf*25)*wig, cur[1] + 5*math.sin(qf*25)*wig)); liftq = 26*math.sin(math.pi*mv)
    tx, ty = tip[0] - 4, tip[1] - 8 - liftq
    if liftq < 2: c.new_path(); c.arc(tip[0], tip[1], 5, 0, 6.3); c.set_source_rgb(*LINE); c.fill()   # 筆尖碰紙＝墨點
    th = math.radians(-52); ux, uy = math.cos(th), math.sin(th); px, py = -uy, ux      # px,py 指向右下（手掌那側）
    G = (tx + ux*120, ty + uy*120)
    c.save(); c.translate(tx, ty); c.scale(1.35, 1.35); c.translate(-tx, -ty)
    skin = SKIN['light']; sk2 = darker(skin, 0.88)
    palm = (G[0] + ux*150 + px*95, G[1] + uy*150 + py*95)
    # 袖子（紅色＋蕾絲）
    seg(c, palm[0] + 40, palm[1] + 40, palm[0] + 420, palm[1] + 380, 150, hexc('c0303a'))
    c.save(); c.translate(palm[0] + 70, palm[1] + 70); c.rotate(-0.75)
    for k in range(6): c.new_path(); c.arc(-75 + k*30, 0, 20, 0, 6.3); fs(c, hexc('fbfaf6'), 2)
    c.restore()
    # 無名指、小指彎在下面（靠在紙上）
    for k, off in enumerate((40, 80)):
        c.new_path(); c.save(); c.translate(palm[0] - ux*30 + px*(off - 20) - 70, palm[1] - uy*30 + py*(off - 20) + 30); c.scale(1.25, 0.8); c.arc(0, 0, 34, 0, 6.3); c.restore(); fs(c, sk2, 3)
    # 手掌（手背）
    c.new_path(); c.save(); c.translate(*palm); c.rotate(th + 0.4); c.scale(1.25, 1); c.arc(0, 0, 95, 0, 6.3); c.restore(); E.fs(c, skin, 3.2)
    # 中指：在筆桿下方支撐
    mid0 = (palm[0] - ux*40 - px*10, palm[1] - uy*40 - py*10); mid1 = (G[0] + px*26 - ux*10, G[1] + py*26 - uy*10)
    seg(c, mid0[0], mid0[1], mid1[0], mid1[1], 46, sk2)
    # 羽毛筆：筆桿＋羽毛
    end = (tx + ux*620, ty + uy*620)
    c.save(); c.translate(tx, ty); c.rotate(th)
    vane = lambda: (c.new_path(), c.move_to(230, 0), c.curve_to(330, -60, 560, -70, 640, -6), c.curve_to(560, 40, 330, 50, 230, 0), c.close_path())
    vane(); fs(c, hexc('fbfaf6'), 3)
    for k in range(10):
        x = 260 + k*36; c.new_path(); c.move_to(x, 0); c.line_to(x + 40, -40 + (k % 3)*4); c.move_to(x, 0); c.line_to(x + 38, 34); stroke(c, 1.6, hexc('c8c0b0'))
    c.new_path(); c.move_to(0, 0); c.line_to(640, 0); stroke(c, 6, hexc('e8dcc0')); c.new_path(); c.move_to(0, 0); c.line_to(640, 0); stroke(c, 1.5)
    poly(c, [(0, 0), (34, -6), (34, 6)]); fs(c, hexc('3a2e28'), 2)
    c.restore()
    # 大拇指：從左側捏住筆桿
    th0 = (G[0] + ux*95 - px*30, G[1] + uy*95 - py*30); th1 = (G[0] - px*24 + ux*4, G[1] - py*24 + uy*4)
    seg(c, th0[0], th0[1], th1[0], th1[1], 50, skin)
    # 食指：壓在筆桿上方
    ix0 = (palm[0] - ux*70 + px*20, palm[1] - uy*70 + py*20); ix1 = (G[0] - ux*24 + px*4, G[1] - uy*24 + py*4)
    seg(c, ix0[0], ix0[1], ix1[0], ix1[1], 44, skin)
    c.new_path(); c.save(); c.translate(ix1[0] + ux*16, ix1[1] + uy*16); c.rotate(th); c.scale(0.9, 0.6); c.arc(0, 0, 14, 0, 6.3); c.restore(); fs(c, hexc('f7e2d2'), 2)
    c.restore()
    frame_label(c, i, 'Quill: thumb + index pinch the shaft, middle finger supports, tip touches paper = note appears')

def make(fn, out):
    ims = []
    for i in range(4):
        s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); c = cairo.Context(s); fn(c, i)
        p = out.replace('.jpg', f'_f{i+1}.png'); s.write_to_png(p); ims.append(Image.open(p).convert('RGB').resize((960, 540), Image.LANCZOS))
    sh = Image.new('RGB', (1920, 1080))
    for i, im in enumerate(ims): sh.paste(im, ((i % 2)*960, (i//2)*540))
    sh.save(out, quality=92); print('ok', out)

if __name__ == '__main__':
    d = sys.argv[1]; os.makedirs(d, exist_ok=True)
    which = sys.argv[2:] or ['recorder', 'tablet', 'piano', 'quill']
    for w in which:
        make(dict(recorder=recorder_frame, tablet=tablet_frame, piano=piano_frame, quill=quill_frame)[w], os.path.join(d, f'prop_{w}_v1.jpg'))
