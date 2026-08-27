# 模式：擴增 HWG5 正式站

## 固定目標與範圍

- Firebase project：`hwg5-su-to-u04-story`
- 正式站：`https://hwg5-su-to-u04-story.web.app`
- 只處理教師指定的 theme/unit 與其必要字典資料。

先從實際專案讀取 `HANDOFF.md`、專案指示、Git 狀態、`firebase.json`、`public/index.html`、AI 評分模組、Functions、Rules/Indexes 與測試。不得只依這份參考假設目前實作仍相同。

## Dry run

1. 驗證內容契約。
2. 對來源專案做唯讀基線檢查與 SHA-256 快照。
3. 偵測目標 key 是否已存在；若已有題目，標示人工合併審查，不可覆蓋。
4. 產生相容既有 `id / en / zh / focus / ssml` 的 `current-site-adapter.json`。
5. 產生字典候選項、變更檔案清單、保留條件與批准閘門。
6. 不修改 `public/index.html`，不呼叫 Firebase，不部署。

## 教師確認後的本機實作

- 保留既有畫面、評分欄位、結構化 JSON 驗證、Agent Platform backend、App Check、TTS、每日每題三次、`reading_records` 欄位與七個月到期日行為。
- 以最小變更新增單元題庫與必要字典，不順手重構教師登入或其他既有功能。
- 若現況與上述基線不同，先回報差異，再決定是否擴大範圍。
- 使用測試確認總分公式、錯誤回覆拒絕、App Check 初始化、TTS callable、到期日與畫面欄位未回歸。
- 真機麥克風、學生帳號、Firebase Console 與 production 仍需分開驗收。

## 不可做的事

- 不把樣本句、未確認句或自動猜測的發音分析加入正式題庫。
- 不複製、重設或輸出正式站 Firebase config、reCAPTCHA site key、教師密碼與學生資料。
- 不為了擴增內容而修改歷史錄音、既有未到期紀錄或 retention policy。
- 父儲存庫有其他變更時，不 stage 專案外路徑。
