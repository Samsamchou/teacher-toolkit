# 世界作息之旅（HWG7 U04 Daily routines）交接

規格卡：`../rdq/RDQ-spec-hwg7-u04-world-routines-20261119.md`（confirmed 2026-11-19）

## 目前進度（2026-11-19）
- [x] 六大數字解謎解析（來源：`../數字解謎/` 8 張書頁）
- [x] 12 張示範解謎卡（0315、1645 × 6 種），每張 4 個畫面：`puzzles/out/<答案>/<關卡>-<類型>-<puzzle|hint1|hint2|answer>.png`
- [x] 10 國作息研究：`research/countries.json`、`research/countries.md`
- [x] Google 文件：https://docs.google.com/document/d/1Svi4tW4_T8TXynCREvJtlQcrr20k_88_vRT4ggHiONs/edit
- [ ] 老師看過解謎卡和文件
- [ ] 日本試玩（解謎 → 動畫 MP4 → Godot 遊戲）
- [ ] 其餘 9 國、部署到 talktofriends-6b58d（部署前先比對線上版本並問老師）

## 怎麼重做解謎卡
- 素材：`puzzles/assets/card_bg.png`、`puzzles/assets/source/*_sheet.png`（Codex CLI 生成，提示詞在同資料夾 `p_*.txt`）
- `python puzzles/src/cut_icons.py`：把兩張貼紙圖切成 20 個去背圖示
- `python puzzles/src/render.py [答案...]`：Playwright 輸出卡片，例如 `python puzzles/src/render.py 0640 1215`
- 版面和六種解謎的畫法都在 `puzzles/src/cards.html`（網址參數 type、ans、stage）
- 電子鐘密碼目前只定義了 0、1、3、4、5、6 的形狀組合（`SEG_PUZ`），手機密碼也是（`KP`）；其他數字要先補上
- Google 文件由 `python docs/build_doc.py` 產生 HTML 後上傳；研究資料改了要重新上傳或在文件裡直接改

## 踩坑
- 貼紙圖的圖示間距很小，切圖要用「預期位置附近找最少墨水的欄」而不是找空白間隔，否則鱷魚和高山會黏在一起、後面全部錯位
- Codex `-s workspace-write` 寫不進 G 槽，要在暫存資料夾生成再複製

## 待老師決定
- 日本那一站問哪個作息：老師原本的例子是 get up 6:40；研究建議 have lunch 12:15（營養午餐學生自己打菜）
- 日本多數公立小學沒有制服（穿便服＋名牌＋randoseru 書包），和「I put on my uniform」的例句不合

## 2026-11-19 下午：第二版規格（`../rdq/RDQ-spec-hwg7-u04-world-routines-v2-20261119.md`，confirmed＋桌上微縮風追加）
- 解謎卡改版：鏡像密碼兩個數字重疊相連；背景換大版面（`puzzles/assets/card_bg.png`，舊版在 `assets/source/card_bg_v1.png`）；`cards.html` 已補齊 0–9 的電子鐘與手機密碼。
- 站別資料（單一來源）：`monster-in-my-mind-site/functions/routines-content.json`（10 站：問句、密碼、全英文答句、拖放／口說、解謎類型、遊戲）。拖放站：Taiwan、UK、Kenya、Singapore；其餘口說。
- 雲端函式（已寫好、測試 41 項通過、**未部署**）：`functions/routines-core.mjs`（時間口說判讀、拖放驗證）、`functions/routines.mjs`（進度、口說評測 85 分＋時間正確、每天 30 次、保存通過與前一次錄音、老師後台動作、到期清除），`index.mjs` 新增 `routinesState`、`routinesAnswer`、`scoreRoutineSpeaking`、`routinesGameDone`、`purgeExpiredRoutines`；`portal.mjs` 加 `teacherExtra`。
- 學生頁（React）：`monster-in-my-mind-site/app/routines/`（RoutinesApp.tsx、content.ts、routines.css），路徑 `/world-routines`，首頁多一格。本機示範用的假資料加在 `scripts/local-preview.ts`。**還沒跑過 typecheck／lint／瀏覽器測試**；老師後台畫面還沒做。
- 靜態素材：`python publish_to_site.py` 會把解謎卡頁、地圖、人物、語音、字型、影片、Godot 匯出複製到 site 的 `public/world-routines/`。
- 語音：`web/make_audio.py`（edge-tts；問句 Jenny、女生 Ana、男生 Christopher +50Hz、都 -12%），46 個 mp3，還沒人耳聽過。
- 2D 美術（Codex）：`web/art/`（世界地圖、10 國學生、交通工具、主角、護照）。老師 11/19 決定人物、地圖、情境動畫改桌上微縮立體風（Tripo＋Blender／Colab），這批 2D 圖先當暫時版面。
- 桌上微縮參考圖（Codex，沿用感恩節課堂版的人偶描述）：`tabletop/refs/`（日本男生、午餐值日版、日本女生、主角男／女、餐車、午餐托盤、課桌椅），總表 `japan_refs.jpg`。**還沒送 Tripo**，要先讓老師看圖並確認點數（上次帳本 11/07 只剩 140 點，之後的餘額沒查）。
- Godot 接便當（日本）：`games/bento-catch/`（先讀它的 HANDOFF.md）。桌機瀏覽器測過，真 iPad 沒測；匯出約 41 MB（wasm 39.5 MB）。
- 站台建置副本：G 槽的 node_modules 不完整，要在 C 槽暫存副本 `npm ci` 後建置（複製 public 很慢，裡面有感恩卡影片）。

## 2026-11-19 傍晚：日本這批 Tripo 模型＋學生頁本機走查

- **Tripo（老師同意 390 點）**：送件前餘額 570、做完剩 **180**（帳本 `tabletop/tripo-ledger.json`）。6 個 GLB 在 `tabletop/models/`：
  `japan_boy`、`japan_boy_lunch`（白色給食服）、`traveler_girl`（主角，老師沒指定男女，先做女生；男生參考圖 `refs/traveler_boy.png` 還在）、`lunch_cart`、`lunch_tray`、`school_desk`。
  三個人物都是 65 根骨頭（Mixamo），`python tabletop/check_glb.py` 檢查過雙手手指都有權重（張開、沒握拳）。總覽圖 `tabletop/models/_tripo_japan_batch.jpg`。
- **Tripo 下載踩坑**：道具（沒骨架）匯出時 Chrome 只留下 `<uuid>.tmp`、不會改名成 `tripo_convert_*.glb`，但檔案是完整的 → 用 `python tabletop/grab_glb.py <名稱>`（會認 `.tmp` 裡的完整 GLB）。匯出視窗在人物頁和道具頁的按鈕位置不同，每次先截圖再點。Tripo 帳號裡已經有玩具飛機、船、火車的舊模型，世界地圖可以直接用。
- **學生頁本機走查**：`python web/qa_walk.py <輸出資料夾>`（先在 C 槽建置副本跑 `npx vite --config vite.firebase.config.ts --mode preview`，port 3001）。台灣（拖放＋密碼，含答錯提示、真的拖曳）和日本（錄音→評分→時鐘→動畫→遊戲→蓋章）29 張截圖全過、0 個錯誤；typecheck、lint 乾淨，函式測試 41 項全過。本機示範的口說固定 90 分，**真正的 AI 評分要部署後才測得到**。
- 走查修掉的 3 個問題：① 還沒做的遊戲會把首頁塞進遊戲框（站台對不存在的檔案回首頁）→ 改檢查 `index.js`；② 解謎卡在網頁裡被裁切 → `cards.html` 加 `fitCard()` 自動縮放；③ 提示按鈕被擠到畫面外 → 卡片高度上限。
- C 槽建置副本用 `scratchpad/sync_site.sh` 同步（暫存資料夾，重開機可能消失；消失就重建：複製 app／functions／public／scripts／設定檔 → `npm ci`）。
- **下一步**：Blender（Colab）用這 6 個模型做日本學生頭像、午餐情境動畫（12:15）、桌上世界地圖 → 先報 Colab 單位；老師後台的作息之旅畫面還沒做；46 個語音檔還沒人聽過；預覽部署要先問老師。

## 2026-11-19 下午：日本午餐情境檢查圖（桌上微縮，Colab）

- 場景程式 `tabletop/src/japan_lunch.py`（共用感恩節的 `engine.py`，直接從 `2026 Thanksgiving/classroom-tabletop/src/` 上傳，不另存副本）：桌上的迷你日本教室（黑板、12:15 掛鐘、櫻花窗、6 張課桌椅）。四個鏡頭 L1 推餐車進教室／L2 盛飯／L3 いただきます／L4 吃飯特寫，目前都是**靜止姿勢**（每鏡 1 格），還沒做動作。
- 檢查圖：`tabletop/checks/japan_lunch_check_v1.jpg`＋四張 1080p `japan_lunch_L1–L4.png`。等老師看過再做動作和整段渲染。
- 一鍵渲染：`python tabletop/src/colab_run.py <test|light|final> japan_lunch "L1 0" "L3 0" …` → `tabletop/qa/<時間>/`；`python tabletop/src/sheet4.py <那個資料夾>` 出總表。用自己的工作階段 `wrt`（**不要動 `v9`，那是科幻雙老師影片 9 的**）。用量記在 `tabletop/colab_usage.log`：今天三批共約 0.7 單位（帳面含別的工作階段，只能當上限）。
- **踩坑**：① G4 回 Service Unavailable → 改開 L4（1080p 64 樣本約 10.5 秒/格）。② `colab exec` 跑安裝或渲染會卡死（兩次各空等 10 分鐘）→ 改成短 exec 啟動分離工作＋每 40 秒短 exec 輪詢（`detached()`）。③ 頭的 twist 是（側傾, 左右轉, 點頭）：點頭用第三個數、負的是低頭；左右轉用第二個數。④ 課桌椅模型用往下打光線找「椅面高度、桌面高度」（`probe_desk()`），不要用猜的；Q 版人物軀幹短，課桌椅要縮到身高的 0.48 倍，不然桌面會到胸口。⑤ 坐著的人 `GND` 會顯示負值（根部降到椅面以下），是正常的。
- 還沒處理：日本男生的模型背著書包，吃飯時也背著；L3 男生合掌的手被碗擋到一部分；整體比感恩節那支亮（白天教室），還沒做檯燈暖光版本。

## 2026-11-19 傍晚：日本午餐情境動畫 v1（20 秒）✅ 11/19 老師定案

- 成品：`tabletop/out/japan_lunch.mp4`（1080p，6.2 MB）；網站用 720p `web/video/japan.mp4`（1.7 MB，已用 `publish_to_site.py` 複製到 `monster-in-my-mind-site/public/world-routines/video/`，**還沒部署**）。
- 四鏡：L1 主角問 What time do you have lunch? → 男生指 12:15 掛鐘答 I have lunch at twelve fifteen.（5.6 秒）／L2 男生穿給食服盛湯、主角端托盤 I serve lunch to my classmates.（3.8 秒）／L3 合掌鞠躬「いただきます」字幕 Itadakimasu!（3.0 秒）／L4 兩人輪流用筷子吃 I eat lunch in my classroom. I eat rice, fish and miso soup.（7.6 秒）。故事只有一個日本男生：L2 的白衣值日生就是他（`japan_boy_lunch` 模型），兩個模型不會同框。
- 一鍵重做：`python tabletop/src/japan_voice.py`（配音＋字時間 → `tabletop/audio/`）→ `python tabletop/src/colab_run.py final japan_lunch "L1 all" "L2 all"`（再一批 L3、L4）→ `python tabletop/src/japan_compose.py <qa 批次1> <qa 批次2>`。改一鏡只要重渲那一鏡，合成時給新舊兩個 qa 資料夾即可。
- 配樂（老師 11/19 要求「很小聲」）：沿用感恩節開場片 `opening-video/music/holiday/s7` 純音樂（複製成 `tabletop/audio/music_holiday.wav`），人聲 −16 LUFS、配樂約 −33 LUFS，淡入 0.6 秒、淡出 1.2 秒。
- 字幕：Comic Relief 82 px 卡拉 OK、底邊 174 px（往上 56 px 規則），twelve fifteen 紅字；L1 人物站得低，字幕改放黑板下緣（`top=True`，MarginV 240，不擋掛鐘）。左上角固定「Japan 12:15」。
- Colab 用量（`tabletop/colab_usage.log`）：今天共約 4.3 單位（檢查圖、兩輪動作試渲、正式 1.29＋1.95）。G4 開不起來，都用 L4；正式 1080p 64 樣本約 10–11 秒/格。
- **踩坑**：① 合成時一次做「混音＋燒字幕＋寫進雲端硬碟」的 ffmpeg 卡 8 分鐘 → 拆成三步、在本機暫存資料夾做、最後才複製，整支 19 秒。② libass 的 fontsdir 用絕對路徑在 Git Bash 會被改寫壞 → 把字型複製到工作資料夾用相對路徑 `fontsdir=fonts`。③ 兩句字幕時間重疊 0.05 秒，第二句會被推高一行 → 前一句一定要在下一句開始前結束。④ loudnorm 的 TP 不能低於 −9。⑤ Colab 短指令偶爾逾時 → `short()` 自動重試 3 次。
- 網站本機走查（`web/qa_walk.py`）：影片自動播、播完才能按 Play the game，台灣站沒影片時顯示「製作中」，29 張截圖 0 個錯誤。
- 還沒處理：男生吃飯時背著書包（模型做在身上）；聽力版沒做（這支放網站，學生先看過句子）。

