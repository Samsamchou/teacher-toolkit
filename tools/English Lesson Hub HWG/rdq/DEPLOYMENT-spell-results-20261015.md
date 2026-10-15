# v06 拼字、慶祝結果及逐關時間 — 正式部署 2026-10-15

使用者於本輪明確要求 **「部署正式站」**，已完成發布並讀回。正式入口：https://lesson-hub-v03.web.app/lab 。

## 正式版本
- Firebase **hwg7teaching**，Hosting **lesson-hub-v03**。
- Hosting：`sites/lesson-hub-v03/versions/420627ea43cda9fe`；發布 UTC **2026-10-15T11:26:19.599Z**。
- 僅更新必要後台 **liveV2**：`livev2-00017-hig`，ACTIVE，Cloud Run 最新建立與就緒版本一致。既有 LIVE 設定及 Secret 參照在記憶體比對保留，沒有匯出環境值。
- 其他 **12** 個 Functions 的 updateTime／版本不變；沒有發布 Firestore／Storage 規則、Worker 或其他 Hosting。

## 本次上線
- 拼字保留 **Chinese／English** 的大小寫，片語 **social studies** 固定單一空格；新版本嚴格評分，舊題及既有快照相容。
- 結果頁 **7.8 秒勝利音樂＋掌聲**、音量／靜音、播放受阻提示；大字學號與同一遊戲角色並列。
- 六關每次遊戲 **15／17／19／21／23／25 秒**，Godot runtime 與下載包同步。
- v06 手冊及 Web／Godot ZIP 的狀態文字更新為正式發布；包內程式、遊戲及原圖內容與已驗證 v06 完全相同，只改說明文字。原包與原文件已備份。
- 發布檢查修正手冊第4節殘留的舊12秒文字，使其與逐關時間表一致；只再次發布手冊與包內說明，未再次更新後台。

## 發布驗證
- 隔離副本以正式 Firebase transport／公開 App Check 設定建置；共享模型同步、資料檢查、教師存取、正式 gate、Firebase preflight、289 項 Node 測試及正式建置全通過。
- 相較先前正式後台，只有 **generated/spelling.mjs、generated/review.mjs** 兩個來源檔變更；先發布 liveV2 並確認 Ready，再發布 Hosting。
- **193/193** 正式檔 HTTP／SHA-256 相符；三個 SPA 入口、WASM MIME、Service Worker 與遊戲重新驗證快取通過。
- 實際部署來源 **41** 檔逐位元相符；原 **9** 份雲端課程文件、工作區設定及 Phonics 24 個素材文件／物件版本一致。
- **HWG7 SU-U02 Phonics** 仍為 36 題、100 分，24 個私有 MP3 保留；正式分配使用練習模式才採最高分、重試不扣分。
- 正式瀏覽器教師入口、無效分配碼與 Godot 公開載入通過，錯誤紀錄 0；沒有提交正式學生答案或呼叫付費 AI。
- 12 項模擬器與六關實際 Godot 計時，沿用來源完全一致的本輪 v06 驗證紀錄；這次沒有重跑並冒稱新實機驗收。
- 原 assets 目錄 **28** 個素材相關檔雜湊不變；441 個發布來源／素材已同步回專案並讀回。

## 交接
- 證據：`qa/spell-results-production-20261015/`。本文件取代先前 v06 尚未部署狀態。
- 正式教師本人登入／私人題組播放、實體 iPad／Safari／校網／喇叭仍待教師驗收。
- 沒有 Git stage／commit／push 或本輪 Obsidian 寫入；未停止其他工作。
