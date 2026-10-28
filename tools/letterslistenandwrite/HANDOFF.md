# 英文字母聽寫與筆順檢測（letterslistenandwrite）交接

## 來源與搬家

- 2026-10-27 從 `C:\firebase-deploy\letterslistenandwrite` 複製到本資料夾（robocopy，300 檔、38 MB）。
- **沒有複製**：`node_modules/`、`functions/node_modules/`、`.npm-cache-root/`（758 MB）、
  `.npm-cache-functions/`（154 MB）、空的 `.git/`、兩個 0 位元組的 vite log。
  原資料夾仍在 C 槽，可當備份；以後**只在本資料夾修改**。
- 要在本機跑或部署：在 Temp 副本 `npm install`（勿在 Google 雲端硬碟裡裝 node_modules，同步會卡）。

## 網站在做什麼

學生輸入座號 → 聽 AI 唸一個字母（OpenAI TTS，tts-1／nova，0.72 倍速，唸 3 次）→
在四線格畫布上「左邊寫大寫、右邊寫小寫」→ 送出給 AI 辨識 → 對了有慶祝與拉霸獎勵；
教師後台（密碼）可看各日期、各學生每一筆筆跡回放、分數與 AI 原始結果，並可刪除。

## 技術組成

| 部分 | 位置 | 說明 |
|---|---|---|
| 前端 | `src/App.jsx`（1567 行）、`src/styles.css` | React 19 + Vite 7，單頁 |
| 後端 | `functions/index.js` | Firebase Functions v2（asia-east1, Node 22） |
| AI | OpenAI，金鑰只在 Firebase Secret Manager `OPENAI_API_KEY` | 不得寫進 repo |
| 資料庫 | Firestore `letterPracticeAttempts`、`letterPracticeSessions` | 規則全部拒絕，只有 Functions 能讀寫 |
| 標準字卡 | `functions/reference-cards/A-upper.jpg … z-lower.jpg`（52 張） | 來自 `HWG1字母卡/` |
| Firebase 專案 | `g5-remedial-action-verbs` | `.firebaserc`；部署 `npm run deploy` |
| 原始需求 | `AI 英文字母聽寫與筆順檢測系統.docx`、`code_artifact.tsx`、5 張螢幕截圖 | 最早的規格與原型 |
| 測試 | `functions/assessment.test.js`（判分邏輯單元測試） | `cd functions && npm test` |
| 負面驗證 | `verification/negative-boards/`（26 張「故意寫錯」的板子＋manifest）、`scripts/verify-wrong-all-letters.cjs` | 打正式站 API，確認寫錯字都會判錯 |

## 目前的手寫辨識流程（`blind-then-reference-v2`）

1. 前端把整張畫布（白底、灰色四線、藍色粗筆跡）轉成 JPEG 送出，另附筆畫座標與本機指標
   （`calculateLocalMetrics`：左右筆跡量、點數、外框）。
2. **盲辨識**：不告訴 AI 答案，請它讀出左右各是什麼字母、大寫或小寫、可信度。
   模型順序 `gpt-5.6-sol → gpt-5.6-luna → gpt-4o-mini`，reasoning medium。
3. 盲辨識對了，才做**標準字卡比對**：把學生的板子和該字母大小寫兩張字卡一起給 AI 打形狀分與位置分。
4. 通過條件（全部都要）：盲辨識字母與大小寫都對、兩側辨識分與可信度 ≥ 72、
   兩側都有寫、字卡形狀分 ≥ 74、字卡位置分 ≥ 58、綜合位置分 ≥ 58。

四線格位置（畫布高度比例）：頂線 0.08、虛線中線 0.37、藍色基線 0.68、底線 0.94；中間黃色直虛線 x=0.5。

## v3 辨識（2026-10-27，`geometry-plus-ai-v3`）

規格卡：`rdq/RDQ-spec-lenient-handwriting-20261027.md`（confirmed）。程式在 `functions/recognition-v3.js`。

1. **程式判位置**：每一筆依平均 x 分到左／右；量外框上下緣，對照字母該在的區域
   （大寫與 b d f h k l＝頂線→基線；i t＝中線上方→基線；a c e m n o r s u v w x z＝中線→基線；
   g p q y＝中線→底線；j＝中線上方→底線），容許 **±0.10** 畫布高度；
   g p q y 起筆可再低到中線下 0.15；字可越過中間黃線 0.08。C O S U V W X Z K P 的大小寫只看高度。
2. **AI 只認字母**：後端用 sharp 把左右各自重畫成「保留四線、裁掉左右空白、每一筆不同顏色」的圖，
   左右**分開**各問一次 `gpt-5.6-sol`（reasoning medium，max_output_tokens 4000），
   不告訴 AI 答案，回傳前 3 名候選。
3. **判定**：第 1 名是目標字（同形 10 組大小寫皆可、I/l 互通）且 ≥30% → 對；
   第 1 名是別的字、但它的高度和實際筆跡不符，而目標字在前 3 名且高度吻合 → 由格線補判為對。
4. 字卡比對已不用；回饋句由程式依格線問題產生，AI 只給教師看的一句字形說明。
5. **直線規則（2026-10-28，老師 iPad 實測後加）**：`checkStrokeShape()`
   - 大寫 **M**：外側兩條腳（筆跡簡化後最左、最右、跨字高 55% 以上的長線）任一傾斜 > 15° 判錯；
     兩腳「往內斜」角度加總 > 18° 判錯（ΛΛ 形 M）。7/21 實測：直腳 M 加總 ≤ 14.5°、ΛΛ 形 ≥ 21°。
   - 大寫 **Y**：字高下方 40% 的筆跡主方向傾斜 > 15° 判錯（老師歪的 Y 為 45°，學生的 Y 0–4°）。
   - 只在 AI 已認出字母時才提示「線要直」；後台明細顯示「直線：夠直／太斜（傾斜 x°）」。

