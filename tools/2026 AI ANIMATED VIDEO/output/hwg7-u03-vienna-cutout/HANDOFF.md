# A Day in Vienna（HWG7 U03，畫風 J）交接

- 規格卡：`../../rdq/RDQ-spec-hwg7-u03-vienna-cutout-20261117.md`（11/17 confirmed）
- 分工報告：`製作分工評估報告.md`（故事稿 v2 在第 0 節）
- Google 文件故事稿：https://docs.google.com/document/d/1ioMRLq2vqPC-7v3OknRXS6dcXMotNyYymWYFLHApkRk/edit

## 程式
- `src/cast.py`：9 個角色（amber, teddy, mia, edison, rocky, lena, abu, mozart, beethoven）。腳底為原點，手用 IK 指定目標點（`hands={-1:(x,y), 1:(x,y)}`，-1＝畫面左），`under_hands` 畫在手臂下的道具，`mouth_mode='vector'|'none'`。引用 skill 的 `engine.py`，字型改 Comic Relief。
- `src/qc_costume.py`：定裝 2×2（小孩列隊／大人比例／A 向量嘴／B 不開嘴只眨眼）。
- `src/qc_props.py`：直笛、平板、鋼琴（側面坐姿）、羽毛筆（手部特寫）各 4 格。
- 產出在 `qc/`：`costume_qc_v1.jpg`、`prop_*_v1.jpg`（＋單格 png）。

## 進度
- 11/17 定裝 v1＋道具 4 格 v1 出圖，老師選嘴型 A（向量嘴，要精準對嘴）；角色名：黑刺頭黃衣＝Teddy、橘捲髮吊帶褲＝Edison。
- 11/17 精準對嘴：`src/lipsync.py`（edge-tts WordBoundary 逐字時間＋CMU 字典音素→9 種嘴形 X/A–H，嘴形提早 35 ms、每形至少 2 格、閉唇必現，音量微調開合）；`cast.viseme()` 畫嘴形，`mouth=('C',0.9)` 傳入。測試：`src/test_lipsync.py` → `qc/lipsync/`（句 14、18，說話者近景）。
- Beethoven 頭髮改成波浪蓬髮（和 Teddy 刺頭區分）。手勢 present 的手肘仍偏外翻，正片再調。
- 11/17 英文旁白稿 v1：`旁白稿-narration-v1.md`（6 場景 12 句，已加進 Google 文件）；旁白者不入鏡、不對嘴，聲線待定。
- 11/17 RDQ 第 4 輪：新增 3D-2～3D-5、V-2、V-3（共 9 個輔助鏡頭，AI 影片全用 KIE Seedance）；對嘴要升級（強制對齊真實音素時間、嘴放大＋下巴、過渡格、至少 3 格、0.5 倍慢速檢查片）。規格卡回到 draft，等老師確認。
- 11/17 對嘴 v2（規格卡第 4 輪 confirmed）：
  - `src/phalign.py`：wav2vec2 音素 CTC（facebook/wav2vec2-lv-60-espeak-cv-ft，torch CPU）＋自寫 Viterbi 強制對齊，20 ms 解析度。**不要叫 align.py**（會和 skill 的 align.py 撞名）。
  - 踩坑：edge-tts 的 WordBoundary 逐字時間比實際聲音早約 0.16 秒（v1 嘴型因此偏早），已棄用；每句配音去頭尾靜音。
  - `src/lipsync.py` v2：P/B 閉唇放在爆破音之前 75 ms、M 在鼻音期間；每形至少 3 格（閉唇前的母音太短時閉唇縮成 2 格）；短子音併入鄰居；參數化嘴形前後 1 格混合；音量微調開合。
  - `src/cast.py`：`SHAPES` 參數化嘴形（加大）、`draw_mouth()`、下巴隨開口下移。
  - 檢查片：`qc/lipsync/lipsync_v2_1080p.mp4`、`lipsync_v2_slow_1080p.mp4`（0.5 倍＋時間軸）、`lipsync_v2_phoneme_check.jpg`。等老師核准。
- 11/17 對嘴 v2 老師核准。3D：`src/b3d_vienna.py`（六鏡頭程序化建模，toon＋Freestyle）＋`src/colab_3d.py`（session vienna3d；G4 當天 Service Unavailable，改 `GPU=L4`）。
- 11/17 KIE 報價老師同意：V-1/V-2/V-3 共約 13–15 秒、約 115–125 點（Seedance 2.0 Mini 720p 約 8.2 點／秒；餘額 4881.7）。先出 Codex 首幀給老師看再送。
- 下一步：3D-0／3D-1 靜態檢查圖 → KIE 報價（V-1）→ S2 20 秒試片。

