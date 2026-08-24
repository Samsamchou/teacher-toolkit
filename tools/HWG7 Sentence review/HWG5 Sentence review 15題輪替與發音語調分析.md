---
unit_id: hwg5-sr
unit_label: HWG5 SR
question_bank_version: hwg5-sr-v1-answer-only
rubric_version: a1-v2-answer-only
status: teacher_confirmed
teacher_confirmation: "2026-08-24 confirmed items 1-4"
date: 2026-08-24
source_directory: G:\\我的雲端硬碟\\teacher-toolkit\\tools\\HWG7 Sentence review\\HWG5 Sentence review pics
source_file_count: 15
question_count: 15
read_aloud_count: 8
question_answer_count: 7
---

# HWG5 Sentence review：15 題輪替與發音語調分析

> 教師已於 2026-08-24 確認四項決策；本文件與 15 題均標記為 `teacher_confirmed`，可進入本機題庫、圖片與程式整合。

## 一、已確認的共通規則

- 單元：`HWG5 SR`；沿用既有網站已登錄但停用的 `hwg5-sr`。
- 題庫共 15 題：題型 1 `read_aloud` 8 題、題型 2 `question_answer` 7 題。
- 每局從兩類各抽 6 題，共 12 題且不重複；兩位玩家各 6 回合，奇偶回合交換題型。
- 題型 1 錄製並評分學生朗讀的目標句。
- 題型 2 顯示並播放問句，但只錄製、轉錄、分析與評分學生答句；問句不納入評分。
- 固定公式：準確度 50%＋完整度 30%＋流暢度 20%；80 分達標；最多 3 次有效作答；系統失敗不計次。
- 所列縮寫式與完整式均為獨立滿分路徑，例如 `It's`＝`It is`、`He's`＝`He is`、`I'm`＝`I am`、`She's`＝`She is`。
- 發音難字、重音、語調、語塊與連音用於教學回饋，不另行重複扣分；語調不單獨決定達標。
- 題型 1 目標句與題型 2 問句使用靜態美式 AI 示範音檔：`gpt-4o-mini-tts`、`marin`、速度 `0.8`。
- 原圖只作內容參考，15 張來源檔不得修改或直接發布；公開網站改用重製的原創教學圖片。

符號：`‿` 表示連讀、`｜` 表示意群分段、`↘` 表示句尾降調。

## 二、教師確認紀錄

1. 已確認第 11 題完整答校正為 **`He is running.`**。
2. 已確認第 15 題答句鷹架為 **`It's _____ the _____.`**。
3. 已確認 **`It is eleven o'clock.`** 為第 10 題滿分答案。
4. 已確認四道時間題的小時或分鐘／`o'clock` 錯誤或缺漏時，總分上限為 **59 分**；套用到第 1、2、9、10 題。

## 三、來源圖片盤點與視覺核對

| 網站題號 | 來源檔 | 用途 | 視覺核對 | 公開圖重製重點 |
|---|---|---|---|---|
| HWG5-SR-001 | `01.gif` | 5:55 時鐘 | 相符 | 指針清楚，避免出現數字答案文字 |
| HWG5-SR-002 | `02.gif` | 3:15 時鐘 | 相符 | 時針與分針不能重疊到難辨識 |
| HWG5-SR-003 | `03.png` | 正在寫字 | 相符 | 原創學生角色，寫字動作清楚 |
| HWG5-SR-004 | `04.png` | 正在游泳 | 相符 | 原創學生角色，游泳動作清楚 |
| HWG5-SR-005 | `05.png` | 在廚房 | 相符 | 以爐台、流理台等環境線索呈現，不放文字答案 |
| HWG5-SR-006 | `06.png` | 在院子 | 相符但原圖為立體書／模型風格 | 原創戶外院子場景，人物與庭院線索清楚 |
| HWG5-SR-007 | `14.png` | marker 在 bag 裡 | 透明袋可見，但 marker 不夠醒目 | 放大 marker，明確呈現在透明 bag 內；移除既有角色／品牌元素 |
| HWG5-SR-008 | `15.png` | hat 在 table 旁 | 小帽子在桌邊，但角色與袋子容易干擾 | 只保留清楚的 hat 與 table 空間關係；移除既有角色／品牌元素 |
| HWG5-SR-009 | `08.gif` | 5:45 時鐘 | 相符 | 指針清楚，避免顯示數字答案文字 |
| HWG5-SR-010 | `09 eleven oclock.gif` | 11:00 時鐘 | 相符 | 11 點整，時針與分針清楚 |
| HWG5-SR-011 | `10.png` | 正在跑步 | 相符 | 原創學生角色，跑步動作清楚 |
| HWG5-SR-012 | `11.png` | 正在喝飲料 | 相符；採「學生扮演圖中人物」回答 | 原創學生角色，喝飲料動作清楚 |
| HWG5-SR-013 | `12.png` | 在餐廳 | 場景相符，但原圖含既有知名角色與品牌 | 改成原創人物與餐桌場景，不使用既有角色 |
| HWG5-SR-014 | `13.png` | 在客廳 | 相符但原圖為立體書／模型風格 | 原創人物；沙發、茶几等客廳線索清楚 |
| HWG5-SR-015 | `16.png` | ball 在 table 下 | 相符，但球很小 | 放大球並明確置於桌面垂直範圍下方；移除既有角色／品牌元素 |

