"""make_crops.py — 從集集線延長版定案圖裁出圖字卡與學習單插圖（不另外生圖）。
輸出到同資料夾 crops/，並寫 crops.json（來源檔、裁切框、SHA-256）。"""
import json, hashlib, pathlib
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
ART = pathlib.Path(r'G:/我的雲端硬碟/teacher-toolkit/tools/2026 AI ANIMATED VIDEO/output/jiji-line/art')
OUT = HERE / 'crops'; OUT.mkdir(exist_ok=True)

# 名稱: (來源, 裁切框 x0,y0,x1,y1；原圖 1680×944)
CROPS = {
    # 6 字圖字卡（4:3）
    'w_banana':   ('scenes-v2/N01_古早載香蕉木材.png', (740, 360, 1200, 705)),
    'w_bike':     ('scenes-v1/S24b_綠色隧道騎車.png', (940, 260, 1680, 815)),
    'w_mountain': ('scenes-v1/S28_車窗看玉山.png', (380, 60, 1140, 630)),
    'w_lake':     ('scenes-v2/N10_日月潭水到明潭.png', (1060, 150, 1660, 600)),
    'w_icepop':   ('scenes-v1/S30_吃枝仔冰.png', (860, 180, 1500, 660)),
    'w_ticket':   ('scenes-v2/N16_石虎紀念車票.png', (470, 210, 1290, 825)),
    # 學習單：抬頭引導圖
    'h_kids':     ('scenes-v1/S01-03_車窗揮手.png', (420, 120, 1500, 760)),
    # 五站
    's_ershui':   ('scenes-v1/S08_二水車站-整修後.png', (40, 220, 1640, 820)),
    's_yuanquan': ('scenes-v1/S13-14_源泉車站.png', (200, 120, 1480, 840)),
    's_jiji':     ('scenes-v1/S20-22_集集車站正面.png', (200, 150, 1480, 870)),
    's_shuili':   ('scenes-v1/S25_水里車站.png', (200, 120, 1480, 840)),
    's_checheng': ('scenes-v1/S31_車埕車站.png', (120, 150, 1560, 860)),
    # ○×
    'q_banana_wood': ('scenes-v2/N01_古早載香蕉木材.png', (560, 160, 1680, 790)),
    'q_jiji_quake':  ('scenes-v2/N07_居民守護集集車站.png', (280, 80, 1400, 710)),
    'q_babao':       ('scenes-v1/S16_八堡圳源頭取水口.png', (240, 120, 1440, 795)),
    'q_kiln':        ('scenes-v2/N11_水里蛇窯.png', (0, 180, 1280, 900)),
    # 填空
    'f_yuanquan':    ('scenes-v1/S19_水圳旁拍手.png', (200, 100, 1480, 820)),
    'f_pool_before': ('scenes-v1/S35a_貯木池以前.png', (200, 120, 1480, 840)),
    'f_pool_now':    ('scenes-v1/S35b_貯木池現在生態池.png', (200, 120, 1480, 840)),
    'f_transfer':    ('scenes-v2/N02_二水月台換車.png', (0, 120, 1680, 944)),
}

# 6 張字卡圖：2026-11-15 依教師要求改用 OpenAI 重畫的單字圖（wordcards/，主體 ≥60%），不再用截圖
REDRAWN = {'w_banana': 'banana', 'w_bike': 'bike', 'w_mountain': 'mountain', 'w_lake': 'lake', 'w_icepop': 'ice_pop', 'w_ticket': 'ticket'}


def main():
    rec = {}
    for name, (src, box) in CROPS.items():
        if name in REDRAWN:
            src, box = f'_work/wordcards/{REDRAWN[name]}.png', None
            im = Image.open(HERE / 'wordcards' / f'{REDRAWN[name]}.png').convert('RGB')
        else:
            im = Image.open(ART / src).convert('RGB').crop(box)
        w = 1600 if name.startswith('w_') else 1000      # 字卡放大到 1600 寬，列印較平滑
        im = im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)
        p = OUT / f'{name}.png'; im.save(p)
        rec[name] = {'source': src if name in REDRAWN else f'art/{src}', 'box': box, 'size': im.size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
    (HERE / 'crops.json').write_text(json.dumps(rec, ensure_ascii=False, indent=1), encoding='utf-8')
    print(len(rec), 'crops')

if __name__ == '__main__':
    main()
