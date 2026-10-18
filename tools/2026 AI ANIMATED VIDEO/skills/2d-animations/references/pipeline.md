# 2D 動畫管線 / Pipeline reference

## 目錄
1. 架構與原則
2. 每個檔案做什麼
3. 角色與舞步 API
4. 場景檔寫法
5. 對嘴與字幕
6. 指令總表
7. 新歌要改的地方

## 1. 架構與原則
- **純函式畫面**：`SCENE.draw(c, t)` 只依本地時間 t 畫出一格，同一個 t 永遠同一格 → 可平行渲染、可只重做一場、可 diff。
- **全曲影格對齊**：場景涵蓋全曲第 `round(songStart×fps)` 到 `round((songStart+dur)×fps)-1` 格；`t = 全曲格號/fps − songStart`。11–12 個場景串接後與原曲逐格對齊，總格數必須等於 `round(歌長×30)`。
- **手繪感**：粗墨線 `#3b2a2e`（`fillStroke`）、平塗、固定 12 fps 的 boil 抖動（player 已加）、視差背景。
- **只在段落邊界換場景**；同段落內換地點用鏡頭橫移（世界座標 − cam）或連續動作，不硬切。
- 渲染：Playwright（Python 版，已裝 Chromium）逐格截圖 → ffmpeg H.264 CRF 16；本機約 5 秒渲染 1 秒影片，12 場景兩版約 15–20 分鐘（6 個平行工作）。

## 2. 每個檔案做什麼（`output/<song>/2d-v1/`）
| 檔案 | 用途 |
|---|---|
| `engine/engine.js` | 補間 `track/prog/lerp/E`、`boil`、側面角色 `kid()`、`head()`、`limb()`、`drawKaraoke`、`mouthAt/roundAt`、`wordCard`、`burst`、`star`、`tag` |
| `engine/song-data.js` | 由 `lipsync/song_words.py` 產生：`SONG = {dur, bpm, beats[], cues:[[t0,t1,text,[[a,b,word],…]],…]}`（全曲秒） |
| `engine/cast.js` | `CAST` 調色盤（六學生＋大人）、正面角色 `kidFront()`、`drawFlag`、`countryBubble`、`nameTag`、`transportIcon`、`beatAt`、`drawLyrics`、`wordTime`、舞步 `danceMove`／`dancePose` |
| `engine/group.js` | 群舞：`grpRow`（六人一排＋舞步時間表＋tweak）、`grpYard`、`grpSky`、`grpSchool`、`grpTree`、`grpBunting`、`grpGlobe`、`grpStage`、`grpNotes`、`grpConfetti`、`grpTitle`、`grpClapFx`、**`grpPop`** |
| `engine/edif.js` | 歌曲專用道具（Every Day Is Fun：`edDayCard`、`edSubjectCard`、`edTick`、`edCross`、`edBell`、`edBall`、`edBubble`） |
| `engine/chorus.js` | 歌曲專用副歌編舞（三段副歌共用：`edChorusTimes(cueIdx0, songStart)`、`edChorusBanner`、`edChorusKids`、`edChorusFx`） |
| `engine/player.html` | 依序載入 engine → song-data → cast → group → edif → chorus → `<scene>.lipsync.js`（可選）→ `<scene>.js`；`?nosub=1` 為聽力版 |
| `engine/render.py` | `--still t`（單格 PNG）、無聲場景渲染、`--song` 混原曲出試片、`--nosub` |
| `engine/render_all.py` | `render [scenes] --jobs N`（字幕版＋聽力版）、`assemble`（串接＋完整原曲 → 兩支成片＋assemble-report.json） |
| `engine/qa_full.py` | 完整解碼、規格、原曲 10 窗相關、兩版音軌 md5、SHA-256、全片縮圖 |
| `engine/qa_lines.py` | 每句一格的逐句總表＋句子是否落在場景內／被切開 |
| `lipsync/song_words.py` | 字幕句 → 逐字時間（兩份 ASR 擇優、內插、擠壓重分配）＋拍點 |
| `lipsync/song_lipsync.py` | 場景對嘴資料：逐字開合窗 × 原曲中央聲道 300–3000 Hz 能量；圓唇字給 round；`--adlibs` 加入字幕外和聲 |
| `../src/analyze_song.py` | （skill 通用版）faster-whisper small.en（不提示＋提示）＋ librosa 拍點；Word 段內換行與說話者標籤；MP3 內嵌歌詞／標題標籤；直接給 numpy 陣列避開 PyAV 問題 |
| `../src/align_lines.py` | （skill 通用版）預設 Word 檔順序，或讀 `planning/sung-sequence.txt` 的實唱順序；pyin 音高估男女聲；輸出 `data/lyrics-timing.json`、`planning/lyrics-timing.csv` |
| `../src/annotate_timing.py` | （skill 通用版）兩次辨識句首不一致時取高信心者、聽校旗標、對嘴欄、場景（`planning/scenes.json`）、跨場景檢查 → `lyrics-timing-reviewed.*` |

