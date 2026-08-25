---
rdq_version: 1
edition: chatgpt-app
task: 轉換「iPad 模擬線上購票網站設計規劃書」為網站開發規格包
domain: dev
date: 2026-07-29
status: draft
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: sites-building
---

# RDQ 需求規格卡｜四年級在地課程網站開發規格包

## 一、任務目標

讀取並轉換 `C:\firebase-deploy\在地課程\在地課程4年級上學期教案\02_第3-10週_坐火車趣集集.docx` 中的「第4節數位教材｜iPad模擬線上購票網站設計規劃書（ChatGPT Sites完善版）」，產出可直接交由網站開發流程使用的多檔案規格包；本階段不建立完整網站、不部署，也不建立真實雲端資源。

## 二、已確認需求

- 輸出形式：多檔案「網站開發規格包」，同時提供人類可讀的 Markdown 與機器可讀的 JSON／SQL／Schema。
- 儲存位置：`C:\firebase-deploy\在地課程\sites\grade4-local-curriculum`
- 網站範圍：完整規劃「坐火車趣集集」中的線上購票練習，以及「4年級上學期 在地課程」四單元入口首頁。
- 其他三單元「扇形車庫」「閱覽鐵道風華」「介紹五分車與認識小火車鐵道」：只建立入口、穩定識別碼與後續擴充介面，不設計詳細功能。
- 保留學生端六步購票流程、最終成功頁、逐步正確回饋、慶祝動畫、事件式作答重播、七張通關畫面 PDF、教師後台、D1／R2 儲存、教師驗證與一年保存等需求。
- 原始 Word 文件保持不變，本任務只建立衍生規格包。

## 三、預定交付檔案

1. `README.md`：套件用途、目錄、閱讀順序、開發接手方式。
2. `docs/WEBSITE_SPEC.md`：網站資訊架構、學生端、教師端、互動、視覺、無障礙、iPad 與離線需求。
3. `docs/ROUTES_AND_API.md`：頁面路由、API、權限、錯誤與資料流。
4. `docs/TRACEABILITY_MATRIX.md`：Word 需求對應到頁面、元件、API、D1／R2 與驗收測試。
5. `content/site-content.json`：四單元入口、繁體中文介面文字、英語回饋與購票練習內容。
6. `content/asset-manifest.json`：ImageGen 素材需求、用途、尺寸、替代文字及提示詞，不生成圖片。
7. `contracts/events.schema.json`：每次操作事件、步驟通過、重播與工作階段資料格式。
8. `contracts/api-contract.json`：學生練習、教師查詢、PDF 證據與保存管理介面。
9. `db/schema.ts`：D1 資料模型的型別化規格。
10. `db/migrations/0001_initial.sql`：D1 初始資料表、索引與關聯。
11. `tests/acceptance-tests.md`：標準流程、錯誤修正、重播、PDF、權限、保存期限、iPad 與無障礙驗收。
12. `.openai/hosting.example.json`：只示範設定結構，不填入或虛構 Sites `project_id`。

## 四、資料與識別碼規則

- 所有文字檔使用 UTF-8；檔名與程式識別碼使用英文，學生與教師介面使用繁體中文。
- 使用穩定識別碼，例如：
  - 單元：`unit.train-tickets`
  - 步驟：`step.origin`
  - 事件：`event.step_passed`
  - 素材：`asset.home.jiji-train`
  - 測試：`test.ticket.standard-flow`
- D1 邏輯綁定名稱暫定為 `DB`；R2 邏輯綁定名稱暫定為 `EVIDENCE_BUCKET`，實際資源名稱留待建站階段設定。
- 不在檔案中寫入密碼、金鑰、真實教師名單、真實學生資料或 Sites 專案識別碼。

## 五、已採納建議

1. 同時產出人類可讀 Markdown 與機器可讀 JSON。
2. 單元、步驟、事件、素材及測試均使用穩定識別碼。
3. 只建立 `.openai/hosting.example.json`，不虛構 Sites 專案識別碼。
4. 只建立 ImageGen 素材清單與提示詞，本階段不生成圖片。
5. 建立完整追溯矩陣，將 Word 需求對應到頁面、API、D1／R2 與測試。

## 六、不在本階段範圍

- 不建立 React／Vinext 完整程式碼。
- 不執行套件安裝、建置或本機網站測試。
- 不建立真實 `.openai/hosting.json`、Sites 專案、D1 資料庫或 R2 儲存桶。
- 不生成 ImageGen 圖片。
- 不部署網站。
- 不擴寫其他三個在地課程單元的詳細練習功能。

## 七、整合後規格敘述

將指定 Word 章節的全部內容轉換成一套可由 ChatGPT Sites 網站開發流程直接採用的規格包。規格包必須完整描述四單元首頁、線上購票學生練習、教師後台、互動事件重播、七張過關畫面 PDF、D1／R2 資料分工、教師存取控制、一年資料保存、視覺與 ImageGen 素材需求，以及 iPad、無障礙、離線和驗收條件；並透過穩定識別碼與追溯矩陣，確保 Word 原始需求在後續實作與測試中可逐項查核。

## 八、驗收條件

- Word 原章節的 12 個小節與 10 張表格均有明確對應，沒有遺漏關鍵需求。
- 所有 JSON 檔案可成功解析，識別碼互相一致且無重複。
- 事件、API、D1 與 R2 規格能支持六步購票、七張證據畫面、事件重播、教師後台及一年保存。
- 追溯矩陣能由每一項原始需求查到規格檔、頁面／元件、API、儲存位置與驗收測試。
- 規格包不含任何密碼、金鑰、真實個資、虛構 Sites 專案識別碼或已部署網址。
- 本階段不產生可執行網站，也不對原始 Word 文件進行修改。

## 九、唯一待確認

是否依照本規格卡開始建立上述多檔案網站開發規格包？