## 2026-11-17 16:20 交接（老師關機前）

**已完成**
- 三張 Seedance 首幀定稿候選（`assets/firstframes/`）：`v1_orchestra.png`（老師已說可直接用）、`v2b_audience.png`（重畫：雙手分開在拍）、`v3b_street.png`（重畫：現代服裝、簡化）。舊的 `v2_audience.png`、`v3_street.png` 作廢。v2b、v3b 是 1672×941，送 Seedance 前放大到 1920×1080。
- 生圖走 Codex 內建生圖（訂閱內，無 API 費用）。工作資料夾 `C:\Users\User\vienna-gen`，指令：`codex exec --skip-git-repo-check -s workspace-write -i style_ref.png - < v2b.txt`。
- `src/b3d_vienna.py` 修掉 Freestyle 錯誤（背景模式 `lineset.linestyle` 是 None，要自己 `bpy.data.linestyles.new`）。

**3D 檢查圖**
- 第一次排程（`colab_3d.py` 一次排 6 鏡）連線卡住兩小時，Colab 上根本沒開始跑，白花約 3.5 單位。之後改成直接 `colab exec -f work/_t2.py`（6 鏡 × 3 格 0,45,89，32 samples、50%）。
- 結果存 `renders/3d/test/`（見下方「關機前狀態」）。
- 踩坑：`colab_3d.py` 的長 exec 會無聲卡住；先用 `colab ls /content/tout` 確認真的有出圖，5 分鐘沒圖就停。

**還沒做**
- 老師還沒看 v2b、v3b 與 3D 檢查圖；Seedance 尚未送出（報價約 115–125 點已同意，但要等首幀 OK）。
- 3D 每鏡 1 秒試渲 → 全渲；S2 20 秒試片；全片。
- 旁白稿 v1 用字、旁白聲線老師尚未回覆。
- 全部未 commit。

**關機前狀態（16:30）**
- 18 張 3D 檢查圖已下載到 `renders/3d/test/`，總覽 `3d_check_sheet_v1.jpg`。每鏡 3 格約 18–104 秒（s1 電車最慢）。
- Colab `vienna3d` 已停機（Active assignments 0）。餘額 46.40（今天從 50.40 開始，共用 4.0 單位，其中約 3.5 是卡住空轉）。
- 下次要渲 3D：重新 `colab new`（L4；G4 今天開不起來）、重裝 Blender、上傳 `src/b3d_vienna.py`，用 `work/_t2.py` 的寫法直接 exec。
- 開機後第一件事：我自己逐張檢查 3D 圖的建模問題並列給老師，再問首幀能否送 Seedance。

**3D 檢查圖 v1 我看到的問題（還沒改）**
- s0 花園：草地是一整片螢光綠、太空；高音譜號花圃偏小，看不太出是譜號；地平線太平。
- s1 電車：可用。左前方深色電線桿太粗、擋畫面；電車車窗內是空的。
- s2 時光隧道：可用。齒輪、時鐘、音符都看得出來。
- s3 歌劇院：可用。上層拱窗裡的月牙形陰影怪怪的；第 0 格鏡頭太貼近。
- s4 黃昏花園：可用，太陽在圓頂後面。第 0 格前景路燈太大。
- s5 鋼琴內部：只有白鍵沒有黑鍵；琴槌（紅色小塊）太小、看不出在敲弦。

**關機前最後狀態**
- 老師決定：先修 3D 再看（Seedance 之後再說）。老師喊暫停時 `src/b3d_vienna.py` 還沒開始改。
- 下一步：照上面「3D 檢查圖 v1 我看到的問題」修（先 s0 花園、s5 鋼琴內部，再處理 s1 電線桿、s3 拱窗陰影與第 0 格鏡位、s4 前景路燈），再開 Colab L4 重渲 18 張（先報預估單位，約 0.3）。
- Colab 已停機，本機沒有背景工作。

## 2026-11-17 晚 3D 檢查圖 v2

