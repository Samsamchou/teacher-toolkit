"""One contact sheet per country: columns = the two puzzles, rows = puzzle / hint1 / hint2 / answer.
python src/contact_sheets.py  ->  out/<country>_cards_sheet.jpg
python src/contact_sheets.py --v2  ->  out2/<country>_cards_sheet.jpg (version 2, teacher 11/27)"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parent.parent
COUNTRIES = [('taiwan', 'PANDA', 'BEARS'), ('japan', 'LIONS', 'HORSES'), ('kenya', 'ZEBRAS', 'RHINO'),
             ('india', 'TIGERS', 'MONKEYS'), ('singapore', 'ELEPHANTS', 'TURTLES'), ('australia', 'KOALAS', 'LION')]
V2 = '--v2' in sys.argv
if V2: COUNTRIES = [('taiwan', 'KOALA', 'ELEPHANTS'), ('japan', 'RHINOS', 'TIGER'), ('kenya', 'LIONS', 'MONKEYS'),
                    ('india', 'TURTLES', 'BEAR'), ('singapore', 'PANDAS', 'TIGERS'), ('australia', 'ZEBRAS', 'HORSES')]
OUT = 'out2' if V2 else 'out'
STAGES = ['puzzle', 'hint1', 'hint2', 'answer']
TW, TH, HEAD = 800, 450, 56
try: font = ImageFont.truetype(str(Path.home() / 'AppData/Local/Microsoft/Windows/Fonts/ComicRelief-Bold.ttf'), 34)
except OSError: font = ImageFont.load_default()
for name, *words in COUNTRIES:
    sheet = Image.new('RGB', (TW * len(words), HEAD + TH * len(STAGES)), '#2b2140')
    d = ImageDraw.Draw(sheet)
    for c, w in enumerate(words):
        d.text((c * TW + TW // 2, HEAD // 2), f'{name.title()} - {w}', fill='white', font=font, anchor='mm')
        for r, s in enumerate(STAGES):
            sheet.paste(Image.open(root / OUT / w / f'{w}-{s}.png').convert('RGB').resize((TW, TH), Image.LANCZOS), (c * TW, HEAD + r * TH))
    sheet.save(root / OUT / f'{name}_cards_sheet.jpg', quality=88); print('sheet', name)
