---
rdq_version: 1
task: 分組投影投票列加 G1–G5；Listen and Guess 改兩人雙學號＋修重複登入
domain: dev
date: 2026-11-14
status: confirmed
---
# RDQ 需求規格（draft）
- 分組投影「查一查地點」投票列每組圖示旁加 G1–G5（game.gd）。
- Listen and Guess 登入改兩個學號連打（例 5012750128），沿用 Free Time freetime-app.mjs 的 PAIR_INPUT 寫法；每人各存一份紀錄，firestore.rules 不改。
- 修 Start 後跳回登入、需再輸入學號才成功的問題（先重現）。
- 已確認：1A 圖示左邊小字 G1（同上方分數卡）；2A 只限兩人、必須 10 位數；3B 測試通過直接上正式站；建議①結果頁兩學號、後台各一筆②口說兩人輪流③登入說明④先重現再修並加自動測試，全部採納。
