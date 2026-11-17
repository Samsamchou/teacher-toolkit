# 分配加入課堂單人遊戲 — 正式部署 2026-11-17

教師確認 RDQ 規格（1A、2A、3A、4B；建議①②④⑤）並要求「修改好之後，直接部署上正式站」。規格：`rdq/RDQ-spec-assignment-reward-games-20261117.md`。正式入口：https://lesson-hub-v03.web.app/lab 。

## 正式版本

- Hosting **lesson-hub-v03**：`dd0dbc4eb9b070ee` → `sites/lesson-hub-v03/versions/ee5feb721b238850`（UTC 2026-11-17T14:03:32.574Z）。
- **liveV2**：`livev2-00022-qix` → `livev2-00023-wuq`，ACTIVE／Ready；7 個 LIVE_* 設定（含 `LIVE_AI_MODEL`）與 Secret 綁定前後相同。
- 13 個 Functions 只更新 liveV2（liveAudioV2 等 12 個不變）；預設 Hosting、規則不變。

## 本次上線

- 分配對話框「遊戲」新增 單人籃球、Plink-oh!、Slot Machine、Bowling Game、World Pup Soccer，預設帶入工具列「本堂課單人遊戲」；Forest of Words 與純答題保留。
- 練習：每題完成（全對或用完次數）後在題目頁下方玩，全對 2 次、部分對 1 次、答錯 0 次；機會不累積，可「放棄剩餘機會，下一題」；遊戲進行中不能前進。
- 測驗：作答期間不出現遊戲；交卷後在結果頁玩，機會為各題機會總和。
- 遊戲結果由伺服器決定（沿用課堂權威亂數／物理）；遊戲分不影響英語成績。
- 學生頁不顯示 Forest 關卡地圖與道具；結果頁並列英語成績與「遊戲總分／次數」。教師報表顯示「🎮 遊戲名 N 分」，CSV 新增「課堂遊戲、遊戲總分、遊戲次數」。
- 舊分配（survivors／none）流程不變。

## 發布驗證

- 隔離副本 `%TEMP%\lesson-hub-reward-games-20261117`：model-sync、config-sync、teacher-security、formal-gate、firebase-preflight、Node 測試 325/325（新增 8 項遊戲規則）、Functions 10/10、語法、建置通過；site-data 於原專案 errors 0。模擬器整合 17/17。
- 部署前線上版本與 10/27 紀錄相同；後端相對線上只改 `generated/assignment-domain.mjs`、`src/assignment-service.mjs`，新增 `generated/assignment-rewards.mjs`。
- Functions 設定檔 `.env.hwg7teaching` 於部署前由線上 liveV2 的 LIVE_* 值產生，鍵值與 10/27 部署原始碼內的同名檔完全相同；只留在 Temp，未存入專案或 qa。
- 部署後雲端原始碼 44 檔與副本逐位元相同；公開讀回 209/209（189 全文 SHA、20 gzip ETag＋長度），三入口 200；正式 `/lab` 無錯誤、已載入新樣式。
- 本機模擬資料實走：Bowling 練習（預設帶入、全對 2 次、投球、計分、遊戲中鎖下一題、放棄剩餘、部分 1 次、答錯 0 次、結果頁並列）；Slot 測驗（作答中無遊戲、交卷 3 次、結果頁轉盤）；教師報表顯示遊戲分。

## 未驗證與交接

- **正式站教師登入建立新分配、iPad 實玩五款遊戲尚待教師驗收**；未寫入正式分配或學生資料。
- 沒有 Git stage／commit／push（repo index SHA 前後相同）。證據：`qa/reward-games-production-20261117/`（不含部署原始碼 zip，因內含設定檔）。
