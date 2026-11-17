---
rdq_version: 1
edition: chatgpt-app
task: 二水小行星 Listen and Guess 獨立成「二水小行星 Guess 版」＋拖放／選擇題可重試兩次
domain: dev
date: 2026-11-17
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: self
---

# RDQ 需求規格：二水小行星 Guess 版

## 一句話任務
Listen and Guess 改成獨立的「二水小行星 Guess 版」（新網址、首頁卡片），逛街版不再有 Listen 入口；拖放題／選擇題答錯可再試 2 次（一題最多 3 次），分數依第幾次答對遞減。

## 已知
- 現行外框 `ershui-3d-quest-planetlisten/`（listen-app.mjs、data.js、listen.css）＋遊戲 `ershui-planet/`（Godot，逛街版選單有 Listen 按鈕）。
- 每回合 10 題：口說 5、拖放 3、選擇 2；猜對 +10、滿分 100；兩人一組（10 碼學號）、輪流口說。
- 口說規則：地點對＋文法對（I'm going to the ___.）＋AI ≥ 80 分；最多 5 次；第 3 次起地點錯給三選一提示；沒錄到聲音／AI 沒回應不算次數。
- 拖放／選擇題目前只能答 1 次，答錯直接去揭曉。

## 已確認
- 1B：新網址直接進 Guess 版登入；首頁加卡片；逛街版選單拿掉 Listen 按鈕。兩邊共用同一套遊戲檔。
- 2A：拖放／選擇題第 1 次答對 +10、第 2 次 +6、第 3 次 +3；第 3 次仍錯 → 0 分、去揭曉。
- 3A：答錯只顯示「再試一次」，不說哪裡錯。

## 已採納建議
- ① 舊網址 `/ershui-3d-quest-planetlisten/` 自動轉到新網址。
- ② 教師後台顯示每題「第幾次答對」（例：3 題重試後答對）。
- ③ 先上預覽頻道給老師 iPad 試，通過後再上正式站。
- ④ 重試時線索（環境音、默劇、圖示）可以再播。

## 待確認假設
- 新網址：`https://hwg5-clock-tower.web.app/ershui-planet-guess/`；頁面標題「二水小行星 Guess 版」。
- 成績沿用原任務代號，舊紀錄與教師後台照常可看；不改 firestore.rules。
- 口說題規則與計分不變（5 次內通過就 +10）。
- 拖放題重試時字卡全部退回字卡區重新排（3A 不標錯）；選擇題重試時選項不變灰、可再選同一個。
- 逛街版拿掉 Listen 後，其他模式（全班分組、個人）不變；遊戲檔重新匯出一次。

## 本次不納入
- 口說規則調整、新地點、題型比例、Free Time 版。

## 一段式需求規格
建立 `ershui-planet-guess/` 新入口（沿用 listen-app 外框與 ershui-planet 遊戲檔），首頁加「二水小行星 Guess 版」卡片，舊網址 `ershui-3d-quest-planetlisten/` 轉址過去；Godot 逛街版選單移除 Listen 按鈕並重新匯出。拖放／選擇題答錯顯示「再試一次」（不標錯），可再答 2 次，線索可重播；計分第 1／2／3 次答對 = 10／6／3，三次都錯 0 分去揭曉；口說規則不變。教師後台每題顯示第幾次答對。本機整回合測試（含 15 fps）通過 → 預覽頻道 → 老師 iPad 試 → 比對 live＝staging 後上正式站並讀回。

## 驗收條件
- [ ] 新網址可登入、玩完整回合；舊網址會轉到新網址；首頁有卡片；逛街版沒有 Listen 按鈕。
- [ ] 拖放／選擇題答錯可再試 2 次，分數 10／6／3／0 正確，結果頁與教師後台顯示第幾次答對。
- [ ] 預覽頻道 iPad 試玩通過後上正式站，讀回正常、其他任務仍 200。
