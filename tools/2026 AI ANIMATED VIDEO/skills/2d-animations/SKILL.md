---
name: 2d-animations
description: 2D Animations：把一首英語教學歌曲（MP3＋歌詞）做成「程式寫成的 2D 動畫影片」，每一句歌詞都對應到動作或圖片、角色對嘴原曲，輸出英文字幕版＋聽力版 MP4；也負責用 Suno 提示詞模板寫新的兒童英語歌（歌詞＋Style）。沿用教師已驗收的 How Do You Go 2D v1 與 Every Day Is Fun 2D v1 工作流（Canvas 2D＋Playwright＋ffmpeg、本機語音辨識對時、逐句分鏡審查、兩場景試片、逐句抽格檢查）。只要使用者提到：把歌曲做成 2D 動畫、歌曲動畫、MV、對嘴、每句歌詞對應動作、Suno 歌詞或 Style 提示詞、修改 How Do You Go／Every Day Is Fun 的 2D 版、或給了一首新歌的 MP3 和歌詞，就使用這個 skill，即使沒有說出「2D Animations」。不用於 3D 骨架動畫（舊 V13–V15）、純節奏單字影片（rhythm-vocabulary-video）或只需生圖的工作。
---

# 2D Animations — 歌曲 2D 程式動畫＋Suno 歌曲提示詞

教師（國小英語，3–6 年級）的核心要求：**每一句歌詞都要對應到動作或圖片，而且落在唱到那個字的時候。** 這份 skill 的所有步驟都是為了做到這件事，並讓教師在花大量渲染時間之前就能看到、改到。

兩種工作：
- **A. 歌曲 → 2D 動畫**（主要）：見下方六階段流程。
- **B. Suno 兒童英語歌提示詞**：見 `references/suno-template.md`。歌生出來後，通常接著走 A。

已驗收案例（照抄它們的做法最安全）：
- `output/how-do-you-go/2d-v1/`（How Do You Go，172 s，11 場景，2026-10-18 正式版）
- `output/every-day-is-fun/2d-v1/`（Every Day Is Fun，190 s，12 場景，2026-10-18 正式版，**引擎最新版，新歌從這裡複製**）
專案根目錄：`G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI ANIMATED VIDEO\`。案例細節與數字見 `references/case-studies.md`。

## A. 歌曲 → 2D 動畫：六階段（每階段結束都停下來給教師確認）

教師偏好「先討論、再動工」。每一階段做完就交出看得到的成果並等確認；確認過的事不要再問第二次。

### 階段 1：先討論工作流程
收到 MP3＋歌詞後，先讀檔（`ffprobe` 看長度；讀歌詞 Word 檔；**也讀 MP3 內嵌的歌詞標籤**——Suno 音檔常有，且可能與 Word 檔不同，例如段落重複次數）。
然後用條列說明接下來的六階段，並列出需要教師決定的事：角色（建議沿用六位學生）、誰對嘴、是否需要安裝語音辨識、成品要哪幾版。不要在這階段開始做。

### 階段 2：量實際演唱（本機、免費）
1. 建立新歌資料夾：`python -I scripts/new_song_setup.py "<歌名>" "<mp3>" "<歌詞.docx>"`（會建立 `output/<slug>/`，複製來源並記錄 SHA-256、複製最新引擎；見腳本說明）。
2. `src/analyze_song.py`：faster-whisper small.en **跑兩次**（不給提示＝看 Suno 實際唱了什麼；給歌詞提示＝時間較準）＋ librosa 拍點／速度。Word 檔的段內換行（`<w:br/>`）與 `[Child A]`／`[Both]` 這類說話者標籤會自動處理；也會存 MP3 內嵌歌詞與標題標籤（標題含 `0.84x` 表示變速版）。
3. `src/align_lines.py`：預設依 Word 檔順序對上逐字時間；**若實唱有重複段落或多唱的句子，先寫 `planning/sung-sequence.txt`（實際演唱順序，一行一句）再重跑**——不要沿用上一首歌的展開規則。用 pyin 音高估男女聲（**只有對唱段可信**）。
4. `src/annotate_timing.py`：兩次辨識對同一句句首相差 > 0.5 s 時取信心較高者；加上需聽校旗標（first_word_long、low_prob、asr_diff…）、對嘴欄與場景；有句子跨場景會標 `CROSSES_SCENE`。
5. 列出「實唱 vs 歌詞檔」差異表（重複次數、多唱的 oh-oh／yeah、被唱錯的字、聽不到的群喊），這些要讓教師聽校確認，不要自己假裝確定。
需要安裝套件或下載模型（faster-whisper 約 0.5 GB）前先取得同意。

### 階段 3：逐句分鏡表（教師審核前不寫動畫程式）
寫 `planning/01-分鏡表-每句歌詞對應動作.md`，一句一列：`# | 時間 | 歌詞 | 對嘴 | 動作／圖片`。另附場景表（**只在段落邊界換場景**；同段落內換地點用鏡頭橫移，不硬切）、角色表、全片視覺主軸（例如星期卡、學科卡）、待確認事項。
用腳本確認每一句都在表中（52/52 這種數字要寫出來）。
對嘴規則（教師已確認，沿用）：
- 第一人稱句與問答句 → 由該角色對嘴；
- 副歌、群唱、口號 → 全員一起對嘴；
- 旁白式第三人稱句（She's…、He's…、Where is Alan…）→ 角色閉嘴微笑；
- 和聲（oh-oh、yeah、dribble、bye）→ 張嘴配動作但不上字幕（`song_lipsync.py --adlibs`）。
教師可能改動某段的指定（例：Verse 3 改成兩人互問、Bridge 只有一人唱），照教師決定並把影響寫明（例如女孩對嘴到男聲）。

