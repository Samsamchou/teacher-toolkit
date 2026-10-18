# HWG5 U01+U02 情境任務｜故事與題目配置 v0.4

> 狀態：v0.4，題目順序、場景、干擾選項與遊戲節奏（每 3 題一戰，共 11 場）已確認｜日期：2026-10-17
> 候選 Firebase 專案：`g6-english-online-learning`（只登錄，未 login、未綁定、未部署；部署需另行授權）
> 題庫來源：`HWG5 U01 + U02 題目與答案表.docx`（拼字 11 題＋拖放 21 題＝32 題）
> 範圍：獨立網站＋本機版；不碰 Lesson Hub 正式站；原 `tools/escape room/`（HWG7）保留不動。

## 0. 已確認的規則

| 項目 | 決定 |
|---|---|
| 題型 | 只用兩種題型：**拼字**（Lesson Hub `SpellQuestion`：字母卡加干擾字母、依單字分組、保留大小寫）、**拖放**（Lesson Hub 拖放填空：拖曳或點選答案再點空格、點已填格可清除） |
| 拖放答案 | 題庫裡的黑色粗體字就是空格；每題至少 2 個干擾選項 |
| 提示 | 作答時**沒有中文**，只有插圖提示。教師核准的兩個例外：拼星期題亮起格顯示中文星期；國語科圖示改為封面寫「國語」的課本（ICON-04、Q15、Q16，Q30 重用 Q16） |
| 字型 | 全站文字一律使用 Comic Relief（中文字元缺字時由系統退回） |
| 主角 | 一位固定主角，同時是 Godot 遊戲裡的操作角色 |
| 遊戲節奏 | 每答 3 題進入一次 Godot 戰鬥，32 題共 11 場（最後一組 2 題）；第 10、11 場是 Boss 戰（兩階段） |
| 圖片 | 我寫 Markdown 清單交給 Codex 生成，存入固定資料夾 |
| 圖片參考 | `grammarinfographic-backup/.../20260807 HWG5 U01…`、`20260809 HWG5 U02…`：日式動漫風、用圖示當語意線索（科目道具、星期卡、紅色禁止圈表示 No） |

## 1. 故事｜Ken and the Frozen Clock Tower（暫定名）

**對象**：國小五、六年級。故事旁白只用英文，A1 程度短句（每句 4–10 字），並搭配插圖。

**旁白難字表**：旁白句子裡的難字，在句子下方附英中對照，例如 `class schedule｜課表`。
- 中文只出現在故事旁白的難字表裡；作答畫面一律無中文。
- 難字表不得出現當題或後續拼字題的答案字（例如 Tuesday、music），避免提前洩題。

**故事核心**：
星期一早上 9:50，Sunny Hill 小學的魔法鐘塔突然停住。貪吃的時間怪獸 **Time Muncher** 把一週的「星期齒輪」和課表上的科目都吞掉了。
魔法課表（Magic Timetable）變成一片空白，整週的日子也被打亂。五年級的 **Ken** 和鐘塔精靈 **Tick** 一起穿過「星期之門」，一天一天把課表修好，最後進入鐘塔核心打倒 Time Muncher，讓時間重新開始轉動。

**角色（固定 5 位）**
- **Ken**：主角，五年級男生，題目裡的「I／you」；也是遊戲角色。（已確認）
- **Tick**：小時鐘精靈，吉祥物兼提示角色，只出現在插圖與故事旁白。（已確認保留）
- **Jenny**：同班女生，題目裡的「she／Jenny」。
- **Tom**：同班男生，題目裡的「he／Tom」。
- **Jack**：同班男生，題目裡的「Jack」。
- **Boss**：Time Muncher，吞掉時間的齒輪怪獸。

**同一份課表，故事前後一致**（全班同一張課表，可由題庫推出）

| 星期 | 有 | 沒有 |
|---|---|---|
| Mon | art（D10、D18） | — |
| Tue | music（D14）、PE（D20） | — |
| Wed | math（D13） | — |
| Thu | English（D12）、science（D16） | Chinese（D11、D19） |
| Fri | — | PE（D15）、social studies（D17）、music（D21） |

**故事狀態改變**：每答對一題，魔法課表就點亮一格，或嵌回一個星期齒輪；每兩題的獎勵會帶進下一場戰鬥。

## 2. 32 題配置

