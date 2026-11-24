# Safari Count（HWG5 U4 How Many Koalas Are There?）交接

- 規格卡：`../rdq/RDQ-spec-safari-count-hwg5-u4-20261124.md`（11/24 老師確認 confirmed）。
- 架構沿用 `../hwg7-u04-world-routines/`（網站流程、口說評分、桌上微縮 3D、Godot 遊戲）。
- 六國：台灣 → 日本 → 肯亞 → 印度 → 新加坡 → 澳洲；12 題（9 複數＋3 單數 There's one ___.）。
- 花費關卡：Tripo 約 1,050 點（11/24 只剩 20 點，要老師加購）；Colab 約 24 單位＋檢查圖；每批先報。

## 進度
- 11/24 RDQ 確認。下一步：查證動物地點 → 12 題謎題總表＋六國對話稿交老師確認。
- 11/24 查證六國地點（臺北動物園遊客列車、富士 Safari 叢林巴士＋牧場迷你馬、Nairobi、Ranthambore、Night Safari＋River Wonders、Werribee＋Moonlit）→ `謎題總表與對話稿_v1_20261124.md`（12 題、六國對話、12 段動畫）已交老師，待確認。
- ✅ 11/24 老師：謎題總表與對話稿 v1 照這份做；日本第 2 題改成下車去牧場看馬（Let's get off the bus and go to the farm.）。下一步：台灣一站試做（謎題圖、配音、網站骨架免費先做；Tripo 熊貓＋黑熊＋遊園列車約 205 點，要老師先加購）。
- 11/24 Tripo 圖庫找台灣模型（沒花點數，餘額 20）：熊貓＝bearwolf8600 坐著吃竹子（含底座，不用骨架）；黑熊＝milostgameofficial 四腳棕熊（要改色成黑＋白 V，走路要綁骨架）；遊園列車圖庫沒有合適的 → 用 World Routines 已有的 toy_train.glb 改色（0 點）。截圖 tripo_candidates_taiwan.jpg。下載各 5 點；黑熊綁骨架 Recraft 5＋Rig 20。
- 11/24 晚 台灣不花錢部分完成（老師：等 Tripo 點數補充再建模）：
  - 謎題卡：`puzzles/src/cards.html`（?ans=PANDA|BEARS&stage=puzzle|hint1|hint2|answer）、`src/render.py`、`src/cut_icons.py`；圖示由 Codex 生 `assets/source/taiwan_sheet.png`（提示詞 p_tw.txt）切成 bamboo／bear／blackwhite／pears。總表 `puzzles/out/taiwan_cards_sheet.jpg`。
  - 配音：`web/make_audio.py`（照 World Routines：Mei＝Ana、主角女生 Jenny／男生 Christopher +50Hz、−12%；旅伴問句 he／she 兩版）→ `web/audio/taiwan-*.mp3` 11 檔。
  - 題庫：`content/stations.json`（台灣兩題＋五國 comingSoon）；`publish_to_site.py` 複製到網站 `public/safari-count/` 與 `functions/safari-content.json`。
  - 網站骨架：`app/safari/SafariApp.tsx`＋`safari.css`，路由 `/safari-count`（ClassActivities，無首頁入口）。流程：選主角 → 地圖（只開台灣）→ 問句 → 謎題卡（兩層提示、輸入謎底）→ 數動物（暫用 emoji）→ 拖放／錄音 → 回答 → 動畫製作中 → Does he/she like pandas? 拖放 → 蓋章。
  - 本機 qa：`web/qa_walk.py` 17 張截圖、0 錯誤（`taiwan_skeleton_walk.jpg`）。tsc／eslint 乾淨。
  - **還沒做**：學號登入與雲端紀錄、AI 口說評分（現在錄完就能下一步）、老師頁、3D 情境圖與動畫、拍照遊戲、其他五國。**未部署、未 commit**。
- 11/24 晚 老師請我寫信問 Tripo 客服 support@tripo3d.ai：每月 3,000 點何時補（日期、時間、時區）、沒用完的點數會不會累積。已從老師 Gmail 寄出，等回信。
- 11/24 晚 查 Tripo 說明中心〈How to Get Help and Contact Support〉：**沒有線上客服對話**；帳務問題官方管道是 Email support@tripo3d.ai（已寄），寫明 3 個工作天內回覆。其他管道：Discord（非官方）、Studio 的 Web Feedback（回報錯誤用）。