### 階段 4：兩個場景的試片（約 30 秒）
挑最具代表性、動作最多的兩段（例如人物故事段＋課堂問答段），渲染含原曲的試片，並在**每個關鍵字的時間點各抽一張靜態圖**自己看過再交出。試片裡每一種新動作都要另抽「動作關鍵格條」，照 `references/character-motion-checklist.md` 的 12 項檢查（預備、擠壓伸展、跟隨、弧線、停格時間等），不過的先修再交。試片通過後才做其他場景。

### 階段 5：全曲
- 其餘場景可交給子代理平行製作（故事場景適合；副歌／群舞共用編舞自己寫）。每份交辦要附：要讀的分鏡表、兩個已通過的試片場景檔、引擎檔清單、禁止修改 engine／其他場景、`grpPop` 浮點陷阱、關鍵字逐張抽格、只做無聲渲染。範本見 `references/delegation-brief.md`。
- 子代理交回後，**自己看他們的抽格總表**再納入；畫面上不能出現上一首歌的人名或國旗等殘留。
- `render_all.py render --jobs 6`（兩版各渲染一次）→ `render_all.py assemble`。

### 階段 6：檢查與交付
- `qa_full.py`：兩版完整解碼、原曲 10 窗相關（應 ≥ 0.99、偏移 0）、兩版音軌相同、SHA-256。
- `qa_lines.py`：每句在唱到一半時從成片抽一格，做成 `qa/lines-contact-*.jpg`，**逐張看**每句是否真的有對應動作，並確認沒有一句被場景交界切開。
- 角色動作原則檢查：照 `references/character-motion-checklist.md`。每句一格看 A 段（演出清楚、立體感、誇張、吸引力、次要動作）；有明顯肢體動作的句子另抽動作關鍵格條看 B 段（預備、擠壓伸展、跟隨／重疊、緩入緩出、弧線、時間）。結果寫 `qa/motion-principles-<版本>.md`，沒看過格條的項目寫「未檢查」。
- 交付：英文字幕版＋聽力版（1080p／30 fps）、720p 手機預覽（1080p 檔超過 30 MB 時傳不到手機）、逐句總表、`HANDOFF.md`。
- 教師說「定為正式版」後：寫 `qa/teacher-acceptance-2d-v1.json`（驗收當下重新算雜湊比對）、`FORMAL_RELEASE.json`、更新專案 README／PROJECT_HANDOFF 頂端紀錄。舊正式版移到 `previous_official_releases`，檔案全部保留。

## B. Suno 兒童英語歌提示詞
用 `references/suno-template.md` 的模板產出「A. 歌詞＋B. Style」。教師的定案偏好：K-pop、**偏成人偶像團 group vocals**、**中等速度（約 100–105 BPM）、語速不要快**，並寫排除風格（fast rap、rushed vocals、double-time、children's choir）。指定句子逐字保留，文法問題另外提出、經同意才改（例：`an AI robot`）。需要 Word 檔時用 `assets/build_suno_docx.cjs` 的做法（歌詞每行一段落，方便複製貼到 Suno）。

## 一定要避開的坑（都踩過）
- `E.back(0)` 浮點值約 2e-16 > 0：用「`k > 0` 才畫」會讓物件在時間前就出現（墨鏡、爆星事件）。一律用 `grpPop()`，或先判斷 `prog(...) <= 0`。
- 場景要以**全曲影格號**渲染（`render.py` 已處理）；串接一律用無聲場景檔，`-shortest` 混音的試片會少 1–2 格。
- ASR 會把整句擠進不到 1 秒（例：How Do You Go 146 s）；`song_words.py` 會在擠壓 < 30% 句長時依字長重新分配。短和聲（beep-boop）的時間要聽波形或看能量另定。
- 側面角色手臂畫在頭前會擋臉：歡呼、舉手時把手臂畫到頭後並把肩點外移。
- 正面角色指向左邊目標時要換手（`[p.la, p.ra] = [p.ra, p.la]`）。
- 胸前徽章、彩旗等共用道具會殘留上一首歌的主題（國旗）；新歌開工就檢查 `cast.js`、`group.js`。
- 不要修改已驗收歌曲的資料夾；新歌一律複製引擎。

## 參考檔
- `references/pipeline.md` — 引擎架構、每個檔案做什麼、新歌要改哪幾處、指令總表。開始寫程式前先讀。
- `references/suno-template.md` — Suno 模板全文與 K-pop 定案設定。
- `references/case-studies.md` — 兩首正式版的時間線、決定與數據；遇到同類問題時參考。
- `references/delegation-brief.md` — 交辦子代理的範本。
- `references/character-motion-checklist.md` — 角色動畫 12 原則檢查表（逐句抽格與動作關鍵格條），試片與全片驗收都用。
- `scripts/new_song_setup.py` — 新歌資料夾與引擎複製（同時放入下面三支通用分析腳本）。
- `scripts/analyze_song.py`、`scripts/align_lines.py`、`scripts/annotate_timing.py` — 階段 2 的通用分析腳本（自動讀 sources/，不需改檔名）。
- `assets/build_suno_docx.cjs` — Suno 歌詞／Style 轉 Word 的範例腳本。
