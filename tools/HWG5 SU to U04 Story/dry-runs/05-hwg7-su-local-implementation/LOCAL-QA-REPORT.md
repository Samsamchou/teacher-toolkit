# HWG7-SU 本機實作與 QA 報告

日期：2026-08-27

## 實作結果

- 模式：`extend-existing`
- 題庫 key：`HWG7-SU`
- 新增句數：6
- 新增字典項目：12
- 沿用既有字典項目：7
- 教師確認的直引號：`I'd`、`It's`
- 每日理論評分上限：26 人 × 6 句 × 每句 3 次＝468 次

## 變更範圍

- 已修改：`public/index.html`
  - 新增 6 句 `id / en / zh / focus / ssml`。
  - 新增 12 個教師確認的字典中文提示與發音提示。
- 已新增：`tests/content-data.test.js`
  - 驗證 6 個 ID、英文、中文、直引號、SSML 數量與 12 個新字典項目。
- 未變更：`public/ai-scoring.js`、`public/ai-scoring-core.js`、`functions/index.js`、`firebase.json`、`firestore.indexes.json`。
- 未變更其他單元、評分欄位、App Check、TTS Callable、`reading_records`、`audio_records/` 或七個月保存機制。

## 自動測試

- `npm test`：10/10 通過，0 失敗。
- `npm run check`：通過。
- `HWG7-SU` key：1。
- `hwg7_su_1` 至 `hwg7_su_6`：6。
- 句子 SSML：6。
- HWG7-SU 區塊彎引號：0。
- 本次新增內容與測試秘密掃描：乾淨。

## 本機瀏覽器 smoke test

- 本機網址：`http://127.0.0.1:4173/`（測試後伺服器已停止）。
- 首頁、`ai-scoring.js`、`ai-scoring-core.js`：HTTP 200。
- HWG7 按鈕：可見，點選後呈紫色 active 樣式。
- SU 按鈕：可見，點選後呈綠色 active 樣式。
- Browser Console error：0。
- `favicon.ico` 為 404；不影響本次功能，且不是 HWG7-SU 變更新增的錯誤。

## 尚未驗證

- 未接受本機瀏覽器麥克風權限，因此未在 UI 內進入錄音練習頁；6 句畫面資料由內容回歸測試驗證。
- 未呼叫正式 TTS／AI／Firestore／Storage，6 句純文字 SSML 尚未人工聽讀。
- 未做學校 iPad 或真實學生語音校準。
- 未執行 Firebase 部署、Git commit、GitHub push 或 Google Drive 備份。

## 發佈閘門

目前只是本機實作完成。正式部署前仍須顯示並確認 Firebase project、Hosting 網址、模型、配額、資料路徑與保存期限，並取得獨立的 `確認正式部署`。
