# Skill 與 dry-run 驗證摘要

日期：2026-08-27

## 範圍

- Skill 草稿：`story-reading-assessment-site-builder`
- 模式 1：`extend-existing`，以 HWG5-U04 非正式樣本做隔離 dry run
- 模式 2：`new-site`，以 Demo Story Reading Lab 非正式樣本做不部署 dry run
- 沒有安裝 Skill、修改既有網站來源、連線 Firebase、正式部署、commit 或 push

## 通過項目

- Skill package：9 個檔案；frontmatter 名稱、允許欄位、長度、TODO 與 `agents/openai.yaml` Skill 引用檢查通過。
- `story-site-tool.mjs`：Node 語法檢查通過。
- 兩個樣本內容：schema 驗證通過，各 1 單元、2 句；26 人 × 2 句 × 3 次 = 156 次理論每日評分。
- 既有站 dry run：偵測 `HWG5-SU`、`HWG5-U01`、`HWG5-U02`、`HWG5-U03`；`HWG5-U04` 尚無正式題庫 key。
- 既有站的 6 個必要來源檔在 dry run 前後 SHA-256 全數相同。
- 新站 dry run：離線內容預覽與預計專案樹已生成；`firebaseConfigured=false`、`deployed=false`。
- 批准閘門：`skillInstallAllowed=false`、`productionDeployAllowed=false`。
- 負面測試：模式不符時退出碼 1 且不建立輸出；非空輸出資料夾退出碼 1 且拒絕覆寫。
- 12 個 JSON 全數可解析；內容與 dry-run 輸出未偵測到 API key、私鑰或 debug token。
- 既有正式站測試：8/8 通過。

## 驗證器限制

Skill Creator 的 `quick_validate.py` 已嘗試執行，但此電腦現有兩個 Python 環境都缺少 `PyYAML`；臨時下載未回應後已停止，沒有安裝到使用者環境。已依該驗證器原始碼逐項執行等效 frontmatter 檢查並通過。安裝 Skill 前仍應在可用 `PyYAML` 的環境補跑官方驗證器。

## 下一個教師閘門

- 回覆 `確認安裝 Skill`：才可將草稿安裝到指定 Skills 目錄。
- 這不等於 `確認正式部署`；目前沒有任何正式站變更可部署。
- 真正擴增 HWG5-U04 前，仍需提供並確認正式句子與逐句發音分析，再回覆 `確認內容`。

## 2026-08-27 四單元正式來源 dry run 補充

- 已完成 HWG7 U02、U03、U04 與 HWG5 U04 四份獨立來源預檢及隔離 dry run，共 34 句。
- 四份 schema 驗證皆為 0 error、0 warning；8 題單元理論每日上限各 624 次，9 題單元各 702 次。
- 28 個新 JSON 全部可解析；四個目標 key 均無碰撞，`sourceModified=false`、`deployed=false`。
- 正式來源／測試設定檔 SHA-256 全部維持不變；敏感字串掃描無命中。
- 既有站 Node 測試以 `--test-isolation=none` 執行，12/12 通過。
- 下一閘門改為：教師回讀四份 `CONTENT-REVIEW.md` 後回覆 `確認內容`，才可開始本機來源實作；正式部署另行確認。

## 2026-08-27 四單元本機實作補充

- 已收到教師 `確認內容`，將 HWG7 U02–U04 與 HWG5 U04 共 34 句寫入本機 `public/index.html`。
- 已新增 52 個不重複字典提示與四單元內容／字典測試；完整測試 20/20 通過。
- 本機瀏覽器確認四個新 key 載入、主題與 U02／U03／U04 切換成功，console error 0。
- AI、App Check、Functions、Firebase 設定與 indexes 雜湊維持不變；沒有部署或 push。
- 下一閘門：若需正式上線，教師另行回覆 `確認正式部署`；部署前先讀回實際配額、資料與保存設定。