來源 GIF 均為單幀；不需要保留動畫效果。

## 四、英文時間逐字稿與評分正規化

### 4.1 三份文字分開保存

1. `rawTranscript`：保留語音轉錄服務原始輸出，供教師稽核，不覆寫。
2. `canonicalTranscript`：在題目限定的 allowlist 內做確定性正規化，作為評分輸入。
3. `displayTranscript`：學生端與教師端主要逐字稿使用；由 canonical 文字產生，時間一律顯示英文單字，不顯示阿拉伯數字。教師端仍可另看 `rawTranscript` 稽核。

### 4.2 僅限四道時間題的確定性規則

| 題號 | 可辨識輸入範例 | `displayTranscript`／評分 canonical 片語 |
|---|---|---|
| 001 | `5:55`、`5.55`、答案位置中的 `5 55`、`five fifty five`、`five-fifty-five` | `five fifty-five` |
| 002 | `3:15`、`3.15`、答案位置中的 `3 15`、`three fifteen` | `three fifteen` |
| 009 | `5:45`、`5.45`、答案位置中的 `5 45`、`five forty five`、`five-forty-five` | `five forty-five` |
| 010 | `11:00`、`11.00`、`eleven o clock`、`eleven oclock`、`eleven o’clock` | `eleven o'clock` |

- 規則只套用到上表四題，不全域把任何阿拉伯數字改成英文。
- `It's 5:45.` 顯示為 `It's five forty-five.`；`It is 5:45.` 顯示為 `It is five forty-five.`。縮寫形式可保留學生實際說法，評分時再展開為同一結構。
- `o’clock`、`o'clock`、`o clock`、`oclock` 與目標限定的 `oh clock` 都正規化為 ASCII canonical `o'clock`。
- `11:00` 可視為轉錄服務將完整時間壓成數字，因此正規化為 `eleven o'clock`。
- **`eleven` 或 `11` 單獨出現時不可自動補上 `o'clock`**；缺少必要核心槽位，依建議規則總分上限 59。
- `545` 等沒有分隔符號的模糊數字不可猜成 `5:45`；標記為 `ambiguous_clock_transcript`，不消耗有效作答次數並請學生重錄。
- 正規化只能忠實改寫轉錄格式，不能利用目標答案把錯誤時間改成正確時間；例如第 9 題的 `3:15` 只能變成 `three fifteen`，不可變成 `five forty-five`。
- OpenAI 的轉錄提示可加入題目上下文與關鍵詞，但只作提示；最後仍由上述確定性規則保證顯示與評分一致。

### 4.3 必測案例

- 數字格式：`5:55`、`3:15`、`5:45`、`11:00` 在學生畫面均不得出現阿拉伯數字。
- 連字號：`forty five` 與 `forty-five` 評分等值，顯示統一為 `forty-five`。
- 撇號：直撇號、彎撇號、無撇號與分開的 `o clock` 評分等值。
- 不可過度補字：`eleven` 不得變成 `eleven o'clock`；`five forty` 不得補成 `five forty-five`。
- 核心錯誤：`six fifty-five`、`five fifteen`、`ten o'clock` 即使其他字相同，也不可達 80 分。
- 非時間題：例如第 3 題出現 `I'm writing 5.` 時，數字必須保留，證明沒有全域轉換。
- 未核准片語短答：`Five forty-five.`、`Running.`、`Under the table.` 不列為滿分路徑，也不得達 80 分。

