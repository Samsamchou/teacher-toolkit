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

## 11/07 坑：本機不要同時開多個 Blender
- 同時開 7 個 Blender 出縮圖總表 → 電腦重新開機、渲染中斷。本機一次一個；量大（縮圖總表、多鏡頭）改用 Colab G4（Cycles 低樣本、50% 大小）。
- `colab exec -f` 執行的檔案**只能用英文**（中文註解會讓 Windows 版 colab 用 cp950 讀檔失敗）；只上傳不執行的檔案（engine.py、scenes.py）可以有中文。

## 11/07 起：Blender 只在 Colab 跑（RDQ confirmed：`../rdq/RDQ-spec-blender-colab-only-20261107.md`）
- 一鍵：`python src/colab_run.py <test|light|final> "S07 r1 sec" "S04 r1 all" …`（sec＝每秒一張、all＝整段偶數格）。
  只上傳有改的檔案（md5 記在 `work/colab_state.json`），結果在 `qa/colab/<時間>/`，final 另存 `renders/<SID><SHOT>/`。
- 最後一批後閒置 20 分鐘自動 `colab stop`（`work/colab_idle.pid`）；每批用量記在 `work/colab_usage.log`，一天超過 30 單位先問老師（11/07 老師從 20 調成 30）。
- Google Drive 掛載（建議②）沒做：`colab drivemount` 要每次瀏覽器授權、掛載失敗；改成開機時直接下載 Blender（16 秒），已達到 2 分鐘內能渲染。
- 坑：測試縮圖和正式渲染曾經共用 `/content/out`，正式渲染的「已存在就跳過」會把低畫質測試格混進成片 → 已改成測試寫 `/content/tout`、正式寫 `/content/out`（11/07 正式渲染途中手動刪掉 S10r2、S11r1、S12r1、S12r2 的測試格）。
- 老師 11/07：Colab 渲染和本機合成同時做（先渲完的段落先下載合成，Colab 繼續渲下一批）。做法：colab_run.py 一次只送 2–4 段（例如 "S04 r1 all" "S04 r2 all"），每批回來就跑 compose_all.py 那一句，同時送下一批。

## 11/07 全片 v1 完成（待老師看）
- `out/Thanksgiving-Classroom-Tabletop.mp4`（字幕版 5:21）、`-Listening.mp4`（聽力版），各有 `_720p`。
- 合成：`python src/compose_all.py O S03 … S12 Q film`（段落檔在 work/sec/；改一段只重跑那段再跑 film）。
- 片尾 3 題是非題配音 `voices/CQ*.mp3`、`CA*.mp3`（`src/quiz_voices.py`）。
- 坑：中文字幕兩行（開場、S10、S11）時，libass 會把中文擠到英文上面 → 英文 MarginV 改 175，維持英文在上、中文在下。
- 坑：在 Python 字串裡寫 ASS 的換行要寫 `"\N"`（`"\N"` 會讓 Python 語法錯誤）。

## v2（2026-11-07 晚，RDQ `../rdq/RDQ-spec-classroom-v2-fixes-20261107.md`）
- 片頭改 10 秒：8 張單字大卡（從 `refs/poster_art.png` 裁插圖＋英文＋中文＋ Ana 念單字 `voices/W_*.mp3`，卡長依念讀長度分配）→ 最後 1.2 秒整張海報 → 溶接書本（O 段只用 Blender 第 164 格以後）。全片 5:24。
- 模糊根因：公仔 9 公分、光圈 f/2.8–5.6 景深只有幾公分。修法：`engine.autofocus()` 每格找畫面內人物臉的遠近 → 焦點放調和平均 → 光圈調到最近／最遠都 ≤2.5 px（Blender 光圈不影響亮度，大 f 值沒副作用）；下限 `FSTOP_MIN`=16。
- 切頭根因：第 2 次特寫瞄準 z≈0.045、畫面只高 9 公分。修法：`E.REFRAME`（scenes.py 依段落設定往上抬／往後拉）。
- 自動檢查：`colab_run.py test "SID SHOT chk"`（只算不渲，約 0.4 單位）→ `python src/chk_report.py qa/colab/<stamp>/tout`；規則頭頂 ≤0.92、臉糊 ≤3 px、不碰時間軸。v2 全部 0 問題。
- 時間軸縮 72%、80% 透明。
- 坑：opening 用 `split`＋`trim` 接兩段，後段被吃掉（影片只剩 10.9 秒）→ 改成兩個圖片序列輸入再 xfade。
- 坑：Monitor 抓 "failed" 會被 Colab 的 HIPEW 警告誤觸發，只抓 ALLDONE/Traceback/ffmpeg failed。
- 流水線 `src/pipeline_v2.sh`：5 批 Colab final，每批渲完背景合成。正式渲染約 2.5 小時、約 20 單位；11/07 全天約 45 單位（老師同意當天超過 30）。
- 未改：S08 第 2 次 Tisquantum 字牌部分被帽子擋住（臉沒擋）。

## v3（2026-11-07 晚，規格卡 `../rdq/RDQ-spec-classroom-v3-fixes-20261107.md`）
- **小腿陷進草地**：原因是地景底板厚 1.2 公分，人物卻站在 z=0。`engine.board()` 會登記底板範圍到 `GROUNDS`，`Char` 和 `Char.at` 沒給 z 時自動用 `ground_z(x, y)`。S07–S12 的鏡頭也同步抬高 1.2 公分（`scenes.py`），S06 r2 抬高 0.020。
- **穿過餐桌**：S10 的 Massasoit 改走兩段折線 `M_PATH`（先往前，再往右），不再穿過第一張桌子。桌子用 `E.obstacle()` 登記，check 模式會印 `GND`（腳底離地 mm、撞到哪個東西）。
- **單字立牌**：`engine.autoplace_flags()` 在 render 或 check 前自動找立牌位置。
  - 候選位置：原位置附近 9×9 格，加上鏡頭看得到的地面（人物前面、旁邊），而且轉向鏡頭。
  - 扣分項目：切出畫面、被擋住（雪花和落葉不算）、擋到或躲在臉後面、蓋住身體、和其他立牌重疊、底下不是空地。
  - 每格平均扣分超過 `FLAG_MAX=9.5` 時，這一段就不放立牌。近景常放不下，字已經在字幕和跟讀卡上。`FLAG_HIDE` 可以強制不放，S07 r2 的 winter 就是這樣（只剩溫度計後面的位置）。
  - check 會印 `FLG` 和 `FLAGMOVE`；`chk_report.py` 會同時報告貼地、桌子、立牌的問題數。
- **S11**：
  - 月曆上的 holiday 字放大，月曆兩旁出現火雞（`props/turkey.glb`，Tripo 55 點，剩 140）和收成籃。
  - 鏡頭拉遠（`S11_D`、`S11_AZ` 環境變數可以調）。
  - 合成時英文字幕改放上方（`S["S11"]["top"]=True` → ASS `\an8`），中文留在下方，時間軸移到右下角。
- **片頭 24 秒**：每張卡停 2×念讀長度＋1.28 秒，Ana 念兩次（第一次在卡片出現後 0.2 秒，第二次在卡片時間的一半＋0.15 秒）。
- **流水線**：`bash src/pipeline_v3.sh`（O 只重新合成；S05–S12 重新渲染；最後是 Q 和 film）。
