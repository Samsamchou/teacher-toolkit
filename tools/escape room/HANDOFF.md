# Escape Room（國小英語情境任務網站）交接文件 / Handoff

> 交接日期：2026-10-17｜最後一次開發：2026-08-24｜最後 commit：`24dbbe7`
> 讀取順序：本檔 → `RDQ-需求規格卡.md`（v2.2，主規格）→ `site/README.md` → `question-bank/…-v0.2.md`

## 1. 專案是什麼

iPad 橫向優先的國小 5–6 年級英語「情境任務」網站。首套內容 HWG7 U01+02：「二水國際交流日：Welcome Route Rescue」。
6 座守護站、18 個主題題（11 core／6 power／1 bridge）、3 個必經圖片辨識子題，共 21 個必經節點。
8 位固定虛構角色（Andy、Alan、Ken、Wei、Amy、Lynn、Maya、Mina）、吉祥物水水。

## 2. 網址現況（重點）

**沒有正式網址。** 沒有部署到 Firebase Hosting 或任何正式託管；`site/` 沒有綁定 Firebase 專案（無 `.firebaserc`、`firebase-config` 為空值）。

- 本機試玩：`python -m http.server 4180 --bind 127.0.0.1 --directory 'site\public'` → `http://127.0.0.1:4180/`
- 意外可開的非正式網址：因 `teacher-toolkit` repo 啟用了 GitHub Pages，且 `24dbbe7` 已推送，下列網址 2026-10-17 實測 HTTP 200 且內容是本站：
  `https://samsamchou.github.io/teacher-toolkit/tools/escape%20room/site/public/`
  這只是靜態副本：無 Firebase、無學號名冊、教師後台是本機測試版、語音是裝置語音。**不要當成正式發布給學生**；若不想公開，需決定是否移除（教師決定，勿擅自處理）。
- 候選 Firebase 專案 `hwg8-starter-listen-speak` 只登錄在規格，未 login、未綁定、未部署。

## 3. 已完成

- RDQ v2.2、題目設計表 v0.5（Q1–Q18＋3 子題，教師已確認）。
- ImageGen 60／60 張主圖（`assets/imagegen/masters/`，含 raw／rejected／QA 留痕）；網站用 67 個 WebP（`site/public/assets/`）。
- 本機遊戲化網站（`site/public/`：靜態 ES Modules，無外部套件）：Energy／六站／六物件 HUD、21 組中英任務引導、兩級提示、答對解析、同次作答恢復、本機測試報表與 CSV。
- 測試：`npm --prefix site test`（5 組）2026-10-17 重跑全部 PASS。

## 4. 尚未完成（皆未執行，勿當作完成）

1. 學校實體 iPad Safari 1024×768 全流程驗收（下一步第一項）。
2. 教師逐題內容審核。
3. 正式 OpenAI TTS 靜態音檔（gpt-4o-mini-tts、speed 0.8、cedar／marin，需教師試聽）＋受控 SSML 編譯＋人工發音 QA；目前只是 `speechSynthesis` 預覽。
4. Firebase：Anonymous Auth、學號名冊、Firestore 規則（現為 deny-all）、六碼教師後台（需後端／Secret／失敗鎖定／限時 session，可能要 Blaze，須教師授權）。
5. 全批 OCR 洩題掃描（本機無 OCR，只做檔名／alt 掃描）。
6. 部署與資料保留期限決定。
7. 其他 7 張「即將開放」任務卡（HWG7 U03+04、HWG5、HWG8、HWG6）內容尚未開始。

## 5. 重要規則（延續專案基線）

- 繁體中文＋英文；學生資料去識別化（只用學號）。
- 不提交金鑰／token／六碼通行碼；OpenAI 金鑰不得進瀏覽器。
- 未經教師明確授權，不 login Firebase、不部署、不升級付費方案、不改已確認題目內容（改動須重新確認）。
- 八層設計規則與退件條件見 RDQ §5.2；不得複製參考網站（6 Powers, 7 Up!／Fatbat）的角色、文字、圖片。
- 學生端不顯示題號、x/18、Mission 編號（內部報表仍保留）。

## 6. 檔案地圖

| 路徑 | 內容 |
|---|---|
| `RDQ-需求規格卡.md` | 主規格 v2.2 |
| `rdq/` | 子規格：首頁＋首套任務、遊戲化 UI |
| `question-bank/` | 題目設計表（用 `-v0.2` 檔，含 60 張產圖清冊） |
| `site/public/` | 網站本體（`app.js`、`data.js`、`game-rules.js`、`storage.js`、`styles.css`） |
| `site/tests/` | 5 組測試；`site/firestore.rules` deny-all；`firebase.json` |
| `scripts/` | 圖片 alpha 修復、WebP 建置、接觸表等 Python 腳本 |
| `assets/imagegen/` | 主圖、raw、rejected |
| `escape room/` | 82 張來源截圖（未提交，僅供參考） |
| `tmp/` | 暫存／QA（未提交） |

## 7. 在 Claude 環境接續

1. 工作目錄設為本資料夾；先讀本檔與 `RDQ-需求規格卡.md` §5.7–5.10、§9.2。
2. 跑 `npm --prefix site test` 確認基線。
3. 下一步按教師決定：iPad 實測 → 內容審核 → TTS／Firebase／部署（逐項取得授權）。
4. 備註：Google Drive 掛載資料夾列舉很慢，用 Glob／指定子路徑較快。
5. Git：`tools/escape room/` 下仍有未追蹤的 `escape room/`（截圖）與 `tmp/`，本檔為新增未提交。
