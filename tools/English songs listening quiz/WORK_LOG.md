# 2026-09-12 初始化與首頁修改驗證

- 來源搬入 14 檔，修改前 SHA-256 全部相同；原 C: 版本保留作復原快照。
- 正式工作目錄：G:/我的雲端硬碟/teacher-toolkit/tools/English songs listening quiz。
- 初始化完成 agent.md、.gitignore、PROJECT_HANDOFF.md、docs/MIGRATION.json、技能流程筆記；沿用父層 Git，未 commit/push。
- 9 項核心測試全部通過。
- Edge 瀏覽器驗證：首頁 → 六年級空歌單 → 返回首頁 → 五年級歌單 → Yesterday Once More → 重新整理仍在練習。
- 模擬影片完成 15 題、100 分、錯誤題庫拒絕、下一位同學、768px 平板無水平溢出，全部通過，無頁面 JS 例外。
- 真實 YouTube 在新 G: 來源的 localhost:8001 成功載入與啟用。題庫校時及實體 iPad 仍待驗收。
- Firebase 預定目標 yestredayoncemore 僅記錄於文件；沒有部署、取得專案 Web config、建立帳號或修改雲端資料。
- 本機预覽：node server.mjs（預設 8000）；本次因既有快照伺服器使用 8000，新版使用 PORT=8001。
- 新年級首頁截圖：docs/grade-home-preview.png。舊 preview-*.png 與 TEST-REPORT.md 是搬移前單曲版本證據。

2026-09-12：完成15題兩輪音訊自動對齊審閱版；加入逐題保存與教師總分、正誤題數、錯題原句。保留題庫教師核准門檻。

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
