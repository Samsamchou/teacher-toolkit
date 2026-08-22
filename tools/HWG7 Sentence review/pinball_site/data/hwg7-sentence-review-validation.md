# HWG7 Sentence Review 題庫驗證報告

- 驗證日期：2026-08-22
- 題庫版本：`hwg7-sr-v1-confirmed`
- 單元：`hwg7-sr`／`HWG7 SR`
- 評分版本：`a1-v1`
- 驗證結果：**PASS（教師內容確認與技術驗證均通過）**

## 已確認內容

- 第 5 題保留精確句子：`They’re his caps.`
- 第 13 題保留精確句子：`She would like some salad.`
- 13 張圖片皆有中性繁體中文替代文字。
- 除問句外，共 17 個朗讀句／可接受答案版本皆含發音難字與語調分析。
- `caps /ps/`、`noodles /z/`、`would /d/` 的提醒已納入。
- 降調只作教學建議；合理 A1 口音、自然弱化與思考停頓不會自動判定未達標。
- 所列短答與完整答皆為各自獨立的滿分答案。

## 機器驗證結果

| 檢查項目 | 結果 |
|---|---:|
| 題庫總數 | 13 |
| 有效題目 | 13 |
| 題型 1 `read_aloud` | 7 |
| 題型 2 `question_answer` | 6 |
| 題型 2 滿分答案版本 | 10 |
| 每局題數 | 12 |
| 每位玩家回合 | 6 |
| 同局不重複題目 | 通過 |
| A 題型 1／B 題型 2 起始模擬 | 通過 |
| A 題型 2／B 題型 1 起始模擬 | 通過 |
| 抽題與嚴格交替模擬 | 500／500 局通過 |
| 達標公式 | `score >= 80` |
| 每題有效嘗試上限 | 3 |
| 三次未達標後顯示示範、記錄未達標並允許發射 | 通過 |
| 系統失敗不消耗有效次數 | 通過 |
| 重複 ID | 0 |
| 圖片 | 13 |
| 缺圖／無效檔頭 | 0／0 |
| 圖片總位元組 | 13,064,161 |
| JSON／瀏覽器 JS 同步 | 通過 |
| 待複核欄位 | 0 |
| warnings／errors | 0／0 |

## 評分公式參考

題型 1：

- `accuracy = 100 × C / (C + S + E)`
- `completeness = 100 × (C + S) / N`
- `score = 0.40 × accuracy + 0.35 × completeness + 0.25 × fluency`

題型 2 依 `a1-v1` 固定規則分開計算答案內容、完整度與流暢度；若核心答案錯誤或缺漏，分數上限為 59。所有結果都由程式固定公式計算，OpenAI 只負責轉錄與質性回饋，不自由決定分數。

學生回饋固定使用簡短、鼓勵式繁體中文，且只給一項可執行的改進提醒；發音與語調分析會優先用於該提醒。

## 檔案與 SHA-256

| 檔案 | 位元組 | SHA-256 |
|---|---:|---|
| `data/hwg7-sentence-review.json` | 39,790 | `7467599206EAA55F41E38F82BF0A443BC8A2A8E893B1799EE8D33313B8EA2B12` |
| `data/hwg7-sentence-review.js` | 32,687 | `CB625CFCD00A22A528871335D82BAF8D0F4564BC74BEBFA923D7B51DBE0590B4` |
| `scripts/validate-question-bank.mjs` | 21,307 | `F66632A6C9082D02366FF4DDEC832CA2BC95271126887C3FC5519CEF9D96E5D6` |

## 驗證方式

```powershell
npm run validate
npm test
npm --prefix functions test
```

正式 OpenAI 語音、實體 iPad／Chrome 麥克風與正式 Firebase 流程仍屬部署前／部署後驗收，不在本報告的離線 PASS 範圍內。