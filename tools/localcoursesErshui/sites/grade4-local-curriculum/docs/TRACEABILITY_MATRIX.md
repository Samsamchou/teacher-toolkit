# Word需求追溯矩陣

## 1. 來源基準

- 來源：`02_第3-10週_坐火車趣集集.docx`
- 章節：第4節數位教材｜iPad模擬線上購票網站設計規劃書（ChatGPT Sites完善版）
- 結構核對：12個小節、10張表格。
- 規格包內容版本：`tickets-v1`

縮寫：

- `WS`：`docs/WEBSITE_SPEC.md`
- `RA`：`docs/ROUTES_AND_API.md`
- `SC`：`content/site-content.json`
- `AM`：`content/asset-manifest.json`
- `ES`：`contracts/events.schema.json`
- `AC`：`contracts/api-contract.json`
- `DS`：`db/schema.ts`
- `M1`：`db/migrations/0001_initial.sql`
- `AT`：`tests/acceptance-tests.md`

## 2. 十二個小節覆蓋

| 來源小節 | 核心內容 | 主要規格檔 | 資料／儲存 | 驗收 |
|---|---|---|---|---|
| 一、教學定位、平台與完成成果 | 六步目標、兩人一機、七頁PDF、教師成果、非目標 | WS §1–2 | SC、DS attempts | `test.ticket.standard-flow`、`test.privacy.data-minimization` |
| 二、上層網站 | 四單元首頁、教師入口、共用紀錄 | WS §3.1 | SC units、DS units | `test.teacher.layout-and-filters` |
| 三、購票首頁、版面與素材 | 標題、學號、警語、配色、四場景 | WS §3.2、§4 | SC、AM | `test.content.ids-and-copy`、`test.layout.ipad-responsive` |
| 四、學生六步流程 | 七畫面、正確與錯誤回饋 | WS §5 | SC steps、ES | `test.ticket.standard-flow`、`test.ticket.error-recovery` |
| 五、七頁PDF | 擷取、合成、上傳、離線 | WS §7、§13 | AC evidence、R2、evidence_manifest | `test.evidence.seven-pages`、`test.offline.idempotent-resume` |
| 六、操作事件與重播 | 結構化事件、無聲重播、完成鎖定 | WS §6、§8 | ES、attempt_events | `test.replay.silent-chronological`、`test.events.complete-and-locked` |
| 七、Sites、D1與R2 | 六張D1表、R2路徑、綁定 | WS §9 | DS、M1、hosting example | `test.evidence.seven-pages`、`test.retention.delete-order` |
| 八、教師登入與後台 | ChatGPT登入、白名單、左右欄 | WS §10–11 | teacher_allowlist、AC teacher APIs | `test.teacher.authorization`、`test.teacher.layout-and-filters` |
| 九、保存、個資與安全 | 365天、刪除順序、最小化、白名單輸入 | WS §12 | DS、M1、AC | `test.retention.delete-order`、`test.privacy.data-minimization` |
| 十、iPad、無障礙、離線 | 觸控、鍵盤、PWA、替代教材 | WS §13–14 | SC strings、IndexedDB僅暫存 | `test.layout.ipad-responsive`、`test.accessibility.keyboard-and-live-region`、`test.fallback.paper-kit` |
| 十一、驗收測試 | 11個原始案例 | AT | 測試資料與API | AT全部對應案例 |
| 十二、未來實作檔案與路由 | 頁面、API、schema、hosting與未來邊界 | RA、README | 全套規格 | `test.content.ids-and-copy` |

## 3. 十張來源表格覆蓋

| 表格ID | 來源表格 | 轉換位置 | 覆蓋結果 |
|---|---|---|---|
| `SRC-T01` | 項目／完整規格（9×2） | WS §1–2、README、RA | 目標、成果、平台、最小化、非目標及本階段邊界均保留 |
| `SRC-T02` | 四單元入口（5×3） | SC `units`、WS §3.1 | 四單元、卡片意象與本次資料接入狀態均保留 |
| `SRC-T03` | ImageGen原創場景（5×3） | AM scene assets、WS §4.2 | 小火車、綠色隧道、二水田野、車埕木站及CSS動畫均保留 |
| `SRC-T04` | 色彩角色（6×3） | SC `colors`、WS §4.1 | 6個色彩角色、色碼與不得只靠顏色的規則均保留 |
| `SRC-T05` | 步驟／畫面（8×3） | SC `steps`、WS §5 | 1至7步、通過條件、回饋及證據頁碼均保留 |
| `SRC-T06` | 事件欄位（9×2） | ES、DS attempt_events | attempt、seq、step、action、payload、相對／伺服器時間、before／after均保留 |
| `SRC-T07` | D1資料表（7×3） | DS、M1 | 六張資料表及用途均保留，另補token hash與內容版本 |
| `SRC-T08` | R2項目（5×2） | WS §9.2、RA、AC | key、metadata、授權讀取及365天刪除順序均保留 |
| `SRC-T09` | 教師後台區域（6×3） | WS §10、RA §4 | 頂部、左欄、摘要、重播、PDF及操作均保留 |
| `SRC-T10` | 未來檔案與路由（10×2） | RA、README、hosting example | 首頁、單元、教師、API、DB、hosting、素材及文件均有對應 |

