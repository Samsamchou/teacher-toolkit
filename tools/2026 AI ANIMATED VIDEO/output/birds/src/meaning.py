"""meaning.py — 〈Birds〉每句歌詞的「詞義怎麼畫」（老師 11/05 RDQ：右上角圖卡；字面圖＋生活比喻；主歌關鍵句 Codex 插圖、
副歌重複句與簡單動作用程式動畫，重複句共用＋小變化）。
欄位：n → (字面圖, 生活比喻, 做法, 圖卡代號)；做法 C＝Codex 插圖、P＝程式動畫、—＝Ooh 不放圖卡；代號相同＝共用同一張。
用法: python -I src/meaning.py   → planning/02-詞義畫面表.md
"""
import json, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8')
root = pathlib.Path(__file__).resolve().parents[1]

MEAN = {
 1: ("兩顆小心臟用同一個心瓣連在一起，一起跳動", "媽媽抱著小嬰兒，兩個心跳貼在一起", "C", "C01-two-hearts"),
 2: ("心臟一縮一放把紅色小圓點推出去，越流越多變成一條河", "很多小水滴匯成一道大浪", "P", "P01-blood-flood"),
 3: ("兩個人的剪影疊成同一個身體", "寶寶還在媽媽肚子裡", "C", "C02-one-body"),
 4: ("大小兩條小路合成一條路", "母女共撐同一把傘走路", "C", "C03-one-life-umbrella"),
 5: ("兩人一起拉住繩子撐住（stick it out）；小孩打翻牛奶，媽媽皺眉（let down）", "下雨天一起撐傘不放棄", "C", "C04-stick-it-out"),
 6: ("一起把倒掉的積木重新堆好", "打一個大勾 ✔", "P", "P02-make-it-right"),
 7: ("一棵樹的春、夏、秋、冬四格輪流變化", "月曆一頁頁翻過去", "P", "P03-seasons"),
 8: ("身高尺上的小孩一格一格長高", "種子發芽長成一棵樹", "P", "P04-grow"),
 9: ("眼淚一滴滴掉下來", "搬家的紙箱、和好朋友揮手道別", "C", "C05-change-cry"),
 10: ("沙漏的沙慢慢流完", "肥皂泡泡飄起來然後破掉", "P", "P05-temporary"),
 11: ("杯子從桌邊慢慢滑下去", "沙子從指縫溜走", "P", "P06-slide"),
 12: ("一顆愛心一直亮著，風吹也不熄", "夜空的星星永遠都在", "P", "P07-love-never-die"),
 13: ("點點頭＋頭上燈泡亮起來", "", "P", "P08-i-know"),
 14: ("（Ooh）", "", "—", ""),
 15: ("幾隻鳥從同一個點往不同方向飛（箭頭）", "畢業典禮大家揮手各奔東西", "P", "P09-different-directions"),
 16: ("（Ooh）", "", "—", ""),
 17: ("揮手說再見 → 兩人重逢擁抱", "月曆上圈起來的見面日", "C", "C06-see-you-again"),
 18: ("太陽落下又升起（快轉）", "", "P", "P10-sunset-sunrise"),
 19: ("頭上夢想泡泡＋看著葉子飄落", "", "P", "P11-dream-leaves"),
 20: ("葉子從綠變黃變紅", "", "P", "P12-changing-seasons"),
 21: ("夜晚躺在床上，頭上的想念泡泡裡有媽媽", "", "C", "C07-think-of-you"),
 22: ("翻相簿看以前的照片", "影片倒轉 ⏪ 重看一次", "C", "C08-relive-past"),
 23: ("對著流星許願", "", "P", "P13-wishing"),
 24: ("（同 #7，四格樹，這次秋天變灰）", "", "P", "P03-seasons"),
 25: ("（同 #8，身高尺＋發芽，這次長到國中）", "", "P", "P04-grow"),
 26: ("柔軟的心慢慢變成一顆硬石頭", "烏龜縮進硬殼裡", "C", "C09-hard-heart"),
 27: ("（同 #10 沙漏，顏色變灰）", "", "P", "P05-temporary"),
 28: ("（同 #11 滑落）", "", "P", "P06-slide"),
 29: ("（同 #12 不熄的愛心，在灰色裡發亮）", "", "P", "P07-love-never-die"),
 30: ("（同 #13 點頭＋燈泡）", "", "P", "P08-i-know"),
 31: ("（Ooh）", "", "—", ""),
 32: ("（同 #15 鳥往不同方向飛，灰色版）", "", "P", "P09-different-directions"),
 33: ("（Ooh）", "", "—", ""),
 34: ("（同 #17 再見→重逢）", "", "C", "C06-see-you-again"),
 35: ("（Ooh）", "", "—", ""),
 36: ("（同 #15）", "", "P", "P09-different-directions"),
 37: ("（Ooh）", "", "—", ""),
 38: ("小鳥往上飛到很高的地方＋往上的箭頭", "風箏越飛越高", "P", "P14-fly-high"),
 39: ("月亮有眼睛，溫柔地往下看", "", "C", "C10-moon-looking-down"),
 40: ("月光照在地上亮成一圈", "手電筒照亮黑暗的地面", "P", "P15-light-on-ground"),
 41: ("女孩往上飛，讓天上的媽媽看得見她", "", "C", "C11-fly-up-see"),
 42: ("地上鳥形的影子，影子其實是她", "手影遊戲：手變成一隻鳥", "C", "C12-shadow-is-me"),
 43: ("（同 #13）", "", "P", "P08-i-know"),
 44: ("（Ooh）", "", "—", ""),
 45: ("（同 #15）", "", "P", "P09-different-directions"),
 46: ("（Ooh）", "", "—", ""),
 47: ("（同 #17）", "", "C", "C06-see-you-again"),
 48: ("（Ooh）", "", "—", ""),
 49: ("（同 #15，這次鳥是金色）", "", "P", "P09-different-directions"),
 50: ("（Ooh）", "", "—", ""),
 51: ("（同 #38 往高處飛）", "", "P", "P14-fly-high"),
 52: ("（Ooh）", "", "—", ""),
 53: ("（同 #38，風箏飛進太陽）", "", "P", "P14-fly-high"),
 54: ("（Ooh）", "", "—", ""),
 55: ("（同 #38，最後兩隻鳥一起飛）", "", "P", "P14-fly-high"),
}
if __name__ == '__main__':
    L = json.loads((root / 'data' / 'lines.json').read_text(encoding='utf-8'))['lines']
    assert len(MEAN) == len(L) == 55
    mm = lambda t: f"{int(t // 60)}:{t % 60:04.1f}"
    nC = len({v[3] for v in MEAN.values() if v[2] == 'C'}); nP = len({v[3] for v in MEAN.values() if v[2] == 'P'})
    out = ["# 〈Birds〉詞義畫面表（每句歌詞要讓學生看懂）", "",
           f"> 2026-11-05。圖卡固定在畫面**右上角**（約畫面寬 30%），停留整句；Ooh 段不放。做法：**C＝Codex 插圖（{nC} 張）**、**P＝程式動畫（{nP} 種）**；代號相同＝共用，重複時換顏色或小動作。",
           "> 抽象句同時放「字面圖」和「生活比喻」（先字面、後比喻，各約半句）。", "",
           "| # | 時間 | 歌詞 | 中文句意 | 字面圖 | 生活比喻 | 做法 | 圖卡代號 |", "|---|---|---|---|---|---|---|---|"]
    src = (root / 'src' / 'build_table.py').read_text(encoding='utf-8'); ns = {}; exec(src[src.index('R = {'):src.index('EXTRA = {')], ns)
    for l in L:
        a, b, how, code = MEAN[l['n']]
        out.append(f"| {l['n']} | {mm(l['start'])} | {l['text']} | {ns['R'][l['n']][0]} | {a} | {b} | {how} | {code} |")
    p = root / 'planning' / '02-詞義畫面表.md'; p.write_text('\n'.join(out) + '\n', encoding='utf-8'); print('wrote', p, 'Codex', nC, 'Program', nP)

