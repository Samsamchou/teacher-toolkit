---
rdq_version: 1
edition: chatgpt-app
task: 製作 HWG7 U01 第一節課教材與題庫
domain: dev
date: 2026-08-17
status: draft
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: self
---

# RDQ 需求規格：HWG7 Unit 1 第一節課

## 一句話任務
為 English Lesson Hub 製作 HWG7 Unit 1 第一節課的真實電子書入口、手動簡報導覽及可審核的 Vocabulary Quiz A／B 題庫。

## 已確認
- 採 Phase 1B：可操作 Prototype 加真實 E-book／Wayground 測試；交付 Firebase Hosting 測試站，Student ID 結果跨裝置寫入 Firestore，並納入真實圖片、音檔與媒體流程。
- E-book 使用 **https://h5.hle.com.tw/toolbar/release/index.html?key=ada138a7-e48e-4d2e-9ecc-ea2290864493**，優先內嵌並保留新分頁 fallback。
- Type A 使用 **HWG7 U01/Landmark food AI pics** 的 10 張國家圖片，共 10 題；每題 4 個國家選項。
- Type B 使用 **Here We Go(7)單字圖卡/HWG7 U1/mp3** 的 8 個音檔，共 8 題；每題 4 個國家選項。
- 兩類全部題目、4 個選項、正解與素材路徑須先列出供教師審核，並保存成題庫後才能整合網站。
- 高解析圖片轉 JPG，目標上限 **1920×1080**；簡報不自動輪播，由使用者手動切換上一頁／下一頁。

## 待確認假設
- 直式圖片採保留比例縮放，長寬皆不超過 **1920×1080**，不裁切、不拉伸、不放大；原始 PNG 永久保留。
- `4. Sinagapore.mp3` 保留原檔名，但題庫顯示與正解統一為 **Singapore**。
- 審核稿固定列出 4 個選項；正式 Quiz 每次作答時才隨機打散選項順序。
- Firebase 專案尚未指定；先建立 Firebase-ready 結構，待教師親自登入並確認測試專案後才連接、部署與寫入真實資料。
- Firestore 第一階段只存匿名 Student ID，不存姓名；正式使用前需通過安全規則、刪除流程及匯出測試。

## 已採納建議
- 先完成 mock-data Prototype，再通過 Firebase 閘門；iframe／網路失敗提供 fallback。
- Student ID 匿名化；第一版提供 JSON／CSV 匯出。
- 完成 1920×1080、iPad 橫向與 iPad 直向測試後才接受介面。

## 本次不納入
- 其他 Unit、未提供素材的完整六步 Lesson Flow、正式站部署、保存教育雲帳密或自動代登入。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG** 中，先建立 HWG7 Unit 1 第一節課的可審核題庫：Type A 依 **HWG7 U01\Landmark food AI pics** 的 10 張圖片製作 10 題 Look and Choose，Type B 依 **Here We Go(7)單字圖卡\HWG7 U1\mp3** 的 8 個音檔製作 8 題 Listen and Choose，每題均列 4 個選項、正解及來源路徑；教師確認題庫後才整合至手動導覽、無自動輪播的 Lesson Hub，並加入翰林 E-book 內嵌／新分頁 fallback、Firebase Hosting 測試交付、匿名 Student ID Firestore 結果與 JSON／CSV 匯出。圖片轉檔須保留原檔與比例，輸出 JPG 且不超過 **1920×1080**。

## 驗收條件
- [ ] 題庫含 Type A 10 題、Type B 8 題，每題恰有 4 個選項、唯一正解、素材路徑，且全部先經教師審核。
- [ ] 10 張圖片與 8 個音檔逐一對應；`Sinagapore` 顯示為 `Singapore`，原始素材不覆寫。
- [ ] JPG 轉檔不裁切、不拉伸且不超過 1920×1080；簡報只允許手動 Previous／Next，不自動輪播。
- [ ] E-book 具 iframe 與新分頁 fallback；Firebase 只在教師確認測試專案與安全規則後部署。
