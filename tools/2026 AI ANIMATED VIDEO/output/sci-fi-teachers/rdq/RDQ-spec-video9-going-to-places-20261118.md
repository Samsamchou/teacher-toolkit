---
rdq_version: 1
edition: claude-code
task: 影片 9：HWG5 U03 地點單字＋I'm going to the ___.
domain: video
date: 2026-11-18
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 4
  revisions: 0
downstream: 3d-teacher-lesson-video
---

# RDQ 需求規格（confirmed 2026-11-18 老師「照這份開始」）：科幻雙老師影片 9〈I'm going to the ___.〉

## 一句話任務
HWG5 U03 地點單字與 I'm going to the ___. 教學影片，含 8 支桌上微縮情境動畫和 5 題 2 ICONS 1 PLACE 練習。

## 已確認
- 8 個地點（不做 bank）：post office、supermarket、library、hospital、park、bookstore、museum、**train station**（1A）。
- 台詞照網站 `hwg5-clock-tower.web.app/ershui-planet-guess/`（`3D planet/godot-ershui-planet/data/listen.json`），一字不改。
- 畫風 H 桌上微縮（Blender＋Colab G4）；小鎮是**微縮二水**，地點和網站一樣（2A）。
- 每段都是 **Ken** 一個人去（3A）；**Nova 或 Cosmo 老師**問 Where are you going?（4A）。
- **DAY、WEATHER 要有圖字卡**：圖用 Codex 生（不能有字），英文字用程式疊上（Comic Relief）。
- 情境動畫後接 5 題 2 ICONS 1 PLACE：library、hospital、park、post office、bookstore，圖示沿用網站 `clues/icons/<地點>_1/_2`。

## 每段流程（約 12–14 秒 × 8）
DAY 圖字卡＋WEATHER 圖字卡（念情境句）→ Ken 說 I want to ___. → 老師問 Where are you going? → 停 3 秒讓學生猜 → Ken 走（或騎車）到地點，招牌亮起 → I'm going to the ___. → Your turn 3 秒。

## 待確認假設
- 全片其他段落（開場、單字、句型、Game time、片尾）照影片 8 的結構；**單字拼音怎麼教等老師決定**，這張卡先不排。
- Ken 是紙片立牌（照二水小行星 Ken 的長相，Codex 生站姿／走路／騎車），不用 3D 骨架模型。
- Ken 的聲音沿用網站（en-US-GuyNeural +18Hz）；老師聲音照影片 8。
- museum 是虛構的「二水鐵道博物館」，影片裡不另外說明。
- 費用：Tripo 0 點（8 棟建築沿用小行星 `bld_*.glb`）；Codex 0 元；Colab 約 8–10 單位（影片 8 的 12 段約 8.4 單位）。

## 已採納建議
- ① 8 棟建築沿用二水小行星現成模型（`bld_post`、`bld_pxmart`、`bld_library`、`bld_health`、`bld_waterpark`、`bld_bookstore`、`bld_museum`、`bld_station`）。
- ② 每段先停 3 秒讓學生猜，再揭曉。
- ③ 招牌英文字用程式疊（Comic Relief），AI 圖不放字。
- ④ 人物動作沿用影片 8 規則：車頭朝前、騎車用坐姿立牌、上下車在車旁、不懸空。

## 本次不納入
- bank；tea shop、restaurant（網站有，影片不用）。
- 單字拼音教學段（老師之後決定）。

