---
rdq_version: 1
edition: chatgpt-app
task: Animal Basketball 加入六張抽卡式功能卡
domain: dev
date: 2026-11-26
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: class-game
---

# RDQ 需求規格：Animal Basketball 功能卡

## 一句話任務
把 Animal Basketball 現有的 Focus／Long shot 免費加強換成六張抽卡式功能卡，每張卡有專屬的 3D 演出與音效。

## 已確認
- 現況：遊戲目前沒有抽卡，只有每球可免費選一種的 Focus（命中率 +12）與 Long shot（多一個 4 分球）。
- 卡片共 **6 張**：教師指定的 **Extra Shot、Double Points、Swap Points**，加上第 1 題選的 **Slam Dunk、Steal、Hit or Miss**（教師原先說再加 2 張，實際選了 3 張，以選擇為準）。
- 取得與使用（2A）：和 Bowling 一樣，每回合隨機一個分值按鈕出現「+1」，選那個分值投籃就拿到一張；之後按 **POWER UP** 隨機抽一張。
- Extra Shot（3A）：本組這回合多 **2 次**投籃。
- 加強（4B）：取消 Focus 與 Long shot，只留卡片；一般投籃分值固定 **1／2／3 分**。
- 母規格：`rdq/RDQ-spec-basketball-bowling-spectacle-20261126.md`（3D、真實音效、功能卡演出 6–8 秒）。

## 六張卡
| 卡片 | 效果 | 3D 演出 |
|---|---|---|
| Extra Shot | 本組這回合多 2 次投籃 | 兩顆發光籃球從天而降彈到動物手上，+2 SHOTS |
| Double Points | 本組目前總分加倍 | 籃框變成金色雙框、噴金幣，分數滾動翻倍 |
| Swap Points | 和另一組交換總分 | 漩渦中兩組分數牌飛出對調 |
| Slam Dunk | 這一球必進，得 3 分 | 動物助跑起跳灌籃，籃板震動，慢動作重播 |
| Steal | 從最高分的另一組偷 2 分 | 2 分從對方分數牌飛到本組，+2／−2 |
| Hit or Miss | 必進或必不進，各一半 | 球在空中紅綠閃爍，到籃框前才定色：空心進球或彈框而出 |

## 待確認假設
- Hit or Miss 命中得 **4 分**（保留影片裡的四分球，也和必進 3 分的 Slam Dunk 有區別）→ 預設採 4 分。
- 「+1」每回合有 70% 機率出現，選到那個分值不論進不進都拿到卡 → 預設比照 Bowling。
- Swap Points 兩組時自動交換，三組以上由教師選對象 → 預設比照 Bowling。
- Steal 的對象是其他組中分數最高者，同分時由教師選；對方不足 2 分就偷到 0 為止，全部是 0 分則顯示沒東西可偷 → 預設採此規則。
- Double Points 不設上限；落後追分的動態命中率保留不變 → 預設維持。
- 取消加強後，舊版尚未打完的存檔無法續玩，會請教師開新局 → 預設不做舊存檔轉換。
- Slam Dunk 需要六隻動物的灌籃姿勢新圖 → 生圖前先報價，教師同意才生。
- Phonics 接入的完整遊戲照常有卡片 → 預設有。
- 製作順序：Bowling 試片核准後才做 Basketball，本規格併入 Basketball 的 3D 改版一起做 → 預設照母規格。

## 已採納建議
- ① 用掉卡片算這一球（抽卡代替這回合的投籃；Extra Shot 另外多給 2 球）。
- ② 每組最多同時持有 2 張卡；滿 2 張時「+1」不出現。
- ③ 設定頁可逐張開關卡片並調整出現比例。
- ④ 卡片揭曉、OKAY 按鈕、播報語音與 Bowling 共用同一套。
- ⑤ Unscramble 答對獎勵的單次投籃不出現卡片。

## 本次不納入
- 題目、問答與答題判斷。
- Bowling 的卡片規則與程式（另一個對話進行中）。
- 正式部署、付費生圖批次（另行同意）。

## 一段式需求規格
在 **`G:\我的雲端硬碟\teacher-toolkit\tools\GPT Sites games`** 的 **Animal Basketball** 取消 Focus 與 Long shot 免費加強，改為抽卡式功能卡：每回合 **70%** 機率在 **1／2／3 分**其中一個按鈕出現「+1」，選該分值投籃即獲得一張（每組最多持有 **2 張**），之後可按 **POWER UP** 依設定頁的開關與比例隨機抽出 **Extra Shot（多 2 次投籃）、Double Points（總分加倍）、Swap Points（與另一組交換總分）、Slam Dunk（必進得 3 分）、Steal（從最高分的另一組偷 2 分）、Hit or Miss（一半機率必進得 4 分、一半必不進）** 其中一張，抽卡代替該回合的投籃；卡片以與 Bowling 共用的 3D 揭曉、**OKAY** 按鈕與播報語音呈現，每張卡有上表的專屬 3D 演出、分數大字動畫與真實錄音音效，長度 **6–8 秒**並有減少動態版；Unscramble 單次獎勵不出現卡片；落後追分的動態命中率、組數、回合、存檔恢復維持原樣；Bowling 試片核准後併入 Basketball 3D 改版製作，先交本機試片，部署到 **gamesinclass-5d9d1** 前另行徵求同意。

## 驗收條件
- [ ] 六張卡都能取得、抽出並正確改變分數或投籃次數，自動測試涵蓋每張卡與持有上限。
- [ ] 設定頁可逐張開關與調整比例；Focus、Long shot 與 4 分球按鈕已移除。
- [ ] 每張卡的演出實測 6–8 秒，教師在大螢幕認可動畫與音效。
- [ ] Unscramble 獎勵不出現卡片；既有測試全數通過。