## 五、15 題教師審核內容

### HWG5-SR-001｜題型 1｜圖片 1

- 目標句：`It's five fifty-five.`
- 等值縮寫：`It is five fifty-five.` 可依既定縮寫等值規則評分。
- TTS 文字：`It's five fifty-five.`
- 核心槽位：`hour=five`、`minute=fifty-five`
- 完整度槽位：`it`、`is`、`five`、`fifty-five`
- 發音難字：`it's` /ɪts/（保留 /s/）；`five` /faɪv/（保留 /v/）；`fifty-five` /ˌfɪfti ˈfaɪv/（`-ty` 不要說成 `-teen`）。
- 重音／語調：`FIVE｜fifty-FIVE ↘`
- 語塊／連音：`It's‿five｜fifty-five`
- 學生提醒：`five` 和 `fifty-five` 都要說完整，最後一句往下降。
- 替代文字草案：`一個顯示特定時間的指針時鐘。`
- 審核狀態：`teacher_confirmed`

### HWG5-SR-002｜題型 1｜圖片 2

- 目標句：`It's three fifteen.`
- 等值縮寫：`It is three fifteen.` 可依既定縮寫等值規則評分。
- TTS 文字：`It's three fifteen.`
- 核心槽位：`hour=three`、`minute=fifteen`
- 完整度槽位：`it`、`is`、`three`、`fifteen`
- 發音難字：`three` /θriː/（舌尖輕放上下齒間）；`fifteen` /ˌfɪfˈtiːn/（重音在 `-teen`）。
- 重音／語調：`THREE｜fif-TEEN ↘`
- 語塊／連音：`It's‿three｜fifteen`
- 學生提醒：先把 `three` 的咬舌音說清楚，再重讀 `fifTEEN`。
- 替代文字草案：`一個顯示特定時間的指針時鐘。`
- 審核狀態：`teacher_confirmed`

### HWG5-SR-003｜題型 1｜圖片 3

- 目標句：`I'm writing.`
- 等值縮寫：`I am writing.` 可依既定縮寫等值規則評分。
- TTS 文字：`I'm writing.`
- 核心槽位：`person=I`、`action=writing`
- 完整度槽位：`I`、`am`、`writing`
- 發音難字：`I'm` /aɪm/（保留 /m/）；`writing` /ˈraɪtɪŋ/（美式 /t/ 可自然輕彈，尾音為 /ŋ/）。
- 重音／語調：`WRIT-ing ↘`
- 語塊／連音：`I'm‿WRIT-ing`
- 學生提醒：把 `I'm writing` 連順，`-ing` 尾音不要只說成 /n/。
- 替代文字草案：`一位學生坐在桌邊進行書寫活動。`
- 審核狀態：`teacher_confirmed`

### HWG5-SR-004｜題型 1｜圖片 4

- 目標句：`He's swimming.`
- 等值縮寫：`He is swimming.` 可依既定縮寫等值規則評分。
- TTS 文字：`He's swimming.`
- 核心槽位：`person=he`、`action=swimming`
- 完整度槽位：`he`、`is`、`swimming`
- 發音難字：`he's` /hiːz/（保留 /z/）；`swimming` /ˈswɪmɪŋ/（/sw/ 連起來，尾音為 /ŋ/）。
- 重音／語調：`SWIM-ming ↘`
- 語塊／連音：`He's‿SWIM-ming`
- 學生提醒：`He's` 不要漏掉 /z/，`swimming` 的尾音要收成 /ŋ/。
- 替代文字草案：`一位男孩在泳池中運動。`
- 審核狀態：`teacher_confirmed`

### HWG5-SR-005｜題型 1｜圖片 5

- 目標句：`She's in the kitchen.`
- 等值縮寫：`She is in the kitchen.` 可依既定縮寫等值規則評分。
- TTS 文字：`She's in the kitchen.`
- 核心槽位：`person=she`、`location=kitchen`
- 完整度槽位：`she`、`is`、`in`、`the`、`kitchen`
- 發音難字：`she's` /ʃiːz/；`kitchen` /ˈkɪtʃən/（/tʃ/ 清楚，共兩音節）。
- 重音／語調：`KITCH-en ↘`
- 語塊／連音：`She's‿in｜the KITCH-en`
- 學生提醒：把 `she's in` 連起來，`kitchen` 的 /tʃ/ 要清楚。
- 替代文字草案：`一位女孩在有爐台與流理台的室內空間。`
- 審核狀態：`teacher_confirmed`

