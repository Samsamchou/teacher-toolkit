# 正式部署驗證 2026-09-10

- 使用者已驗收角色修改，明確授權部署到 Firebase 正式站；RDQ 零題，延續已確認範圍。
- 專案／Hosting：gamesinclass-5d9d1
- 正式站：https://gamesinclass-5d9d1.web.app
- 發布範圍：Hosting（新增淨灘遊戲、第二版塑膠袋、肩膀與撿拾動作修正）。後端與資料規則無差異，沿用現行版本。
- firebase deploy：Deploy complete / release complete，exit 0。
- 20 項測試通過；Vite 正式建置通過。
- 線上 16 個檔案全部 HTTP 200，SHA-256 與本次 dist 相同。
- 主程式：assets/index-BljnN--W.js；樣式：assets/index-p-UkTmbF.css。
- SPA fallback 200；安全標頭符合設定。
- 登入 API：GET 405、空資料 POST 400，符合既有驗證規則；不代表有效通行碼已驗收。
- Authentication 公開設定即時讀回 HTTP 200，authorizedDomains 包含 gamesinclass-5d9d1.firebaseapp.com、gamesinclass-5d9d1.web.app。
- 正式瀏覽器已顯示六碼登入頁，沒有 configuration-not-found 訊息。
- 尚待教師：親自輸入正確六碼登入，確認遊戲首頁，再登出並確認回到登入頁。未讀取或變更通行碼，未擷取憑證。
- 本次未 commit/push。

## 教師正式驗收通過（2026-09-10）
- 教師在要求「使用原六碼登入，再登出一次」後回覆「成功」。
- 驗收結果：正式站六碼通行碼登入及登出通過，先前待教師驗證項目已完成。
- 依據為教師親自操作回報；未讀取、記錄或變更通行碼。