- 排序原則：同一個字要先拼出來，之後才會在拖放題的字卡裡出現，避免拖放字卡先洩漏拼字答案。
- 干擾選項只用已出現過、或不是拼字題的字。
- 「完整答句」題（D08、D09、D18–D21）放在終章「記憶之鏡」：Boss 把一週的場景倒帶重播，Ken 要說出完整答句。這樣也順便處理題庫裡重複的句子。
- 符號：S 是拼字題，D 是拖放題（編號同題庫）；〔 〕是空格。
- **星期條（教師確認）**：網站在題目插圖上方顯示 7 格星期條，一律用縮寫，順序固定由 Sun. 開頭到 Sat.（`Sun. Mon. Tue. Wed. Thu. Fri. Sat.`），以 Comic Relief 呈現，亮出當天那一格；插圖本身不畫月曆或星期文字。
  - **拼字題例外（教師確認）**：拼星期的 5 題（S1–S5）中，亮起的那一格不顯示縮寫，改顯示中文（星期二、星期三、星期四、星期五、星期六）；其他 6 格照常顯示縮寫。這是「作答畫面無中文」規則唯一的例外。

| # | 章節／場景 | 題 | 題目（〔 〕＝空格） | 干擾選項 | 插圖線索 |
|---|---|---|---|---|---|
| 1 | 序章：鐘塔停住 | D02 | What 〔time〕 is it? It's 〔9:50〕. | day、9:15、5:50 | 鐘塔時鐘停在 9:50 |
| 2 | 序章 | D04 | What day 〔is〕 it? It's 〔Monday〕. | do、are、Sunday | 星期條 Mon.發亮、書包上學的早晨 |
| 3 | 星期一：美術教室 | D05 | Is it 〔Monday〕 today? Yes, it 〔is〕. | Sunday、isn't、does | 第一格發亮 |
| ⚔ | **戰鬥 1｜鐘塔廣場** | | 獎勵：Monday Gear（星期一齒輪） | | |
| 4 | 星期一 | D10 | Do you have 〔art〕 class on Monday? Yes, I 〔do〕. | PE、does、don't | Jenny 問 Ken；畫架、調色盤 |
| 5 | 星期二：音樂廳 | S2 | 拼 **Tuesday** | 加 2–3 個干擾字母 | 星期條 Tue.發亮 |
| 6 | 星期二 | D06 | Is it Monday today? No, it 〔isn't〕. It's 〔Tuesday〕. | is、doesn't、Sunday | Tick 以為是週一，月曆亮Tue. |
| ⚔ | **戰鬥 2｜美術教室** | | 獎勵：Paint Splash（顏料爆炸）＋Tuesday Gear | | |
| 7 | 星期二 | S11 | 拼 **music** | 干擾字母 | 鋼琴、音符、直笛 |
| 8 | 星期二 | D14 | Do you have 〔music〕 class on Tuesday? Yes, I 〔do〕. | art、does、is | 課表週二格出現音樂符號 |
| 9 | 星期三：數學實驗室 | S3 | 拼 **Wednesday** | 干擾字母 | 星期條 Wed.發亮 |
| ⚔ | **戰鬥 3｜音樂廳** | | 獎勵：Music Note Shield（音符護盾） | | |
| 10 | 星期三 | D01 | What 〔day〕 is today? It's 〔Wednesday〕. | time、Monday、Tuesday | 星期條 Wed. |
| 11 | 星期三 | S9 | 拼 **math** | 干擾字母 | 算盤、尺、幾何積木 |
| 12 | 星期三 | D13 | 〔Does〕 Jack have 〔math〕 class on Wednesday? Yes, he does. | Do、Is、music | Jack 在算盤前 |
| ⚔ | **戰鬥 4｜數學實驗室** | | 獎勵：Wednesday Gear＋Ruler Boomerang（尺迴力鏢） | | |
| 13 | 星期四：語言與科學走廊 | S1 | 拼 **Thursday** | 干擾字母 | 星期條 Thu. |
| 14 | 星期四 | D03 | What day is 〔today〕? It's 〔Thursday〕. | it、Tuesday、Wednesday | 星期條 Thu. |
| 15 | 星期四 | S6 | 拼 **Chinese** | 干擾字母 | 毛筆、硯台、書法卷軸 |
| ⚔ | **戰鬥 5｜星期四走廊** | | 獎勵：Thursday Gear | | |
| 16 | 星期四 | D11 | 〔Do〕 you have 〔Chinese〕 class on Thursday? No, I don't. | Does、Is、math | 週四課表上的書法圖示被紅圈劃掉 |
| 17 | 星期四 | S7 | 拼 **English** | 干擾字母 | 對話泡泡、耳機、英文書 |
| 18 | 星期四 | D12 | Does he have 〔English〕 class on Thursday? Yes, he 〔does〕. | Chinese、do、is | Ken 指著 Tom |
| ⚔ | **戰鬥 6｜語言教室** | | 獎勵：Textbook Guard（課本護盾）＋Word Bubble（追蹤字母泡泡） | | |
| 19 | 星期四 | S8 | 拼 **science** | 干擾字母 | 顯微鏡、試管、護目鏡 |
| 20 | 星期四 | D16 | 〔Does〕 Jenny have 〔science〕 class on Thursday? Yes, she does. | Do、Is、English | Jenny 在做實驗 |
| 21 | 星期五：體育館與地圖室 | S4 | 拼 **Friday** | 干擾字母 | 星期條 Fri. |
| ⚔ | **戰鬥 7｜科學實驗室** | | 獎勵：Science Potion（回復藥水） | | |
| 22 | 星期五 | D15 | Does she have 〔PE〕 class on Friday? No, she 〔doesn't〕. | art、don't、isn't | Jenny；球、跳繩被紅圈劃掉 |
| 23 | 星期五 | S10 | 拼 **social studies** | 干擾字母 | 地球儀、地圖、指南針 |
| 24 | 星期五 | D17 | Do we have 〔social studies〕 class on Friday? No, we 〔don't〕. | science、doesn't、aren't | 全班看課表，地球儀圖示被劃掉 |
| ⚔ | **戰鬥 8｜體育館與地圖室** | | 獎勵：Friday Gear＋Speed Sneakers（加速鞋）＋Globe Compass（標出安全區） | | |
| 25 | 週末：鐘塔屋頂 | D07 | 〔Is〕 it Sunday today? No, it 〔isn't〕. | Do、Does、don't | 星期條 Sat.亮、Sun.暗 |
| 26 | 週末 | S5 | 拼 **Saturday** | 干擾字母 | 星期條 Sat.；週末的公園 |
| 27 | 屋頂：第一面記憶之鏡 | D08 | Is it Monday today? 〔Yes, it is.〕 | No, it isn't.／Yes, it does.／Yes, I do. | 鏡中重播週一場景 |
| ⚔ | **戰鬥 9｜鐘塔屋頂** | | 獎勵：Weekend Gears（週六＋週日齒輪，七個齒輪全滿） | | |
| 28 | 終章：鐘塔核心 | D09 | Is it Monday today? 〔No, it isn't. It's Tuesday.〕 | Yes, it is.／No, it isn't. It's Thursday.／No, I don't. It's Tuesday. | 鏡中重播週二場景 |
| 29 | 終章 | D18 | Do you have art class on Monday? 〔Yes, I do.〕 | Yes, he does.／No, I don't.／Yes, it is. | 鏡中重播美術課 |
| 30 | 終章 | D19 | Do you have Chinese class on Thursday? 〔No, I don't.〕 | Yes, I do.／No, she doesn't.／No, it isn't. | 鏡中：書法被劃掉 |
| ⚔ | **戰鬥 10｜Boss 戰第一階段：Time Muncher** | | 獎勵：Mirror Shard（打破 Boss 護盾，Boss 進入第二階段） | | |
| 31 | 終章 | D20 | Does Tom have PE class on Tuesday? 〔Yes, he does.〕 | Yes, I do.／No, he doesn't.／Yes, she does. | 鏡中：Tom 週二上體育 |
| 32 | 終章 | D21 | Does Jenny have music class on Friday? 〔No, she doesn't.〕 | No, he doesn't.／Yes, she does.／No, I don't. | 鏡中：週五音樂被劃掉 |
| ⚔ | **戰鬥 11｜Boss 戰第二階段：Time Muncher** | | 七個星期齒輪＋Mirror Shard 讓鐘塔重新轉動 | | |

