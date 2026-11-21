"""故事 2 姿勢檢查圖：python cutout/pose_check_s2.py → renders/costume/pose_check_s2.jpg（四張首幀直排，每張上面一行檢查點）"""
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ROWS = [('ff2_jog.png', '鏡頭 1 首幀 v2（B04 goes）：側面慢跑——前手在胸前、後手在身體後方不叉腰，兩肘彎約 90 度，手腳相反，一腳蹬地一腳抬膝'),
        ('ff2_station.png', '鏡頭 2 首幀 v2（B05 passes）：同樣的慢跑姿勢，經過二水車站（米白牆、黃色飾帶、圓柱門廊）；蒸汽火車停在軌道上'),
        ('ff2_tv.png', '鏡頭 3 首幀（B06 watches）：坐在沙發上看電視（背靠椅背、膝蓋彎、兩腳平放地板、右手拿遙控器放腿上、眼睛看電視）'),
        ('ff2_homework.png', '鏡頭 4 首幀 v2（B07 does）：近一點的鏡頭看得到手——拇指食指捏在筆尖上方、筆靠中指、筆尾斜向右肩；左手壓紙')]
W, BAR = 1536, 70
font = ImageFont.truetype(r'C:\Windows\Fonts\msjhbd.ttc', 25)
sheet = Image.new('RGB', (W, (864 + BAR)*len(ROWS)), (20, 14, 50)); d = ImageDraw.Draw(sheet)
for i, (f, cap) in enumerate(ROWS):
    y = i*(864 + BAR); d.text((20, y + 20), cap, font=font, fill=(255, 216, 74))
    sheet.paste(Image.open(os.path.join(ROOT, 'assets', 'firstframes', f)).convert('RGB').resize((W, 864), Image.LANCZOS), (0, y + BAR))
out = os.path.join(ROOT, 'renders', 'costume', 'pose_check_s2.jpg'); sheet.save(out, quality=90); print('ok', out, sheet.size, max(d.textlength(c, font=font) for _, c in ROWS))
