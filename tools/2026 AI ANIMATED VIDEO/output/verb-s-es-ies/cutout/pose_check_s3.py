"""故事 3 姿勢檢查圖：python cutout/pose_check_s3.py → renders/costume/pose_check_s3.jpg（首幀由上到下排，每張上面一行檢查點說明）"""
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ITEMS = [
    ('ff3_fly.png', '鏡頭 1 首幀（C04 Ken flies a kite.）：Ken 背對風（風從左往右）、雙手拿線軸在胸前、抬頭看；線從線軸連到右上高空的風箏'),
    ('ff3_try.png', '鏡頭 2 首幀（C05 tries＋C06 卡樹）：圳寶雙手拿線軸、身體後仰；風箏歪斜亂晃、高度變低、靠近大樹；線鬆鬆的但連著'),
    ('ff3_cry.png', '鏡頭 3 首幀（C07 Zun-Bo cries.）：圳寶面向鏡頭哭（兩頰眼淚、張嘴）、雙手在身體前面低低拿著線軸、手不擋臉；線鬆鬆連到樹上的風箏；Ken 在後面擔心'),
    ('ff3_hurry.png', '鏡頭 4 首幀（C08 Shuiling hurries to help.）：水鈴側面跑步（手腳相反、手肘彎 90 度、手張開）；圳寶哭、線連到樹上的風箏'),
    ('ff3_help.png', '鏡頭 5 首幀（無台詞）：水鈴雙腳站在地上、雙手拿長竹竿把矮樹枝上的風箏輕輕挑下來（不爬樹）；圳寶線放鬆不拉'),
    ('ff3_happy.png', '鏡頭 6 首幀（C09 Now Zun-Bo flies the kite.）：圳寶背對風、雙手拿線軸、抬頭笑；線拉緊連到高空風箏；Ken、水鈴歡呼'),
]
Wd, Hh, BAR = 1536, 864, 100
font = ImageFont.truetype(r'C:\Windows\Fonts\msjhbd.ttc', 27)
sheet = Image.new('RGB', (Wd, (Hh + BAR)*len(ITEMS)), (29, 18, 64)); d = ImageDraw.Draw(sheet)
for i, (f, cap) in enumerate(ITEMS):
    y = i*(Hh + BAR); im = Image.open(os.path.join(ROOT, 'assets', 'firstframes', f)).convert('RGB').resize((Wd, Hh), Image.LANCZOS)
    a, b = cap.split('：', 1); d.text((20, y + 10), a, font=font, fill=(255, 216, 74)); d.text((20, y + 54), b, font=font, fill=(255, 255, 255)); sheet.paste(im, (0, y + BAR))
out = os.path.join(ROOT, 'renders', 'costume', 'pose_check_s3.jpg'); sheet.save(out, quality=88); print('ok', out, sheet.size)
