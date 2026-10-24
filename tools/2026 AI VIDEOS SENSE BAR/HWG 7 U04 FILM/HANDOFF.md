# HANDOFF — HWG7 U04 短片（A Day with the Elves）

最後更新：2026-10-24　**成片老師驗收通過**

## 成品

`final/`（影片不入庫，在 Google 雲端硬碟）：
- `HWG7U04_1080p_sub.mp4`：卡拉 OK 英文字幕版，2 分 25 秒（正片 131.2 秒＋片尾 14.4 秒），-16.1 LUFS。
- `HWG7U04_1080p_nosub.mp4`：無字幕版。
- `HWG7U04_720p_sub.mp4`、`HWG7U04_720p_phone.mp4`（手機傳送用，< 30 MB）。
- `timeline.json`：每鏡起點、長度與來源檔。

## 製作摘要

| 步驟 | 做法 | 檔案 |
|---|---|---|
| 劇本 v1（24 鏡，含 S14a 旁白特寫） | 老師初稿＋新結尾 | `劇本_v1.md`、`shots.json` |
| 角色、場景母版、首幀 | Codex CLI 生圖（動漫畫風） | `chars/`、`masters/`、`frames/`、`scripts/gen_images.py` |
| 英文配音 22 句 | VoxCPM2（Colab）＋後製 0.8 倍速、Amber 降 4 半音、Santa 降 3 半音、Abu 輕微機器音 | `voices.json`、`voices_final/`、`scripts/vm_voices.py`、`colab_voices.py`、`post_voices.py` |
| 需求規格 | RDQ（動作鏡 Seedance、靜態鏡 H3） | `rdq/RDQ-spec-hwg7-u04-hybrid-20261024.md` |
| 動作 8 鏡 | KIE AI Seedance 2.0 Mini 參考模式，720p，共 500.2 credits（S03、S11 各重抽 1 次） | `seedance/`、`seedance/selected.json`、`scripts/seedance.py`、`kie/kie.py` |
| 靜態 16 鏡 | Colab H3（repo 8b4c50a 新動作寫法 `h3_action`，84–98 字） | `h3/`、`scripts/build_specs.py`、`scripts/h3_actions_v2.py` |
| 配樂 | Colab Music 3：s23＋s51 純配樂交叉淡化 162 秒 | `music/bed.wav`、`scripts/vm_music.py`、`colab_music.py` |
| 片尾 | repo 片尾範本（標題自動縮字） | `ending/` |
| 合成 | `scripts/assemble.py`（`REMIX=0` 只重做字幕） | `work/assemble/subs.ass` |
| 卡拉 OK 字幕 | faster-whisper 逐字時間，字一律照劇本 | `scripts/word_times.py`、`work/word_times.json` |

聲音規則（老師決定）：H3 鏡與 S03 用核准配音；S09 保留 Seedance 自己念的聲音（已用 BS-RoFormer 去掉它的背景音樂）；其他 Seedance 聲音不用；旁白後製疊上。

字幕規則（老師 2026-10-24）：**Comic Relief** 字體、**字要大到教室後排看得到**（1080p 台詞 88、旁白 82，長句自動換兩行）（`fonts/ComicRelief-Regular.ttf`，ass 用 `fontsdir`），位置上移（MarginV 130），**卡拉 OK**：整句白色出現、念到哪個字就變黃；說話者名字保留角色色（Teddy 橘、Amber 粉、Abu 淺藍、Joy 綠、Alan 淺橘、Santa 紅），旁白斜體。

## 花費

- Colab：昨天約 4.75＋今天約 18 單元（含 G4 閒置 40 分鐘的 6 單元），餘額 351.5。
- KIE：Seedance 500.2 credits，餘額約 9,580。

## 踩坑（這次新增）

| 問題 | 做法 |
|---|---|
| Seedance 參考模式不能同時給首幀；音訊每段需 2–15 秒 | 首幀當參考圖 1，短配音補靜音到 2.5 秒（`seedance.py`） |
| Seedance 會自己重念台詞（S03 疑似念成 We are we are），也會自帶配樂 | 念錯就換核准配音疊上；保留原聲的鏡頭先用 audio-separator 分出人聲 |
| setup_h3.py 開第 2 個 ComfyUI 時複製衝突，G4 空等 40 分鐘 | 一律用 `../colab_guard/colab_guard.py start`，並在背景開 `watch` |
| Music 3 單次最長約 100–127 秒，加更多樂段標記反而多人聲 | 用兩段最乾淨的純配樂交叉淡化接長 |
| `colab exec` 一次只能跑一個指令，長工作會把通道卡住 | 長工作一律 `nohup`／`Popen(start_new_session=True)` 背景跑再查紀錄；卡住用 `colab restart-kernel` |
| faster-whisper small 在句首會漏字，也會在配樂上幻聽「Thanks for watching!」 | 只拿來抓時間；念錯與否給老師親聽決定 |
| 配樂閃避用 `np.convolve` 太慢 | 改用 cumsum 移動平均 |
| Windows 下 Python 寫出的清單是 CRLF，bash 讀到檔名帶 `\r` | `tr -d '\r'` |
