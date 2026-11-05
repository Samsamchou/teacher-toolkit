# 影片 6〈Is she from India?〉定案紀錄

- 2026-11-05 老師看完全片 v1 說「修 3:45 後定案」：正式版 `renders/video6-isfrom-v1.1.mp4`（11:43，1080p）＋`video6-isfrom-v1.1-720p.mp4`。影音檔與圖片不進 Git。
- 出處：翰林 HWG7 U01 Target Language（六年級上學期，老師上課截圖兩張含手寫註記）；規格卡 `rdq/RDQ-spec-video6-is-she-from-20261105.md`；
  腳本 Google 文件 1xObpQ05Aj89d6NNzR-dhnTRV6CEIlPv4Oxa60uwxNvc。
- 段落：01 開場（十位朋友飛進來）→ 02 十個國家（課本 8 國＋老師補充 Korea、Vietnam；國名大寫、the UK／the USA、全名 United States of America／United Kingdom；接力唸）
  → 03 from＝來自 → 04 She is → Is she（對調動畫、句尾 ↗）、Is he → 05 No, she isn't.（is not 合併、She's）／Yes, she is.（Is 回到句尾的箭頭，老師截圖上的 Is → is）
  → 06 老師示範 → 07 三部對話（Amy 問、Ben 答；教室照片牆、國際日、平板視訊；聽兩次 → 老師指照片問答）→ 08 Game time 六題（後兩題學生先問）→ 09 複習。
- 十位朋友（男女各 5，Codex 圖，站在自己國家地標前）：Mia 澳洲、Raj 印度、Yuki 日本、Wei 新加坡、Sofia 西班牙、Kai 臺灣、Lily 英國、Tom 美國、Jisu 韓國、Nam 越南。
- 國旗：不讓 AI 畫。`fetch_flags.py` 從 Wikimedia Commons 下載官方 SVG（公有領域），Playwright 轉 PNG、保留各國比例；片尾註明。Commons 會回 429 → 間隔 4 秒＋退避重試。
- 程式：以影片 5 為底。新增 `world_board.py`（照片卡＋國旗、十人總覽與接力亮國家、大寫字母卡、swap、Is → is 箭頭）、`render_v1.py` 的 `board_v6`；
  對話 `talk_deluxe.py`／`talk_shots.py`：Amy（影片 5 的 ask 姿勢＋斜臉嘴型）左、Ben（影片 3 素材）中、右側牆上兩張照片卡，被問到的發光＋箭頭、另一張變暗；
  問答時停在 Ben 回答那張照片的近景（`pics` 鏡頭）。素材合併在 `talk-art/cut/`（影片 3 cut＋影片 5 amy-ask）。
- 聲音：沿用 Nova（Ava／曉臻）、Cosmo（Guy／雲哲）、Amy（Ana）、Ben（Roger +40Hz），0.8 倍。
- 踩坑與修法：
  - 雲哲（zh-TW-YunJheNeural）時好時壞、edge-tts 曾卡 18 分鐘不回 → `synth()` 每句 60 秒逾時、重試 10 次、失敗時印出哪一句。
  - Amy（Ana）把 "Is she from the UK/USA?" 的 Is 吞掉（聽成 The shoe from…）→ TTS_FIX 加逗號 "Is she, from the UK?"。
  - Ben 的 `show` 姿勢是抱吉他，不要用；`I 放大發光` 會把 India 的 I 也標橘 → 改 `Is 發光`。
  - 老師在十人總覽時伸手指會擋到兩側照片 → 02-country 不用指的姿勢。
  - 答句 `No, she isn't. She's from …` 要分兩行；✘／✔ 和男女圖示要並排（不疊）。
  - 中文字幕換行：收尾標點（」，。等）不能落到行首；條件要加括號（運算優先順序曾讓修正只套到一個分支）。
  - 第二遍播放前 Amy 停在畫面外 → 只有第一遍走進來（`panel(walk=...)`）。
  - v1.1：3:45 中文說明三行字幕蓋住字卡 → 縮短成兩行；照片卡、字卡、中文小卡整體上移，兩行字幕也不重疊。
  - 用 heredoc 的 Python 改檔時，插入的註解別放在 `if …:` 的冒號前面（曾造成語法錯誤，渲染沒執行卻看到舊圖）。
- 渲染：本機 8 段平行，全片約 62 分鐘。**兩支影片同時渲染時分段檔會互相覆蓋**（11/05 影片 6 v1.1 第一次只拼出 676 格）→ `run_segments.py --segdir "$PWD/renders/segs"` 各用各的目錄。
