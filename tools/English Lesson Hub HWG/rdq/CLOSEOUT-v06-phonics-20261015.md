# English Lesson Hub v06 與 Phonics 36題 — 收工交接 / Closeout

- 時間：2026-10-15T21:00:41+08:00（Asia/Taipei）；狀態：SAVED_VERIFIED_GIT_PENDING_SCOPE。
- 工作根目錄：G:/我的雲端硬碟/teacher-toolkit/tools/English Lesson Hub HWG。
- 正式站：https://lesson-hub-v03.web.app/lab；手冊：https://lesson-hub-v03.web.app/survivors/v1/manual.html。
- 最新：Hosting sites/lesson-hub-v03/versions/420627ea43cda9fe，2026-10-15 19:26:19（台灣）；liveV2 livev2-00017-hig。最新HANDOFF收工段落及本文件優先於較早v05／尚未部署紀錄。

## 已完成 / Delivered

- 拼字Chinese／English保留大小寫字母選項與判分，social studies單一詞間空格；new spell-2、legacy spell-1歷史保持；教師輸入中可保留片語空格。
- 結果頁：Comic Relief、放大學號與此次角色並列，CC0 7.8秒慶祝音樂＋掌聲、靜音／重播／阻擋提示；六關遊戲時間15／17／19／21／23／25秒，實際Godot與下載包同步。
- HWG7 SU-U02 Phonics：36題Listen and choose.、18選單字＋18選音組、每題1正確＋2干擾、24來源字全覆蓋、24原MP3合計428861 bytes；各18題配50分，合計100分。每半卷14題3分＋4題2分，答案位置A/B/C均衡。
- 練習每題首次＋3重試共4次，錯不扣分、逐題最佳；第1至4次答對皆得題目滿分，全36題答對100/100。獎勵依首次全對提交次數，學習分不因此扣減；測驗仍保留首次提交分。
- 題組已存liveDecksV2私人教師題庫，ID b5307d88-dffc-4501-a148-ddab272a164c、version 1；原8課程保留、現9課程，24新私人音檔。沒有建立正式學生分配或正式學生答案。
- 題庫：question-bank/hwg7-su-u02-phonics-20261015/；教師檢閱teacher-review.md與CSV；規格rdq/RDQ-spec-hwg7-su-u02-phonics-20261015.md；v06部署rdq/DEPLOYMENT-spell-results-20261015.md。

## 驗證與證據 / Verification

- 發布前新跑289項Node測試與正式build／gate通過；12項模擬器與六關實測沿用相同來源既有證據，收工未重跑全部回歸。
- 發布時193/193公開檔HTTP／SHA、實際liveV2來源41檔通過；其他12Functions、既有9課程、24媒體metadata／Storage generation保留。
- Phonics前後端108選項判分、576完成題情境／1440提交，全正確100；完整36題瀏覽器UI100/100，第4次才正確仍滿分；1024×768與390×844、24音檔解碼、Comic Relief、無水平溢出，Console 0錯誤。這是隔離本機測試，不是正式私人登入／真實學生驗收。
- 本次收工再次抽查10公開檔（含兩ZIP）、3個SPA入口與WASM MIME；liveV2／liveAudioV2／liveMediaV2／liveRetentionV2均Ready，13Functions與發布後相同。
- 441檔來源有效清冊：438符合較早release-source-manifest.json，另外manual.html與兩ZIP為最後一次文案修正，已與最終dist-manifest.json及HTTP雜湊核對。原清冊未覆寫；qa/spell-results-production-20261015/closeout/effective-source-manifest.json與git-and-files-audit.json記錄三檔差異。
- 2ZIP於preview/public/survivors/v1與godot/.../downloads雙份一致；Web 17601515 bytes，SHA256 8abf415a60ed45c7b77cc6e635344ae5c7113519447ba36c63348b078f90e110；Godot 32806467 bytes，SHA256 a7277a3a189685e9e961f5a41ee9afbab50bfaf46642948cd23fd181ea8a90c5。
- 收工證據：qa/spell-results-production-20261015/closeout/production-sample.json、obsidian-verification.json、final-readback.json；Phonics完整證據qa/hwg7-su-u02-phonics-20261015/QA-REPORT.md。

## 保存與同步 / Save status

| 平台 | 實際狀態 |
|---|---|
| GDrive | 來源、題庫、原音、手冊、下載與本交接已保存於原專案並讀回；服務端同步未獨立驗證。 |
| Obsidian | G:/我的雲端硬碟/secondbrain/teacher-toolkit/工作筆記.md四段追加讀回；原354155 bytes及frontmatter保留，移除四段可逐位元還原。 |
| GitHub | 未stage／commit／push；main及origin main均88f2fdba89a4fdde3d7c2f3a319fa28c5268f393，索引空。精確實作候選清單待確認，見GIT-SCOPE-v06-phonics-20261015.md。 |

- Git快照947筆normal＝本專案168＋其他779；本專案35追蹤檔修改。新增QA／交接後展開計數會增加，勿混用目錄合併與展開計數。
- 私人Phonics題庫／答案／來源MP3、雲端收據與QA不在Git候選；其他專案、env／秘密／本機設定、依賴、快取、ZIP及原教材排除。未修改Git remote／設定／歷史。
- diff --check的3處既有EOF空行警告保留（verify-media-focus.cjs:71、ImageSearch.jsx:91、live-v2.test.mjs:299），沒有為收工重排已發布程式。

## 下一步與驗收 / Next

1. 下次開工先讀本文件與HANDOFF最新段落；勿重複建立Phonics或從舊Temp／舊dist再發布。
2. 教師本人登入正式後台，檢視36題與音檔，再設定練習模式、題序／選項順序、遊戲、名稱／期限並建立分配。PIN僅本人輸入，不貼聊天或存檔。
3. 真實學生驗收錯不扣分、第4次正確滿分、全對100、獎勵分級、結果學號角色／慶祝音效；教師驗收排行／座號／逐題部分分明細。
4. 實體iPad／Safari、觸控、校網下載、教室喇叭仍待教師驗收；自動HTTP與音檔解碼不等於實際聽感。
5. Git候選範圍需先明確確認，再讀回差異、雜湊、依賴與敏感資料後精確提交；不以收工擴張至父repo全部檔案。

- 電腦、本機預覽與其他工作保持運作；本次收工沒有重新部署、生成圖片或建立付費資源。


<!-- lesson-hub-approved-git326-20261015 -->
## GitHub精確範圍已確認 / Approved scope — 2026-10-15T21:11:22+08:00

- 教師明確確認：「確認，只同步這份326檔清單到GitHub，其他專案不要動。」本節取代前文對本次326檔仍待範圍確認的狀態；舊紀錄保留為確認前歷史。
- 授權僅限GIT-SCOPE-v06-phonics-20261015.md列出的326個精確路徑，Samsamchou/teacher-toolkit的origin/main；不加入其他專案、私人Phonics題庫／原音／雲端收據、QA、ZIP、環境檔或秘密。
- 程式與已發布來源保持；本次只在清單內4份交接文件追加此授權。核准時雜湊清冊suggested-git-scope.json保留，提交前內容另存qa/spell-results-production-20261015/closeout/git-sync-326/stage-manifest.json。
- 此段保存時尚未執行提交／推送；實際結果以Git提交紀錄、Obsidian工作筆記最新Git同步段落與git-sync-326/receipt.json為準。
<!-- /lesson-hub-approved-git326-20261015 -->
