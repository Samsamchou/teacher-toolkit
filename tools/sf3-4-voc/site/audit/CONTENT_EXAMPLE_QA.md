# SF3–SF4 單字例句 QA

檢查日期：2026-08-09
依據：`config/site-source.json`（本網站唯一內容來源）

## 結論

- 共 2 冊、8 課、63 個單字。
- 除 SF3 Lesson 1 的指定句型外，各課沒有重複的完整問句，也沒有重複的完整答句。
- 適合 Yes/No 問答的課別採接近各半配置；單數筆數無法完全對半時，以 4/3 或 4/5 分配。
- Where、What、What time 等非 Yes/No 句型不強行加入否定答句，改以人物、物品、地點與時間變化避免單調。

## 各課統計

| 課別 | 單字數 | 否定答句 | 其他／肯定答句 | 重複完整問句 | 重複完整答句 |
|---|---:|---:|---:|---|---|
| SF3 Lesson 1 | 7 | 0 | 7 | `Who's he?`、`Who's she?`（指定例外） | 無 |
| SF3 Lesson 2 | 7 | 4 | 3 | 無 | 無 |
| SF3 Lesson 3 | 8 | 0 | 8 | 無 | 無 |
| SF3 Lesson 4 | 7 | 4 | 3 | 無 | 無 |
| SF4 Lesson 1 | 7 | 0 | 7 | 無 | 無 |
| SF4 Lesson 2 | 8 | 0 | 8 | 無 | 無 |
| SF4 Lesson 3 | 10 | 0 | 10 | 無 | 無 |
| SF4 Lesson 4 | 9 | 4 | 5 | 無 | 無 |

## 指定內容核對

### SF3 Lesson 1

- 依使用者指定的唯一例外：男性人物只問 `Who's he?`，女性人物只問 `Who's she?`。
- 括號中的別稱不另列單字，例如 `father (dad)` 只建立 `father`。

### SF3 Lesson 2

- 已加入 `driver 司機`。
- 4 句否定答句分別用於 student、doctor、nurse、driver。
- 例：`Is she a driver?` → `No, she isn't. She's a nurse.`

### SF3 Lesson 3

- 已加入 `yard 庭院`、`study 書房`。
- 問句人物分散使用 Dad、Mom、Grandpa、Wendy、Ken、you、teacher、student。
- 例：`Where's Grandpa?` → `He's in the kitchen.`

### SF3 Lesson 4

- 已加入 `frog 青蛙`。
- 4 句否定答句分別用於 rabbit、cat、dog、fish。
- 例：`Do you have a rabbit?` → `No, I don't. I have a turtle.`

### SF4 Lesson 2

- 已加入 `table 桌子`、`bag 袋子`。
- 問句交替使用 ball、yo-yo、robot、kite、doll，以及複數物品；8 個答句均不重複。
- 例：`Where's the robot?` → `It's under the chair.`

### SF4 Lesson 3

- 已加入 `forty-five 45`、`fifty 50`。
- 10 個答句使用不同時間，包含 `It's three twenty.`、`It's six forty.`、`It's nine forty-five.`、`It's five fifty.`。
- 所有完整問句與完整答句皆不重複。

### SF4 Lesson 4

- 已加入 `rice 米飯`、`tea 茶`。
- 9 個單字採 4 句否定、5 句肯定，為奇數筆數最接近半數的配置。
- 指定否定句已納入：
  - `Do you like tea?` → `No, I don't. I like water.`
  - `Do you like rice?` → `No, I don't. I like pizza.`
  - `Do you like cake?` → `No, I don't. I like ice cream.`
- 第 4 句否定句：`Do you like juice?` → `No, I don't. I like tea.`

## 自動化檢查依據

- 設定驗證：63 個單字、63 張圖片、51 個 MP3 均通過。
- 專案驗證：2 冊、8 課、63 個單字、12 個 TTS 備援，錯誤數 0。
- 本機瀏覽器測試：25 通過、20 依裝置／專案設計略過、0 失敗。
- 觸控與麥克風項目為瀏覽器模擬測試；正式上線後仍需在實體手機／平板做最終抽查。
