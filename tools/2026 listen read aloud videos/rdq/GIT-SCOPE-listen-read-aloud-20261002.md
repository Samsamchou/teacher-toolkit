# 已確認 Git 同步範圍 / Approved Git scope

日期：2026-10-02，Asia/Taipei。狀態：**教師已明確授權此25檔提交並推送既有main；提交前記錄，尚未執行**。

既有儲存庫：Samsamchou/teacher-toolkit；分支 main。父層混有其他專案改動，本清單僅納入目前專案的25個程式／文件檔。

## 提議納入 / Included

以下路徑均相對於 `tools/2026 listen read aloud videos/`，提交時逐檔指定，不使用整個資料夾或 git add .。

- `.gitignore`
- `CLOSEOUT-20261002.md`
- `FORMAL_BASELINE.json`
- `NEXT_TASKS.md`
- `README.md`
- `agent.md`
- `git-export/rhythm-vocabulary-video/SKILL.md`
- `git-export/rhythm-vocabulary-video/agents/openai.yaml`
- `git-export/rhythm-vocabulary-video/assets/accepted-voice-bank.json`
- `git-export/rhythm-vocabulary-video/assets/baseline-profile.json`
- `git-export/rhythm-vocabulary-video/references/audio.md`
- `git-export/rhythm-vocabulary-video/references/images.md`
- `git-export/rhythm-vocabulary-video/references/schema.md`
- `git-export/rhythm-vocabulary-video/references/validation.md`
- `git-export/rhythm-vocabulary-video/references/workflow.md`
- `git-export/rhythm-vocabulary-video/scripts/check_preview.cjs`
- `git-export/rhythm-vocabulary-video/scripts/crop_images.py`
- `git-export/rhythm-vocabulary-video/scripts/media_core.py`
- `git-export/rhythm-vocabulary-video/scripts/prepare_cards.py`
- `git-export/rhythm-vocabulary-video/scripts/rhythm_video.py`
- `git-export/rhythm-vocabulary-video/scripts/speech_tools.py`
- `rdq/GIT-SCOPE-listen-read-aloud-20261002.md`
- `rdq/RDQ-spec-eight-card-layout-case-20261002.md`
- `rdq/RDQ-spec-rhythm-vocabulary-video-skill-20261002.md`
- `rdq/RDQ-spec-sixteen-subjects-01-20261002.md`

## 留在 GDrive 的材料 / Excluded from this commit

- 全部學生作品、原始掃描、参考來源與衍生圖片：`參考/`、`assets/`。
- 全部成品 MP4、WAV／MP3、原始 Speech API 產物與生成紀錄：`productions/`。
- 分析畫面、QA、私人工作筆記草稿／備份及收工驗證：`analysis/`。
- 保留作歷史的專用腳本、含學生檔名前綴的舊 RDQ／交接：`scripts/`、`PROJECT_HANDOFF.md` 與其他未列出 RDQ。
- 原技能主本與ZIP：`skills/`。Git另用去識別說明的15檔副本 `git-export/rhythm-vocabulary-video/`，不改已安裝技能或原GDrive材料。
- 工具環境、快取、依賴、本機設定、所有 `.env*`、憑證及金鑰。
- 父層任何其他專案的改動或刪除。

去識別技能副本15檔完整納入，只有圖片說明中的學生名稱範例改為student01代碼；其餘14檔與正式技能逐位元相同。其中設定與聲音庫僅保存非秘密的本機路徑／雜湊，實際黑板、節拍、聲音需從已確認的私人GDrive材料取得。Git是程式／流程備份，完整影片材料保留在GDrive；Git副本不能單獨重建既有影片。

## 執行前條件 / Before committing

1. 已完成：教師明確同意此25檔範圍及推送至既有main，無需再次詢問。
2. 重新核對目前工作樹、清單 SHA 與索引，若檔案有新改動，先讀回差異。
3. 只 stage 此清單，讀回 staged diff／檔名，再提交並推送；不得包含其他專案。
4. 若 GitHub 需要登入，由教師親自完成。推送後核對遠端實際 SHA，再更新收工及 Obsidian 狀態。

逐檔 bytes／SHA-256：`analysis/closeout-20261002/git-scope-manifest.json`（此驗證檔留在 GDrive）。
