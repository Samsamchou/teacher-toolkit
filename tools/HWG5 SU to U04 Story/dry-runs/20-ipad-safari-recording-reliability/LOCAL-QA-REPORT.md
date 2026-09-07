# iPad Safari 連續錄音可靠度修復：本機 QA 報告

- 日期：2026-09-07
- 狀態：本機實作、自動測試與正式 Hosting 部署通過；待學校 iPad 真機驗收
- 正式目標（未變更）：`hwg5-su-to-u04-story`
- 正式網址：https://hwg5-su-to-u04-story.web.app

## 結果

已針對 22 位學生同堂使用、其中 3 位在第二題持續收到 Firebase AI `400 invalid argument` 的情境完成本機修復。程式不再把 Safari 的 100 ms 分段 Blob 直接送交 AI，也不會在最後資料片段完成前關閉音訊資源。

`audio/mp4` 本身是 Firebase AI Logic 支援格式，因此本次沒有用錯誤的 MIME 標籤掩蓋問題。新流程會先等待完整 `stop/dataavailable`、驗證 MP4／WebM 容器、由 Safari 本機 AudioContext 真正解碼，再統一編碼為單聲道 PCM WAV 後送評。WAV 也是 Firebase AI Logic 官方支援格式。

參考：

- Firebase AI Logic supported input files：https://firebase.google.com/docs/ai-logic/input-file-requirements
- Firebase AI Logic audio input：https://firebase.google.com/docs/ai-logic/analyze-audio
- WebKit MediaRecorder：https://webkit.org/blog/11353/mediarecorder-api/
- MDN `dataavailable` event：https://developer.mozilla.org/docs/Web/API/MediaRecorder/dataavailable_event

## 已實作

1. 移除 `MediaRecorder.start(100)`，改為無 timeslice 的完整錄音。
2. 每題建立獨立 session、Recorder、chunks、VAD 與錯誤狀態。
3. 等待最終 `dataavailable` 與 `stop` 後才建立錄音 Blob。
4. 檢查音檔大小、MIME、WebM／MP4／WAV 容器標頭與解碼結果。
5. 將已解碼錄音混合成單聲道 PCM WAV；最長錄音 45 秒，避免失控檔案。
6. 只有網路、逾時、429、5xx 自動退避重送，最多 2 次；400 不盲目重送。
7. AI 失敗時只在目前分頁記憶體保留最後一份 WAV，顯示「重新送出評分（不必重錄）」。
8. 失敗與重新送評不扣每日三次；成功才計次及寫入 Storage／Firestore。
9. 成功、新錄音、換頁、回首頁、切換學生或離頁時清除暫存。
10. 學生畫面不再顯示 Firebase 端點與原始內部例外；診斷資料不含音訊或學號。
11. Storage 副檔名跟隨實際 MIME；新流程成功音檔為 `.wav`。

## 測試證據

### 完整自動測試

執行：

```powershell
firebase emulators:exec --only firestore,storage "npm run check && npm test"
```

結果：

- 語法檢查：通過。
- 測試總數：41。
- 通過：41。
- 失敗：0。
- 略過：0。
- Firestore 與 Storage emulator：皆實際啟動並驗證規則。

涵蓋 Safari MP4 fallback、MP4／WebM／WAV 標頭、WAV 編碼、四題連錄、失敗暫存生命週期、400 不重送、429／5xx／網路／逾時有限重送、22 個並行工作階段狀態隔離、既有題庫、AI 結構化 JSON、App Check、教師權限、Storage／Firestore Rules 與七個月到期日。

### 本機 Hosting smoke test

執行：

```powershell
firebase emulators:exec --only hosting "node tests/hosting-smoke.mjs"
```

結果：

- `/`：HTTP 200，160,598 bytes。
- `/recording-reliability-core.js`：HTTP 200，9,704 bytes。
- `/ai-scoring.js`：HTTP 200，4,515 bytes。

## 保留不變

- 84 句既有題庫與中英文內容。
- AI 評分欄位、結構化 JSON 與 `gemini-3.7-flash` Agent Platform 設定。
- reCAPTCHA Enterprise App Check。
- Google 教師登入與學生匿名 ownerUid 隔離。
- 每題每日最多 3 次成功評分。
- Firestore 七個日曆月 TTL 與 Storage 215 天 lifecycle。
- 未搬移、回寫或刪除任何既有紀錄或音檔。

## 正式部署與讀回

- 部署時間：2026-09-07T13:23:06+08:00 前完成。
- 部署命令：`firebase deploy --only hosting --project hwg5-su-to-u04-story`。
- Firebase CLI：`Deploy complete`，Hosting release complete。
- 部署檔案：Firebase 回報 `public/` 共 5 個檔案，本次上傳 2 個新／變更檔案。
- 正式首頁：HTTP 200，160,598 bytes；SHA-256 與本機一致：`E5A2D15EF9E583B878F9CD1BE368D509EDA50B847C8A202A781E58D748AD53CE`。
- 正式錄音核心：HTTP 200，9,704 bytes；SHA-256 與本機一致：`A8BB7B6932628741328BA8F93329DD563ACA1E3E7E85DF6634CC24F56BC45018`。
- 正式 AI 模組：HTTP 200，4,515 bytes；SHA-256 與本機一致：`ED3BE9E7AAB88CBD2A1C4AF40D4BA43E564E51917BCFE62318982B2B15458D8F`。

本次只部署 Hosting，未部署 Functions、Firestore Rules 或 Storage Rules，也未變更 App Check、配額、預算或保存政策。

## 尚未驗證與後續關卡

- 尚未在學校實際 iPad＋Safari 連續錄製四題。
- 22 工作階段測試是本機模擬，不等同 22 台裝置同時呼叫正式 AI 服務。
- 尚未以真實學生錄音呼叫正式 Firebase AI、Storage 或 Firestore 寫入。
- Google Drive 指定專案備份已更新：本機與備份皆為 217 個納管檔案、1,277,026 bytes；缺檔、多檔與 SHA-256 差異皆為 0。
- 本專案 10 檔實作提交 `a3e4f52d4aeab59768d21fc18e1ccc54ce9a2353` 已讀回包含於 GitHub `origin/main` 的 `15ce08e5b22247721267d32e3eb1fd72316673fd`；本報告與 HANDOFF 的最終收尾更新已於本機精準提交，尚待獨立推送。

正式站已發布；下一關是由教師使用學校 iPad＋Safari 連續完成至少四題，並確認學生畫面、教師後台及音檔讀回。
