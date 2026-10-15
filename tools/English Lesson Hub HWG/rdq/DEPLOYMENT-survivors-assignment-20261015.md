# 六關英語冒險與分配後台 — 正式部署 2026-10-15

使用者以「部署正式站」明確授權，已發布至 https://lesson-hub-v03.web.app/lab 。本文件取代本次先前「未部署／待授權」狀態。

## 正式版本
- Firebase：hwg7teaching；Hosting：lesson-hub-v03。
- 最終Hosting：sites/lesson-hub-v03/versions/c4e7cea861957728；發布時間UTC：2026-10-15T05:27:04.370Z。
- 先更新四個既有後台，確認Ready及來源一致後發布前端。後續僅補正公開手冊與兩份下載包的已上線說明，程式與後台沒有再次修改。

| Function | 最新版本 | 狀態 |
|---|---|---|
| liveV2 | livev2-00016-bet | ACTIVE / Ready |
| liveAudioV2 | liveaudiov2-00004-tep | ACTIVE / Ready |
| liveMediaV2 | livemediav2-00007-zez | ACTIVE / Ready |
| liveRetentionV2 | liveretentionv2-00003-git | ACTIVE / Ready |

## 已上線內容
- 純題組分配、測驗／練習、截止時間、題序與選項順序、學號加入、即時教師報表與逐題／逐次作答明細。
- 拼字皆無限重試；測驗保留首次成績；練習其餘題型首次加3次重試採最高分。獎勵按首次完全答對提交次數發放，與學習總分分開。
- 六關Godot冒險與遞增道具、華麗結算；作答及遊戲獨立畫面切換、固定主要操作、長題只捲動內容。
- 14種本機合成音效、6關音樂、音量／背景音樂／靜音；Web及Godot來源下載包、手冊v05同步上線。

## 驗證證據
- 發布副本275項網站、10項Functions、11項Firebase模擬器整合檢查及正式建置通過，正式發布gate與教材／教師存取檢查通過。
- 正式189/189檔HTTP200且SHA一致，三個SPA入口一致；WASM MIME、遊戲檔重新驗證快取、Service Worker no-cache及兩份ZIP已核對。
- 四個實際部署來源各41檔逐位元符合；所有原有LIVE設定與Secret參照透過記憶體比對保持一致。平台僅在兩個HTTP callable新增預期的FUNCTION_SIGNATURE_TYPE標記。
- 413個來源／素材於發布後與專案讀回一致；其他9個Functions的updateTime保持不變。
- 正式瀏覽器教師入口正常並要求教師驗證；不可能產生的分配碼000000正確顯示「找不到這份分配」；Godot場景完成冷載入，三個檢查頁console error皆為0。
- 完整證據：../qa/survivors-production-20261015/；前端封存release-dist.zip SHA256：ece9e0d53ae972f167da6d94486f427938b46ffafa055c4b0d571ac0f091582b。

## 保存與界線
- 未新增正式課程／學生作答，沒有付費AI評分呼叫。沒有發布Firestore／Storage規則、Worker、其他Hosting或其他Functions；沒有新增或輪替Secret。
- 自動核准審查曾拒絕生產環境設定值匯出到暫存檔；該操作未執行，改用Firebase原生逐函式保留設定。檢查僅保存布林結果與欄位名稱，未保存生產環境值或憑證。
- 原手冊v04、單關作品、教材、先前QA與備份保留。新版v05上線狀態修訂前檔案保存在production QA的before/。
- 教師仍需本人登入後台，以自己的題組分配並驗收真實iPad/Safari、校網、觸控、音量／聽感與AI錄音流程；這些未由匿名瀏覽器驗收取代。
- 沒有Git stage／commit／push或Obsidian同步。


<!-- lesson-hub-survivors-closeout-20261015 -->
## 收工保存更新（不改變正式部署版本）
- 收工時再次只讀驗證Hosting版本、4個後台Ready、9個公開檔案與3入口，413來源與2ZIP／前端封存一致。
- Obsidian指定筆記四區已更新讀回，本段取代上方未Obsidian同步狀態；未stage／commit／push，精確範圍待確認。
- 見CLOSEOUT-survivors-20261015.md與GIT-SCOPE-survivors-20261015.md。
<!-- /lesson-hub-survivors-closeout-20261015 -->
