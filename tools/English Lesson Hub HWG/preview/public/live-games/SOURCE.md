# 單人遊戲來源紀錄（2026-09-24）

只在 English Lesson Hub 建立副本／adapter；來源專案沒有修改。

- 籃球來源：G:/我的雲端硬碟/teacher-toolkit/tools/GPT Sites games/src/basketball-model.mjs、BasketballGame.jsx、basketball.css 與 public/basketball/court.png。保留 1／2／3 分投籃及 84／56／25% 基礎命中率；單人版已複製原球場圖、三張動物 sprite，移植來源籃框、拋物線、命中／失手與角色／籃網動畫；移除多人追分／道具。
- Plink-oh! 來源：同專案 src/plinkoh-physics.mjs、plinkoh-model.mjs、PlinkOhGame.jsx 與 plinkoh.css。物理引擎複製至 src/live/reward-physics.mjs（改 import、格式化）；單人版移植黃紫舞台、藍色釘盤、彩色槽、漸層球與落球效果，採第一關／5 個放球區、碰撞分＋落格分；不加入多人計分或道具。
- 拉霸來源：G:/我的雲端硬碟/teacher-toolkit/tools/sf3-4-voc/site/public/index.html 的 Slot／slotSound 及機台 CSS。單人版移植黃色機台、白色視窗、逐軸滾動／停轉與得分彈出動畫；沿用六種符號與 100／50／10 分，改成後端決定結果、每題 2／1 次配額，而非原版固定 4 次。
- 新共用音效為 Web Audio 短提示音，未複製原遊戲背景音樂。預設靜音。

三張既有動物圖由 GPT Sites games/public/basketball 複製，非新生圖；來源與目的 SHA-256 已比對一致：

| 檔名 | SHA-256 |
|---|---|
| cat-dog.png | F7C41FDB579EC1B6FFDAC426CE46032B145F6FC013018E1631330C5D8830C46D |
| fox-penguin.png | 8FFD81C987ADCD6BACFA1374EC991AD8D6A3A570EE47144A70BDD3F82D97F4F8 |
| rabbit-panda.png | AB2C0BC8B1D3E76740733BD28FF65A2513462D07188606C02A41D5358E697D83 |
| court.png | 75988F6077AD976A25D15B1B78AAAFC654E9A5389C0E510E8709D96FCE64F2D4 |

此為保留單人、教師優先與後端可信計分的視覺／動畫移植，不宣稱整個多人遊戲 UI 與音樂原封不動。三款畫面與 820px／390px Chrome 互動回歸已通過；真人裝置的音效、動畫流暢度與課堂可讀性仍待教師驗收。
