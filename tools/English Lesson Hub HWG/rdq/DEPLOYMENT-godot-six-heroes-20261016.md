# 完整六關、後台與觸控修補正式部署 · 2026-10-16

已依使用者明確要求部署，正式入口：https://lesson-hub-v03.web.app/lab 。發布時間（台灣）：2026-10-16T22:09:01.381000+08:00。

- Firebase hwg7teaching，僅更新 liveV2 與 lesson-hub-v03 Hosting。
- Hosting：sites/lesson-hub-v03/versions/f1274706dc9b3bfe。
- liveV2：livev2-00018-vaq，ACTIVE／Ready；既有 LIVE 設定與 Secret 參照完整保留。
- 其他 12 個 Functions、預設 Hosting、Firestore／Storage rules 與其他專案未變。

## 已上線

三英雄與主動技能、完整六關、15／17／19／21／23／25秒、逐關3→8種裝備與新機關、雙階段Boss。新版分配使用 gameVersion2，舊分配及歷史結果維持相容。英語與遊戲分頁，角色／技能／Boss存檔續作，教師明細與CSV保留角色戰果。

觸控以 pointerId 個別追蹤，放開／取消只釋放相應手指；Web只接受宿主權威方向，iframe鍵盤轉交，避免Godot殘留反向鍵相抵。原生鍵盤保留，教師先前已確認左右移動正常。

學習分數與道具品質分開。普通練習首次＋3重試採最佳，拼字無限重試、測驗首次成績，大小寫／片語空格及4／3／2／1品質規則保留。正式 Phonics仍36題／100分／24音檔，未建立正式測試分配或提交學生答案。

## 本輪驗證

正式設定建置與9項發布檢查通過；新跑301網站測試及15項Firestore／Storage模擬器整合。雲端實際部署的42份後台來源逐位元相符。209／209正式資源HTTP核對通過：189全檔SHA、20按Firebase CLI相同gzip9算法計算的傳輸SHA／ETag及原始長度相符；ETag不是原始內容SHA。大型檔完整GET遇到本次網路逾時，沒有冒稱全209檔都完成全檔下載。三個SPA入口、Firebase正式專案設定、v2快取重新驗證及WASM MIME通過。

部署前後9份課程、工作區、Phonics題庫與24音檔文件指紋／generation全相同。新版Web42檔、Source99檔下載包及手冊已更新為正式發布封裝，原包／原文備份保留。正式Source99檔透過40塊HTTP Range完整下載後，全包SHA／CRC相符；新解壓專案實際Godot匯入，72關卡＋29移動檢查再次通過。瀏覽器正式教師入口、無效分配提示及真正Godot引擎啟動有畫面／日誌證據。教師私人登入／正式新分配全程與實體平板、校網及喇叭仍依教師現場驗收，不冒稱已代為完成。

發佈來源使用隔離副本，470份來源讀回與canonical相符。Git index保持原SHA，未stage／commit／push，未動既有鎖或其他工作。先前handoff的「本機候選／尚未部署」是歷史狀態，本段取代它。

證據：qa/godot-six-production-20261016；完整來源及兩包：godot/forest-of-words-six-heroes-20261016。學生使用教師新分配連結；已開著舊網頁請重新整理，下載版需重下載。
