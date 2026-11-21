"""定裝圖：python qc_costume.py <out.jpg>（Ken、媽媽、爸爸、Shuiling、Zun-Bo；上半站姿、下半說話嘴形與表情）"""
import sys, os, math, cairo
from PIL import Image
import cast as K
from cast import E, hexc, rrect, poly, stroke, fs
W, H = 1920, 1080

def park_bg(c):
    g = cairo.LinearGradient(0, 0, 0, 700)
    for k, col in ((0, '7fb6e6'), (0.6, 'b4d8f2'), (1, 'e6f2f8')): g.add_color_stop_rgba(k, *hexc(col))
    c.set_source(g); c.paint()
    E.cloud(c, 260, 150, 1.0, (1, 1, 1, 0.8)); E.cloud(c, 1450, 110, 1.3, (1, 1, 1, 0.75))
    for i in range(-1, 22):
        c.new_path(); c.arc(i*95, 690, 66, 0, 6.3); c.set_source_rgba(*hexc('5f9a52')); c.fill()
    g = cairo.LinearGradient(0, 700, 0, H); g.add_color_stop_rgba(0, *hexc('8cc46a')); g.add_color_stop_rgba(1, *hexc('5f9a4a'))
    c.rectangle(0, 700, W, H); c.set_source(g); c.fill(); c.move_to(0, 700); c.line_to(W, 700); stroke(c, 3)

def lineup(path):
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); c = cairo.Context(s); park_bg(c)
    order = [('ken', 'wave', 250), ('mom', 'idle', 620), ('dad', 'hips', 990), ('shuiling', 'present', 1350), ('zunbo', 'wave', 1680)]
    for i, (n, pose, x) in enumerate(order):
        K.draw(c, n, t=i*0.7, pose=pose, expr='happy', x=x, y=1000, scale=1.0)
        top = dict(ken=450, mom=310, dad=300, shuiling=350, zunbo=380)[n]
        E.tag(c, 10, 0, x, top, K.NAMES[n], None, rot=-0.03)
    E.bigword(c, 10, 0, W/2, 80, 'Cutout puppets: cast', 50)
    s.write_to_png(path)

def faces(path):
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); c = cairo.Context(s); park_bg(c)
    c.rectangle(0, 0, W, H); c.set_source_rgba(1, 1, 1, 0.35); c.fill()
    items = [('ken', ('D', 1.0), False, 'excited', 230, 1.9, 1330), ('mom', ('C', 0.8), False, 'happy', 600, 1.5, 1420), ('dad', 0, True, 'happy', 970, 1.5, 1420),
             ('shuiling', ('E', 0.9), False, 'happy', 1340, 1.9, 1330), ('zunbo', 0, False, 'sad', 1690, 1.5, 1230)]
    labs = ['open mouth', 'talking', 'blink', 'round mouth', 'crying']
    for (n, m, bl, ex, x, sc, y), lab in zip(items, labs):
        K.draw(c, n, t=0.5, pose='idle', expr=ex, mouth=m, blink=bl, x=x, y=y, scale=sc)
        E.font(c, 34); w = c.text_extents(lab).x_advance + 40
        rrect(c, x - w/2, 1022, w, 52, 10); c.set_source_rgba(0.1, 0.07, 0.1, 0.82); c.fill(); E.text_c(c, lab, x, 1060, 34, (1, 1, 1))
    E.bigword(c, 10, 0, W/2, 80, 'Faces: lip-sync, blink, feelings', 50)
    s.write_to_png(path)

if __name__ == '__main__':
    out = sys.argv[1]; d = os.path.dirname(os.path.abspath(out)); os.makedirs(d, exist_ok=True)
    a, b = os.path.join(d, 'costume_lineup.png'), os.path.join(d, 'costume_faces.png')
    lineup(a); faces(b)
    sh = Image.new('RGB', (1920, 2160)); sh.paste(Image.open(a).convert('RGB'), (0, 0)); sh.paste(Image.open(b).convert('RGB'), (0, 1080)); sh.save(out, quality=90); print('ok', out)
