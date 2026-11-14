# 2026 listen read aloud videos — Claude 交接

> 2026-11-13 從 Codex 交接到 Claude。之後一律在 Claude 內用 **`rhythm-vocabulary-video`** skill 製作 read aloud clips（節奏單字朗讀影片）。
> 舊的 Codex 文件（`agent.md`、`PROJECT_HANDOFF.md`、`CLOSEOUT-*.md`、`NEXT_TASKS.md`）保留當歷史紀錄，不必每次讀。

## 開工先看

1. 這份 `CLAUDE.md`（現況與規則）。
2. Skill 本體：`C:\Users\User\.claude\skills\rhythm-vocabulary-video\SKILL.md`（流程、指令、圖片路由）。
3. 要沿用某支正式片的版型時，看該片的 `productions/<題組>/v01/full/job.json`（裡面的 `config` 就是可複製的 job 設定）。

## 這是什麼

老師提供單字＋圖片（或學生掃描作品）→ 黑板背景、圖卡落下輕擺、圖下英文字 → 每個字「老師聲 marin 一次 → 兒童感 coral 一次」，0.85 倍、對齊約 93.67 BPM 鼓聲 → 1920×1080／30fps MP4＋preview.html。

## 正式片（老師已驗收，可當範本）

| 題組 | 配置 | job 範本 | 片長 |
|---|---|---|---|
| 九科目 v05（正式基準） | 9 張 × 2 輪，3×3 | `productions/nine-subjects-20261002/v05-full-B085-clean/` | 90.17 秒 |
| 16 張 01 v02 | 前 8／後 8 兩輪，4×2 | `productions/sixteen-subjects-01-20261002/v02-grid4x2-lowercase/job.json` | 82.5 秒 |
| 502 九科目 18 張 | `two-rounds` 9+9，3×3 | `productions/9 subjects 502/v01/full/job.json` | 90.17 秒 |
| HWG7 U02 交通方式 | `three-rounds-ten-repeat` 10 張 × 3 輪，5×2 | `productions/HWG7 U02/v01/full/job.json` | 164.47 秒 |
| SF3 U02 | `three-rounds-six` 6+6+6，3×2 | `productions/SF3 U02/v01/full/job.json` | 95.3 秒 |
| 二水小行星 12 地點（2026-11-13，Claude 第一支） | `four-rounds-six`：R1–R2 3D 建築、R3–R4 雙圖示卡，3×2 | `productions/ershui-planet-places/v01/full-job.json` | 120.93 秒 |
| **Free Time 11 活動跟讀版**（2026-11-14） | `four-rounds-six-five`＋**`follow_along`**：R1–R2 Ken 3D、R3–R4 雙圖示卡，5 張排上 3 下 2 | `productions/freetime-activities/v02-follow-along/full-job.json` | 239.33 秒 |

**跟讀模式**（Free Time 跟讀版定案）：
- 每個字 16 拍：老師 → 學生 → 兒童 → 學生。最後一輪拿掉老師聲：學生 → 兒童 → 學生 → 空。
- 伴奏用 `backing.py` 本機合成（style 4，`drum_gain` 1.8、`ding_gain` 2.5）。
- 整片響度 −14 LUFS，學生拍出現麥克風圖示。
- 老師嫌太小聲、鼓太小，才調成這組參數，新片沿用。
- 細節見該資料夾 `README.md`。

二水小行星這支的做法：
- 3D 圖用 Godot 的 `CARDS=1` 測試模式拍。
- 5 張老師嫌醜的，用 Codex `-i 截圖` 重畫成卡通風，加上英文招牌。
- 便利商店的圖示是新生成的。
- 細節見該資料夾 `README.md`。

SF3 U02：老師 2026-11-13 回「完整版確認」，已寫入同資料夾的 `TEACHER_ACCEPTANCE.json` 與 `FORMAL_BASELINE.json`（SHA 45762f4e…，和 10/08 收工紀錄相同）。

## 2026-11-13 交接時做的事

