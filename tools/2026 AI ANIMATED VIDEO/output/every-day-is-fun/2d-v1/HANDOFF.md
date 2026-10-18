# Every Day Is Fun — 2D 全曲 v1 交接 / Handoff

日期 Date：2026-10-18　狀態 Status：**教師確認「Every Day Is Fun 2D v1 全曲可以，定為正式版」（2026-10-18）。** Teacher-accepted official release.

> 驗收紀錄 `qa/teacher-acceptance-2d-v1.json`（雜湊於驗收時重新讀取比對一致）；正式版指標 `../FORMAL_RELEASE.json`。下方「仍待確認」三項隨正式版一併接受現狀。
流程沿用已驗收的 How Do You Go 2D v1（`../../how-do-you-go/2d-v1/HANDOFF-2D.md`）；引擎為複製版，舊正式版未動。

## 成品 / Deliverables

| 檔案 | 用途 | Bytes | SHA-256 |
|---|---|---|---|
| `renders/Every-Day-Is-Fun-2D-v1-English.mp4` | 全曲＋卡拉 OK 逐字字幕 | 162,094,848 | `94a3b668782bce60c83c01d5170040dfa0dce120c70522627ba1a56eea654a74` |
| `renders/Every-Day-Is-Fun-2D-v1-Listening.mp4` | 聽力版（無字幕） | 153,311,285 | `2281ca5688422ae7ae3098d04ea59129cd15445f634394153d8ca35ae49e0a06` |
| `renders/Every-Day-Is-Fun-2D-v1-English-preview720p.mp4` | 手機預覽用壓縮版（非教學版） | 24,922,148 | — |

規格：1920×1080、30 fps、**5,700 格／190.0 秒**、完整原曲（Suno 生成，`../sources/Every Day Is Fun.mp3`）、不配音、全片對嘴原曲。

## 檢查結果 / Verification
- 兩版完整解碼 0 錯誤；12 個場景格數加總 5,700（`qa/assemble-report.json`）。
- 原曲 10 個時窗對齊：零偏移相關 0.9945–0.9991，最佳偏移 0 ms；兩版音軌 md5 相同（`qa/final-verification-2d-v1.json`）。
- **每句歌詞對應檢查**：52 句各在唱到一半時從成片抽一格，總表 `qa/lines-contact-1.jpg`、`qa/lines-contact-2.jpg`（逐張看過，52 句都有對應動作或圖片）；52 句都落在場景內、沒有任何一句被場景交界切開（`qa/lines-check.json`）。
- 各場景關鍵字抽格：`qa/s0*-contact*.jpg`、`qa/s02-keywords-final.png`、`qa/s05-keywords-final.png`、`qa/s07-contact.jpg`、`qa/s08-contact.jpg`。

## 場景表 / Scenes（全曲秒）
| 場景 | 時間 | 內容 | 製作 |
|---|---|---|---|
| S00 intro | 0–17.12 | 七張星期卡依字掉入、片名、SAT 卡接下一景 | 主線 |
| S01 weekend | 17.12–36.18 | 週六公園放風箏 → 鏡頭橫移 → 週日 Amy 奶奶家（**試片已通過**） | 主線 |
| S02 subjects1 | 36.18–45.92 | 走廊學科卡依字翻開、上課鐘、七天卡轉圈 | 子代理 |
| S03 chorus1 | 45.92–64.66 | 星期布條依字亮、擊掌、手牽手、愛心、1-2-3 | 主線 |
| S04 monday | 64.66–78.64 | 週一課表 ✗／✓、體育館運球 4 下投籃（**試片已通過**） | 主線 |
| S05 subjects2 | 78.64–87.84 | 教室六人輪流舉學科卡、翻書、粉筆寫七天 | 子代理 |
| S06 chorus2 | 87.84–106.10 | 同副歌編舞、午後暖光、前後兩排 | 主線 |
| S07 timetable | 106.10–119.74 | Andy／Amy 課表猜謎（互問）、電腦教室 AI 機器人 beep-boop | 子代理 |
| S08 bridge | 119.74–133.58 | 黃昏、只有 Amy 對嘴、蠟筆畫太陽、跳繩、太陽升起與星期卡光環 | 子代理 |
| S09 dance | 133.58–151.78 | 舞台燈；唱到的星期卡點亮；四種 "hey" 跳法、隊形變換 | 主線 |
| S10 final | 151.78–170.80 | 副歌編舞＋黃昏煙火、紙花 | 主線 |
| S11 outro | 170.80–190.00 | 放學、星期卡彩虹、MON 發光、bye-bye、結尾片名，最後 1 秒淡出 | 主線 |

## 教師決定與規則 / Decisions
- 角色沿用上一首六位學生：Amy＝原 TW 女孩、Andy＝原 JP 男孩，其餘四位同學；胸前國旗改星星徽章；新增 Grandma（Amy 的奶奶，Andy 同行）與 AI 機器人。
- 對嘴：第一人稱與問答句由該角色；副歌與群唱全員；旁白式句子閉嘴微笑；Verse 3 Andy 和 Amy 互問；Bridge 只有 Amy。
- 試片 S01＋S04 教師已確認「試片通過」。

## 仍待確認 / Open
1. D1：Dance Break 實唱 7 句（依辨識結果），未經人工聽校。
2. D2：「Yes, she does.」辨識兩次都聽成 he；字幕用 she。
3. 第 34 句（Does Amy have…）音高判斷是男聲，但依「互問」由 Amy 對嘴。
4. 逐字時碼為本機語音辨識結果，未逐句人工聽校；`(beep-boop!)`、`(oh-oh-oh)` 等和聲的卡拉 OK 變色很短。
5. 未 Git commit／push；Drive 服務端同步未驗證。

## 重現 / Rebuild
```
cd engine
python -I ../lipsync/song_words.py                     # 由 ../data 產生 song-data.js
python -I render_all.py render --jobs 6                # 12 場景 × 2 版（本機約 15–20 分鐘）
python -I render_all.py assemble
python -I qa_full.py
python -I qa_lines.py
```
前置分析（已完成）：`../src/analyze_song.py`（faster-whisper small.en＋librosa）、`../src/align_lines.py`（52 句時間表）。

## 檔案 / Files
- `engine/`：engine.js、cast.js（本曲版）、group.js（星期彩旗）、edif.js（本曲道具）、chorus.js（副歌共用編舞）、player.html、render.py、render_all.py、qa_full.py、qa_lines.py、song-data.js
- `lipsync/`：song_words.py、song_lipsync.py（`--adlibs` 讓和聲也張嘴但不上字幕）
- `scenes/`：s00–s11 與各自的 `.lipsync.js`
- `../planning/01-分鏡表-每句歌詞對應動作.md`：52 句分鏡（審查稿 02）
