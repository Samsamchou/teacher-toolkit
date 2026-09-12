# Classroom Club 正式發布：Spin, ask, answer, do and roll

日期：2026-09-12。使用者明確授權：「開始正式部署」。

- 正式網址：https://gamesinclass-5d9d1.web.app
- Firebase project／Hosting site：`gamesinclass-5d9d1`。
- 範圍：Hosting；新增轉盤問答動作骰子遊戲、Comic Relief、多巴胺介面、大字分數、當前組別亮黃上下浮動、9個固定美式0.8倍朗讀音檔與8個原GIF。
- 否定句朗讀僅「No, it isn't. It's…」，不讀出星期答案。
- 原六碼登入、Cloud Function、Firestore及Storage規則未修改／重新部署。

## 發布證據
- 全新發布副本：`C:\Users\User\AppData\Local\Temp\gsg-release-spin-20260912-170156`，從本專案最新來源複製。
- `npm test`：30/30通過；`npm run build`：通過。
- 正式JS：`assets/index-CF-FbeJ4.js`；CSS：`assets/index-C4KRn1X3.css`。
- Firebase CLI 15.23.0：`firebase deploy --only hosting --project gamesinclass-5d9d1 --non-interactive`。
- CLI回報49個發布檔、upload complete、release complete、Deploy complete，exit 0。
- 發布後49/49線上檔案均HTTP 200且SHA-256與本次dist一致；包含字型、圖片、GIF和語音。
- 首頁HTTP 200、SPA fallback內容一致；nosniff、DENY及strict-origin-when-cross-origin安全標頭符合設定。
- 登入API GET為405（方法防護）；此項不代表有效通行碼登入驗收。
- 隔離Edge讀取正式首頁，六碼登入框正常，無JavaScript頁面錯誤；未輸入或存取通行碼。

## 驗證檔案
- `qa/spin-production-20260912/files.json`：49檔URL相對路徑、狀態與雙方雜湊。
- `qa/spin-production-20260912/browser.json`、`login-page.png`：正式站登入頁證據。
- 本機玩法驗證沿用完整12回合、骰子1／6端點、八任務不重複、8秒慶祝、0.8倍朗讀與回合高亮的既有QA紀錄。

## 交付
- 教師以原六碼通行碼登入，從首頁開啟「Spin, ask, answer, do and roll」。
- 本次沒有自動登入後測試；實際教室喇叭／投影／觸控仍以教師使用為準。
- 先前文件中的「尚未部署」是本次發布前的歷史狀態，現已由此紀錄取代。
- 本次尚未commit/push，也未執行Obsidian收工同步。

## GIF 置中放大更新（2026-09-12，已正式發布）
- 使用者授權：「更新至正式網站」。僅更新 Hosting。
- 八個原始 GIF 共用置中放大版面，操作按鈕移至右下；投影尺寸 1024×768 圖卡高約 432 px，較前版增加約 22%。
- 發布副本：C:\Users\User\AppData\Local\Temp\gsg-release-gif-centered-20260912。
- 正式建置成功；JS assets/index-BUt4WO85.js；CSS assets/index-vjjpE0k4.css。
- 部署程序的終端工作階段在後續訊息後無法讀回最終輸出，因此以發布後線上檔案核對確認結果。
- qa/spin-task-production-20260912/files.json：49/49 檔案 HTTP 200、SHA-256 全部與新版 dist 一致；首頁 200、SPA fallback 與安全標頭正常，登入 GET 防護 405。
- 登入後版面與任務流程沿用本機四種尺寸 QA；此次未使用教師通行碼登入正式站。
- 本節取代 SPIN-REDESIGN-20260912.md 最新「尚未更新正式站」狀態。尚未 commit/push。