**測試結果**（2026-10-27，dryRun，不寫資料庫）：7/21 的 11 位學生 432 筆真實筆跡
（逐張標記舊版判錯的 155 筆）＋程式產生的 116 組樣本。寫錯字母 82/82、位置錯全部判錯；
寫對的 331 筆判對 96.4%。詳見 `rdq/ACCEPTANCE-lenient-handwriting-20261027.md`。

**2026-10-27 晚**：測試約 1,700 次 AI 呼叫把 OpenAI 儲值用完，正式站一度停擺；老師儲值後恢復。
之後**學生端已切到 v3**（Hosting 已部署，`index-d3uHBnnR.js`），用虛構學號 69930 在正式站寫 Bb 實測：
判對、99/99/99，紀錄為 `geometry-plus-ai-v3`。**69930 這筆測試資料尚未刪除**（刪除被權限擋），
請老師在後台右鍵 69930 → 刪除。跑大量 AI 測試前要先估算費用並問老師。

**教師後台**：每筆紀錄顯示左右「字形／格線」判定與 AI 說明；舊版或新版判錯的可按「老師改判為正確」
（`setTeacherOverride`，會同步完成題數），可取消。`getTeacherOverrides` 列出所有改判，
`TEACHER_PASSWORD=… node scripts/verify-v3.cjs <outDir> --teacher-labeled` 可拿老師改判的紀錄重測。

**測試工具**：`scripts/synthetic-letters.cjs`（52 字形樣本產生器）、`scripts/verify-v3.cjs`
（`--cases=`、`--only=`、`--variant=split:false,colors:false,effort:low`；variant 只在 dryRun 生效）。
真實學生筆跡匯出只放本機暫存，不入庫。

**部署**：Firebase 帳號要用 `--account u9431818@gmail.com`（samchouou 沒有這個專案權限）；
在 C 槽暫存副本 `npm ci` 後部署。

## 題組＋華麗拉霸（2026-10-27 上線）

規格卡：`rdq/RDQ-spec-question-sets-slot-20261027.md`（confirmed）。

- **題組**：`src/questionSets.js` 有 5 個固定題組（全部字母大小寫 26 題亂序、每對 5 題；
  A–M／N–Z 依序／亂序 13 題、每對 3 題）與規則：每對 N 題拉一回，**最後一題再加一回**
  （26 題 6 回、13 題 5 回），每回 **3 拉**。計分：三個 7 = 500、三同 = 200、二同 = 50、其他 = 10。
- **自訂題組**：教師後台「出題設定」分頁（`src/QuestionSetEditor.jsx`），26 字母勾選＋快捷鍵、
  依序／亂序、每對幾題（預設 ≤13 題 3、≥14 題 5）；可修改、停用。存在 Firestore `letterQuestionSets`，
  只能經教師密碼的 `saveQuestionSet`／`getTeacherQuestionSets` 寫讀；學生首頁讀 `getQuestionSets`（只回啟用中）。
- **拉霸機**：`src/SlotMachine.jsx`＋`src/slot.css`。機台外框與 6 種圖案由 Codex 生成
  （原圖 `art-src/slot/`，去背後 `public/slot/*.webp`；窗格位置 `public/slot/cabinet-window.json`）。
  直式轉輪、依序停輪、動態模糊、跑馬燈、合成音效（Web Audio，首頁可關，存 localStorage）、
  大獎金幣雨；拉桿可往下拖曳回彈，也可點或按 Enter。
- **紀錄**：每筆作答記 `questionSetId／questionSetName`；後台卡片顯示題組並可篩選；
  `finishGame` 改用 `addScore` 累加當天總分。
- **本機預覽**：`.claude/launch.json` 的 `letters-dev` 指向 C 槽暫存副本；開發模式才有
  `/?slotdemo`（直接玩拉霸）與 `/?teacherdemo`（出題設定假資料），正式版不含。
- **驗收**：2026-10-27 正式站用虛構學號 69930 走完「A–M 依序」13 題：13 題全對、第 3／6／9／12／13
  題後各一回共 5 回、每回 3 拉、分數與圖案一致、完成頁 810 分、資料庫紀錄有題組名稱。
  老師的「出題設定」只在本機假資料測過（不知道教師密碼），正式站請老師實際建一組試試。

## 已知問題與待辦

- AI 偶爾認錯：r 被讀成 v／Y、h 讀成 b、g 讀成 q、來回描兩次的 N 讀成 M（約 2%）；老師可用改判按鈕補救。
- 舊函式 `analyzeLetterAttempt`（v2）仍在，老師驗收 v3 後再刪除。
- 測試學號 **69930** 的 14 筆紀錄（10/27）待老師在後台右鍵刪除。
- 教師密碼的 SHA-256 雜湊已搬到 Firebase Secret `TEACHER_PASSWORD_SHA256`（2026-10-27），程式不再寫死；
  改密碼＝把新密碼的 SHA-256 用 `firebase functions:secrets:set` 存成新版本後，重新部署教師相關函式。
- teacher-toolkit 是**公開 repo**：翰林字母卡、字母讀音、`functions/reference-cards/`、`public/audio/`、
  原始規格 docx、截圖、pptx，以及**含教師密碼明碼的原型 `code_artifact.tsx`** 都在 `.gitignore`，只留在雲端硬碟。
  建置部署時要從雲端資料夾整包複製（含這些檔案）到 C 槽暫存副本。
- 兩個後端主模型 `gpt-5.6-sol`／`gpt-5.6-luna` 名稱要在修改時確認仍可用，否則每次都會先失敗再退回。
