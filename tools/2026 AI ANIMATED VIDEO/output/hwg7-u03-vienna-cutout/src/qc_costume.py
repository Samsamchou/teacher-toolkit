"""定裝 2×2 QC 圖：python qc_costume.py <out.jpg>"""
import sys, os, math, cairo
from PIL import Image
import cast as K
from cast import E, hexc, rrect, poly, stroke, fs, darker, LINE
W, H = 1920, 1080

def garden_bg(c, t=0):
    g = cairo.LinearGradient(0, 0, 0, 760)
    for k, col in ((0, '7fb6e6'), (0.6, 'b4d8f2'), (1, 'e6f2f8')): g.add_color_stop_rgba(k, *hexc(col))
    c.set_source(g); c.paint()
    E.cloud(c, 260, 150, 1.0, (1, 1, 1, 0.8)); E.cloud(c, 1400, 110, 1.3, (1, 1, 1, 0.75))
    # 遠方白色宮殿
    c.save(); c.translate(W/2, 640)
    rrect(c, -620, -170, 1240, 170, 4); fs(c, hexc('f4efe4'))
    rrect(c, -170, -270, 340, 270, 4); fs(c, hexc('f7f2e8'))
    poly(c, [(-190, -270), (0, -340), (190, -270)]); fs(c, hexc('e8d9b8'))
    c.new_path(); c.arc(0, -350, 46, math.pi, 0); fs(c, hexc('7fae9a'))
    for i in range(-11, 12):
        if abs(i) < 4: continue
        rrect(c, i*52 - 14, -130, 28, 46, 12); fs(c, hexc('9fc4dc'), 2.2)
    for i in range(-2, 3): rrect(c, i*60 - 16, -220, 32, 60, 14); fs(c, hexc('9fc4dc'), 2.2)
    c.restore()
    # 樹籬與草地
    for i in range(-1, 22):
        c.new_path(); c.arc(i*95, 650, 62, 0, 6.3); c.set_source_rgba(*hexc('5f9a52')); c.fill()
    g = cairo.LinearGradient(0, 660, 0, H); g.add_color_stop_rgba(0, *hexc('8cc46a')); g.add_color_stop_rgba(1, *hexc('5f9a4a'))
    c.rectangle(0, 660, W, H); c.set_source(g); c.fill(); c.move_to(0, 660); c.line_to(W, 660); stroke(c, 3)

def room_bg(c):
    E.wall(c, hexc('efe2c4'), hexc('a8744a'), 820)
    for x in (300, 1500):
        rrect(c, x - 130, 140, 260, 380, 6); fs(c, hexc('cfe6f2'))
        for s in (-1, 1):
            c.new_path(); c.move_to(x + s*150, 110); c.curve_to(x + s*120, 300, x + s*180, 500, x + s*150, 640); c.line_to(x + s*90, 640)
            c.curve_to(x + s*110, 400, x + s*90, 250, x + s*80, 110); c.close_path(); fs(c, hexc('3f7a52'))
        rrect(c, x - 175, 100, 350, 22, 8); fs(c, hexc('c99a3a'))

def label(c, x, y, txt, size=32):
    E.font(c, size); w = c.text_extents(txt).x_advance + 40
    rrect(c, x - w/2, y - size, w, size*1.5, 10); c.set_source_rgba(0.1, 0.07, 0.1, 0.82); c.fill()
    E.text_c(c, txt, x, y + size*0.05, size, (1, 1, 1))

def nametag(c, x, y, title, sub=None):
    E.tag(c, 10, 0, x, y, title, sub, rot=-0.03)

def panel_lineup(path):
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); c = cairo.Context(s)
    garden_bg(c)
    order = ['amber', 'teddy', 'mia', 'edison', 'rocky', 'lena', 'abu']
    for i, n in enumerate(order):
        x = 175 + i*262; poses = dict(teddy='wave', abu='wave', lena='hips', mia='present')
        hands = None
        if n == 'edison':   # 雙手拿平板
            hands = {-1: (-26, -262), 1: (26, -262)}
            def tab(c):
                c.save(); c.translate(0, -262); rrect(c, -42, -32, 84, 60, 8); E.fs(c, hexc('2e3240')); rrect(c, -34, -25, 68, 46, 4); c.set_source_rgba(*hexc('7ad0e8')); c.fill(); c.restore()
            K.draw(c, n, t=i*0.7, pose='idle', expr='happy', x=x, y=980, scale=1.0, hands=hands, grips=(-1, 1), under_hands=tab)
        else:
            K.draw(c, n, t=i*0.7, pose=poses.get(n, 'idle'), expr='happy', x=x, y=980, scale=1.0)
        nametag(c, x, 420 if n != 'abu' else 410, K.NAMES[n])
    E.bigword(c, 10, 0, W/2, 80, 'HWG7 U03  A Day in Vienna — kids', 46)
    s.write_to_png(path)

def panel_adults(path):
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); c = cairo.Context(s)
    room_bg(c)
    K.draw(c, 'mozart', t=0.3, pose='present', expr='happy', x=620, y=1010)
    K.draw(c, 'beethoven', t=1.1, pose='hips', expr='neutral', x=1080, y=1010)
    K.draw(c, 'amber', t=2.0, pose='wave', expr='excited', x=1480, y=1010)
    nametag(c, 620, 330, 'MOZART', 'composer'); nametag(c, 1080, 330, 'BEETHOVEN', 'pianist'); nametag(c, 1480, 500, 'Amber')
    E.bigword(c, 10, 0, W/2, 80, 'Adults vs. kids (scale check)', 46)
    s.write_to_png(path)

def panel_mouth(path, mode):
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); c = cairo.Context(s)
    garden_bg(c)
    c.rectangle(0, 0, W, H); c.set_source_rgba(1, 1, 1, 0.35); c.fill()
    trio = [('amber', 0.0, False), ('teddy', 0.55, False), ('mia', 1.0, False), ('lena', 0.4, True)]
    for i, (n, m, bl) in enumerate(trio):
        x = 270 + i*460
        K.draw(c, n, t=0.5, pose='idle', expr='happy', mouth=m, blink=bl, mouth_mode=mode, x=x, y=1360, scale=2.0)
        lab = ('closed' if m == 0 else f'open {m:.1f}') if mode == 'vector' else 'mouth still'
        if bl: lab += ' + blink'
        label(c, x, 1030, lab)
    title = 'A  Vector mouth (moves with voice)' if mode == 'vector' else 'B  No mouth movement (blink only)'
    E.bigword(c, 10, 0, W/2, 80, title, 50)
    s.write_to_png(path)

def sheet(paths, out):
    ims = [Image.open(p).convert('RGB').resize((960, 540), Image.LANCZOS) for p in paths]
    sh = Image.new('RGB', (1920, 1080))
    for i, im in enumerate(ims): sh.paste(im, ((i % 2)*960, (i//2)*540))
    sh.save(out, quality=92)

if __name__ == '__main__':
    out = sys.argv[1]; d = os.path.dirname(os.path.abspath(out)); os.makedirs(d, exist_ok=True)
    ps = [os.path.join(d, f'costume_{k}.png') for k in ('kids', 'adults', 'mouthA', 'mouthB')]
    panel_lineup(ps[0]); panel_adults(ps[1]); panel_mouth(ps[2], 'vector'); panel_mouth(ps[3], 'none')
    sheet(ps, out); print('ok', out)
