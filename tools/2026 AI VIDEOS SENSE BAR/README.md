# 2026 AI VIDEOS SENSE BAR

用「山獅霸的多重宇宙」工作流，在 Google Colab 雲端主機做 AI 短片（16:9、24fps、1–3 分鐘，台詞為台灣國語）。

所有影片工作流一律照這兩個 repo（2026-10-23 起）：

- [shanshiba-workflow-32gvram-64gram](https://github.com/mathruffian-dot/shanshiba-workflow-32gvram-64gram)：完整版流程，本資料夾用這份。
- [shanshiba-workflow-colab](https://github.com/mathruffian-dot/shanshiba-workflow-colab)：同一套流程的 Colab 硬體版，內容只差在硬體說明與設定檔。

## 資料夾

| 路徑 | 內容 | 進 git？ |
|---|---|---|
| `shanshiba-workflow-32gvram-64gram/` | 從 GitHub clone 的上游 repo（自己有 `.git`），在這裡執行 `cloud/colab_h3.py`；成品在各片的 `out/` | 否（上游，可重新 clone） |
| `films/<片名>/` | 每支片驗收時的 `film.json`（含改過的 seed）與自審結果 | 是 |
| `HWG 7 U04 FILM/` | HWG7 U04 短片：劇本、shots.json、voices.json、scripts/、HANDOFF.md（圖、音、影片不進 git） | 是（只有文字檔） |
| `HANDOFF.md` | 交接：做到哪、怎麼重跑、踩坑 | 是 |

影片、圖片、音檔不進 git（見 `.gitignore`），留在 Google 雲端硬碟。

## 已完成

| 片名 | 日期 | 成片 | 備註 |
|---|---|---|---|
| 被狗吃掉的作業（範本片） | 2026-10-23 驗收 | `shanshiba-workflow-32gvram-64gram/pipeline/template_local/out/cut/film_1080p.mp4`（39.4 秒） | 全雲端 Colab G4，約 8.15 運算單元 |
| HWG7 U04 A Day with the Elves | 製作中（劇本、角色、首幀、配音已核准；下一步 H3） | `HWG 7 U04 FILM/`，先讀它的 `HANDOFF.md` | 圖用 Codex CLI、英文配音 VoxCPM2 0.8 倍速 |

## 授權提醒

- 只做非商業用途：Qwen-Image 2.1、Breeze TTS 2 只能非商用。
- MiniMax H3 授權排除美國、歐盟、英國、南韓；Colab G4 都分到美國或荷蘭機房。是否在 Colab 跑 H3 由老師自行評估（2026-10-23 已評估並同意）。
- 公開影片要標示 AI 生成（片尾已自動加上）。

流程細節與踩坑見 [HANDOFF.md](HANDOFF.md)。
