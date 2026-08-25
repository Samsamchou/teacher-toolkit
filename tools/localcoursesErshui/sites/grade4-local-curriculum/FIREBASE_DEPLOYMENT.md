# 四年級在地課程｜Firebase 部署與維護

## 專案與部署目標

- Firebase project：`hwg8-u01-listen-and-speak`
- 計費方案：Blaze
- Hosting：專案預設 Hosting Site
- 正式網址：`https://hwg8-u01-listen-and-speak.web.app`
- 前端輸出：`firebase-dist`
- 資料：Firestore `tickets-v2`
- 檔案：Storage `tickets-v2/{uid}/{attemptId}/`
- Functions region：`asia-east1`
- 保存期限：一年

本部署會更新預設 Hosting Site。部署前先使用 Firebase Console或CLI確認目前版本；Firebase Hosting Release history可執行回復。

## 第一次啟用

1. 以專案擁有者帳號重新授權：

   ```powershell
   firebase login --reauth
   firebase use hwg8-u01-listen-and-speak
   ```

2. Firebase Authentication啟用Anonymous；教師登入由受App Check保護的Callable Function核發Custom Token。

3. 不需要建立或公開教師電子郵件帳號。共用教師身分由後端以固定UID建立，並只核發`teacher: true`權限。

4. 確認 Cloud Storage for Firebase 服務帳號
   `service-267653243310@gcp-sa-firebasestorage.iam.gserviceaccount.com`
   同時具有以下兩個角色：

   - Cloud Storage for Firebase 服務代理
   - Firebase 規則 Firestore 服務代理

   第二個角色是 Storage 規則讀取 Firestore 擁有權紀錄所必需。

5. 設定教師密碼Secret；請在CLI互動提示中輸入，不要把密碼寫入命令、程式或文件：

   ```powershell
   npx.cmd firebase functions:secrets:set TEACHER_PASSWORD
   ```

   `activateTeacherAccess`會以固定時間比較驗證Secret，15分鐘內錯誤5次會鎖定15分鐘；成功後核發短效Custom Token，登入只保留於目前瀏覽器工作階段。

6. Firebase App Check：

   - 在Firebase Console為Web App設定reCAPTCHA Enterprise。
   - 將網站金鑰寫入`firebase-app/.env.production.local`：

     ```text
     VITE_FIREBASE_APPCHECK_SITE_KEY=網站金鑰
     ```

   - 先觀察App Check Metrics，再對Firestore、Storage、Authentication與Functions啟用強制執行。

## 建置、測試與部署

```powershell
npm.cmd install --cache .npm-cache
npm.cmd --prefix functions install --cache ..\.npm-cache
npx.cmd tsc --noEmit --pretty false
npm.cmd run firebase:test
npx.cmd firebase deploy --only hosting,firestore,storage,functions
```

若只更新前端：

```powershell
npm.cmd run firebase:build
npx.cmd firebase deploy --only hosting
```

## 安全設計

- 學生以Firebase Anonymous Auth寫入自己的紀錄。
- 學生不能列出其他學生資料。
- 教師讀取、匯出、開啟PDF及刪除紀錄都需要`teacher: true`。
- 教師登入頁只有遮蔽密碼欄；Secret不進入前端、Git、Firestore或應用程式日誌。
- 教師登入Function強制使用App Check，並有每個匿名工作階段的錯誤次數限制與暫時鎖定。
- Firestore與Storage採預設拒絕。
- 學號限五位數；不收姓名、電話、身分證、信用卡或臺鐵會員資料。
- PDF上限20MB；無聲錄影上限80MB。
- `cleanupExpiredTicketAttempts`每日03:15（Asia/Taipei）刪除到期檔案及Firestore子集合。
- Firestore `expiresAt`同時設為TTL保護；排程Function負責Storage與子集合的完整清理。

## 教材資料

- 車次來源：國營臺灣鐵路股份有限公司列車時刻／車次查詢。
- 查證日期：2026-07-29。
- 09:00–12:00應只顯示2707、2711、2713。
- 集集、水里、車埕抵達時間分開儲存在`firebase-app/src/schedule.ts`。
- 班次改點時只更新該檔案，重新執行測試與部署。

## 驗收

- iPad直式及橫式無水平溢位。
- 日期只顯示最近尚未經過的週五、週六、週日。
- 目的地切換後，抵達時間、行駛時間、摘要及練習票同步。
- 核對摘要顯示日期、車種車次、出發及抵達實際值，資料缺漏時不可勾選。
- 練習車票左欄為DATE／TRAIN，FROM下方為DEPART，TO下方為ARRIVAL，STUDENT位於右下角，沒有CAR／SEAT。
- 完成後產生7頁PDF、100分與慶祝動畫。
- PDF暫時無法同步時，可按「重新同步給老師」，不必重做七個步驟。
- 教師後台可依日期與學號篩選、重播事件、查看PDF及匯出CSV。
- 教師只需輸入遮蔽密碼即可登入；未授權工作階段不能讀取教師資料。