- `renders/3d/test/3d_check_sheet_v2.jpg`（18 張）；v1 移到 `renders/3d/test_v1/`。
- 改動：s0 譜號花圃放大（白邊紅花）、方塊花壇、遠方樹列與山丘；s5 重新設計（鍵 → 大琴槌由下往上敲弦、黑鍵）；s1 拿掉前景電線桿、加乘客剪影；s3 拱窗純色、第 0 格鏡頭後拉；s4 路燈外移。
- 重要 bug：`box()` 裡 `transform_apply(scale=True)` 預設連位置也套用，之後再設 `location` 會位移兩次（白鍵浮高蓋住黑鍵、電車門跑位）。已改成 `location=False, rotation=False, scale=True`。
- Colab 踩坑：`colab new` 後第一個 exec、以及任何超過約 1 分鐘的 exec 都會卡住或「Connection was lost」。可靠做法：exec 只跑一個立刻返回的 `subprocess.Popen(..., start_new_session=True)`（`work/_bg.py` 裝 Blender、`work/_go.py` 跑 `/content/job.py`），再用 `colab ls /content` 看 `job.done`，最後 `colab download`。
- 還可再調：s0 起始畫面山丘太大、看不到天空。
- Colab 已停機。

## 2026-11-17 Seedance 與旁白試聽

- 老師核准 v2b、v3b 首幀 → `seedance/seedance.py 720p V1 V2 V3`（首幀模式、無聲）。成品 `seedance/V?/720p_1.mp4`，共 106.6 credits（V1 41.0、V2 32.8、V3 32.8），紀錄 `seedance/ledger.json`。老師尚未看過成品。
- 抽格觀察：畫風都維持住；V3 路人位置幾乎沒移動（像原地踏步），要請老師看。
- 旁白聲線試聽 `audio/narrator_samples/`：A en-US-AndrewNeural、B en-GB-SoniaNeural、C en-US-AvaNeural（-20%）。我建議 A，老師未選。旁白稿 v1 已再貼給老師，未回覆。
- 3D 1 秒試渲（6 鏡各 30 格、64 samples、100%）在 Colab L4 跑，輸出 `/content/t1s/*_1s.mp4` → `work/o.zip`。
- 11/17 老師決定：旁白聲線 C（en-US-AvaNeural，-20%）；N2 改「…visit a big, beautiful garden.」、N6 改「At the opera house, many people play Mozart's music together.」（不用 palace、orchestra）。
- 11/17 老師核准 Seedance 三支（V1、V2、V3 的 720p_1.mp4 都採用）。
- 11/17 老師：故事稿通過（對話 21 句 v2＋旁白 12 句修改版）。
- 全片配音 v1：`src/make_voices.py`（聲線表 V、33 句 LINES）→ `audio/lines/<id>.wav`＋`_phones.json`＋`manifest.json`，試聽 `audio/voice_reel.mp3`。純語音 102.9 秒。老師尚未聽。edge-tts 偶爾 NoAudioReceived，重跑該句即可（`python make_voices.py L21`）。男孩聲是成人男聲調高，待老師確認；Abu 機器人效果未加。
- 11/17 老師：Abu 要機器人效果（`make_voices.robot()`：afftfilt 相位歸零 55%＋原聲 45%＋短回音，`_dry.wav` 保留原聲）；L11、L21 只用兩個聲音（我選 Amber＋Teddy；畫面上所有孩子仍一起張嘴）。試聽 `audio/changed_lines.mp3`、`audio/voice_reel.mp3`。
- 11/17 老師核准配音 v1（含 Abu 機器人聲、L11／L21 用 Amber＋Teddy）。

## 2026-11-17 3D 1 秒試渲＋Scene 2 試片程式

