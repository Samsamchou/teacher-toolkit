# HWG5 SR 本機建置與驗證摘要

日期：2026-08-24

## 結論

HWG5 SR 的 15 題題庫、公開／私有資料分離、15 張原創題圖、雙單元前端、時間轉錄正規化與後端評分均已完成本機實作與自動驗證。單元仍保持 `preparing`，尚未呼叫正式 OpenAI TTS，也尚未部署 Firebase。

目前剩餘 blocker：

1. `teacher_image_review_pending`
2. `static_tts_not_generated`

## 題庫

- 15 題：8 題 `read_aloud`、7 題 `question_answer`。
- 每局抽 12 題：6 題朗讀、6 題問答；兩位玩家各 6 回合，每回合交換題型。
- 題型二只錄製與評分學生答句，不把問句送入評分。
- 固定評分：準確度 50%＋完整度 30%＋流暢度 20%；80 分達標；最多 3 次有效作答。
- 已確認 `It is eleven o'clock.`、`He is running.` 與第 15 題鷹架 `It's _____ the _____.`。
- 四道時間題錯誤或缺漏小時、分鐘或 `o'clock` 時，總分最高 59。

## 時間轉錄與評分

- `clock-en-v1` 只套用於 HWG5-SR-001、002、009、010。
- 支援 `5:55`、`5.55`、答句位置的 `5 55`、英文無連字號與 `o'clock / o clock / oclock`。
- `545`、`1155` 等模糊連續數字判為 system-like 無效轉錄，不消耗有效作答次數。
- 單獨 `eleven` 或 `11` 不會被自動補成 `o'clock`。
- 非時間題不會全域改寫數字。
- 保留 `rawTranscript`，另存 `canonicalTranscript` 與 `displayTranscript`。

## 題圖

- 15/15 PNG，皆為 1280×720。
- 總大小：3,267,970 bytes。
- 四張精確時鐘使用確定性繪圖；十一張情境圖使用內建圖片生成服務建立原創場景後做本機最佳化。
- 逐檔尺寸、bytes、SHA-256、生成方法與替代文字：`pinball_site/images/hwg5-sentence-review/manifest.json`。
- 產生方法與提示詞：`pinball_site/images/hwg5-sentence-review/README.md`。
- 來源參考圖保持不變，未直接發布。

## 驗證結果

| 驗證 | 結果 |
|---|---:|
| 網站全套測試 | 51/51 通過 |
| Firebase Functions 全套測試 | 86/86 通過 |
| HWG5 專屬 validator | 0 錯誤 |
| 公開題庫私密欄位洩漏 | 0 |
| HWG7 三尺寸版面 QA | 39/39 通過 |
| HWG5 三尺寸版面 QA | 45/45 通過 |
| 缺圖 fallback | 通過 |
| HWG5 TTS check-only | 15/15 metadata 通過；未呼叫 API |

目標尺寸：Windows Chrome 1366×768、1920×1080、iPad Safari 橫式尺寸模擬 1024×768。

限制：iPad 項目是在 Chromium 中套用 Safari User-Agent、觸控與 1024×768 橫式尺寸；不等同實體 iPad Safari 引擎、麥克風授權與真實錄音測試。

## 下一個授權門檻

1. 教師複核 15 張題圖後回覆：`確認 HWG5 SR 15 張題圖`。
2. 同意正式呼叫 OpenAI 產生 15 段靜態示範音檔時回覆：`確認產生 HWG5 SR 15 段正式 TTS（沿用既有金鑰）`。
3. TTS 音檔與實體裝置驗證完成後，再另行取得 Firebase 部署授權。
