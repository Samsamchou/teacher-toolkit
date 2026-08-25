---
rdq_version: 1
edition: chatgpt-app
task: 遷移並三重備份二水在地課程
domain: general
date: 2026-08-25
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: initialize-project + shutdown
---

# RDQ 需求規格：二水在地課程主目錄遷移與三重備份

## 一句話任務
將二水在地課程的正式工作專案遷移到 GDrive，建立可直接續作的歷程文件，並精確同步至 Obsidian 與既有 GitHub 儲存庫。

## 已確認
- 新唯一主工作目錄為 **G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui**；後續不再以 **C:\firebase-deploy\在地課程** 開工。
- 採乾淨且完整的正式專案備份：保留教案、來源、圖片、影片、提示詞、程式、測試、設定、lock files、QA 與交接資料；排除依賴、快取、建置輸出、JRE、暫存、秘密、日誌及內層 `.git`。
- GitHub 使用既有 **Samsamchou/teacher-toolkit**，只 stage／commit／push `tools/localcoursesErshui` 及必要的父層 `.gitignore` 調整，不納入其他未追蹤專案。
- 「0809續接未完成工作」另建立 **docs/conversations/0809續接未完成工作_工作歷程摘要.md**，保存所有實質需求、決策、流程、修正、成果、驗證與未完成項目；不製作逐字聊天稿。
- 更新 **G:\我的雲端硬碟\secondbrain\teacher-toolkit\工作筆記.md**，記錄新主路徑、完成狀態、Git commit／remote SHA、驗證結果與下一個入口。
- C 槽來源完整保留作為回復副本，加入遷移指引；不刪除、不再雙向同步，後續只在 G 槽工作。

## 待確認假設
- 歷史文件中的 C 槽路徑保留並標示為「舊來源」；只有現行操作文件與入口改成 G 槽路徑。
- Google Drive 桌面程式會自行同步 G 槽；本次以本機 G 槽逐檔讀回作為同步前證據，不宣稱 Google 雲端完成前不經確認。

## 已採納建議
- 產生來源／目的地 SHA-256 清冊，核對檔數、大小、相對路徑與雜湊。
- 新增 `AGENTS.md`、`README.md`、`PROJECT_HANDOFF.md`、`WORK_LOG.md`，固定主路徑、進度、限制與下一步。
- Git 排除秘密與可重建資料，並為網站 dependency lock files 加入精確保留規則。
- Obsidian 同步上次進度、主路徑、Git 與下一入口並讀回。
- push 後讀取 `origin/main`，確認遠端 SHA 與本機 HEAD 一致。

## 本次不納入
- 不刪除 C 槽原專案、不複製依賴與快取、不保存逐字聊天稿、不部署 Firebase、不修改教案或網站功能。

## 一段式需求規格
將 **C:\firebase-deploy\在地課程** 的乾淨正式專案內容遷移至 **G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui**，排除 `node_modules`、快取、建置輸出、JRE、暫存、秘密、日誌及內層 `.git`，但保留來源文件、教案、教材、圖片、影片、提示詞、程式、測試、設定與 dependency lock files；建立可直接接手的 `AGENTS.md`、`README.md`、`PROJECT_HANDOFF.md`、`WORK_LOG.md` 及 **docs/conversations/0809續接未完成工作_工作歷程摘要.md**，以 SHA-256 清冊核對來源與目的地；更新 **G:\我的雲端硬碟\secondbrain\teacher-toolkit\工作筆記.md** 並讀回；在既有 **Samsamchou/teacher-toolkit** 只提交本專案及必要 `.gitignore` 變更，推送後確認 `origin/main` 與本機 HEAD 相同；C 槽原專案保留為回復副本並加入新主位置指引，未來一律由 G 槽續作。

## 驗收條件
- [ ] 新主目錄包含完整正式成果，清冊核對無遺漏、無雜湊差異，且不含秘密或可重建垃圾檔。
- [ ] 具名對話歷程、四份入口文件及 Obsidian 工作筆記皆已寫入並讀回，下一次不必重新說明位置、進度與下一步。
- [ ] Git commit 僅含核准範圍，push 成功，`origin/main` SHA 與本機一致。
- [ ] C 槽來源仍存在且有遷移指引；所有新文件均把 G 槽列為唯一現行工作位置。
