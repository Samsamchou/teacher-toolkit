# 感恩節由來課堂版（畫風 H 桌上微縮）交接

- 規格卡（confirmed）：`../rdq/RDQ-spec-origin-tabletop-classroom-20261106.md`
- 結構：開場 → S03–S12 每句「第 1 次正常速度＋遠景」→ 翻頁 → 「第 2 次慢速＋低角度跟拍」→ 跟唸（關鍵字發亮、中文小卡、3-2-1）→ 片尾 3 題是非題。
- 配音、逐字時間、配樂沿用 `../opening-video/voices/`、`music/`（Ana -20%／-30%）。

## 2026-11-06 S03 試片（待老師看）
- `out/S03-pilot.mp4`（字幕版，23.4 秒）、`out/S03-pilot-listen.mp4`（聽力版：沒有字幕，跟唸段只有小卡）。
- 場景程式 `src/s03_scene.py`（Blender 5.2；r1／r2 兩個鏡頭；只渲偶數格，合成時 12 fps＝定格感）；合成 `src/compose_s03.py renders`。
- 道具：`props/mayflower.glb`（Tripo HD 30000 面，55 點，帳本 `tripo-ledger.json`）、`props/atlantic_map.png`（Codex，沒有任何文字）。
- 花費：Tripo 55 點（剩 1125）；Colab G4 約 2.4 單位（Cycles 64 樣本每格約 2.3 秒，221 張；剩 311.92）。

## 做法與踩坑
- Colab：`colab new -s tth --gpu G4` → `colab exec -f src/colab_setup.py --timeout 900` → **先 exec `src/colab_mkdirs.py` 建資料夾再 upload（不然 500）** → `cy_test.py`（3 張）→ `cy_full.py` → `colab download full.zip` → `colab stop`。Git Bash 先 `export MSYS_NO_PATHCONV=1`；`colab exec -f` 的檔案要用相對路徑（/c/… 路徑讀不到）。
- Tripo Studio 匯出的 GLB 檔名是 `tripo_convert_<uuid>.glb`（不是自訂檔名），到「下載」資料夾找最新的。
- 船模型長軸是 x、船頭朝 +x；`holder` 轉向 atan2(航線方向)。r2 鏡頭要在航線**南側**（船往西開時 nrm 指向南，`c + nrm*0.26`），背景才是地圖和窗外光點。
- 跟拍鏡頭裡的立體字（1620）要放在船**前方偏北**，放正後方會被帆擋住。
- 本機 EEVEE 只做縮圖總表（偏亮）；Cycles 才是正式光線。
- 合成時 subprocess 讀 ffmpeg 輸出要 `encoding="utf-8", errors="replace"`（cp950 會當掉）。
