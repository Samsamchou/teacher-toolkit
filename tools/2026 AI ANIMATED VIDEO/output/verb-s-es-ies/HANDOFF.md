# 動詞 -s／-es／-ies 文法動畫（He／She／人名＋動詞）交接

> ✅ **2026-11-21 全片 v1 定案**（6:04）。成品在 `renders/final/`（20 檔）。要改版：改該段程式 → 重出 `renders/parts/` 那一段（字幕版＋`-listening`）→ `python src/assemble.py v2`。

- 規格卡：`rdq/RDQ-spec-verb-s-es-ies-20261121.md`（11/21 confirmed）
- 英文稿：`情境英文稿-draft-20261121.md` v1（講解 5 句＋三段故事＋每段 3 題三選一）
- 成品：一支完整長片（講解→故事 1→2→3）＋切 4 支單獨影片；字幕版＋聽力版。
- 名字：水鈴＝Shuiling、圳寶＝Zun-Bo。

## 第一部分 講解（畫風 I）
- 引擎從 `possessive-adjectives/` 複製（`film.html`、`src/`、字型、音效）；所有格的時間軸留在 `src/_possessive_ref/` 當參考。
- `film.js`＝雪人國度講解：V0 ride／rides 為什麼多 s → V1 三個冷雪人（he、she、人名）→ V2 三團小火苗、示範 He plays → V3 ＋s → V4 ＋es（五顆小雪球 s、sh、ch、x、o）→ V5 y→i＋es → V6 一大群雪人圍火堆（I／You／We／They 不加 s）→ V7 總整理（老師的雪人圖）。
- 卡拉 OK 紅字＝動詞變化（`POSW`）、藍字＝主詞（`SUBW`），在 film.js 開頭設定。
- 配音：`src/voices.json`（旁白 Jenny、例句 Ken；圳寶聲音已加）→ `python src/make_voice.py audio`。
- 圖：Codex 在 `C:\Users\User\whatif-verbs-work\gen\`（`jobs.json`、`jobs2.json`）：雪地背景、冷／暖雪人、小火苗、雪球、營火雪人群、腳踏車、籃球、跑鞋、英文書。
- 檢查：`SHEET_STEP=5 python src/render.py sheet`；輸出 `python src/render.py video <名稱>`。

## 第二部分 故事（畫風 J 剪紙人偶＋KIE Seedance 動作鏡頭）— 完成
- 先做定裝圖（Ken、媽媽、爸爸、Shuiling、Zun-Bo）→ 老師通過 → 故事 1 試片。參考 `hwg7-u03-vienna-cutout/HANDOFF.md` 與總覽 A11。

## 進度
- 2026-11-21：規格卡確認；講解段試片 v1（2:23）已傳老師，等回饋。已知：例句段兩行字幕會蓋到人物的腳和道具，下一版要把人物往上移或字幕移位`renders/verbs-explain-trial-v1.mp4`＋720p。
- 2026-11-21：老師「講解試片通過」。剪紙人偶定裝圖 v1：`renders/costume/costume_v1.jpg`（程式在 `cutout/`：`cast.py` 從 Vienna 複製並加 ken／mom／dad／shuiling／zunbo，`_patch_cast.py`、`_zunbo.py` 是加角色的紀錄；`python qc_costume.py <out.jpg>`）。等老師看。
- 2026-11-21：老師「要看得到手指」→ `cutout/cast.py` 的 `mitten()` 改成張開手掌＋四指＋拇指（`_hand.py` 是紀錄；握東西時 grip=True 手指彎起）。定裝圖 v2 `renders/costume/costume_v2.jpg`，等老師看。
- 2026-11-21：老師「定裝圖 v2 通過」。故事 1 試片 v1（1:01）`renders/story1-trial-v1.mp4`＋720p 已傳，等回饋。程式 `cutout/story1.py`（`--stills [秒…]` 出檢查圖）、配音 `cutout/make_voices.py` → `audio/story/`（wav2vec2 強制對齊對嘴）。已知要修：SUNDAY 月曆卡擋到媽媽的臉；媽媽跑步的腿像交叉跳（正面人偶）。
- 2026-11-21：故事 1 試片 v1 退件（動作不合理）→ 規格卡 `rdq/RDQ-spec-story1-actions-20261121.md`（1C KIE Seedance 動作鏡頭、2C 字卡加強、倒數 4 秒）。Codex 首幀 3 張 `assets/firstframes/`（工作夾 `C:\Users\User\whatif-verbs-work\ff\`），檢查圖 `renders/costume/pose_check_v1.jpg`。KIE 餘額 4775.1，報價等老師同意（還沒花）。
- 2026-11-21：老師同意 KIE 上限 350 點。480p 試拍 3 鏡頭各 1 次共 60.8 點（`cutout/kie_actions.py`、`renders/kie/ledger.json`；三個同時跑會互相蓋掉 ledger，要一個一個跑或事後補記）。合併檔 `renders/kie/test_480p_all.mp4` 已傳老師，等同意拍 720p。
- 2026-11-21：老師同意拍 720p：3 鏡頭各 1 次 131.2 點，KIE 累計 192 點（上限 350）。`cutout/story1.py` 改成 v2（v1 備份 `story1_v1.py`）：開頭 4 句是程式人偶，A05–A08 換成 KIE 影片（`REL`／`HIT`／`CATCH` 是影片裡出手、碰球、接球的秒數；`tmap` 對時、碰球前後 0.25 倍慢動作）；動詞字卡放大＋小火苗貼 s＋紅光＋叮；倒數 `COUNT=4`。影片抽格放在 %TEMP%/verbs-story1-frames。
- 2026-11-21：故事 1 試片 v2（1:06）`renders/story1-trial-v2.mp4`＋720p 已傳，等老師看。老師決定：v2 通過後，故事 2、3 才分給兩個 sub-agent 同時做（sub-agent 不花 KIE，報價由主對話問老師）。已知：720p 丟球是高拋弧線（比 480p 試拍高），最後有到球棒；接球鏡頭球落下的過程看不到，只看到手套接住、之後舉球。
- 2026-11-21：老師「故事 1 第 2 版通過」。故事 2、3 分給兩個 sub-agent 同時準備（配音、查姿勢、Codex 首幀、story2.py／story3.py 佔位版、kie_actions_s2/s3.py 不執行）；`cutout/phalign.py` 加 `EXTRA`（Shuiling、Zun-Bo、Mimi 發音）。sub-agent 不花 KIE；回來後主對話檢查、給老師姿勢檢查圖＋報價。
- 2026-11-21：老師「KIE 上限取消」（這支片）。仍然每次記 ledger、做完報實際用量；流程照舊先 480p 試拍再 720p。sub-agent 寫的 kie_actions_s2/s3.py 回來後要把 BUDGET 一起改。
- 2026-11-21：故事 2 sub-agent 回報完成（沒花 KIE）：`cutout/story2.py`（佔位版 70.9 秒 `renders/story2-placeholder-v1.mp4`）、`make_voices_s2.py`、`kie_actions_s2.py`（4 鏡頭 jog／station／tv／homework 共 22 秒，480p 約 84 點、720p 約 180 點）、首幀 `assets/firstframes/ff2_*.png`、姿勢檢查圖 `renders/costume/pose_check_s2.jpg`（已傳老師）、規格卡 `rdq/RDQ-spec-story2-actions-20261121.md`（draft）。事件秒數 TOOT／LAUGH／WRITE 是預估，拍好要改。車站是一般木造小站，不是二水車站。
- 2026-11-21：故事 3 sub-agent 回報完成（沒花 KIE）：`cutout/story3.py`＋`story3_bg.py`（佔位版 82.0 秒 `renders/story3-placeholder-v1.mp4`）、`make_voices_s3.py`、`kie_actions_s3.py`（5 鏡頭 s3_fly／s3_try／s3_hurry／s3_help／s3_happy 共 26 秒，480p 約 99 點、720p 約 213 點；`USE_HELP=False` 可拿掉沒台詞的竹竿鏡頭）、首幀 `assets/firstframes/ff3_*.png`、姿勢檢查圖 `renders/costume/pose_check_s3.jpg`（已傳老師）、規格卡 `rdq/RDQ-spec-story3-actions-20261121.md`（draft）。C07 哭是程式人偶特寫。事件秒數 STUCK／FREE 是預估；轉場用暗場。兩段都等老師看首幀。
- 2026-11-21：老師看故事 2 首幀：車站改成像二水車站、寫功課手勢要合理、慢跑要修。已重畫 3 張（舊圖在 `assets/firstframes/_old/`，Codex 工作夾 ff2 的 `jobs_g/h/i.json`）：慢跑＝前手胸前、後手在身後不叉腰；車站＝照小行星的二水車站模型圖（米白牆、黃飾帶、圓柱門廊，無字）；寫功課＝近鏡頭看得到握筆，紙在字幕上方。檢查圖 `pose_check_s2.jpg` 重出並已傳，等老師看。
- 2026-11-21：老師決定故事 3：竹竿鏡頭 s3_help 要留；「Zun-Bo cries.」改用 KIE（已請故事 3 sub-agent 加 `ff3_cry.png` 首幀、`s3_cry` 鏡頭並改 story3.py）。
- 2026-11-21：故事 3 加 `s3_cry`（KIE）完成：首幀 `ff3_cry.png`、`kie_actions_s3.py`、`story3.py`（`CRY=1.5` 預估）、檢查圖 6 張已傳老師；佔位版 82.97 秒。已知：ff3_cry 和 ff3_hurry 不完全連戲（Ken 在不在場、握線軸的手）。兩段共 10 鏡 53 秒，480p 約 202 點，等老師說可以試拍。
- 2026-11-21：老師「都通過，試拍」。故事 2、3 共 10 鏡 480p 各 1 次：故事 2 83.6 點（`ledger_s2.json`）、故事 3 117.8 點（`ledger_s3.json`），KIE 全片累計 393.4 點。合併檔 `renders/kie/test_s2_480p_all.mp4`、`test_s3_480p_all.mp4` 已傳。已知：station 鏡頭約 2.5 秒後車站和火車就滑出畫面（Toot 時看不到火車）；homework 約 1 秒時鏡頭跳一下（桌子下方露出桌腳和腳）；其他鏡頭動作符合檢查點。等老師同意拍 720p。
- 2026-11-21：老師要車站和寫功課重拍。`kie_actions_s2.py` 兩段提示詞改 v2（車站：背景只慢慢移、車站和火車全程在畫面裡；寫功課：鏡頭鎖死、不露腳）。480p 第 2 次 41.8 點，都修好（`station_480p_2.mp4`、`homework_480p_2.mp4`，合併 `test_s2_retake_480p.mp4` 已傳）。KIE 全片累計 435.2 點。720p 要用新提示詞拍。等老師同意拍 720p。
- 2026-11-21：老師「可以，拍 720p」：故事 2、3 共 10 鏡 720p 各 1 次 434.6 點，KIE 全片累計 869.8 點（ledger 192＋ledger_s2 305.8＋ledger_s3 372）。事件秒數已照 720p 抽格改：story2 `TOOT=3.0`、`LAUGH=4.5`、`WRITE=0.6`（homework 影片開頭 0.45 秒有跳動，已剪掉，原檔 `homework_720p_1_raw.mp4`；homework `dy=95`）；story3 `STUCK=3.9`、`FREE=3.0`。試片輸出中：`renders/story2-trial-v1.mp4`、`story3-trial-v1.mp4`＋720p。
- 2026-11-21：故事 2 試片 v1（1:11）、故事 3 試片 v1（1:23）已傳老師，等回饋。響度 −16.6／−16.9 LUFS（定案前調到 −16）。已知：故事 2 寫功課鏡頭最下面一條是把影片最後幾列拉長補的，桌子下的綠鞋被拉成直條（要改成補桌子顏色或把畫面裁掉下緣）；兩段都只抽格看過，沒用正常速度看、沒聽聲音。
- 2026-11-21：老師「故事 2、3 試片通過」。收尾修正：三段故事加 `--nokara`（聽力版只拿掉卡拉 OK，字卡和三選一保留）；story2 寫功課底下那條改補素色；講解段例句人物、道具、句子往上移（字幕不蓋腳）；`src/render.py` 的 `load_lines` 跳過 `audio/story/`。全片輸出中：8 個分段 → `renders/parts/`（explain、story1–3，各字幕版＋`-listening`）→ `python src/assemble.py v1` → `renders/final/verbs-full-v1*.mp4`＋4 支單獨影片 `verbs-1-explain`／`2-story1`／`3-story2`／`4-story3`（各 −16 LUFS、1080p＋720p）。
- 2026-11-21：全片 v1 完成（6:04，363.6 秒）：`renders/final/verbs-full-v1.mp4`、`-listening`、各 `-720p`；4 支單獨影片 `verbs-1-explain`（2:23）、`2-story1`（1:06）、`3-story2`（1:11）、`4-story3`（1:23）同樣四種版本，共 20 檔。響度 −16.0 ～ −16.3 LUFS。KIE 全片累計 869.8 點。等老師看全片、定案。未 commit。
- 2026-11-21：老師「v1 定案」。成品 `renders/final/verbs-full-v1*.mp4`＋4 支單獨影片（字幕版、聽力版，各 1080p／720p）。Google 雲端連結（私人）：字幕版 1080p `1z8Abhq9QClqGAVy_ch3xZdw3Zi3GM4DB`、720p `1H7C8gtKmkNYwGZQeRPhitFElOqvlcN_X`、聽力版 1080p `1JjR7vEHb4ulseP--b4em248n_q63BZSD`、720p `13FWreSZBnmvd47qpXEzrNTUtIf7ClBHx`。KIE 全片 869.8 點。四張規格卡已勾完。定案時沒修的小地方（下一版可改）：故事 1 丟球是高拋、接球鏡頭看不到球落下；故事 3 哭→趕來兩鏡 Ken 在不在場不連戲；段落之間直接切、沒有轉場。未 commit。
