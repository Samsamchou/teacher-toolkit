---
rdq_version: 1
edition: chatgpt-app
task: 二水小行星 v3：學號登入、教師後台、五項修正
domain: dev
date: 2026-10-26
status: live
telemetry:
  mode: full
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: godot-games
---

# RDQ 需求規格：二水小行星 v3

## 一句話任務
加上「個人（學號）／分組（投影）」兩種玩法與教師後台紀錄，並修正首頁空拍、問路題中文地名、文法與押注畫面角色被遮住。

## 已確認
- 首頁先選玩法（**1C**）：
  - **個人**：輸入學號（5–8 位數字，例 50100）→ 選人物模式＋路線 → 每題自己選一個答案 → 答對得分；可在別台裝置接續。
  - **分組**：投影用，不登入，5–7 組押注（現行玩法）。
- 教師後台（**2A**）：每位學生的人物模式、路線、進行到第幾題、答對幾題、分數、最後遊玩時間；沿用 hwg5-clock-tower 共用學號外框與教師後台（Firestore）。
- 問路題（**3A**）：畫面「Where's the park? 二八水水公園」，語音只念英文；同單字多地點者一律加中文（實作上所有問路題都顯示中文地名）。
- 文法：「It's on __ Road.」「It's on __ Street.」；6 種模式全部句子列表給老師確認後再錄語音。
- 押注畫面：單人題鏡頭改為自動找不被擋的角度＋擋住的房子半透明，21 站逐一截圖檢查（特別是圖書館）。

## 已採納建議
- ① 首頁空拍：從太空看整顆星球旋轉 → 俯衝到二水車站上空；點畫面可跳過。
- ② 句型總表先給老師看（本卡附表）。
- ③ 只存學號與成績，不存姓名。
- ④ 測試學號 99901。
- ⑤ 只部署預覽頻道；後台紀錄寫正式資料庫；老師 iPad 確認後才上正式站與首頁卡片。

## 待確認假設
- 個人模式每題答對 +10 分，滿分 120；答錯不扣分、可看正確答案後繼續（仍要按「聽句子」才 Next）。
- 個人模式每台 iPad 只顯示一排選項按鈕（不顯示組別）。
- 任務代號 `ershui-planet`，教師後台列表顯示「二水小行星逛街版」。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\2026 REA Games\3D planet\godot-ershui-planet** 改版：首頁空拍改成太空看整顆星球再俯衝；首頁選「個人（學號 5–8 位）／分組（投影）」；個人模式接 hwg5-clock-tower 共用學號外框與 Firestore 進度（任務 **ershui-planet**，記錄模式、路線、題號、答對數、分數、時間，可跨裝置接續），教師後台加一行；問路題顯示英文＋中文地名、語音只念英文；所有 Street/Road 答句改「It's on __」；單人押注鏡頭避開遮擋並 21 站截圖檢查；以測試學號 **99901** 在預覽頻道 **ershui-planet** 驗證，正式站不動。

## 驗收條件
- [ ] 學號 50100／99901 可登入，換裝置能接續，教師後台看得到紀錄。
- [ ] 分組模式照舊可玩，不需登入。
- [ ] 21 站押注畫面角色都看得到（含圖書館）。
- [ ] 句型總表經老師確認；問路題有中文地名。
- [ ] 首頁看得出是一顆星球。

## 附表：6 種模式的句子（請確認）
| 模式 | 問句（畫面＋語音） | 答句（4 選項、語音） |
|---|---|---|
| Ken | Ken, where are you going? ／ Where are you going, Ken? | I'm going to the ___. |
| 圳寶 | Where is he going? | He's going to the ___. |
| 水鈴 | Where is she going? | She's going to the ___. |
| 三人綜合 | 以上三種輪流 | 對應上面三種 |
| 三人一起走 | Where are you going? | We're going to the ___. |
| 問路 | Where's the ___? ＋中文地名（例：Where's the school? 源泉國小） | It's on ___ Road. ／ It's on ___ Street.（顏色＝red, yellow, green, blue, black, white, purple, pink, orange, brown） |

___ 單字：park, post office, supermarket, library, school, train station, tea shop, bookstore, hospital, restaurant, convenience store
