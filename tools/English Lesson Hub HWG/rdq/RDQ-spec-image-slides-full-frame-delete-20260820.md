---
rdq_version: 1
edition: chatgpt-app
task: Image Slides 完整顯示並清除舊圖
domain: dev
date: 2026-08-20
status: confirmed
telemetry:
  mode: full
  rounds: 2
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: self
---

# RDQ 需求規格：Image Slides 完整顯示與舊圖清除

## 一句話任務
讓所有 Image Slides 在一般及全螢幕投影時完整呈現圖片，並在雲端 Lesson 儲存成功後刪除移除或替換的舊圖。

## 已確認
- 一般畫面保留精簡標題、頁碼及 Previous／Next，圖片縮放至剩餘空間且不產生外層上下捲動。
- 全螢幕保留精簡頁碼及 Previous／Next，控制列位於圖片外，不遮住圖片。
- 所有直式、橫式、超寬及小尺寸圖片均保持原始比例，不裁切、不拉伸；小圖不強制放大。
- 修正套用所有目前與未來的 Image Slides，不限 HWG7 Unit 1。
- 移除或替換圖片時不顯示確認；Save Lesson 成功寫入雲端後，由受保護的伺服器刪除舊圖。
- 匿名瀏覽器仍不能列出、覆寫或刪除 Image Slides；跨筆電刪除由既有教師雲端工作階段處理。
- 完成程式、測試與正式 Firebase Hosting／Functions 部署。

## 待確認假設
- 只刪除合法 `teacher-image-slides/` 雲端物件；本機路徑、外部網址、影片與 PDF 不納入圖片清理。
- 刪除暫時失敗時保留伺服器待刪清單，介面顯示實際狀態，下一次雲端 Save Lesson 自動重試。

## 已採納建議
- 使用標題、`minmax(0, 1fr)` 圖片區、導覽列的固定三列版面。
- 嚴格限制圖片框可用高度，使用完整置中縮放。
- 修正套用所有 Image Slides。
- 自動測試直式、橫式、超寬與小尺寸圖片。
- 驗收 1366×768 與 1920×1080 的一般及全螢幕行為。

## 本次不納入
- 不重新裁切、壓縮或改寫原始圖片。
- 不開放匿名瀏覽器直接刪除雲端圖片。

## 一段式需求規格
修改 **English Lesson Hub** 的所有 Image Slides，使一般投影與全螢幕皆以固定三列舞台分配標題、圖片及導覽控制，圖片依容器尺寸動態縮小、完整置中且不放大原始小圖；任何比例均不得裁切、拉伸或被控制列遮住。教師移除或替換合法 `teacher-image-slides/` 圖片後，必須先成功保存雲端 Lesson，再由既有受教師工作階段保護的 Functions 刪除舊物件且不顯示確認；匿名 Storage 刪除繼續禁止，失敗項目保留待刪並於下一次雲端儲存重試。完成自動測試、正式建置、Firebase Hosting／Functions 部署與正式站驗收。

## 驗收條件
- [ ] 直式、橫式、超寬及小圖在一般與全螢幕均四邊完整可見，底部句子不被切割。
- [ ] 標題、頁碼及 Previous／Next 位於圖片外，外層 Lesson Hub 不產生額外上下捲動。
- [ ] 雲端 Save Lesson 成功後，移除／替換的舊圖由伺服器刪除；失敗會明確顯示並可重試。
- [ ] 匿名瀏覽器不能列出、覆寫或刪除圖片；測試、建置、部署與線上檢查全部通過。
