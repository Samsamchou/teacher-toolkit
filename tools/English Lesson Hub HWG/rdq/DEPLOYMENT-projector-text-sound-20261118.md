# 投影大字、遊戲預設有聲音、投籃命中音效 — 正式部署 2026-11-18

教師確認 RDQ 規格（1A、2B、3A、4A；建議①–⑤）並要求「完成後直接部署」。規格：`rdq/RDQ-spec-projector-text-sound-20261118.md`。正式入口：https://lesson-hub-v03.web.app/lab 。

## 正式版本

- Hosting **lesson-hub-v03**：`e321f6982d1fcdb6` → `sites/lesson-hub-v03/versions/2c9fe24aa6b7412d`（UTC 2026-11-18T00:49:22.057Z）。
- 只部署 Hosting：後端與線上 liveV2 `livev2-00023-wuq` 相同，13 個 Functions 未變。

## 本次上線

- 分配作答頁投影大字：題目約 40 px、題目說明約 32 px、選項約 34 px（1280 px 以上寬度）；依螢幕寬度縮放，iPad 1024 寬約為題目 33 px、選項 29 px。選項改單欄、長句換行；聽力播放器、回饋文字、按鈕同步放大。
- 遊戲頁狀態列、底部導覽、遊戲按鈕文字放大（大電視最多 26 px），1024×768 仍一頁看完。
- 分配遊戲預設有聲音：改用分配專用的偏好設定（`lh-assignment-reward-preferences`、`lh-assignment-sports-preferences`），過去在課堂版存下的「靜音」不再套用；學生在分配遊戲中自己按的靜音仍會記住。Teacher-led 課堂遊戲維持原本設定。
- 投籃音效（WebAudio 合成，無音檔）：球到籃框時，進球「唰」入網聲、沒進「碰框」聲；進球結果出現時加小歡呼。
- 遊戲頁第一次出現時顯示「🔊 點一下開啟聲音」，點一下播放提示音並收起（同一個瀏覽器分頁只出現一次）。

## 驗證

- 隔離副本 `%TEMP%\lesson-hub-projector-sound-20261118`：10 項部署前檢查通過（Node 325/325、Functions 10/10、建置等）；site-data 於原專案 errors 0。
- 本機實測（模擬資料）：1920×1080 題目 40 px、選項 34 px 單欄；1024×768 題目 33 px、選項 29 px，題目頁與遊戲頁皆不需捲動。Bowling 在舊靜音記憶存在時仍預設有聲音。投籃以音訊節點紀錄驗證：出手→約 0.68 進度時入網聲→結束時歡呼；碰框聲以直接呼叫驗證（兩次實投都進球）。截圖：`qa/projector-text-sound-20261118/screenshots/`。
- 公開讀回 209/209（189 全文 SHA、20 gzip ETag＋長度），三入口 200；正式 `/lab` 已載入新樣式。瀏覽器若顯示舊頁，重新整理即可。

## 未驗證與交接

- **教室大電視後排實際可讀性、實際聽到的音量與音色尚待教師驗收**（自動化無法聽聲音）；iPad Safari 實機待驗收。
- 沒有 Git stage／commit／push（repo index SHA 前後相同）。證據：`qa/projector-text-sound-20261118/`。
