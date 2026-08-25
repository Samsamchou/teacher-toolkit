# 驗收測試

所有案例都使用模擬資料，不得連接真實訂票、付款或現行時刻服務。

## 測試環境

- iPad Safari：直式與橫式各一次。
- iPad Chrome：直式與橫式各一次。
- 桌機瀏覽器：教師後台。
- 測試學號：`40100`。
- 任務：二水 → 車埕 → 模擬日期2 → 車次B。
- 內容版本：`tickets-v1`。
- 教師帳號：
  - 一個已登入且在白名單。
  - 一個已登入但不在白名單。
  - 一個未登入狀態。

## `test.ticket.standard-flow`｜標準流程

Given 學生在購票練習首頁
When 輸入 `40100` 並完成二水、車埕、模擬日期2、查詢、車次B及六欄確認
Then 每個 `step_passed` 只出現一次 `You're right!`、綠色勾號、短動畫與音效
And 最終顯示 SAMPLE 車票與「練習完成，沒有真的訂票」
And 不出現付款、購買或真實訂票按鈕
And 產生七個證據頁面及一份七頁 PDF。

## `test.feedback.multimodal`｜正確回饋與減少動態

1. 正常模式下，每一步正確時同時有文字、勾號、邊框、動畫及短音效。
2. 靜音後沒有音效，但文字與勾號仍存在。
3. `prefers-reduced-motion: reduce` 下沒有彩帶位移或閃爍，只使用靜態勾號及淡入。
4. 同一 `step_passed` 因重新 render 或同步重送時不得再次播放音效。
5. 第七步可以有較完整慶祝，但不連續閃爍。

## `test.ticket.error-recovery`｜錯誤修正

依序測試：

- 起點與目的地相同。
- 起訖顛倒。
- 選錯模擬日期。
- 選錯模擬車次。

每次錯誤都必須：

- 不播放成功音效或動畫。
- 以暖橘文字提供可修正提示。
- 將焦點移到對應欄位。
- 由 `aria-live` 朗讀。
- 寫入 `event.validation_failed`。

交換起訖及重新選擇必須寫入事件；最後教師重播可以看見完整修正過程。

## `test.events.complete-and-locked`｜事件完整與鎖定

1. 建立 attempt 後第一筆事件為 `event.attempt_started`，`seq=1`。
2. 後續 `seq` 必須連續。
3. 重送完全相同的 `attempt_id + seq` 不重複寫入。
4. 相同 seq 但不同內容回傳 `EVENT_SEQUENCE_CONFLICT`。
5. before／after 與實際選擇一致。
6. 完成後再追加事件回傳 `ATTEMPT_LOCKED`。
7. 前端不可更新既有事件。
8. 重做活動建立新的 attempt ID。

## `test.attempt.same-student-multiple`｜相同學號多次作答

Given `40100` 在同一天完成兩次
Then 教師左欄顯示兩筆不同 attempt
And 每筆有不同完成時間及 attempt 末六碼
And 事件及 PDF 不互相覆蓋。

## `test.evidence.seven-pages`｜七頁證據

1. 學號登入首頁不列入 PDF。
2. PDF 依 `step.origin` 到 `step.success` 排列。
3. 頁碼為 1 至 7，無缺頁、無重複。
4. 每頁 A4 橫式、一頁一張畫面。
5. 頁首有單元、日期、學號、attempt 末六碼、步驟及頁碼。
6. 每頁保留模擬教材警語。
7. 畫面不含網址列、其他分頁、通知或裝置 UI。
8. R2 metadata 的 `page_count` 為 7，checksum 與 D1 一致。
9. R2 key 符合 `evidence/{unit_slug}/{attempt_id}/proof.pdf` 且不含學號。
10. PDF 沒有公開 URL；未授權請求不能預覽或下載。

## `test.replay.silent-chronological`｜無聲重播

1. 教師開啟完成紀錄並播放。
2. 事件依 seq 及 `client_elapsed_ms` 呈現。
3. 顯示游標光圈、欄位高亮、錯誤及修正。
4. 可播放、暫停、選擇 `0.5×`／`1×`／`2×` 並跳到特定步驟。
5. 重播不播放學生端音效。
6. 系統不建立 MP4、WebM 或其他影片檔。
7. 依 attempt 的 `content_version` 使用相容介面重建。

## `test.teacher.authorization`｜教師授權

| 情境 | 預期 |
|---|---|
| 未登入進入 `/teacher` | 進入平台 ChatGPT 登入流程 |
| 已登入但不在白名單 | 顯示無權限，HTTP 403 |
| 白名單教師 | 可使用後台 |
| 學生直接呼叫教師 API | HTTP 401 或 403 |
| 加上 `?teacher=1` | 不改變權限 |
| 未授權直接存取 PDF | 不回傳檔案 |

