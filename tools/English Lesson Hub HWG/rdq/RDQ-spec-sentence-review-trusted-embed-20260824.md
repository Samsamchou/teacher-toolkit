---
rdq_version: 1
edition: chatgpt-app
task: 可信任口說站頁內嵌入
domain: dev
date: 2026-08-24
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 3
  revisions: 1
downstream: self
---

# RDQ 需求規格：口說評測站安全嵌入 Lesson Hub

## 一句話任務
讓教師投影筆電可在 Lesson Hub 的 Live Interactive Practice 頁內載入並操作可信任的口說評測站，包含麥克風錄音、全螢幕與安全的新分頁備援。

## 已確認
- 採用 **1A**：教師在投影筆電的 Lesson Hub iframe 內直接操作、錄音及進行口說彈珠活動。
- 採用 **2A**：建立精確來源的可信任網站白名單；第一個來源為 `https://setencerevieworalpractice.web.app`，未列入的一般網址仍維持新分頁。
- 採用 **3A**：本次只新增通用能力，不自動修改、插入或覆蓋任何 Lesson／Step；教師日後自行在 Teacher Studio 貼入網址。
- 正式口說站允許所有 HTTPS `*.web.app` 與 `*.firebaseapp.com` 父頁內嵌；不是只允許 Lesson Hub 的單一正式網域。
- 本次以教師的 Windows Chrome 投影筆電為主要驗收環境，不重新設計手機與 iPad 版面。
- 麥克風採最大委派：口說站使用 `Permissions-Policy: microphone=*`，Lesson Hub 對已辨識的可信任口說站 iframe 使用 `allow="microphone *; fullscreen *"` 或等效最大權限；瀏覽器仍會要求使用者親自同意麥克風權限。
- 兩站完成程式、測試與預覽後，直接正式部署 `setencerevieworalpractice` 與 `lesson-hub-v03` 的 Firebase Hosting；不再另外等待一次部署授權。
- 正式口說站目前以 CSP `frame-ancestors 'none'` 與 `X-Frame-Options: DENY` 禁止內嵌；Lesson Hub iframe 目前只授予 `fullscreen`，尚未授予麥克風。
- 口說站的 Anonymous Auth、App Check、錄音、AI 評分、Student ID 與 Results 繼續由原站處理；Lesson Hub 不代理、不複製、不合併資料。

## 已確認風險例外
- `*.web.app` 與 `*.firebaseapp.com` 可由其他 Firebase 使用者建立；將兩者加入 `frame-ancestors` 會擴大可嵌入口說站的父頁範圍，增加點擊劫持與介面偽裝風險。這是本次明確接受的例外。
- `Permissions-Policy: microphone=*` 與 iframe 最大委派會擴大麥克風能力範圍；瀏覽器的首次授權提示、網址列權限狀態與使用者撤銷權限仍保留，網站不繞過瀏覽器同意。
- Lesson Hub 仍只把明確列入可信任清單的口說站辨識為頁內嵌入；未知 `*.web.app`／`*.firebaseapp.com` 網址不會因此自動取得頁內嵌入或麥克風權限。

## 已採納建議
- 頁內模式固定保留全螢幕與新分頁；框架、App Check 或麥克風失敗時提供可操作的備援提示。
- 兩站身分、錄音、評分與 Results 資料完全分離，不保存帳密、Cookie 或第三方工作階段。
- 完成單元測試、雙解析度預覽、一般／無痕 Chrome 與麥克風驗收後，直接部署兩站 Firebase Hosting，接著讀回正式標頭、資產與實際嵌入結果。

## 本次不納入
- 自動修改任何現有 Lesson、預設塞入所有 Live Interactive Practice、學生 QR 流程或手機／iPad 版重設計。
- 代理／重新代管口說站、保存帳密或 Cookie、繞過 Anonymous Auth、App Check 或瀏覽器麥克風同意提示。
- 合併兩站 Firebase 專案、匿名帳號、Student ID、錄音、成績或教師 Results。
- 部署 Functions、Firestore／Storage 規則、Secret 或修改正式資料；本次正式變更範圍只有兩個 Firebase Hosting。

## 一段式需求規格
在 English Lesson Hub V03 建立可擴充的**可信任 Web Practice 白名單**，先只納入 `https://setencerevieworalpractice.web.app`；教師把此 HTTPS 網址貼入任一 Live Interactive Practice 時，Lesson Hub 將它辨識為頁內嵌入，提供滿版投影、全螢幕與新分頁備援，並對該可信任口說站 iframe 使用最大麥克風與全螢幕委派，其他一般 Embed 不會自動取得麥克風。同時在口說評測站把 CSP `frame-ancestors` 從全面拒絕改為允許自身及 HTTPS `*.web.app`、`*.firebaseapp.com` 父頁，移除衝突的 `X-Frame-Options: DENY`，並設定 `Permissions-Policy: microphone=*`；瀏覽器仍保留麥克風同意提示。既有 Anonymous Auth、App Check、錄音、AI 評分及 Results 安全流程維持不變，未知網址仍降級為新分頁，本次不修改任何 Lesson、不重設手機／iPad、不合併兩站資料。兩個專案完成自動測試、Windows Chrome 一般／無痕、1366×768／1920×1080、預覽與麥克風驗收後，直接正式部署 `setencerevieworalpractice` 與 `lesson-hub-v03` Hosting，並讀回正式標頭、資產與實際嵌入結果。

## 驗收條件
- [ ] 直接貼入口說站網址會顯示「頁內嵌入」，其他未知 `*.web.app` 仍顯示新分頁；沒有任何既有 Lesson 被自動修改。
- [ ] 正式 CSP 接受 HTTPS `*.web.app`／`*.firebaseapp.com` 父頁並阻擋非 Firebase Hosting 父頁；`X-Frame-Options: DENY` 已移除。
- [ ] 可信任口說站 iframe 取得最大麥克風委派，瀏覽器仍顯示授權提示；其他一般 Lesson Hub Embed 不會自動取得麥克風。
- [ ] Lesson Hub 內可完成 Anonymous Auth、麥克風授權、錄音、AI 評分與至少一局保存；失敗時可安全改開新分頁，不遺失 Lesson Flow。
- [ ] 兩站既有測試及新增安全測試通過，1366×768／1920×1080 一般與全螢幕無 Lesson Hub 額外捲動；預覽通過後直接部署兩站 Hosting，正式讀回與嵌入冒煙測試也通過。
