# 集集線五站 2D 動畫 延長版（2d-v2-extended）：交接說明

- 狀態：老師 2026-10-19 驗收為正式版（`qa/teacher-acceptance-2d-v2.json`）。目前正式檔是 **v2.1**（`renders/集集線五站-2D動畫-延長版-v2.1.mp4`）：第 34 句改用新圖 N18（原 S23 扛木板姿勢奇怪），其他不變；v2 檔保留未刪。3 分鐘版 `2d-v1` 也是正式版，保留不動。
- 對象：國小四年級；繁體中文旁白、台灣口音（edge-tts 曉臻＝小晨、雲哲＝小哲，語速 -5%）。
- 片長：5:08.7（308.7 秒），1920×1080、30 fps，字幕燒進畫面（長句在最靠近中間的逗號斷成兩行）。
- 段落：開場 36 秒、二水 50、源泉 47、集集 48、水里 48、車埕 50、結尾 30 秒；45 行台詞、61 個句意。
- 腳本：同一份 Google 文件文末〈延長版腳本（約 5 分鐘）〉段落（新句標「（新）」）；本機 `script-v2.txt`。
- 分鏡：`storyboard/storyboard-v2.md`（逐句：沿用 v1 圖 37、程式動畫 6、新圖 18）。
- 圖片：`../art/scenes-v1/`（33 張 Canva，沿用）＋ `../art/scenes-v2/`（18 張 OpenAI gpt-image-2，medium、1680×944，用 v1 圖與角色設定圖當參考圖；`prompts.json`、`run_gen.py`、`image-records.json`；重生前的 5 張在 `superseded/`）。

## 做法（與 v1 相同的引擎）
1. `narration/build_narration.py` → `narration.wav`、`timeline.json`、`engine/timeline.js`；`narration/mix_audio.py` → `mix.wav`（加每站的「叮」）。
2. `engine/jiji.js`：共用工具＋開場、二水鏡頭（句意 1–18）；`engine/shots2.js`：源泉到結尾（句意 19–61）。圖片路徑以 `../../art/` 為根，v1 圖在 `scenes-v1/`、新圖在 `scenes-v2/`。
3. `engine/render.py` 平行渲染；`engine/stills.py` 單格總表；`engine/qa_units.py` 成片逐句抽格。

## 指令（在 `2d-v2-extended/` 下）
```
python -I narration/build_narration.py
python -I narration/mix_audio.py
cd engine
python -I stills.py 23.1 59.2 --tag check
python -I render.py --jobs 8 --out "../renders/集集線五站-2D動畫-延長版-v2.1.mp4"
python -I qa_units.py "../renders/集集線五站-2D動畫-延長版-v2.1.mp4"
```

## 這次踩過的坑
- OpenAI 生圖：第一次 17 張中有 5 張要重生（二水畫成海邊、搬米男孩太像小哲、小朋友在進站列車旁奔跑、石虎畫成虎斑條紋、單手騎車揮手）。提示詞要寫明「內陸、無海」、「沒人穿橘背心藍帽」、「站在黃線後」、「石虎是斑點、耳後白斑」、「雙手握把」。重生要先問老師（會再收費）。
- 沿用的 v1 圖也要再看一次人物姿勢：S23 左側工人扛木板穿過脖子，v1 時沒發現，延長版改用 N18。檢查圖片時要放大看手、頭頸和拿東西的姿勢。
- 實景地點（林先生廟、蛇窯、木業展示館）先在維基共享資源看最新照片，再寫外觀描述。
- 延長版句子較長，字幕要自動斷行；斷行後字幕變高，畫面下方的字卡要往上移。
- 成片 1080p 約 462 MB，傳到手機要另做 540p 預覽（30 MB 上限）。

## 已知限制
- 角色是靜態插圖，沒有對嘴；沒有背景音樂。
- 逐句總表抽的是每句說到一半的畫面，句尾才出現的字卡不會出現在總表上。
