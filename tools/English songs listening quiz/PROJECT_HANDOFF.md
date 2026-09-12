# 專案交接 / Project handoff

2026-09-12：正式工作目錄已移至此 GDrive 子專案，C: 原始 14 檔保留作搬移前復原快照。
搬入前目的資料夾為空；14 檔 SHA-256 全部一致，詳見 docs/MIGRATION.json。該雜湊是修改前基線。
沿用父層 teacher-toolkit 的 main 分支及既有 remote，未建立巢狀 Git、未 commit/push。

## 目前實作
- public/index.html 維持單一檔案：年級首頁、五年級歌單、六年級待加入、Yesterday Once More 練習。
- hash 連結支援重新整理與瀏覽器上一頁；作答中返回會保留進度並暫停，需完成後再離開。
- 老師複製的學生連結直接進入歌曲練習。
- 15 題沿用草稿；題庫與時間尚待教師驗收。

## 下一步
1. 在此資料夾繼續本機修改與新增教師提供的歌曲。
2. 核對題庫、時間軸、真實 iPad、Firebase Auth 與跨裝置成績。
3. 最後才部署至使用者指定 Firebase 專案 yestredayoncemore（拼字照使用者提供）。尚未讀取專案設定或部署。
4. 課堂流程與部署驗收穩定後，將 docs/SKILL_WORKFLOW_NOTES.md 整理為正式 Skill。

## 2026-09-12 原句挖空需求確認
- rdq/RDQ-spec-listening-cloze-20260912.md 已 confirmed；老師已確認全部假設。
- review/yesterday-once-more-review.json 與題庫審閱準備表已建立，僅第1句有老師原文，尚缺其餘原句。
- 下次取得歌詞後直接補齊教師審閱題庫，不重跑需求訪談；題庫核准後才改學生頁。

## 2026-09-12 已收到完整歌詞並完成題目審閱版
- 老師已提供原文，不再要求提供歌詞。review/Yesterday-Once-More-15題教師審閱版-v1.md 與 yesterday-once-more-cloze-review-v1.json 已完成15題內容及45選項證據。
- 30個誘答按詞根核對基本1200字；memory 目標詞根在其他800字，已明示。
- 影片無字幕軌；15組時間只為其他LRC參考定位，正式 start/end 仍為 null，未完成指定影片校時。
- 下一步：老師審閱題庫内容；完成實際影片校時後再改學生頁。不要把參考秒數當已驗證。

## 2026-09-12 校準與未完成成績更新
- review/yesterday-once-more-cloze-review-v2-calibrated.json：15題實際音訊自動定位完成，教師試聽／內容核准仍為false。/review為可操作新版預覽，首頁內建舊題庫尚未替換。
- public/index.html 已加入連續歌曲、每題2次、無限重播、逐次保存、提前結束與教師總分優先的錯題明細。
- Firestore採不可變進度文件，後台同一次練習取最新revision；離線待送保存在localStorage。
- README、rules與測試已同步更新。不部署、不commit/push、不建立正式Skill。

## 收工 2026-09-12
- 已保存15題自動校準v2、原句／選項／字表證據、教師後台總分優先與未完成練習成績。
- 15題真實YouTube暫停與全曲結尾測試通過；規則模擬器157項通過；教師仍需試聽，尤其radio與相鄰句界。
- 正式首頁仍保留舊題庫；新版請用 node server.mjs 啟動後開 /review。審閱HTML不在Firebase Hosting public目錄。
- 下次先教師審閱15題與時間；核准後更新正式題庫，再測實體iPad與Firebase跨裝置成績，最後另行部署。
- 本次收工只同步此子專案；其他工具的變更保留。Git最終結果記錄於Obsidian工作筆記。

## 2026-09-12 開工核准與顏色回饋
- 使用者已明確核准37檔commit/push到既有origin/main，並核准15題。正式首頁已換成cloze-v2。
- 選錯紅色✗、選對綠色✓；結案回饋0.9秒後續播，延遲中鎖定選答，提前結束取消延遲。
- 實體iPad與正式Firebase仍待驗收；此次不部署Firebase。

## 2026-09-12 正式部署完成
- 使用者本輪明確核准15題、37檔commit/push，並追加「本機完成後直接部署正式Firebase」。
- 正式網站：https://yestredayoncemore.web.app 。Hosting及Firestore規則已部署成功，線上HTML與本機SHA-256一致：e0d65e2deb4bf9a6ceb1bd257728784078aa8e4fee26e9e1a9914967d5095dcf。
- 正式瀏覽器驗證：15題核准題庫、錯誤紅色、正確綠色、第二次答對保留滿分；答對1題提前結束顯示6.67分、未作答14題，成績取得伺服器確認；匿名讀取被拒絕，無頁面JS錯誤。
- 驗證使用獨立quizId deployment-check-20260912，未混入正式cloze-v2排行榜。未登入或修改老師密碼；真實教師登入操作及實體iPad仍待使用者驗收。
- 本輪Git推送結果與commit hash另寫入既有Obsidian工作筆記，其他工具不納入。