- Claude 已安裝的 skill 原本和 Codex 版相同，只支援 8／9／16／32 張；後三支正式片其實是用各自 `analysis/<題組>/runtime/scripts/` 裡改過的程式做的。
- 已把這些擴充併回 Claude skill（10 張三輪、18 張 9+9／6+6+6、6／10 張總覽、試片驗收門檻、語音預算上限）。
- 驗證：8 種配置（四支正式片＋route-8/9/16/32 測試設定）preflight 全過；四支正式片重新排程的片長與朗讀次數和驗收片**完全一致**（不寫檔、不呼叫 API）。
- 改之前的 skill 備份：`skills/rhythm-vocabulary-video-claude-before-20261113.zip`。
- Codex 的 skill（`C:\Users\User\.codex\skills\`）沒有動。

## 製作一支新片的順序（照之前的慣例）

1. 老師給圖片＋單字＋順序 → 確認張數對應哪種路由；18 張要問清楚 9+9 還是 6+6+6。
2. 建資料夾 `productions/<題組>/v01/`，分析紀錄放 `analysis/<題組-日期>/`，需求卡放 `rdq/`。
3. 圖片本機處理（`crop_images.py`／`prepare_cards.py`），**不用圖片 API、不重畫學生作品**。
4. 新單字語音：先查既有聲音庫有沒有同字同聲線；缺的才用 OpenAI Speech 生成 → **先報費用、等老師同意**，job 寫 `max_total_cost_usd`、`budget_usd`。
5. 逐字聽校（ASR、頻譜、重音錨點）→ 試片（pilot）→ 老師說試片通過 → 完整版。
6. `verify` ＋ 瀏覽器播放檢查（`check_preview.cjs`）→ 交 `video.mp4` 與 `preview.html` → 老師說「確定為正式版」才寫 `TEACHER_ACCEPTANCE.json` 與 `FORMAL_BASELINE.json`。

## 鎖定規則

- 字幕大小寫：一般字全小寫（music、science）；Chinese、English 首字母大寫；PE 全大寫。學生手寫字不改。
- 朗讀畫面只有圖卡＋英文，不加「老師／兒童」、輪次、題號等字卡。
- 8 張總覽 4×2、9 張 3×3、10 張 5×2、6 張 3×2。
- 只改畫面的修訂可用 `render --reuse-audio` 沿用已驗收音軌，要核對封包與解碼樣本。
- 舊版本一律另存新版本資料夾，不覆寫正式片。
- 學生資料去識別（只用座號／班級代號）。

## 環境（2026-11-13 檢查過）

- Python 有 numpy、Pillow、PyMuPDF；FFmpeg 9.0.1 有 rubberband。
- `OPENAI_API_KEY` 已在環境變數；程式也會退回讀 `C:\Users\User\.codex\.env.local`。金鑰不得印出或寫進專案。
- Playwright：`check_preview.cjs` 會退回用 Codex runtime 內的 playwright（路徑存在）；必要時設 `PLAYWRIGHT_MODULE`。
- 黑板、鼓聲、聲音庫都在本資料夾內並以 SHA-256 核驗，**不要搬動或改名**這些檔案（見 skill 的 `assets/baseline-profile.json`）。

## 字型（老師 2026-11-13 決定）

- 朗讀影片的英文字 **Comic Relief 和 Comic Sans 交替使用**，兩種都可以。
- 交替的方式：一支用 Comic Sans Bold，下一支就換 Comic Relief Bold。
- 換字型的方法：在 job 的 `font` 欄位改路徑。
  - Comic Sans Bold：`C:/Windows/Fonts/comicbd.ttf`（`baseline-profile.json` 的預設）
  - Comic Relief Bold：`C:/Users/User/AppData/Local/Microsoft/Windows/Fonts/ComicRelief-Bold.ttf`
- 到 2026-11-13 為止的正式片都是 Comic Sans（二水小行星也是）；2026-11-14 Free Time 跟讀版用 Comic Relief，**下一支用 Comic Sans**。
- 已驗收的正式片不重做。

## Git

- 沿用上層 `teacher-toolkit` repo，不建巢狀 Git。只有文件、`rdq/` 部分與去識別的 `git-export/` 有入庫；學生作品、音檔、影片不入庫。
- commit／push 前先確認範圍。
