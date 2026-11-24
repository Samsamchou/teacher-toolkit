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
- 11/24 晚 老師從 Tripo 使用紀錄找到：上個月補點是 **2026-10-24 22:35:49「积分充值 +3000」**。推測每月 24 日晚上約 22:35（Tripo 頁面顯示的時間）補 3000 點；11/24 22:35 後再看餘額。
- 11/24 晚 老師：情境動畫裡的 3D 動物要會走路、漫步、跑。查 Tripo：Auto Rig 有人形與四腳（quadruped）骨架；綁骨架後可套動作庫（Preset，人形看得到 Basic／Interactive／Scene／Emotional／Combat）或「AI Animation」用文字描述動作（每次 20 點、5 秒）；匯出 GLB 可帶多段動作給 Blender。四腳動物的預設動作清單要等有四腳骨架模型才看得到（API 文件有 quadruped:walk；跑步可能要用 AI Animation 描述）。
- 11/24 晚 老師：先寫程式與動作表（等點數補上前）。
  - `12段動作表_v1_20261124.md`：12 段動物動作（坐、漫步、小跑、趴、吃草、張望、跳、爬、爬樹、打哈欠）、路線、交通工具、Tripo 點數預估約 600–1,100（圖庫為主約 700）、Colab 約 24 單位。✅ 11/24 老師確認。
  - `tabletop/src/animal_path.py`（純 Python，本機可測：`python tabletop/src/animal_path.py` → self-test OK）：平滑路線（弧長）、從腳步量動作的地面速度、播放倍率（避免滑步）、群體錯開、最小間距。
  - `tabletop/src/animals.py`（Blender，只在 Colab）：Animal（讀帶動作的 GLB、找腳骨、量步速、NLA 播放／循環、walk 沿路線走、climb 爬樹、play 原地動作）、herd_walk、report（著地腳滑動 mm、群體最近距離）。**還沒在 Blender 實際跑過**：要等有帶動作的四腳模型（先用臺灣黑熊試）。colab_run 要再加上傳 animal_path.py／animals.py。
