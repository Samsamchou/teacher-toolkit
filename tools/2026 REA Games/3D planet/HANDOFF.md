# 3D Planet 二水小行星・逛街版 交接（2026-10-25）

規格：`rdq/RDQ-spec-ershui-planet-stroll-20261025.md`（status: confirmed）。參考作品分析：`資料/keelung-planet-分析筆記-20261025.md`。

## 資料夾
- `godot-ershui-planet/`：Godot 4.7.2 專案（GL Compatibility）。主場景 `scenes/main.tscn`；`scripts/world.gd`（星球、路網、建築）、`scripts/game.gd`（流程、介面、聲音、存檔）。
- `web-build/`：網頁匯出（pck 23.6 MB、wasm 37.7 MB）。**尚未部署**；本機預覽：`2026 REA Games/.claude/launch.json` 的 `ershui-planet-web`（http://localhost:8791）。
- `資料/`：251 張錄影截圖、OSM 原始資料（`osm/`）、兩份查證報告、Codex 生圖（`generated-images/`）。

## 地圖怎麼來的
- 路網、建築輪廓、警察局（二水分駐所）、消防分隊、廟宇、郵局、圖書館…都來自 **OpenStreetMap**（© OpenStreetMap contributors，ODbL 1.0；上線時要在畫面標示出處）。
- `tools/fetch_osm.py downtown|southeast` 下載 → `tools/build_osm_map.py` 轉成 `data/map.json`、`data/sets.json`。
- 比例：真實 1 m → 遊戲 0.55 m；星球半徑 R = 280。市區取車站周邊 460 m；**東南街區**（二水國中、源泉國小、林先生廟）與**八堡圳公園**一帶照真實街道，但和市區的距離壓縮（真實約 2.5–4 km），用聯外道路接起來。
- 豐柏廣場、復興國小、八堡圳農情館、水心之初大草原仍是「外圈示意」（照方位放、沒有真實街道）。
- 建築外觀依 `資料/research-ershui-streetscape-20261025.md`：紅磚洋樓、洗石子公館、磁磚透天、低矮老店屋、日式宿舍、鐵皮屋；三角仔三棟紅磚洋樓、中山堂（坍塌版）、宏和醫院、第七號官舍有名牌。

## 玩法（已做）
首頁空拍 → 5–7 組＋科幻 emoji（Codex 生圖 12 款）→ 5 套題組（每套 12 站、每次順序隨機；第 1 題固定 Ken＋tea shop/post office/library/supermarket）→ 押注 → Start → 角色沿真實路網走到地點 → 猜對 +2 → 必須按「Listen 聽句子」聽完正確句子才能 Next → 結果頁。
- 右上：Map、Fast ×3、音量、Repeat、**Save 保留**、Home。首頁有「Continue 繼續上次」。存檔在瀏覽器（`user://ershui_planet_save.json`），看完結果自動刪除。
- 語音：edge-tts 0.8 倍速（`tools/make_voice.py`，37 句）。音效：Kenney CC0。音樂：Suno 原創 bgm_street。

## 驗證
- `Godot_v4.7.2-stable_win64_console.exe --path . -- --test`（可設環境變數 `SET=0..4`）：跑完整套 12 題、存檔→讀檔、截圖 `test_*.png`。2026-10-25 Set 1、Set 3 都跑完，存讀檔回到同一題、分數相同。
- 網頁版在內建瀏覽器開啟、進到第 1 題，主控台沒有錯誤。
- **沒測**：iPad 實機、教室投影、真人點擊整套、聲音實際播放。

## 吉祥物（2026-10-25 老師選 B 水鈴、核准 Tripo 點數）
- 水鈴：第一版（雙手捧鈴）自動綁骨後頭髮走路會歪 → 用 Codex 重畫 A-pose（`資料/generated-images/mascot_B_shuiling_apose.png`）再做 → `assets/models/shuiling_rigged.glb`（9614 面、walk）。
- 圳寶：`assets/models/zunbo_rigged.glb`（9748 面、walk）。題型新增 Zun-Bo, where are you going? / I'm going to the __.（機器人聲音 en-US-AriaNeural +30Hz）。
- Tripo 花費：生成 55×3、減面 35、綁骨 20×3、套 walk 動畫免費；餘額 3000 → 2740。模型在 Tripo 帳號資產裡（未改成 Private，需老師在 Tripo 手動確認）。
- 吉祥物描邊用 0.3 倍粗細（太粗會有黑線穿過頭髮）；只有 walk 動畫，停下時回到綁骨站姿。檢查場景 `scenes/mascot_check.tscn`。

## iPad
- 是 Godot 網頁版，iPad 用 Safari 開網址即可玩（不用安裝）；所有操作都是點按（押注、Start、聽句子、Next、保留），沒有拖曳或鍵盤。
- 已在電腦瀏覽器模擬 1024×768 看首頁；**未在真 iPad 測**。網頁版約 65 MB（wasm 37.7 + pck 27.4），學校網路首次載入可能要數分鐘（同 HWG5 任務經驗）。

## 待辦／待老師決定
1. 真 iPad 實測（載入時間、觸控、聲音）。
2. 2026-10-25 已部署**預覽頻道** ershui-planet（到期 11-01）：https://hwg5-clock-tower--ershui-planet-macshnp6.web.app/ershui-planet/ 。網站資料夾 `escape room HWG5-U01-U02/site/public/ershui-planet/`（複製自 web-build），firebase.json 快取規則加了 ershui-planet。部署帳號 `--account u9431818@gmail.com`。正式站 live 沒動；首頁沒加卡片。老師 iPad 驗收後才上正式站。
3. 基隆小行星沒能在內建瀏覽器實際完成任務；分析改用錄影＋網站程式註解。
## v2（2026-10-25 下午，RDQ-spec-ershui-planet-v2-modes-buildings-20261025.md）
- 第一階段：iPad 選路線修好（按鈕四種狀態都換色）、Ken 細描邊、抵達鏡頭自動找不被擋的角度＋擋住的街屋變半透明（`tools/arrival_sheet.py` 產生 21 站檢查表 `arrival_checklist.png`）。
- 六種人物模式（首頁「3. Who walks?」）：ken／zunbo(he)／yuyu(she)／mix／we／where（顏色路名：依 OSM 路名分組，同一條路整場同色；寬路 Road、窄路 Street；到達時路面變色）。語音 80 句。
- 清心福全（疑似歇業）→ **五分田-二水光化店**（光文路 82 號）。
- 第二階段：22 處建築依網路最新照片＋老師的 Google 地圖連結（只看不存）→ Codex 參考圖（`資料/generated-images/buildings/`，provenance.json 有提示詞與 SHA-256）→ Tripo（`資料/tripo-buildings-20261025.json` 有每個 task 網址）→ `assets/models/bld_<id>.glb`；中文招牌用 Label3D 疊（模型上是英文佔位字）。二水國中第一次＋免費重試都壞掉（透空走廊讓 Tripo 混亂），改畫實心版本再做成功。Tripo 餘額 2740 → 1475。
- 網頁 pck 52.1 MB（復刻模型貼圖 768）。預覽頻道已更新。