## 一段式需求規格
做科幻雙老師**影片 9**（HWG5 U03），其中情境動畫段用畫風 H 桌上微縮，在 Colab G4 用 Blender 渲染：桌上是微縮二水小鎮，8 棟建築沿用二水小行星的模型。Ken 是紙片立牌，依序去 **post office、supermarket、library、hospital、park、bookstore、museum、train station** 八個地方。每段先出 DAY 和 WEATHER 圖字卡（Codex 生圖、程式疊 Comic Relief 字），台詞照網站 Guess 版 `listen.json` 不改。Ken 先說 I want to ___.，Nova 或 Cosmo 問 Where are you going?，停 3 秒讓學生猜，Ken 到達、招牌亮起後說 I'm going to the ___.，最後 Your turn 3 秒。情境動畫後接 5 題 2 ICONS 1 PLACE：**library、hospital、park、post office、bookstore**，用網站的兩個圖示，問 Where are you going? → 倒數 3 秒 → 揭曉答句。製作順序是：先交 1 段試片的縮圖總表，老師通過再渲 8 段。

## 驗收條件
- [ ] 8 段台詞與網站 `listen.json` 完全一致，DAY／WEATHER 每段都有圖字卡。
- [ ] 抽格檢查：車頭朝前、不倒車、人物不懸空、不站在車上、不穿過建築。
- [ ] 5 題練習題的圖示和答案都正確，每題倒數 3 秒。
- [ ] 先交 1 段試片給老師通過，再渲全部 8 段。

## 進度
- 2026-11-18：資料夾 `video9-goingto/`。Codex 生 Ken 立牌＋4 張天氣圖（`tabletop/gen_refs9.py`、`cut9.py`）；配音與時間軸 `build_part9.py`（8 段各約 19.3 秒，情境段共 2:42）；
  字卡字幕 `cards9.py`、合成 `compose9.py`；場景 `tabletop/src/scenes9.py`（8 棟小行星建築正門原本就朝 -Y，yaw9.json 空的）。
  Colab G4 沒空位 → 用 L4（`COLAB_GPU=L4`）；長 exec 會卡 → `src/colab_bg9.py` 分離執行＋每 50 秒短 exec。
  試片 v1 問題：背景看到別的地點招牌、到達鏡頭切到郵局 → v2：只顯示目標招牌、近景 f/2.8 背景糊、到達鏡頭看正門、招牌移到人行道旁、倒數移到 Ken 右邊。
  試片 `video9-goingto/tabletop/qa/pilot-post-v2.mp4` 已傳，等老師看。Colab 約 0.6 單位。
- 2026-11-18 晚：老師要 Ken 對嘴 → Codex 3 種張嘴圖（small／open／round），`mouth9.py` 只貼回嘴巴；`lipsync9.py` 依音量算嘴形（`src/mouth9.json`）；
  試片 v3 `tabletop/qa/pilot-post-v3.mp4` 已傳。單字教學另開規格卡 `RDQ-spec-video9-vocab-phonics-20261118.md`（confirmed）。
  全片腳本 `video9-goingto/script_v1.py`（推估 12 分鐘）→ Google 文件 1fJSrFJmkG6p4qJTZQHGOSkHJQgiKrgabz7_nrzxmI-c，等老師看。
- 2026-11-18 收工：老師「試片 v3、腳本 v1 都通過」。全片配音 v1 `video9-goingto/voice_v1.mp3`（11:25）＋`voice_v1-timeline.md` 已傳，等老師試聽。
  `build_voice_v1.py`：第 6 段直接接 `part9.wav`（POST～END），和桌上微縮渲染同步。ar 發音：Commons En-us-are.ogg 一直 429，
  暫用 Commons 的 /ɑ/＋/r/ 兩個音檔接成 `phonics-audio/processed/En-us-are.wav`（明天可再下載真正的 are 換掉，`phonics-audio/fetch_v9.py`）。
  其他 7 段＋OPEN／END 的 light 檢查：OPEN、SUPER、LIB、PARK、BOOK、MUSEUM 已下載（qa/colab/1118-21*），HOSP、STATION、END 因 colab exec 逾時沒跑完；還沒看。
  明天：老師聽配音 → 檢查 7 段抽格 → 情境 10 段正式渲染（L4 每格約 4.5 秒，估 6–8 單位）→ 插圖、字卡 → render_v1 → 試片 → 全片。
