# 2026 Thanksgiving — 交接（2026-11-03 收工）

國小五、六年級**全年級英語感恩節集會**的三樣成品。需求規格卡都在 `rdq/`（confirmed）。

## 1. 感恩節英語活動參考報告 ✅ 完成
- `感恩節英語活動參考報告.md`＋Google 文件 https://docs.google.com/document/d/1KOAee-uxjbFyKjLCuQIya7p3sAIV9UK46O0IB9ZOHIA/edit
- 內容：
  - 18 個台灣案例：大智、葳格、指南有全校上台；另有 6 個國外做法。
  - 文化提醒：課堂上用 Wampanoag／Native Americans，不用 Indians。
  - 單字統計：影片單字 7 個，turkey、thankful、Pilgrims、pumpkin pie、feast、Mayflower、potatoes（potatoes 為老師加入）。
  - 6 人 × 5 句上台設計：第 5 句每人不同；五、六年級兩版鷹架，每個對象 5 句原因。
  - 流程表：全年級集會 40 分鐘＋各班延伸。

## 2. 開場影片（南瓜派小子 Pippy）🟡 試做片 v3 待老師明天審
- 位置：`opening-video/`
- **文件**：
  - 劇本：`劇本_v1.md`（Google 文件 1TMxAwpfCK9B9a52oZNv6raVDGf8T203sVTjQs5kTR1k）
  - 句意動作＋每鏡聲音表：`句意動作與聲音對照表_v2.md`（Google 文件 1tdJbGWp95xK3zsBnxbWV46oheLPP4wha64rpGfCWhq0）
- **已定案**：
  - Pippy 畫風：A 柔和 3D（`chars/pippy.png`）。
  - 聲音：edge-tts `en-US-AnaNeural` rate -20%（`pippy_voice.json`）。VoxCPM2 三種都被打槍，太像機器人。
  - 由來 13 個短句全部由 Pippy 開口說，每句念兩次（-20%／-30%）。
  - 關鍵詞只加中文標籤，**不可擋到人物或重要畫面**，每鏡指定空白位置。
  - 數字、地名用程式疊上。
  - 每鏡都要有配樂＋音效。
- **試做片**：`work/pilot/pilot_720p.mp4`（37.6 秒），由 `scripts/compose_pilot.py --sfx sfx --music 1` 組出，內容：
  - S03：程式地圖 3 秒，接 H3 念兩次。
  - S08：H3 念兩次，接玉米發芽全畫面鏡頭。
- **聲音素材**：
  - 配樂：Colab Music 3 生成（`music/voyage`、`music/spring`）。spring 那段人聲殘留 0.24，已分離掉。
  - 音效：Pixabay 10 個，來源記在 `sfx/sources.json`。
- **下一步**：
  1. 老師審 v3。
  2. 其餘 8 句首幀（S04–S07、S09、S10、S12；S11 全程式，用程式嘴形）→ H3 → 配樂與音效 → 3 題是非題 → 全片。
  3. 新首幀要在畫面最下方**留一條空地給字幕**（v2 時提醒過老師，還沒得到回覆）。

## 3. 學生分享 35 句程式動畫（分支 session 做的）🟡 待老師審
- 位置：`thankful-35/`（網頁播放器 `index.html`；`renders/thankful_all_720p.mp4` 6 分 37 秒）。
- 詳情看分支 session「台灣國小英語感恩節活動 (fork)」的報告。

## 花費
- Colab：342.04 → 336.89 units（聲音試聽約 2、H3 試做 4 段約 0.9、配樂約 1.6）。
- Codex 生圖：Pippy 3 張、首幀 2 張。

## 踩坑
- **H3 輸出只有配音**，沒有環境音，音效要自己混。
- **G4 機房授權**：這次分配到荷蘭，屬於 H3 授權排除地區。老師說「照舊跑」。
- **VoxCPM2 卡通聲加 rubberband 拉長** → 老師覺得像機器人。改用 edge-tts 童聲，語速直接設 -20%，不再拉長。
- **edge-tts 7 要 `boundary="WordBoundary"`** 才拿得到逐字時間；逐字結果沒有標點，要對回劇本補標點。
- **Pixabay 音效**：在頁面 ld+json 的 `contentUrl` 可以直接下載 mp3。每個音效先把有聲部分的 RMS 調到 -20 dBFS，再設定 dB。
- **Music 3 的音量**：要先正規化，否則 -30 dB 會聽不到。
- **Python 的 ASS 字幕標籤**：在 f-string 裡要寫成 `\\pos`，用 heredoc 改程式碼容易漏掉反斜線。
- **手機遠端傳檔上限 30 MB**：1080p 試做片 37 MB 傳不出去，要另外壓 720p 版本。