## 2026-11-19 晚：老師後台「作息之旅紀錄」頁

- 網址 `/world-routines/teacher`（程式 `monster-in-my-mind-site/app/routines/RoutinesTeacher.tsx`），和原本教師後台共用六碼通行碼與登入（2 小時）；原本 `/teacher` 頁上方加了入口連結。
- 功能：選 501／502／601／602 → 全班表格（每列一個學號，10 站：拖放站 ✓、口說站顯示通過那次的分數，★＝遊戲星數＝已蓋章；護照章數、最後更新時間）→ 點口說站格子看「通過前一次」和「通過那次」的 AI 聽寫、四項分數、時間對不對，並播放錄音 → 「下載 CSV」（Excel 可直接開，含每站分數與星數）。
- 後端只改一處：`routines` 回傳多帶 `gameScore`。本機預覽的假資料：每班 3 個示範學號＋目前登入的學生；錄音是半秒嗶聲（`scripts/local-preview.ts`）。
- 驗證：typecheck、lint 乾淨，函式測試 41 項全過；`python web/qa_teacher.py <資料夾>`（學生先做完兩站 → 老師登入 → 601 班 → 點 Japan 口說格 → 播放 → 下載 CSV → iPad 寬度）全通過；學生端 `web/qa_walk.py` 也重跑 0 錯誤。截圖 `web/qa/teacher_*.png`。
- 踩坑：本機預覽的學生假函式原本用 `action.startsWith('routines')`，把老師的 `routines` 查詢也攔走（回 Invalid station）→ 改成只攔四個學生用的名稱。
- 還沒做：真正的 Firestore 查詢要部署後才測得到（`routines_progress` 用 `classId` 篩選，若 Firestore 要求索引會在第一次查詢時報錯並附建立連結）。

## 2026-11-19 晚：部署前比對（進行到一半，老師關機暫停；**什麼都還沒部署**）

- 老師說「先比對再部署」。比對到一半老師要關機，這段是重開機後接續用的。
- **雲端函式**：線上全部函式 2026-10-30 更新（不是 11/19）。用 `gcloud functions describe monsterPortal --region asia-east1` 找到原始碼 `gs://gcf-v2-sources-526424801342-asia-east1/monsterPortal/function-source.zip#1790262530183081`，下載後逐檔比對（`diff --strip-trailing-cr`）：除了作息之旅新增的 routines 三個檔與 index.mjs／portal.mjs／package.json 的對應修改外，**只有 core.mjs 第 36 行不同**——本機是 10/06 的「Invalid monster option: key=value」細化錯誤訊息，線上 10/30 版是舊的一般訊息（只差錯誤文字）。
- **網站**：線上最後一次是 2026-11-17 01:43Z（version b88cf37d74d6faa2，1080 檔，感恩卡），JS／CSS 為 `/assets/index-DcduNett.js`、`index-QzlBVn7J.css`。檔名清單和本機 public 完全一致（只多 Firebase 保留的 `/__/firebase/*`）；本機只多 `world-routines/` 98 檔。內容雜湊：Hosting 的 hash＝gzip（level 7 或 8，header 第 9 byte＝2、第 10 byte＝10）的 sha256；744 檔相同，331 檔（大多是較大的 mp3）一次壓縮算不出相同值，正在試「每 64 KiB 分段壓縮」的算法時暫停。
- **接續步驟**：① 把那 331 檔比對完（或改用下載線上檔案直接比對幾個樣本）。② 在 C 槽建置副本拿掉作息之旅改動後 build，確認 JS 檔名＝`index-DcduNett.js`（證明線上程式＝本機舊版）。③ 向老師報比對結果與部署範圍：hosting 預覽頻道＋函式只部署 `monsterPortal, routinesState, routinesAnswer, scoreRoutineSpeaking, routinesGameDone, purgeExpiredRoutines`（其他函式不動）。④ **待查風險**：App Check 用 reCAPTCHA Enterprise，預覽頻道網域（`talktofriends-6b58d--<頻道>-xxxx.web.app`）可能不在金鑰允許網域內，學生頁呼叫函式會被擋；先用 `gcloud recaptcha keys list` 查允許網域。⑤ 建置要用到根目錄 `.env.local`、函式要 `functions/.env.talktofriends-6b58d`：只複製、不讀內容。

## 2026-11-19 夜：部署前比對完成（**仍未部署**，等老師選部署方式）

- 網站：線上 1075 個檔案全部和本機相同（744 個用 Hosting 檢查值、331 個直接下載逐位元組比對；腳本 `scratchpad/cmp_live.py` 的做法：hash＝gzip level 7/8、header byte 8=2、9=10 的 sha256，算不出來的就下載比）。拿掉作息之旅改動後重建（`scratchpad/make_base.py`），`index-DcduNett.js`、`index-QzlBVn7J.css`、`index.html` 和線上逐位元組相同。注意：重建時 `app/data/pending-audio.json` 要用原本的（`[]`）；在沒有 public/audio 的資料夾跑 prepare-data 會把清單變成全部、JS 檔名就不同。
- 函式：線上（10/30）和本機只差 core.mjs 第 36 行的錯誤訊息文字＋作息之旅新增內容。
- **預覽頻道行不通**（已查證）：① reCAPTCHA Enterprise 金鑰只允許 `talktofriends-6b58d.web.app` 和 `.firebaseapp.com` → 預覽網域上學生頁的 App Check 會被擋；② `portal.mjs` 第 185 行要求 Origin 完全等於正式網域 → 預覽網域上老師後台會回「來源不符」。函式本來就沒有預覽版。
- 建議做法：直接部署到正式站，但**先把首頁的 World Routines Trip 那一格藏起來**，只有知道網址 `/world-routines` 的人進得去；老師試玩通過後再把那一格打開。

## 2026-11-19 夜：已部署到正式站（首頁入口先藏起來）

- 老師同意「藏入口部署」。`app/ClassActivities.tsx` 加 `SHOW_ROUTINES_TILE = false`：首頁不顯示 World Routines Trip 那一格；**老師試玩通過後改成 true、重新 build、只部署 hosting**。
- 部署（C 槽建置副本，`--account u9431818@gmail.com`）：`firebase deploy --only "hosting,functions:monsterPortal,functions:routinesState,functions:routinesAnswer,functions:scoreRoutineSpeaking,functions:routinesGameDone,functions:purgeExpiredRoutines"`。5 個新函式建立、monsterPortal 更新成功；但指令最後因「asia-east1 沒有映像清理政策」報錯（10 月就有的舊問題），**hosting 的發布被中斷** → 再跑一次 `--only hosting` 才真的上線。以後函式和 hosting 分兩個指令部署。
- 上線版本：`assets/index-DgFaOuUJ.js`、`index-ZsxvYDdi.css`，1175 檔。學生頁 https://talktofriends-6b58d.web.app/world-routines ，老師後台 /world-routines/teacher（/teacher 頁上方也有連結）。
- 正式站實測（內建瀏覽器，測試學號 **60199**）：首頁只有 festivals 一格 ✓；登入→世界地圖 ✓（App Check、joinStudent、routinesState）；台灣站解謎卡→拖放＋0645→時鐘與句子 ✓（routinesAnswer）；影片、遊戲 wasm、感恩卡頁面都回 200 ✓。Playwright 無頭瀏覽器會被 reCAPTCHA 擋（401），不能用來測正式站（`web/qa_live.py` 只能驗首頁）。
- **還沒驗證**：真正的 AI 口說評分（要真麥克風）、老師後台讀真實資料（要老師的通行碼）、真 iPad。測試學號 60199 在 601 班留了一筆台灣站紀錄（7 個月後自動清除）。
- 沒處理：Artifact Registry 清理政策（`firebase functions:artifacts:setpolicy`，要老師同意）；全部還沒 commit。

## 2026-11-19 夜：開場配樂、3D 主角、先聽問句（規格卡 `../rdq/RDQ-spec-world-routines-opening-3d-20261119.md`，confirmed）—已上正式站，首頁入口仍藏著

- **配樂**：`web/music/opening.mp3`＝感恩節開場片 voyage/s23 純音樂（−20 LUFS）。登入畫面第一次點擊開始播、進地圖 1.5 秒淡出；播英文語音時壓到 0.12；右上角 Music 開關記在 localStorage `wr-muted`。程式在 `RoutinesApp.tsx` 的 `music` 物件與 `play()`。
- **主角**：登入時選 Girl／Boy（localStorage `wr-hero`，換裝置要重選）。見面畫面主角在左發問、當地學生在右；地圖上 3D 小人偶站在「最後完成的那一站」（還沒開始就在台灣），出發時換成「主角騎在玩具飛機／船／火車上」的圖。
- **先聽問句**：`heard` 狀態；語音播完「Open the puzzle」才能按；按鈕放大跳動＋「← 先聽問句 Listen first」。音檔載入失敗也會解鎖（不會卡死）。
- **3D 圖**：`tabletop/src/portraits.py`（透明背景）→ `python tabletop/src/colab_run.py final portraits "hero_girl 0" "char_japan 0" "ride_boy_ship 0" …` → 裁邊縮圖存 `web/art3d/`（hero_<girl|boy>.png、_map、_plane／_ship／_train、char_japan.png）→ `publish_to_site.py`。新增一國的 3D 學生：模型放 `tabletop/models/`、在 portraits.py 的 `CHARS` 加一行、渲 `char_<id>`、把 id 加進 `app/routines/content.ts` 的 `CHAR_3D`。
- **Tripo**：男生主角 75 點（餘額 180 → **105**）；玩具飛機、船、火車是帳號裡現成模型，匯出 0 點。**台灣女學生還沒送**：參考圖 `tabletop/refs/taiwan_girl.png` 已傳給老師，等老師說可以才花 75 點；目前台灣站當地學生仍是 2D。
- **驗證**：typecheck／lint 乾淨、函式測試 41 項、`web/qa_walk.py`（選男生、驗證按鈕一開始鎖住、聽完才開）30 張截圖 0 錯誤，總表 `web/qa/opening_3d_walk.jpg`。正式站 `assets/index-DzuGIafz.js`，music／art3d 檔案回 200。**配樂實際聽感、淡出、壓低都沒有人耳聽過**（自動測試聽不到聲音）。
- 踩坑：跳動的按鈕 Playwright 會判定「not stable」點不下去 → 測試用 `force=True`；騎乘圖舉近鏡頭那隻手會擋臉 → 改舉遠側的手。

## 2026-11-19 深夜：台灣站當地學生換成 3D（二水國小制服）—已上正式站

- 老師指定：照校慶圖的制服，**黃色上衣、綠色袖子和領口、胸前紅藍「2」校徽、綠色短褲加黃條紋**；不背書包。參考圖用 `codex exec -i <校慶圖>` 生成（`tabletop/refs/taiwan_girl.png`、`taiwan_boy.png`、並排圖 `taiwan_pair.jpg`；舊版 `_v1_blue`、`_v2_green` 留著備查）。
- 老師決定：先做女學生；台灣站固定出現女學生（2C），**男學生留到 he/she 版**（參考圖已有，還沒建模，要 75 點）。
- Tripo：taiwan_girl 75 點，**餘額 30**（不夠再做任何人物，其他國家要先加購）。`tabletop/models/taiwan_girl.glb` 65 根骨頭、雙手正常。
- 渲染 `char_taiwan`（Colab 約 0.2 單位）→ `web/art3d/char_taiwan.png`；`content.ts` 的 `CHAR_3D` 加回 taiwan。走查 0 錯誤，截圖 `web/qa/taiwan_meet_3d.png`。已部署 hosting（入口仍藏）。
- 小瑕疵：3D 圖的黃色上衣在目前燈光下偏淡（像奶油色），老師若在意可調燈光重渲。

## 2026-11-19 晚：遊戲長度＋每站分鐘數（規格卡 ../rdq/RDQ-spec-world-routines-game-length-20261119.md，confirmed）

