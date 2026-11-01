---
rdq_version: 1
edition: claude-code
task: 二水3D闖關 HWG5／HWG7 各擴成四套題庫＋修 Ken 穿牆
domain: dev
date: 2026-11-01
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: self
---

# RDQ 需求規格：二水 3D 闖關四套題庫＋Ken 穿牆修正

## 一句話任務
HWG5、HWG7 二水 3D 闖關各加入三套 Wayground 綜合小考（共四套、隨機不重複抽），並修正 iPad 上 Ken 穿越建築。

## 已確認
- HWG5 四套：原 **HWG5 R1（51 題）**＋**HWG5-U01 綜合小考（44 題，本機資料夾 Starter-U1）**＋**HWG5-U02 綜合小考**＋**HWG5-review1 綜合小考（40 題）**。
- HWG7 四套：原 **HWG7 U01-U02（52 題）**＋**HWG7-U01（44）**＋**HWG7-U02（44，含 1 題組 4 小題）**＋**HWG7-review1（40，含 3 題組）**。
- 題型、題數完全照 Wayground；遊戲缺的題型（標籤、重新排序、題組、純文字選擇）新寫進 Godot。
- 抽題：從「未完成的套」隨機抽；四套都完成後再隨機抽一套重玩，開新紀錄，後台保留每套最高分（1A）。
- 已玩完原本那套的學生算已完成，下次從三套新題抽（2A）。
- 計分沿用遊戲：100 分、每題等分 × 作答次數品質（3A）。
- 題目來源：本機文字審閱稿（最新版）＋ 2026-11-01 Wayground 修改紀錄，音檔用「音檔_0.8倍速_每題」，圖片用「圖片_檢視用」（4B）。

## 已採納建議
- ① Ken 穿牆：檢查路線與 bld_*.glb 實際建築邊界、開場印 `PATH CHECK`，必要時調整 Ken 體型。
- ② 每套獨立任務代號 `ershui-3d-quest-<年級>-<套>`（符合現有 Firestore 規則）。
- ③ 教師後台加「四套完成總覽」（每生一行，✓／最高分）。
- ④ 閱讀／對話題組放魔王關（park／lawn），面板可捲動，用 iPad 比例截圖驗收。
- ⑤ 教師測試參數 `?set=N` 直接指定某一套。

## 待確認假設
- 題目順序照審閱稿順序平均分到 13 地點；HWG5-U01 用 **審閱稿 v5** 的正確順序 → 預設採此。
- 首頁維持一張 HWG5、一張 HWG7 卡片，抽套在卡片內進行 → 預設採此。
- 每套各自一個 pak，只下載抽到的那一套 → 預設採此。
- 先部署 **預覽頻道 ershui-preview**，教師 iPad 實測後才上正式站 → 預設採此。

## 本次不納入
- 修改 Wayground 上的題目或順序。
- Ken's Jump Island（jump3d）與二水小行星。

## 一段式需求規格
在 **escape room HWG5-U01-U02/site** 的二水 3D 闖關中，HWG5 與 HWG7 各改成四套題庫：保留原任務（**ershui-3d-quest** 51 題、**ershui-3d-quest-hwg7** 52 題）為第 1 套，再用 **build_mission.py** 從 **English exam/teachingmaterial-backup-20261017/output/** 的 **HWG5_小考_Starter-U1、HWG5_小考_U02、HWG5_小考_Review1、HWG7_小考_U01、HWG7_小考_U02、HWG7_小考_Review1** 審閱稿＋11/01 修改紀錄＋0.8 倍速音檔＋檢視用圖片建成六套新題庫，每套獨立任務代號與 pak，題型題數與 Wayground 完全一致；Godot 遊戲新增標籤、重新排序、題組（題組放魔王關、面板可捲動）、純文字選擇題型並重新匯出到 quest3d/；網頁外框改成登入後從未完成的套隨機抽一套，舊任務已完成者算第 1 套完成，四套都完成後再隨機重玩並保留每套最高分，支援 **?set=N** 教師測試；教師後台加四套完成總覽；同時修正 Ken 沿路線切過建築邊角的穿牆問題（PATH CHECK）；先部署預覽頻道，教師 iPad 確認後才上正式站（`--project g6-english-online-learning --account u9431818@gmail.com`）。

## 驗收條件
- [ ] 六套新題庫逐題核對：題數、題型、正解、音檔、圖片與審閱稿一致（自動比對報告）。
- [ ] 同一學號連玩四次，四次抽到四套不同題庫，後台四筆紀錄＋總覽全 ✓。
- [ ] `PATH CHECK` 全部通過；iPad 比例截圖沿 13 地點走一圈無穿牆。
- [ ] 新題型在 iPad 比例截圖中可完整作答（題組可捲動、拖曳不跑位）。
