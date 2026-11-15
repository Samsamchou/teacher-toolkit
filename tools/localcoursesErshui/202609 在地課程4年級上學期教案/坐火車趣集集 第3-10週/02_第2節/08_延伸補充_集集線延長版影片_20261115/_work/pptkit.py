"""pptkit.py — 圖字卡與學習單共用的 python-pptx 小工具（公分座標、中英字型、框線、點）。"""
from pptx import Presentation
from pptx.util import Cm, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.oxml.ns import qn
from lxml.etree import SubElement

EN = 'Comic Relief'
ZH = '微軟正黑體'
INK = RGBColor(0x33, 0x2A, 0x2E)
RED = RGBColor(0xD0, 0x1F, 0x1F)
BROWN = RGBColor(0x8A, 0x5A, 0x2B)
CREAM = RGBColor(0xFF, 0xFB, 0xF0)
MUSTARD = RGBColor(0xF2, 0xB1, 0x34)
GREY = RGBColor(0x88, 0x88, 0x88)


def new_pres(w_cm, h_cm):
    p = Presentation(); p.slide_width, p.slide_height = Cm(w_cm), Cm(h_cm); return p


def blank(p):
    return p.slides.add_slide(p.slide_layouts[6])


def set_fonts(run, latin=EN, ea=ZH):
    rPr = run._r.get_or_add_rPr()
    for tag, name in (('a:latin', latin), ('a:ea', ea), ('a:cs', latin)):
        el = rPr.find(qn(tag))
        if el is None: el = SubElement(rPr, qn(tag))
        el.set('typeface', name)


def text(slide, x, y, w, h, parts, size=14, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, name=None, spacing=1.1):
    """parts: 字串，或 [(文字, {bold, color, size, latin}) ...]；字串內 \n 換段。"""
    tb = slide.shapes.add_textbox(Cm(x), Cm(y), Cm(w), Cm(h))
    if name: tb.name = name
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Cm(.1); tf.margin_top = tf.margin_bottom = Cm(.05)
    if isinstance(parts, str): parts = [(parts, {})]
    para = tf.paragraphs[0]; para.alignment = align; para.line_spacing = spacing
    for s, o in parts:
        chunks = s.split('\n')
        for k, ch in enumerate(chunks):
            if k > 0:
                para = tf.add_paragraph(); para.alignment = align; para.line_spacing = spacing
            if not ch: continue
            r = para.add_run(); r.text = ch
            r.font.size = Pt(o.get('size', size)); r.font.bold = o.get('bold', False)
            r.font.color.rgb = o.get('color', INK)
            set_fonts(r, o.get('latin', EN))
    return tb


def box(slide, x, y, w, h, line=BROWN, width=1.5, fill=None, dash=False, round_=True, name=None):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if round_ else MSO_SHAPE.RECTANGLE, Cm(x), Cm(y), Cm(w), Cm(h))
    if round_: s.adjustments[0] = 0.08
    if fill is None: s.fill.background()
    else: s.fill.solid(); s.fill.fore_color.rgb = fill
    s.line.color.rgb = line; s.line.width = Pt(width)
    if dash: s.line.dash_style = MSO_LINE_DASH_STYLE.DASH
    s.shadow.inherit = False
    if name: s.name = name
    return s


def dot(slide, x, y, r=.18):
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, Cm(x - r), Cm(y - r), Cm(2 * r), Cm(2 * r))
    s.fill.solid(); s.fill.fore_color.rgb = INK; s.line.fill.background(); s.shadow.inherit = False
    return s


def line(slide, x0, y0, x1, y1, color=GREY, width=1, dash=False):
    c = slide.shapes.add_connector(1, Cm(x0), Cm(y0), Cm(x1), Cm(y1))
    c.line.color.rgb = color; c.line.width = Pt(width)
    if dash: c.line.dash_style = MSO_LINE_DASH_STYLE.DASH
    return c


def pic(slide, path, x, y, w, h=None, border=True, name=None):
    p = slide.shapes.add_picture(str(path), Cm(x), Cm(y), Cm(w), Cm(h) if h else None)
    if border: p.line.color.rgb = BROWN; p.line.width = Pt(1)
    if name: p.name = name
    return p
