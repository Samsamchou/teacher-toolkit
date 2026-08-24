# 國小英語情境任務網站｜本機遊戲化版

本資料夾是 HWG7 U01+02「二水國際交流日：Welcome Route Rescue」的可試玩網站。內容包含 6 座守護站、18 個主題題、3 個必經圖片辨識子題、21 組中英任務引導、Energy／提示／答對解析、同次作答恢復與本機測試報表。

## 本機執行

在專案根目錄執行：

```powershell
python -m http.server 4180 --bind 127.0.0.1 --directory 'site\public'
```

再開啟 `http://127.0.0.1:4180/`。

## 驗證

```powershell
& 'C:\Program Files\nodejs\npm.cmd' --prefix site test
& 'C:\Program Files\nodejs\npm.cmd' --prefix site run check
```

## 已完成的遊戲化改版

- Energy 顯示真實分數；填充視覺限制在 0–100，90 以上滿格發光，並以 360ms 顯示本次增減，既有計分公式不變。
- 六座守護站只顯示站名與鎖定／目前／完成狀態；學生端隱藏內部題號、節點計數與 Mission 編號，保留 A／B／C 選項字母。
- 21 個必經節點都有英文情境、簡短中文說明與「任務目標」，中文不直接翻出答案。
- 英文使用網站內附 Comic Relief WOFF2；授權檔與來源說明位於 `public/assets/fonts/`。
- 67 個 WebP 網站資產均列入 manifest；場景與終局圖提供 1x／2x，圖片辨識子題採滿寬三圖版型。
- 支援 48px 觸控目標、安全區、1024×768 緊湊版型與 `prefers-reduced-motion`；iPad Safari 實機仍列在正式驗收範圍。

## 尚未冒充完成的正式功能

- 學號名冊、Firebase Anonymous Auth、Firestore 跨裝置保存及 Security Rules 尚未設定。
- 六碼教師通行碼必須由後端驗證；本機版只提供明確標示的測試報表。
- 現在的朗讀按鈕是裝置語音開發預覽；正式 OpenAI `cedar`／`marin` 靜態音檔、受控 SSML 編譯與人工發音 QA 尚未執行。
- `firebase.json` 與 deny-all `firestore.rules` 只是安全基線；沒有綁定專案，也沒有部署。
- 尚未完成真實 iPad Safari、Firebase 離線重送及跨裝置驗收。
