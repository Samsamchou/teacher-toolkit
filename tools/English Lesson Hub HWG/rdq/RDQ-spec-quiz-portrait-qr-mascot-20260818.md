---
rdq_version: 1
edition: chatgpt-app
task: 投影片完整顯示與 Quiz QR 入口
domain: dev
date: 2026-08-18
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: elementary-vocabulary-site-builder + imagegen
---

# RDQ 需求規格：Quiz 直式圖、QR 與角色

## 一句話任務
讓教師投影片完整顯示直式圖片，並更新所有 Vocabulary Quiz 的匿名學號入口、QR 與共用角色。

## 已確認
- 圖片投影片一律保留比例、置中、完整顯示，不裁切、不拉伸；原始圖檔不修改。
- 移除 Quiz 入口的兩段匿名資料與計分規則說明；資料保存與 Firestore 保護流程不變。
- 欄位名稱改為「輸入學號」；Start 按鈕字級最大，欄位標籤次大，維持只接受五碼學號。
- 教師投影的 Quiz 入口右上顯示高對比 QR；掃描後直達相同 book、unit、lesson 的學生作答入口。
- 用 imagegen 產生一張透明背景、1:1、3D Q 版原創 Word Master Monster，所有 Quiz 共用並微微跳動。
- 加入減少動態偏好支援；所有現有與未來 Vocabulary Quiz 共用此版面；程式、測試後正式部署 Firebase Hosting。

## 待確認假設
- QR 顯示在教師模式的 Quiz 入口，不在學生作答頁重複顯示。
- 直式圖片兩側以既有多巴胺／單元背景留白，不建立圖片內部捲動。

## 已採納建議
- QR 固定高對比與「掃碼開始 Quiz」提示，提升投影掃描成功率。
- 只移除視覺說明，不改變匿名 Auth、Firestore 資料結構或安全規則。
- 角色在系統設定減少動態時保持靜止。
- 透過共用元件自動套用後續 Vocabulary Quiz。
- 保留所有原始教材與投影片圖片，不重新編碼或覆寫。

## 本次不納入
- Firestore 規則、Anonymous Auth、Cloud Functions、秘密資料及學生端行動版最佳化的改動。

## 一段式需求規格
在 **English Lesson Hub HWG / preview** 中，將教師 Lesson Flow 的圖片投影片調整為以 `contain` 保留原始比例、完整置中顯示，讓直式圖片不被裁切或遮擋；更新共用 Vocabulary Quiz 入口，移除既有匿名資料與計分規則文字，將欄位標籤改為 **「輸入學號」** 並使 Start 按鈕字級最大。重用既有學生直達網址產生器，在教師投影 Quiz 入口右上加入帶有 **「掃碼開始 Quiz」** 的高對比 QR，掃描後開啟相同 book、unit、lesson 的學生作答入口。使用 imagegen 生成一張透明背景、**1:1**、3D Q 版原創 **Word Master Monster**，置入所有 Quiz 的右上角並加入可降低動態的輕微跳動效果；完成程式與測試後，只部署 Firebase Hosting **lesson-hub-v03**。

## 驗收條件
- [ ] 直式投影片完整可見且未裁切、未拉伸，原始圖片未變更。
- [ ] Quiz 入口只顯示「輸入學號」與最大 Start 按鈕，不顯示兩段技術說明。
- [ ] 教師入口 QR 可導向同一節課的學生 Vocabulary Quiz；學生頁不重複顯示 QR。
- [ ] 共用角色與微動效果在各 Vocabulary Quiz 生效，減少動態設定下保持靜止。
- [ ] 前端測試、建置及 Firebase Hosting 部署驗證通過。
