# shortsaboutsentences — Claude 交接（2026-10-23 建立）

本資料夾原由 Codex 製作；從 2026-10-23 起改在 Claude Code 執行。
原工作規則仍以同層 `AGENTS.md` 為準（教師授權範圍、不自動重生、不公開上傳等），本檔只補充「現況」與「Claude 環境差異」。

用途：把英語課本句型（翰林 HWG）做成 8 秒一段的 AI 情境短片，再剪成完整影片（含英文字幕）。

## 一、專案總覽

| 單元 | 位置 | 狀態 |
|---|---|---|
| HWG7 U02 Six Friends | `HWG 7 U02 CLIPS/114 句型情境/Six_Friends_20260914/` | 128 秒核心片已核准；後製版（封面＋封底＋40 段字幕，139 秒）**待教師完整看聽** |
| HWG5 U03 Veo 版 | `HWG5 U03/3D_Optimization_v1.0/` | 2026-10-03 Flow／Veo 3.1 Fast 13 段候選，0 支核准；**已被下方 H3 版取代**，只作歷史 |
| HWG5 U03 H3 版 | `HWG5 U03/H3_C06_voice-first_v01/` | **2026-10-23 停用 RunPod 流程**：教師否決 C03 v02 後指示「先停在這裡」，改用 Colab 流程完成本片；13 段中 4 段核准 |

> **✅ 2026-10-23 完成**：HWG5 U03 完整版已由教師核准，位於 `HWG5 U03/Colab_fullfilm_v01/final/`（字幕版／無字幕版各 1080p、720p，108.9 秒）。狀態總表 `Colab_fullfilm_v01/STATUS.md`；需求規格 `HWG5 U03/rdq/RDQ-spec-hwg5-u03-colab-fullfilm-20261023.md`；用量 `COLAB_用量紀錄.md`（17.43 units）。重建全片：`uv run --no-project --with pillow python -X utf8 post/assemble.py`。以下為完成前的歷史紀錄。
>
> **（歷史）2026-10-23**：HWG5 U03 接下來用 **Colab 流程**完成。不要重開 RunPod Pod、不要重送 C01 v03。下方第二節的 RunPod 說明只作歷史與素材參考。Colab 可沿用：`inputs/` 核准分鏡、`audio/fullfilm/` 核准配音與每段 guide、已核准影片 C02 v01／C04 v01／C05 v01／C06 v02（`selected-videos.json`）。待重做：C01、C03（兩者都是光線變暗問題）、C07–C13。

其他：`HWG5 U03/參考/` 是原教材圖片與原片；`closeout_20260925.py` 是 Six Friends 舊收工腳本（已執行過，勿重跑）。

## 二、HWG5 U03 H3 版（主要待續工作）

先讀：`HWG5 U03/H3_C06_voice-first_v01/START_HERE.md` → `PAUSE_HANDOFF_20261016.md` → `WORKFLOW_H3_FULL_FILM_v02.md` → `execution-state.json`。

故事：Abu（白色藍耳機器人）、Teddy（黑髮男孩）、Police Officer，18 句台詞分 13 段（C01–C13），台詞與說話者以 `full-film-dialogue-lock.json` 為準（第 17 句已核准改為 "Ershui Elementary School"）。

流程（voice-first）：VoxCPM2 先做三角色配音 → 教師核准聲音 → 每段 8 秒 guide WAV → RunPod A40 上用 MiniMax H3（ComfyUI，Ref2VA，1536×864、24fps、14 steps、192 幀）以核准首尾分鏡＋固定配音生成影片 → 逐段 QA → 教師核准 → 合成全片＋字幕。

### 各段狀態（2026-10-16 暫停時）

| 段 | 狀態 |
|---|---|
| C02 v01、C04 v01、C05 v01、C06 v02 | **教師已核准**（見 `selected-videos.json`） |
| C03 | v01、v02 教師否決（v02 中段變暗＋地圖聚光燈，2026-10-23，見 `review-C03-v02/`） |
| C01 | v01、v02 教師否決（v02 全場變暗偏藍）；**v03（第 3 次，也是上限最後一次）在採樣中被暫停中斷，沒有完整 latent** |
| C07–C13 | 尚未生成（配音 guide 已備妥在 `audio/fullfilm/`） |
| 全片合成、字幕 | 未開始 |

