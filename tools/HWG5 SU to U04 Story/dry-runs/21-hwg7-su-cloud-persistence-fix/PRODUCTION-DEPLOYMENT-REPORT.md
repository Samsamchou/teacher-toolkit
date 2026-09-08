# 正式發布讀回 / Production deployment readback

- 教師授權：2026-09-08「確認正式部署」。
- Firebase 專案：`hwg5-su-to-u04-story`。
- 網址：https://hwg5-su-to-u04-story.web.app/?v=20260908-save-fix
- 發布時間：2026-09-08 15:15:06 Asia/Taipei。
- Hosting version：`2ee6742503027299`；前版 `2d1c2162838f2654`。
- 發布範圍：Firestore Rules、Storage Rules、Firestore indexes/TTL、Hosting。

## 最終補強與驗證

部署前補強 Firestore 保存重試：`get({source:"server"})` 並拒絕 `fromCache` 或 `hasPendingWrites` 的快照，避免本機快取被誤判成雲端成功。新增實際執行讀回函式的回歸測試，涵蓋快取、待寫入與伺服器確認三種狀況。

- Firestore Standard 與 Storage Emulator 最終回歸：52/52 通過、0 失敗、0 跳過。
- 兩份正式 Rules：SHA-256 與本機完全一致。
- 三個正式檔案：HTTP 200，SHA-256 與本機完全一致。
- 正式首頁瀏覽器開啟正常，顯示 HWG5–HWG8、SU–U04、學號入口與教師後台入口。
- 未執行實體麥克風、正式 AI 或學生資料寫入測試。

## TTL 狀態

- `reading_records.expiresAt`：ACTIVE。
- `persistence_events.expiresAt`：15:15 為 CREATING；15:56 收工讀回 ACTIVE，背景啟用完成。
- 保存期限與既有 Storage 215 天 lifecycle 維持原設定，清理非即時。
- 沒有搬移、補建、回寫或刪除既有學生紀錄。

## 證據

- `production-before.json`：部署前 Rules、TTL、Hosting release。
- `before-firestore.rules`、`before-storage.rules`：部署前規則供回復。
- `production-rules.json`：Rules 發布後讀回。
- `production-after.json`：正式版本、Rules／檔案雜湊與 TTL 讀回。
- `LOCAL-QA-REPORT.md` 與 `qa-results.json` 保留較早本機 51 項測試的歷史快照；以本報告 52 項為最後發布前結果。

## 教師實機驗收

1. 在學校 iPad Safari 重新整理或重新開啟上述新版網址。
2. HWG7 SU 連續完成四題；每題須顯示「評分與雲端保存完成」。
3. 教師本人登入後台，確認同一學號四筆成績與四個可播放音檔。
4. 若顯示保存未完成，保留該分頁並使用「重新儲存紀錄」，避免關頁清除暫存。
5. 真人驗收完成後，再安排缺漏學生重新錄製。

本次未同步 Google Drive、未 Git commit、未推送 GitHub。
