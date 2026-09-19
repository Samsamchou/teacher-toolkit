# Plink-oh 卡牌插畫與 Firebase 發布

日期：2026-09-19。版本：2026.09.19-plinkoh-cards.1。
使用者已確認全部圖像建議，並明確授權完成後直接部署 Firebase。
正式站：https://gamesinclass-5d9d1.web.app/

## 完成內容
六張 SVG 以遊戲中相同的球、柱子和底槽為主體，加入漸層、陰影、描邊及高對比結果：
- Double Pegs：碰柱 +1 → +2。
- Double Slot：落入底槽，20 → 40。
- Bonus 10：加分牌 +10，30 → 40。
- Second Chance：第 1、2 球分别 30、50，皇冠與勾選標出 50。
- Big Ball：相同球型以真實半徑比例 1 → 1.4 並排。
- Safe Landing：12 → 20，盾牌和最低分界線。
卡面插畫放大，保留全英文提示。卡牌規則、扣除次數、Second Chance 恢復及舊局相容沿用既有實作。

## 檔案
- 六張獨立圖檔：public/plinkoh/cards/*.svg。
- 資產描述及 SHA-256：public/plinkoh/cards/manifest.json。
- 可重製的向量繪製程式：scripts/generate-plinkoh-card-art.py。
- 遊戲接入：src/PlinkOhGame.jsx、src/plinkoh.css。
- 六卡總覽與隱藏英文版本：qa/plinkoh-card-art-20260919/index.html、six-cards.png、six-cards-no-explanation.png。
- 已確認 RDQ：rdq/RDQ-spec-plinkoh-card-art-deploy-20260919.md。

## 驗證與發布
92 項 Node 測試通過；六張圖 × 三種視窗的 18 組瀏覽器檢查通過，包含完整載入、沒有截切及實際選卡。已目視檢查六卡總覽。
正式建置通過，資產建置檢查會核對六張 SVG 雜湊。建置仍有既有大型 bundle 提示。
部署指令：firebase deploy --only hosting --project gamesinclass-5d9d1 --non-interactive。
部署前比對當時正式版本 2026.09.19-unscramble-rejoin.3：其他遊戲原始碼雜湊保持一致；本次帶入已完成的 Plink-oh 遊戲、卡牌、五秒 Winner 與新版插畫。
發布日誌及結果：qa/plinkoh-card-art-20260919/firebase-deploy.log、firebase-deploy-result.json。
線上檔案雜湊與入口檢查：同目錄 production-hash-report.json、production-browser-report.json。
只發布 Hosting，沒有修改 Functions、資料規則，亦未提交或推送 Git。
線上匿名入口檢查不代表已完成教師登入後實玩；不宣稱已驗證實際學生的看圖理解度，教師可使用遮字總覽進行課堂確認。
