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
- **ffmpeg 圓框小頭像卡住（2026-11-04）**：compose_v4.py 的 `explainer()` 原本把圓形遮罩 mask.png 和外框 ring.png 用 `-loop 1` 重複播放。結果 ffmpeg 一直沒有輸出、記憶體一直漲（約 590 MB），卡了 1 小時以上。
  - **真正原因**：本機的 **ffmpeg 9.0.1 只要 PNG 加 `-loop 1` 就會卡死**。就算加了 `-t` 也一樣，連 `ffmpeg -loop 1 -t 1 -i mask.png -f null -` 都會卡住。第一次以為是沒設結束時間，補上 `-t` 後還是卡。
  - **修法：不要用 `-loop 1` 讀圖片。**
    - 圓形裁切改用 `geq` 算透明度：`a='if(lte(hypot(X-150,Y-150),149),255,0)'`。
    - 外框圖當一般輸入直接 overlay。overlay 預設會一直停在最後一格，所以不需要 loop。
    - 每個 ffmpeg 都加 `-nostdin`。
    - 背景加 `tpad=stop_mode=clone`，H3 片源先 `fps=24`。
    - 修好後整支試做片 2.5 分鐘合成完成。
  - **怎麼發現卡住**：合成時 `work/v4/` 超過 5 分鐘沒有新檔案、ffmpeg 又一直吃記憶體，就是卡住了。直接停掉，再把那一步單獨拿出來，用 `timeout 60` 逐個輸入測試。
- **標籤寬度估算**：libass 實際畫出的字寬，大約只有 PIL 用同字級量到的 0.8 倍，橫排標籤會越排越寬，壓到畫面。解說畫面有 3 個以上標籤時，改成在左上角**直排堆疊**，每列間隔 84 px。
- **H3 會自己加羽毛頭冠（2026-11-04）**：S09 背景有萬帕諾亞格族人時，H3 會讓新走進來的人戴羽毛頭冠，換 seed、在 constraints 加「No feathers」都沒用（兩次都出現）。
  - ✗ **凍結背景、只留 Pippy 周圍會動的合成法不要再用**：老師看到人物半透明重疊、破格，像突然冒出一個人（11/04 退件）。
  - ✓ **修法**（老師 11/04 RDQ 1B）：重畫首幀，背景只放 3 個人**站在原地**，H3 動作只寫點頭、換手、微笑，明寫「Nobody walks, nobody else comes into the picture」。constraints 加「No feathers」。
  - **以後背景有人的 H3 鏡頭**：首幀人少、站定，動作不寫走動；跑完每 0.5 秒抽一格檢查有沒有冒人、重疊、破格。
- **H3 做「鏡頭往後拉」會爆掉**：X05 拉遠時人飛起來、畫面糊成一團。拉遠／推近改用程式在首幀上慢慢縮放（work/X05.mp4），不必花 units。
- **H3 會多長一隻手（2026-11-04，S02）**：動作寫「一手搭書、另一手指船」，但首幀裡那隻手垂在身旁，H3 就多長一隻手來指，一直到結尾都在。
  - 修法：動作要照首幀的手來寫，例如「左手一直垂著，只有右手動」；constraints 加「exactly two arms and two hands」。
  - 檢查：每 0.25 秒抽一格，特別數手的數量。
- **H3 翻書頁會自己畫新圖**：S02 翻頁後的新頁面出現刻板的羽毛頭冠人物。故事書鏡頭一律寫「不翻頁、停在同一頁」。
- **規則裡寫「No feathers」反而會長出羽毛（2026-11-04）**：S09、S02 加了這句之後，羽毛反而出現（S02 長在 Pippy 頭上）。H3 的 spec 裡**完全不要出現 feather 這個字**，改寫成正面描述，例如「奶油和帽子維持首幀的樣子，頭上不長新東西」「人物的頭髮和頭飾跟首幀一樣」。
- **容易出錯的鏡頭一次跑兩個 seed**：同一台機器一起跑，挑好的那段用，比失敗了再開機便宜。

## 開場影片目前狀態（2026-11-04 18:20）
- 整片 `opening-video/work/full/film.mp4`（720p：film_720p.mp4），約 4 分 46 秒，五段：
  - 開場：S01–S02，H3。
  - 由來：S03–S12，H3＋解說動畫。
  - 是非題：Q1–Q3，程式。
  - 單字：S13＋7 張單字卡，S19、S20 用 H3。
  - 結尾：S21，H3，沿用 S01 首幀。
- 合成指令：
  - 由來段：`python scripts/compose_full.py`
  - 其他段落與整片：`python scripts/compose_sections.py opening quiz vocab ending film`
- 程式場景的產生：
  - `explainers_code.py`：X04、X06、X10、S11
  - `vocab_cards.py`：單字卡
  - `quiz.py`：是非題
- 配樂：7 段由來配樂已用 Music 3 生成；開場、結尾用 harvest，是非題、單字段用 holiday。
- 尚未 commit。
