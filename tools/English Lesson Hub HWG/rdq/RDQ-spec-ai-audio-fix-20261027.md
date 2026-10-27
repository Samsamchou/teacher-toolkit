# AI 錄音題修復計畫（Lesson Hub 分配練習）— RDQ 規格卡 confirmed

**老師選擇（2026-10-27）：** 1A 任何失敗都退還可重送／重錄；2A 學生看總分＋一句中文回饋；3A 列清單後一次釋放卡住錄音；建議①②③④⑤全部採納。部署正式站仍需另外授權。

## Context
老師在正式站 https://lesson-hub-v03.web.app/lab 的分配練習（HWG7 R1 Phonics、學生 60121）測 AI 錄音題：送出後拿不到 AI 分數，畫面顯示「這次 AI 結果待確認…系統不會重複呼叫 AI」，而且不能重錄。另外右下角按鈕不像按鈕、不好辨認。

### 查證結果（已讀程式與正式站雲端紀錄，未改任何東西）
1. **主因：正式站 `liveAudioV2` 少了 `LIVE_AI_MODEL` 環境變數。** 2026-10-15 重新部署後只剩 `LIVE_AI_ENABLED=true`，模型名稱不見（09-24 部署用的是 `gemini-3.7-flash`，存在已刪除的 Temp 副本）。`geminiScorer`（`preview/functions/src/live-audio.mjs:55`）看到模型名稱空白就直接丟錯，根本沒呼叫 Gemini。雲端紀錄：10-27 12:04 第一次呼叫 1.98 秒就回 400（真的評分要數秒以上），之後兩次 0.4–0.5 秒 400。Gemini 金鑰 secret 存在且 enabled。
2. **卡死原因：失敗後狀態設計成「待教師查核」。** 第一次送出：`reserve` 已扣 1 次、設 `run.pendingAudio` → 評分丟錯 → `markUncertain`。之後每次「提交／確認同一份錄音」：`claim` 看到 `uncertain` 回 false → 顯示截圖那句話（`live-audio.mjs:156`）。`pendingAudio` 不清掉，所以開始錄音、重新錄製按鈕都被停用（`AssignmentAudio.jsx:11`），只能等老師在明細手動給分。
3. **問題 1 的答案：** 設計上會（Gemini 依目標句評 accuracy／fluency／completeness／total，換算成本題分數）。但目前正式站壞掉，任何學生都拿不到。成功時學生只看到「這次 X / Y 分」，AI 回饋文字與聽到的句子只有教師明細看得到。
4. **按鈕：** `.as-question-actions button`（`assignments.css:62`）沒有主要色，停用與可用狀態差異小；錄音中沒有明顯提示。

## 修正方案
### A. 設定（根本原因）
- 部署時把 `LIVE_AI_MODEL` 寫進 functions 部署用的 `.env.hwg7teaching`（非機密，放部署副本，不進 repo）；部署前先用一個測試 wav 呼叫一次 Gemini 確認模型名稱還能用（若 `gemini-3.7-flash` 已下架，改用目前可用的 flash 模型並回報）。
- 新增預檢：`liveAudioV2` 在 `reserve` 之前先檢查金鑰與模型，缺設定就直接回「AI 評分暫時無法使用」，**不扣次數、不鎖題**。

### B. 失敗可恢復（依問題 1 選項）
- `assignment-audio-repository.mjs` 新增 `release(id, uid)`：評分失敗時清掉 `run.pendingAudio`、退回這次提交次數、attempt 標記 `failed`，學生可以「再送一次同一份錄音」或「重新錄音」。
- `live-audio.mjs` 的 catch 改呼叫 release（assignment 路徑）；`claim` 對 `failed` 狀態允許重新評分。
- 前端 `AssignmentAudio.jsx`：失敗後兩顆按鈕都可按，訊息改成學生看得懂的「AI 沒有回應，請再送一次或重新錄音」。

### C. 學生看得到 AI 評分（依問題 2 選項）
- 成功後在回饋卡顯示總分＋一句中文回饋（及選項指定的細項），資料取自 `response.ai`（`assignmentSnapshot` 需帶出 `ai`）。

### D. 按鈕明顯化
- 錄音區改為三顆大按鈕：🎙 開始錄音（紅色實心）、⏹ 停止（深色）、📤 送出給 AI 評分（主色實心）；🔄 重新錄音（外框）。停用時明顯變淡＋說明文字。
- 錄音中顯示紅點閃爍＋秒數倒數；評分中顯示轉圈「AI 評分中…」。
- 修改 `assignments.css` 的 `.as-audio`／`.as-question-actions` 規則，iPad 寬度下按鈕至少 48px 高。

### E. 現有卡住的錄音（依問題 3 選項）
- 一次性腳本：把正式 DB 中 `lessonAssignmentAudioV1` 狀態為 `uncertain` 的錄音釋放（同 B 的 release），先列清單給老師看再執行。

## 關鍵檔案
- `preview/functions/src/live-audio.mjs`、`preview/functions/src/assignment-audio-repository.mjs`、`preview/functions/index.cjs`（預檢）
- `preview/src/assignments/AssignmentAudio.jsx`、`AssignmentStudent.jsx`（回饋卡）、`assignments.css`
- 相關 domain：`preview/src/assignments/assignment-domain.mjs` → `npm run` 同步到 `functions/generated/`（`scripts/sync-live-domain.mjs`）
- 部署流程沿用 `qa/assignment-delete-production-20261017/`（cloud.cjs before|deploy|hosting|after，`--account u9431818@gmail.com`）

## 驗證
1. 單元測試：`preview/` `npm test`；新增測試：缺模型時不扣次數、評分失敗後 release、release 後可再送／重錄、成功回傳 ai 給學生。
2. 本機 `npm run validate`、`npm run build`；本機預覽確認按鈕樣式與錄音中提示（桌機＋iPad 寬度截圖）。
3. 部署前：測試 wav 呼叫 Gemini 一次確認模型可用（費用極低）。
4. **部署需老師另外授權**（Functions liveAudioV2＋Hosting）。部署後讀回環境變數含 `LIVE_AI_MODEL`，用測試學號 99901 實際錄一句 → 拿到分數與回饋；再故意中斷一次確認能重送。
5. 老師用實體 iPad／Safari 驗收一次。
6. 更新 `preview/HANDOFF.md`、`rdq/DEPLOYMENT-ai-audio-fix-20261027.md`，規格卡存 `rdq/RDQ-spec-ai-audio-fix-20261027.md`。
