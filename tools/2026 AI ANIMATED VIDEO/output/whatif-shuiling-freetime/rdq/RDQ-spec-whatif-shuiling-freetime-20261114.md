---
rdq_version: 1
edition: chatgpt-app
task: What if you were Ken in Ershui? 水鈴的 Free Time 動畫
domain: video
date: 2026-11-14
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: whatif-situation-video
---

# RDQ 需求規格：What if you were Ken in Ershui? — Shuiling's Free Time（HWG7 U03 第三人稱）

## 一句話任務
把 Free Time **水鈴路線** 11 題做成同系列第二支動畫，練習 **What does she do in her free time? / She ___ in her free time.**：Ken 的爸媽問，學生扮演 Ken 先回答，再由 Ken 念出答案，3D 水鈴做那個活動。

## 已確認
- 句子：`godot-ershui-freetime/data/freetime_shuiling.json` 11 題，遊戲原句不改。依星期：
  - 一：jogging、recorder
  - 二：English、TV
  - 三：music、Internet
  - 四：online games
  - 五：basketball
  - 六：bike、baseball
  - 日：camping
- 問的人：Ken 的爸爸、媽媽輪流（沿用 Ken 版 **媽媽 A＋爸爸 B**，聲音 Aria／Andrew）。
- 每個情境的順序（1A，老師補充）：
  1. 爸媽問句（2D）：情境句、**時間句**、What does she do in her free time?
  2. **默劇 6 秒＋音效**。
  3. **另一張新畫面 Your turn!**：畫面上有架構句 **She ____ in her free time.**，提醒動詞要加 **s／es**，倒數 **3 秒**讓學生說。
  4. **Ken 的聲音＋卡拉 OK** 念出正確答案。
  5. 接 **3D：水鈴在真實地點做那個活動**。
  6. 旁白串場（2D）。
- 默劇（2B）：用 **KIE 重做 11 段「水鈴版默劇」**，沿用遊戲 Ken 版的做法：
  - 同一個講台場景，人物不出聲，每個活動有兩個重點，一段 6 秒。
  - 首幀用 Codex 畫水鈴站在講台上。
  - 音效沿用遊戲的 `video_sfx/<act>.ogg`（music 無聲）。
- 片名（3A）：**What if you were Ken in Ershui? — Shuiling's Free Time**。你是 Ken，爸媽問你好朋友水鈴空閒時間都做什麼。
- 順序（4A）：**先把 Ken 版 Free Time 做完、定案**，再做水鈴版；Ken 版修過的地方直接沿用。
- 沿用 Ken 版規則：
  - 英文卡拉 OK；不要中文字幕；字幕放最下緣。
  - 英文字一律 Comic Relief。
  - 字幕版＋聽力版，1080p＋720p。
  - 先交 Google 文件故事稿。
  - 3D 用 Colab G4 一鏡一批；開 Colab 前報單位和當天用量。

## 已採納建議
- ① 答句字幕把字尾的 **s／es／ies** 換顏色（go**es**、watch**es**、stud**ies**）；Your turn 畫面的架構句也標出來。
- ② 3D 水鈴先檢查模型：用 `shuiling_softhand.glb`，先渲全身＋雙手特寫，確認手掌張開、裙子不被腿穿過，再套 Mixamo 動作；坐姿、跑步特別看。
- ③ 共用 Ken 版 Free Time 的程式與素材（默劇舞台框、爸媽、背景），水鈴版新做：
  - 11 張串場插圖
  - 11 個 3D 鏡頭（約 10–12 單位，分兩天）
  - 11 段 KIE 默劇
- ④ 結尾問學生 **What does YOUR friend do in his/her free time?**，加 5 秒倒數。
- ⑤ 開場換成「水鈴來 Ken 家玩」的短開場，不再用照鏡子。

## 待確認假設
- **KIE 默劇費用**：每段約 49.2 點，11 段約 **541 點**；重拍上限設 **700 點**（和 Ken 版一樣）。目前餘額 6036.1。正式生成前會先試 1 段給老師看。
- 水鈴默劇的服裝：保留水鈴原本的造型（藍色水滴頭髮、綠色裙子），不換學生制服，比較好認。
- 片長約 **6.5 分鐘**：比 Ken 版每段多 Your turn 約 4.5 秒，加上 Ken 念答案。
- Ken 念答案用 Ken 的配音（Guy +18Hz），臉不出現在 3D 裡，3D 只有水鈴。
- 3D 地點：
  - 水鈴家（`bld_shuiling_home`）及室內
  - 二八水水公園、圖書館、學校旁
  - 水心之初大草原、八堡圳公園

## 本次不納入
- 圳寶路線（He ___s）。
- 放進遊戲當線索影片（水鈴版默劇做好後要不要換進遊戲，之後再談）。

## 一段式需求規格
製作 **What if you were Ken in Ershui? — Shuiling's Free Time**，屬於總覽 A9 畫風 I，照 skill `whatif-situation-video`，等 Ken 版 Free Time 定案後才動工。句子用水鈴路線 11 題，遊戲原句不改，只加時間句和串場句。

每個情境依序是：
1. Ken 的**爸爸或媽媽**問：情境句、時間句、**What does she do in her free time?**
2. **KIE 水鈴版默劇 6 秒＋音效**。
3. **Your turn! 新畫面**：架構句 **She ____ in her free time.**，s／es 提醒，倒數 3 秒。
4. **Ken 的聲音＋卡拉 OK** 念出答案，字尾 s／es 換色。
5. **Colab G4 Blender 3D 水鈴做活動**，用 `shuiling_softhand.glb`＋Mixamo 動作，先做模型檢查。
6. 旁白串場。

