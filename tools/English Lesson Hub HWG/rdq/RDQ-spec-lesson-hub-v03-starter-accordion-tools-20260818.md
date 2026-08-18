---
rdq_version: 1
edition: chatgpt-app
task: 調整 Starter、Unit 收納與教師工具
domain: dev
date: 2026-08-18
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 2
downstream: elementary-vocabulary-site-builder
---

# RDQ 需求規格：Starter 節數、Unit 收納與教師工具

## 一句話任務
將 HWG5／HWG7 Starter 縮為三節、Teacher Studio 改為 Unit 下拉課程清單，並將畫筆與倒數工具收納為投影友善側欄。

## 已確認
- **HWG5** 與 **HWG7** 的 **Starter** 僅保留 **Lesson 1–3**；每本教材的 **Unit 1–4** 維持 **Lesson 1–5**，標準課程總數改為 **46** 節（每本 **23** 節）。
- 既有瀏覽器本機資料中的 Starter **Lesson 4／5** 教材設定直接刪除；不轉為 Custom Lesson 或封存內容，既有 Firestore 匿名作答紀錄不刪除。
- Teacher Studio 先顯示 Unit；點擊 Unit 後才展開 Lesson 清單，同時間只展開一個 Unit。
- 展開後，點選 Lesson 名稱開啟 **Edit Lesson**；每一列右側保留小型 **開始上課**按鈕。
- Unit 清單中的 Duplicate／Reset 收進每一列的次要「更多」操作，不回復大型 Lesson 卡片。
- 所有 Unit 配色名稱文字均移除，包括 **Pink Punch、Fuchsia Flash、Electric Blue**；實際多巴胺配色、色點與 Unit 標題保留。
- 畫筆工具改為左側雙欄窄版圖示側欄，將圖形、顏色、粗細、清除與 PNG 匯出盡量收進側欄，不以大型浮出面板遮住教學內容。
- 倒數計時器歸零時播放 **6 秒**連續、明顯的鬧鐘音效；沿用全站音效開關，並在教師已點按啟動倒數後播放，以相容 iPad Safari；全站音效關閉時保持靜音。
- 採納：計數與提示同步更新、移除全部配色名稱、單一 Unit 展開、回歸測試舊課程／匿名成績／QR 連結。
- 已授權僅部署 Firebase **hwg7teaching** 的既有 **lesson-hub-v03** Hosting；不部署或調整 Cloud Functions、Firestore 規則或 Firebase Secret。

## 本次不納入
- Cloud Functions、Firestore 規則、Firebase Secret、學生端流程與題庫內容。
- 封存或轉移 Starter Lesson 4／5、跨裝置保存畫筆、變更既有匿名成績資料。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG\preview** 將 **HWG5** 與 **HWG7** 的 Starter 正式結構改為 **Lesson 1–3**，並在下一次本機載入時直接移除舊 Starter Lesson 4／5 的本機教材設定、保留匿名成績紀錄不變；其餘 Unit 維持 **Lesson 1–5**，所有計數、重設提示與資料驗證同步顯示 **10 Units／46 Lessons**。Teacher Studio 改為一次只展開一個 Unit 的下拉式 Lesson 清單，Starter 顯示 1–3、其餘 Unit 顯示 1–5，點選 Lesson 名稱開啟 **Edit Lesson**，右側提供小型 **開始上課**按鈕，並以次要更多操作保留 Duplicate／Reset。移除 Teacher Studio 所有色票名稱文字（包括 **Pink Punch、Fuchsia Flash、Electric Blue**），但保留多巴胺配色與 Unit 標題。教師 Lesson 的畫筆工具改為左側雙欄窄版圖示側欄，收納互動、手繪、直線、長方形、圓形、橡皮擦、顏色、粗細、清除與 PNG 匯出，確保 **1920×1080** 投影內容維持最大可視範圍；倒數計時器歸零時，在教師已點按啟動且全站音效開啟的條件下，播放自動停止的 **6 秒**連續鬧鐘音效。完成後執行資料遷移、Unit 展開、Edit／Start、QR、匿名成績、倒數音效與前端建置測試，然後只部署 Firebase **hwg7teaching** 的既有 **lesson-hub-v03** Hosting。

## 驗收條件
- [ ] Teacher Studio 顯示 10 個 Unit、46 個標準 Lesson；兩個 Starter 僅能看到 Lesson 1–3。
- [ ] 點擊 Unit 才展開清單，僅一個 Unit 展開；Lesson 名稱開啟 Edit，右側可開始上課。
- [ ] Unit 配色名稱文字完全不顯示，實際 Unit 配色仍正確。
- [ ] 畫筆側欄不再以大型浮出面板遮住教學內容；所有既有畫筆功能仍可使用。
- [ ] 倒數到 0 時，在開啟音效的教師端播放 6 秒鬧鐘，關閉音效時保持靜音。
- [ ] 本機 Starter 4／5 教材設定已刪除；既有匿名結果與 QR 路徑回歸測試通過。
- [ ] 正式建置通過後，僅 Firebase Hosting `lesson-hub-v03` 發布成功並回應 HTTP 200。