完整答句題用「整句答案卡」（已確認）：一個空格，配 3 個干擾答句卡，形式和截圖裡 `by bike` 這類片語卡一樣。

## 3. Godot 遊戲設計（沿用 Lesson Hub Forest of Words v07 引擎）

- **來源**：`English Lesson Hub HWG/godot/forest-of-words-six-heroes-20261016/`（`roles.gd`、`stages.gd`、`forest_trial.gd`），用 `godot-games` skill 製作。
- **主角**：三英雄改成**單一主角 Ken**。生命值與技能另行平衡；技能是「Tick-Tock Burst（時鐘衝擊）」，冷卻 14 秒。
- **道具**：11 場獎勵就是第 2 節表格裡的道具，全部對應剛完成的故事與題目。
  - 科目道具：Paint Splash、Music Note Shield、Ruler Boomerang、Textbook Guard、Word Bubble、Science Potion、Speed Sneakers、Globe Compass。
  - 星期齒輪：7 個，在 Boss 戰中用來破盾。
  - **Textbook Guard（課本護盾，教師確認取代墨筆波）**：一本與 ICON-04 相同的國語課本繞著 Ken 旋轉、擋下碰到的子彈。和 Music Note Shield（全身泡泡護盾、限時無敵）效果不同。
- **場景機關**（逐關增加）：
  - 鐘塔廣場：時針掃過地面。
  - 美術教室：顏料水窪會減速。
  - 音樂廳：聲波環。
  - 數學實驗室：數字方塊落下。
  - 星期四走廊：時鐘指針迷宮。
  - 語言教室：墨水雨＋字母旋風。
  - 科學實驗室：冒泡藥水池。
  - 體育館／地圖室：彈跳球＋迷霧區。
  - 屋頂：強風。
  - 鐘塔核心：第 10 場是 Boss 第一階段（有護盾），第 11 場是 Boss 第二階段（破盾後覺醒、彈幕加快）。
