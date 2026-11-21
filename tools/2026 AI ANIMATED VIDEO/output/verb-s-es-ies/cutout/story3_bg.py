"""故事 3 背景與道具（程式人偶鏡頭用）：有風的草地公園＋右邊一棵大樹（沒有棒球場）、風箏、線軸。
python cutout/story3_bg.py <out.png>  → 輸出背景參考圖（給 Codex 首幀當背景參考）。
風向：畫面左 → 右（放風箏的人背對風站左邊、風箏在右上方下風處、大樹在右邊下風處）。"""
import sys, os, math, cairo
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import cast as K
from cast import E, hexc, rrect, poly, stroke, fs
W, H = 1920, 1080
TREE = (1560, 700)          # 大樹樹幹底部中心（世界座標）
BRANCH = (1395, 352)        # 風箏卡住的矮樹枝位置（樹冠左下緣，站在地上用長竿搆得到）


def wind_lines(c, t, alpha=0.75):
    """風的線條：白色捲捲線，從左往右飄。"""
    for i, (y, sp, ln) in enumerate(((210, 330, 230), (330, 270, 180), (470, 380, 260), (600, 300, 200))):
        x = ((t*sp + i*570) % (W + 700)) - 350
        c.new_path(); c.move_to(x, y); c.curve_to(x + ln*0.4, y - 14, x + ln*0.75, y + 10, x + ln, y - 4)
        c.curve_to(x + ln + 44, y - 12, x + ln + 44, y - 50, x + ln + 12, y - 44); c.curve_to(x + ln - 8, y - 40, x + ln - 4, y - 22, x + ln + 12, y - 24)
        c.set_source_rgba(1, 1, 1, alpha); c.set_line_width(7); c.set_line_cap(1); c.stroke()


def big_tree(c, t):
    x, y = TREE; sway = math.sin(t*2.3)*0.018 + 0.02
    c.save(); c.translate(x, y); c.rotate(sway)
    poly(c, [(-44, 0), (44, 0), (30, -250), (62, -330), (40, -340), (8, -280), (-20, -340), (-44, -330), (-28, -250)]); fs(c, hexc('8a5a34'), 3)
    c.new_path(); c.move_to(-20, -330); c.line_to(-150, -292); stroke(c, 16); c.new_path(); c.move_to(-20, -330); c.line_to(-150, -292); stroke(c, 10, hexc('8a5a34'))   # 矮樹枝（往左伸）
    for dx, dy, r, col in ((0, -470, 190, '4f8f4a'), (-170, -400, 130, '5fa052'), (170, -410, 135, '4f8f4a'), (-90, -560, 125, '5fa052'), (100, -570, 130, '5fa052'), (0, -640, 105, '4f8f4a')):
        c.new_path(); c.arc(dx + math.sin(t*2.3 + dy)*5, dy, r, 0, 6.3); fs(c, hexc(col), 3)
    c.restore()


def park3(c, t, tree=True):
    g = cairo.LinearGradient(0, 0, 0, 640)
    for k, col in ((0, '6fb0ea'), (0.6, 'b4d8f2'), (1, 'e6f2f8')): g.add_color_stop_rgba(k, *hexc(col))
    c.rectangle(-500, -300, W + 1000, 1000); c.set_source(g); c.fill()
    for i, (x0, y, s, sp) in enumerate(((200, 150, 1.0, 46), (950, 110, 1.25, 34), (1500, 200, 0.85, 54))):          # 雲被風吹得比較快
        E.cloud(c, ((x0 + t*sp + 400) % (W + 900)) - 400, y, s, (1, 1, 1, 0.85))
    for i in range(-3, 16):   # 遠方小樹叢
        x = i*170 + 40
        for dx, r in ((0, 62), (-52, 46), (52, 46)): c.new_path(); c.arc(x + dx, 632 - r*0.5, r, 0, 6.3); fs(c, hexc('5f9a52' if i % 2 else '6aa85c'), 2.6)
    g = cairo.LinearGradient(0, 640, 0, H); g.add_color_stop_rgba(0, *hexc('8cc46a')); g.add_color_stop_rgba(1, *hexc('5f9a4a'))
    c.rectangle(-500, 640, W + 1000, 700); c.set_source(g); c.fill(); c.move_to(-500, 640); c.line_to(W + 500, 640); stroke(c, 3)
    for i in range(26):       # 草被風吹得往右倒
        x = (i*83 + 30) % W; y = 690 + (i*137) % 330; b = 16 + 8*math.sin(t*5 + i)
        for k in (0, 1, 2): c.new_path(); c.move_to(x + k*9, y); c.curve_to(x + k*9 + 2, y - 14, x + k*9 + b*0.6, y - 26, x + k*9 + b, y - 30); stroke(c, 3, hexc('4f8a3e'))
    if tree: big_tree(c, t)
    wind_lines(c, t)
    for i in range(5):        # 飄走的葉子
        x = ((t*(260 + i*40) + i*430) % (W + 300)) - 150; y = 300 + i*85 + 40*math.sin(t*3 + i*2)
        c.save(); c.translate(x, y); c.rotate(t*4 + i); c.scale(1, 0.5); c.new_path(); c.arc(0, 0, 13, 0, 6.3); c.restore(); fs(c, hexc('7fbf5a'), 2)


