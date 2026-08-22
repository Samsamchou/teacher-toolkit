# HWG7 SR 口說評測網站｜v2 正式部署與 QA 報告

## 結論

2026-08-22 的指定修改已完成，並正式部署至 `setencerevieworalpractice`；22:08（Asia/Taipei）完成查驗。正式網址：https://setencerevieworalpractice.web.app

## 正式部署結果

- Firebase Hosting：新版本發布完成；361 個公開檔案。
- Cloud Functions v2：8／8 `ACTIVE`；Node.js 22；`asia-east1`。新建 `teacherRecording`，其餘 7 個 Functions 更新成功。
- Firestore／Storage：拒絕瀏覽器直接讀寫的規則編譯並發布成功。
- 正式 CORS：只允許 `web.app` 與 `firebaseapp.com` 兩個正式網域；`REQUIRE_APP_CHECK=true`。
- OpenAI：沿用既有 Firebase Secret `OPENAI_API_KEY` v1；沒有建立、替換或輸出金鑰。

## 已完成修改

| 需求 | 完成內容 |
|---|---|
| 移除功能／規則說明 | 首頁、遊戲頁、教師登入與結果區移除給建置者看的功能、規則與公式說明。 |
| 問答題只錄答句 | UI、傳輸資料、逐字稿、評分與教師紀錄都只處理學生答句，不再要求朗讀問句。 |
| Comic Relief | Regular／Bold 字型與 OFL 授權自架；所有英文介面套用 Comic Relief。 |
| 自然美式朗讀 | 7 題朗讀題旁加入「AI 語音」按鈕；使用 OpenAI `gpt-4o-mini-tts`、`marin`、原生 `speed: 0.8` 靜態 MP3 與 AI 語音揭露。OpenAI TTS 不套用 SSML。 |
| 六回合輪替 | 每局固定：奇數回合 A 朗讀／B 回答，偶數回合 A 回答／B 朗讀；兩人各完成 3 題朗讀與 3 題回答；新局重新由相同配置開始。 |
| 答句鷹架 | 第 6 題 `___ her _____.`；第 8、10 題 `His ______ _____.`。 |
| 縮寫等值 | `They’re`／`They are` 及其他已確認縮寫／完整形式依目標句等值評分。 |
| 教師錄音播放 | 移除短效簽名網址；改由已登入教師呼叫受保護二進位端點，前端建立可播放 Blob URL，並在 Safari 自動播放受阻時保留手動播放控制。 |

## 驗證證據

| 驗證 | 結果 |
|---|---:|
| 網站單元／合約／評分／資產測試 | 35／35 PASS |
| Functions 單元與安全測試 | 49／49 PASS |
| 題庫驗證 | 13／13；10 個滿分答案版本；250／250 局輪替 PASS；0 warning／0 error |
| Functions 語法檢查 | PASS |
| Firebase Emulator | PASS：固定局次、放棄、冪等完成、教師登入／查詢／軟刪除／登出 |
| 教師錄音端點 | 匿名 401；登入後 200、`audio/webm`、8／8 測試位元組一致、禁止公開快取 |
| Firestore／Storage 規則 | 匿名 403／403 |
| 逐題版面 | 13 題 × 2 視窗 = 26／26 PASS；缺圖 fallback 1／1 PASS；共 27 張截圖 |
| 本機靜態資產 HTTP | 首頁、2 個字型、7 段 MP3 全部 200；MIME 與位元組長度相符 |
| 正式線上 QA | 14／14 PASS；13 張圖、App Check、CORS、首題開局／放棄、錄音端點 session 防護、瀏覽器錯誤 0 |
| 正式檔案一致性 | 首頁、API 包裝、2 個字型、7 段 MP3，共 11／11 與本機 SHA-256 相同 |
| 正式 Functions | 8／8 ACTIVE；`evaluateSpeech` 綁定既有 `OPENAI_API_KEY` Secret v1 |

## 金鑰與安全

- 沿用既有、已由 Git 忽略的本機 OpenAI 金鑰；沒有建立新金鑰、沒有輸出金鑰內容，也沒有把金鑰寫入前端或報告。
- TTS 產生器會拒絕格式異常的程序環境值，再使用有效的既有本機設定。
- 正式轉錄仍只允許後端 Firebase Secret `OPENAI_API_KEY`；瀏覽器無法取得金鑰。
- 教師錄音不再傳回 Storage 簽名網址；每次播放都必須通過教師 session 驗證。

## 產出位置

- 題庫驗證：`data/hwg7-sentence-review-validation.md`
- TTS 清單：`audio/hwg7-sr/manifest.json`
- TTS 產生器：`scripts/generate-hwg7-tts.mjs`
- Functions 說明：`functions/README.md`
- 版面 QA：`../qa/question-image-layout-20260822/report.json`
- 正式線上 QA：`../qa/live-deployment-20260822/report.json`
- 正式資產雜湊：`../qa/live-deployment-20260822/deployed-assets-v2.json`

## 尚待正式驗收

- 實體 iPad Safari 橫式的麥克風錄製、AI 語音播放與教師錄音播放，仍需真機抽查；目前版面 QA 是 Chromium 加 Safari User-Agent／觸控模擬。
- Codex 應用程式內建瀏覽器橋接因 Windows sandbox `helper_unknown_error` 無法啟動，已改用專案隔離 Chrome CDP QA；未取用使用者瀏覽器 cookies 或登入狀態。
- 舊檔 `LOCAL-QA-REPORT-20260822.md` 是先前正式版本的歷史證據；目前正式版本以本 v2 報告為準。

## 部署閘門

本次部署授權已使用完畢，不自動延伸到後續修改。未來再次正式上線時，仍須重新收到精確授權：

`確認部署 setencerevieworalpractice`
