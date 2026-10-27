# HWG7 SU-U02 Phonics — 2026-10-15 交接

## 本次完成
- 使用者已確認「照這份開始，建議全部採納」。新增正式教師題組 **HWG7 SU-U02 Phonics**：36 題、100 分，雲端 v1，獨立 ID `b5307d88-dffc-4501-a148-ddab272a164c`。
- 正式入口：https://lesson-hub-v03.web.app/lab 。教師登入後在課程庫開啟同名題組即可編輯／分配；本輪沒有建立正式學生分配。
- 前 18 題單字辨聽、後 18 題音組辨聽，每類 50 分。每題一個原 MP3、三個文字選項，題幹 **Listen and choose.**、Comic Relief。
- **練習模式** 首次＋3 次重試共 4 次提交，採各題最高分，錯誤不倒扣，36 題最後全部答對為 **100 分**。遊戲道具品質仍依首次答對提交序決定。測驗模式保留首次提交規則。
- 24 個原音檔以私有素材保存並讀回；原 8 份課程、51 個來源檔與現有程式內容保留。

## 檔案與驗證
- 題庫／音檔／正解來源：`question-bank/hwg7-su-u02-phonics-20261015/`。
- 教師可讀表：`teacher-review.md` 與 UTF-8 BOM `teacher-review.csv`。
- 需求：`rdq/RDQ-spec-hwg7-su-u02-phonics-20261015.md`；證據：`qa/hwg7-su-u02-phonics-20261015/QA-REPORT.md`。
- 16 份全卷計分情境均 100/100；24 MP3 瀏覽器解碼通過；合成本機學生實際 UI 全卷 36 題完成、第一題第四次才答對，最後 **100/100**，教師後台首次 0／最高 2／4 次提交保留。
- 本機預覽 http://127.0.0.1:5207/lab （含合成報表），完成頁 http://127.0.0.1:5207/lab?assignment=422057 （合成 50110）。不可把本機 `.live-lab` 或驗收分配上傳正式。

## 目前程式狀態與下一步
- 本次只新增課程內容，沒有部署 Hosting／Functions；正式程式維持既有 v05。上一輪 v06 大小寫／片語／慶祝音效／後段時間修訂仍為本機已驗證、尚未部署，詳見 `HANDOFF-six-level-20261015.md` 最新 v06 段落，勿重做或誤稱已上線。
- 本次沒有修改既有 35 個追蹤變更檔，沒有 Git stage／commit／push 或 Obsidian 寫入；先前 Git 範圍提案若要提交必須重新盤點。
- 下一步：教師在正式庫檢視同名題組；分配選 **練習模式**，再決定順序／隨機題目與原始／隨機選項、遊戲模式、名稱與期限。
- 正式教師登入後音檔播放、實體 iPad／Safari／校網／喇叭與命題難度尚待教師驗收。此次雲端保存與讀回已通過，未代替上述現場接受。


<!-- spell-results-production-20261015 -->
## 2026-10-15 v06 已正式部署
- 本輪使用者「部署正式站」授權後，已先更新 liveV2 **livev2-00017-hig**／Ready，再發布 Hosting **sites/lesson-hub-v03/versions/420627ea43cda9fe**。正式入口 https://lesson-hub-v03.web.app/lab 。本段取代先前 v06 未部署／正式仍v05的狀態。
- 上線：大小寫拼字與片語空格、7.8秒勝利音效、大字學號並列、六關15／17／19／21／23／25秒；手冊v06與兩下載包狀態同步。舊題快照／歷史成績保留。
- 289 Node、正式 gate／建置通過；193/193 HTTP／SHA、41 後台來源、441來源讀回、其他12 Functions未改。9份課程與Phonics36題／100分／24音檔前後完全相同。
- 詳見 rdq/DEPLOYMENT-spell-results-20261015.md 與 qa/spell-results-production-20261015/。原文件／ZIP已備份，assets內28個素材相關檔不變。
- 待教師本人登入私人題組及實體iPad/Safari、校網／觸控／喇叭驗收；本輪未Git提交推送／Obsidian寫入。先前Git範圍提案須重新盤點。
<!-- /spell-results-production-20261015 -->


<!-- lesson-hub-v06-phonics-closeout-20261015 -->
## 最新收工 / Closeout — 2026-10-15T21:00:41+08:00

- 最新正式版：https://lesson-hub-v03.web.app/lab；Hosting 420627ea43cda9fe（2026-10-15 19:26:19台灣）；liveV2 livev2-00017-hig。此段取代本案較早未部署或v05段落，保留歷史。
- Phonics 36題、24原音檔、100分已存私人教師題庫；練習首次＋3次重試共4次、錯不扣分、逐題最佳分，全對100分。遊戲獎勵仍依首次全對提交次數分級；測驗首次分。未建立正式學生分配。
- v06大小寫／片語、慶祝音效與學號角色並列、六關15／17／19／21／23／25秒均已部署；手冊製作手冊-v06.md及下載包同步。
- 收工10公開資產（含兩ZIP）／3入口、4後台Ready與441檔有效來源讀回通過；原清冊3個文案修正差異已另存，原證據保留。部署時193資產／41後台與289新跑測試證據保留。
- Obsidian四段追加讀回，原文／frontmatter保留；GDrive掛載檔案已讀回，服務端同步未獨立驗證。
- Git main／origin main均88f2fdba89a4fdde3d7c2f3a319fa28c5268f393，索引空；未stage／commit／push，精確範圍待確認。
- 完整交接：rdq/CLOSEOUT-v06-phonics-20261015.md；Git候選：rdq/GIT-SCOPE-v06-phonics-20261015.md；證據：qa/spell-results-production-20261015/closeout/。
- 下次：教師登入正式後台檢視Phonics與原音、設定分配；驗收實體iPad／Safari與教室喇叭。電腦及其他工作保持運作。
<!-- /lesson-hub-v06-phonics-closeout-20261015 -->
