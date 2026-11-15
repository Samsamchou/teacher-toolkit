"""build_worksheet.py — 集集線影片學習單（A4 直式正反兩頁）：學生版＋教師答案版（pptx，再用 export.ps1 轉 PDF）。
依 RDQ：RDQ-spec-jiji-extended-video-cards-worksheet-20261115（內容）＋RDQ-spec-worksheet-workflow-jiji-revise-20261115（5 點修改）。
- 中文楷書（標楷體）；難字（圳、貯、窯、埕、縱）用注音字型 Bpmf Zihi KaiStd Regular；英文 Comic Relief。
- 全部文字純黑＋細描邊（答案版的答案為紅色）；填空一律實線底線；大題標題「一、看影片想一想（找一找、連一連）」格式。
- 插圖全部取自延長版定案圖裁切（crops/）。"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from pptkit import new_pres, blank, box, dot, line, pic, Cm, Pt, RGBColor, PP_ALIGN, MSO_ANCHOR, BROWN, CREAM, MUSTARD, RED, qn, SubElement

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / '03_學習單'
C = lambda n: HERE / 'crops' / f'{n}.png'
KAI, BPMF, EN = '標楷體', 'Bpmf Zihi KaiStd Regular', 'Comic Relief'
BLACK = RGBColor(0, 0, 0)
HARD = set('圳貯窯埕縱')          # 本份學習單要加注音的難字（教師 2026-11-15 指定；共用詞表見 共用視覺資產/難字注音詞表.json）


def _style(run, size, bold, color, latin, ea):
    run.font.size = Pt(size); run.font.bold = bold; run.font.color.rgb = color
    rPr = run._r.get_or_add_rPr()
    ln = SubElement(rPr, qn('a:ln'), w='3175')                   # 細描邊 0.25 pt，與字同色（避免列印模糊）
    sf = SubElement(ln, qn('a:solidFill')); SubElement(sf, qn('a:srgbClr'), val=str(color))
    rPr.remove(ln); rPr.insert(0, ln)
    for tag, name in (('a:latin', latin), ('a:ea', ea), ('a:cs', latin)):
        el = rPr.find(qn(tag))
        if el is None: el = SubElement(rPr, qn(tag))
        el.set('typeface', name)


def text(slide, x, y, w, h, parts, size=14, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.1):
    """parts: 字串或 [(文字, {size, bold, color, en, ul})]。難字自動換注音字型；en=True 整段用 Comic Relief。"""
    tb = slide.shapes.add_textbox(Cm(x), Cm(y), Cm(w), Cm(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Cm(.1); tf.margin_top = tf.margin_bottom = Cm(.05)
    if isinstance(parts, str): parts = [(parts, {})]
    para = tf.paragraphs[0]; para.alignment = align; para.line_spacing = spacing
    for s, o in parts:
        for k, chunk in enumerate(s.split('\n')):
            if k:
                para = tf.add_paragraph(); para.alignment = align; para.line_spacing = spacing
            def flush(t, hard):
                if not t: return
                r = para.add_run(); r.text = t
                _style(r, o.get('size', size), o.get('bold', False), o.get('color', BLACK), EN, EN if o.get('en') else (BPMF if hard else KAI))
                if o.get('ul'): r.font.underline = True
            buf = ''
            for ch in chunk:
                if ch in HARD and not o.get('en'):
                    flush(buf, False); buf = ''; flush(ch, True)
                else:
                    buf += ch
            flush(buf, False)
    return tb


def ans_or_blank(word, A, en=False, width=12):
    """學生版：實線底線；答案版：紅色、加底線的答案。"""
    if A: return ('　' + word + '　', {'color': RED, 'bold': True, 'ul': True, 'en': en})
    return ('_' * width, {'en': True})


STATIONS = [('二水', 's_ershui'), ('源泉', 's_yuanquan'), ('集集', 's_jiji'), ('水里', 's_shuili'), ('車埕', 's_checheng')]
FEATURES = [('地震後照原樣\n重建的木造車站', '集集'), ('蛇窯、明潭', '水里'), ('縱貫線換車、\n蒸汽女王', '二水'),
            ('木頭小鎮、\n貯木池', '車埕'), ('八堡圳的源頭、\n跑水節', '源泉')]
WORD_IMGS = ['banana', 'bike', 'mountain', 'lake', 'ice pop', 'ticket']
WORD_ORDER = ['ticket', 'lake', 'banana', 'ice pop', 'mountain', 'bike']
TF = [('集集線以前會載香蕉和木材。', 'q_banana_wood', '○'),
      ('集集車站地震後被拆掉重新蓋。', 'q_jiji_quake', '×'),
      ('源泉的名字，是因為附近是八堡圳的源頭。', 'q_babao', '○'),
      ('水里的蛇窯現在還天天用來燒陶器。', 'q_kiln', '×')]
IMG_OF = {'banana': 'w_banana', 'bike': 'w_bike', 'mountain': 'w_mountain', 'lake': 'w_lake', 'ice pop': 'w_icepop', 'ticket': 'w_ticket'}


def heading(s, y, title):
    box(s, 1.0, y, 19.0, .9, line=MUSTARD, width=0, fill=RGBColor(0xFF, 0xF1, 0xC9))
    text(s, 1.2, y + .05, 18.6, .8, [(title, {'size': 16, 'bold': True})], anchor=MSO_ANCHOR.MIDDLE)


def q_title(s, y, t):
    text(s, 1.0, y, 19.0, .8, [(t, {'size': 13.5, 'bold': True})])


def page1(p, A):
    s = blank(p)
    # 抬頭精簡（約 3.2 cm 高）：空間讓給連線題的作答區（教師 2026-11-15）
    text(s, 1.0, .75, 13.4, 1.05, [('集集線影片學習單', {'size': 24, 'bold': True})], anchor=MSO_ANCHOR.MIDDLE)
    text(s, 1.0, 1.75, 13.4, .6, [('看完影片再作答。' + ('　【教師答案版】' if A else ''), {'size': 12, 'color': RED if A else BLACK})])
    text(s, 1.0, 2.35, 13.4, .85, [('班級：', {}), ('_' * 7, {'en': True}), ('　座號：', {}), ('_' * 5, {'en': True}), ('　姓名：', {}), ('_' * 12, {'en': True})], size=14, anchor=MSO_ANCHOR.MIDDLE)
    pic(s, C('h_kids'), 15.6, .7, 4.4, 2.6)
    heading(s, 3.45, '一、看影片想一想（找一找、連一連）')
    q_title(s, 4.45, '1. 這五個車站，影片介紹了什麼？請把車站和它的特色連起來。')
    xs = [1.15 + i * 3.8 for i in range(5)]
    TOP1, BOT1 = 8.45, 11.0                       # 兩排圓點相距 2.55 cm（規則：至少 2.5 cm）
    for i, (name, img) in enumerate(STATIONS):
        pic(s, C(img), xs[i], 5.25, 3.5, 2.33)
        text(s, xs[i], 7.6, 3.5, .65, [(name + '站', {'size': 14, 'bold': True})], align=PP_ALIGN.CENTER)
        dot(s, xs[i] + 1.75, TOP1)
    for i, (feat, st) in enumerate(FEATURES):
        dot(s, xs[i] + 1.75, BOT1)
        box(s, xs[i], BOT1 + .2, 3.5, 1.4, line=BROWN, width=1)
        text(s, xs[i], BOT1 + .2, 3.5, 1.4, [(feat, {'size': 11.5})], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        if A:
            j = [n for n, _ in STATIONS].index(st)
            line(s, xs[j] + 1.75, TOP1, xs[i] + 1.75, BOT1, color=RED, width=2)
    q_title(s, 12.95, '2. 看圖連一連：把圖和英文單字連起來。')
    ws = [1.15 + i * 3.17 for i in range(6)]
    TOP2, BOT2 = 16.15, 18.7                      # 兩排圓點相距 2.55 cm
    for i, w in enumerate(WORD_IMGS):
        pic(s, C(IMG_OF[w]), ws[i], 13.75, 2.9, 2.175)
        dot(s, ws[i] + 1.45, TOP2)
    for i, w in enumerate(WORD_ORDER):
        dot(s, ws[i] + 1.45, BOT2)
        text(s, ws[i], BOT2 + .2, 2.9, .8, [(w, {'size': 17, 'bold': True, 'en': True})], align=PP_ALIGN.CENTER)
        if A:
            j = WORD_IMGS.index(w)
            line(s, ws[j] + 1.45, TOP2, ws[i] + 1.45, BOT2, color=RED, width=2)
    heading(s, 20.05, '二、想一想（圈一圈、填一填）')
    q_title(s, 21.05, '3. 影片裡說的是對的嗎？對的在（　）裡畫 ○，錯的畫 ×。')
    for i, (stmt, img, a) in enumerate(TF):    # 插圖縮小；作答括號緊接題號
        y = 21.9 + i * 1.72
        pic(s, C(img), 1.15, y, 2.2, 1.45)
        mid = (a, {'color': RED, 'bold': True}) if A else ('　　', {})
        text(s, 3.6, y, 16.3, 1.45, [(f'（{i + 1}）（', {}), mid, ('）', {}), (stmt, {})], size=14, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 1.0, 29.0, 19.0, .5, [('（背面還有題目）', {'size': 10})], align=PP_ALIGN.RIGHT)


def page2(p, A):
    s = blank(p)
    q_title(s, .8, '4. 句子填空：看完影片，把答案寫在底線上。')
    rows = [('（1）為什麼叫源泉？', ['f_yuanquan'], [('附近是八堡圳的源頭，是水的', {}), ans_or_blank('源頭', A), ('。', {})]),
            ('（2）車埕車站旁的貯木池，以前和現在有什麼不一樣？', ['f_pool_before', 'f_pool_now'],
             [('以前用來', {}), ans_or_blank('泡木頭', A, width=10), ('，現在變成', {}), ans_or_blank('生態池', A, width=10), ('。', {})]),
            ('（3）二水是集集線的起點，旅客在二水可以做什麼？', ['f_transfer'], [('從縱貫線換搭', {}), ans_or_blank('集集線', A), ('的小火車。', {})])]
    for i, (q, imgs, answer_parts) in enumerate(rows):
        y = 1.75 + i * 3.45
        if len(imgs) == 2:
            pic(s, C(imgs[0]), 1.15, y, 2.15, 1.51); pic(s, C(imgs[1]), 3.4, y, 2.15, 1.51)
            text(s, 1.15, y + 1.6, 2.15, .6, [('以前', {'size': 10.5})], align=PP_ALIGN.CENTER)
            text(s, 3.4, y + 1.6, 2.15, .6, [('現在', {'size': 10.5})], align=PP_ALIGN.CENTER)
        else:
            pic(s, C(imgs[0]), 1.15, y, 4.4, 2.93)
        text(s, 6.0, y, 14.0, .9, [(q, {'size': 14, 'bold': True})])
        text(s, 6.0, y + 1.25, 14.0, 1.0, [('答：', {})] + answer_parts, size=15, anchor=MSO_ANCHOR.MIDDLE)
    heading(s, 12.2, '三、我的集集線小旅行（寫一寫、畫一畫）')
    q_title(s, 13.2, '5. 看圖寫單字：從單字框選一個英文單字，寫在底線上。')
    box(s, 1.15, 14.05, 18.7, .95, line=BROWN, width=1, fill=CREAM)
    text(s, 1.15, 14.05, 18.7, .95, [('單字框：', {'size': 14, 'bold': True}), ('　banana　　bike　　mountain　　lake　　ice pop　　ticket', {'size': 14, 'bold': True, 'en': True})], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    for i, w in enumerate(['bike', 'mountain', 'ticket']):
        x = 1.15 + i * 6.35
        pic(s, C(IMG_OF[w]), x + .5, 15.3, 5.0, 3.75)
        text(s, x, 19.15, 6.1, .9, [('I see a ', {'en': True}), ans_or_blank(w, A, en=True, width=10), ('.', {'en': True})], size=16, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    q_title(s, 20.35, '6. 畫一畫、寫一寫：如果去集集線旅行，你最想去哪一站？想做什麼？')
    text(s, 1.0, 21.1, 19.0, .65, [('可以畫影片裡的車站，或 6 個單字裡的東西（例如 ', {'size': 11.5}), ('bike、ice pop', {'size': 11.5, 'en': True}), ('）。', {'size': 11.5})])
    box(s, 1.15, 21.85, 18.7, 4.55, line=BROWN, width=1.5)
    if A: text(s, 1.15, 23.6, 18.7, .8, [('（自由作答：圖要和寫的站、想做的事相符）', {'size': 13, 'color': RED, 'bold': True})], align=PP_ALIGN.CENTER)
    text(s, 1.15, 26.5, 18.7, .85, [('我想去', {}), ('_' * 8, {'en': True}), ('站，', {}), ('_' * 30, {'en': True}), ('。', {})], size=15, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 1.15, 27.35, 18.7, .85, [('在圖旁寫一個英文單字：', {}), ('_' * 14, {'en': True})], size=15, anchor=MSO_ANCHOR.MIDDLE)
    box(s, 1.15, 28.3, 18.7, .9, line=MUSTARD, width=1, fill=RGBColor(0xFF, 0xF1, 0xC9))
    text(s, 1.15, 28.3, 18.7, .9, [('自我檢核：　☆ 我記得影片內容　　☆ 我看懂影片內容　　☆ 我會用單字', {'size': 13})], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


def build(A):
    p = new_pres(21.0, 29.7)
    page1(p, A); page2(p, A)
    name = '集集線影片學習單_' + ('教師答案版' if A else '學生版') + '.pptx'
    p.save(OUT / name); return name


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    print(build(False), build(True))
