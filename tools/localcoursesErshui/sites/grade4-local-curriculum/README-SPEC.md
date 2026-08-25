# 四年級上學期在地課程｜網站開發規格包

本資料夾把「第4節數位教材｜iPad模擬線上購票網站設計規劃書（ChatGPT Sites完善版）」轉成可直接交付網站開發的規格、內容、資料契約與驗收案例。

這不是可執行網站，也沒有建立 ChatGPT Sites 專案、D1 資料庫、R2 儲存桶或部署網址。

## 來源與範圍

- 來源文件：`C:\firebase-deploy\在地課程\在地課程4年級上學期教案\02_第3-10週_坐火車趣集集.docx`
- 來源章節：第4節數位教材｜iPad模擬線上購票網站設計規劃書（ChatGPT Sites完善版）
- 完整規劃：四單元入口首頁、坐火車趣集集的線上購票練習、教師後台、事件重播、七頁 PDF、D1／R2、權限、保存及驗收。
- 預留介面：扇形車庫、閱覽鐵道風華、介紹五分車與認識小火車鐵道。

## 建議閱讀順序

1. `docs/WEBSITE_SPEC.md`：先理解學生端、教師端與非功能需求。
2. `content/site-content.json`：取得正式介面文字、單元、任務與模擬資料。
3. `docs/ROUTES_AND_API.md`：確認路由、API、授權與同步流程。
4. `contracts/events.schema.json`、`contracts/api-contract.json`：實作前後端資料驗證。
5. `db/schema.ts`、`db/migrations/0001_initial.sql`：建立 D1 結構與索引。
6. `content/asset-manifest.json`：製作四張 ImageGen 首頁場景素材。
7. `docs/TRACEABILITY_MATRIX.md`：逐項查核 Word 原始需求。
8. `tests/acceptance-tests.md`：實作完成後執行驗收。

## 穩定識別碼

- 單元：`unit.*`
- 購票步驟：`step.*`
- 操作事件：`event.*`
- 圖像素材：`asset.*`
- 驗收案例：`test.*`
- 需求：`REQ-S<章節>-<流水號>`
- 來源表格：`SRC-T01` 至 `SRC-T10`

識別碼不得因介面文案改寫而更動；資料庫、事件、API、測試及追溯矩陣均以識別碼串接。

## ChatGPT Sites 實作邊界

- 建站時必須使用 Sites 建立或提供的真實 `project_id`。
- `.openai/hosting.example.json` 只是結構提示，不得直接重新命名後部署。
- D1 邏輯綁定為 `DB`，R2 邏輯綁定為 `EVIDENCE_BUCKET`。
- 教師頁採 ChatGPT 登入辨識身分，伺服器再查詢 `teacher_allowlist`。
- 學生端公開，但學生只能建立自己的當次練習並以短效 token 追加事件。
- IndexedDB 只用於離線暫存；D1／R2 才是正式紀錄。

## 資料生命週期

1. 學號格式通過後，由伺服器建立不透明 `attempt_id` 與短效 attempt token。
2. 學生每次操作以連續 `seq` 追加事件；伺服器加上接收時間。
3. 每個步驟通過後建立一張網站內容區證據畫面。
4. 第七步完成後，學生端合成七頁 PDF，再由伺服器驗證並寫入 R2。
5. D1 保存查詢欄位、事件、證據索引及 R2 key。
6. 完成後鎖定事件；重做必須建立新 attempt。
7. 完成日起 365 天後，先刪 R2，再清 D1 學習內容並留下不含內容的刪除稽核紀錄。

## 實作接手檢核

- 不連接臺鐵真實訂票與付款。
- 不錄製真實螢幕、聲音或麥克風。
- 不儲存姓名、IP、電話、電子郵件、付款或真實訂票資料。
- 所有學生頁面顯示「模擬教材」警語。
- 所有精確文字由 HTML 呈現，不放進 ImageGen 圖片。
- iPad 直式、橫式、鍵盤、減少動態、靜音與離線恢復都必須驗收。
