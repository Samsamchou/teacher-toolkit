---
rdq_version: 1
edition: claude-code
task: 美化 5 張二水地點 3D 圖並重做試片
domain: video
date: 2026-11-13
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: rhythm-vocabulary-video
---

# RDQ 需求規格：二水地點 3D 圖美化

## 一句話任務
把 **supermarket、park、tea shop、restaurant、bookstore** 這 5 張 3D 圖重畫得乾淨、一看就知道是什麼地點，再重做試片。

## 已確認
- 美化方式：**Codex CLI 內建生圖**，以遊戲截圖當參考重畫，維持卡通 3D 風、保留建築外型（1A）。
- 範圍：supermarket、park（老師指定）＋ tea shop、restaurant、bookstore（2C）。
- 過關不動：post office、school、library、hospital、train station、museum、convenience store。
- 招牌改成英文單字：**SUPERMARKET、PARK、TEA SHOP、RESTAURANT、BOOKS**（3A）。
- 建議 ①–④ 全部採納。

## 待確認假設
- 加上看得出用途的元素：超市＝推車、蔬果；公園＝溜滑梯、樹、長椅；飲料店＝門口珍奶杯、遮陽棚；餐廳＝窗內餐桌、門口菜單架；書店＝櫥窗書架、移除電線桿和半透明方塊。
- 不畫人物，不放中文字（其他 7 張保留遊戲原本的中文招牌）。
- bookstore 招牌沿用遊戲裡的 **BOOKS**（不改成 BOOKSTORE）。
- 不另外收費（ChatGPT 方案內）；每張生成約 1 分鐘。

## 已採納建議
- ① 每張先出 **2 個版本**，老師挑一張。
- ② 角度、天空、光線比照其他 3D 圖（正面略高、藍天、正方形）。
- ③ 語音與節奏不變：只換圖，用已審過的聲音庫，不再生成語音。
- ④ 換圖後重做試片（第 1＋3 輪）給老師看。

## 本次不納入
- 改動遊戲本身的 3D 模型；改圖示卡；其他 7 張 3D 圖。

## 一段式需求規格
在 **`productions/ershui-planet-places/v01/`** 為 **supermarket、park、tea shop、restaurant、bookstore** 各生成 **2 張** 1:1 卡通 3D 風格重畫圖（Codex CLI 內建生圖，以 `source/3d/` 的遊戲截圖當參考），保留原建築外型，加上用途線索與英文招牌（SUPERMARKET、PARK、TEA SHOP、RESTAURANT、BOOKS），不畫人物、不放中文字。存到 `source/3d-beautify/`，做比較總覽給老師挑。挑定後更新 `cards/` 與 manifest，**不重做語音**，重渲試片（第 1＋3 輪）並跑 verify 與瀏覽器檢查，再交老師看。

## 驗收條件
- [ ] 10 張候選圖（5 地點 × 2）總覽交老師，老師每個地點選定 1 張。
- [ ] 選定的 5 張：學生一看能說出地點；英文招牌拼字正確；沒有中文字和人物。
- [ ] 新試片 verify 全過、語音指紋與舊試片相同；老師看過試片。
