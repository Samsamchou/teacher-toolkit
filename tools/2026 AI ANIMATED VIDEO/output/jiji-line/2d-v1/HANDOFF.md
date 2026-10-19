# 集集線五站 2D 動畫 v1：交接說明

> **目前正式檔是 v1.1**（`renders/集集線五站-2D動畫-v1.1.mp4`，2026-10-19）：第 23 句「大家細心修復」原圖 S23 左側工人扛木板穿過脖子，改用延長版的新圖 `art/scenes-v2/N18_集集車站修復.png`（`engine/jiji.js` 的 `s23` 指向 N18），其他 39 句不變。v1 原檔保留未刪；`art/scenes-v1/S23` 也沒動。

- 對象：國小四年級；全片繁體中文旁白、台灣口音（edge-tts 曉臻＝小晨、雲哲＝小哲，語速放慢 5%）。
- 片長：約 3:02（181.8 秒），1920×1080、30 fps，含字幕。
- 腳本：Google 文件〈集集線五站2D動畫｜腳本初稿〉（含逐句分鏡表）；本機 `deliverables/18-集集線五站2D動畫-腳本初稿.md`。
- 圖片：`output/jiji-line/art/scenes-v1/`，33 張 Canva AI 圖，老師 2026-10-18 全部定案；來源與檢查紀錄在 `image-records.json`、`QA-原尺寸檢查.md`；被換掉的舊版在 `superseded/`。

## 做法
1. `narration/build_narration.py`：產生 24 句旁白，去頭尾靜音，依段落排時間軸（句間 0.8 秒、車站段開頭 2.8 秒站名牌轉場），用 edge-tts 的句界把 24 句拆成 40 個句意 → `narration.wav`、`timeline.json`、`engine/timeline.js`。
2. `narration/mix_audio.py`：旁白＋每站站名牌彈出時的「叮」（程式合成）→ `mix.wav`。
3. `engine/jiji.js`（共用工具、開場與二水鏡頭）＋`engine/shots2.js`（源泉到結尾）：每個句意一個鏡頭；圖片做鏡頭推移，站名、CT278、蒸汽女王、地圖路線、鐵軌示意、水流、日曆、問號等全部由程式畫上（避免 AI 亂碼字）。
4. `engine/render.py`：Playwright 逐格截圖、平行分段渲染、ffmpeg 合成。`engine/stills.py` 輸出單格總表；`engine/qa_units.py` 每個句意抽一格做總表。

## 指令（在 `2d-v1/` 下）
```
python -I narration/build_narration.py
python -I narration/mix_audio.py
cd engine
python -I stills.py 12.5 40 --tag check
python -I render.py --jobs 6 --out "../renders/集集線五站-2D動畫-v1.mp4"
python -I qa_units.py "../renders/集集線五站-2D動畫-v1.mp4"
```

## 已知限制
- 角色是靜態插圖，沒有對嘴與肢體動畫；動態來自鏡頭推移、彈出字卡、程式畫的動畫。
- 沒有背景音樂（只有旁白與「叮」）。
- 地圖只畫二水、源泉、集集、水里、車埕五站（老師指定）。
