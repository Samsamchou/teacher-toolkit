---
rdq_version: 1
edition: chatgpt-app
task: Lesson Hub 媒體上傳與簡報流程
domain: dev
date: 2026-08-19
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: self
---

# RDQ 需求規格：Lesson Hub 媒體上傳與簡報流程

## 一句話任務
改善圖片投影片顯示，並在教師通行碼保護下新增影片與 PDF 簡報上傳、投影流程及指定介面文字調整。

## 已確認
- Image Slides 必須接受各種尺寸與長寬比例的圖片，完整呈現、不裁切、不拉伸。
- Vocabulary Quiz 的 Word Master Monster 移到 QR Code 下方一些，尺寸放大 **35%**。
- 刪除 Reward Slot Machine 首段「按下 SPIN 後，……」說明文字。
- Results 的 **Type A** 顯示為 **Look and choose**，**Type B** 顯示為 **Listen and choose**。
- Teaching Video 支援直接上傳 **MP4**（單檔上限 **500 MB**），並保留既有 HTTPS 影片網址方式。
- 新增「**簡報**」Lesson Flow，預設位於 **Teaching Video** 後、**Vocabulary Image Slides** 前。
- 簡報在 Studio 直接上傳 **PDF**；PowerPoint（PPT／PPTX）須先由教師轉成 PDF 再上傳。
- 簡報初始顯示 PDF 第一頁，支援投影全螢幕及回到一般嵌入畫面。
- 上傳內容永久保存於 Firebase；Studio 的上傳、替換與移除，必須通過既有教師共用通行碼驗證。學生端維持唯讀，不可上傳。

## 待確認假設
- 影片與 PDF 為每節課的選用教材；有設定時，各保留一個目前啟用檔案，上傳新檔即取代舊檔。
- 「縮小」預設為離開全螢幕、回到 Lesson Flow 內正常大小，不製作可任意拖曳的浮動視窗。
- 小尺寸圖片不刻意放大超過原始像素；圖片以置中留白方式完整呈現。
- PDF 僅在教師 Lesson Flow 使用；學生掃 QR 後仍只進入 Vocabulary Quiz，不看見教師教材。
- 已取得正式 Firebase Hosting、Functions 與 Storage Rules 部署授權；仍須先通過程式與安全測試。

## 已採納建議
- Image Slides 使用自適應投影舞台，控制列不遮住圖片。
- 上傳提供替換與移除；確認新檔可用後才清除被取代的舊檔。
- Studio 顯示檔案格式、大小與可理解的上傳失敗原因。
- 影片與簡報都能在 Teacher Studio 啟用、停用與調整 Lesson Flow 順序。
- 以 **1920×1080** 教師投影流程檢查簡報首畫面、全螢幕、回到 Lesson Flow 與媒體播放。

## 本次不納入
- 不提供 PPT／PPTX 的雲端自動轉 PDF。
- 不開放學生或未驗證使用者上傳教材。
- 不改動匿名學生作答、Firestore Results 資料格式或教師成績匯出／刪除流程。

## 一段式需求規格
在 **English Lesson Hub V03** 改善 Image Slides，使圖片在教師的 **1920×1080** 投影 Lesson Flow 中依自身比例完整置中顯示、不裁切、不拉伸且不被控制列遮擋；將 Vocabulary Quiz 的 **Word Master Monster** 移至 QR Code 下方並放大 **35%**；刪除 Reward Slot Machine 的首段 SPIN 說明，並將 Results 題型標籤改為 **Look and choose** 與 **Listen and choose**。以既有教師共用通行碼建立教師媒體管理權限，讓 Teacher Studio 可視需要上傳、替換、移除並啟用／停用單檔最大 **500 MB** 的 MP4，且保留 HTTPS 影片網址；新增位於 Teaching Video 後、Vocabulary Image Slides 前的「**簡報**」流程，教師可視需要上傳 PDF（PPT／PPTX 先自行轉 PDF），預設開啟第一頁，支援全螢幕與回到一般嵌入投影畫面。教材檔永久保存於 Firebase，未驗證者不可上傳，學生 QR 路由維持僅限 Quiz；完成程式、資料保護與自動測試後，部署 **Firebase Hosting、Cloud Functions 與 Storage Rules** 至既有正式站。

## 驗收條件
- [ ] 橫式、直式與正方形圖片在 Image Slides 均完整可見，沒有裁切、變形或被控制列遮擋。
- [ ] Quiz QR、Monster 位置與尺寸、拉霸文字及 Results 題型標籤符合指定內容。
- [ ] 通過教師通行碼後，可在 Studio 上傳／替換／移除 MP4 與 PDF；未驗證者無法上傳。
- [ ] PDF 第一頁可在簡報流程顯示，並可切換全螢幕和一般畫面；影片上傳與既有網址播放均可用。
- [ ] 自動測試、正式建置與 Firebase 安全檢查通過，並部署至既有正式站。
