# 二水桌上小鎮問路動畫（Where's the ___? It's on ___ Road/Street.）｜交接

規格卡 `rdq/RDQ-spec-where-road-ershui-20261115.md`（confirmed 11/15）。畫風 H 桌上微縮（範本：感恩節桌上版、`h-tabletop/src/h_scene.py`；Blender 只在 Colab）。
- 故事稿 v2（11/15，每題加串場、Your turn 4 題，約 3:52）：https://docs.google.com/document/d/1ys_kcFtAGH_TkEbhFuAML3Z3JvXpBXCXsA_cf8uvRiA/edit ；`script/make_story.py`（ROADS、LINKS、TURN）。等老師看稿。

## 目前狀態（11/15 晚）
- 故事稿 v2 核准、樣張核准、**試片 v3 核准**（`renders/rd-trial-s01-v3(-720p).mp4`，開場＋第 1 題 train station / Red Road）。
- 程式：`src/town.py`（桌上小鎮、3D 圓形圖示牌 TRACK_TO 面向鏡頭、近景 lens>36 縮小、MODE sample/all）、`src/colab_3d.py`（session rd3d）、`film.js`（2D 疊字；kara bottom 110px）、`src/voices.json`（54 句，已生成 s00、s01）。
- **Colab 單一 exec 超過 25 分鐘會被殺** → 一定用 `FR_RANGE` 分批（`work/run_trial_batches.sh`，每批 300 格、G4→L4 退路、每批下載）。
- Colab 餘額 65.36（11/15 本片累計約 9.3 單位）。

## 下一步（11/16 做全片）
1. 老師唯一修改：Find it! 那行字幕加架構句 **Find it! It's on _______ _______.**（每題都要；配音仍只念 Find it! 或一併念，做時先決定）。
2. 配音 s02–s11（`src/make_voice.py`）。
3. town.py 把 MODE all 擴成 8 題＋Your turn 時間軸（每題：問句→找→揭曉路亮→飛近→串場→回俯瞰），film.js 同步。
4. 3D 分批渲（約 16–20 單位，開機前報用量）→ 合成字幕版＋聽力版（1080p＋720p，-16 LUFS）→ 抽格 → 交老師。