- **時間**：第 1–9 場每場約 20–30 秒，逐漸加長；第 10、11 場 Boss 戰各 67 秒（2026-10-18 教師要求由 60 秒延長）。
- **計分**：沿用 Lesson Hub 規則。
  - 學習分數和遊戲戰果分開。
  - 首次全對的提交次數決定道具品質 4／3／2／1。
  - 拼字可以無限重試。
  - 可以略過戰鬥繼續答題。
- **保存**：本機版用 localStorage 續玩；不接 Firebase、不接正式學生資料。

### 3.1 自動存檔與續玩（教師已確認）

- **續玩按鈕只在首頁**：輸入學號後，若有未完成紀錄，顯示「繼續上次的任務」與「重新開始」兩個按鈕；「繼續」回到最後一個未完成的題目或戰鬥。
- **其他頁面不放續玩按鈕**：故事、題目、結果頁角落只顯示不能按的「✓ Saved」狀態標示；另有「回首頁」按鈕，離開不會遺失進度。
- **存檔時機**：每次提交答案、每場戰鬥結束時自動存檔。
- **戰鬥中不存**：中途離開或重新整理時，回到該場戰鬥開頭重打；學習分數已保存，不受影響。第 10 場 Boss 戰結束（取得 Mirror Shard）就存檔，第 11 場離開只重打第 11 場。

| 情況 | 結果 |
|---|---|
| 題目做到一半離開 | 回到該題，已提交答案保留 |
| 重新整理、旋轉 iPad | 回到同一畫面 |
| 戰鬥中離開 | 該場戰鬥從頭開始 |
| 換一台 iPad | 本機版不支援；接 Firebase 後才能跨裝置續玩 |

### 3.2 旁白英語朗讀（教師確認）

- **規格**：沿用 HWG5／HWG7 Sentence review 的做法。
  - OpenAI `gpt-4o-mini-tts`，美式英語，聲音 `marin`，API `speed 0.8`。
  - 事先產生靜態 MP3，網頁播放速度維持 1.0，避免二次降速。
  - 金鑰只在本機環境變數，不進瀏覽器、不進 repo。
  - 產生程式：`content/generate_narration_tts.mjs`；音檔位置：`assets/audio/narration/SEG-01–09.mp3`，附 SHA-256 manifest。
- **一定要聽完才能繼續**：每段旁白下方有「▶ Listen」按鈕。音檔**播放到結束**後，「Next」按鈕才會解鎖；可以重播。
- **讀過就不用再聽**：已聽完的段落，續玩或回看時直接解鎖。
- **音檔載入失敗**：顯示英文提示並提供重試。重試 2 次仍失敗才解鎖 Next，避免學生卡住，並記錄在本機紀錄裡。
- **揭露**：頁面底部顯示「English audio is AI-generated, not a human recording.」
- 只朗讀旁白句子，不朗讀難字表；題目、選項的朗讀不在這次範圍。

## 4. 教師決定紀錄

| # | 問題 | 決定 |
|---|---|---|
| 1 | 主角 | Ken，男生；保留 Tick |
| 2 | 旁白語言 | 只用英文；難字在句子下方附英中對照；作答畫面無中文 |
| 3 | 完整答句題 | 整句答案卡 |
| 4 | 順序、場景、干擾選項 | 照第 2 節確認 |
| 5 | 遊戲長度 | 每 3 題一戰，共 11 場 |

## 5. 完成時間估算

| 部分 | 估算 |
|---|---|
| 32 題作答（拼字約 40 秒、拖放約 60 秒，含重試與答對解析） | 約 25–28 分 |
| 故事旁白與插圖 | 約 5 分 |
| 11 場戰鬥（9 場 20→30 秒＋2 場 Boss 各 67 秒，含進出遊戲畫面） | 約 6–7 分 |
| **合計** | **約 36–40 分** |

一節課內完成會偏緊，所以保留自動存檔續玩：沒做完的學生下次從最後一題接續。

確認後的下一步：
1. 寫 Codex 圖片生成清單 `IMAGEGEN-清單.md`，指定輸出資料夾 `assets/imagegen/`。
2. 建立網站與題庫 JSON。
3. 改寫 Godot 關卡。