# ── 圖卡資料（老師 11/05 RDQ：拍立得照片；抽象句 40%、一般 30%；故事已演出詞義的句子不放；副歌首次大卡、重複縮小）──
LABEL = {1: '心瓣', 2: '洪流', 3: '同一個身體', 4: '一個人生', 5: '撐下去・失望', 6: '把事情做好', 7: '季節', 8: '長大', 9: '哭泣', 10: '暫時的',
         11: '滑走', 12: '永不消逝', 13: '我知道', 15: '不同方向', 17: '再見到你', 18: '日落・日出', 19: '夢想・葉子', 20: '季節變換', 21: '想念你',
         22: '重溫過去', 23: '許願', 26: '變得堅硬', 38: '飛高', 39: '月亮往下看', 40: '照亮地面', 41: '飛上去', 42: '影子就是我'}
STORY_SKIP = {15, 45, 49, 51, 53, 55}            # 故事畫面已經演出詞義 / the story already shows it
ABSTRACT = {1, 2, 3, 4, 5, 10, 11, 12, 22, 26, 39, 41, 42}
# 圖卡大小／位置的逐句設定（老師 11/05：#39–#42 以畫面為主→小卡；擋臉的句子改左上角）
# size: 'tiny'＝畫面寬 20%、畫面不讓位；pos: 'tl'＝左上角（畫面往另一邊讓位）
CARD_OPT = {7: {'size': 'tiny'}, 8: {'size': 'tiny'}, 11: {'size': 'tiny'},   # 母女同框、大卡會擋臉 / both faces in frame
            39: {'size': 'tiny'}, 40: {'size': 'tiny'}, 41: {'size': 'tiny', 'pos': 'tl'}, 42: {'size': 'tiny'}}
def card_rows():
    rows, seen = [], set()
    for n, (a, b, how, code) in MEAN.items():
        if how == '—' or n in STORY_SKIP: continue
        first = code not in seen; seen.add(code)
        src = (LABEL.get(n) or next(LABEL[m] for m, v in MEAN.items() if v[3] == code and m in LABEL))
        rows.append({'n': n, 'code': code, 'how': how, 'big': (n in ABSTRACT) or (first and n >= 7), 'label': src, 'repeat': not first, **CARD_OPT.get(n, {})})
    return rows
if __name__ == '__main__':
    rows = card_rows()
    p = root / '3d' / 'engine' / 'cards-data.js'
    p.write_text('// 自動產生 by src/meaning.py — 每句的詞義圖卡 / meaning cards per line\nconst CARDS = ' + json.dumps(rows, ensure_ascii=False) + ';\n', encoding='utf-8')
    print('cards', len(rows), 'big', sum(r['big'] for r in rows))
