# SPEC — 畫風 G 扁平科普風試片 "I go to school by bus."

GOAL:    10 s。學生看完記得 "I go to school by bus."，並覺得畫面像科普動畫（扁平向量、夜色、發光、單一紅色重點）。
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    10 s x 30 = 300 frames，無音樂，只有程式合成音效（assets/sfx.wav）。

LOOK:    參考：Kurzgesagt 式扁平科普（只借語彙，不用其角色）。
         天空：#140f3a（頂）→ #2b1a63（中）→ #7a2a7a（地平線上 60px）→ #e0457b 地平線光帶。
         山：三層剪影 #2a1d5c / #211650 / #160f3d，每層往前深一階；遠山有 #4a2a7a 的上緣受光 3px。
         窗光、星光：#ffd36b、#fff4d6，用 SVG gaussian blur 8–18px 做發光。
         唯一重點色：#e8433a（公車與 "by bus."），其他物件不准用紅。
         學生（How Do You Go 的 TW 角色）：皮膚 #f6cba6、頭髮 #2a2024 馬尾、外套 #2fa59a（暗面 #23857c）、
         褲子 #2c3a67、鞋 #38b2a6、書包 #f4e6c6；扁平無黑框，右側 4px 洋紅輪廓光 #ff7aa8 60%。
         字：Nunito 900，標籤 44px／副標 28px #c9b8ff；大句 112px 白＋紅。
OBJECTS: 公車站牌（細柱＋圓牌，牌上公車圖示）、紅色公車（車窗暖光、車頭燈光束、輪子、路線號 7）、
         村莊小屋（窗光）、學校（三角屋頂＋旗子＋鐘）、家（小屋）、地圖道路（白色虛線）。
MOTION:  enter：back.out(1.6) 0.45 s；move：power2.inOut；車停：power3.out＋2 次懸吊回彈；
         相機推近：sine.inOut 3.5 s 放大 1.0→1.07；文字逐字間隔 0.18 s。
SHOTS:   f0–105（0–3.5 s）：山谷清晨，相機慢推；f36 標籤「7:10 a.m.／school starts at 7:40」彈出。
         f105–195（3.5–6.5 s）：公車由左開入，f156 停在站牌前回彈；f138 標籤「BUS 7／40 seats」。
         f195–300（6.5–10 s）：畫面縮小、淡入俯視地圖；公車點沿虛線從家開到學校；
                              f222 起逐字 "I go to school by bus."（"by bus." 紅色）；f240 標籤「3.2 km · 12 min」；f270 後靜止。
BANNED:  黑底中間漂浮小物；所有東西同時淡入；閱讀中移動的字；角落標籤裝飾；玻璃卡片；第二個紅色物件。
QA:      f30（學生背影＋站牌清楚）、f160（公車停妥、標籤可讀）、f285（地圖＋整句可讀、紅色只在公車與 by bus.）。
