# 所有格文法動畫（my / your / his / her / our / their）交接

- 規格卡：`rdq/RDQ-spec-possessive-adjectives-20261115.md`（11/15 confirmed：1A 2A 3A 4C、建議全採）
- **✅ 正式版：全片 v3（10:08，2026-11-15 定案）** `renders/possessive-full-v3.mp4`／`-720p`／`-listening`／`-listening-720p`
- 英文稿：`情境英文稿-draft-20261115.md` v1（老師改第 1 段 baseball、第 5 段 Class 601／Ms. Yeh／basketball court）
- 引擎：沿用 A9 畫風 I（`film.html` 從 whatif-ken-freetime 複製＋所有格擴充：`chart` 對照表、`tag` 紅名牌、`dashLine` 虛線、`sentence` 填空句、`bubble` 選項、`ring` 倒數、`ear`／`mic`）；時間軸 `film.js`。
- 卡拉 OK：所有格永遠紅色、主詞藍色（`POSW`、`SUBW`）。
- 配音：`src/voices.json`（Ken＝Guy +18Hz、旁白 Jenny；慢速版 key 結尾 `s`＝-45%）→ `python src/make_voice.py audio`。
- 素材：Codex 在 `C:\Users\User\whatif-possessive-work\gen\`（`jobs.json`）；人物沿用 Free Time（Ken、媽媽 A、爸爸 B、水鈴），新做爺爺、奶奶、指向你的手、Ken 房間、書、棒球。
- 3D：第 1 段的打棒球鏡頭直接沿用 Free Time 版已渲好的 `whatif-ken-freetime/renders/3d/s11`（不花 Colab）。第 2 段 jogging（s03）、第 5 段 basketball（s09）也可沿用；爸爸、水鈴、爺爺奶奶段要新渲。
- 檢查：`SHEET_STEP=2 python src/render.py sheet`、`python src/render.py still 47.5`；輸出 `python src/render.py video <名稱>`。

## 進度
- 2026-11-15：試片 v1（文法講解＋第 1 段 I → my，約 2:07）`renders/poss-trial-v1.mp4`＋720p，等老師看。
- 2026-11-15：試片 v2：講解段改成一行一行出現、每行之間空 1 秒（書留著）、最後完整表＋旁白重念＋紅欄閃光＋停 3 秒（規格卡 `rdq/RDQ-spec-chart-reveal-20261115.md`）。`renders/poss-trial-v2.mp4`＋720p，等老師看。
- 2026-11-15：老師「試片 v2 通過」→ 做第 2–6 段＋his/her、our/their 快速判斷（6 題）＋結尾（課本兩句卡片＋完整表）。全片約 10:00。
  - 第 2–6 段用通用 `story()`（在 film.js；原始片段備份 `src/_parts/`）；設定看 film.js 的 `story({ n: "s02" ... })`。
  - 3D：第 2 段 jogging＝Ken Free Time s03、第 5 段 basketball＝s09（複製到 `renders/3d/s02`、`s05`，不花 Colab）。第 3、4、6 段第 5 句目前是 2D（爸爸彈吉他＋音符、水鈴看電視光、爺爺奶奶遛狗走路）。
  - 第 4 段可等水鈴版 Free Time 的 3D s04（看電視）渲好後直接換上；第 3、6 段沒有 3D 人物模型。
  - 新素材：`bg_entrance/living/shuiling_room/classroom/court/grandparents`、`prop_bottle/cap/guitar/hat/cat/tv/dog`、`ms_yeh`（Codex `jobs2.json`）。
  - 輸出：`renders/possessive-full-v1.mp4`、`-listening.mp4`＋各 720p。
- 2026-11-15：全片 v1 後老師要第 3、4、6 段動作鏡頭（規格卡 `rdq/RDQ-spec-25d-shots-20261115.md`）：
  - 第 3 段爸爸彈吉他 2.5D 完成（`assets/dad_guitar_A/B_cut.png` 同一裁切框交替＝刷弦；刷弦聲 `sfx/strum_down/up.wav` 程式合成）。
  - 第 4 段換成 Free Time 網站的水鈴 watch TV 動畫（`renders/3d/s04`，145→140 格；聲音 `sfx/tv_mime.ogg`，字幕移到上方）。
  - 預覽 `renders/poss-25d-preview-v1.mp4`（14 秒）。第 6 段遛狗：Codex 首幀 `assets/raw/dogwalk_first.png` 完成，KIE Seedance 等老師同意點數。
  - 11/15 老師選 A：KIE 遛狗 480p 試拍 22.8 點 → 720p 正式 49.2 點（共 72 點，`src/kie_dogwalk.py`、`renders/kie/ledger.json`）→ `renders/3d/s06`（140 格），腳步聲 `sfx/step.wav`，字幕放左下。
  - 全片 v2 完成（10:08）：`renders/possessive-full-v2.mp4`、`-listening.mp4`＋各 720p（34／32 MB）；第 5 段 Ms. Yeh 的 our 名牌移到頭上、虛線往下彎不擋臉。等老師看。
- 2026-11-15：老師要水鈴頭像看得到臉＋字幕往上 56 px（規格卡 `rdq/RDQ-spec-icon-subtitle-20261115.md`）：
  - `film.js` 的 `window.FACE.shuiling` 指定裁臉；`film.html` 字幕 bottom 84px（`window.KARA_BOTTOM` 可改）。
  - 字幕上移後講解段「her book／她的書」、開場 my your his…、片尾字幕會蓋到 → 已全部往上移／字幕右移。
  - 全片 v3（10:08）：`renders/possessive-full-v3.mp4`、`-listening.mp4`＋各 720p。
- ✅ 2026-11-15 老師「v3 定案」。正式版＝`renders/possessive-full-v3*.mp4`（v1、v2 留作紀錄）。