def kite(c, x, y, size=1.0, rot=0.0, t=0.0, tail=True):
    """菱形風箏（紅＋黃），(x, y)＝骨架交叉點（線綁在這裡）。rot＝傾斜；尾巴被風吹向右下。"""
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(size, size)
    if tail:
        c.new_path(); c.move_to(0, 105); px, py = 0, 105
        for k in range(1, 7):
            nx, ny = k*26, 105 + k*20 + 12*math.sin(t*7 + k*1.3); c.curve_to(px + 10, py + 14, nx - 12, ny - 6, nx, ny); px, py = nx, ny
        stroke(c, 5, hexc('2a6fd6'))
        for k in (2, 4, 6):
            bx, by = k*26, 105 + k*20 + 12*math.sin(t*7 + k*1.3); poly(c, [(bx - 14, by - 10), (bx, by), (bx - 14, by + 10), (bx + 14, by + 10), (bx, by), (bx + 14, by - 10)]); fs(c, hexc('ffd84a'), 2)
    poly(c, [(0, -85), (66, 0), (0, 105), (-66, 0)]); fs(c, hexc('e8413c'), 3.4)
    poly(c, [(0, -85), (66, 0), (0, 0)]); fs(c, hexc('ffd84a'), 2.6); poly(c, [(0, 0), (0, 105), (-66, 0)]); fs(c, hexc('ffb02e'), 2.6)
    c.new_path(); c.move_to(0, -85); c.line_to(0, 105); stroke(c, 3); c.new_path(); c.move_to(-66, 0); c.line_to(66, 0); stroke(c, 3)
    c.restore()


def kite_line(c, hx, hy, kx, ky, sag=40):
    """風箏線：從手（線軸）到風箏交叉點，稍微下垂的弧線，一定連著。"""
    mx, my = (hx + kx)/2, (hy + ky)/2 + sag
    c.new_path(); c.move_to(hx, hy); c.curve_to(lerp_(hx, mx, 0.6), lerp_(hy, my, 0.9), mx, my, kx, ky)
    c.set_source_rgba(1, 1, 1, 0.95); c.set_line_width(3.2); c.set_line_cap(1); c.stroke_preserve(); c.set_source_rgba(0.25, 0.2, 0.2, 0.55); c.set_line_width(1.2); c.stroke()
def lerp_(a, b, k): return a + (b - a)*k


def spool(c, x, y, rot=0.0):
    """線軸（兩邊有握把的木頭線軸），(x, y)＝中心。"""
    c.save(); c.translate(x, y); c.rotate(rot)
    rrect(c, -46, -6, 92, 12, 6); fs(c, hexc('b8803a'), 2.4); rrect(c, -20, -17, 40, 34, 8); fs(c, hexc('fbfaf4'), 2.6)
    for k in (-9, 0, 9): c.new_path(); c.move_to(k, -15); c.line_to(k, 15); stroke(c, 1.6, hexc('b8b0a0'))
    c.restore()


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'park3_ref.png'
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); c = cairo.Context(s); park3(c, 1.0); kite(c, 1180, 190, 1.0, 0.25, 1.0); s.write_to_png(out); print('ok', out)
