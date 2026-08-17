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
  revisions: 1
downstream: self
supersedes: RDQ-spec-hwg7-u01-lesson1-20260817.md
---

# RDQ 需求規格：HWG7 Unit 1 第一節課

## 一句話任務
為 English Lesson Hub 製作 HWG7 Unit 1 第一節課的教師端電子書、手動簡報導覽及可審核的 Vocabulary Quiz A／B 題庫。

## 已確認
- 採 Phase 1B：可操作 Prototype 加真實教材測試；交付 Firebase Hosting 測試站，Student ID 結果跨裝置寫入 Firestore，並納入真實圖片、音檔與媒體流程。
- E-book 使用 **https://h5.hle.com.tw/toolbar/release/index.html?key=ada138a7-e48e-4d2e-9ecc-ea2290864493**；只放在教師端，優先內嵌並保留新分頁 fallback，學生端 iPad Safari 不顯示電子書。
- Type A 使用 **HWG7 U01/Landmark food AI pics** 的 10 張國家圖片，共 10 題；每題 4 個國家選項。
- Type B 使用 **Here We Go(7)單字圖卡/HWG7 U1/mp3** 的 8 個音檔，共 8 題；每題 4 個國家選項。
- 兩類全部題目、4 個選項、正解與素材路徑須先列出供教師審核，並保存成題庫後才能整合網站。
- 直式圖片保留比例，長寬皆不超過 **1920×1080**，不裁切、不拉伸、不放大；原始 PNG 永久保留，輸出轉 JPG。
- `4. Sinagapore.mp3` 保留原檔名，但題庫顯示與正解統一為 **Singapore**。
- 審核稿固定列出 4 個選項；正式 Quiz 作答時才隨機打散選項順序。
- Firebase 使用專案 **hwg7teaching**；Firestore 只存匿名 Student ID、不存姓名，正式使用前必須通過安全規則、刪除流程及匯出測試。
- 簡報不自動輪播，由使用者手動切換上一頁／下一頁。

## 待確認假設
- 題庫同步保存為 Markdown 審核稿與 JSON 網站資料檔；兩者由同一份資料產生並執行一致性檢查。
- Firestore 第一階段只寫入測試用匿名 Student ID；實際資料保留期限另於正式上線前確認。

## 已採納建議
- 先完成 mock-data Prototype，再通過 Firebase 閘門；iframe／網路失敗提供 fallback。
- Student ID 匿名化；第一版提供 JSON／CSV 匯出。
- 完成 1920×1080、iPad 橫向與 iPad 直向測試後才接受介面。

## 本次不納入
- 其他 Unit、未提供素材的完整六步 Lesson Flow、正式站部署、保存教育雲帳密或自動代登入、學生端電子書。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\English Lesson Hub HWG** 中，先建立 HWG7 Unit 1 第一節課的可審核題庫：Type A 依 **HWG7 U01\Landmark food AI pics** 的 10 張圖片製作 10 題 Look and Choose，Type B 依 **Here We Go(7)單字圖卡\HWG7 U1\mp3** 的 8 個音檔製作 8 題 Listen and Choose，每題均列 4 個選項、正解及來源路徑；教師確認題庫後才整合至手動導覽、無自動輪播的 Lesson Hub。翰林 E-book 只顯示於教師端，學生 iPad Safari 不放電子書。網站連接 Firebase 專案 **hwg7teaching**，以匿名 Student ID 保存 Firestore 結果並提供 JSON／CSV 匯出；圖片轉檔須永久保留原始 PNG、保留比例、不裁切、不拉伸、不放大，輸出 JPG 且不超過 **1920×1080**。

## 驗收條件
- [ ] Markdown／JSON 題庫皆含 Type A 10 題、Type B 8 題，每題恰有 4 個選項、唯一正解、素材路徑，且全部先經教師審核。
- [ ] 10 張圖片與 8 個音檔逐一對應；`Sinagapore` 顯示為 `Singapore`，原始素材不覆寫。
- [ ] JPG 轉檔不裁切、不拉伸、不放大且不超過 1920×1080；簡報只允許手動 Previous／Next，不自動輪播。
- [ ] E-book 只在教師端顯示並具 iframe／新分頁 fallback；學生端不顯示電子書。
- [ ] Firebase 專案為 `hwg7teaching`；Firestore 不存姓名，並通過安全規則、刪除與匯出測試後才部署。