### 授權與預算（教師已核准、仍有效）

- 全片新增 GPU 費用門檻 **US$20**；每段最多 3 個 take（首次＋重生 2 次）。
- 目前 Pod q99avt5ttg0257 約跑 7.6 小時 ≈ **US$4.64**（另有聲音階段約 US$0.22）。
- C01 v03 已用掉第 3 次額度；是否算作已用、能否再試，**要先問教師**。
- 暫停指示優先：不得自動重開 Pod、不得重送 C01 v03、不得重啟原批次、不得自動做第 4 次。

### 重新開工前要先確認的事

1. **Pod 資料很可能已清空**：Pod 只有 150GB container disk、沒有 volume；RunPod 停止 Pod 時通常會清掉 container disk。重開後很可能需要重裝 ComfyUI（commit `73c9bad4d21e7addbe1d13bc92eee0f1431b017d`）並重新下載約 54GB H3 模型（`cloud/h3-models.lock.json`、`scripts/download_h3_models.py`）。需實際開機查證，且開機即計費 → 先得到教師同意。
2. 重開後 Pod 的 SSH IP／port 會變，`known_hosts` 要更新（原腳本用 `StrictHostKeyChecking=yes`）。
3. 原 Pod 可能搶不到 GPU；教師已授權可建立同規格加拿大 A40（CA-MTL-1，A40 48GB／RAM ≥50GB／150GB 暫存碟／US$0.59/h），規則見 `A40_AUTOMATIC_REPLACEMENT_AUTHORIZATION_20261016.json`。
4. 建議順序：先給教師看 C03 v02 → 決定 C01 怎麼處理 → 再開 GPU 跑 C01（若授權）與 C07–C13 → 全部下載核對後才停 GPU → 合成全片。

## 三、Claude 環境與 Codex 的差異（重要）

- **RunPod 操作**：Codex 用 RunPod MCP（OAuth，`codex mcp login runpod`）。Claude 這邊的 `plugin:runpod:runpod` MCP 目前**未授權**，需教師在 Claude 執行 `/mcp` 登入後才能查詢／啟動／停止 Pod。`runpodctl` 未安裝。
- **SSH 金鑰**：在 `C:\Users\User\.codex\credentials\runpod\`（`hwg5-c06-20261016T061321Z` 與 `known_hosts`）。直接以路徑引用，**不得複製進專案、不得印出內容**。遠端工作目錄 `/workspace/hwg5-u03-c06-v01`。
- **本機輔助程式在專案外**：`C:\firebase-deploy\2026 AI Sense bar clips\operations-hwg5-u03\`（下載接收器 collect_*.py、即時進度頁 live_progress_server_v01.py、驗收頁）。裡面寫死舊 Pod 的 IP／port，重開後要改。
- **Codex 專屬機制不能沿用**：每 3 分鐘 heartbeat（id hwg5-u03，已 PAUSED）、`http://127.0.0.1:58861/` 進度頁、Codex 內建 Python。Claude 改用 Monitor／背景指令追進度。
- **Python**：系統只有 3.14。本案部分套件是 cp312；可用的虛擬環境：`C:\firebase-deploy\2026 AI Sense bar clips\.venv-analysis`、`.venv-voxcpm`，或用 `uv`。Windows 讀 UTF-8 檔要加 `python -X utf8`。
- **ffmpeg**：9.0.1 已裝（注意：舊 Ogg 解碼有截斷問題）。
- Windows 打包給 Linux 的 `.sh` 必須是 LF，傳上去先 `bash -n`。

## 四、HWG7 U02 Six Friends（只剩驗收）

- 成品：`.../Six_Friends_20260914/postproduction/Six_Friends_Full_EnglishSubtitles_V01.mp4`（2:19）。
- 待教師：完整看聽，特別聽約 01:03 的輕微語氣聲、Li Mei／cheongsam 的字幕與發音。
- 不自動重新生成、不再用 Flow 點數。

## 五、Git 與保存

- 本資料夾在公開 repo `Samsamchou/teacher-toolkit` 底下，但**整個資料夾仍未追蹤**（約 1GB 以上，含影片、模型、雲端壓縮檔）。未經教師指定可公開的範圍，不 stage／commit／push。
- 所有新產物存在各單元資料夾；GDrive 本機讀回不等於雲端同步完成。
