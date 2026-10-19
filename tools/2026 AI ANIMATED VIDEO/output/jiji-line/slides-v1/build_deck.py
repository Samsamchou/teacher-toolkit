"""build_deck.py — 集集線，我們一起去探索：7 頁可編輯簡報（注音字型 Bpmf Zihi KaiStd，3D 手繪風插圖）
輸出 deck-draft.pptx；再由 save_embed.ps1 用 PowerPoint 另存並內嵌字型到 renders 資料夾。
"""
import json, pathlib
from pptx import Presentation
from pptx.util import Pt, Inches, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
import sys; sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from zhfont import set_font

HERE = pathlib.Path(__file__).resolve().parent
FONT = 'Bpmf Zihi KaiStd Regular'
INK = RGBColor(0x3B, 0x2A, 0x2E)
CREAM = RGBColor(0xFF, 0xFB, 0xF0)
MUSTARD = RGBColor(0xF2, 0xB1, 0x34)
BROWN = RGBColor(0x8A, 0x5A, 0x2B)

TITLE = '集集線，我們一起去探索'
SLIDES = [  # (標籤, 句子分行, 講者備註)
    ('', ['小晨和小哲搭上小火車，', '沿著濁水溪出發，', '認識集集線的五個車站。'],
     '影片開場：集集線從彰化二水出發，沿著濁水溪開進南投的山裡；一百多年前為了蓋日月潭發電廠而建。'),
    ('第一站　二水站', ['二水站是集集線的起點，', '還能看到「蒸汽女王」老火車頭。'],
     '二水是縱貫線和集集線交會的地方，舊名「二八水」；車站旁的二八水水公園陳列 CT278「蒸汽女王」。'),
    ('第二站　源泉站', ['源泉站附近是八堡圳的源頭，', '水圳灌溉一大片稻田。'],
     '源泉舊名「鼻仔頭」；八堡圳是台灣最古老的水圳之一，三百多年來把濁水溪的水送到彰化平原。'),
    ('第三站　集集站', ['集集站是快一百歲的檜木車站，', '九二一地震後被細心修好。'],
     '日式檜木車站；一九九九年九二一大地震時歪斜，之後依原貌修復。附近有集集老街和綠色隧道。'),
    ('第四站　水里站', ['水里站是山城的交通中心，', '天氣好時還能看見玉山。'],
     '水里舊名「水裡坑」；以前登玉山的人常從水里出發。水里溪旁有大觀、明湖發電廠，還有古早味枝仔冰。'),
    ('第五站　車埕站', ['車埕站是終點站，', '以前是熱鬧的木材集散地。'],
     '「埕」是空地的意思；車站旁的貯木池以前泡木頭，現在是生態池，還有木業展示館。'),
    ('下次見', ['集集線全線通車了，', '下次和家人一起來搭火車吧！'],
     '集集線停駛將近五年，二〇二六年六月二十五日恢復全線通車。'),
]
W, H = Inches(13.333), Inches(7.5)

def add_text(shape_tf, lines, size, align=PP_ALIGN.CENTER, color=INK, spacing=1.05):
    tf = shape_tf; tf.clear(); tf.word_wrap = True
    for k, line in enumerate(lines):
        p = tf.paragraphs[0] if k == 0 else tf.add_paragraph()
        p.alignment = align; p.line_spacing = spacing
        r = p.add_run(); r.text = line; r.font.size = Pt(size); r.font.color.rgb = color
        set_font(r, FONT)

def panel(slide, x, y, w, h, fill=CREAM, border=BROWN, alpha=88):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    s.adjustments[0] = 0.18
    s.fill.solid(); s.fill.fore_color.rgb = fill
    # 透明度
    from pptx.oxml.ns import qn
    sf = s.fill._xPr.find(qn('a:solidFill')); clr = sf[0]
    a = clr.makeelement(qn('a:alpha'), {'val': str(alpha * 1000)}); clr.append(a)
    s.line.color.rgb = border; s.line.width = Pt(3)
    s.shadow.inherit = False
    tf = s.text_frame; tf.margin_left = tf.margin_right = Inches(.25); tf.margin_top = tf.margin_bottom = Inches(.1)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    return s

def build(out):
    prs = Presentation(); prs.slide_width, prs.slide_height = W, H
    for i, (tag, lines, note) in enumerate(SLIDES, 1):
        s = prs.slides.add_slide(prs.slide_layouts[6])
        pic = s.shapes.add_picture(str(HERE / 'images' / f'p{i}.png'), 0, 0, W, H)
        pic.name = f'插圖{i}'
        n = len(lines)
        ph = Inches(.62 * n + .35)
        p = panel(s, Inches(.55), H - ph - Inches(.3), W - Inches(1.1), ph)
        p.name = '句子'
        add_text(p.text_frame, lines, 34)
        if i == 1:
            t = panel(s, Inches(.9), Inches(.18), W - Inches(1.8), Inches(1.05), fill=CREAM, border=BROWN, alpha=92)
            t.name = '標題'
            add_text(t.text_frame, [TITLE], 44)
        else:
            t = panel(s, Inches(.45), Inches(.3), Inches(5.6) if len(tag) > 3 else Inches(2.6), Inches(.95), fill=MUSTARD, border=BROWN, alpha=96)
            t.name = '站名'
            add_text(t.text_frame, [tag], 30)
        s.notes_slide.notes_text_frame.text = note
    prs.core_properties.title = TITLE
    prs.save(out)

if __name__ == '__main__':
    build(HERE / 'deck-draft.pptx'); print('ok')
