---
rdq_version: 1
edition: chatgpt-app
task: 首頁加 Safari Count、he/she 版卡片與三個老師頁按鈕
domain: dev
date: 2026-11-26
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: self
---

# RDQ 需求規格：Class Activities 首頁加入口與老師頁按鈕

## 一句話任務
在 talktofriends 首頁 Class Activities 加上 he/she 版與 Safari Count 學生卡片，以及三個活動的老師頁按鈕。

## 已確認
- 首頁四張學生卡片並排（1A）：festivals → World Routines Trip（I 版）→ World Routines Trip: He/She → Safari Count。
- 卡片文字（2A）：
  - he/she 版：👫 **World Routines Trip: He/She**／What time does he/she …? / 世界作息之旅 he/she 版
  - Safari：🦒 **Safari Count**／How many … are there? / 數數動物園
- 先本機做好、截圖給老師看，老師說可以才部署（3A）。
- 老師新增：**所有版本的老師頁按鈕都放在首頁 Class Activities**：
  - World Routines I 版 → `/world-routines/teacher`
  - World Routines he/she 版 → `/world-routines-he-she/teacher`
  - Safari Count → `/safari-count/teacher`

## 已採納建議
- ① 卡片加年級小字：I 版與 he/she 版「六年級 HWG7 U04」，Safari「五年級 HWG5 U4」。
- ② `/teacher` 老師頁也補上 he/she 版與 Safari 的老師後台連結（目前只有 I 版）。
- ③ he/she 版用 👫 圖示，和 I 版的 🌍 分開。
- ④ 部署後只 commit `app/ClassActivities.tsx`、`app/components/TeacherPortal.tsx`（與必要的 CSS）。

## 待確認假設
- 老師頁按鈕放在學生卡片下方，單獨一排「Teacher / 教師」小按鈕，比卡片小、不搶學生目光 → 預設如此。
- 老師頁本來就要老師登入，學生點到也進不去 → 不另外隱藏按鈕。
- festivals 子頁（/festivals）不顯示這些卡片與按鈕，維持原樣。

## 本次不納入
- 不改任何活動內容、函式、資料庫規則；只部署 hosting。
- 網站原始碼其他專案還沒 commit 的改動不處理。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\monster-in-my-mind-site** 修改 **app/ClassActivities.tsx**：首頁（不含 /festivals）學生卡片依序為 festivals、World Routines Trip（🌍，/world-routines，小字加「六年級 HWG7 U04」）、👫 **World Routines Trip: He/She**（/world-routines-he-she，「What time does he/she …? / 世界作息之旅 he/she 版」＋「六年級 HWG7 U04」）、🦒 **Safari Count**（/safari-count，「How many … are there? / 數數動物園」＋「五年級 HWG5 U4」）；卡片下方加一排較小的老師頁按鈕，連到 **/world-routines/teacher**、**/world-routines-he-she/teacher**、**/safari-count/teacher**；**app/components/TeacherPortal.tsx** 也補上 he/she 與 Safari 老師後台連結。在 C 槽暫存副本建置與測試，本機截圖首頁（桌機＋iPad 寬度）給老師看；老師同意後先比對線上（最後發布時間、public 差異只能是首頁程式與新 bundle），只部署 hosting（`--account u9431818@gmail.com`），部署後讀回正式首頁，最後只 commit 這兩個檔案（＋必要 CSS）並 push。

## 驗收條件
- [ ] 正式首頁看得到四張學生卡片與年級小字，各自點進正確網址。
- [ ] 首頁三個老師頁按鈕各自打開正確的老師後台；/teacher 也有三個連結。
- [ ] iPad 寬度卡片不擠壞、不重疊。
- [ ] 部署只動 hosting，其他活動頁面照常運作。