## 4. 細項需求追溯

| 需求ID | Word原始需求摘要 | 規格／內容 | 頁面或API | D1／R2 | 驗收案例 |
|---|---|---|---|---|---|
| `REQ-S1-01` | 完成起點、目的地、日期、查詢、車次、摘要六步 | WS §5、SC steps | `/units/train-tickets` | attempts、events | `test.ticket.standard-flow` |
| `REQ-S1-02` | 能發現起訖顛倒並修正 | WS §5.2、SC feedback | events append | attempt_events | `test.ticket.error-recovery` |
| `REQ-S1-03` | 最終SAMPLE票停止，不真實訂票 | WS §1、SC sampleTicket | 學生成功頁 | 無真實票務資料 | `test.content.ids-and-copy` |
| `REQ-S1-04` | 教師示範、兩人一機、角色交換 | WS §2.1、SC roles | 課堂使用 | 不儲存角色個資 | `test.ticket.standard-flow` |
| `REQ-S1-05` | 六步加成功共七頁PDF | WS §7、SC evidence | evidence upload | R2 proof.pdf | `test.evidence.seven-pages` |
| `REQ-S1-06` | 教師依日期學號查看摘要、重播、PDF | WS §10、RA §4 | `/teacher`及teacher APIs | D1＋R2 | `test.teacher.layout-and-filters` |
| `REQ-S1-07` | 學生只輸入五位數學號 | WS §12.2、SC studentId | create attempt | attempts.student_id | `test.privacy.data-minimization` |
| `REQ-S1-08` | 不收姓名、付款、IP或真實錄影 | WS §12.2 | 全站 | schema無相關欄位 | `test.privacy.data-minimization` |
| `REQ-S2-01` | 深藍導覽、左標題、右教師後台 | WS §3.1、SC colors | `/` | 無 | `test.content.ids-and-copy` |
| `REQ-S2-02` | 四單元卡片 | WS §3.1、SC units | `/` | units | `test.content.ids-and-copy` |
| `REQ-S2-03` | 其他三單元只預留 | README、SC status | 三個預留路由 | units | `test.content.ids-and-copy` |
| `REQ-S2-04` | 共用attempt、期限、授權與刪除 | WS §6、§11–12 | 共用teacher APIs | attempts、allowlist、deletion_log | `test.retention.delete-order` |
| `REQ-S3-01` | 首頁中英名稱與學號placeholder | WS §3.2、SC | `/units/train-tickets` | 無 | `test.content.ids-and-copy` |
| `REQ-S3-02` | Start／開始練習，不用付款字樣 | WS §3.2、SC | 學生首頁 | 無 | `test.content.ids-and-copy` |
| `REQ-S3-03` | 固定模擬教材警語 | WS §1、SC | 所有學生頁 | PDF亦保留 | `test.privacy.data-minimization` |
| `REQ-S3-04` | 四個ImageGen場景及輕量動畫 | AM、WS §4.2 | 首頁／學生頁 | 靜態資產，不入D1 | `test.content.ids-and-copy` |
| `REQ-S3-05` | 臺鐵感兒童配色但不冒充官方 | WS §4.1、SC colors | 全站 | 無 | `test.layout.ipad-responsive` |
| `REQ-S4-01` | 學號驗證後才建立attempt | WS §3.2、RA §3.1 | `POST /api/attempts` | attempts | `test.ticket.standard-flow` |
| `REQ-S4-02` | 每一步必要條件完全正確才通過 | WS §5、SC passRule | events append | attempt_events | `test.ticket.standard-flow` |
| `REQ-S4-03` | 每步You're right、勾號、動畫、音效 | WS §5.1、SC feedback | 學生各步 | step_passed | `test.feedback.multimodal` |
| `REQ-S4-04` | 錯誤不慶祝、焦點與aria-live | WS §5.2 | 學生各步 | validation_failed | `test.ticket.error-recovery` |
| `REQ-S5-01` | 只擷取網站內容區 | WS §7、SC captureTarget | 證據產生器 | manifest | `test.evidence.seven-pages` |
| `REQ-S5-02` | A4橫式、頁首資料、固定順序 | WS §7、SC evidence | PDF合成 | R2 | `test.evidence.seven-pages` |
| `REQ-S5-03` | 驗證頁數、大小、checksum後寫R2 | RA §3.4、AC | evidence upload | R2後更新D1 | `test.evidence.seven-pages` |
| `REQ-S5-04` | 斷線可完成，恢復後同步 | WS §13、RA §6 | sync API | IndexedDB暫存→D1/R2 | `test.offline.idempotent-resume` |
| `REQ-S6-01` | 事件錄製，不是真實螢幕錄影 | WS §8、ES | replay API | attempt_events | `test.replay.silent-chronological` |
| `REQ-S6-02` | 完整八類事件欄位 | ES、DS | events API | attempt_events | `test.events.complete-and-locked` |
| `REQ-S6-03` | 重播速度、時間軸、步驟跳轉 | WS §8、SC dashboard | teacher events | D1讀取 | `test.replay.silent-chronological` |
| `REQ-S6-04` | 完成後鎖定；重做新attempt | WS §6、M1 trigger | events API | attempts＋events | `test.events.complete-and-locked` |
| `REQ-S7-01` | 六張D1表 | DS、M1 | 所有API | D1 DB | schema/migration QA |
| `REQ-S7-02` | R2 key不含學號且無公開URL | WS §9.2、AC | teacher evidence | R2 | `test.evidence.seven-pages` |
| `REQ-S7-03` | Sites宣告DB與EVIDENCE_BUCKET | hosting example、README | 建站階段 | Sites管理資源 | configuration QA |
| `REQ-S7-04` | prepared statements且不曝露綁定 | RA §7、README | 所有server routes | D1/R2 server only | security review |
| `REQ-S8-01` | 教師ChatGPT登入＋email白名單 | WS §11、AC | `/teacher`、teacher APIs | teacher_allowlist | `test.teacher.authorization` |
| `REQ-S8-02` | 後台頂部、左欄、右欄三分頁 | WS §10、SC dashboard | `/teacher` | D1＋R2 | `test.teacher.layout-and-filters` |
| `REQ-S9-01` | 完成或最後事件起算365天 | WS §12.1、DS expires_at | retention cleanup | attempts | `test.retention.delete-order` |
| `REQ-S9-02` | 排程不足時後台有限掃描與按鈕 | WS §12.1、RA §4.7 | retention cleanup | D1＋R2 | `test.retention.delete-order` |
| `REQ-S9-03` | R2名稱無學號，email只作授權稽核 | WS §12.2、DS | teacher APIs | R2 key＋allowlist | `test.privacy.data-minimization` |
| `REQ-S9-04` | 學生只能追加當次事件 | WS §9.3、AC | student APIs | token hash | `test.teacher.authorization` |
| `REQ-S9-05` | 限制事件、長度、頻率、PDF | WS §12.3、AC limits、ES | 所有API | CHECK與server validation | `test.privacy.data-minimization` |
| `REQ-S10-01` | iPad尺寸、觸控、字級、無溢出 | WS §4.3 | 學生及教師頁 | 無 | `test.layout.ipad-responsive` |
| `REQ-S10-02` | h1、label、焦點、鍵盤、非純色 | WS §14 | 全站 | 無 | `test.accessibility.keyboard-and-live-region` |
| `REQ-S10-03` | 靜音、減少動態、圖像不放文字 | WS §5.1、§14、AM | 全站 | preference只在裝置 | `test.feedback.multimodal` |
| `REQ-S10-04` | PWA離線、依seq重試、不重建attempt | WS §13、RA §6 | sync API | IndexedDB→D1 | `test.offline.idempotent-resume` |
| `REQ-S10-05` | A4紙卡與教師兩機課前測試 | WS §13 | 實體課堂 | 無 | `test.fallback.paper-kit` |
| `REQ-S11-01` | 原始11個驗收情境 | AT前11個核心案例 | 全站 | 全部 | AT |
| `REQ-S12-01` | 首頁、單元、教師及API路由 | RA §1、§3–4 | routes | D1/R2 | route contract review |
| `REQ-S12-02` | DB schema、migration、hosting | DS、M1、hosting example | 建站階段 | Sites bindings | structural QA |
| `REQ-S12-03` | 未來才建站、生成圖片、實測、部署 | README | 不在本階段執行 | 無資源被建立 | file-scope QA |

## 5. 完整性判定

- 來源12個小節：`12/12` 已對應。
- 來源10張表格：`10/10` 已對應。
- 來源11個驗收案例：`11/11` 已轉為具名案例，並補充iPad、無障礙、文案與紙本替代測試。
- 本規格包沒有修改原Word，也沒有建立或部署真實網站。
