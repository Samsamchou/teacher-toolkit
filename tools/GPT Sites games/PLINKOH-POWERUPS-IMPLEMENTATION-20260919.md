# Plink-oh! 卡牌與 Winner 更新 — 本機交付

版本：2026.09.19-plinkoh-powerups-preview.1。2026-09-19。依已確認 RDQ 製作；未部署。

## 已完成
- 六張可操作的 SVG 卡牌：Double Pegs（碰柱 ×2）、Double Slot（底槽 ×2）、Bonus 10（+10）、Second Chance（兩球取高）、Big Ball（實際半徑 ×1.4）、Safe Landing（總分至少 20）。
- 每組整局 3 次；每次展示固定保存的 3 張不同卡，選 1 張或不用，不疊加。只有成功結算才扣次數，略過不扣。
- Second Chance 第一球先保存；第二球途中刷新保留第一球，第二球重做。兩球完成後取高分、入帳一次、扣一次。
- 原 version 1 未完成局維持無卡牌規則；新遊戲 version 2 啟用卡牌。儲存鍵不變，可找到原有進度。
- Winner 原創 5.0 秒號角式旋律與掌聲，皇冠入場、勝利球跳躍、彩紙。5 秒後停止並留下排名；平手共同慶祝；跳過、背景隱藏、退出清理音源，總靜音與減少動態有效。
- 遊戲介面全英文；開局設定與接續舊局說明英中雙語。盤面維持原尺寸。

## 原片證據界線
再次檢視 `參考遊戲/plink oh.mp4` 的設定操作，72–75 秒提示可選種類與機率，但沒有打開卡牌清單，因此不能確認原版卡牌名稱。這六張卡與勝利音樂是本專案新增設計。來源分析與 22 張擷取畫面保留在 `qa/plinkoh-powerups-review-20260919/`。原有 8 組來源音效對照與原始影片均保留。

## 驗證
- 完整 Node 測試及正式建置，見 `qa/plinkoh-powerups-20260919/tests.log`、`build.log`。
- 真實瀏覽器逐張選卡、落球與結算；第二球刷新恢復、卡牌耗盡、略過、舊局、固定抽牌。16 種卡牌版面組合（2/5/10/15 組 × 4 種尺寸）。
- 原有回歸：6 回合 12 次真實落球、16 種盤面版型、鍵盤、暫停、刷新、雙擊、教師加減分、遊戲大集合顯示/隱藏。
- 音效載入失敗與重試、觸控、其他既有遊戲入口。勝利 5 秒實測、跳過、背景隱藏、退出、總靜音與減少動態測試通過。
- Big Ball 240 次加大球物理測試，加上原有 600 次一般落球測試通過。
- 有聲示範 `qa/plinkoh-powerups-20260919/powerups-winner-with-audio.mp4`：15.21 秒、413 個實際瀏覽器影格，錄下遊戲 Web Audio 輸出，非麥克風或其他系統音訊。示範以明示的最後一組測試進度起始，之後選卡、物理、加分及勝利演出都是真實流程。

## 主要檔案
- `src/plinkoh-cards.mjs`：六張卡與分項計分。
- `src/plinkoh-model.mjs`：抽牌、額度、兩球交易與舊局恢復。
- `src/plinkoh-physics.mjs`：可變球半徑。
- `src/PlinkOhGame.jsx`、`src/plinkoh.css`：介面與五秒演出。
- `src/PlinkOhAudio.js`、`public/plinkoh/audio/win.wav`、`win.json`：慶祝聲及雜湊紀錄。
- `tests/plinkoh-powerups.test.mjs`、`tests/plinkoh-powerups-browser.mjs`、`tests/plinkoh-victory-controls.mjs`：新規則測試。

## 預覽與限制
本機 http://127.0.0.1:5194/ → Plink-oh! → New game。QA 檢視：`qa/plinkoh-powerups-20260919/index.html`。
Drive 為權威原始碼；乾淨本機執行目錄為 `C:/Users/User/AppData/Local/Temp/gsg-plinkoh-20260919`，用 `scripts/plinkoh-preview.ps1` 準備或啟動。複製不包含私人憑證。
未部署、未提交或推送 Git。本次自動測試不等同教室實機觸控或喇叭聽感驗收；請老師試聽五秒慶祝音量與觀感。建置僅有既有大型 bundle 提示。
