---
rdq_version: 1
edition: chatgpt-app
task: 收納投影工具並放大 Lesson Hub 教學內容
domain: dev
date: 2026-08-18
status: confirmed
telemetry:
  mode: full
  rounds: 2
  questions: 5
  q4_adopted: 4
  revisions: 1
downstream: elementary-vocabulary-site-builder
---

# RDQ 需求規格：Lesson Hub 投影工具與大畫面

## 一句話任務
將教師端抽籤、倒數與畫筆收為小圖示，擴充抽籤／圖形畫筆，並讓各 Lesson 主內容適合大螢幕投影。

## 已確認
- 左側使用窄版小圖示列；點選才浮出對應面板，同時只開啟一個工具。
- 抽籤只使用 **01–30** 兩位數、不重複抽取，顯示已抽號碼並提供重新開始。
- 每次抽一位固定進行 **4 秒**亂數動畫與持續抽選音效，沿用既有靜音狀態並相容 iPad Safari 的點按播放。
- 畫筆保留手繪，新增直線、長方形、圓形，並可匯出目前投影畫面。
- Lesson Flow 可收合；各教師頁面的主內容以寬版優先呈現，工具面板不可常駐擠壓 Wayground 或其他主要內容。
- 自有 Lesson Hub 頁面可匯出完整畫面；Wayground 等外部 iframe 僅匯出畫筆標註圖層與課程標題。
- 畫筆標註只存在目前頁面與目前瀏覽器工作階段；重整或切換 Lesson Flow 後不保存。
- 原有顏色、粗細與橡皮擦功能維持，但只在畫筆圖示展開後顯示。
- 本次完成程式與測試後，部署到 Firebase **hwg7teaching** 的既有 **lesson-hub-v03** Hosting；不部署或調整 Cloud Functions 與 Firestore 規則。
- 採納：Safari-safe 音效／靜音、圖示文字提示、外部練習最大化、適合觸控的圖示與按鈕尺寸。

## 本次不納入
- 擷取外部 Wayground iframe 的像素、跨課／跨裝置保存畫筆、學生端顯示教師工具、重新設計題庫、Firebase 資料結構、Cloud Functions 或 Firestore 規則。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG\preview** 中，將教師 Lesson 頁面的抽籤、倒數與畫筆改為左側窄版圖示列，圖示點選後以浮出面板呈現且同時僅開啟一項；抽籤面板使用 **01–30** 的不重複兩位數，按下「抽一位」後播放固定 **4 秒**連續抽選音效與快速亂數數字動畫，再顯示結果、已抽紀錄與重新開始；畫筆面板保留自由手繪，加入直線、長方形、圓形、原有顏色／粗細／橡皮擦及 PNG 匯出，標註只存在目前頁面與目前瀏覽器工作階段，自有頁面可匯出完整畫面，而 Wayground 外部 iframe 僅輸出畫筆標註圖層與課程標題；Lesson Flow 可收合、工具面板不常駐佔位，讓 Wayground Live Interactive Practice 與其他教師頁面主內容盡量填滿 **1920×1080** 投影範圍，同時保留既有單元多巴胺配色、Comic Relief 與學生端隔離；完成測試後只部署至 Firebase 專案 **hwg7teaching** 的既有 **lesson-hub-v03** Hosting，不變更 Cloud Functions 或 Firestore 規則。

## 驗收條件
- [ ] 三項工具平時只顯示小圖示，點選後才開啟面板；圖示具文字提示與觸控尺寸。
- [ ] 抽籤只抽 **01–30**、同一輪不重複、4 秒動畫／音效結束才定案，靜音與重設可用。
- [ ] 畫筆可畫自由線、直線、長方形、圓形；PNG 匯出符合自有頁面／外部 iframe 的範圍規則。
- [ ] 在 **1920×1080** 教師投影檢查中，主要內容比現有介面明顯擴大，Lesson Flow 與工具不再固定壓縮內容。
- [ ] 通過測試後，僅將已驗證建置發布至 **lesson-hub-v03**，並確認公開網址回應新版本。