已完成（本機，**未部署、未 commit**）：
- 接便當：長度改讀 `games/rules.json`（60 秒＋4 個時鐘回合，約 1 分 40 秒）、Finish 按鈕、星星門檻 550／1250、
  時鐘回合含前面走過的站（日本站會出台灣的 6:45）。細節見 `games/bento-catch/HANDOFF.md` 最後一段。
- 每站分鐘數：學生頁在進站時記 `localStorage wr-start-<站>`，蓋章時把分鐘數（小數 1 位）隨 `routinesGameDone` 送出；
  `functions/routines.mjs` 存第一次的 `minutes`（0–600），老師後台格子顯示「· 6分」，CSV 多 10 欄「<國> 分鐘」。
- 本機走查：學生頁 30 步 0 錯誤；老師後台有分鐘數（4 個 401 是登入前的工作階段檢查）；函式測試 41 項通過（沒有另外替 minutes 寫測試）。
- 校車衝刺（台灣站遊戲）玩法說明圖：`games/bus-dash-design/bus_dash_mock.png`，**等老師確認後才開始做**。
  玩法：三條車道橫向跑酷，手指上下拖換車道，撿早餐、閃水窪／三角錐／狗；每 10 秒一次時鐘回合，三個時鐘拱門各佔一道，跑過正確的那個；
  沿用 `rules.json` 和 Finish 按鈕；最後追上校車。

下一步：老師確認說明圖 → 做校車衝刺 → 本機走查 → 報告部署範圍（網站＋雲端函式 routinesGameDone／monsterPortal 都要重新部署）→ 老師同意才部署。
Tripo：老師 11/19 說已儲值（分批），新餘額還沒讀，下一批人物前先到 Tripo 頁面讀餘額、更新 `tabletop/tripo-ledger.json`。

## 2026-11-19 深夜：校車衝刺做完（本機，未部署、未 commit）

- 老師看過說明圖後說「照這張做」。新專案 `games/bus-dash/`（讀它的 HANDOFF.md），網頁版已複製到網站 `public/world-routines/games/bus-dash/`。
- 學生頁的遊戲網址多帶 `&hero=<girl|boy>`（`RoutinesApp.tsx`），校車衝刺會換成學生選的主角；接便當不理會這個參數。
- `web/qa_walk.py` 的台灣站改成真的開遊戲再蓋章；本機走查 30 步 0 錯誤。台灣站不再顯示「製作中」。
- 待部署的範圍：網站（學生頁、老師後台、接便當新版、校車衝刺）＋雲端函式（`routinesGameDone` 收分鐘數、`monsterPortal` 回傳分鐘數）。
  部署前照規矩先比對線上版本，老師當次同意才部署；函式和網站分兩個指令。

## 2026-11-19 收工前：老師退件與明天待辦

- **老師退件（校車衝刺）：主角衝刺時沒有跑步的動作。** 原因：`girl_run_a/b`、`boy_run_a/b` 兩張圖幾乎一樣，只靠上下彈跳。
  明天先修（重生一組腿部明顯交替的跑步循環圖，或加程式擺動），修完給老師看再談部署。
- 老師 11/19 說「先不部署」：新版接便當、校車衝刺、後台分鐘數都只在本機。
- 明天可接的工作（等老師排順序）：①修跑步動作 ②比對線上後部署 ③台灣早餐情境動畫（接著其他 8 國）
  ④另外兩款遊戲 clock-ninja（英、西）、luggage-belt（新、澳）＋接便當換皮（印、埃）＋校車衝刺換皮（美、肯）
  ⑤其他 8 國 3D 當地學生（Tripo 每人 75 點，先讀餘額）⑥3D 桌上世界地圖底圖 ⑦10 站全過的完成畫面 ⑧he/she 版
  ⑨老師實測（AI 口說、後台真資料、iPad、配樂）後打開首頁入口 ⑩commit。
- 明天的順序已定（1A、2A、3A＋建議全採納），規格卡 `../rdq/RDQ-spec-world-routines-run-anim-next-20261119.md`（draft，開工時請老師確認後照做）。

## 2026-11-20 上午

- 規格卡 `../rdq/RDQ-spec-world-routines-run-anim-next-20261119.md` 老師確認「照這份開始」。
- 校車衝刺跑步動作重做完成（6 格循環＋揚塵＋速度線，老師看過檢查圖同意），見 `games/bus-dash/HANDOFF.md`。本機預覽等老師試玩。
- Tripo 餘額 1,030（老師儲值 1,000，已記帳本）。
- 台灣早餐店動畫分鏡：`tabletop/taiwan_breakfast_storyboard.md`（老師選早餐店場景；等老師確認分鏡與 165 點道具）。
- 美國站前置（校車衝刺美國版、當地學生參考圖、動畫分鏡草稿）交給背景 subagent 做，不花錢、不部署、不動網站資料夾。

## 2026-11-20 上午：台灣早餐店動畫（進行中）

- 老師確認分鏡（`tabletop/taiwan_breakfast_storyboard.md`）與 165 點道具，並看過參考圖（`tabletop/refs/taiwan_props.jpg`）同意建模。
- Tripo：三件都送出，餘額 1030 → **865**（帳本已記）。`breakfast_tray.glb`、`breakfast_table.glb` 已下載到 `tabletop/models/`；
  **`breakfast_shop` 在 Tripo 卡在 Generating 超過 35 分鐘**（工作網址結尾 0e07f31a-ec13-403b-b5e6-b4b57ec1b2c4），已問老師要再等還是花 55 點重生。
- 場景程式 `tabletop/src/taiwan_breakfast.py`（鏡頭 B1–B4；缺攤位模型時會用假數字，方便先檢查 B3、B4）。
  豆漿杯、吸管、筷子、時鐘、蒸氣用程式做。B3、B4 檢查圖已調好：`tabletop/qa/taiwan_check_B3_B4.jpg`。B1、B2 還沒出過圖（等攤位）。
- 配音 `tabletop/src/taiwan_voice.py` → `tabletop/audio/taiwan_*.mp3`（6 句）；合成 `tabletop/src/taiwan_compose.py`（由 japan_compose 改寫，還沒跑過）。
  和分鏡不同：B2 加了旁白「I get my breakfast at the breakfast shop.」；B4 改成兩句、長度 8.2 秒；B3 沒有做「放下托盤再坐下」的過程，直接是坐好揮手。
- 美國站前置（subagent）：校車衝刺美國版、`tabletop/refs/usa_girl.png`／`usa_boy.png`、`tabletop/usa_school_storyboard.md`，見 `games/bus-dash/HANDOFF.md`。
  subagent 重新匯出了 `games/bus-dash/web/`（含美國版），**還沒複製到網站 public**。網站美國站答句配音目前是女生聲音，已問老師當地學生用女生或男生。

- 老師 11/20 決定：美國站當地學生用**女生**（`tabletop/refs/usa_girl.png`），和網站現有女聲配音一致。分鏡草稿若寫男學生要改成女學生。3D 模型 75 點還沒送，等老師同意。

## 2026-11-20 中午

- **台灣早餐店動畫全片 v1 完成，等老師看**：`tabletop/out/taiwan_breakfast.mp4`（1080p，20.6 秒）、`web/video/taiwan.mp4`（720p）、抽格 `tabletop/out/taiwan_breakfast_frames.jpg`。
  正式渲染兩批：`tabletop/qa/1120-094812`（B1、B2）、`tabletop/qa/1120-101410`（B3、B4）；重新合成：`python tabletop/src/taiwan_compose.py tabletop/qa/1120-094812 tabletop/qa/1120-101410`。
  B4 字幕放在頭頂上方的牆面（底部會蓋住食物）。Colab 今天共約 2.2 單位。
- Tripo：攤位第一次卡住的那筆約一小時後自動取消並退 55 點；重生成功。美國女學生 `tabletop/models/usa_girl.glb`（75 點，65 根骨頭、雙手手指正常）。**餘額 790**。
  踩坑：Chrome 會在事後把早先的 `.tmp` 改名成 `tripo_convert_*.glb`，`grab_glb.py` 會把它當成新檔抓錯——抓完要看檔案大小／三角面數，不對就從 Downloads 挑最新的那個。
- subagent 成果（都等老師決定，未花錢）：`games/clock-ninja-design/`（時鐘忍者設計稿＋示意圖）、`games/luggage-belt-design/`（行李轉盤）、
  英國站 `tabletop/refs/uk_boy.png`／`uk_girl.png`／`uk_pair.jpg`、`tabletop/uk_storyboard.md`（估 185 點）。
- 還沒做：美國女學生的網站用 3D 圖（`portraits.py` 的 CHARS 加 usa）、台灣動畫定案後複製到網站 public、校車衝刺含美國版的匯出同步到網站。

## 2026-11-20 下午：B4 拿筷子重做（規格卡 ../rdq/RDQ-spec-world-routines-taiwan-b4-chopsticks-20261120.md，confirmed）

- 參考圖 `tabletop/refs/chopsticks_reference.png`（Codex 4 格，已給老師）。
- `src/taiwan_breakfast.py` B4 改寫：手臂兩段 IK（`ik_arm`）、手掌定向（`orient_hand`）、手指逐節彎（`curl`，G_CHOP／G_CUP／G_RELAX）、
  筷子綁在手上（下支：虎口→無名指；上支繞握點開合）、捲狀蛋餅小段、左手握杯、托盤附的筷子用 bmesh 刪掉（`drop_tray_sticks`，刪 1778 面）。
  檢查用鏡頭：`B4C`（近景）、`B4S`（右側），正式鏡頭 `B4`（靜止 3/4，有時鐘）。檢查總表 `tabletop/qa/taiwan_B4_check.jpg`。
- **踩坑（Q 版比例）**：她的手臂只有 14 mm、頭很大、嘴巴在肩膀前 15 mm、桌面在胸口高度——照真實比例擺，手根本碰不到盤子和嘴。
  解法：托盤往她那邊挪 10 mm（TRAY_DY，B3 也要一起用）、她坐在凳子前緣（SEAT_DY 3 mm）、杯子挪近、筷子從她右側接近水平送到嘴邊（不是從正前方）。
  `mouth()` 改為頭骨前 8.2 mm（原 13.5 mm 會浮在嘴唇前）。相機太近會切進頭裡（變黑），近景要用長焦距從遠處拍。
- 因為托盤和杯子位置變了，**B3 要重渲才接得上**（約 0.3 單位）；B1、B2 不變。等老師看檢查圖。
- 時鐘忍者 `games/clock-ninja/`、行李轉盤 `games/luggage-belt/` 已由 subagent 做完並測過（讀各自 HANDOFF.md），都還沒複製到網站。

- 11/20 部署前比對完成（scratchpad live_list.py＋cmp_live2.py，線上 1190 檔全部一致、無他人修改）。老師決定：**等台灣動畫定案後一起部署**（網站＋routinesGameDone／monsterPortal，分兩個指令；部署前移除 .gdignore、確認 taiwan.mp4 是定案版）。注意 publish_to_site.py 已把 v1 的 taiwan.mp4 複製進 public。

- 11/20 傍晚：B3、B4 正式重渲（qa/1120-140006，0.98 單位）；全片 v2 合成：`python tabletop/src/taiwan_compose.py tabletop/qa/1120-094812/ tabletop/qa/1120-140006/` → `tabletop/out/taiwan_breakfast.mp4`（另存 _v2）、`web/video/taiwan.mp4`。B4 字幕改放下方（距底 96 px，`top=-96`），因為新鏡頭她的頭在中上、時鐘在左上。等老師看 v2。

- 11/20 傍晚 subagent 完成（都只在本機）：接便當埃及／印度版（games/bento-catch，見其 HANDOFF 11/20 段）、校車衝刺肯亞版（games/bus-dash）、五站學生參考圖＋分鏡（tabletop/refs/<國>_pair.jpg、five_pairs.jpg、tabletop/<國>_storyboard.md、five_stations_summary.md，五站全做 925 點／省點 705 點，餘額 605）。部署時要重跑 publish_to_site.py 把新的 web/ 帶進網站。

- 11/20 晚：老師退件 v2「右手拿筷子、左手拿杯子的手勢都是反的」。原因：PALM_SIGN 用猜的，左右都反（Mixamo 骨架 fwd×(小指→食指) 在右手指向手背、左手指向手心 → PALM_R=-1、PALM_L=+1）。
  同時修：咬的時候她會低頭（BOW -16），mouth() 改成跟著頭轉的偏移；筷子從她右下方斜上送到嘴（D_MOUTH 0.9,-0.15,0.45），手停在下巴旁不擋臉；握杯改側握（手心貼杯子左側、四指繞到前面、拇指在後）；喝的時候杯子在下巴下方。
  新增清楚的手部檢查鏡頭（不開景深、190mm）：B4HP／B4HP2（盤子）、B4HM／B4HM2（嘴）、B4HL／B4HL2（握杯）、B4HS（喝）。檢查總表 `tabletop/qa/taiwan_B4_hands_check.jpg`。等老師看過才重渲 B4（B3 不用重渲）。

