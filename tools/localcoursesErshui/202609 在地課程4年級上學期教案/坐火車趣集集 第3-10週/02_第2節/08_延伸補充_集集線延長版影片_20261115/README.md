# 第 2 節延伸補充｜集集線延長版影片＋6 字圖字卡＋影片學習單（2026-11-15）
> 狀態：2026-11-15 教師定案：學習單（版面調整後版本）與圖字卡（OpenAI 重畫單字圖版本）。舊版在各資料夾的 `_history/`。尚未實際列印試用。

- 需求規格：`../../../../rdq/RDQ-spec-jiji-extended-video-cards-worksheet-20261115.md`（status: confirmed，2026-11-15）。
- 定位：**第 2 節延伸補充**，第 2 節之後播放影片並寫學習單；不改寫第 1、2 節既有教案。
- 例外：本學習單依影片內容**五站都出題（含源泉）**，放寬第 1 節「學生端只用四站」的規定，教師已確認。

## 01_影片
- `集集線五站-2D動畫-延長版-v2.1.mp4`：5:08、1080p、繁中旁白與字幕。
- 來源：`tools/2026 AI ANIMATED VIDEO/output/jiji-line/2d-v2-extended/`（正式版 v2.1）。
- SHA-256：`d67d673949efef0d37790fe3820e1bfc53e8e92e1e2ea06ef5f82a2e45802cda`，與 `jiji-line/FORMAL_RELEASE.json` 一致。

## 02_圖字卡（6 字：banana、bike、mountain、lake、ice pop、ticket）
- `…黑板大卡_A4橫式6張.pptx／.pdf`：一張一字，貼黑板用。
- `…學生小卡_A4一頁6格.pptx／.pdf`：沿虛線剪下操作。
- 圖片：2026-11-15 依教師要求，6 張單字圖改用 OpenAI gpt-image-2 依影片截圖重畫（主體 ≥60%、背景淡化、5 秒辨識檢查；RDQ `rdq/RDQ-spec-jiji-wordcard-redraw-20261115.md`），紀錄在 `_work/wordcards/wordcards-records.json`；截圖版在 `02_圖字卡/_history/`。學習單第 2、5 題同步換圖。
- 英文字體一律 Comic Relief。

| 單字 | 延長版畫面 |
|---|---|
| banana | 開場：以前小火車載香蕉 |
| bike | 集集：綠色隧道騎腳踏車 |
| mountain | 水里：火車上看見玉山 |
| lake | 水里：日月潭 |
| ice pop | 水里：古早味枝仔冰 |
| ticket | 結尾：石虎紀念車票 |

## 03_學習單：集集線影片學習單（A4 直式正反兩頁）
- 2026-11-15 依教師 5 點修改（RDQ：`rdq/RDQ-spec-worksheet-workflow-jiji-revise-20261115.md`）：實線底線、大題標題「一、看影片想一想（找一找、連一連）」、主標題「集集線影片學習單」、刪除單元副標、楷書正文＋難字注音（圳、貯、窯、埕、縱），全部純黑加細描邊。修改前版本在 `03_學習單/_history/`。
- 製作流程與檢核表：`localcoursesErshui/在地課程學習單製作工作流.md`。
- 學生版、教師答案版各一份，每份都有 `.pptx`（可編輯）和 `.pdf`。
- 正面：
  - 一、看影片想一想（找一找、連一連）：五站特色連線、6 字看圖連線。
  - 二、想一想（圈一圈、填一填）：圈 ○ × 4 題。
- 背面：
  - 二（續）：句子填空 3 題。
  - 三、我的集集線小旅行（寫一寫、畫一畫）：`I see a ___.` 3 題；畫一畫並寫句子；自我檢核。
- 每題旁的插圖都取自延長版定案圖。

## 重做
在 `_work/` 下依序執行：
1. `python make_crops.py`
2. `python build_cards.py`
3. `python build_worksheet.py`
4. 用 `export.ps1 -Pptx <檔> -PngDir <資料夾>` 透過 PowerPoint 轉出 PDF 和逐頁 PNG，逐頁檢查用的 PNG 放在 `_work/qa/`。
