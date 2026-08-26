---
rdq_version: 1
edition: chatgpt-app
task: 初始化並修復 HWG5 Story AI 評分
domain: dev
date: 2026-08-26
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 4
  revisions: 1
downstream: initialize-project + firebase-ai-logic-basics
---

# RDQ 需求規格：HWG5 Story 專案初始化與 AI 評分修復

## 一句話任務
安全初始化本機專案、修復現有 Firebase 網站的 AI 音訊評分，驗證後同步、提交並部署。

## 已確認
- 本機根目錄：**C:\firebase-deploy\HWG5 SU to U04 Story**。
- 備份目錄：**G:\我的雲端硬碟\teacher-toolkit\tools\HWG5 SU to U04 Story**。
- Firebase 專案：**hwg5-su-to-u04-story**；修正完成且通過測試後部署至既有 Hosting。
- 保留錄音、逐字稿、分數、回饋、教師後臺及既有評分欄位與畫面。
- 改用 Firebase AI Logic SDK、目前穩定且支援音訊的 Gemini 模型、結構化 JSON 驗證與 App Check。
- 學生錄音及相連紀錄保留 **7 個月**，期滿後自動刪除。
- Google Drive 同步後，只提交本專案路徑並推送既有 **teacher-toolkit** GitHub，不混入其他變更。

## 待確認假設
- App Check 採 Web 正式環境的 **reCAPTCHA Enterprise**；本機測試使用私密 debug token，且不寫入 Git。
- 使用限制先以 Firebase／Google Cloud 專案配額、用量告警及前端防連點為主；具體門檻依一班約 **26 人**、每題最多 **3 次**估算，變更雲端配額前先顯示設定值。
- 7 個月按到期日欄位計算；Firebase TTL／Storage 生命週期可能延遲執行，不宣稱在到期瞬間刪除。
- 保留既有 Firebase 資料，不回寫、搬移或刪除尚未滿 7 個月的歷史紀錄。

## 已採納建議
- Firebase AI Logic + 穩定模型 + App Check；移除評分用 AI 金鑰的前端依賴。
- 保留評分契約並加入結構化輸出與回傳格式驗證。
- 設定用量限制、告警及 7 個月資料保存期限。
- 在混合父儲存庫只處理指定專案路徑。

## 本次不納入
- 不全面重做教師登入、Firestore／Storage 權限或其他非 AI 功能。
- 不主動撤銷或更換既有 TTS 憑證；將在交付時列為仍待處理的安全風險。
- 不更動題庫文字、評分準則、版面及既有資料內容，除非修復測試證明為必要。

## 一段式需求規格
在 **C:\firebase-deploy\HWG5 SU to U04 Story** 依現有檔案初始化 bilingual agent.md、補齊安全 .gitignore 並建立 main Git；將前端直接呼叫已停用 Gemini 1.5 與硬編碼評分憑證的流程，改為 **Firebase AI Logic SDK + App Check + 目前穩定音訊模型**，維持原評分欄位、教師畫面及錄音／Firestore 保存行為，加入結構化 JSON 驗證、用量保護與 **7 個月**到期刪除；完成本機自動與瀏覽器流程測試後，同步至指定 Google Drive 路徑，只提交該路徑至 **teacher-toolkit** 並推送，最後部署至既有 Firebase Hosting 專案 **hwg5-su-to-u04-story**，所有帳號登入與 Console 授權由使用者親自完成。

## 驗收條件
- [ ] 本機專案初始化完成，必需雙語規則、Git main 與安全忽略規則均經讀回確認。
- [ ] 真實瀏覽器可錄音並取得可驗證的評分 JSON，畫面及資料欄位與原流程相容，前端不再包含評分用 AI 憑證。
- [ ] App Check、用量告警與 7 個月刪除機制有可讀回的實際設定證據；未滿期資料保持不變。
- [ ] 本機與 Drive 檔案清單／大小／SHA-256 一致，只提交指定路徑，遠端 SHA 與正式 Hosting 版本均完成讀回驗證。