### HWG5-SR-006｜題型 1｜圖片 6

- 目標句：`He's in the yard.`
- 等值縮寫：`He is in the yard.` 可依既定縮寫等值規則評分。
- TTS 文字：`He's in the yard.`
- 核心槽位：`person=he`、`location=yard`
- 完整度槽位：`he`、`is`、`in`、`the`、`yard`
- 發音難字：`he's` /hiːz/；`yard` /jɑrd/（保留美式 /r/）。
- 重音／語調：`YARD ↘`
- 語塊／連音：`He's‿in‿the YARD`
- 學生提醒：`He's in the` 順順連讀，最後把 `yard` 說清楚。
- 替代文字草案：`一位男孩站在有植物與戶外步道的庭院。`
- 審核狀態：`teacher_confirmed`

### HWG5-SR-007｜題型 1｜圖片 14

- 目標句：`The marker is in the bag.`
- TTS 文字：`The marker is in the bag.`
- 核心槽位：`object=marker`、`relation=in`、`reference=bag`
- 完整度槽位：`the`、`marker`、`is`、`in`、`the`、`bag`
- 發音難字：`marker` /ˈmɑrkər/（美式 /r/ 清楚）；`bag` /bæɡ/（/æ/ 與尾音 /g/）。
- 重音／語調：`MARKER｜BAG ↘`，`bag` 最明顯。
- 語塊／連音：`The MARKER‿is‿in｜the BAG`
- 學生提醒：`marker is in` 要連順，最後不要漏掉 `bag` 的 /g/。
- 替代文字草案：`一個透明袋子裡放著一件文具。`
- 圖片提醒：來源圖的 marker 太不醒目；重製圖必須讓 marker 清楚可辨。
- 審核狀態：`teacher_confirmed`

### HWG5-SR-008｜題型 1｜圖片 15

- 目標句：`The hat is by the table.`
- TTS 文字：`The hat is by the table.`
- 核心槽位：`object=hat`、`relation=by`、`reference=table`
- 完整度槽位：`the`、`hat`、`is`、`by`、`the`、`table`
- 發音難字：`hat` /hæt/；`by` /baɪ/；`table` /ˈteɪbəl/（兩音節）。
- 重音／語調：`HAT｜BY｜TABLE ↘`，`table` 最明顯。
- 語塊／連音：`The HAT‿is｜by the TA-ble`
- 學生提醒：位置是 `by`，不要漏掉；`table` 要說滿兩音節。
- 替代文字草案：`一頂小帽子放在一張矮桌旁邊。`
- 圖片提醒：重製圖只保留主要物件與清楚的位置關係，避免角色造型造成「帽子」辨識混淆。
- 審核狀態：`teacher_confirmed`

### HWG5-SR-009｜題型 2｜圖片 8

- 問句：`What time is it?`
- 滿分答句 A：`It's five forty-five.`
- 滿分答句 B：`It is five forty-five.`
- 答句鷹架：`It's ___ _____.`
- 問句 TTS：`What time is it?`
- 核心槽位：`hour=five`、`minute=forty-five`
- 完整度槽位：`it`、`is`、`five`、`forty-five`
- 發音難字：`forty` /ˈfɔrti/；`forty-five` /ˌfɔrti ˈfaɪv/（保留最後 /v/）。
- 重音／語調：`FIVE｜forty-FIVE ↘`
- 語塊／連音：`It's‿five｜forty-five`；完整式 `It‿is‿five｜forty-five`
- 學生提醒：先說 `five`，再清楚說 `forty-five`，兩個時間數字都不能漏。
- 替代文字草案：`一個顯示特定時間的指針時鐘。`
- 審核狀態：`teacher_confirmed`

### HWG5-SR-010｜題型 2｜圖片 9

