# HWG7 Sentence review 題庫驗證報告

- 驗證日期：2026-08-21
- 題庫版本：`hwg7-sr-v1-draft`
- 評分版本：`a1-v1`
- 驗證結果：**PASS（結構與現有媒體通過；仍保留4類教師複核項目）**

## 執行方式

```powershell
node scripts/validate-question-bank.mjs --sync-js
node scripts/validate-question-bank.mjs
node --check data/hwg7-sentence-review.js
```

## 機器驗證結果

| 檢查項目 | 結果 |
|---|---:|
| 題庫總數 | 13 |
| 有效題目 | 13 |
| 題型1 `read_aloud` | 7 |
| 題型2 `question_answer` | 6 |
| 題型1／2依順序交替 | 通過 |
| 題型2滿分答案版本 | 10 |
| 所列短答／完整答皆 `fullCredit: true` | 通過 |
| 第13題精確為 `She would like some salad.` | 通過 |
| 重複ID | 0 |
| 每局題數 | 12 |
| 每位玩家回合 | 6 |
| `T = 2R` 且 `T <= N` | 通過 |
| 同局不重複抽題模擬 | 250／250局通過 |
| 達標分數 | `score >= 80` |
| 每題有效嘗試上限 | 3 |
| 三次未達標後顯示示範、記錄未達標並允許發射 | 通過 |
| 系統失敗不消耗有效次數 | 通過 |
| 口說互動狀態契約 | 通過 |
| 部署圖片 | 13 |
| 缺少圖片 | 0 |
| 0-byte圖片 | 0 |
| 無效PNG／JPEG檔頭 | 0 |
| 圖片總位元組 | 13,064,161 |
| JSON／瀏覽器JS同步 | 通過 |
| 瀏覽器JS語法 | 通過 |
| 驗證錯誤 | 0 |

## 待教師複核（未猜測）

1. `HWG7-SR-005` 的 `They’re his caps.` 中，所有格人物是否確實為 `his`。
2. 13題所屬冊次、單元或分類；目前所有 `unit` 都是 `null`／`pending`。
3. 13張圖片的正式替代文字；目前所有 `image.alt` 都是 `null`／`pending`。
4. 發音目標、難字、重音、分組及連讀是否符合教師課堂教法；目前分析均標為 `pending`。

## 檔案與SHA-256

| 檔案 | 位元組 | SHA-256 |
|---|---:|---|
| `data/hwg7-sentence-review.json` | 27,602 | `F2376839A443420CB1B7C194B68BC0B2541EB1431BC9DAD1F3A0A42AE11A4313` |
| `data/hwg7-sentence-review.js` | 25,887 | `DE8D3D124CB6F6F6D107E5C052E07A126815C21DB9F5FC24062D964146B76FF0` |
| `scripts/validate-question-bank.mjs` | 19,667 | `F994CC172192D49C2FC09737D5A2C594F616D4FA1857F07D6B9E5FCBD14D5906` |

## 本報告未涵蓋

- 尚未在本子任務中修改或驗證 `index.html`、Cloud Functions、Firebase、完整學生作答流程或iPad版面。
- 題庫的結構、媒體存在性與檔頭已驗證；瀏覽器實際圖片顯示與口說端到端評分由網站整合驗收另行確認。
