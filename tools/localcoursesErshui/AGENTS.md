# 二水在地課程專案規範 / Ershui Local Curriculum Project Rules

## 專案身分 / Project identity

- 現行唯一主目錄：`G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui`
- 舊來源／回復副本：`C:\firebase-deploy\在地課程`，只供查核，不再作為開工位置。
- 我是國小英語老師 / I am an elementary English teacher.
- 所有檔案使用繁體中文以及英文 / All project files use Traditional Chinese and English.
- 教學對象是國小 3–6 年級學生 / The teaching audience is Grade 3–6 elementary students.
- 本專案目前主要服務二水國小四年級「在地課程」，英語為主要融入領域，社會與綜合活動為支援領域。

## 每次開工先讀 / Read before every work session

1. `README.md`
2. `PROJECT_HANDOFF.md`
3. `WORK_LOG.md`
4. `rdq/` 內狀態為 `confirmed` 的相關規格卡
5. 要處理單元的原始課程計畫、課綱及既有教案

只處理尚未完成或使用者明確要求修改的部分，不重做已完成成果。

## 教材與課程原則 / Curriculum rules

- 只分析正式課程名稱為「在地課程」的內容，不混入〈繽紛校園（一）〉等其他課程。
- 保留原在地課程單元與既定活動主軸；英語用於觀察、描述、口說與介紹，不把課程改成一般英語課。
- 英語字詞、句型及生活用語優先依三、四年級部定／彈性英語計畫及《臺北市國民小學英語聽說評量手冊》。
- 課綱對應分列「學習表現」與「學習內容」，保留完整編號及敘述。
- 每節詳案包含課前教材、核心英語，以及有主標題的 Warm-up、Presentation、Production、Wrap-up。
- 無法實地踏查時，使用經查證的照片、影片、地圖、教師預錄導覽或教室資料探究。
- 圖片或地圖製作前先查官方／可信資料並和教師確認提示詞；AI 圖完成後人工核對站名、路線、地標與文字。

## 檔案、驗證與安全 / Files, verification, and safety

- 使用 UTF-8，安全處理中文與 Google Drive 路徑。
- 保留使用者既有檔案；不刪除、覆寫、搬移或重建重大成果，除非範圍明確且已授權。
- 建立或修改檔案後必須讀回，回報路徑、檔數、測試及限制。
- 不提交 `.env`、密碼、API keys、session、cookies、credential store、快取、依賴或建置輸出。
- Firebase 部署、付費生成及正式發布仍需當次明確授權。

## 收工同步 / Closeout synchronization

- GDrive：本目錄為正式檔案層。
- Obsidian：更新 `G:\我的雲端硬碟\secondbrain\teacher-toolkit\工作筆記.md`。
- GitHub：由父層 `G:\我的雲端硬碟\teacher-toolkit` 的既有 `main` 分支與 `origin` 管理。
- 只 stage 本專案精確範圍；不得把父層其他未追蹤工具一併提交。
