# HWG5 U01+U02「Ken and the Frozen Clock Tower」｜Codex 圖片生成清單 v0.1

> 給 Codex 執行。依據：`DESIGN-v0.4-故事與題目配置.md`｜日期：2026-10-17
> 專案資料夾：`G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\`
> 共 **71 張**：錨點 7、Tick 表情 3、故事場景 10、題目插圖 28、課表與道具圖示 10、Godot 圖集 13。

---

## 0. Codex 執行規則（必讀）

1. **工具**：使用 Codex 內建 Image Gen；不要改用付費 Images API。若內建工具無法使用，就停下來回報，不要自行換管道。
2. **分 4 個階段**（見第 7 節）。**第 1 階段的 7 張錨點完成後先停**，由教師確認人物外觀，之後才做其他階段。
3. **存檔位置**：一律存在 `assets/imagegen/` 下的固定子資料夾，檔名就是本清單的 ID（例如 `characters/CHAR-01-Ken.png`）。
   - 失敗版放 `rejected/`，原始輸出放 `raw/`，都不要刪除，也不要覆寫。
4. **Sidecar**：每張 PNG 旁邊放一個同名 `.png.json`，欄位如下：
   `id`、`prompt`（完整提示詞）、`source`（`built-in Image Gen`）、`source_file`、`created_at`、`width`、`height`、`sha256`、`alpha_check`（透明圖填 `pass`／`fail`；不透明圖填 `n/a`）、`qa_notes`。
5. **完全不能有文字**：圖中不可出現英文字母、中文字、數字、星期名、科目名、時鐘數字、招牌、對話泡泡內文字、浮水印或 UI。
   - 星期條、時鐘指針、課表、對話文字都由網站用 HTML／SVG 疊上去。
6. **透明圖要真透明**：要求透明背景的圖，必須是真正的 alpha。
   - 若輸出把棋盤格烙進 RGB，`alpha_check` 填 `fail`，原檔移到 `rejected/` 並回報。
   - 不要拿看起來像棋盤格的圖冒充透明（HWG7 專案曾發生過）。
7. **尺寸**：保留原生輸出，不放大。
   - 場景、題目圖：橫式 1536×1024。
   - 人物：直式 1024×1536。
   - 圖示、吉祥物、Godot 圖集：正方形（1024 或原生 1254）。
   - 網站用的 WebP 由 Claude 之後用腳本產生，Codex 不用做。
8. **角色一致**：第 1 階段錨點確認後，之後每張有人物的圖都要以錨點為參考圖，不得改臉、髮型、服裝、配色或比例。
9. **完成後回報**：每階段結束時產出一張接觸表（contact sheet）存到 `qa/`，並列出每張的 ID、尺寸、alpha 結果和 SHA-256。

## 1. 資料夾結構

```
assets/imagegen/
  ref/         REF-01
  characters/  CHAR-01–04
  mascots/     MASCOT-01–04（Tick）、BOSS-01
  story/       STORY-01–10
  questions/   Q01–Q32（缺 Q27–Q30，這 4 題重複使用前面的圖）
  icons/       ICON-01–10
  game/        GAME-01–13
  raw/  rejected/  qa/
