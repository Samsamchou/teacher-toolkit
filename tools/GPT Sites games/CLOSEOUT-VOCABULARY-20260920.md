# VOCABULARY LIVE 收工交接 — 2026-09-20

## 後續 Git 授權

使用者已明確確認「只將本次 VOCABULARY 程式與文字紀錄提交並推送至既有 origin/main」。提交範圍為 34 個候選檔案、兩個文字驗證檔，另加 `.gitattributes` 的六個 VOCABULARY 前端檔換行保護，共 37 檔；私人圖卡、白板、QA 截圖、一次性改寫腳本與其他專案排除。下方「待確認」保留為授權前的歷史紀錄。最終 commit／push 結果以指定 Obsidian 工作筆記及本機 `qa/vocabulary-closeout-20260920/git-sync-result.json` 為準。

## 已完成

- 已依確認 RDQ 建立並正式部署 `2026.09.20-vocabulary.1`：https://gamesinclass-5d9d1.web.app/vocabulary 。五張 SF1 U01 圖卡按檔名對應答案，原圖保留。
- 新 `vocabularyActivity` 為 ACTIVE；原 `liveActivity`、`teacherLogin` 雜湊未變，未改教師通行碼或資料規則，未寫入正式班級測試紀錄。
- 本機 92 回歸、17 整合、15 組瀏覽器 7 情境及規則測試通過；正式四檔 SHA-256、三項 API 防線與三種瀏覽器尺寸驗證通過。
- 原始碼、規格、私人素材、QA 與部署紀錄已保存於 GDrive 掛載專案。這是本機落盤證據，未獨立確認 Drive 雲端同步完成。

## Git／GitHub

- 既有分支 `main`；HEAD 與遠端 `origin/main` 唯讀核對均為 `8f4dcec4357a676ff1d3034880ef0bd103d31954`。
- 共用儲存庫另有其他專案及舊素材變更。依 shutdown 技能，未 stage、commit、push；需要使用者確認本次 VOCABULARY 精確範圍。
- 本專案原有 9 個已追蹤修改檔，另有本次新增及歷史未追蹤素材；範圍草稿見 `qa/vocabulary-closeout-20260920/git-scope-draft.json`。排除私人圖片、來源資料、QA 圖片／錄影、環境設定及其他專案。
- 一般 diff-check 將既有 CRLF 的 CR 報為行尾空白；設定 `core.whitespace=cr-at-eol` 的唯讀核對通過。未改寫已發布來源位元或重算正式雜湊。

## 恢復與下一步

1. 教師以原通行碼登入，開啟 VOCABULARY LIVE，按「載入 SF1 U01 五題圖卡」，建立場次。
2. 以真實平板驗收加入、五色手寫／擦除、重播、評分、早停、音效及後排可讀性。
3. 確認 GitHub 保存範圍後才執行提交推送；不自動新增功能或再部署。

私人 `functions/vocabulary-assets` 六檔及既有 `functions/unscramble-assets` 保留 Drive，不推送私人素材。從 GitHub 重建時須由 Drive 補回；題組範例是在教師按鈕操作時建立，未宣稱已載入正式資料庫。

隔離本機執行副本：`C:/Users/User/AppData/Local/Temp/gsg-vocabulary-20260920`。正式站不依賴它；不要以臨時資料取代 Drive 原始碼。重新預覽用 `scripts/vocabulary-preview.ps1`。一次性 `derive/refine/integrate-vocabulary` 輔助腳本不應隨意重跑，尤其 integrate 會設定早期本機版號。

Obsidian 指定工作筆記：`G:/我的雲端硬碟/secondbrain/teacher-toolkit/工作筆記.md`；四區段使用 `vocabulary-closeout-20260920` 標记，保留其他專案內容。收工不關機、不關閉程式、不終止其他工作。