- 問句：`What time is it?`
- 滿分答句 A：`It's eleven o'clock.`
- 建議滿分答句 B：`It is eleven o'clock.`
- 答句鷹架：`It's ___ _____.`
- 問句 TTS：`What time is it?`
- 核心槽位：`hour=eleven`、`zero-minute-marker=o'clock`
- 完整度槽位：`it`、`is`、`eleven`、`o'clock`
- 發音難字：`eleven` /ɪˈlɛvən/（重音在第二音節）；`o'clock` /əˈklɑk/（/kl/ 清楚）。
- 重音／語調：`e-LEV-en｜o-CLOCK ↘`
- 語塊／連音：`It's‿eleven‿o'clock`
- 學生提醒：不要只說 `eleven`；`o'clock` 也要完整說出來。
- 替代文字草案：`一個整點的指針時鐘。`
- 審核狀態：`teacher_confirmed`

### HWG5-SR-011｜題型 2｜圖片 10

- 問句：`What's he doing?`
- 滿分答句 A：`He's running.`
- 建議校正後滿分答句 B：`He is running.`
- 答句鷹架：`He's _____.`
- 問句 TTS：`What's he doing?`
- 核心槽位：`person=he`、`action=running`
- 完整度槽位：`he`、`is`、`running`
- 發音難字：`running` /ˈrʌnɪŋ/（母音 /ʌ/，尾音 /ŋ/）。
- 重音／語調：`RUN-ning ↘`
- 語塊／連音：`He's‿RUN-ning`；完整式 `He‿is‿running`
- 學生提醒：要說出 `He's`，並把 `running` 的 `-ing` 尾音收好。
- 替代文字草案：`一位男孩在戶外快速向前移動。`
- 待確認：教師原稿 `He is runnning.` 是否同意校正為 `He is running.`。
- 審核狀態：`teacher_confirmed`

### HWG5-SR-012｜題型 2｜圖片 11

- 問句：`What are you doing?`
- 滿分答句 A：`I'm drinking.`
- 滿分答句 B：`I am drinking.`
- 答句鷹架：`I'm _____.`
- 問句 TTS：`What are you doing?`
- 核心槽位：`person=I`、`action=drinking`
- 完整度槽位：`I`、`am`、`drinking`
- 發音難字：`drinking` /ˈdrɪŋkɪŋ/（/dr/、/ŋk/ 與尾音 /ŋ/）。
- 重音／語調：`DRINK-ing ↘`
- 語塊／連音：`I'm‿DRINK-ing`；完整式 `I‿am‿drinking`
- 學生提醒：`drinking` 中間有 /ŋk/，結尾還要再收成 /ŋ/。
- 替代文字草案：`一個角色在廚房桌邊，手上拿著杯子。`
- 審核狀態：`teacher_confirmed`

### HWG5-SR-013｜題型 2｜圖片 12

- 問句：`Where are you?`
- 滿分答句 A：`I'm in the dining room.`
- 滿分答句 B：`I am in the dining room.`
- 答句鷹架：`I'm in the _____.`
- 問句 TTS：`Where are you?`
- 核心槽位：`person=I`、`location=dining room`
- 完整度槽位：`I`、`am`、`in`、`the`、`dining`、`room`
- 發音難字：`dining` /ˈdaɪnɪŋ/（/aɪ/）；`room` /ruːm/；`dining room` 必須兩字都說。
- 重音／語調：`DIN-ing room ↘`
- 語塊／連音：`I'm‿in‿the｜DIN-ing room`
- 學生提醒：`dining` 要有 /aɪ/，`dining room` 兩個字都要說出來。
- 替代文字草案：`一個角色站在有餐桌與餐椅的室內空間。`
- 圖片提醒：來源圖含既有知名角色；公開圖必須改成原創人物與場景。
- 審核狀態：`teacher_confirmed`

### HWG5-SR-014｜題型 2｜圖片 13

- 問句：`Where is he?`
- 滿分答句 A：`He's in the living room.`
- 滿分答句 B：`He is in the living room.`
- 答句鷹架：`He's in the _____.`
- 問句 TTS：`Where is he?`
- 核心槽位：`person=he`、`location=living room`
- 完整度槽位：`he`、`is`、`in`、`the`、`living`、`room`
- 發音難字：`living` /ˈlɪvɪŋ/（短母音 /ɪ/，不要說成 `leaving`）；`room` /ruːm/。
- 重音／語調：`LIV-ing room ↘`
- 語塊／連音：`He's‿in‿the｜LIV-ing room`
- 學生提醒：`living` 是短短的 /ɪ/，不要漏掉後面的 `room`。
- 替代文字草案：`一位男孩在有沙發、茶几與燈具的室內空間。`
- 審核狀態：`teacher_confirmed`

### HWG5-SR-015｜題型 2｜圖片 16