```

## 2. 共用風格提示詞（貼在每張提示詞最前面）

**STYLE-STORY**（錨點、故事、題目、圖示）

> Original Japanese TV-anime style illustration for elementary school English learners (ages 10–12). Clean cel shading, crisp confident line art, bright warm cheerful palette, friendly expressive faces, soft daylight. Original characters only; do not imitate any named artist, studio, anime title or existing mascot. Absolutely NO text, NO letters, NO numbers, NO signs with writing, NO speech-bubble text, NO watermark, NO UI.

**STYLE-GAME**（Godot 圖集）

> Premium hand-painted 2D top-down game art for a children's English adventure, chibi proportions (head about 1/3 of body), luminous painterly storybook rendering, rich jewel colors, crisp readable silhouette, viewed from a slightly elevated three-quarter FRONT camera. Must match the anime character sheet colors and outfit exactly. Absolutely NO text, letters, numbers, labels, grid lines or UI.

## 3. 第 1 階段｜錨點（7 張，完成後先停，等教師確認）

**固定外觀描述**：之後所有提示詞提到這些角色時，都要逐字貼上同一段描述。

| ID | 檔案 | 尺寸 | 提示詞（STYLE-STORY 之後） |
|---|---|---|---|
| REF-01 | `ref/REF-01-style.png` | 1536×1024 | A sunny elementary school courtyard with a tall friendly cream-and-teal clock tower; the clock face is completely BLANK (no numerals, no hands). Blue sky, cherry trees, clean school building. No people. Style reference for the whole project. |
| CHAR-01 | `characters/CHAR-01-Ken.png` | 1024×1536 透明 | **Ken**: an 11-year-old boy, short spiky dark-brown hair, warm brown eyes, confident kind smile; white short-sleeve polo shirt with navy collar, small round silver gear-shaped pin on the chest, navy shorts, red sneakers with white soles, orange-and-navy backpack. Full body, standing, front three-quarter view, relaxed ready pose. Transparent background, generous padding. |
| CHAR-02 | `characters/CHAR-02-Jenny.png` | 1024×1536 透明 | **Jenny**: an 11-year-old girl, long light-brown hair in a high ponytail with a yellow ribbon, bright hazel eyes; white blouse with small red bow, teal pleated skirt, white knee socks, white sneakers. Full body, front three-quarter, cheerful pose. Transparent background. |
| CHAR-03 | `characters/CHAR-03-Tom.png` | 1024×1536 透明 | **Tom**: an 11-year-old boy, messy short orange-red hair, light freckles, big grin; green hoodie over white T-shirt, denim shorts, blue sneakers. Sporty energetic pose, full body, front three-quarter. Transparent background. |
| CHAR-04 | `characters/CHAR-04-Jack.png` | 1024×1536 透明 | **Jack**: an 11-year-old boy, neat straight black hair, round black glasses, calm thoughtful smile; light-blue button shirt, khaki long pants, brown shoes, holding a plain closed notebook (no writing). Full body, front three-quarter. Transparent background. |
| MASCOT-01 | `mascots/MASCOT-01-Tick.png` | 1024×1024 透明 | **Tick**: a tiny cute floating pocket-watch spirit. Round shiny brass-gold body, cream watch face that is its face with two big friendly eyes and a small smile (NO numerals, NO hands on the face), a winding crown on top like a little antenna, two small golden gear wings. Floating happily. Transparent background. |
| BOSS-01 | `mascots/BOSS-01-TimeMuncher.png` | 1024×1024 透明 | **Time Muncher**: a big round purple-and-bronze gear creature, a hinged clock-cover lid as its wide mouth (no sharp teeth), glowing amber eyes, spinning cogs on its back, two long curved clock-hand arms. Mischievous and impressive but cute, family friendly, no gore. Transparent background. |

## 4. 第 2 階段｜Tick 表情、故事場景、圖示（23 張）

### 4.1 Tick 表情（作答回饋用，取代中文提示）

| ID | 檔案 | 尺寸 | 提示詞 |
|---|---|---|---|
| MASCOT-02 | `mascots/MASCOT-02-Tick-hint.png` | 1024×1024 透明 | Tick (same as MASCOT-01) holding a tiny magnifying glass, curious "look again" expression. Transparent. |
| MASCOT-03 | `mascots/MASCOT-03-Tick-correct.png` | 1024×1024 透明 | Tick (same) cheering with gear wings spread, golden sparkles. Transparent. |
| MASCOT-04 | `mascots/MASCOT-04-Tick-tryagain.png` | 1024×1024 透明 | Tick (same) gentle encouraging face, one small wing raised like "you can do it". Transparent. |

### 4.2 故事場景（旁白插圖；全部橫式 1536×1024、不透明）

| ID | 檔案 | 場景 | 提示詞重點 |
|---|---|---|---|
| STORY-01 | `story/STORY-01-prologue.png` | 序章 | The clock tower from REF-01 at morning; the clock face is BLANK and frozen with a frosty blue glow. Time Muncher (BOSS-01) above the tower swallowing glowing golden gears and tiny floating school-subject objects (paintbrush, recorder, microscope, globe). Ken and Tick in the courtyard looking up, surprised. |
| STORY-02 | `story/STORY-02-monday.png` | 星期一 | A glowing round "day gate" portal opening onto a bright art room (easels, paint palettes, colorful drawings without writing). Ken and Tick step through. |
| STORY-03 | `story/STORY-03-tuesday.png` | 星期二 | Day gate opening onto a music hall (piano, drums, recorders, floating musical notes). Ken and Tick. |
| STORY-04 | `story/STORY-04-wednesday.png` | 星期三 | Day gate onto a math lab with floating colorful geometric blocks, abacus, rulers (no digits anywhere). Ken, Tick, Jack. |
| STORY-05 | `story/STORY-05-thursday.png` | 星期四 | A long magical school corridor whose floor has giant moving clock-hand shapes; doors to a language room and a science lab. Ken, Tick, Jenny, Tom. |
| STORY-06 | `story/STORY-06-friday.png` | 星期五 | Day gate onto a gym with balls, cones, jump ropes; through a side door a map room with a globe and blank world maps. Ken, Tick, Jenny, Tom, Jack. |
| STORY-07 | `story/STORY-07-weekend.png` | 週末 | The clock tower rooftop on a breezy sunny weekend; below, a park with children flying kites. Ken and Tick; Time Muncher's shadow passing over. |
| STORY-08 | `story/STORY-08-clockcore.png` | 終章 | Inside the clock tower core: huge turning golden gears, floating oval "memory mirrors" (empty, softly glowing), Time Muncher waiting. Ken bravely facing it with Tick. |
| STORY-09 | `story/STORY-09-ending.png` | 結局 | The clock tower running again with golden light; seven glowing gears placed in a ring; Ken, Jenny, Tom, Jack and Tick celebrating in the courtyard; Time Muncher now small, calm and friendly. |
| STORY-10 | `story/STORY-10-home.png` | 首頁主視覺 | Title key art: Ken in the front, Tick beside him, clock tower behind, a row of seven glowing day-gate portals in an arc. Leave the top 25% as calm sky for an HTML title. |

### 4.3 課表與道具圖示（網站用；全部 1024×1024 透明，物件置中、四周留白）

| ID | 檔案 | 內容（Codex 提示詞） |
|---|---|---|
| ICON-01 | `icons/ICON-01-art.png` | Paint palette with bright paint dabs and a brush, small easel. |
| ICON-02 | `icons/ICON-02-music.png` | Recorder, small drum and two floating musical notes. |
| ICON-03 | `icons/ICON-03-math.png` | Abacus, triangle ruler and geometric blocks (no digits). |
| ICON-04 | `icons/ICON-04-chinese.png` | Calligraphy brush, ink stone and a rice-paper scroll with abstract brush strokes (no readable characters). |
| ICON-05 | `icons/ICON-05-english.png` | Headphones, an open picture book showing only pictures, two empty speech bubbles. |
| ICON-06 | `icons/ICON-06-science.png` | Microscope, test tubes with colorful liquid, safety goggles. |
| ICON-07 | `icons/ICON-07-pe.png` | Soccer ball, jump rope, orange cone and sneakers. |
| ICON-08 | `icons/ICON-08-socialstudies.png` | Globe, folded world map with no labels, compass, tiny pyramid and tower landmark models. |
| ICON-09 | `icons/ICON-09-daygear.png` | One glowing golden gear with a soft white center (website will tint it per day). |
| ICON-10 | `icons/ICON-10-mirrorshard.png` | A sparkling silver-blue mirror shard with golden edge. |

## 5. 第 3 階段｜題目插圖（28 張，全部 1536×1024、不透明）

**共同規則**
- 插圖是學生**唯一**的提示，必須讓學生可以推出答案，但不能把答案寫出來。
- 星期由網站在圖片上方另外顯示「7 格星期條」，亮出當天位置；所以圖中**不要**畫月曆或星期文字。
- 「沒有」用紅色禁止圈（🚫 造型的圈加斜線）蓋在物件圖示上；「有」用柔和金色光框。
- 人物名字不用畫出來，網站會另外標示。
- 選項裡的干擾答案，不要在圖中被強調。

| ID | 對應題 | 答案 | 畫面（Codex 提示詞重點） | 洩題檢查 |
|---|---|---|---|---|
| Q01 | D02 | time／9:50 | Close-up of the clock tower face, a large perfectly round BLANK white clock face (no numerals, NO hands, 12 small tick marks only) centered horizontally in the upper half; Ken and Tick at the bottom looking up in surprise. | 指針由 SVG 疊加；sidecar 記下鐘面圓心 x、y 與半徑 px |
| Q02 | D04 | is／Monday | Early morning at the school gate, Ken with backpack arriving, other kids arriving, sunrise, Tick yawning. Feels like the first school day of the week. | 無文字、無月曆 |
| Q03 | D05 | Monday／is | Ken and Tick in front of the art room door (easel and paint palette visible inside); Tick asking, Ken nodding with a smile. | 同上 |
| Q04 | D10 | art／do | Art room. Jenny asking Ken; Ken holding a paint palette in front of an easel, nodding happily. Golden glow frame around the easel. | 不出現其他科目道具 |
| Q05 | S2 | Tuesday | Morning in front of the music hall; Tick flipping a huge BLANK paper page with a whoosh as a new day begins. | 頁面完全空白 |
| Q06 | D06 | isn't／Tuesday | Tick confused, pointing back toward the art room; Ken shaking his head and pointing at the music hall door. | 無文字 |
| Q07 | S11 | music | Ken playing a recorder in the music hall; piano, drum and floating musical notes around him. | 無樂譜文字 |
| Q08 | D14 | music／do | Music hall. Jenny asking; Ken holding a recorder, nodding with a big smile; golden glow around the instruments. | 不出現美術道具 |
| Q09 | S3 | Wednesday | The math lab doorway at morning with giant floating geometric blocks; Tick welcoming Ken. | 無數字 |
| Q10 | D01 | day／Wednesday | Tick holding up a newly glowing gear in the math lab, Ken curious. | 無文字 |
| Q11 | S9 | math | Close-up of a desk with abacus, triangle ruler, colorful geometric blocks and a calculator with blank buttons. | 計算機按鍵與尺不可有數字 |
| Q12 | D13 | Does／math | Jack solving with an abacus in the math lab; Ken pointing at Jack and asking Jenny; Jenny nodding. | 無數字 |
| Q13 | S1 | Thursday | The magical corridor with giant clock-hand shapes on the floor, new morning light; Ken and Tick at the start. | 無文字 |
| Q14 | D03 | today／Thursday | Ken and Tick looking out of a corridor window at the morning sky, Tick asking a question. | 無文字 |
| Q15 | S6 | Chinese | Close-up of a calligraphy desk: brush, ink stone, rice-paper scroll with abstract strokes. | 不可有可讀的中文字 |
| Q16 | D11 | Do／Chinese | Jenny asking Ken in the corridor; Ken shaking his head; beside them a floating board with a calligraphy brush icon covered by a red prohibition circle. | 無文字 |
| Q17 | S7 | English | Language room: headphones on a desk, open picture book with only pictures, two empty speech bubbles floating. | 書與泡泡內無文字 |
| Q18 | D12 | English／does | Ken pointing at Tom, who wears headphones and holds a picture book; Jenny answering with a nod. | 無文字 |
| Q19 | S8 | science | Science lab close-up: microscope, colorful test tubes, bubbling beaker, safety goggles. | 無標籤 |
| Q20 | D16 | Does／science | Jenny in safety goggles looking into a microscope; Ken asking Tom; Tom nodding. | 無標籤 |
| Q21 | S4 | Friday | Gym entrance at morning, end-of-week cheerful feeling, balls and cones visible; Ken and Tick. | 無文字 |
| Q22 | D15 | PE／doesn't | Jenny walking past the gym; a floating board with ball, jump rope and cone icons covered by a red prohibition circle. | 無文字 |
| Q23 | S10 | social studies | Map room close-up: globe, unlabeled world map, compass, tiny pyramid and tower models. | 地圖無地名 |
| Q24 | D17 | social studies／don't | Ken, Jenny, Tom and Jack together looking at a board where a globe-and-map icon is covered by a red prohibition circle. | 無文字 |
| Q25 | D07 | Is／isn't | Clock tower rooftop on a sunny weekend morning; Tick asking with a tilted head; Ken shaking his head and smiling. | 無文字 |
| Q26 | S5 | Saturday | View from the rooftop down to the park: kids flying kites, families relaxing, weekend mood; Ken and Tick watching. | 無文字 |
| Q31 | D20 | Yes, he does. | Inside an oval memory mirror (glowing frame): Tom in the gym playing with a ball, jump rope nearby, golden glow; the mirror floats in the clock core. | 無文字 |
| Q32 | D21 | No, she doesn't. | Inside an oval memory mirror: Jenny beside a board where a musical-note-and-recorder icon is covered by a red prohibition circle. | 無文字 |

**重複使用的題目（不用另外生成）**：記憶之鏡的畫框由網站用 CSS 加上。
- Q27（D08）用 Q03。
- Q28（D09）用 Q06。
- Q29（D18）用 Q04。
- Q30（D19）用 Q16。

## 6. 第 4 階段｜Godot 遊戲圖集（13 張）

**共同規則**
- 格式同 Lesson Hub v07：正方形 **2×2 四格圖集**，四格等大、無格線、無標籤。
- 角色、敵人、道具、機關的圖集都要**透明背景**，每格一個完整物件，置中，四邊留透明邊，四格比例一致。
- 場景圖集不透明：俯視、四個獨立場地，**中央 65% 留空當可走的戰鬥區**，邊緣才放裝飾，不放角色。
- 參考 `English Lesson Hub HWG/godot/forest-of-words-six-heroes-20261016/assets/` 的 `mage.png`、`boss.png`、`biomes-v07.png`、`mechanisms-v07.png`，只參考格式與構圖，不複製內容。

| ID | 檔案 | 類型 | 四格內容（左上／右上／左下／右下） |
|---|---|---|---|
| GAME-01 | `game/GAME-01-ken.png` | 角色·透明 | Chibi Ken（外觀同 CHAR-01）：待機／左腳前走／右腳前走／施放 Tick-Tock Burst（舉手，金色時鐘光環） |
| GAME-02 | `game/GAME-02-tick-fx.png` | 夥伴＋特效·透明 | Chibi Tick 漂浮／Tick 歡呼／Tick-Tock Burst 金色時鐘環特效／星期齒輪拾取光芒 |
| GAME-03 | `game/GAME-03-enemies-a.png` | 敵人·透明 | Gear Gremlin（小齒輪妖）／Clock-Hand Beetle（指針甲蟲）／Paint Blob（顏料團）／Sound Bat（聲波蝙蝠） |
| GAME-04 | `game/GAME-04-enemies-b.png` | 敵人·透明 | Block Golem（無數字積木魔像）／Ink Blob（墨水團）／Bubble Slime（藥水泡泡怪）／Bouncy Ball Imp（彈跳球小鬼）；全部可愛不恐怖 |
| GAME-05 | `game/GAME-05-boss.png` | Boss·透明 | Chibi Time Muncher（外觀同 BOSS-01）：第一階段帶齒輪護盾／第二階段覺醒（紫金光更亮）／施法（張開時鐘蓋嘴、小光球）／被打敗後安靜坐下、恢復友善（無破損） |
| GAME-06 | `game/GAME-06-items-a.png` | 道具·透明 | Paint Splash／Music Note Shield／Ruler Boomerang（無刻度數字）／Textbook Guard（課本護盾：外觀同 ICON-04 國語課本，封面只允許「國語」兩字，周圍淡金色護盾光） |
| GAME-07 | `game/GAME-07-items-b.png` | 道具·透明 | Word Bubble（空白泡泡，不含字母）／Science Potion／Speed Sneakers／Globe Compass |
| GAME-08 | `game/GAME-08-mechanisms-a.png` | 機關·透明 | 時針掃地器（中心軸＋長指針）／顏料水窪／聲波喇叭／落下的空白積木 |
| GAME-09 | `game/GAME-09-mechanisms-b.png` | 機關·透明 | 墨水雲／紙片旋風（無字）／冒泡藥水池／迷霧雲 |
| GAME-10 | `game/GAME-10-mechanisms-c.png` | 機關·透明 | 屋頂風扇／記憶之鏡（空白鏡面）／大星期齒輪／Mirror Shard |
| GAME-11 | `game/GAME-11-arenas-a.png` | 場景·不透明 | 鐘塔廣場／美術教室／音樂廳／數學實驗室 |
| GAME-12 | `game/GAME-12-arenas-b.png` | 場景·不透明 | 星期四走廊／語言教室／科學實驗室／體育館與地圖室 |
| GAME-13 | `game/GAME-13-arenas-c.png` | 場景·不透明 | 鐘塔屋頂／鐘塔核心（第一階段，藍金）／鐘塔核心（第二階段，紫金）／勝利廣場（鐘塔恢復） |

戰鬥場地對照：

| 戰鬥 | 場地 |
|---|---|
| 1 | 鐘塔廣場 |
| 2 | 美術教室 |
| 3 | 音樂廳 |
| 4 | 數學實驗室 |
| 5 | 星期四走廊 |
| 6 | 語言教室 |
| 7 | 科學實驗室 |
| 8 | 體育館與地圖室 |
| 9 | 鐘塔屋頂 |
| 10 | 鐘塔核心（Boss 第一階段） |
| 11 | 鐘塔核心（Boss 第二階段） |

勝利廣場是結果頁背景。

## 7. 階段與停點

| 階段 | 內容 | 張數 | 完成後 |
|---|---|---:|---|
| 1 | REF-01、CHAR-01–04、MASCOT-01、BOSS-01 | 7 | **停**，交接觸表給教師確認人物 |
| 2 | MASCOT-02–04、STORY-01–10、ICON-01–10 | 23 | 交接觸表，繼續 |
| 3 | Q01–Q26、Q31、Q32 | 28 | 交接觸表，並逐張填寫洩題檢查 |
| 4 | GAME-01–13 | 13 | 交接觸表，並附 alpha 檢查結果 |
| | **合計** | **71** | |

## 8. QA 檢查表（每張都要過）

- [ ] 沒有任何文字、字母、數字、星期名、科目名、對話泡泡文字。
- [ ] 人物的臉、髮型、服裝、配色與錨點一致。
- [ ] 透明圖的 `alpha_check` 是 `pass`，四角都是真透明。
- [ ] 題目圖能讓學生推出答案，但不直接寫出答案；「沒有」題有紅色禁止圈，「有」題有金色光框。
- [ ] Q01 的鐘面空白、沒有指針，並在 sidecar 記下圓心與半徑。
- [ ] 檔名、資料夾、sidecar 齊全；失敗版保存在 `rejected/`。