## 2026-11-20 關機前：下次開機要做的

1. **重渲台灣 B4**（老師已說要做）：`python tabletop/src/colab_run.py final taiwan_breakfast "B4 all"`（約 0.7 單位）→
   `python tabletop/src/taiwan_compose.py tabletop/qa/1120-094812/ tabletop/qa/1120-140006/ tabletop/qa/<新的B4資料夾>/`
   （後面的資料夾會蓋掉前面同名鏡頭；B1/B2 用 094812、B3 用 140006）→ 抽格檢查手部 → 傳 v3 給老師。
2. 老師說 v3 定案後：重跑 `publish_to_site.py`、刪 public 裡的 `.gdignore`、本機走查（4 款遊戲＋台灣影片）、比對線上、網站與雲端函式分兩個指令部署（首頁入口仍藏著）。
3. 可以分工的（不花錢）：英國動畫場景程式（沿用 taiwan_breakfast.py 修好的手部函式，PALM_R=-1／PALM_L=+1）、
   各站製作手冊已完成 `STATION_MANUAL.md`、完成畫面設計 `web/finish-design/`、西班牙前置 `tabletop/spain_storyboard.md`。
4. 等老師決定：五站＋西班牙的點數（餘額 605，六站全做約 1,110 點）、各遊戲 subagent 留的小問題、完成畫面 6 個問題。

- 11/20 晚：B4 正式重渲完成（tabletop/qa/1120-174646，0.62 單位）；台灣片 v3 合成：`python tabletop/src/taiwan_compose.py tabletop/qa/1120-094812/ tabletop/qa/1120-140006/ tabletop/qa/1120-174646/` → `tabletop/out/taiwan_breakfast_v3.mp4`、`web/video/taiwan.mp4`。等老師定案。

- ✅ 11/20 老師：台灣早餐店動畫 **v3 定案**（`tabletop/out/taiwan_breakfast_v3.mp4`，網站用 `web/video/taiwan.mp4`），指示和 5 項遊戲修改一起放進網站，先比對線上版本再部署。

## 2026-11-20 晚（續）：共用手部檔、英國椅子、六站分鏡審查

- **共用手部檔** `tabletop/src/hands.py`：台灣 B4 修好的手部函式整段搬過去（未改內容），`colab_run.py` 會一起上傳；`taiwan_breakfast.py`、`uk_homework.py` 都改成 `from hands import *`。驗證：台灣 B4 第 24 格重渲（qa/1120-182633）和 v3 定案版（qa/1120-174646）逐像素最大差 1、DESK 記錄行完全一樣。改動前的備份在 `%TEMP%/wrt_patch/*_prehands.py`（暫存）。
- **英國片椅子**：桌椅是同一塊 Tripo 模型、椅子塞在桌下，男孩坐到椅背後面。`uk_homework.py` 新增 `pull_chair()`：依座標把椅子切出來往他那側拉 13.2 mm（臀部剛好在座面中央，WARN 消失）。檢查圖 qa/1120-183251（K1、K2、K3、K3H，light，0.16 單位），總表 `tabletop/qa/uk_chair_check.jpg`，已交老師看；老師說可以才跑英國正式渲染。
- **第 5～10 站分鏡審查**：`tabletop/storyboards_5-10_review.md`＋`storyboards_5-10_pupils.jpg`（subagent 整理，原草稿未改），共 17 題，已交老師；回答後才建模（Tripo 餘額 1,605，全照建議 1,110 點）。
- 部署：等遊戲修正 subagent 回報（OPEN_QUESTIONS 5 項已標完成）後照五步驟進行。

## ✅ 2026-11-20 晚 部署完成（老師授權：v3 定案＋5 項遊戲修改一起上，先比對再部署）

- 部署前：`publish_to_site.py`（現在會自動略過 `*.import`、`.gdignore`）→ C 槽 site-build 同步、typecheck（只有既有的 `.openai/hosting.json` 錯誤，與本次無關）、lint、49 項測試全過、build；本機走查 `qa_walk.py` PROBLEMS 0。
- 比對：線上最後發布 11/19 18:49（1190 檔，沒有別人動過）；差異只有接便當新版（index.html/pck）、校車衝刺／時鐘忍者／行李轉盤新上、`video/taiwan.mp4` 新上；函式最後更新 11/19 17:19（之前已比對）。
- 部署（C 槽 site-build，兩個指令）：functions `routinesGameDone`、`monsterPortal` 成功（清理政策警告照舊，未設）；hosting 發布完成。首頁入口仍藏著（`SHOW_ROUTINES_TILE = false`）。
- 正式站確認：台灣影片、四款遊戲 pck／wasm 都回 200，接便當 pck 和本機逐位元組相同。待老師用 iPad 各玩一局（OPEN_QUESTIONS G2）。

## 2026-11-20 晚 Tripo 第 1 批（西班牙＋埃及，老師同意 555 點）完成

- 9 個模型都在 `tabletop/models/`：spain_girl、egypt_boy、spain_mum（都 65 根骨頭、兩手手指有權重）、spain_dining_set、spain_dinner_set、spain_balcony、egypt_table_chair（椅子塞在桌下，場景要用 pull_chair 拉出）、egypt_breakfast_set、egypt_ful_pot。三角面數都和 Tripo 頁面一致。
- 點數：1,605 → 1,050（9×55＋3×20＝555），帳本已記。下一批：肯亞＋印度 370 點（先給老師看參考圖再開始）。
- 踩坑：Chrome 會在之後把**早先所有**下載的 `.tmp` 一起改名成 `tripo_convert_*.glb`，grab_glb 抓到改名的舊檔（媽媽第一次抓成燉豆鍋）。抓完一定用 `check_glb.py` 對三角面數；`--mark` 不要在按下 Export 之後跑（會把剛下載好的新檔也標成看過）。

## 2026-11-20 晚 英國片 v1

- 正式渲染 qa/1120-192007（K1–K4 all，final，1.46 單位）→ `python tabletop/src/uk_compose.py tabletop/qa/1120-192007/` → `tabletop/out/uk_homework_v1.mp4`（20.0 秒）、`web/video/uk.mp4`（**未定案、未部署**；下次部署前要確認老師已定案，否則先移走）。
- 抽格：`tabletop/qa/uk_v1_frames.jpg`、`uk_v1_k2_closeup.jpg`。待老師看：K2 翻封面時（片中 7.4–7.8 秒）右手跟著封面邊緣抬到下巴高度（沒擋臉）。要改的話只重渲 K2（約 0.3 單位）：抬到約 60 度後改用指腹推封面中段、放手時往下回到書頁，不往上。

## 2026-11-20 晚 英國片坐姿（老師兩次退件：看起來站在椅子後面、雙腿穿過椅墊）

- 原因三個：①書桌照手肘放大後椅面在他站姿臀高附近 ②`pull_chair` 前沒 `view_layer.update()`，切到的是未放大模型的一條細片（310 面），椅座其實還塞在桌下 ③Tripo 的椅背和桌面黏在一起（頂點剖面圖 `tabletop/qa/uk_desk_profile.png`），怎麼切都會留碎片或撕破桌面。
- 解法（`uk_homework.py`）：`hands.seat_under()` 量大腿網格在髖關節下多深（5.7 mm）→ 椅面＝膝高−大腿厚（壓進椅墊 1 mm）；`strip_chair()` 把模型的椅子整個刪掉（桌面那一層只刪明顯在桌後的）、書桌高度 ×kd 到手肘；`build_chair()` 程式做木椅（前緣在膝蓋後 2.5 mm、椅墊頂＝座面）。新檢查鏡頭 K2L（側面座高）、K2L2（前方低角度）＋`DESK LEGS` 量測行。
- 檢查圖：qa/1120-212652（K1/K2/K3/K4）、qa/1120-211421（K2L/K2L2），總表 `qa/uk_seat_check11.jpg`、`qa/uk_seat_legs_check.jpg`。小瑕疵：俯拍 K3 桌面左後角有一個模型本身的小缺口（原椅背柱穿過處）。
- 西班牙／埃及：同樣規則已先套（椅面降到膝高），但還沒有 seat_under／整個換椅；第一批檢查圖 SP 見 qa/1120-201417（SP2 收叉子手臂扭曲已改 F_HOLD，未重渲）。

## 2026-11-20 晚 Tripo 第 2 批（肯亞＋印度，老師同意 370 點）完成

- 6 個模型在 `tabletop/models/`：kenya_girl_pyjamas、india_boy（65 根骨頭、兩手手指有權重）、kenya_bed、kenya_window_table（只有一盤 mandazi、沒有杯子）、india_auto_rickshaw、india_school_gate；三角面數都和 Tripo 頁面一致。Tripo 模型 id 記在帳本旁 `%TEMP%/wrt_patch/batch2_ids.txt`（暫存）。
- 點數：1,050 → 680（6×55＋2×20），帳本已記。剩第 3 批：新加坡＋澳洲 370 點（之後剩 310 備用）。
- 老師人在外面時的做法（11/20）：Chrome 截圖逾時 → ①PowerShell 列 Chrome 視窗，發現有一個「另存新檔」對話框卡住整個 Chrome（之前某次匯出跳出來的）→ 送 WM_CLOSE 取消 ②螢幕關閉時 Chrome 不重畫 → 用 SetThreadExecutionState＋滑鼠移 1 px 喚醒 ③我的分頁視窗只有 728×323（resize 無效）→ 開新分頁並全程用 find 的 ref 點按鈕、讀餘額（ref "1050" 這種文字元素即使在畫面外也讀得到）。

## 2026-11-20 晚 Tripo 第 3 批（新加坡＋澳洲，老師同意 370 點）完成 → 第 5～10 站模型全部到齊

- 6 個模型：singapore_girl_pyjamas、australia_boy（65 根骨頭、手指有權重）、singapore_bed、singapore_bedside、australia_bathroom_wall、australia_backyard；三角面數都和 Tripo 頁面一致。
- 點數：680 → 310（帳本已記）。三批合計 1,295 點，和規格卡一致；剩 310 點做重做備用。
- `grab_glb.py` 改良：若下載檔和 models/ 裡已存的某個模型逐位元組相同（Chrome 把舊 .tmp 改名），自動跳過並標記（今晚發生 3 次：媽媽→燉豆鍋、後院→床、澳洲男生→新加坡女生，都已用面數抓出並改正）。

- ✅ 11/20 深夜 老師：英國片 **v2 定案**（`tabletop/out/uk_homework_v2.mp4`＝`uk_homework_final.mp4`；網站用 `web/video/uk.mp4`，qa/1120-221625 合成）。尚未部署：下次部署前跑 publish_to_site.py、比對線上，老師同意才上。
- ✅ 11/20 22:4x 英國片 v2 已部署（只部署 hosting；比對線上：上一版是當晚 19:01 自己的部署，差異只有 video/uk.mp4）。正式站 uk.mp4 和本機逐位元組相同（第一次抓到 CDN 舊快取，加參數重抓才對）。首頁入口仍藏著。

## 明天（11/21）待辦清單（11/20 深夜整理）

**情境動畫（主線）**
1. 美國站動畫：模型 `usa_girl.glb` 和分鏡 `tabletop/usa_school_storyboard.md`（要改成女學生）都有，場景／配音／合成程式還沒寫 → 寫程式（可交 subagent，免費）→ 檢查圖（含手部、腿部特寫）→ 老師看 → 正式渲染。
2. 西班牙＋埃及：套用英國坐姿做法（`hands.seat_under()`、必要時程式做椅子；先畫頂點剖面看桌椅有沒有黏住），西班牙 SP2 收叉子已改（F_HOLD），重跑第一批檢查圖（兩站約 1.1 單位）→ 老師看 → 正式渲染（兩站約 3.5 單位）→ 合成 → 定案。
3. 肯亞＋印度、新加坡＋澳洲：模型已齊，交 subagent 寫場景／配音／合成程式（照規格卡 3A），寫好再排檢查圖。
4. ✅ 小問題老師已回答（1B、2A、3A、4A、5A）：肯亞 KE4 第二句「I drink tea and eat mandazi.」；印度不做司機、IN3「Here it comes!」；埃及口袋麵包立在盤子上；西班牙媽媽 1.22 倍。已寫進各站分鏡開頭。
5. 每站定案後分批部署（publish → 本機建置 → 比對線上 → 只部署 hosting）。

