"""build_cards.py — 集集線延長版 6 字圖字卡：黑板大卡（A4 橫式 6 張）＋學生小卡（A4 直式一頁 6 格）。
圖片取自延長版定案圖裁切（crops/w_*.png），英文字一律 Comic Relief。"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from pptkit import *

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / '02_圖字卡'
WORDS = [('banana', 'w_banana', '開場：以前小火車載香蕉'), ('bike', 'w_bike', '集集：綠色隧道騎腳踏車'),
         ('mountain', 'w_mountain', '水里：火車上看見玉山'), ('lake', 'w_lake', '水里：日月潭'),
         ('ice pop', 'w_icepop', '水里：古早味枝仔冰'), ('ticket', 'w_ticket', '結尾：石虎紀念車票')]


def big_cards():
    p = new_pres(29.7, 21.0)
    for word, img, note in WORDS:
        s = blank(p)
        box(s, .6, .6, 28.5, 19.8, line=BROWN, width=4, fill=CREAM)
        pic(s, HERE / 'crops' / f'{img}.png', 5.25, 1.3, 19.2, 14.4, name='圖')
        text(s, 1, 15.9, 27.7, 4.1, [(word, {'size': 110, 'bold': True})], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name='單字')
        s.notes_slide.notes_text_frame.text = f'{word}｜延長版畫面：{note}'
    p.save(OUT / '集集線延長版_圖字卡_黑板大卡_A4橫式6張.pptx')


def small_cards():
    p = new_pres(21.0, 29.7)
    s = blank(p)
    cw, ch, x0, y0 = 9.4, 9.0, 1.1, 1.6
    text(s, 1.1, .5, 18.8, .9, [('集集線延長版　圖字卡（學生小卡）　沿虛線剪下', {'size': 12, 'color': GREY})], align=PP_ALIGN.CENTER)
    for i, (word, img, _) in enumerate(WORDS):
        x, y = x0 + (i % 2) * cw, y0 + (i // 2) * ch
        box(s, x, y, cw, ch, line=GREY, width=1, dash=True, round_=False)
        box(s, x + .35, y + .35, cw - .7, ch - .7, line=BROWN, width=2, fill=CREAM)
        pic(s, HERE / 'crops' / f'{img}.png', x + .95, y + .8, 7.5, 5.625)
        text(s, x + .4, y + 6.55, cw - .8, 2.0, [(word, {'size': 40, 'bold': True})], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    p.save(OUT / '集集線延長版_圖字卡_學生小卡_A4一頁6格.pptx')


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True); big_cards(); small_cards(); print('ok')