- `renders/3d/test1s/s0–s5_1s.mp4`（各 30 格、1080p、64 samples）。第一次用 detached job＋`colab ls` 輪詢，Colab 判定閒置把機器回收（白花約 0.6 單位）；第二次用 `work/run_t1s.sh`：每 50 秒 `colab exec work/_ka.py` 保持連線、每鏡渲完立刻下載、最後自動 stop，成功。這輪 1.59 單位（45.34 → 43.75）。
- 速度：180 格約 53 分鐘 ≈ 17.7 秒/格（s0 529 秒/30 格）。全 660 格估 3.2 小時 ≈ 6.3 單位（64 samples）；32 samples 可能省一些，但 Freestyle 描邊吃 CPU，省不到一半。
- `src/pilot_s2.py`：Scene 2 試片（N04 V-3 → L07/L08 程式 → N05 3D-1），`--stills` 出 `renders/pilot/pilot_s2_check.jpg`。`renders/3d/s1/` 有 ≥100 格時自動用正式 3D，否則用 1 秒試渲當替代。AI／3D 影格抽到 `%TEMP%/vienna-frames/`。
- 待老師：看 6 支 1 秒試渲 → 同意後正式渲（先渲 s1 給試片用）。
- 11/17 老師同意 3D 正式渲染。`work/run_full.sh`（背景）：L4、順序 s1→s0→s2→s3→s4→s5、64 samples、100%；Colab 上編成 `/content/full/<shot>.mp4`（crf 10），每鏡完成即下載到 `renders/3d/full/`，可續跑（已有 mp4 的鏡頭跳過；影格在 `/content/out/<shot>/`，機器若被回收要重來）。s2 描邊改細（1.4 px）避免遠處線條蓋住隧道盡頭亮光。
- 若背景工作中斷：重跑 `bash work/run_full.sh`（本機已有的 mp4 不會重抓，但 Colab 新機器會從 s1 重渲 → 先改 `_t5.py` 的鏡頭清單）。
- `src/pilot_s2.py` 改成有 `renders/3d/full/s1.mp4` 就用正式 3D。

## 2026-11-17 配樂（老師選 A＋B 混用）

- A：Wikimedia Commons 公有領域錄音（Commons API 查到授權欄皆為 Public domain）：
  - `File:Mozart K525 Serenade in G Major 1 - Allegro.ogg`（S1、S2、S3）
  - `File:Mozart - Serenade No. 13 for strings in G major, K. 525 - Romanze.ogg`（S6）
  - `File:K545 allegro.ogg`（S4、S5）
  - **還沒下載**：upload.wikimedia.org 對腳本回 429；改用瀏覽器 UA 重試被權限系統擋下（不要再這樣繞）。要請老師同意用瀏覽器下載或自己下載到 `audio/music/`。.ogg 用 soundfile 解碼（ffmpeg 會截斷）。
- B：`src/piano_synth.py` → `audio/music/fur_elise_s5.wav`（Für Elise 開頭 12 音）。`b3d_vienna.py` 的 SEQ 已改成同一串音（白鍵 C4–B5 索引），音符起點＝(i×7＋2)/30 秒＝琴槌碰弦那格。新版腳本已上傳 Colab（s5 排最後，會用到新 SEQ）。
- 規則：有人說話時壓低；沒配音的段落音樂音量為 1/4。
- 11/17 老師同意用內建瀏覽器下載 → 三首已下載到 `audio/music/`（.ogg＋soundfile 解碼的 .wav＋20 秒試聽），來源與授權記在 `audio/music/sources.json`。做法：瀏覽器開 `Special:FilePath/<檔名>`，在該頁用 fetch＋a.download 觸發下載，檔案會以 .tmp 出現在 Downloads，再搬進專案。
- 授權讀頁結果：k525_1（Musopen、PDM、無已知限制）最乾淨；k545_1（Raul654 用公有領域 MIDI 轉的電腦演奏，全球 PD）；**k525_2 Romanze 只標「美國公有領域、美國以外不一定」→ 待老師決定用不用**（替代：S6 改用 k525_1 的安靜段落）。
- 音量差很多（RMS 0.03／0.013／0.08），混音前要先各自正規化。
- 11/17 老師決定：S6 照用 Romanze（已告知授權只確定到美國）。配樂分配：S1–S3 k525_1、S4–S5 k545_1、L14 插 fur_elise_s5、S6 k525_2。
- Scene 2 試片 v1：`renders/pilot/pilot_s2_v1_1080p.mp4`／`_720p.mp4`（14.0 秒，正式 3D s1＋V-3＋配樂 k525_1＋電車鈴）。已傳老師，待回饋。全景時角色腳底 y=852（字幕框上緣約 870，不壓腳）。配樂 RMS 0.030、說話時 ×0.6。
- 3D 正式渲染：s1 於 20:00 完成（約 38 分鐘），其餘 5 鏡進行中（背景工作 bj17l1k1i）。
- 11/17 老師：Scene 2 試片通過，做全片。

## 2026-11-17 晚 全片程式 `src/film.py`

