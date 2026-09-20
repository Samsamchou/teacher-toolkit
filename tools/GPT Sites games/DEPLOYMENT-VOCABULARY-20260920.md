# VOCABULARY LIVE 正式部署

- 使用者授權：「正式部署」。日期：2026-09-20。
- Firebase project / Hosting：`gamesinclass-5d9d1`。
- 版本：`2026.09.20-vocabulary.1`。
- 正式入口：https://gamesinclass-5d9d1.web.app/vocabulary
- 先部署 `functions:classroom-games:vocabularyActivity`，成功後部署 `hosting`；兩者均退出碼 0。
- 首次函式定義探索超過預設 10 秒，未發布；以 CLI 支援的 `FUNCTIONS_DISCOVERY_TIMEOUT=60` 重試成功，未修改程式處理邏輯。
- 後端 Node.js 22、asia-east1、ACTIVE，hash `e701601cf8f02ee89658f0701acc39ba5667dbbe`。
- Hosting 完整建置 89 檔，本次上傳 4 個新檔。

## 保留不動

原 `liveActivity` hash `2a5e083225cd000debc3803f4d52ecb41a7524ea`、`teacherLogin` hash `1753d6918c14da50b59f6e2ede57153c4889a2ed`，部署前後一致。未部署 Firestore／Storage 規則，未更改通行碼，未寫入正式班級／場次／作答資料，未 commit 或 push。

## 驗證

發布前重新執行 92 項回歸測試、正式模式 build，均通過；24 個來源檔、12 個媒体檔、六張 Plinkoh 圖資清單核對成功。後端五張 SF1 U01 圖片加一張白板模板與 Drive 原始檔雜湊一致。先前本機 17 項整合、15 組瀏覽器 7 個情境、資料規則測試的證據位於 `qa/vocabulary-20260920`。

正式站檔案雜湊、API 防線、教師與學生入口瀏覽器結果另存 `qa/vocabulary-production-20260920/verification.json`。這些檢查不冒用教師登入，不能當作正式登入後完整教學活動的驗收。

## 教師下一步

以原本通行碼登入，開啟 VOCABULARY LIVE，按「載入 SF1 U01 五題圖卡」，再建立班級場次。教師登入由本人操作，不把通行碼貼在對話。正式跨裝置平板手寫、學校 Wi-Fi、教室音響及投影後排閱讀仍待現場驗收。

原本 `VOCABULARY-IMPLEMENTATION-20260920.md` 與本機 QA 文件保留當時尚未部署的歷史狀態；本文件為後續正式發布紀錄。
