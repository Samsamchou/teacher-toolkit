---
rdq_version: 1
edition: codex-desktop
task: 建立可跨學年度更新及供其他教師重製的 Homeworkclass Skill
domain: dev
date: 2026-08-29
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: skill-creator
---

# RDQ 需求規格：Homeworkclass 跨學年度與跨教師重製 Skill

## 一句話任務

把目前「英語作業與課堂紀錄」的建置、資料轉換、安全驗證、測試與部署交接流程做成可重複使用的 Codex Skill，讓同一位教師能以新學期課表與名單安全更新既有網站，也讓其他教師能建立資料完全隔離的同型空白網站。

## 使用對象與兩種模式

1. **學期更新模式**：在同一網站與同一 Firebase 專案新增學期版本；新學期可寫入，已關閉學期維持唯讀、可查詢與匯出，原有教學紀錄不得被覆寫。
2. **教師重製模式**：由其他教師取得去識別化的空白網站模板；每位教師使用自己擁有的 Firebase 專案，並由本人完成登入、6 位數通行碼、App Check、Secrets、計費與部署授權。

## 已確認輸入

- **首選**：Skill 提供的標準 Excel 範本，至少包含「學期設定、班級名單、科目、節次、固定課表」工作表及欄位說明；可完整表達非連續座號。
- **備援**：課表照片／JPG 加名單 Excel；辨識後必須先產生逐欄驗證報告，由教師確認日期、班級、科目、節次、時段、課程數及有效座號，再轉成標準格式。
- Excel 可能含學生姓名，但 Skill、網站原始碼、測試資料、報表範例與部署模板只保留 **班級及有效座號**；不得複製或保存姓名、正式學號、家長資料或其他個資。
- 班級、科目與節次均採 **資料驅動**，不得固定為目前八班、三科或七節；班級色彩由可辨識的多巴胺色盤自動分配，並檢查文字對比及相鄰班級辨識度。

## Skill 必須交付

- 一個可自動探索的個人 Codex Skill，能判斷並執行「學期更新」或「教師重製」流程。
- 標準 Excel 空白範本、欄位說明、範例資料及本機驗證工具。
- 去識別化的 Homeworkclass 空白網站模板；保留 React、TypeScript、Vite、Firebase Hosting、Authentication 自訂權杖、Cloud Functions、Firestore、App Check、匯出、國定假日與響應式介面基線。
- 來源解析報告、變更摘要、來源 SHA-256、產物 manifest、測試結果、部署清單與交接文件。
- 學期版本、由 UI 與 Firestore Rules 共同強制的舊學期唯讀、第三學期以上資料的「先匯出並讀回、再由教師確認受控清理」流程；不得自動刪除正式資料。

## 必經工作流程與紅燈

1. 讀取來源並建立 SHA-256 manifest；原始 Excel／照片保持不變。
2. 正規化為標準學期資料，產出班級數、有效座號數、科目數、節次數、固定課程數、缺欄、重複、無效日期、排課衝突及信心不足項目的報告；任何技術上限都必須在 schema 與報告明示。
3. **來源確認紅燈**：教師確認解析結果前，不得改寫網站學期資料或建立重製站。
4. 以隔離副本產生或更新程式，顯示逐檔變更摘要；不得直接覆寫正式來源或正式資料。
5. 執行資料驗證、單元測試、Firestore Rules Emulator、秘密掃描、production build，以及手機／平板／桌機響應式與匯出讀回驗證。
6. 學期更新先證明舊學期紀錄數與雜湊／匯出一致、舊學期唯讀、新紀錄具有 `semesterId`、重跑不重複且新學期可寫；教師重製則證明沒有帶入原教師的 Firebase ID、Secrets、PIN、電子郵件、名冊、正式資料、部署歷史或工作階段。
7. 先提供本機預覽、QA 報告、回復方案與部署精確範圍。
8. **Firebase 正式部署紅燈**：每一次 Hosting、Rules、Indexes、Functions、IAM、Secrets、App Check、計費或資料遷移均須依實際範圍另行取得教師明確授權；帳號登入與通行碼設定由教師本人完成。
9. 部署後讀回 Firebase project、Functions region、Rules／Functions／App Check 實際狀態、Hosting URL／headers／release、資料模式、登入、目前學期、課表／名單計數、主要流程及 console error；attempted 或 local-only 不得標示為完成。