- 時間軸＝`BEATS`（22 個 beat：clip／stage／insert），總長 148.2 秒（2:28）。`python src/film.py --stills` 出 `renders/film/check_1–4.jpg`（46 格：每句中點＋插入鏡頭＋關鍵動作）；`python src/film.py v1` 出字幕版，加 `--nosub` 出聽力版。
- 3D 還沒到的鏡頭自動用 1 秒試渲當替代並印 `PLACEHOLDER`；`renders/3d/full/<shot>.mp4` 到齊後重跑即可（影格快取在 `%TEMP%/vienna-frames/`）。
- 場景：fly(3D s0＋N01) → garden(N02、L01–L06，名字標籤、譜號小畫面、Lena 站在踏板滑行進場後下車、BY BIKE) → street(V3) → stop → tram(3D s1) → opera(3D s3＋V1) → box1 → clap(V2＋掌聲) → box2(Abu 按鈕) → tunnel(3D s2) → room1 → piano2d＋piano3d(3D s5＋Für Elise) → room2 → quill → room3 → recorder → room4 → tablet → room5 → dusk3d(3D s4) → bye(剪影＋片名)。
- 鏡頭：單人說話自動推近說話者（下一句 1 秒內開始就不拉回）；全景 1.12 倍。字幕太長自動分兩行（N02）。
- 音效全部程式合成：電車鈴、whoosh、掌聲、直笛四音、遊戲音效；配樂三段（k525_1／k545_1／k525_2），道具特寫時靜音，歌劇院樂團段拉高 2.2 倍。
- 已知待改：道具特寫（鋼琴側面、羽毛筆、直笛、平板）是 4 格逐步動畫（每 0.4–0.6 秒一格），不是連續動作；包廂全景只露出頭肩。
- 11/17 老師問三個已知問題 → 都改了：(1) 道具特寫改連續動作：`qc_props.py` 的四個 frame 函式 `i` 可帶小數（手指抬按、遊戲角色拋物線跳、鋼琴手按鍵→抬手→移到下一鍵、羽毛筆寫→抬筆→移動），`film.draw_insert` 傳小數。(2) 包廂欄杆降到腰部（y=770）。(3) Lena 坐在坐墊踩踏板：`cast.draw(feet=…)`／`legs(feet=…)` 新增腳踝目標（大腿＋小腿 IK）；`film.bike()` 縮 0.8、坐墊放低、曲柄角跟位移走；`ride()` 算車位置。全景鏡頭 1.12 倍只看得到 x=103–1817，所以車停在 x=300、Lena 站 580。
- 改前備份：`work/cast_bak.py`、`work/qc_props_bak.py`、`work/film_bak.py`；修改腳本 `work/patch1.py`。檢查圖 `renders/film/fix_check_props_box.jpg`、`fix_check_ride.jpg`。

## 2026-11-17 深夜收工：全片 v1

- **成品**：`renders/film/vienna_v1_sub_1080p.mp4`（71 MB）／`vienna_v1_sub_720p.mp4`（25 MB），148.1 秒。720p 已傳老師，**老師尚未看**。聽力版還沒輸出（`python src/film.py v1 --nosub`）。
- 3D 六鏡正式版都在 `renders/3d/full/`（s2 隧道盡頭亮光已修好；s5 琴槌照 Für Elise 順序）。Colab 正式渲染 6.3 單位（43.75 → 37.45），已停機。今天 Colab 合計約 12.9 單位。
- 全片音量：平均 -21.3 dB、最大 -0.4 dB（未做 LUFS 正規化）。
- **下次開工**：先問老師看完 v1 的回饋；常見可能要調：配樂音量、男孩聲、道具特寫節奏、轉場。改完重跑 `film.py --stills` 看檢查圖再輸出。
- git：只 commit 程式與文件（`src/`、`work/` 裡的 Colab 腳本、HANDOFF、報告、旁白稿、RDQ 規格卡、seedance 腳本與花費紀錄、音樂來源表）；影音圖片不入庫。

## 2026-11-18 v2 修改（RDQ `rdq/RDQ-spec-vienna-v2-tram-card-opera-20261118.md`，confirmed）