**網站與遊戲**
6. 老師用 iPad 實機把 4 款遊戲＋台灣、英國影片各玩一次（觸控、聲音）。
7. 各站網站用 3D 學生圖（`web/art3d/char_<id>.png`，目前只有日本、台灣）：美國、英國＋之後 6 站，用 Colab `portraits.py`。
8. 完成畫面（10 站全過）設計稿 `web/finish-design/` 的 6 個問題待老師決定。
9. 老師實測通過後再打開首頁入口（`SHOW_ROUTINES_TILE = true`）。

**其他**
10. 今天所有變更都還沒 commit（世界作息之旅、`tools/動畫共用踩坑規則.md`、影片 skill 副本、總覽）→ 收工時確認範圍再 commit。
11. （可選）Artifact Registry 映像清理政策，要老師同意才設。

## 2026-11-21 下午進度（五站動畫）
- ✅ **美國站 v1 定案**（11/21 老師）：`tabletop/out/usa_school.mp4`（1080p，22.4 秒，538 格）＋`web/video/usa.mp4`（720p）；正式渲染 qa/1121-142331（US1、US2）＋1121-145440（US3、US4），共 1.94 單位。**還沒部署**，等其他站定案後一起分批部署。
- 肯亞：老師核准，KE2～KE4 正式渲染完成（qa/1121-134421、1121-135728）；KE1 指時鐘拇指 11/21 第三次修好（qa/1121-150326），KE1 正式渲染排隊中 → 合成 → 交老師驗收。
- 西班牙、埃及：檢查圖老師核准（西班牙水杯前移、叉子 20 度；埃及新桌子），正式渲染排隊中。
- 印度：檢查圖過關（鋼便當盒＋捏蓋鈕、車 1.36 倍）；待老師決定空駕駛座看得到是否可以。
- 新加坡：檢查圖過關（qa/1121-131008）。
- 澳洲：第 4 版重新排版（洗髮精放左邊小木架、左手拿、右手揮——和分鏡相反，待老師同意）；檢查圖排隊中。
- 定時巡檢 Colab（每 20 分，session 內）。
- 11/21 老師決定：印度空駕駛座維持（進正式渲染，排在澳洲檢查圖後，約 1.5–1.6 單位）；澳洲 AU4 改為左手拿洗髮精、右手揮手（同意與分鏡相反）。
- ✅ **西班牙站 v1 定案**（11/21 老師）：`tabletop/out/spain_dinner.mp4`（21.2 秒）＋`web/video/spain.mp4`；正式渲染 qa/1121-153001、1121-155758（1.61 單位）；SP1 字幕改到下方（原本蓋到時鐘）。還沒部署。
- 新加坡：老師核准正式渲染（約 1.5 單位），排在印度正式渲染後面。
- ✅ **埃及站 v1 定案**（11/21 老師）：`tabletop/out/egypt_breakfast.mp4`＋`web/video/egypt.mp4`；正式渲染 qa/1121-162415、1121-164957（1.78 單位）；EG1 字幕放下方離底 100 px。還沒部署。
- 字幕：肯亞、印度、新加坡、澳洲 compose 的第一鏡 SUB_POS 已先從上方 240 改成下方 0（避免蓋時鐘），合成時再看會不會蓋到腳。
- ✅ **肯亞站 v1 定案**（11/21 老師）：`tabletop/out/kenya_morning.mp4`＋`web/video/kenya.mp4`；正式渲染 qa/1121-134421、1121-135728、1121-170544（KE1 拇指第三次修好）共 1.78 單位。還沒部署。
- ✅ **印度站 v1 定案**（11/21 老師）：`tabletop/out/india_home.mp4`＋`web/video/india.mp4`；正式渲染 qa/1121-173139、1121-175603（1.46 單位）；IN1 字幕離底 100 px。還沒部署。
- ✅ **11/21 晚 部署完成**（老師說「部署」）：美國、西班牙、埃及、肯亞、印度五支影片上線（只部署 hosting）。部署前比對：線上最後發布 11/20 22:40（自己部署英國片），1,219 檔除了 5 支新影片全部相同，build 檔名一致（index-Cre58wmv.js）。部署要加 `--account u9431818@gmail.com`（預設帳號 samchouou 沒權限）。正式站 5 支影片和本機逐位元組相同。首頁入口仍藏著。
- ✅ **新加坡站 v1 定案**（11/21 老師）：`tabletop/out/singapore_night.mp4`（24 秒）＋`web/video/singapore.mp4`；正式渲染 qa/1121-182608、1121-184440、1121-190646（2.10 單位）；SG1、SG5 字幕離底 100 px；合成程式響度量測改量成片（原本 −19.1 → −16.1）。還沒部署。
- 澳洲：AU2／AU3 過關；AU4 左手拿洗髮精出現長條皮膚尖刺（qa/1121-192321，全景也看得到），手指彎曲 55° 不是原因，懷疑 australia_boy 綁定權重跨手，subagent 診斷中。洗髮精實心台座 OK。
- 澳洲站 v1 已合成（qa/1121-200934、1121-203527，1.62 單位）：`tabletop/out/australia_shower.mp4`＋`web/video/australia.mp4`，AU1 字幕離底 100 px，−16.1 LUFS。✅ 11/21 晚老師定案。新加坡＋澳洲尚未部署（等老師說「部署」）。尖刺真正原因：骨頭位置／縮放沒打關鍵影格（已修，見共用踩坑規則）。
- 11/21 Colab 全部排隊任務完成，定時巡檢已關閉。今日 Colab 約 20.6 單位。
- ✅ **11/21 夜 部署新加坡＋澳洲**（老師說「部署」）：部署前線上最後版本是 11/21 18:50 自己部署的那次（1,224 檔），比對後除 2 支新影片外全部相同、build 檔名一致（index-Cre58wmv.js）；只部署 hosting（`--account u9431818@gmail.com`）；正式站兩支影片和本機逐位元組相同。**十站情境動畫全部上線**。
- ✅ **11/21 夜 首頁入口打開**（老師：「首頁入口不要藏著」）：`monster-in-my-mind-site/app/ClassActivities.tsx` 的 `SHOW_ROUTINES_TILE = true`；建置後只有首頁那段程式不同（index-DNsFaQEb.js），只部署 hosting，正式站 JS 和本機逐位元組相同，內建瀏覽器看到首頁「World Routines Trip」方塊。注意：部署後第一次讀首頁會拿到 CDN 舊快取，網址加 `?v=` 再看。

## 2026-11-22 地圖動畫（kaz-map-animation skill）
- 老師給 YT 影片〈I Made VIRAL Map Animation Videos Using Claude Code (FREE Skill)〉＋ZIP＋PDF。skill 已審查（不連網）並安裝到 `C:\Users\User\.claude\skills\kaz-map-animation`（npm install＋Playwright Chromium）；授權是作者私有 → 不放進 GitHub、不改它的程式、`rights/` 原樣保留。
- 規格卡 `../rdq/RDQ-spec-world-routines-map-animation-20261122.md`（confirmed）：開場 1＋站間飛行 9＋結尾 1，橫式 1080p，英文旁白（Jenny −12%），不教時差，Comic Relief 字幕另外疊。
- 程式 `map-anim/build.py`（`python build.py leg japan`；`--sheet` 只出檢查圖）；場景 JSON 存 `map-anim/scenes/`，成片 `map-anim/out/`。本機渲染，不花錢。
- 飛行短片**不顯示作息時間**（那是本站謎題答案）→ 顯示「lunch ?:??」；真正的時間留到結尾回顧。
- 試片「台灣 → 日本」（7.9 秒，−16.2 LUFS）11/22 已傳老師，**等老師看**；通過後做其餘 8 支飛行＋開場＋結尾，再接進網站（還沒動網站程式）。
- 踩坑：faster-whisper 給檔名會壞（PyAV 版本）→ 用 soundfile 讀成陣列再傳；第一個字時間會被貼到 0 秒 → 用旁白起點修正；鏡頭移動時國名標籤會滑到字幕後面 → 整個畫面往南移、起點國名放島的上方；ffmpeg 9 沒有 `-vsync`，用 `-fps_mode vfr`。
- 11/22 老師退試片：「船沒有由南往北航行的感覺」→ 小船改成沿虛線從台灣開到東京（每格一個只活一格的圖示，不改 skill）、放大 1.4 倍；老師回「可以，做其餘」。
- ✅ **11/22 11 支地圖動畫全部做完**（都還沒給老師看過其餘 10 支，也**還沒部署、沒 commit**）：
  - 飛行 9 支 `map-anim/out/leg_<站>.mp4`（各約 8 秒，`python build.py leg all`）；飛機沿弧線飛並轉向航向、火車走倫敦→巴黎→波爾多→馬德里、船走真實海路；新加坡太小不上色，用閃動橘點；印度相關兩段關掉全部國界線。
  - 開場 `out/opening.mp4`（31 秒）、結尾回顧 `out/ending.mp4`（57 秒，十站各念一次「國名＋I … at 時間」，顯示真正的時間）：`python build_world.py opening|ending`（`--still 秒數` 先看一格）。世界總覽鏡頭中心東經 125 度；這兩支沒有 skill 音效，只有旁白＋小聲配樂。
  - 11 支都是 −16.0～−16.2 LUFS（量成片）；720p 複本在 `web/video/map_<名稱>.mp4`（共約 19 MB）。
  - 跨太平洋那段（日本→美國）要另給平移 360 度的國家外框才會上色：`map-anim/geo/japan_west.geojson`、`usa_east.geojson`（`geo/extract_country.cjs` 從 skill 內建的 Natural Earth 公有領域資料抽出）。
- ✅ **網站程式已接好（本機）**：`monster-in-my-mind-site/app/routines/RoutinesApp.tsx` 新增 `MapClip`（全螢幕播放）＋`routines.css` 4 行。
  - 開場：登入後、地圖出現前播一次（每台裝置一次，記在 localStorage `wr-clips`）。
  - 飛行：點下一站時播 `map_leg_<站>.mp4` 取代原本小人偶移動；第一次不能跳過，看過之後有「Skip 跳過」；影片載不到或 6 秒沒開始 → 自動退回舊的小人偶移動／出現 Skip，不會卡住。
  - 結尾：第 10 個印章後回地圖時播一次；完成卡片多一顆「🎬 Watch the trip again 再看一次回顧」。
  - 本機檢查：typecheck（只有既有的 hosting.json 錯誤）、lint 乾淨、`python web/qa_clips.py <資料夾>` 7 個情境 0 錯誤、`web/qa_walk.py` 30 步 0 錯誤（已加 `end_clip` 跳過影片）、正式建置成功（index-BmKmoPbV.js）。
  - **還沒驗證**：真 iPad（登入後隔了網路等待才播開場，Safari 可能要多點一次「▶ Play 播放」，程式已有這顆按鈕）；我沒有實際聽過 11 支的聲音，只量過響度、抽格看畫面。
- 踩坑已寫進 `tools/動畫共用踩坑規則.md` §17（10 條）＋15 個影片 skill 開頭短版。
- 下一步：老師看 10 支新片 → 要改就改 → 老師說「部署」才比對線上、只部署 hosting。收工 commit 時**不要**放 skill 本身、mp4、YT 影片資料夾。
- ✅ **11/22 晚 地圖動畫部署上線**（老師看過 11 支合輯後說「可以，部署」）：部署前線上最後版本是 11/21 21:57（台灣時間）自己部署的「首頁入口」那版（1,226 檔），比對後除 11 支新影片（LOCAL-ONLY）與建置檔外 1,221 檔全部相同；只部署 hosting（`--account u9431818@gmail.com`）。部署後正式站 `index-BmKmoPbV.js`、`index-B_yHCcEj.css` 和 11 支 `map_*.mp4` 與本機逐位元組相同（13/13），影片支援分段讀取（206）。**還沒驗證**：真 iPad 實機、實際聽聲音。程式與文件都還沒 commit。

