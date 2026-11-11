# Poe the Goat（B3）交接

2026-11-11 暫停（老師關機 30 分鐘）。規格卡：`rdq/RDQ-spec-poe-the-goat-20261111.md`（confirmed）；劇本 `劇本_v1.md`；分鏡 `shots.json`。

## 已完成（老師都核准）
- Poe 定裝照 v1 → `chars/poe.png`；場景 `masters/lake_sunny.png`、`lake_snow.png`
- 首幀 `frames/S01–S05.png`（S04、S05 重畫過，舊版在 `frames/old/`）
- Seedance 720p 5 鏡：S01 `seedance/S01/first_1.mp4`、S02 `first_1`、**S03 `first_2`**、S04 `first_1`、S05 `first_1`；粗剪 `poe_rough_preview.mp4`
- KIE 花費 **268.8 點**（上限 450，紀錄 `seedance/ledger.json`）

## 下一步：配音＋配樂（同一台 Colab G4）
1. `cd ../../shanshiba-workflow-32gvram-64gram && python cloud/colab_h3.py --name poe start`（完整安裝約 10 分鐘；11/11 第一次 G4 Service Unavailable，重試就成功）
2. `python scripts/colab_voices.py`（在本資料夾）：3 種旁白 narA／narB／narC × 5 句＋10 個單字（`voices.json`）
3. 同一台接著 `python scripts/colab_music.py --secs 120`，然後 `colab_h3.py --name poe stop`
4. 本機 rubberband 放慢到 0.8 倍 → 做試聽頁給老師挑聲音
5. 之後：程式教學層（三色字母 o_e 紅／oa 藍／ow 綠、慢速、跟唸 5-4-3-2-1、分類、3 題）＋ assemble → 字幕版＋聽力版

Colab 已用約 1.4 單位（安裝到一半就停了）；餘額 173.47。

## 11/11 更新：配音＋配樂完成（Colab 再用 2.69 單位，餘額 170.78，機器已關）
- `voices/`：narA／narB／narC × 5 句＋10 單字（每句最佳 take）；試聽 `listen/voice_*.mp3`（rubberband 0.8 倍）
- `music/`：s51（人聲殘留 0.15，自動選）、s7（0.38）、s23（1.43 不用）；試聽 `listen/music_*.mp3`
- 老師選 **聲音 C（narC）、配樂 s51**

## 11/11 v1 成片（等老師驗收）
- `scripts/build_film.py voices|times|render [段落前綴]`：本機合成，不花錢；只改某段就 `render S03`（其他段沿用）
- 成品 `final/Poe-the-Goat-English.mp4`、`-Listening.mp4`（各有 720p），2:51，-16.6 LUFS；抽格 `final/_qa_sheet.jpg`；段落時間 `work/timeline.json`
- 結構：片頭 6 秒 → 5 句 ×（Listen 0.8 倍卡拉 OK → Listen again 0.65 倍、目標字母念到才變色 → Your turn 5／7 秒倒數）→ Sort 23 秒 → Quiz 3 題 → The End
- 踩坑：本機 faster-whisper 吃檔案路徑會因新版 PyAV 壞掉 → 改傳 16 kHz numpy；Music 3 輸出是 44.1 kHz，先轉 48 kHz

## ✅ 2026-11-11 老師驗收通過（v2）
- v2 = 測驗誘答改 bot／snoke／rob ＋ 片尾完整故事不停頓（The whole story）
- 定案檔 `final/Poe-the-Goat-English.mp4`、`-Listening.mp4`（＋720p），3:20；手機版已刪（老師：教學影片不做手機版）