## 安全與隔離不變條件

- 不把 PIN、雜湊、Secret、App Check debug token、session、cookie、服務帳戶或其他憑證寫入 Skill、模板、Git、聊天或命令參數。
- 不把目前正式 Firebase 資料、教師帳號、學生姓名或現有專案識別複製給其他教師；重製站從空白資料開始。
- 正式教學事件維持 append-only；資料遷移先備份、驗證、可回復，不在瀏覽器提供全量覆寫。
- 每位教師的 Firebase、Authentication、Functions、Secrets、App Check、Rules、Hosting、資料與費用責任彼此隔離。
- Skill 可準備命令、文件與本機產物，但不得因「建立／更新網站」的指令自動推定正式部署或付費授權。

## 驗收條件

- [ ] 用標準 Excel 執行一次隔離學期更新前向測試，所有日期、班級、座號缺號、科目、節次與課程數均與輸入一致；來源確認前不修改目標程式。
- [ ] 用課表圖片＋名單 Excel 執行一次備援測試，未確認的 OCR／人工判讀項目會列為阻擋，不會自行猜測後繼續。
- [ ] 學期更新保留舊資料且 UI 與 Rules 都拒絕對舊學期新增、修改及刪除；目前學期切換、報表與匯出可區分學期，跨週未結案邏輯只作用於可寫學期，重跑更新不會產生重複資料。
- [ ] 教師重製產物掃描不含原教師識別、Firebase 專案設定、Secrets、PIN、學生姓名或正式資料，且能以全新 Firebase 設定完成本機／Emulator 驗證。
- [ ] 任意合法班級、科目、節次與課表組合可由資料生成 UI、型別、驗證與 Firestore Rules 所需設定，不依賴目前八班／三科／七節常數。
- [ ] 自動測試、Rules Emulator、production build、360／768／1440 px 主要流程與匯出 QA 全部通過；失敗時 Skill 停止並保留報告。
- [ ] 未取得第二道正式部署確認時，Skill 明確停在本機成果與部署計畫；獲准後才部署，且以讀回證據結案。
- [ ] `skill-creator` 結構驗證通過，並由隔離代理依 SKILL.md 完成至少一個無正式部署的前向測試。

## 本次不納入

- 自動建立或共用教師 Firebase 帳號、代輸通行碼、代為同意 Blaze 費用，或未確認即正式部署。
- 任意格式 Excel 的無條件自動辨識；非標準格式必須人工對應，照片／OCR 永遠只是待確認草稿。
- 在教師之間複製正式資料、名冊姓名、Secrets、App Check 設定或登入工作階段。
- 未讀回備份就刪除超過兩學期的資料、直接改寫 append-only 歷程，或自動清理正式環境。
- 保證從模糊、裁切或無法辨識的課表照片得到正確結果；此類項目必須回到教師確認。
- 為每位教師客製與本系統無關的新功能；額外功能須另開 RDQ／變更規格。
- 跨教師統計、中央管理後臺或全校多租戶系統。

## 一段式需求規格

建立一個可自動探索的 `homeworkclass-site-builder` Codex Skill，提供資料驅動的標準 Excel 範本與照片備援解析，支援同站新增學期版本及為其他教師建立去識別化空白站。流程必須保存原始來源與 SHA-256、先產出解析驗證報告並等待教師確認，再於隔離副本產生變更、執行單元測試、Rules Emulator、production build、響應式與匯出 QA。跨學期更新不可覆寫舊資料，舊學期唯讀；跨教師重製不得帶入原教師帳號、Firebase 設定、Secrets、PIN、學生姓名或正式紀錄。每位教師使用自己的 Firebase，且所有正式部署、計費與安全設定都需另行明確授權並於部署後讀回驗證。

## 確認關卡

教師已於 2026-08-29 回覆 **「照這份開始」**，本文件狀態為 `confirmed`。後續依 `skill-creator` 建立、驗證與前向測試 Skill；本次確認 **不包含任何 Firebase 正式部署授權**。