## 2026-11-23 he/she 版（規劃中）
- 規格卡 `../rdq/RDQ-spec-world-routines-he-she-20261123.md`（confirmed）：另開 `/world-routines-he-she`、「世界小記者連線報導」（主播畫外音問、記者回報、主角不入鏡）、沿用 5 女 5 男人物並取名、10 站換新作息與謎底、每站換新謎題類型、10 部新桌上微縮動畫（先台灣試片）、建議 ①～⑤ 全採納。課本依據 p.45（She watches TV…、-s／-es／-ies）。
- 印度：老師說「照這份開始」未指定 → 先照建議 "He plays cricket at 5:00."（1700），關卡 ② 可改回 homework。
- 關卡 ② 文件 `he-she/關卡2_文字稿與教材清單_20261123.md`（10 站句子、延伸句、拖放誘答、10 種新謎題、動畫場景、網路查證表）11/23 已傳老師，**等老師確認**。還沒生圖、沒渲染、沒改網站、沒 commit。
- 11/23 修訂：謎底新的、謎題用 I 版 6 種類型但**各站互換**（每站用往後第二站的 I 版類型；台灣諧音、日本電子鐘、美國烏托邦、英國九宮格、西班牙鏡像、埃及形狀、肯亞諧音、印度電子鐘、新加坡鏡像、澳洲形狀）；其餘不變。規格卡 confirmed（revision 2）。
- 謎題卡預覽：`python he-she/render_cards.py` → `he-she/cards/`（10 張四格圖＋all.jpg），已傳老師，等看。不需要新生圖。
- 11/23 he/she 台灣試片（Mei 起床）：
  - 睡衣不建模：`tabletop/src/make_pyjamas.py taiwan_girl taiwan_girl_pyjamas` 把制服貼圖的黃綠色改成粉紅點點睡衣（0 點數）。
  - 場景 `tabletop/src/taiwan_getup.py` 由 `taiwan_getup_build.py` 從 `kenya_morning.py` 產生（沿用床的高度擬合、手部 Rig；新寫臥室、雙鈴鬧鐘、洗手台、牙刷）。鏡頭 TW1 坐床邊指時鐘、TW2 按掉鬧鐘、TW3 刷牙、TW4 換制服；第 5 段重用 I 版早餐 B4 畫面（qa/1120-174646，畫面裡有主角）。
  - 配音 `taiwan_getup_voice.py`（主播 Jenny、記者 Ana，−12%）；合成 `taiwan_getup_compose.py qa/1123-093405 qa/1123-095221` → `tabletop/out/hs_taiwan_getup.mp4`（23.4 秒、−16.0 LUFS）＋`web/video/hs/taiwan.mp4`；鬧鐘鈴聲程式合成。
  - Colab：test 0.24＋0.16、final 0.98＋0.48，共約 1.9 單位。
  - 踩坑：找拇指位置時 rot_bone 改了骨頭矩陣，留下的位移／縮放讓左手長出一條長尖刺 → 搜尋後把所有骨頭 location／scale 歸零；肯亞的鏡頭是兩個人的構圖，單人要拉近。
  - ✅ 11/23 老師定案（「可以定案」）。下一站：日本 Haruto 洗澡（先檢查圖）。
- 11/23 其餘 9 站分鏡 `he-she/其餘9站分鏡_20261123.md`；老師決定：**1A**（英國爸爸、埃及姊姊用 Tripo 新做，約 150 點，做到那站前先讀 Tripo 餘額再花）、**2 可以**（日本沖澡只拍霧面玻璃後身影、泡澡只露頭）、**3 一站一站**（每站：檢查圖 → 正式渲染 → 試片）。肯亞家人只拍多擺的碗盤。下一站日本。
- 11/23 日本：老師選 **A 新做睡衣模型**（Tripo 75 點）。參考圖 `tabletop/refs/japan_boy_pyjamas.png`（Codex，附 japan_boy.png 保持同一張臉；提示詞在 ref_prompts.py）＋對照 `refs/japan_pyjamas_pair.jpg`，已傳老師，等「可以建模」。
- 11/23 日本 Tripo：japan_boy_pyjamas 建模 55＋綁骨架 20（餘額 200 → **125**，帳本已記），65 根骨頭、兩手手指都有權重。
- 日本場景 `tabletop/src/japan_bath.py`（由 `japan_bath_build.py` 產生）：JP1 更衣處＋霧面玻璃門後的黑影沖澡（牆上 8:20）、JP2 洗頭特寫、JP3 檜木浴缸只露頭＋頭上小毛巾、JP4 榻榻米房間坐在被褥上揮手（9:00）。檢查圖 `he-she/japan_check_1123.jpg` 已傳老師，等看。Colab test 約 0.4 單位。
- 踩坑：白牆＋強光整片過曝 → 牆改米色、燈調暗；霧面玻璃後的人看得到衣服顏色 → 光從他背後打、他身上換成深色材質，只剩黑影；坐在地上的被褥要把腿往前伸、腳尖朝前，否則拖鞋從棉被頂出來。
- 11/23 老師改流程：**其餘各站先一批一批做完檢查圖，全部一起給老師確認，再一批一批正式渲染**（取代「一站一站」）。Tripo 餘額 125：英國爸爸 75 → 剩 50；埃及姊姊還差 25 點，要老師自己加購，之前埃及檢查圖先放暫代人物。
- 11/23 老師：**11/24 之後 Tripo 點數會補充，到時再建埃及姊姊；埃及動畫放最後再做**。英國爸爸 11/23 已送建模（55 點，餘額 125 → 70，綁骨架後 → 50）。
- 11/23 日本正式渲染（qa/1123-123204、1123-125701，約 1.8 單位）→ `tabletop/src/hs_compose.py japan …`（通用合成，各站設定在 STATIONS）→ `tabletop/out/hs_japan.mp4`（21.0 秒、−16.0 LUFS）＋`web/video/hs/japan.mp4`，已傳老師。
- 其餘各站程式都寫好（配音 `hs_voice.py <站>` 已產生）：`usa_lunch.py`、`spain_lunch.py`（由 spain_dinner.py 改）、`uk_home.py`、`kenya_dinner.py`（由 kenya_morning.py 改，kenya_girl_home 用 make_recolor.py 改色）、`india_cricket.py`、`singapore_study.py`／`australia_homework.py`（desk_study_build.py，singapore_girl_school 改色）。英國爸爸 `models/uk_dad.glb`（65 骨、雙手手指 OK）。檢查圖分批渲染中，做完一起給老師。
- ✅ 11/23 老師：**日本試片通過**（tabletop/out/hs_japan.mp4）。
- 11/23 其餘 7 站檢查圖（Colab test 約 1.0 單位）總表 `he-she/checks_1123/`（all_7_stations.jpg＋各站），已傳老師等確認。檢查時修過：美國指手尖刺（所有新場景 Char.finish 前把骨頭 location/scale 歸零）、英國時鐘移進畫面＋走到欄杆前＋真的牽手（hands_apart 0.3 mm）、肯亞 ugali 蓋住 Tripo 盤上的 mandazi、印度球棒加深加大＋鏡頭拉近、新加坡／澳洲寫字範圍縮小（筆尖碰紙）。
- 已知小問題：肯亞改色後額頭有一點青綠色（改色範圍吃到皮膚亮部，門檻 0.68 時整張臉變色，已退回 0.80）；肯亞盤子邊緣仍看得到一點 mandazi；印度揮棒動作幅度小。
- 11/23 老師：**7 站檢查圖可以，正式渲染**。佇列 `tabletop/src/hs_final_queue.sh`（14 批，每批 1～2 鏡，約 13 單位、5 小時），每批完成寫一行到 `tabletop/work/hs_final_queue.log`（BATCH 場景 鏡頭 -> qa 資料夾）。全部渲完後：`python tabletop/src/hs_compose.py <站> <qa…>`（英國會自動接 I 版 qa/1120-192007 的 K4 喝茶、K3 寫字畫面）。

## 2026-11-23 16:00 關機交接（he/she 版正式渲染中斷點）

- 老師要關機，已停掉背景佇列 `hs_final_queue.sh`，並 `colab stop -s wrt`（避免 Colab 空轉耗單位）。
- **已完成的正式渲染**：
  - 英國 UK1+UK2 → `tabletop/qa/1123-151815`；UK3 → `tabletop/qa/1123-152741`（全站完成，可直接合成）
  - 美國 US3+US4 → `tabletop/qa/1123-145414`
- **未完成**：美國 US1+US2（第 1 批失敗、沒有 qa 資料夾，原因未查）、西班牙第 1 批渲到一半被中斷（不保留），其餘肯亞、印度、新加坡、澳洲尚未開始。
- 本次 Colab 用量約 1.8 單位。
- **開機後接續**（在 tabletop 資料夾）：
  1. 先申請保持清醒；背景執行 `bash src/hs_resume_queue.sh`（11 批：美國 US1/US2 → 西班牙 → 肯亞 → 印度 → 新加坡 → 澳洲，約 4 小時、約 10 單位）。進度看 `work/hs_final_queue.log`，看到 `DONE` 才算完。若美國 US1/US2 又失敗，看 `work/_hsq.log` 查原因。
  2. 等佇列時可先合成英國：`python src/hs_compose.py uk qa/1123-151815 qa/1123-152741`，抽格＋量響度（−16 LUFS）後傳給老師。
  3. 各站渲完即用 `hs_compose.py <station> <qa dirs>` 合成試片給老師看。
  4. 埃及：11/24 後 Tripo 點數補充再建姊姊模型，放最後。

## 2026-11-23 17:00 老師退件：指時鐘的手勢（he/she 全部站）

- 老師看英國試片：Oliver 指後方時鐘的手「扭曲、不合常理」。要改成手肘彎曲、掌心朝上、一隻手指往上比。
- 原因：舊寫法 `E.P_point` 把上臂和前臂都直直指向後上方的時鐘，手掌沒轉，手腕看起來反折。
- 新寫法在 `tabletop/src/point_snip.py`（`point_arm`／`point_hand`／`rest_hand`），由 build 腳本插入；英國 `uk_home_build.py` 已套用。
  檢查圖 `he-she/checks_1123/4_uk_point_v2.jpg`（qa/1123-165824），等老師確認。
- 同樣的舊指法還在：美國 US1、西班牙 SP1、肯亞 KE1、印度 IN1、新加坡 D1、澳洲 D1（還有已定案的台灣 TW1）。
  所以正式渲染改成先跑「沒有指時鐘」的鏡頭：`bash src/hs_rest_queue.sh`（背景執行中，log 結尾是 DONE_REST）。
  指時鐘的鏡頭等老師確認新手勢後，各站 build 套 `point_snip` → 檢查圖 → 再正式渲。
- 第二個 Colab 連線 `wrt2`：`src/colab_run2.py`（用 work2/，可和主佇列同時跑測試圖）。`hs_resume_queue.sh` 不要再用。
- `hs_compose.py` 站名標籤已修成 UK／USA。

### 11/23 17:40 新手勢套到全部站（等老師看檢查圖）

- 老師：新手勢可以、台灣站也要改。已用 `src/apply_point.py`（讀 `point_snip.py`）改好 usa_lunch／india_cricket／singapore_study／australia_homework／kenya_dinner／spain_lunch／taiwan_getup／uk_home 的場景檔。
  **注意：這次是直接改產生出來的場景檔**；之後若重跑各站 build 腳本，要再跑 `python src/apply_point.py <scene>`（英國 build 已內建）。
- point_snip 內容：`point_arm`（上臂側抬、手肘彎）、`point_hand`（手指往上、略偏時鐘；不朝螢幕內，否則像握拳）、`tuck_thumb`（拇指收到中指上，不然像比 YA）、`E.Char.finish` 歸零骨頭位置（肯亞出現過長尖刺）。
- 檢查圖：`he-she/checks_1123/point_v2_all_stations.jpg`（上排台灣、美國、英國、西班牙；下排肯亞、印度、新加坡、澳洲）。美國的手看起來較像整隻手舉起，已告知老師。
- 踩坑：TaskStop 停掉背景佇列後，`bash hs_resume_queue.sh` 其實還活著，繼續和新佇列搶同一個 Colab session。停佇列後要 `ps -ef | grep hs_` 確認並 kill。西班牙 SP2／SP4 那一批可能受影響，下載後要核對格數（SP2 約 87、SP4 約 48）。
- 老師確認檢查圖後才正式渲：US1、UK1、SP1、KE1、IN1、新加坡 D1、澳洲 D1、台灣 TW1。

### 11/23 17:55 老師核准八站新手勢 →「可以，正式渲染」

- 指時鐘 8 鏡正式渲染：`bash src/hs_point_queue.sh`（第二個 session wrt2，log `tabletop/work2/point_queue.log`，結尾 DONE_POINT）。順序 UK1、US1、IN1、新加坡 D1、澳洲 D1、TW1、SP1、KE1。
- 主佇列 `hs_rest_queue.sh`（session wrt，log `tabletop/work/hs_final_queue.log`，結尾 DONE_REST）之後自動補渲西班牙 SP2（結尾 DONE_ALL）。
  log 中若 `-> ` 後面是空的或「Binary file」，到 `tabletop/qa/` 看最新資料夾核對。