- 老師看完 v1：(1) BY TRAM 字卡要有電車圖示；(2) 歌劇院外觀畫面一閃一閃。選 1A、2B、3A，建議全採納。
- 字卡：`film.icon_card()`（紙色底紅雙框＋圖示＋76 級字），`icon_tram`、`icon_bike` 程式畫；放在畫面上方（y=132）不擋臉。電車 3D 鏡頭 `hud_tram3d` 在停車後標 tram 大標籤＋紅箭頭，beat 最短 5.2 秒（多停約 1 秒）。其他字卡字級 56→72，WRITE MUSIC 移到左上不擋手。全片長 149.1 秒。
- 歌劇院閃爍原因：拱窗用「方塊＋圓柱」兩個物件拼，接縫處 Freestyle 描邊每格忽有忽無。`b3d_vienna.arch()` 改成單一網格（prism 擠出拱形輪廓）。舊檔留作對照 `renders/3d/full/s3_v1_flicker.mp4`。重渲腳本 `work/run_s3.sh`（只渲 s3）。
- 其他鏡頭抽查連續 3 格（s0、s1、s4、s5 各一處）描邊穩定。量化指標（單格跳變像素）會被鏡頭移動干擾，不能用來比較不同鏡頭。
- 改前備份 `work/film_v1.py`；修改腳本 `work/patch2.py`；檢查圖 `renders/film/v2_check_cards.jpg`。
- 11/18 中午：s3 重渲完成（`renders/3d/full/s3.mp4`），連續 12 格放大看拱窗內無忽有忽無的線。Colab 0.77 單位（37.45 → 36.68），已停機。
- **全片 v2**：`renders/film/vienna_v2_sub_1080p.mp4`（71 MB）／`vienna_v2_sub_720p.mp4`（25 MB），149.1 秒。720p 已傳老師，待回饋。聽力版仍未輸出（老師說可以後跑 `python src/film.py v2 --nosub`）。
- v2 修改尚未 commit（film.py、b3d_vienna.py、HANDOFF、RDQ 規格卡、work/patch2.py、run_s3.sh、_t6.py）。
- 11/18 下午：老師說 v2 可以 → 聽力版輸出 `renders/film/vienna_v2_listen_1080p.mp4`（70 MB）／`vienna_v2_listen_720p.mp4`（25 MB），149.1 秒，720p 已傳老師。聽力版只拿掉卡拉 OK 字幕；字卡（BY BIKE、BY TRAM、tram、PLAY THE PIANO…）、名字標籤、地點牌、片名都保留，已告知老師，待老師決定要不要也拿掉。
- 目前成品：v2 字幕版＋聽力版各 1080p／720p。老師尚未說「定案」。v2 修改未 commit。

## ✅ 2026-11-18 定案：全片 v2

- 老師：「保留，這樣定案」。定案成品（`renders/film/`）：`vienna_v2_sub_1080p.mp4`／`_720p.mp4`（字幕版）、`vienna_v2_listen_1080p.mp4`／`_720p.mp4`（聽力版，只拿掉卡拉 OK 字幕，字卡與名字標籤保留）。長度 2:29。
- 總花費：KIE 106.6 credits；Colab 約 13.7 單位（11/17 約 12.9＋11/18 0.77）。
- 待辦：v2 修改未 commit；畫風 J 流程尚未寫進 `tools/影片與動畫工作流總覽.md` 與 growkaz-cutout-tales skill。
- 11/18：畫風 J 流程已寫進 `tools/影片與動畫工作流總覽.md`（A11：素材表、畫風選單、章節＋踩坑表、缺口、開口說法）。Google 文件版總覽尚未同步。改前備份 `work/overview_bak.md`。
- 11/18：總覽的 Google 文件版已同步 A11（三個表格各加一列、「目前的缺口」加一行、文末照舊例附加【2026-11-18 新增】A11 整段，讀回確認）。注意：Google 文件版本來就比 md 舊——畫風選單只到 F、表格沒有 A7–A10 與 B4 的列（A7、A10 是附在文末），這次沒有補。

- 2026-11-18：老師說「補齊」→ Google 文件版總覽補上原本就缺的舊內容（一次 55 個操作，讀回確認）：三個表格補列（素材表 A9／A7／A10／B4、「下次這樣跟我說」A7／A9／A10／B4、畫風選單 G／H／I）、開頭加更新紀錄＋字幕位置與字體兩條共用規則、「更多共通技巧」、缺口 11/05・11/07・11/13 三行；文件最後用「【2026-11-18 補齊】」附上 A9、A8、B4、A7 更新、其他程式渲染工具、Phonics 規則、3D 人物檢查。比對腳本顯示 md 的內容在 Google 文件都找得到（只剩措辭不同）。
