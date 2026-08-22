# HWG7 Sentence Review 題庫驗證報告 v2

- 驗證日期：2026-08-22
- 題庫版本：`hwg7-sr-v2-answer-only`
- 單元：`hwg7-sr`／`HWG7 SR`
- 評分版本：`a1-v2-answer-only`
- 驗證結果：**PASS（本機、Firebase Emulator 與正式線上）**
- 部署狀態：**已部署至 `setencerevieworalpractice`；2026-08-22 22:08（Asia/Taipei）查驗完成**

## 已確認內容

- 第 5 題固定為 `They’re his caps.`；轉錄成 `They are his caps.` 視為等值。
- 第 13 題固定為 `She would like some salad.`。
- 題型二只錄、只評答句，不把問句列入逐字稿或分數。
- 已列出的短答與完整答都是獨立滿分答案；`doesn’t`／`does not`、`I’d`／`I would`、`It’s`／`It is` 等依目標句做等值正規化。
- 第 6 題鷹架：`___ her _____.`；第 8、10 題：`His ______ _____.`。
- 除問句外的目標句與答案均保留發音難字、句子重音與語調分析，供單一改善建議使用。
- 所有英文介面使用自架 Comic Relief；7 題朗讀題使用 OpenAI `gpt-4o-mini-tts`、`marin`、原生 `speed: 0.8` 的靜態 MP3。

## 固定評分公式

兩種題型都使用：

`總分 = 準確度 × 50% + 完整度 × 30% + 流暢度 × 20%`

- 字詞對齊符號：`C` 正確、`S` 替代、`D` 刪漏、`E` 多餘字、`N` 目標字數。
- 朗讀準確度：`round(100 × C ÷ (C + S + E))`。
- 朗讀完整度：`round(100 × (C + S) ÷ N)`。
- 問答題只針對答句，在所有可接受答案中選擇最佳版本。非完全正確時：`答句準確度 = 核心內容正確度 × 70% + 句型正確度 × 30%`；答句完整度依已嘗試的核心／句型槽位權重計算。
- 任何列為滿分的短答或完整答完全命中時，準確度與完整度都是 100；必要核心答案錯誤或缺漏時，總分上限為 59。
- 流暢度依錄音時長、停頓與立即重複等固定規則計算；合理 A1 口音、自然弱化與教學用語調提示不會單獨造成未達標。
- `score >= 80` 即達標；每題最多 3 次有效嘗試。三次仍未達標時顯示正確示範、記錄 `not_met`，仍可發射彈珠。
- 系統或錄音服務失敗不消耗有效嘗試。

## 機器驗證結果

| 檢查項目 | 結果 |
|---|---:|
| 題庫／有效題目 | 13／13 |
| 題型一／題型二 | 7／6 |
| 題型二滿分答案版本 | 10 |
| 每局題數／每位玩家回合 | 12／6 |
| 固定六回合輪替抽樣 | 250／250 PASS |
| 圖片／缺圖／無效檔頭 | 13／0／0 |
| 圖片總位元組 | 13,064,161 |
| 網站測試 | 35／35 PASS |
| Functions 測試 | 49／49 PASS |
| 逐題版面 | 26／26 PASS；另 1 張缺圖 fallback PASS |
| TTS MP3 | 7／7；HTTP 200、`audio/mpeg`、長度相符 |
| Comic Relief | Regular／Bold 皆 HTTP 200、`font/ttf` |
| 教師錄音 Emulator | 匿名 401；登入 200；`audio/webm`；位元組完全相同 |
| 正式線上 QA | 14／14 PASS；首題開局 200、放棄 200、瀏覽器錯誤 0 |
| 正式部署檔案 | 11／11 與本機 SHA-256 完全一致 |
| 正式 Functions | 8／8 ACTIVE；Node.js 22；`asia-east1` |
| Firestore／Storage 匿名存取 | 403／403 |
| warnings／errors | 0／0 |

## 檔案與 SHA-256

| 檔案 | 位元組 | SHA-256 |
|---|---:|---|
| `data/hwg7-sentence-review.json` | 43,374 | `83c96a02a45b45517921ab893ef4cf12bc25cf79a3e92d813662dd715fe060aa` |
| `data/hwg7-sentence-review.js` | 34,426 | `dec3e470c7e5644229a5dd4e96049450c552eeeb2ccaa087e42355a0bd5091f9` |
| `functions/data/question-bank.json` | 40,365 | `9324cecf8439309577386a76b70518ef956b4ad54f50ea404c0eb1eb351e53be` |
| `audio/hwg7-sr/manifest.json` | 2,459 | `900c867d425e82f36399a1724719b29866c0a98f80444a7f20600a38293dcffc` |
| `fonts/comic-relief/ComicRelief-Regular.ttf` | 78,272 | `64293c3487e414bfac52cb5b2f64d14266dd96e605a032c6b7d42d9140850f6e` |
| `fonts/comic-relief/ComicRelief-Bold.ttf` | 92,512 | `f503ab3ec87bea8ddf232d8d64341b6cf2b97a2e1849eb007b8d48761c5db918` |

## 驗證範圍限制

iPad Safari 使用 1024×768 橫式、觸控與 Safari User-Agent 的 Chromium 隔離模擬，不等同實體 Safari WebKit。正式 Firebase 已完成機器驗證；實體 iPad 的麥克風、AI 語音與教師登入後錄音播放仍需由教師真機抽查。