- 已知可用的正式格：UK2 `qa/1123-151815`、UK3 `qa/1123-152741`、US3+US4 `qa/1123-145414`、US2 `qa/1123-170357`、SP4 `qa/1123-173631`（被舊佇列干擾那批，49 格，合成時要看一眼；同資料夾的 SP1 是舊手勢、不要用）。
- 全部渲完後各站 `python src/hs_compose.py <station> <qa dirs>`；台灣用 `taiwan_getup_compose.py`（TW1 換新格）。

### 11/23 18:50 英國、美國試片已合成送審

- `hs_compose.py` 同一個鏡頭在多個 qa 資料夾都有時，**後面的資料夾會蓋掉前面的**：新渲的資料夾要放最後。
- 英國：`python tabletop/src/hs_compose.py uk tabletop/qa/1123-151815 tabletop/qa/1123-152741 tabletop/qa/1123-182121`（UK1 新手勢在 182121）。
- 美國：`python tabletop/src/hs_compose.py usa tabletop/qa/1123-183800 tabletop/qa/1123-170357 tabletop/qa/1123-145414`（US1 新手勢 183800、US2 170357、US3+US4 145414）。
- 其他已渲好：KE4 `qa/1123-180245`、KE4UG `qa/1123-181520`、IN2+IN3 `qa/1123-183713`。

- ✅ 11/23 老師定案：he/she 英國（hs_uk.mp4）、美國（hs_usa.mp4）。已定案共 4 站：台灣（TW1 新手勢重渲後要重新合成再給老師看）、日本、英國、美國。

### 11/23 19:35 印度、新加坡試片已合成送審（等老師）

- 印度：`hs_compose.py india tabletop/qa/1123-183713 tabletop/qa/1123-184725 tabletop/qa/1123-185432`（IN2+IN3、IN4、IN1 新手勢）
- 新加坡：`hs_compose.py singapore tabletop/qa/1123-190641 tabletop/qa/1123-191524 tabletop/qa/1123-191224`（D2+D3、D4、D1 新手勢）
- 還在渲：主佇列澳洲（D0+D3、D4）→ 補西班牙 SP2；第二條澳洲 D1 → 台灣 TW1 → 西班牙 SP1 → 肯亞 KE1。

### 11/23 19:45 老師退件：印度 Arjun「用手背拿球棒」不合邏輯

- 原因：握把放在手指第二節外側（鬆握 G_CUP），看起來握把在手背那一側；揮棒是朝鏡頭前後擺，幾乎看不出來。
- 已改 `india_cricket_build.py`：`bat_fist()` 緊握拳（hinge curl）、握把放在「指根到指尖」圈的中心；`bat_M` 改成球棒在右大腿前、**橫向揮過畫面**（繞 Y 軸，後擺 −78° 朝他右側、打擊後 +70°）；球改從他左側（畫面右）來；頭轉向來球。之後 `python src/apply_point.py india_cricket`。
- 新加坡試片老師尚未回覆（只退了印度）。
- 檢查圖：等主佇列 DONE_REST 後在 session wrt 跑 `colab_run.py light india_cricket "IN1 40,130" "IN2 0,14,26,36,46,60" "IN3 20"`（背景中）。老師確認後要正式重渲 IN1、IN2、IN3（IN4 只有時鐘不用）。
- 西班牙 SP2 補渲尚未開始（原本的等待腳本已停掉）：印度檢查圖出來後再手動跑 `python src/colab_run.py final spain_lunch "SP2 all"`。
- 第三條 Colab 連線開不起來（Service Unavailable），同時最多用兩條。

- 11/23 20:00 澳洲試片已合成送審：`hs_compose.py australia tabletop/qa/1123-193612 tabletop/qa/1123-194725 tabletop/qa/1123-193115`。主佇列 DONE_REST；印度檢查圖在 wrt 上跑。

- 11/23 20:05 印度新握法檢查圖 `he-she/checks_1123/8_india_bat_v2.jpg`（qa/1123-194918）已傳老師，等確認後正式重渲 IN1、IN2、IN3。西班牙 SP2 補渲已在 wrt 開始（log `tabletop/work/_hsq2.log`，完成後到 qa/ 看最新資料夾，SP2 約 87 格）。

### 11/23 20:50 老師再退兩項＋進度

- **老師退件 1：板球要雙手握棒**。`india_cricket_build.py` 已改：左手（上手）`C_BAT_L` 在右手上方 `HAND_GAP=0.0036`，`two_hands(Mb)`／`fists(fr)`；握棒點在身體正前方、隨揮棒移動（`bat_M(..., lift, dx)`），收棒角度 48°；整段揮棒兩手 REACH 都 ≤ 手臂長。測試圖 `qa/1123-202621/toutT`（IN2、IN3），尚未給老師看、未正式重渲。IN1 仍是右手單手拿棒＋左手指時鐘。
- **老師退件 2：Ling、Jack 寫字時右手臂有一段不見**。原因：筆記本在角色左手邊，右手橫過胸前，上臂穿進身體。`desk_study_build.py` 已改：書放正前方偏左（BX+0.005）、筆記本放右手邊（BX−0.0135）、D3 左手改放在書上、D3 鏡頭左右鏡射。新加坡／澳洲的 D1、D2、D3 都要重渲（D0、D4 不用）。測試在背景跑（task b1suwcjpd）。
- `src/colab_runT.py`：可和正在跑的佇列共用 session wrt2 的測試用 runner（用 /content/toutT、jobT、work3/，不啟動閒置關機）。
- 第二條佇列 DONE_POINT：TW1 `qa/1123-194943`、SP1 `qa/1123-200956`、KE1 `qa/1123-202847`；SP2 補渲 `qa/1123-200727`（87 格）。
- 西班牙試片已送審：`hs_compose.py spain tabletop/qa/1123-173631 tabletop/qa/1123-200727 tabletop/qa/1123-200956`。
- 台灣新手勢版已送審：`taiwan_getup_compose.py tabletop/qa/1123-093405 tabletop/qa/1123-095221 tabletop/qa/1123-194943`。
- 肯亞：KE4 只有 98 格（需 108，被舊佇列干擾截斷），背景補渲 f0196–f0214（task b2y76m1x3），補完把 10 格複製進 `qa/1123-180245/tout/KE4/` 再 `hs_compose.py kenya tabletop/qa/1123-180245 tabletop/qa/1123-181520 tabletop/qa/1123-202847`。

- ✅ 11/23 老師定案：西班牙（hs_spain.mp4）、台灣新手勢版（hs_taiwan_getup.mp4）。he/she 已定案 6 站：台灣、日本、美國、英國、西班牙＋（待）肯亞、印度、新加坡、澳洲、埃及。

- 11/23 21:10 肯亞 KE4 補齊 108 格（10 格複製進 qa/1123-180245/tout/KE4），試片已送審：`hs_compose.py kenya tabletop/qa/1123-180245 tabletop/qa/1123-181520 tabletop/qa/1123-202847`。已知：特寫裡 sukuma 只有一小點綠、Tripo 的 mandazi 仍露在烏咖哩旁、手臂與臉有藍綠斑。新加坡 D3 測試 OK（qa/1123-203840/toutT）。印度握點前移測試在背景（task b0pgc41hx）。

### 11/23 21:30 三組檢查圖送審（肯亞四項修正、印度雙手握棒、寫字手臂）

- **肯亞**（老師貼回四項問題要修）：
  - 藍綠斑：`make_recolor.py` 加兩道保護——小碎塊不改色（第 9 參數 MINFRAC）＋依骨架權重保護皮膚（第 10 參數骨頭名）。
    `python src/make_recolor.py kenya_girl_pyjamas kenya_girl_home 10 42 0.45 0.80 0.12,0.55,0.55 preview.jpg 0.0003 "Head,Neck,ForeArm,Hand,Foot,Toe"`；舊模型備份 `tabletop/work2/kenya_girl_home_v1_backup.glb`。
  - 炸餅：`kenya_dinner_build.py` 的 `cut_plate()` 用 bmesh 把 Tripo 桌子上的盤子＋mandazi 頂點刪掉，換扁平琺瑯盤＋烏咖哩＋46 片青菜堆。（試過用高圓筒蓋住→像蛋糕模、擋住身體，不行。）
  - 開場：鏡頭 42→56、對準女孩與時鐘之間。
  - 檢查圖 `he-she/checks_1123/7_kenya_v2.jpg`。老師確認後重渲 KE1、KE4、KE4UG。衣服袖口還有幾條橘色細線。
- **印度雙手握棒 v4**：握點移到身體前方 11.8 mm、肩下 11 mm，雙臂都在胸前看得到。檢查圖 `he-she/checks_1123/8_india_bat_v4_two_hands.jpg`（qa/1123-212229）。確認後重渲 IN1、IN2、IN3。
- **寫字手臂**：檢查圖 `he-she/checks_1123/9_10_desk_arms_v2.jpg`（新加坡 qa/1123-203840/toutT、澳洲 qa/1123-212103）。確認後重渲兩站 D1、D2、D3。
- 踩坑：`colab_runT.py` 和佇列共用 session 時，佇列自己的閒置計時器仍會在 10 分鐘後關掉 session，測試就卡死（輪詢到 3000 秒）。佇列跑完後的測試改用 `colab_run.py`（session wrt）。

### 11/23 21:55 老師再退：球棒右手反了、鉛筆穿過虎口；踩坑寫進總規則

- 老師：「以上製作動畫踩過的坑，都要寫入動畫製作總覽規則之中」→ `tools/動畫共用踩坑規則.md` 新增第 18 類（18.1–18.17）；11 個影片 skill 的「共用踩坑規則」都加一行短版；總覽開頭加一句指向第 18 類。
- 球棒：下手（右手）繞握把轉半圈，掌心與手腕內側朝來球（+x），拇指仍在上；`DESK BATHAND` 印出右手掌心方向（要 +1,0,0）。注意 `C_BAT` 由手的骨架推出，只翻 `q_g` 不會變（手和棒的相對關係不變），要連 `zb`（握把方向）一起選。測試 `qa/1123-213927`。右手 REACH 0.0184 稍超過手臂 0.0179。
- 鉛筆：`desk_study_build.py` D3 把筆桿上端往「食指根部的拇指側」推到離皮膚 ≥ 筆半徑（`DESK PENWEB`）；往手背推會從手背穿出來。測試 澳洲 `qa/1123-215208`、新加坡 `qa/1123-215336`。
- 檢查圖 `he-she/checks_1123/bat_pencil_grip_v5.jpg`（左：舊球棒、中兩格：新球棒、右：新握筆兩站）。

### 11/23 22:00 老師：「可以，正式重渲」（新握棒、握筆、寫字手臂、肯亞四項）

- `bash tabletop/src/hs_fix_queue.sh`（背景）：A 線 session wrt＝肯亞 KE1、KE4、KE4UG、印度 IN1、IN2+IN3；B 線 session wrt2＝新加坡 D1、D2+D3、澳洲 D1、D2+D3。log `tabletop/work/hs_fix_queue.log`（DONE_A、DONE_B）。
- 渲完要核對格數（KE1 90、KE4 108、KE4UG 45、IN1 90、IN2 54、IN3 42；D1 新加坡 94／澳洲約 96、D2 49、D3 54），再合成：
  - 肯亞 `hs_compose.py kenya <KE1 dir> <KE4 dir> <KE4UG dir>`
  - 印度 `hs_compose.py india tabletop/qa/1123-184725 <IN1 dir> <IN2+IN3 dir>`（IN4 沿用 184725）
  - 新加坡 `hs_compose.py singapore tabletop/qa/1123-191524 <D1 dir> <D2+D3 dir>`（D4 沿用 191524）
  - 澳洲 `hs_compose.py australia tabletop/qa/1123-193612 tabletop/qa/1123-194725 <D1 dir> <D2+D3 dir>`（D0 沿用 193612，**舊 D3 也在 193612，新 D3 資料夾要放最後**）

### 11/23 收工：12 鏡最後重渲完成，四支試片已傳，等 11/24 老師看

- 佇列結果（`tabletop/work/hs_fix_queue.log`）：
  - KE1 `qa/1123-221700`（90 格）
  - KE4 `qa/1123-223952`（109 格）
  - KE4UG `qa/1123-225048`（45 格）
  - IN1 `qa/1123-230705`（90 格）
  - IN2＋IN3 `qa/1123-232547`（54＋42 格）
  - 新加坡 D2＋D3 `qa/1123-223928`
  - 澳洲 D1 `qa/1123-225745`（97 格）
  - 澳洲 D2＋D3 `qa/1123-231650`
