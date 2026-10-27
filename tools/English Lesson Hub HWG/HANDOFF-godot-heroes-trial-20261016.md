# 交接：三英雄真正 Godot 試玩 2026-10-16

已完成三英雄、第 1 關與第 6 關 Boss 的獨立試玩。原生 Godot 與 Web 真引擎可玩；本次四張新圖全用內建 Image Gen。製作手冊、流程、圖像提示詞與原始碼均在 godot/forest-of-words-three-heroes-trial-20261016。

目前試玩：http://127.0.0.1:5216/ （此電腦本機伺服器）。正式網站沒有部署。下載包在新專案 web/downloads；原始包供 Godot 匯入後 F5，網頁包解壓縮執行啟動網頁試玩.cmd。

自動 Godot 40＋Node 88 項通過；三英雄平衡模擬通關，瀏覽器實走六題 100/100，第一題第四次答對仍 17/17、1 級獎勵。遊戲勝敗另外呈現，瀏覽器驗證路徑末段有手動略過，沒有宣稱該瀏覽器路徑擊敗 Boss。既有 452 條保護路徑未變更。QA 在 qa/godot-three-heroes-trial-20261016/summary.json 與相關證據；本次新檔 92 個逐檔雜湊讀回一致，不代表獨立雲端同步驗證。

教師待驗收：三英雄手感、美術與 Boss 難度、iPad Safari、教室音效／投影／Wi-Fi。依教師明確分階段要求，確認本試玩後才擴中間 2–5 關與正式後台；完整六關驗收後才建立 Godot Games skill。

沒有 Git commit/push，沒有部署或寫正式學生資料，沒有修改其他專案、舊版、原圖與舊鎖檔。326 檔 GitHub 授權屬上次已完成同步，不延伸套用本次。接續請先讀已確認 rdq/RDQ-spec-godot-three-heroes-boss-trial-20261016.md、本交接與新專案兩份製作文件。
