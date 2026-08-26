# 二水國小在地課程 / Ershui Local Curriculum

本專案將二水在地知識與國小英語、社會及綜合活動領域整合，現階段主要成果為四年級上學期四個鐵道主題單元、20 節教案、教材圖像與〈坐火車趣集集〉Firebase 互動網站。

## 唯一現行工作位置

`G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui`

`C:\firebase-deploy\在地課程` 自 2026-08-25 起只保留為舊來源與回復副本。後續新增、修改、測試及收工同步一律從 G 槽進行。

## 開工入口

1. 讀取 `AGENTS.md`：專案規範與安全邊界。
2. 讀取 `PROJECT_HANDOFF.md`：已完成、未完成、驗證與下一步。
3. 讀取 `WORK_LOG.md`：按日期排列的工作歷程。
4. 讀取 `rdq/` 中與任務相關且 `status: confirmed` 的規格卡。

## 主要資料夾

- `在地課程4年級上學期教案/`：四份現行 Word 教案及各單元教材。
- `202609 在地課程4年級上學期教案/`：依四個正式單元、週次及20個節次資料夾分類的新分析、詳案、教材、QA與重建工具；入口為 `00_四年級上學期單元資料夾索引.md`。
- `sites/grade4-local-curriculum/`：Firebase 互動網站原始碼、Functions、規則及測試。
- `docs/conversations/`：不含寒暄的可接手工作歷程摘要。
- `rdq/`：需求訪談與確認規格。
- `skills/ershui-local-curriculum-builder/`：二水在地課程單元擴編的正式 Skill 來源；個人安裝副本只由內附同步工具更新。
- `migration/`：遷移清冊與驗證報告。
- `_course_source_md/`：供 AI／搜尋使用的課程來源文字。

## 目前可用成果

- 四年級上學期四個單元，共 20 節詳細教案。
- 三個單元的圖卡、學習單、地圖、分鏡及教學素材。
- 〈扇形車庫〉第2節正式數位教材：學生版與教師答案版各7頁、正式PDF、逐頁PNG、QA紀錄及可重建來源；實體試印仍待教師完成。
- 〈坐火車趣集集〉模擬線上購票網站：<https://hwg8-u01-listen-and-speak.web.app>
- 〈閱覽鐵道風華〉Read and drag 本地前端原型；尚未完成後端紀錄規格，也尚未部署。
- 三、四年級課程大架構 Google 文件：<https://docs.google.com/document/d/1ZIVs007MKpiabjw3pRdrfbp406K_4b9oe6XpVupZm04/edit>

完整狀態及下一步以 `PROJECT_HANDOFF.md` 為準。

## 工具環境注意事項

- Python 與 Node.js 依賴請依各腳本／網站的 lock file 安裝，不提交 `node_modules`、快取或建置輸出。
- `tools/legacy-generation/build_l1_static_assets.py` 會讀取 Windows 內建中文字型及 Comic Sans；在非 Windows 電腦執行前須調整字型路徑。
