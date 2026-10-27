# 課程庫配色與編輯按鈕配色 — 正式部署 2026-10-17

使用者明確要求「部署 Hosting 與 liveV2 到正式站，照之前的隔離副本流程，部署後讀回驗證」。正式入口：https://lesson-hub-v03.web.app/lab 。

## 正式版本

- Firebase **hwg7teaching**，Hosting **lesson-hub-v03**：`sites/lesson-hub-v03/versions/59f6a4b49bf7f134`，發布 UTC 2026-10-17T07:37:37.136Z。
- **liveV2**：`livev2-00018-vaq` → `livev2-00019-tez`，ACTIVE／Ready；LIVE 設定與 Secret 參照保留，環境變數無差異。
- 13 個 Functions 中只有 liveV2 更新，其他 12 個 updateTime 不變；預設 Hosting 不變；未部署 Firestore／Storage 規則、Worker 或其他專案。

## 本次上線

- 課程庫：卡片按右鍵（或點卡片右上 🎨，供 iPad 使用）開啟 10 色選單（紅、橘、黃、綠、青、藍、紫、粉紅、棕、灰），可清除配色。配色存在課程資料 `cardColor`，跨瀏覽器同步；改色會使課程版本 +1。複製並重新命名時沿用配色。
- 後端 `validateDeck` 只接受上述 10 個色鍵；未設定配色的既有課程不受影響。
- 編輯頁按鈕依用途上色：課程庫（藍）、復原上一個儲存版本／隱藏（黃）、複製／新增頁（綠）、刪除這頁（紅）、建立新版副本／轉成題目（紫）、學生預覽（青）、↑↓／復原／重做（灰藍）、重試儲存（橘）。

## 發布驗證

- 隔離副本 `%TEMP%\lesson-hub-course-color-20261017`，以 `.env.production`（firebase transport＋公開 App Check）建置；functions 無 `.env*`。
- 檢查：model-sync、config-sync、teacher-security、formal-gate、firebase-preflight、Node 測試 303/303、Functions 測試 10/10、functions 語法、正式建置均通過。site-data 在隔離副本因找不到上層 `question-bank` 失敗，改在原專案（資料檔與隔離副本逐位元相同）執行，errors 0。
- Firestore／Storage 模擬器整合 16/16（rules、storage、assignments、hero-campaign、course-name-cloud）。
- 部署前讀取線上版本：Hosting `f1274706dc9b3bfe`、liveV2 `livev2-00018-vaq`，與上次紀錄相同，無並行更新。線上 liveV2 原始碼 42 檔與本次相比只差 `generated/live-domain.mjs`（新增 COURSE_COLORS 與 cardColor 檢查）。
- 部署後下載雲端 liveV2 原始碼，42 檔與隔離副本逐位元相同。
- 公開讀回 209/209 相符：189 檔下載全文 SHA-256；20 個大檔以 Hosting gzip-9 ETag＋原始長度比對（ETag 不是原始內容 SHA）。`/`、`/lab`、`/lab?assignment=000000` 皆 200 且與 index.html 相同；`init.json` 專案為 hwg7teaching。
- 瀏覽器開啟正式 `/lab`：新 CSS／JS 已載入且含配色規則；未登入時 liveV2 回 403，頁面顯示「尚未載入雲端課程庫，請先解鎖教師驗證」，屬未驗證時的預期行為。

## 未驗證與交接

- 本機模擬資料已實測右鍵選色、存檔（v1→v2）與重新整理後保留；**正式站教師登入後的右鍵改色、iPad 🎨 按鈕尚待教師實測**。
- 沒有讀寫正式課程或學生資料；沒有 Git stage／commit／push（repo index SHA 前後相同）。
- 證據：`qa/course-color-production-20261017/`。
