# 六關英語冒險與分配後台 — 收工交接 / Closeout

- 收工時間：2026-10-15T14:37:22+08:00（Asia/Taipei）。狀態：SAVED_VERIFIED_GIT_PENDING_SCOPE。
- 正式站：https://lesson-hub-v03.web.app/lab；公開手冊：https://lesson-hub-v03.web.app/survivors/v1/manual.html。
- 工作根目錄：G:/我的雲端硬碟/teacher-toolkit/tools/English Lesson Hub HWG。
- 最新部署已完成；本文件與HANDOFF最後段落取代本案較早「未部署／尚待授權」狀態，舊紀錄保留。

## 本次完成 / Delivered

- 純題組分配：名稱、截止時間、測驗／練習、題序依序／隨機、選項原序／隨機、學號加入；教師即時答對率排行、座號排序、個人逐題／逐次與正確／部分正確／錯誤／未作答。
- Spell the word亂序字母、退回與無限重試；Comic Relief字型、動畫與音效。測驗保留首次成績；練習其餘題型首次加3次重試共4次，取最高分並產出總分。
- 首次完全答對提交次數第1／2／3／4次給4／3／2／1級獎勵；拼字第5次起普通獎勵。學習分數與遊戲分數分開。
- 完整Godot六關、道具逐關增加與難度略升、華麗總分／遊戲結果；作答與闖關獨立畫面切換、固定操作列、長題內容捲動。
- 14種本機合成音效、6關背景音樂，音量／音樂／靜音；手冊v05及Web／Godot下載包。原單關、v04、圖片／來源及QA保留。

## 正式版本與驗證 / Release and evidence

- Firebase hwg7teaching；Hosting lesson-hub-v03；sites/lesson-hub-v03/versions/c4e7cea861957728；2026-10-15 13:27:04發布（Asia/Taipei）。
- liveV2：livev2-00016-bet；liveAudioV2：liveaudiov2-00004-tep；liveMediaV2：livemediav2-00007-zez；liveRetentionV2：liveretentionv2-00003-git。收工時4個均ACTIVE、latestCreated與latestReady相同。
- 發布時275網站、10Functions、11模擬器整合與正式建置／發布gate通過；189/189正式檔HTTP200／SHA一致，3個SPA入口正常；4個實際部署來源各41檔一致。其他9個Functions未變。
- 收工再次抽查9個公開檔案＋3入口、目前Hosting版本與4個後台Ready；413/413已發布來源與2ZIP及前端封存雜湊一致。收工沒有重跑完整回歸或30項Godot戰鬥；保留已通過證據。
- Web ZIP：17,444,802 bytes／40 entries；SHA256 d46ad7a48d7c3198a165d868c324515c0c93b543b2c94654e89990cd3c80469e。
- Godot ZIP：32,638,934 bytes／45 entries；SHA256 080bb63bf9d84abc1eedb2c67bbfa48c6ec815a052127f4a3d2e75a1abc946b0。
- release-dist.zip：96,674,635 bytes／189檔；SHA256 ece9e0d53ae972f167da6d94486f427938b46ffafa055c4b0d571ac0f091582b。
- 證據：../qa/survivors-production-20261015/verification.json、production-readback.json、closeout/production-sample.json、closeout/git-and-files-audit.json。

## 三處保存狀態 / Save status

| 平台 | 實際結果 |
|---|---|
| GDrive | 本專案來源、手冊、下載、正式證據與本收工文件已保存讀回；掛載端驗證，雲端服務端同步未獨立驗證。 |
| Obsidian | G:/我的雲端硬碟/secondbrain/teacher-toolkit/工作筆記.md四區追加讀回；移除4段插入內容可逐位元還原原349,213 bytes，frontmatter／其他內容不變。 |
| GitHub | 未stage／commit／push；本機與origin/main均88f2fdba89a4fdde3d7c2f3a319fa28c5268f393，main索引空。316檔提交提案待明確範圍確認。 |

- Git盤點快照（新增收工文件前）：normal模式935筆＝本專案156＋其他779；展開本專案1850檔，其中35個追蹤檔修改。目錄合併與展開計數不同，勿混用；QA新增可能使最後總數改變。
- 精準候選：314個目前已變更的發行基線／六關來源＋本收工與GIT-SCOPE兩份文件；詳見GIT-SCOPE-survivors-20261015.md與closeout/suggested-git-scope.json。含前次尚未提交的必要模組，需確認整體範圍，不是314檔都在今天新寫。
- 排除其他專案、env／憑證／本機設定、node_modules、QA、壓縮包、影片、其他教材、原單關等；不將父repo整批提交。沒有修改remote、Git設定或歷史。
- diff檢查exit2來自既有3處EOF空行：preview/scripts/verify-media-focus.cjs:71、preview/src/live/ImageSearch.jsx:91、preview/tests/live-v2.test.mjs:299；保留未重排。CRLF以core.whitespace=cr-at-eol檢查。

## 下次接續與人工驗收 / Next

1. 先讀本文件、HANDOFF-six-level-20261015.md、DEPLOYMENT-survivors-assignment-20261015.md與godot/english-survivors-six-level-20261015/製作手冊-v05.md。來源在G槽，勿用未核對的舊Temp／dist再發布。
2. 教師本人登入正式後台，用自己的題組建立分配，設定名稱／期限、兩模式與排序；PIN僅本人在VS Code終端機輸入，不在聊天、檔案或log保存。
3. 學生實際作答，核對首次及第2／3／4／拼字第5次以上獎勵、練習最佳分／測驗首次分、六關與華麗結果；教師核對排名／座號排序／逐題部分分。
4. 實體iPad／Safari、校網、觸控、下載及教室喇叭／音量待教師驗收；真實私人題組、學生提交與付費AI錄音未由匿名檢查驗收。
5. GitHub需先確認316檔提案，重新檢查內容／依賴與雜湊，使用精確路徑提交；不擴張至父repo其他變動。

## 已知限制與踩坑 / Boundaries

- 自動核准審查曾拒絕匯出生產env值至Temp，該操作未執行；改用Firebase原生保留各函式設定，在記憶體比對，僅保存布林及鍵名。HTTP callable新增預期FUNCTION_SIGNATURE_TYPE，原LIVE值／Secret參照一致後才發布。
- 未新增正式課程、學生答案、付費AI呼叫、Secret或規則／Worker／其他Hosting變更。收工未重新部署、生成圖片或產生付費資源。
- 原網站課堂Teacher-led的既有重試／獎勵規則保留；本文件4次／分級獎勵指新分配練習模式。
- 電腦、本機預覽與其他工作保持運作；本次收工不執行電源或程序關閉操作。
