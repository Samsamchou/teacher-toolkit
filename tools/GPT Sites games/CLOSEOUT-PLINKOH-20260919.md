# Plink-oh 收工交接 — 2026-09-19

已完成 Firebase Hosting 發布：2026.09.19-plinkoh-cards.1。
正式站：https://gamesinclass-5d9d1.web.app/
發布依據：[DEPLOYMENT-PLINKOH-CARDS-20260919.md](DEPLOYMENT-PLINKOH-CARDS-20260919.md)。

- 專案檔案保存在 GDrive 掛載工作資料夾；已讀回驗證，未獨立確認雲端同步完成。
- 既有 Obsidian 工作筆記四區段已更新，原文保留且標記各一份：`G:/我的雲端硬碟/secondbrain/teacher-toolkit/工作筆記.md`。驗證：`qa/plinkoh-closeout-20260919/note-readback.json`。
- GitHub尚未提交／推送。共用main同時有Plink-oh、Unscramble與其他專案變更，依shutdown skill需先確認範圍。既有HEAD及origin/main均為 `dc5d32dbc4f800579dc8211d03e3f03da3578898`；暫存區無新增項目。
- 已準備49個Plink-oh候選檔案及7個共用整合檔供確認：`qa/plinkoh-closeout-20260919/git-scope-draft.json`。共用release.json含已部署但尚未提交的Unscramble雜湊，不能直接以舊原始碼搭配新清單提交。
- 課堂下一步：試用新版卡圖辨識度與勝利音量；不自動新增其他功能。教師登入後正式站實玩不在匿名入口檢查的證明範圍。

Git範圍待確認選擇：只保存Plink-oh（需整理共用清單），或一併保存已部署的Unscramble整合變更。兩者皆排除其他專案、來源影片、私人資料與未審閱大型QA素材。

## 後續授權
使用者已確認「連已部署的 Unscramble 變更一起保存」。本次提交包含 Plink-oh、Unscramble已發布的前後端、測試、必要公開資產與文字驗證紀錄。排除其他專案、來源影片、學生圖片、QA錄影截圖及私人設定。提交與推送的最終SHA、結果與時間以既有Obsidian工作筆記和 qa/plinkoh-closeout-20260919/git-sync-result.json 為準。

Git重建注意：`.gitattributes` 對release manifest列出的18個來源與六張SVG保留原始換行位元，避免Windows自動換行轉換破壞已發布雜湊。BasketballGame.jsx、BeachGame.jsx、unscramble-images.mjs僅保留原始換行，沒有功能變更。
