# 分配遊戲獨立頁 — 正式部署 2026-11-18

教師確認 RDQ 規格（1A、2A、3A、4B；建議①–⑤）並要求「完成後直接部署」。規格：`rdq/RDQ-spec-assignment-game-page-20261118.md`。正式入口：https://lesson-hub-v03.web.app/lab 。

## 正式版本

- Hosting **lesson-hub-v03**：`ee5feb721b238850` → `sites/lesson-hub-v03/versions/e321f6982d1fcdb6`（UTC 2026-11-18T00:09:18.493Z）。
- 只部署 Hosting：後端原始碼與線上 liveV2 `livev2-00023-wuq` 44 檔相同，13 個 Functions 均未變；預設 Hosting、規則不變。

## 本次上線

- 練習：答對（全對 2 次、部分對 1 次機會）後顯示結果約 1.5 秒，自動翻到全螢幕遊戲頁；也可按「🎮 去玩 ○○（N 次機會）」立即前往。答錯沒有機會，留在題目頁按「下一題」。
- 遊戲頁：頂部狀態列（遊戲名・第 N 題・剩餘機會・遊戲總分・♫ 聲音），音量／靜音／減少動畫收進 ♫；遊戲畫面依螢幕高度縮放，按鈕全在一頁內；底部用完機會後顯示「下一題 →」（最後一題「完成並揭曉總成績」），未用完可「放棄剩餘機會」。
- 遊戲中重新整理會回到遊戲頁；有機會但尚未開始時重新整理，1.5 秒後也回到遊戲頁。
- 測驗：交卷後成績頁上方顯示「交卷完成！你有 N 次遊戲機會」與「🎮 去玩 ○○」，進入遊戲頁，可「回成績頁」。
- Teacher-led 課堂遊戲版面未改（樣式只作用於分配遊戲頁）。

## 驗證

- 隔離副本 `%TEMP%\lesson-hub-game-page-20261118`：model-sync、config-sync、teacher-security、formal-gate、firebase-preflight、Node 325/325、Functions 10/10、語法、建置通過；site-data 於原專案 errors 0。
- 本機實走（模擬資料）：5 款遊戲在 1024×768、1180×820 遊戲區域內容高度等於可用高度、不需捲動，進行中狀態（投籃結果、落球、拉霸、Bowling 投球與 SPARE、World Pup 卡牌）亦在一頁內；♫ 設定展開仍不溢出。答對自動翻頁、重新整理回遊戲頁、用完顯示「下一題」、答錯不翻頁、測驗成績頁↔遊戲頁皆通過。截圖：`qa/game-page-20261118/screenshots/`（10 張）。
- 公開讀回 209/209（189 全文 SHA、20 gzip ETag＋長度），三入口 200；正式 `/lab` 無錯誤、已載入遊戲頁樣式。

## 未驗證與交接

- **實體 iPad Safari 與正式登入建立分配尚待教師驗收**；未寫入正式分配或學生資料。
- 沒有 Git stage／commit／push（repo index SHA 前後相同）。證據：`qa/game-page-20261118/`。
