---
rdq_version: 1
edition: chatgpt-app
task: Bowling 3D 六張功能卡的專屬動畫與音效
domain: dev
date: 2026-11-26
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 6
  revisions: 0
downstream: class-game
---

# RDQ 需求規格：Bowling 3D 功能卡演出

## 一句話任務
在 Bowling 3D 試片頁做出六張功能卡各自的 3D 揭曉、特殊球、效果動畫與音效，並把 Extra Shot 改成多 2 次投球。

## 已確認
- 揭曉（1A）：卡片在 3D 場景飛出、翻面揭曉，保留 **OKAY** 按鈕由教師控制節奏。
- 音效（2A）：再找 CC0 真實錄音，列清單給教師同意後才下載。
- 順序（3A）：先在試片頁做完六張卡，教師看過再一次接進正式遊戲。
- **規則修改**：Extra Shot 由「多 5 次投球」改為「**多 2 次投球**」；其餘五張卡規則不變。
- 功能卡球屬特殊球，長度 6–8 秒；沿用母規格 `rdq/RDQ-spec-basketball-bowling-spectacle-20261126.md`。

## 六張卡的演出
| 卡片 | 特殊球與演出 | 分數動畫 |
|---|---|---|
| Hit or Miss | 球一路紅綠交替閃爍加鼓聲，到球瓶前才定色：綠色全倒（含慢動作重播）或紅色偏進球溝 | HIT!／MISS! |
| Extra Shot | 藍色球滾到球瓶前分裂成 2 顆發光小球，飛向投球次數 | +2 SHOTS |
| No Shot | 紅色球滾到球瓶前撞上落下的禁止標誌，洩氣消失 | NO SHOT |
| Lose Points | 黃綠色球掉進球道上打開的洞，分數數字掉落碎裂 | −3 或 −5 |
| Double Points | 金色球穿過「×2」光門變成兩顆，噴出金幣 | 分數滾動翻倍 |
| Swap Points | 紫色球捲出漩渦，兩組分數牌飛出對調 | 兩組分數互換 |

除 Hit or Miss 的全倒外，功能卡球都不碰球瓶。

## 待確認假設
- Extra Shot 改 2 次同時更新卡面「+2」、畫面「+2 SHOTS」、中文說明、設定頁規則文字與測試 → 預設全部一起改。
- 已存檔、進行中的回合若已拿到 5 次額外投球 → 預設保留，不回收；新抽到的才是 2 次。
- 無球瓶的五張卡沒有撞瓶可重播 → 預設在效果發生瞬間用慢動作，不另外重播。
- 播報卡名用 edge-tts（en-US-GuyNeural，和現有播報同一個聲音）→ 預設採用。
- 找不到合適 CC0 錄音的音效 → 預設用程式合成並在紀錄中註明。

## 已採納建議
- ① 每張卡專屬的球花樣與尾巴顏色。
- ② 分數變化大字動畫。
- ③ Hit or Miss 懸疑演出。
- ④ 觀眾依卡片反應（好卡歡呼；Lose Points、No Shot 驚呼或嘆氣）。
- ⑤ 播報唸出卡名。
- ⑥ 六張卡各有減少動態的安靜版。

## 本次不納入
- 接進正式 Bowling、Unscramble 獎勵、Phonics（試片核准後另做）。
- 新增卡片種類、修改抽卡機率或其他卡片規則。
- Basketball。

## 一段式需求規格
在 **`G:\我的雲端硬碟\teacher-toolkit\tools\GPT Sites games`** 的 Bowling 3D 試片頁（**`src/bowling3d/`**、**`bowling3d-pilot.html`**）加入六張功能卡 **Hit or Miss、Extra Shot、No Shot、Lose Points、Double Points、Swap Points** 的完整演出：卡片在 3D 場景飛出翻面、播報卡名、教師按 **OKAY** 後專屬花樣與尾巴顏色的特殊球滾出，依上表演出效果與分數大字動畫，觀眾依卡片好壞歡呼或嘆氣，每張卡 **6–8 秒**並各有減少動態版；除 Hit or Miss 全倒外球不碰球瓶；音效先找 **CC0** 真實錄音並列清單請教師同意後才下載，找不到的用合成音並註明；同時把 **Extra Shot 改為多 2 次投球**（`bowling-model.mjs`、卡面、文字、測試一併更新，已發出的 5 次不回收）；完成後交教師在試片頁驗收，核准前不接進正式遊戲、不部署。

## 驗收條件
- [ ] 試片頁六張卡都能單獨播放，教師認可動畫與音效。
- [ ] 每張卡實測 6–8 秒；減少動態版可播放。
- [ ] Extra Shot 實際只增加 2 次投球，畫面與卡面都顯示 +2。
- [ ] 既有 116 項測試、Bowling 規則測試與 3D 測試全數通過；新音效的來源與授權記入 manifest。
