# HWG7-U01 本機實作與 QA 報告

## 結果

- 模式：extend-existing
- 目標 key：HWG7-U01
- 教師批准：已收到明確「確認內容」
- 本機實作：完成
- 正式部署：未授權、未執行
- Git commit／GitHub push：未授權、未執行
- Google Drive 備份同步：本輪未執行

## 寫入內容

- public/index.html
  - 新增 HWG7-U01 9 個朗讀句組。
  - 保留第 1 句「你來自哪裡？」與第 8 句「你們來自哪裡？」的情境差異。
  - 套用已確認正規化：I'm、She's、We're，以及「她來自美國。」
  - 每句保留 id、en、zh、focus、ssml 欄位。
  - 新增 10 筆已確認字典提示：are、from、taiwan、uk、am、she's、friend、usa、looks、curry。
- tests/content-data.test.js
  - 題庫擷取器改為可驗證指定單元。
  - 新增 HWG7-U01 九句／中譯／ASCII 引號／SSML 測試。
  - 新增 10 筆字典候選測試。

未修改 public/ai-scoring.js、public/ai-scoring-core.js、functions/index.js、firebase.json 或 firestore.indexes.json。

## 自動驗證

- 內容 Schema：通過，0 errors、0 warnings。
- 單元：1；句組：9。
- 用量估算：26 人 × 9 題 × 每題每日 3 次＝每日理論上限 702 次。
- npm test：12/12 通過，0 failed。
- npm run check：通過。
- HWG7-U01 item ID：9 筆且唯一。
- SSML：9 筆均有完整 speak 根節點；縮寫在 SSML 使用 apos XML entity。
- 正規化：U01 區塊無彎引號，也沒有「來自 美國」的多餘空格。

## 本機瀏覽器 smoke test

- 本機 HTTP 回應：200。
- HWG7 主題按鈕：成功切換為作用中紫色狀態。
- U01 單元按鈕：成功切換為作用中青色狀態。
- 瀏覽器載入的腳本包含 HWG7-U01、9 個 item ID、單數「你」與複數「你們」中譯。
- U01 目標區塊未含彎引號。
- JavaScript console：0 errors；只有既有 Tailwind CDN production 警告。
- 點擊「開始練習」會要求麥克風權限。本輪未代替教師接受權限，因此未執行錄音、Callable TTS、AI 評分或 Firestore 真機流程。

## 安全回讀

- GEMINI_API_KEY、TTS_API_KEY、App Check debug token、私鑰：沒有新增命中。
- public/index.html 原有 Firebase Web apiKey 是既有公開 Firebase 設定；與備份版同一行完全相同，本輪未新增或改動。
- AI Logic、Agent Platform、App Check、TTS Callable、每日每題三次與七個日曆月到期行為均未改動。
- 未讀寫、搬移或刪除任何既有學生紀錄或錄音。

## SHA-256

- public/index.html：ab382ae5d1683e2174135115c769715411fc54b3dfa21dd67acdd6746eb678dd
- tests/content-data.test.js：a10a7e3a84b2a2e8207c67333f4a9398037f65f16479343be8466b1e42c90800
- public/ai-scoring.js：ed3be9e7aab88cbd2a1c4af40d4ba43e564e51917bcfe62318982b2b15458d8f
- public/ai-scoring-core.js：e16f797d345f5cd1de96539c0b065517cc5acfa92c103fd9154b0ccec2f7bd92
- functions/index.js：a8a6c00c576f80505d5e01e55c92d55bfede252a76da2afe1a240e563c563e04
- firebase.json：257ed2a4d06d6281d5b27824ef83f24977f3b78004882e56878826192b583edc
- firestore.indexes.json：da839572e06f9b9f3ec881e0d1bcf3b7d0c08cfa7f82cc02e9f8d1f218904f43

## 尚未完成

1. 教師允許麥克風後的 Chrome／iPad 實際錄音。
2. Callable TTS 的逐句人工聽讀。
3. 真實學生語音的教師評分校準。
4. 正式部署、正式網址讀回、GitHub push 與 Google Drive 備份同步。

若要進入正式發佈關卡，仍需先顯示正式目標、模型、App Check、用量門檻、資料路徑、保存期限與變更清單，再由教師明確回覆「確認正式部署」。GitHub push 需另行明確授權。