- **新加坡 D1 第一次是空的**：`colab_run2.py` 的每個鏡頭必須是一個帶引號的參數（`"D1 all"`）。不加引號時會出 `ValueError: not enough values to unpack`，而且佇列的 log 會被下一批覆蓋（`_fix_B.log`）。已單獨補渲到 `qa/1123-234659`（94 格）。
- 合成方式：
  - 肯亞 `hs_compose.py kenya qa/1123-221700 qa/1123-223952 qa/1123-225048`
  - 印度 `hs_compose.py india qa/1123-184725 qa/1123-230705 qa/1123-232547`
  - 澳洲 `hs_compose.py australia qa/1123-193612 qa/1123-194725 qa/1123-225745 qa/1123-231650`
  - 新加坡 `hs_compose.py singapore qa/1123-191524 qa/1123-234659 qa/1123-223928`
  - 四支都是 −16 LUFS，已用 SendUserFile 傳給老師。
- **11/24 下一步**：
  1. 等老師看四支試片，定案或退件。
  2. 埃及：Tripo 補充點數後建姊姊模型，最後做。
  3. he/she 網站頁面（部署前先問）。
- 已知小瑕疵：
  - 肯亞袖口有幾條橘線。
  - 印度 IN1 仍是單手持棒加指時鐘。
  - 印度右手 REACH 0.0184，比手臂長 0.0179 稍長。
- 踩坑：印度合成時，混音的 ffmpeg 跑到 0.013 倍速，卡了 20 分鐘（同一份程式，肯亞一下子就跑完）。殺掉後重跑，一次就好。合成要加 `timeout`，跑超過 5 分鐘就殺掉重跑。
- Colab 11/23 共用 40 多個單位。

### 11/24 老師：四支試片都定案；埃及先不動工；開始 he/she 網站部署任務

- ✅ 肯亞、印度、新加坡、澳洲 he/she 動畫定案（`tabletop/out/hs_*.mp4`、`web/video/hs/*.mp4`）。he/she 十站裡只差埃及。
- 11/24 老師決定 he/she 網站範圍（三題都選建議）：
  1. 4 款 Godot 遊戲加 he/she 時間資料（時鐘回合用新時間、補時間語音）並重新匯出；I 版遊戲行為不能變。
  2. 9 支飛行短片＋結尾回顧重做 he/she 版（本機），開場沿用。
  3. 埃及站照常開放，動畫那一步顯示「製作中」，之後補。
- 11/24 老師：埃及站網站語音可以做（hs_voice.py 加 egypt，edge-tts 免費；埃及情境動畫仍不動工）；**首頁先不放 he/she 入口**，只給網址 `/world-routines-he-she`。
- 11/24 老師看過 he/she 飛行短片 5 支（日本、美國、英國、西班牙、埃及）：「都可以」。
- 11/24 he/she 網站本機完成（**尚未部署**）：
  - 題庫 `monster-in-my-mind-site/functions/routines-hs-content.json`（`he-she/build_site_bank.py` 產生，連 `web/audio/hs/` 49 個語音）。
  - 函式 `routines.mjs`／`routines-core.mjs` 加 `variant:'hs'`（沒帶＝I 版，I 版集合／ID／提示詞不變）；he/she 用 `routines_hs_progress`、`routines_hs_records`、`routines-hs-recordings/`；每日 30 次口說兩版合計。測試 `functions/tests/routines-hs.test.mjs`，全部 45 項過。
  - 前端 `content.ts` TRIPS、`RoutinesApp`／`RoutinesTeacher` 的 `variant` prop、`ClassActivities` 路由 `/world-routines-he-she`（＋`/teacher`）；首頁不放入口。`scripts/local-preview.ts` 支援 hs。
  - 遊戲：`he-she/build_game_data.py` → `games/<遊戲>/data/hs_<站>.json`；`he-she/export_games.py` 重新匯出 4 款（舊 web 備份在 `tabletop/work/games_web_backup/`），I 版國家測試照舊通過。
  - 地圖短片：`map-anim/build.py leg all --hs`、`build_world.py ending --hs` → `web/video/hs/map_*.mp4`；文法動畫 `web/video/hs/grammar.mp4`（verbs-1-explain 720p）。老師 11/24 看過 9 支飛行短片，前 5 支說「都可以」，後 4 支與結尾已傳。
  - 走查 `web/qa_walk_hs.py`（31 張、只有登入前 401）、`web/qa_walk.py`（I 版 0 錯誤）、`web/qa_teacher.py`（改成接受開場動畫先播）。
  - 部署前比對：線上最後發布是 11/22 20:42 自己的地圖動畫版（1,237 檔）。不同的只有 4 款遊戲（index.html、index.pck）和 69 個新檔。線上函式除 routines.mjs、routines-core.mjs 外和本機相同。建置 index-D3Fp-jST.js。
- 11/24 老師：「可以，部署」（he/she 網站：函式＋hosting，首頁不放入口）。
- ✅ **11/24 he/she 網站部署上線**：
  - 函式 6 個更新成功：monsterPortal、routinesState、routinesAnswer、scoreRoutineSpeaking、routinesGameDone、purgeExpiredRoutines。最後跳出「沒有映像清理政策」的提醒，這是舊問題，不影響。
  - hosting 另外一個指令部署。
  - 部署後逐位元組比對 80/80 相同：index.html、assets、20 支影片、49 個語音、4 款遊戲。
  - 三個網址都回 200：/world-routines-he-she、/world-routines-he-she/teacher、/world-routines。
  - 首頁沒有入口，只給網址。
  - **還沒驗證**：真實 AI 口說評分（he/she 第三人稱提示詞）、真 iPad、實際聽聲音。正式站沒有用測試學號登入，避免產生資料。
  - 埃及站動畫顯示「製作中」，之後補上 `web/video/hs/egypt.mp4` 再部署 hosting 即可。
- 11/24 10:20 老師：12:30 左右查 Tripo 點數，**補到 3,000 點以上就可以開始埃及 he/she 動畫建模**（先做埃及姊姊）；未到就只回報。已排 12:32 一次性提醒（只在這個對話開著時有效）。
- 11/24 12:32 查 Tripo：餘額仍 **50**（還沒補點），埃及姊姊未建模，帳本已記。
- 11/24 13:37 老師選用 Tripo 圖庫模型當埃及姊姊：NHtea〈cartoon girl 3d model〉（粉紅毛衣＋牛仔褲、黑雙馬尾、T-pose、5173 面），匯出 GLB 2k 花 **5 點**（50 → **45**，帳本已記）→ `tabletop/models/egypt_girl_gallery.glb`。**沒有骨架**（skins 0），要先綁骨架才能演動作。
- 11/24 13:39 老師同意用 Tripo 綁骨架：Recraft 5＋Auto Rig 20（45 → **20**，帳本已記）→ `tabletop/models/egypt_girl.glb`（65 根 Mixamo 骨頭、兩手手指有權重、T-pose、5173 面）。粉紅毛衣＋牛仔褲、黑雙馬尾，跟參考圖 refs/egypt_girl.png 衣服不同（老師接受）。下一步：埃及檢查圖換上她（Colab 先報單位）。
- 11/24 埃及 he/she 場景程式：`tabletop/src/egypt_school_build.py` → `egypt_school.py`（由 kenya_morning.py 產生，照 uk_home_build.py 做法）。EG1 家門口指 7:10 鐘＋姊姊在旁、EG2 和姊姊牽手走路（照 UK3）、EG3 校門鐘 7:30 特寫、EG4 背對鏡頭在校門口拉書包背帶兩下。書包程式做、固定在 Spine2 骨頭上。未渲染；檢查圖估 0.3 單位一輪（含修正約 1 單位），先問老師。
- 11/24 埃及檢查圖第 1 輪 qa/1124-142515（0.33 單位，sheet.jpg 已給老師）：時鐘 7:10／7:30 正確、牽手手距 3.5 mm、姊姊站姿 OK。問題已改：整體太亮太淡（燈 0.40→0.25、太陽 2.4→1.1、牆色加深）、背帶頂端從頭上打光線打到頭→翹在頭髮旁（改肩關節上方 2.2 mm）、牆 0.24 高擋住天空金字塔（降到 0.15、金字塔加高）、書包偏粉紅（加深、口袋改藍）。第 2 輪還沒跑。
- 11/24 下午 埃及第 2 輪檢查圖還沒跑：Colab 要 G4、L4 都回 503 Service Unavailable（沒有扣單位，餘額 119.93）。改好的 egypt_school.py 等 Colab 有空再跑：`python src/colab_run.py light egypt_school "EG1 30,130" "EG2 0,48" "EG3 40" "EG4 20,44"`。

### 11/24 傍晚交接（老師關機）— 下次從這裡開始
- **埃及 he/she 動畫進度**：姊姊＝Tripo 圖庫模型 `tabletop/models/egypt_girl.glb`（已綁骨架）。場景程式 `tabletop/src/egypt_school_build.py` → `egypt_school.py`（改了就重跑 build）。第 1 輪檢查圖 qa/1124-142515（0.33 單位，已給老師），四個問題已改進程式；**第 2 輪還沒跑**（Colab G4／L4 503，沒扣單位；16:53 提醒因關機取消）。
- **下一步**：開機後先問老師可否跑第 2 輪（約 0.3 單位，老師 11/24 已同意這輪）→ `cd tabletop; python src/colab_run.py light egypt_school "EG1 30,130" "EG2 0,48" "EG3 40" "EG4 20,44"` → 做 sheet.jpg 自己先看（亮度、背帶貼肩、天空與金字塔、書包紅色、牽手）→ 給老師 → 正式渲染（約 1.3 單位，先報）→ `hs_compose.py` 要加 egypt（EG1 7.4 q0.4 a4.4／EG2 4.0 walk0.3／EG3 3.4 starts0.3／EG4 3.8 bag0.3）→ 試片 → 定案後放 `web/video/hs/egypt.mp4`、publish_to_site、比對線上、老師同意才部署 hosting。
- **Tripo 餘額 20 點**（今天花 30：圖庫下載 5、Recraft 5、Auto Rig 20），帳本已記。Colab 今天用 0.33 單位。
- **今天全部未 commit**：網站 he/she 程式、專案 he/she 腳本、egypt_school*.py、HANDOFF、共用踩坑規則 §19。收工時一起 commit（不含 mp4／圖片／glb／YT 資料夾／skills）。
- he/she 網站已上線（`/world-routines-he-she`，首頁沒入口）；老師要用自己的學號試 AI 口說評分，結果還沒回報。
- 新踩坑寫進 `tools/動畫共用踩坑規則.md` §19（7 條），短版已同步到 11 份影片 skill。
- 11/24 17:00 埃及檢查圖第 2 輪 qa/1124-165755（0.10 單位，sheet.jpg 已給老師）：背帶已貼肩（不再翹在頭髮旁）、天空和金字塔露出來、畫面比較不刺眼、口袋藍色。還可改：金字塔頂端被畫面上緣切掉（只看到下半）、EG4 書包在陽光下仍偏橘粉、整體仍偏淡。等老師意見。
- 11/24 17:20 埃及檢查圖第 3 輪 qa/1124-171725（顯示 0.00 單位，同一台主機）：牆 0.13、金字塔整個三角形露出、天空加藍、牆地加深、書包改深藍＋橘黃口袋（紅色在陽光下一直偏粉橘）。已給老師，等確認後正式渲染（約 1.3 單位，先報）。
- 11/24 18:05 埃及 he/she 正式渲染（老師同意）：qa/1124-173543（EG1 90 格，0.64）、1124-175357（EG2 49＋EG3 42，0.48）、1124-180319（EG4 46，0.33），共 1.45 單位。hs_compose.py 加 egypt → `tabletop/out/hs_egypt.mp4`（18.6 秒、−16 LUFS、5.6 MB）＋`web/video/hs/egypt.mp4`（720p，**未部署**）。抽格 qa/eg_film_check/film_sheet.jpg。試片 v1 已給老師，待定案。注意：EG2 走路距離短（2 秒約走 6 cm）、EG3 字幕蓋到時鐘下緣。
- ✅ 11/24 老師：**埃及 he/she 試片 v1 定案**（`tabletop/out/hs_egypt.mp4`、網站 `web/video/hs/egypt.mp4`）。he/she 十站動畫全部定案。網站埃及站目前顯示「製作中」，要 publish_to_site＋比對線上＋老師同意才部署 hosting。
- ✅ 11/24 18:44 **埃及影片部署完成**（老師說「要把埃及影片部署到網站」）：publish_to_site → C 槽副本 build（index-D3Fp-jST.js 與線上相同）→ 比對線上（最後發布 11/24 09:51 自己部署，1,306 檔全同，只差新增 video/hs/egypt.mp4）→ 只部署 hosting（release 65b1e82d900eeb03）→ verify_live_hs.py 81/81 逐位元組相同、三個網址 200。he/she 十站動畫全部上線；首頁仍無 he/she 入口。
