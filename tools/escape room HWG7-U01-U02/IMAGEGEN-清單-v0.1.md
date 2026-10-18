# HWG7 U01+U02「Ken and the World Map Mix-Up」｜Codex 圖片生成清單 v0.1

> 給 Codex 執行。依據：`DESIGN-v0.2-故事與題目配置.md`（已定案）｜日期：2026-10-18
> 專案資料夾：`G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG7-U01-U02\`
> **新圖共 60 張**：錨點 8、故事＋圖示 16、題目插圖 25、Godot 圖集 11。
> 另沿用 HWG5 已核准的 9 張，已複製進來、雜湊相同，不用再生（見第 1 節）。

## 0. Codex 執行規則（和 HWG5 相同，必讀）

1. **工具**：只用 Codex 內建 Image Gen，不改用付費 Images API。工具不能用就停下來回報。
2. **分 4 個階段**，每個階段做完都**停下來**，交接觸表和 QA 報告，等教師確認後再做下一階段。
3. **存檔位置**：放在 `assets/imagegen/` 下的固定子資料夾，檔名就是 ID。
   - 失敗版放 `rejected/`，原始輸出放 `raw/`，都不要刪除，也不要覆寫。
4. **Sidecar**：每張 PNG 旁邊放同名 `.png.json`，欄位如下：
   `id`、`prompt`、`source`（built-in Image Gen）、`source_file`、`created_at`、`width`、`height`、`sha256`、`alpha_check`（pass／fail／n/a）、`qa_notes`。
5. **完全不能有文字**：不能有英文字母、中文字、數字、國名、地名、招牌文字、對話泡泡內文字或浮水印。
   - **國旗、地標、食物、動物可以畫**，這些就是學生判斷國家的線索。
   - 但國旗上**不能有文字**，國旗和地標也**不能畫在人物衣服上**，否則會提前洩漏答案。
6. **透明圖要真 alpha**：要求透明的圖如果把棋盤格烙進 RGB，就放進 `rejected/` 並回報。
7. **尺寸**：保留原生輸出，不放大。
   - 場景和題目圖：1536×1024。
   - 人物：1024×1536 透明。
   - 圖示、Boss、Godot 圖集：正方形透明，Godot 場地圖集不透明。
8. **角色一致**：每張有人物的圖，都要以錨點圖當參考。
   - Ken、Tom、Tick 用沿用的 HWG5 錨點。
   - 新角色用第 1 階段定案的錨點。
9. **QA 報告**：每階段產出 `qa/stageN-contact-sheet.png` 和 `qa/stageN-qa-report.md`，列出 ID、尺寸、alpha 結果和 SHA-256，並逐張寫目視註記。

## 1. 沿用的 HWG5 圖（不要重做，生圖時當參考）

| ID | 檔案 | 用途 |
|---|---|---|
| REF-01 | `ref/REF-01-style.png` | 全案畫風參考 |
| CHAR-01 | `characters/CHAR-01-Ken.png` | 主角 Ken |
| CHAR-03 | `characters/CHAR-03-Tom.png` | 同學 Tom |
| MASCOT-01–04 | `mascots/MASCOT-01-Tick.png` 等 | Tick 本體和提示、答對、再試一次三種表情 |
| GAME-01、GAME-02 | `game/GAME-01-ken.png`、`game/GAME-02-tick-fx.png` | Godot 的 Ken 和 Tick 圖集 |

雜湊紀錄在 `assets/imagegen/qa/reused-from-hwg5.json`。

## 2. 共用風格提示詞（貼在每張提示詞最前面）

**STYLE-STORY**（錨點、故事、題目、圖示）

> Original Japanese TV-anime style illustration for elementary school English learners (ages 11–12), matching the attached style reference. Clean cel shading, crisp line art, bright warm palette, friendly expressive faces. Original characters only; do not imitate any named artist, studio, anime or existing mascot. Respectful, non-stereotyped depiction of all cultures. Absolutely NO text, NO letters, NO numbers, NO writing on flags or signs, NO speech-bubble text, NO watermark, NO UI.

**STYLE-GAME**（Godot 圖集）

> Premium hand-painted 2D top-down game art for a children's English adventure, chibi proportions, luminous storybook rendering, crisp silhouette, slightly elevated three-quarter FRONT camera, matching the existing Ken and Tick atlases. Absolutely NO text, letters, numbers, labels, grid lines or UI.

## 3. 第 1 階段｜新角色錨點（8 張，做完先停）

角色的衣服**不放國旗、地標或國名**，國家只能從場景裡的線索判斷。之後每張圖提到這些角色時，都要逐字貼上同一段描述。

| ID | 檔案 | 尺寸 | 提示詞（STYLE-STORY 之後） |
|---|---|---|---|
| CHAR-05 | `characters/CHAR-05-Maya.png` | 1024×1536 透明 | **Maya**: an 11-year-old girl, wavy strawberry-blonde hair in two low braids, light freckles, bright green eyes, big friendly smile; sky-blue T-shirt, denim overall shorts, yellow sneakers, small teal backpack. Full body, front three-quarter, waving hello. Transparent background, generous padding. |
| CHAR-06 | `characters/CHAR-06-Andy.png` | 1024×1536 透明 | **Andy**: an 11-year-old boy, short neat black hair with a side part, calm dark eyes, gentle smile; navy hoodie, grey shorts, white sneakers, small red backpack. Full body, front three-quarter, polite relaxed pose. Transparent background. |
| CHAR-07 | `characters/CHAR-07-Amy.png` | 1024×1536 透明 | **Amy**: an 11-year-old girl, dark-brown curly hair in a high bun with a red hair clip, warm brown eyes, cheerful laugh; coral-red cardigan over a white T-shirt, navy ankle-length long skirt, white sneakers. Full body, front three-quarter, energetic pose. Transparent background. |
| CHAR-08 | `characters/CHAR-08-Mina.png` | 1024×1536 透明 | **Mina**: an 11-year-old girl, straight auburn bob with a dark-green headband, blue-grey eyes, soft smile; lavender sweater, navy ankle-length pleated long skirt, black shoes with white socks. Full body, front three-quarter, holding a plain closed book. Transparent background. |
| CHAR-09 | `characters/CHAR-09-Wei.png` | 1024×1536 透明 | **Wei**: an 11-year-old boy, short spiky black hair, round friendly face, bright smile; orange polo shirt, khaki shorts, blue sneakers, grey backpack. Full body, front three-quarter, thumbs-up pose. Transparent background. |
| CHAR-10 | `characters/CHAR-10-Lynn.png` | 1024×1536 透明 | **Lynn**: an 11-year-old girl, long straight black hair in a side ponytail with a pink scrunchie, dark eyes, shy smile; pink zip jacket, light-blue jeans, white sneakers. Full body, front three-quarter. Transparent background. |
| CHAR-11 | `characters/CHAR-11-Alan.png` | 1024×1536 透明 | **Alan**: an 11-year-old boy, short curly dark hair, warm brown skin, lively eyes, wide grin; green T-shirt, tan cargo shorts, orange sneakers. Full body, front three-quarter, jumping a little with excitement. Transparent background. |
| BOSS-02 | `mascots/BOSS-02-MapGobbler.png` | 正方形透明 | **Map Gobbler**: a cute but mischievous dragon made of folded old map paper (origami style), map patterns without any labels or text, big round amber eyes, paper wings, a long folded tail, purple and gold accents, mouth slightly open as if munching paper. Impressive but friendly, no sharp teeth, family friendly. Transparent background. |

## 4. 第 2 階段｜故事場景與圖示（16 張）

### 4.1 故事場景（旁白插圖，1536×1024 不透明）

| ID | 檔案 | 場景 | 提示詞重點 |
|---|---|---|---|
| STORY-01 | `story/STORY-01-prologue.png` | 序章 | Sunny Hill School's bright hall decorated for a world friends festival with colorful bunting and paper flags (no text). A huge world map on the wall is half blank because Map Gobbler (BOSS-02) is munching it. Ken and Tick look up in surprise; the seven exchange students arrive at the door. |
| STORY-02 | `story/STORY-02-welcome.png` | 第一部：歡迎大廳 | Ken and Tick welcome Maya, Andy and Amy in the hall; small display tables show a kangaroo plush, a Mount Fuji postcard and a paella dish (no text). |
| STORY-03 | `story/STORY-03-mapwall.png` | 第一部：世界地圖牆 | The big world-map wall with empty glowing pin holes; Tom, Wei, Mina, Lynn and Alan stand with Ken and Tick; small landmark models (Taipei 101, Merlion, Big Ben, Statue of Liberty) on a shelf. |
| STORY-04 | `story/STORY-04-routes.png` | 第二部：路線站 | A colorful "route station" corner of the school: a crossing, a bus stop, a taxi, a scooter, a metro entrance and a small harbor in the distance, connected by glowing dotted paths; Ken and Tick holding blank route tickets. |
| STORY-05 | `story/STORY-05-echomap.png` | 終章：回聲地圖 | Map Gobbler in a grand hall where floating oval "echo map" frames (blank, softly glowing) replay scenes; Ken faces it bravely with Tick. |
| STORY-06 | `story/STORY-06-ending.png` | 結局 | The world map shining again with seven pins in place; Ken, Tom, all seven exchange students and Tick celebrate; Map Gobbler is small, calm and friendly, holding a neatly folded map. |
| STORY-07 | `story/STORY-07-home.png` | 首頁主視覺 | Key art: Ken in front with Tick, the seven friends around him, a glowing world map behind; leave the top 25% as calm sky or wall for an HTML title. |

### 4.2 圖示（網站 HUD 用，正方形透明）

| ID | 檔案 | 內容 |
|---|---|---|
| ICON-01 | `icons/ICON-01-pin-australia.png` | A round enamel badge pin showing the Australian flag (no text), golden rim |
| ICON-02 | `icons/ICON-02-pin-japan.png` | Same badge style, Japanese flag |
| ICON-03 | `icons/ICON-03-pin-spain.png` | Same badge style, Spanish flag **without the coat of arms text** |
| ICON-04 | `icons/ICON-04-pin-taiwan.png` | Same badge style, Taiwan flag |
| ICON-05 | `icons/ICON-05-pin-singapore.png` | Same badge style, Singapore flag |
| ICON-06 | `icons/ICON-06-pin-uk.png` | Same badge style, UK flag |
| ICON-07 | `icons/ICON-07-pin-usa.png` | Same badge style, US flag |
| ICON-08 | `icons/ICON-08-pin-blank.png` | Same badge style, blank silver face（還沒拿到的徽章用） |
| ICON-09 | `icons/ICON-09-echo-piece.png` | A glowing torn piece of an old map with golden edges, no labels |

7 枚國旗徽章的框、角度、大小要完全一致，只換中間的國旗。

## 5. 第 3 階段｜題目插圖（25 張，1536×1024 不透明）

**共同規則**
- 插圖是學生唯一的提示。國家題用**至少兩個**無文字線索：國旗、地標、食物、動物。
- 「不是」的題目，用紅色禁止圈蓋在錯的那個國家或交通工具上。
- 人物和場景照錨點，交換學生的衣服上不放國家線索。

| ID | 對應題 | 答案 | 畫面（Codex 提示詞重點） |
|---|---|---|---|
| Q01 | S Australia | Australia | Kangaroo and Sydney Opera House under a sunny sky, a small Australian flag on a pole |
| Q02 | D01 | are／Australia | Ken greeting Maya in the hall; behind Maya a poster of a kangaroo and the Sydney Opera House |
| Q03 | S Japan | Japan | Mount Fuji with cherry blossoms, a plate of sushi, a small Japanese flag |
| Q04 | D02 | is／Japan | Maya asking Ken, both looking at Andy, who holds a Mount Fuji postcard and a sushi lunch box |
| Q05 | S Spain | Spain | A big pan of paella, the Sagrada Família in the background, a small Spanish flag (no coat-of-arms text) |
| Q06 | D03 | is／from／Spain | Amy smiling beside a table with paella and a Spanish flag on a small stand |
| Q07 | S Taiwan | Taiwan | Taipei 101 tower and a cup of bubble milk tea, a small Taiwan flag |
| Q08 | D06 | Taiwan／is | Ken points at Tom; behind Tom a Taipei 101 model and bubble tea; Tom nods |
| Q09 | S Singapore | Singapore | The Merlion fountain and Marina Bay skyline, a small Singapore flag |
| Q10 | D05 | Is／isn't／Singapore | Wei with a Merlion model; a floating Taipei 101 icon covered by a red prohibition circle |
| Q11 | D04 | Is／isn't／the UK | Mina with a Big Ben and red double-decker bus postcard; a floating Taj Mahal icon covered by a red prohibition circle |
| Q12 | S the USA | the USA | The Statue of Liberty and a US flag |
| Q13 | D07 | the USA／aren't | Lynn and Alan side by side; a floating Statue-of-Liberty icon covered by a red prohibition circle |
| Q14 | S on foot | on foot | A child's sneakers walking on a sidewalk toward a school gate, footprints |
| Q15 | D10 | How／do／on foot | Ken walking to school with his backpack; Tick flying beside him asking |
| Q16 | S by taxi | by taxi | A yellow taxi at a curb (no text on the roof sign) |
| Q17 | D11 | How／goes／by taxi | Lynn getting out of a yellow taxi at the school gate |
| Q18 | S by bus | by bus | A city bus at a bus stop (no route numbers) |
| Q19 | D12 | Does／by bus／does | Alan sitting by a bus window, smiling, with a soft golden glow around the bus |
| Q20 | S by scooter | by scooter | A motor scooter with two helmets parked at a curb |
| Q21 | D13 | Does／doesn't／by scooter | Amy wearing a helmet, riding as a passenger behind an adult on a scooter; a floating car icon covered by a red prohibition circle |
| Q22 | S by metro | by metro | An underground metro train arriving at a clean station platform (no signs with text) |
| Q23 | D14 | by train／don't／by metro | Wei at a metro ticket gate; a floating long-distance train icon covered by a red prohibition circle |
| Q24 | D15 | by car／doesn't／by boat | Andy on a small ferry boat crossing a river toward school; a floating car icon covered by a red prohibition circle |
| Q27 | D16 | How do you go to school? | Maya riding her bicycle to school with a helmet, golden glow |

**重複使用的題目（不用生成）**：網站會加上「回聲地圖」畫框。
- Q25（D08）用 Q11。
- Q26（D09）用 Q13。
- Q28（D17）用 Q21。

## 6. 第 4 階段｜Godot 遊戲圖集（11 張，正方形 2×2 四格）

格式同 HWG5：四格等大、無格線、無標籤。03–10 號要真透明，11–13 號場地不透明，中央 65% 留空，不放角色。四格順序都是左上、右上、左下、右下。

| ID | 檔案 | 四格內容 |
|---|---|---|
| GAME-03 | `game/GAME-03-enemies-a.png` | 紙片小妖（揉皺的地圖紙）／行李吊牌小怪／紙飛機小怪／摺紙鶴小怪 |
| GAME-04 | `game/GAME-04-enemies-b.png` | 滾動行李箱小怪／雨傘小妖／水窪青蛙／捷運代幣小怪；全部可愛不恐怖 |
| GAME-05 | `game/GAME-05-boss.png` | Chibi Map Gobbler（同 BOSS-02）：第一階段帶地圖紙護盾／第二階段覺醒、紙翼張開發光／吐出紙片／被打敗後乖乖坐下、捧著摺好的地圖（無破損） |
| GAME-06 | `game/GAME-06-items-a.png` | Boomerang／Paper Fan（無文字花紋）／Bubble Tea／Merlion Splash（水柱） |
| GAME-07 | `game/GAME-07-items-b.png` | Running Shoes／Bus Pass Shield（空白卡片盾）／Rain Umbrella／Metro Map（無文字的路線圖） |
| GAME-08 | `game/GAME-08-mechanisms-a.png` | 行李轉盤中心軸／錦鯉池水窪／發光燈籠／灑水器 |
| GAME-09 | `game/GAME-09-mechanisms-b.png` | 平交道柵欄中心軸／公車廢氣雲／風／雨水窪 |
| GAME-10 | `game/GAME-10-mechanisms-c.png` | 行李箱（反彈物）／回聲地圖畫框（空白）／大型國家徽章（空白銀面）／Echo Map Piece |
| GAME-11 | `game/GAME-11-arenas-a.png` | 歡迎大廳／日式庭園／夜市／花園城市 |
| GAME-12 | `game/GAME-12-arenas-b.png` | 城市斑馬線／公車站／雨天街道／捷運站 |
| GAME-13 | `game/GAME-13-arenas-c.png` | 地圖大廳（Boss 第一階段，藍金）／地圖大廳（第二階段，紫金）／勝利廣場（世界地圖亮起）／備用：港口碼頭 |

戰鬥場地對照：

| 戰鬥 | 場地 |
|---|---|
| 1 | 歡迎大廳 |
| 2 | 日式庭園 |
| 3 | 夜市 |
| 4 | 花園城市 |
| 5 | 城市斑馬線 |
| 6 | 公車站 |
| 7 | 雨天街道 |
| 8 | 捷運站 |
| 9 | 地圖大廳（第一階段） |
| 10 | 地圖大廳（第二階段） |

勝利廣場是結果頁背景。

## 7. 階段與停點

| 階段 | 內容 | 張數 | 完成後 |
|---|---|---:|---|
| 1 | CHAR-05–11、BOSS-02 | 8 | **停**，交接觸表，等教師確認外觀 |
| 2 | STORY-01–07、ICON-01–09 | 16 | 停，交接觸表 |
| 3 | Q01–Q24、Q27 | 25 | 停，交接觸表，並逐張寫洩題檢查 |
| 4 | GAME-03–13 | 11 | 停，交接觸表，並附 alpha 檢查 |
| | **合計新圖** | **60** | |

## 8. QA 檢查表（每張都要過）

- [ ] 沒有任何文字、字母、數字、國名、地名、招牌文字，國旗上也沒有文字。
- [ ] 人物的臉、髮型、服裝、配色和錨點一致；交換學生衣服上沒有國家線索。
- [ ] 透明圖 `alpha_check` 是 `pass`，四角真透明。
- [ ] 題目圖能推出答案，但沒有直接寫出答案；「不是」的題目有紅色禁止圈。
- [ ] 文化描繪友善、不刻板。
- [ ] 檔名、資料夾、sidecar 齊全，失敗版保存在 `rejected/`。
