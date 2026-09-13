# Animal Basketball 正式發布（2026-09-13）

使用者授權：「正式部署」。

- 正式網址：https://gamesinclass-5d9d1.web.app
- Firebase project／Hosting site：gamesinclass-5d9d1。
- 本次只部署 Hosting，保留既有登入服務、通行碼與資料規則。
- 發布副本：C:\Users\User\AppData\Local\Temp\gsg-release-basketball-20260913。
- 本次包含完整動物投籃、自由選組、六角色待機晃動、球場合成音效及 6.6 秒結算音效。
- 獨立副本 52／52 測試通過，Vite 正式建置成功；保留既有大 bundle 提醒。初次測試副本漏複製 functions/pin.mjs，補入該既有純程式後重跑通過，未更動或存取通行碼。
- 正式 JS：assets/index-pel40aLb.js；CSS：assets/index-7zzo105_.css。
- 執行 firebase deploy --only hosting --project gamesinclass-5d9d1 --non-interactive；CLI 回報 57 檔、release complete、Deploy complete，exit 0。
- 發布後 57／57 線上檔案 HTTP 200 且 SHA-256 與本次 dist 一致。首頁／SPA fallback 正常；nosniff、DENY、strict-origin-when-cross-origin 標頭正常，登入 GET 為 405。
- 瀏覽器正式站六碼登入頁已正常顯示，未見 console error。未輸入通行碼，因此不宣稱本次已完成有效登入後的正式遊戲流程驗收；本機遊戲流程驗證見實作紀錄。
- 線上檔案證據：qa/basketball-production-20260913/files.json；瀏覽器證據：同目錄 browser.json。
- 本次未 commit／push 或執行 Obsidian 收工同步。先前文件的「尚未部署」為歷史狀態，由本紀錄取代。
