# HANDOFF — SF3 R1 Daily Talk（A Sunday with Grandma）

最後更新：2026-10-26　**成片 v2（配樂 -10 dB）老師驗收通過**

## 成品（影片不入庫，在 Google 雲端硬碟）

`final/`：
- `SF3R1_1080p_sub.mp4`：卡拉 OK 英文字幕版，1 分 50 秒（正片 95.4 秒＋片尾 14.4 秒）。
  **配樂 v2（老師 2026-10-26）**：配樂比 v1 小 10 dB、句間不回升、說話時壓 1–4 kHz、人聲逐句同音量再 +2 dB，片尾回到正常；正片 -16.4 LUFS、峰值 -1.8 dB。規格卡 `rdq/RDQ-spec-sf3r1-music-remix-20261026.md`。
- `SF3R1_1080p_nosub.mp4`：無字幕版。
- `SF3R1_720p_sub.mp4`、`SF3R1_720p_phone.mp4`（手機傳送用，約 14 MB）。
- `timeline.json`：每鏡起點、長度、來源；`_qa_sheet.jpg`：逐鏡抽格（含字幕）。

## 內容

- 劇本：`劇本_v1.md`（20 鏡、19 句配音＋敲門音效）。對應 SF3 R1（Who's she/he? Is she a teacher? Have a seat. Sorry, I'm late. Come in.）
  與 SF1 R1（Nice to meet you. Thank you. / You're welcome.）。名字用 **Allen**（在地課程男孩，不是課本 Alan）。
- 角色：Ken、Allen、Grandma、Dad。圳寶、水鈴的資產已放在 `characters/`，**下一集**才出場。

## 製作摘要

| 步驟 | 做法 | 檔案 |
|---|---|---|
| 角色資產 | 從 localcoursesErshui 與 3D 遊戲複製 | `characters/README.md` |
| 定妝照、場景母版、首幀 | Codex CLI 生圖（動漫畫風），透明參考圖先鋪灰底 | `chars/`、`masters/`、`frames/`、`scripts/gen_images.py`、`shots.json` |
| 英文配音 | Colab VoxCPM2，第一批 → 老師嫌快 → RDQ：0.7 倍（以第一批為基準）、兩句台詞中間停 0.3 秒；Allen 升 4 半音＋音色縮小（男孩聲）；Dad 降 2 半音 | `voices.json`、`voices_final/`、`scripts/vm_voices.py`、`colab_voices.py`、`post_voices.py`、`rdq/RDQ-spec-sf3r1-voice-pace-20261026.md`；第一批在 `voices_v1/` |
| 對話鏡 15 鏡 | Colab H3（70–87 字動作描述），一次全過 | `h3/`、`scripts/h3_actions.py`、`build_specs.py` |
| 動作鏡 4 鏡 | KIE Seedance 2.0 Mini 參考模式：S01、S11、S12、S20（S20 依老師要求重做成科幻浮空發光畫布） | `seedance/`、`seedance/selected.json`、`scripts/seedance.py` |
| S01 星期／天氣 | 程式疊加：月曆翻到 SUNDAY、Mon–Sun 亮 Sun、Sunday 星期天；笑臉太陽＋sunny 晴天；對準旁白字時間。可重用（改 CONF） | `scripts/day_weather.py`、`still/S01_dw.mp4`、`rdq/RDQ-spec-sf3r1-s01-day-weather-20261026.md` |
| S15 敲門 | 本機：門特寫緩推＋震動＋合成敲門聲＋Knock, knock! 字卡 | `scripts/make_still.py`、`still/S15.mp4` |
| 配樂 | Colab Music 3，seed 23（110 秒、人聲殘留 0） | `music/`、`scripts/vm_music.py`、`colab_music.py` |
| 片尾 | repo 片尾範本，畫面用 S05、S11、S20 首幀 | `ending/` |
| 合成 | 混音參數 MUSIC_DB（-10）、VOICE_DB（+2）；`SAMPLE=1` 只出 S02–S07 試聽樣本；每句後多停 0.5 秒；S17 剪到 3.4 秒；卡拉 OK 字幕 Comic Relief 88/82、MarginV 130 | `scripts/assemble.py`、`scripts/word_times.py`、`work/` |

## 花費

- Colab：今天約 8.2 單元（開工前 350.77 → 342.77），含配樂程式語法錯誤空轉約 1.3 單元。
- KIE Seedance：287.0 credits（5 次生成；上限 1,000），餘額約 9,290。
- Codex 生圖：定妝照 4、母版 3、首幀 20＋S12、S20 重畫。

## 踩坑（這次新增）

| 問題 | 做法 |
|---|---|
| 透明 PNG 當參考圖，模型看到黑底 | `gen_images.py` 先鋪淺灰底再給 Codex |
| Codex 生圖偶爾卡住（S12 26 分鐘沒進度） | 另開一個 job 名重做；原本的跑完會覆蓋，要確認最後用的是對的那張 |
| VoxCPM2「慢慢念」的指示幾乎無效 | 語速只能靠 rubberband 拉長；0.7 倍大多是 0.70–0.78 |
| 上傳到 VM 的程式有語法錯誤，`poll` 只認 Traceback，空等 10 分鐘 | 上傳前先本機 `ast.parse`；Windows 檔是 CRLF，用字串取代要注意 |
| ffmpeg `-t` 放在 `-i` 後面會把 `tpad` 加長的尾巴剪掉 | `-t` 放在 `-i` 前面（限制輸入） |
| H3 角色說完台詞會自己走開（S17） | 剪掉台詞後的部分 |

## 老師偏好（本片）

- 配樂要很小聲：比 U04 的混法再小 10 dB，句子之間也不要冒上來。

## 待辦

- ~~老師驗收成片~~：v2 於 2026-10-26 驗收通過。
- 下一集：圳寶、水鈴出場（3D 公仔風，要先統一畫風）。