開場是「水鈴來 Ken 家玩」，結尾一週回顧後問學生 **What does YOUR friend do in his/her free time?**，加 5 秒倒數。

先交 **Google 文件故事稿**；KIE 默劇先試 1 段，上限 **700 點**；3D 約 11 鏡、10–12 單位，分兩天渲。

## 驗收條件
- [ ] 故事稿老師核准：11 個情境都有時間句、爸媽問句、Your turn、Ken 答句、串場。
- [ ] 水鈴版默劇試拍 1 段老師核准（看得出活動、水鈴好認），11 段花費不超過 700 點。
- [ ] Your turn 畫面的架構句和 s／es 提醒清楚，倒數 3 秒。
- [ ] 3D 水鈴動作合邏輯：手拿道具真的拿住、裙子沒有穿模。全片字幕版＋聽力版，-16 LUFS。

## 進度紀錄
- 2026-11-14：規格卡老師確認。依 4A，等 Ken 版 Free Time 定案後才動工（下一步：故事稿 → KIE 水鈴默劇試拍 1 段）。
- 2026-11-14：老師先要水鈴故事稿（不等 Ken 版定案）。故事稿 v1：Google 文件 https://docs.google.com/document/d/1gSvm6t3vDeT_nFfACRGVSB7fDDOfhTn1LJ2gxmv2LKI/edit ；本機 `script/make_story.py` → `script/story-v1.html`。估片長約 6:44。等老師看稿。
- 2026-11-14：老師「稿子可以」。水鈴版默劇試拍 1 段：首幀 `mime/frames/stage.png`（Codex，水鈴站在 Ken 版同一講台）、jogging 1 次就成功 49.2 點（`mime/final/jogging.mp4`；`mime/trial-jogging-with-sfx.mp4` 加遊戲音效）。等老師看試拍再拍其餘 10 段（預估約 492 點，累計上限 700）。
- 2026-11-14：KIE 11 段全部一次成功，累計 **541.2 點**（上限 700）。檢查：jogging、music、internet 是空手默劇；**8 段 KIE 自己加了道具**（recorder 變成金色小喇叭＝錯、english 書、tv 沙發＋遙控器、games 手把、basketball 球、bike 腳踏車、baseball 球棒、camping 槌子＋繩子），違反 Ken 版「空手比手畫腳」規則。檢查圖 `mime/check/all11.jpg`。等老師決定：接受道具版、只重拍直笛，或全部重拍（會超過 700 上限）。
- 2026-11-14：老師「全部重拍成空手」（上限提高到 1100）。描述改成只寫身體與空手形狀、開頭加 STRICT 空手規則（`mime/make_mime.py` NOPROP）：bike、recorder、games、basketball、camping 第 2 次就空手；english、tv、baseball 第 2 次仍冒出書／沙發／球棒殘影，第 3 次改寫（讀自己手掌、坐地板、雙手合握揮）才成功。**11 段全部空手**，KIE 累計 **1082.4 點**（上限 1100）。直笛版雙手合在嘴前、比較不像直笛，請老師判斷。連播 `mime/shuiling-mime-11-v2.mp4`、檢查圖 `mime/check/all11-final.jpg`。
- 2026-11-14：老師「全部可以」——水鈴版默劇 11 段定案（`mime/final/<act>.mp4`，720p 6 秒，直笛維持雙手合在嘴前版）。KIE 共 1082.4 點。
- 2026-11-14：2D 全部完成（老師「先做 2D」）：51 句配音（爸媽 Aria／Andrew）、開場叮咚＋12 張 Codex 插圖、Your turn 畫面（架構句、verb + s / es、倒數 3-2-1）、Ken 答句字尾 s/es 粉紅底線、結尾 11 個水鈴默劇小格＋問學生倒數 5 秒。全片約 7:07（3D 為占位）。預覽 `renders/sl-2d-preview-v1.mp4`（開場＋第 1 段＋結尾 88 秒）。
- 2026-11-14：老師「2D 可以」。剩 3D 水鈴 11 鏡（依 4A 等 Ken 版 Free Time 定案；或先做水鈴模型檢查）。
- 2026-11-14 晚：水鈴 3D 模型檢查（`src/b3d_check.py`，`style-sample/shuiling-3d-check-v2.jpg`）：外觀正常；坐姿（Mixamo sitting_idle）裙子跟著腿、沒明顯穿模；跑步步伐正常。手掌是張開的（不是握拳），但手指是低面數的尖爪狀，特寫會難看 → 3D 鏡頭不拍手部特寫。Q 版比例手臂短，手要碰到嘴（直笛）、頭（耳機）要逐鏡確認。Colab 約 0.04 單位（第一次等 G4 27 分鐘沒扣）。
- 2026-11-14 晚：3D 開始（老師「開始試渲 11 鏡」）。`src/b3d_act.py`＝Ken 版定案 3D 程式複製＋`CHAR=shuiling`（shuiling_softhand.glb、1.28 m、ALIAS 把水鈴鏡號對到 Ken 版同場景鏡：s01←s03…）。第 1 輪 11 鏡試渲（`style-sample/shuiling-3d-test-v1.jpg`）動作都對；水鈴大頭髮擋臉 → 6 鏡（s01、s02、s03、s06、s07、s10）加 `CAM_OV` 鏡頭較低、右前方，**還沒重渲**：今晚 G4／L4／T4 一直 Service Unavailable，一台 L4 拿到後 exec 卡死（空轉約 0.6 單位）。老師：「明天早上 GPU 比較空時再試」。Colab 今天水鈴部分約 1.3 單位，餘額 89.38。
