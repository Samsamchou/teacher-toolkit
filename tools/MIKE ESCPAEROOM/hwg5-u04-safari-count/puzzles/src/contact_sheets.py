"""One contact sheet per country: columns = the two puzzles, rows = puzzle / hint1 / hint2 / answer.
python src/contact_sheets.py  ->  out/<country>_cards_sheet.jpg"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parent.parent
COUNTRIES = [('taiwan', 'PANDA', 'BEARS'), ('japan', 'LIONS', 'HORSES'), ('kenya', 'ZEBRAS', 'RHINO'),
             ('india', 'TIGERS', 'MONKEYS'), ('singapore', 'ELEPHANTS', 'TURTLES'), ('australia', 'KOALAS', 'LION')]
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
            sheet.paste(Image.open(root / 'out' / w / f'{w}-{s}.png').convert('RGB').resize((TW, TH), Image.LANCZOS), (c * TW, HEAD + r * TH))
    sheet.save(root / 'out' / f'{name}_cards_sheet.jpg', quality=88); print('sheet', name)
