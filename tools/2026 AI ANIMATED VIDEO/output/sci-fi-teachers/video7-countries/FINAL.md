# 影片 7〈Countries — I'm from ___.〉定案紀錄

- 2026-11-06 老師看完全片 v1 說「定案」：正式版 `renders/video7-countries-v1.mp4`（9:36，17281 格，1080p）＋`video7-countries-v1-720p.mp4`（28 MB）。影音檔與圖片不進 Git。
- 出處：翰林 HWG7 U01 Target Language A「Listen, Say, and Number」Countries（六年級上學期，老師截圖含手寫音節、大寫圈、補充 Korea／Vietnam）；
  規格卡 `rdq/RDQ-spec-video7-countries-from-20261105.md`；腳本 Google 文件 1ieRhES5REFc9Xpopc3dUhWW2HZF4xyD3d8DT3QZEiwA。
- 上課順序：影片 7（國名單字＋I'm／He's／She's from）→ 影片 6〈Is she from India?〉。
- 段落：01 開場 → 02 十個國名（照片卡＋國旗，Repeat after me 兩輪）→ 03 拍音節＋重音（音節方塊、重音放大、程式拍手）
  → 04 大寫與 the（第一個字母發光、the UK／the USA 全名）→ 05 I'm from ___.（十位朋友自我介紹，最後 Now you! I'm from Taiwan.）
  → 06 He's／She's from ___.（I am→I'm、He is→He's 合併）→ 07 Game time（看國旗說國名、聽 I'm from 找人四選一）→ 08 複習＋片尾。
- 十位朋友與聲音（老師要求每人不同）：Mia＝en-AU-Natasha +30Hz、Raj＝en-IN-Prabhat +50Hz、Yuki＝en-US-Jenny +35Hz、Wei＝en-SG-Wayne +50Hz、
  Sofia＝en-IE-Emily +30Hz、Kai＝en-HK-Sam +50Hz、Lily＝en-GB-Maisie、Tom＝en-US-Eric +50Hz、Jisu＝en-NZ-Molly +30Hz、Nam＝en-PH-James +50Hz。
- 拍音節：老師指正 Vietnam＝Vi-et-nam 三拍。`SYL`（顯示）與 `SYL_TTS`（送給 TTS 的拼法）分開；拍手是程式音效，每音節一聲、重音較大聲，時間取 edge-tts 字詞邊界。
- 程式：以影片 6 為底。`world_board.py` 新增 clap_board（拍音節方塊）、merge_word（I am→I'm）、big_flag、find_board（四選一，不放國旗）、burst；
  `render_v1.py` 的 `board_v7`，朋友名單從時間軸算出；沿用影片 6 的照片卡與 Commons 官方國旗。
- 踩坑與修法：
  - TTS 會把全大寫（重音音節）拼成字母 → SYL_TTS 用小寫拼法（Australia 用 Awss... tray... lee... uh.）。
  - en-IN Prabhat 把「I'm Raj」唸成 I am（拼 Aim 又變 /eɪm/）→ 寫成「I'm, Raj」。
  - 影片 6、7 同時渲染共用分段資料夾互相覆蓋 → 一律 `run_segments.py --segdir "$PWD/renders/segs"`。
- 渲染：本機 8 段平行約 37 分鐘；720p 用 crf 32 才壓到 30 MB 以下。