## 3. 角色與舞步 API
- 側面 `kid(c, ch, {x, y, face(±1), walk, moving, wave, point, cheer, raise, hop, talk, round, lean, nod, look, scale, alpha}, t)`：走路、跑步、登車。
- 正面 `kidFront(c, ch, {x, y, scale, la:[肩,肘], ra:[肩,肘], ll, rl, knee, bounce, sway, hop, talk, round, look, nod}, t)`：手臂角度「向外為正、0 = 下垂」。指向左邊目標時交換 la／ra。
- 轉身：用水平壓扁翻面（scaleX 經過 0），約 0.2 秒；切換正面／側面在最扁那一格。
- 舞步（隨拍點）：idle、pump、wave、wave2、clap（拍點上手掌相碰）、cheer、ear、shrug、point、sway、step、hips、jump、book。`dancePose([[t, 'move'], …], t)` 在切換時 0.18 秒補間。
- 拍點：`beatAt(全曲秒) → {i, f}`。

## 4. 場景檔寫法（範本：`every-day-is-fun/2d-v1/scenes/s01-weekend.js`、`s04-monday.js`）
1. 檔頭註解：場景、全曲時間、**每句歌詞↔畫面對照表（本地秒）**。
2. `const S? = songStart`；字時表 `const T? = {...}`（取自 song-data.js，或 `wordTime()`）。
3. 對嘴時段 `const SING? = {AMY: [[a,b],…], …}`；`talk: sings(who,t) ? mouthAt(t) : 0`。
4. `const SCENE = { dur, songStart, tag, draw(c, t) { 背景 → 角色 → 道具 → tag(c, SCENE.tag, .2, t) → drawLyrics(c, t) } }`。
5. 場景專用函式加前綴（`s04Ball`），不可重宣告引擎名稱。
6. 版面：字幕帶 y 930–1018、左上標籤 x<520、y<130 不放重要內容；腳底約 y 880–905。

## 5. 對嘴與字幕
- 字幕直接取 `SONG.cues`（＝ ASR 對時後的正式歌詞），逐字卡拉 OK 變色；聽力版不畫。
- 和聲（oh-oh、yeah、dribble）不進字幕；用 `--adlibs` 讓嘴型動。
- 開口包絡：每字「快開、近字尾收」的弧 × 人聲能量；字間閉嘴。

## 6. 指令總表（在 `2d-v1/` 下）
```
python -I ../src/analyze_song.py
python -I ../src/align_lines.py
python -I ../src/annotate_timing.py
python -I lipsync/song_words.py
python -I lipsync/song_lipsync.py <scene> --start <songStart> --dur <dur> --adlibs
cd engine
python -I render.py <scene> --still <t>
python -I render.py <scene> --song "../../sources/<song>.mp3" --out ../renders/pilot-<scene>.mp4
python -I render_all.py render [scenes…] --jobs 6
python -I render_all.py assemble
python -I qa_full.py
python -I qa_lines.py
```
720p 手機預覽：`ffmpeg -i <English>.mp4 -vf scale=1280:-2 -c:v libx264 -preset slow -b:v 950k -maxrate 1200k -bufsize 2400k -c:a aac -b:a 96k <preview>.mp4`（約 25 MB）。

## 7. 新歌要改的地方
`scripts/new_song_setup.py` 會換檔名與歌長，並印出清單：演唱順序展開規則、qa_full 時窗、角色名與徽章、歌曲專用道具與副歌編舞、彩旗、SCENES。
