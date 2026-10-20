# 影片 1 星期單字：分鏡與生圖清單 v1（2026-10-20）

聲音：`voice_v1.wav`（8:35.6），時間軸 `timeline_v1.json`（每句的角色、文字、畫面、時間）。
腳本來源：Google 文件「科幻雙老師英語動畫｜影片1 星期單字｜腳本初稿 v1」（老師 2026-10-20 通過）＋下方「配音調整」。

## 配音調整（whisper 檢查後）
- Mr. Cosmo 英文改用 **en-US-GuyNeural**：AndrewNeural 把 "Say it with me" 唸成 "See you with me"、"art" 唸成 "our"、"letter E" 唸成 "letter you"；Guy 這三句都正確。中文用雲哲 YunJhe。
- 拆字合起（Sun, day.）字幕照原文，TTS 改成 "Sun... day." 才有停頓；"Sat, ur, day." 唸成 "Sat... er... day."（ur 原本被唸成 "you are"）。
- 縮寫：TTS 會把 "Sun." 唸成 Sunday、"Mon." 卻唸 Mon，前後不一致。改成唸 "Sunday. S, U, N, dot!"，畫面仍顯示 Sun.。
- 措辭小改：The first **letter** D is quiet／Look at the first **letter** A（原本 D、A 被聽成 day）；We need a **capital** S（原本 big S 被聽成不雅字）；And A and Y say...（原本 A, Y says 聽不清楚）。

## 版面
- 背景：`art/bg-classroom-v1.png`（試片 v2.3 的太空教室，右側全息螢幕）。
- Ms. Nova：左上，中等大小（試片 v2.3 版面 A），名牌在臉旁。
- Mr. Cosmo：**建議放右下角**，和 Nova 斜對角，中間全息螢幕放星期卡；誰說話誰輕微放大＋亮名牌。
- 字幕：72 px，底邊 y=960（試片 v2.3 定案）。英文 Comic Relief，中文微軟正黑體粗體。

## 每段畫面
| 段落 | 時間 | 主畫面 | 姿勢 |
|---|---|---|---|
| 01 開場 | 0:01–0:22 | 標題 Days of the Week，七張卡依序亮起 | 兩人揮手 P02 → Cosmo 指螢幕 P03 |
| 02 -day | 0:23–0:49 | 七張卡並排，day 一起亮橘色；ay 發音按鈕 | Nova 說明 P04、聆聽 P08；Cosmo 比讚 P07 |
| 03–09 七天 | 0:50–5:11 | 全息螢幕放大當天星期卡：單字（重點字母橘色＋紅底線）、發音按鈕、Your turn! 倒數條、最後出現中文 | 說話者 P04／P03，跟唸時 P08，驚喜 P10（Friday）、思考 P06（Wednesday） |
| 10 情境 | 5:12–6:54 | 情境插圖全螢幕，下方句子字卡（星期單字橘色），老師縮小在角落 | 說話者 P04 |
| 11 大寫 | 6:55–7:15 | sunday → Sunday 動畫，S 放大發光＋打勾 | Cosmo 思考 P06；Nova 空中寫字 P09 |
| 12 縮寫 | 7:16–8:06 | 每張卡後面字母收起來 → Sun. 句點閃一下；最後七個縮寫一列 | 交替 P04 |
| 13 複習 | 8:07–8:33 | 七張卡排成一圈依序亮起 | 齊唸 P03，揮手 P02 |
| 片尾 | 8:34– | 音檔來源與授權字卡（約 8 秒） | — |

## 生圖清單（gpt-image-2，畫面上不放任何文字，文字全部由程式疊上）
| 編號 | 用途 | 內容 | 尺寸 |
|---|---|---|---|
| day-sun … day-sat（7 張） | 星期卡插圖 | 每天一個科幻主題：Sun 太陽能星球、Mon 月球基地、Tue 火箭發射、Wed 星際水星站、Thu 雷電星雲、Fri 金星派對、Sat 土星環滑板 | 1024×1024 |
| ctx-sun … ctx-sat（7 張） | 情境插圖 | 太空站公園玩耍、美術課畫星球、體育課低重力跳躍、音樂課敲星星鐘琴、圖書角讀故事、放學去太空公園、打籃球 | 1536×1024 |

## 報價（OpenAI 另外計費，美金，估計值）
| 方案 | 張數 | 單價 | 小計（含約 30% 重做） |
|---|---|---|---|
| A 中品質（和教室背景同等級） | 14 | 約 $0.07–0.11 | **約 $1.3–2.0** |
| B 高品質 | 14 | 約 $0.21–0.42 | 約 $3.8–7.6 |
建議 A：插圖在畫面中縮放顯示，中品質已足夠；若有哪張不滿意再單張用高品質重做。

## 定案紀錄（2026-10-20，影片 1 v1.2 定案）
- 正式版：`renders/video1-days-v1.2.mp4`（1080p，8:45，15,746 格；影音檔不進 Git），720p 預覽版 `video1-days-v1.2-720p.mp4`。
- 插圖：14 張中品質（A 方案）一次通過，`gen_art_v1.py`。
- 版面：Nova 左、Cosmo 右，中間全息螢幕；試片 0–87 秒通過後渲染全片（`render_v1.py` 搭配 `pilot-nova/run_segments.py`，8 段平行，本機約 12–28 分鐘）。
- v1.1：Tuesday 的 ue 改用 long u 試聽帶 No.2 字母名 U（`En-us-u`，Twocs，CC BY-SA 3.0），標示 /juː/。
- v1.2：Saturday 的 ur 唸 /ɚ/（同 teacher 的 -er，不是 Thursday 的 /ɝ/），改用老師錄的 `references/er.mp3`（`split_er.py` → `processed/ref-er-1.wav`）；Cosmo 台詞改成 "And here, U and R sound like the end of teacher. Listen."。
- v1.2：情境句跟唸時學生要看得到句子 → 每句字卡放在插圖正下方（星期單字橘色）。
- 試聽過但未採用：`phonics-audio/long-u/`（13 個 long u 候選）、`phonics-audio/er/`（從 teacher 切出的 -er）。