每一個教師 API 都必須重新執行伺服器端白名單檢查。

## `test.teacher.layout-and-filters`｜教師後台版面

1. 頂部可依單元、日期、學號及同步狀態篩選。
2. 左欄依日期分組，顯示學號、完成時間、狀態及 attempt 末六碼。
3. 點選後右欄可切換摘要、重播與 PDF。
4. 摘要顯示起訖、日期、車次、開始／完成時間、錯誤／修正次數及七頁狀態。
5. iPad 與桌機都能操作；窄版可改成清單與詳情兩頁，但不得遺失功能。
6. 匯出不包含教師 email、token、IP 或 R2 內部 key。

## `test.retention.delete-order`｜保存與刪除

1. 已完成資料的 `expires_at` 為 `completed_at + 365天`。
2. 未完成資料的到期日依最後事件時間計算。
3. 到期或手動刪除時，先刪 R2。
4. R2 刪除失敗時，D1 學習內容保留並標記待重試。
5. R2 刪除成功後才刪 D1 事件、manifest 與 attempt。
6. 寫入 deletion log，但不保存被刪除的學習內容。
7. 手動刪除需二次確認。
8. 刪除後舊 PDF 連結無法讀取。
9. 後台自動掃描單批不超過 25 筆。

## `test.offline.idempotent-resume`｜離線恢復

1. 在已建立 attempt 後切斷網路。
2. 學生可繼續完成，畫面顯示「離線練習，尚未同步」。
3. 事件與七張圖只暫存在 IndexedDB。
4. 恢復網路後先取得 `nextSeq`，再補傳未收到事件。
5. 重送已收到事件不造成重複或第二個 attempt。
6. PDF 可獨立重試，不產生第二份 manifest。
7. 事件及 PDF 都成功前不得顯示「教師已收到」。

## `test.privacy.data-minimization`｜隱私與模擬邊界

檢查瀏覽器請求、D1、R2 metadata、PDF、匯出檔及伺服器產品資料：

- 允許：五位數學號、模擬選擇、事件、相對時間、伺服器時間、教師授權 email。
- 禁止：學生姓名、身分證、電話、學生 email、信用卡、付款、真實訂票代碼、IP、螢幕影片、麥克風或系統聲音。
- R2 key 不含學號。
- 所有學生頁面都有模擬教材警語。
- 所有日期與車次均標為 SAMPLE／模擬，不可誤認為現行資訊。

## `test.layout.ipad-responsive`｜iPad 版面

- 直式與橫式完成標準流程。
- Safari 與 Chrome 無橫向溢出。
- 主要內容不超過 960px。
- 觸控區至少 48×48px，相鄰間距至少 8px。
- 學生正文至少 18px。
- 軟鍵盤開啟時，學號欄及錯誤訊息仍可見。
- 旋轉螢幕不遺失作答狀態。

## `test.accessibility.keyboard-and-live-region`｜無障礙

- 每一步有唯一且清楚的 `h1`。
- 所有欄位有可見標籤與程式化 label。
- Tab 順序與閱讀順序一致。
- 可用 Enter／Space 完成，不依賴拖曳。
- 焦點樣式清楚。
- 成功與錯誤不只依賴顏色。
- `aria-live` 不重複朗讀同一成功訊息。
- 裝飾圖 alt 為空；教學圖使用 asset manifest 的 alt。

## `test.content.ids-and-copy`｜識別碼與文案

- `site-content.json`、事件 schema、API、D1 及測試使用相同單元與步驟 ID。
- 英文正確回饋固定為 `You're right!`。
- 首頁標題為「火車線上購票網站—Buy Train Tickets Online」。
- 開始按鈕為「Start／開始練習」。
- 不出現「送出訂票」「付款成功」或真實票號。
- ImageGen 圖片內不含站名、時間、按鈕或錯誤文字。

## `test.fallback.paper-kit`｜故障替代

若 iPad 無法開啟：

- 教師可使用同版面 A4 六步紙卡。
- 有三張 SAMPLE 車次卡。
- 有一張 SAMPLE 確認票。
- 紙本仍要求學生依序核對 from、to、date、train、depart、arrive。

## 發布前通過條件

- 所有上述測試通過。
- 11 個 Word 原始驗收案例均有對應。
- JSON 契約解析成功。
- D1 migration 可在乾淨 SQLite／D1 相容環境套用。
- 教師未授權與學生越權測試均被拒絕。
- 實體 iPad 測試需由教師或現場人員完成；桌面模擬不能取代。
