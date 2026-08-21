---
rdq_version: 1
edition: chatgpt-app
task: Web Practice 支援公開與內嵌連結
domain: dev
date: 2026-08-21
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 2
downstream: self
---

# RDQ 需求規格：Web Practice 公開連結與 Embed

## 一句話任務
讓 Live Interactive Practice 用同一輸入欄位安全接受公開分享網址、Embed URL 或完整 iframe code，並依類型選擇新分頁或 Lesson Hub 頁內互動。

## 已確認
- Teacher Studio 保留單一輸入欄位並自動辨識三種輸入；保留 Display name。
- 公開分享連結不能內嵌時，舞台顯示大型「開啟互動網頁」按鈕；教師點擊後開新分頁，Lesson Hub 原分頁保留。
- Embed URL 或完整 iframe code 會在 Lesson Hub 內嵌顯示，保留全螢幕與「新分頁開啟」。
- Canva Embed、明確 Embed URL、iframe code 與既有 Wayground 網址預設為「頁內嵌入」。
- 完整 iframe code 只擷取安全的 HTTPS src，不執行其他 HTML、script、style 或事件屬性。
- 採納固定新分頁備援、連結狀態提示、測試連結、拒絕內嵌時不顯示空白 iframe，以及 Canva／Wayground／投影尺寸測試。
- 程式、測試與預覽全部通過後，部署至正式 Firebase Hosting `lesson-hub-v03`。
- 教師需要登入 Canva／Wayground 時，只在平台官方頁面親自登入並沿用瀏覽器自己的工作階段；Lesson Hub 不讀取、傳送或保存帳密、Cookie 與登入憑證。
- 只有教師擁有且合法匯出的 HTML、PDF、影片等檔案可上傳至自己的 Firebase；不代理或重新代管 Canva／Wayground 完整網站。

## 已確認執行邊界
- 已知 Canva 公開分享網址與未知的一般 HTTPS 網址預設為「新分頁」。
- 不以代理伺服器繞過第三方網站的 X-Frame-Options／CSP，也不嘗試取得第三方登入狀態。
- 正式部署只更新 Firebase Hosting target `lesson-hub-v03`；不部署 Functions、Firestore／Storage 規則，也不變更匿名成績或雲端教材資料。

## 已採納建議
- 所有頁內嵌入固定保留「新分頁開啟」備援。
- 只接受 HTTPS，安全解析 iframe src，拒絕任意 HTML 與 JavaScript URL。
- Teacher Studio 提供「測試連結」及「頁內嵌入／新分頁」辨識結果。
- 已知不可內嵌的公開分享連結直接顯示啟動畫面，不先載入失敗 iframe。
- 使用 Canva 公開連結、Canva Embed、Wayground、1366×768 與 1920×1080 做回歸驗收。

## 本次不納入
- 繞過第三方網站的內嵌限制、代管或代理第三方完整網頁。
- 自動登入 Canva／Wayground、保存帳密、cookie 或第三方工作階段。
- 手機／iPad 版全面重新設計。

## 一段式需求規格
修改 English Lesson Hub V03 的 **Live Interactive Practice／Web Practice**：Teacher Studio 的單一欄位可貼入 **HTTPS 公開分享網址、Embed URL 或完整 iframe code**；系統安全擷取 iframe 的 HTTPS src 並顯示辨識狀態與測試操作。已知 Canva 公開分享連結及未知的一般網址以大型啟動卡呈現，點擊後開新分頁且保留 Lesson Hub；Canva Embed、既有 Wayground 與明確 Embed 輸入在教學舞台內顯示，保留全螢幕和新分頁備援。教師只在第三方官方頁面親自登入並沿用瀏覽器工作階段；Lesson Hub 不代理第三方完整網站，也不讀取或保存帳密、Cookie 或登入憑證。自動測試、正式建置與投影預覽通過後，只部署 Firebase Hosting target **lesson-hub-v03**，並讀回正式站資產驗證。

## 驗收條件
- [x] `https://canva.link/6dmyzbaseejgv3s` 不再顯示拒絕連線 iframe，而是可點擊的新分頁啟動畫面。
- [x] Canva 官方 Embed URL／code 可在 Lesson Hub 內顯示，且能全螢幕及另開分頁。
- [x] 既有 Wayground 內嵌流程不退化；未知一般 HTTPS 網址安全降級為新分頁。
- [x] 非 HTTPS、`javascript:`、無 src 或含惡意 HTML 的輸入會被拒絕並顯示可操作提示。
- [x] 自動測試、正式建置及 1366×768／1920×1080 投影版面驗證通過。
- [x] Firebase Hosting `lesson-hub-v03` 部署成功，正式首頁與新版 JS／CSS 資產均讀回 HTTP 200；Functions、資料庫規則與資料保持不變。
