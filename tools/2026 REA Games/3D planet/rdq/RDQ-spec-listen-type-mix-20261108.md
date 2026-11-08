---
rdq_version: 1
edition: chatgpt-app
task: Listen and Guess 每回合題型固定 4 口說＋2 拖放＋2 選擇
domain: dev
date: 2026-11-08
status: confirmed
telemetry:
  mode: lite
  rounds: 0
  questions: 0
  q4_adopted: 0
  revisions: 0
downstream: self
---

# RDQ 需求規格：每回合題型比例

## 一句話任務
Listen and Guess 每一回合 8 題固定為 **4 題口述錄音、2 題拖放、2 題選擇**（原本每題隨機三選一）。

## 已確認
- 比例：口說 4、拖放 2、選擇 2，每一回合都一樣。

## 待確認假設
- 哪一題是哪一種題型，每回合隨機分配（8 個地點順序本來就隨機）；同一回合中途離開再「繼續上次」，題型不變。
- 口說題錄滿 5 次仍未滿 80 分改成選擇題時，紀錄仍算「口說題」（教師後台看得到錄了幾次、最高分）。
- AI 暫時不能用（例如網路斷）時，口說題才改成選擇題；比例以出題時為準。

## 一段式需求規格
修改 **site/public/ershui-3d-quest-planetlisten/listen-app.mjs**：每回合開始（或第一次出題）時，用 [speak×4, drag×2, choice×2] 洗牌，依 q01–q08 存進該回合紀錄 `types`，之後每題照表出題；繼續上次時沿用同一張表。測試：模擬 20 回合，每回合都剛好 4／2／2；上預覽頻道 **ershui-preview**。

## 驗收條件
- [ ] 任一回合 8 題剛好 4 口說、2 拖放、2 選擇。
- [ ] 中途離開再繼續，剩下的題型和原本一樣。
