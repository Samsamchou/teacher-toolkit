# Authentication 登入修復追蹤 / Login follow-up

日期：2026-09-10

- 教師在正式站六碼登入時提供 `auth/configuration-not-found` 截圖；此前 Hosting HTTP 200 與 malformed-login 測試不能代表有效登入已通過。
- 使用既有管理登入查詢 `gamesinclass-5d9d1` Authentication config，確認 HTTP 404 `CONFIGURATION_NOT_FOUND`。
- 執行受控修復：先查 config，僅在明確 404 缺少設定時呼叫 `identityPlatform:initializeAuth`。該次執行收到暫時請求錯誤，未能取得完整成功回應。
- 重試先查 config 時已為 HTTP 200，故重試沒有再初始化。讀回名稱為 `projects/589098060734/config`，authorizedDomains 包含 `gamesinclass-5d9d1.firebaseapp.com` 與 `gamesinclass-5d9d1.web.app`。
- 可確認 Authentication 設定現在存在；因首次呼叫回應不完整，不單憑重試結果斷言設定建立者。
- 有效六碼登入、登出與圖片讀寫仍須教師親自操作。未讀取或保存教師通行碼、Secret 值或登入 token；未更改六碼驗證流程、Hosting 或資料規則。

下一步：重新整理 https://gamesinclass-5d9d1.web.app，教師親自輸入通行碼登入，進入管理區後登出，再確認回到登入畫面。

## 2026-09-10 正式發布後查驗
- 最新 Hosting 發布成功，16 檔案線上雜湊皆與建置相同。
- Authentication 公開設定再次查驗 HTTP 200，正式站網域正確。
- 六碼登入畫面已正常顯示，登入 API 方法與格式檢查通過。
- 正確六碼登入及登出仍待教師親自驗證；未變更通行碼。詳見 DEPLOYMENT-20260910.md。

## 教師正式驗收通過（2026-09-10）
- 教師在要求「使用原六碼登入，再登出一次」後回覆「成功」。
- 驗收結果：正式站六碼通行碼登入及登出通過，先前待教師驗證項目已完成。
- 依據為教師親自操作回報；未讀取、記錄或變更通行碼。
