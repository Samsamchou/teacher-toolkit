# Spin 改版正式部署（2026-09-15）

使用者授權：「部署至正式站」。正式網址：https://gamesinclass-5d9d1.web.app 。

- Firebase project/site：gamesinclass-5d9d1；僅 Hosting。
- 功能：八個 GIF 中央動作區放大、老師每回合自由選組且每組一次、大轉盤置中、六秒持續旋轉聲與落點提示。
- 為保留其他遊戲線上版本，以正式 ten-group 發布版作基底。從 Git 已提交來源重建確認 JS/CSS 雜湊相同，HTML 僅換行不同，再套用 Spin 專用檔案。
- 本地 UnscrambleLive.jsx、unscramble.css、UnscrambleSound.jsx 與 unscramble-audio.mjs 的未發布調整未包含在此次發布。
- 發布副本：C:/Users/User/AppData/Local/Temp/gsg-release-spin-refresh-20260915。
- 建置通過；Firebase CLI 發布 57 個檔案，release complete／Deploy complete，exit 0。
- 正式 JS：assets/index-DBSqxO3c.js；CSS：assets/index-ixkLB9z6.css。
- 首頁、JS、CSS 均 HTTP 200，SHA-256 與本次 dist 完全一致；八個 GIF HEAD 均 200。
- 新 Edge 工作階段：登入欄位可見、無 JavaScript 執行錯誤；/unscramble 與 /join 為 200，活動 API GET 為 405。未登入教師帳號或執行正式遊戲操作。
- 57 個檔案的全量下載核對因大型媒體逾時未完成；不可宣稱 57/57 完整雜湊驗證通過。改版功能已有本機 60 項測試、36 次自由選組流程、五尺寸、六秒訊號及八 GIF 原檔雜湊 QA。
- 證據：qa/spin-refresh-production-20260915/core-files.json、browser.json、login.png。
- 未重新部署函式、規則或 Secrets；尚未 commit/push 此次改版。