- 問句：`Where's my ball?`
- 滿分答句 A：`It's under the table.`
- 滿分答句 B：`It is under the table.`
- 建議答句鷹架：`It's _____ the _____.`
- 問句 TTS：`Where's my ball?`
- 核心槽位：`relation=under`、`reference=table`
- 完整度槽位：`it`、`is`、`under`、`the`、`table`
- 發音難字：`under` /ˈʌndər/（重音在第一音節）；`table` /ˈteɪbəl/（兩音節）。
- 重音／語調：`UN-der｜TA-ble ↘`
- 語塊／連音：`It's‿under｜the TA-ble`；完整式 `It‿is‿under the table`
- 學生提醒：位置詞是 `under`，一定要說出來；`table` 要說滿兩音節。
- 替代文字草案：`一個房間裡有一張圓桌，桌子附近放著幾樣物品。`
- 圖片提醒：來源圖的球太小；重製圖必須讓球的位置清楚，但替代文字不直接說出答案。
- 待確認：是否採用建議鷹架 `It's _____ the _____.`。
- 審核狀態：`teacher_confirmed`

## 六、教師確認後的轉換門檻

教師確認本文件後，才進行下列工作：

1. 將 15 題轉成公開題庫與受保護後端題庫；公開資料不含可接受答案、核心槽位或評分分析。
2. 依來源語意重製 15 張原創教學圖片，逐張核對物件、位置、方向與替代文字。
3. 產生 8 段題型 1 目標句與 7 段題型 2 問句的靜態美式 TTS。
4. 實作四題時間限定正規化、縮寫等值與核心時間上限規則，加入單元、回合、評分與安全測試。
5. 在 1366×768、1920×1080 與 iPad Safari 1024×768 橫式完成本機驗證。
6. 題庫、圖片、TTS 與測試全部通過前，首頁的 HWG5 SR 持續顯示「題庫準備中」。

## 七、來源檔 SHA-256 基準

| 檔名 | Bytes | SHA-256 |
|---|---:|---|
| `01.gif` | 35,732 | `47ebc587a563e6ad8823580e2425df90a3540be0ed4b76a9f052883acbbf7393` |
| `02.gif` | 34,060 | `10428bc3b538f70c0a099e0f7f721d067aa4305e5401790fa80d4e77b6d2c663` |
| `03.png` | 8,096,780 | `f797392dbf2241727b51f7464a9fba70cf9ab3ac0ada189c989c7af78ff2a18d` |
| `04.png` | 9,256,414 | `612a9afeb4bd5a9c98de4d8b7e4775554bf5aa88554e48f334d24ba61e51eeca` |
| `05.png` | 2,455,334 | `154c246b8861e638853353d2ddbc4b08159662bbc26c31536e55c91ce89133cd` |
| `06.png` | 2,415,239 | `1098fdbdbca12e2c9dd723577f26163e5cda76e900e23b7bfa56988fa5492a56` |
| `08.gif` | 34,887 | `b69e14f52bb964be4ccb6144d8245af4e5ed290f1370d67d78c7e0356df2d738` |
| `09 eleven oclock.gif` | 26,873 | `479ca83cc0a2c66591c193218372dbf49f268510ca83aa3287afa02108289c13` |
| `10.png` | 8,801,818 | `31b5d51bc40ed58f537279b394924ddf068da87ff629e98ceba2c2beea29db97` |
| `11.png` | 7,645,923 | `4a752bb3cc6d511c116a414a067f90431710efd259d484bf1bbed50762628d48` |
| `12.png` | 2,125,534 | `3253d8b26055ab16fbb2195c5d4d49398a1455160ad63b781223e6b13f6e059c` |
| `13.png` | 2,227,007 | `17be900f16a4c002956a22cacaa426f1ff9e3ebf87d3441db373d926f0301685` |
| `14.png` | 1,872,697 | `09303868c71d6723e9fac358f1f9cadb3b15f9543aa0945b3adaab7974eadc23` |
| `15.png` | 1,878,010 | `0d74a8801ce25e4b0cf8dbc4e6c4b76bcdcde1a07a65ee55d68801cd120e01c2` |
| `16.png` | 1,936,425 | `691ca8347c8d565fb8278c511a5f931183f0533a38f134dc652aacab4d349156` |

盤點結果：15/15 題有對應來源檔；來源檔未修改。
