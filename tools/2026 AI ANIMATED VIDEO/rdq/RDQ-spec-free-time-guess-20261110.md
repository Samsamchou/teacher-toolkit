---
rdq_version: 1
edition: claude-code
task: 11 段 free time 看動畫猜句子圖示影片
domain: video
date: 2026-11-10
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: self（程式動畫 Canvas 2D＋Playwright＋ffmpeg）
---

# RDQ 需求規格：Free Time 看動畫猜句子

## 一句話任務
把 11 個 free time 片語做成「剪影圖示動作 → 倒數 3 秒 → 答案句」的猜句子 MP4。

## 已確認
- 參考：`資料/火柴icon 程式動畫/Video_261110091600.mp4`（9 段，螢幕錄影）。
- 1A：沿用原版「人形剪影＋線條圖示」，但**情節要最符合現實邏輯**、人物與物品**更精緻**。
- 畫風：**G 扁平科普風**（2026-11-10 老師選定；深紫藍夜色、發光、單一紅色重點、Nunito 粗體；參考 `output/style-pilots-20261104/g-flat-science/`）。人物是單色剪影＋右側洋紅輪廓光。
- 字體：**所有影片一律用 Comic Relief**（2026-11-10 老師指定；字型檔放 `output/free-time-guess/engine/fonts/`）。
- 2026-11-10 老師看過 Q1 play baseball 試片 v1 →「可以，做露營」；看過露營試片 →「字幕往上移，處理好之後就可以做其他 9 段」。
- 字幕列已上移（BAR_Y 835，字幕基線 y 945）。
- 2026-11-10 v1 全部完成：`output/free-time-guess/renders/final/` 11 支（16–17 秒）＋合輯 `Free-Time-Guess_Q01-Q11.mp4`（3:15，每段前 1.5 秒題號卡）。**2026-11-10 老師驗收：「可以，定案」。**
- 2B：倒數每秒嗶聲＋答案出現時「叮」；沒有配音、沒有背景音樂。
- 3B：每段約 16 秒（動作約 10 秒、倒數 3 秒、答案 3 秒）。
- 4B：11 支獨立 MP4＋1 支合輯（每段前標 Q1–Q11）。
- 畫面底部全程顯示 `I ________ in my free time.`，答案填進空格。

## 已採納建議
- ① play online **games**（複數）。
- ② surf the Internet 不用 Facebook 標誌，改用地球＋Wi-Fi 圖示。
- ③ 先做 2 支試片（**play baseball**、**go camping**），通過再做其他 9 支。
- ④ 答案的動詞（play／go／ride／watch／listen／surf／study）用不同顏色。
- ⑤ 新增兩段：go camping、play the recorder。

## 待確認假設
- 1920×1080、30 fps，H.264＋AAC → 預設採用。
- 輸出位置 `tools/2026 AI ANIMATED VIDEO/output/free-time-guess/` → 預設採用。
- 動作按現實順序重新設計（見下表），不完全照原片。

## 11 段情節（現實邏輯版）
| # | 答案 | 動作順序 |
|---|---|---|
| 1 | play baseball | 投手投球 → 打者握棒揮擊 → 球飛遠 → 打者跑向一壘 |
| 2 | go jogging | 穿運動鞋在公園步道慢跑 → 樹往後移 → 擦汗 |
| 3 | watch TV | 拿遙控器坐上沙發 → 按遙控器 → 電視亮起播放 → 看著笑 |
| 4 | ride a bike | 戴安全帽 → 牽車 → 跨上坐好 → 踩踏板、輪子轉、背景後移 |
| 5 | listen to music | 坐下 → 戴耳機 → 按手機播放 → 音符飄出、頭跟著點 |
| 6 | play basketball | 運球 → 起跳投籃 → 球劃弧線進網 → 落地 |
| 7 | surf the Internet | 坐電腦前 → 開瀏覽器（地球＋Wi-Fi）→ 點滑鼠、網頁捲動 |
| 8 | play online games | 戴耳機 → 握手把 → 螢幕出現遊戲 → 按鍵得分 |
| 9 | study English | 坐書桌 → 翻開 ABC 英文書 → 拿筆寫字 |
| 10 | go camping | 背背包走到草地 → 搭帳篷 → 生營火 → 天黑星星出現 |
| 11 | play the recorder | 拿起直笛 → 手指按孔、吹 → 音符飄出 |

## 本次不納入
- 英文配音、背景音樂、AI 生圖或 AI 影片。

## 一段式需求規格
在 **tools/2026 AI ANIMATED VIDEO/output/free-time-guess/** 用 Canvas 2D 程式動畫＋Playwright 逐格截圖＋ffmpeg，製作 **11 支 1920×1080 MP4**（play baseball、go jogging、watch TV、ride a bike、listen to music、play basketball、surf the Internet、play online games、study English、go camping、play the recorder）與 **1 支 Q1–Q11 合輯**。採老師選定的現有畫風，人物是精緻的人形剪影、物品是精緻線條圖示，動作照現實順序。每段約 **16 秒**：動作約 10 秒，接著倒數 3 秒（每秒嗶聲），最後 3 秒在底部 `I ________ in my free time.` 填入答案（動詞另一色）並「叮」一聲。不用商標，不用 AI 素材。先交 **play baseball、go camping** 兩支試片給老師看。

## 驗收條件
- [x] 每段動作順序合乎現實，人手碰到物品、不穿模。
- [x] 每段都有倒數 3 秒，最後都顯示完整答案句。
- [x] 11 支 MP4 和合輯都能播放，後排看得清楚字。
- [x] 兩支試片先經老師核准，才做其他 9 支。
