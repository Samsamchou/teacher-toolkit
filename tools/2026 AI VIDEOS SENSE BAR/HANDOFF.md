# HANDOFF — 2026 AI VIDEOS SENSE BAR

最後更新：2026-10-23

## 目前狀態

- 2026-10-26：〈SF3 R1 Daily Talk — A Sunday with Grandma〉驗收通過，交接看 `SF3 R1 Daily talk/HANDOFF.md`。

- 範本片〈被狗吃掉的作業〉全雲端完成並驗收（1080p、39.4 秒、−15.8 LUFS，自審全過）。
  成片：`shanshiba-workflow-32gvram-64gram/pipeline/template_local/out/cut/film_1080p.mp4`
  （另有 `film_720p_phone.mp4`）。設定與自審結果備份在 `films/被狗吃掉的作業/`。
- Colab CLI 0.7.5 已用 uv 安裝並登入；G4 已關機。餘額 391.53 單元（開工前 399.68）。
- 上游 repo commit：`5cfcda0`（2026-10-23）。

## 環境

- Colab CLI：`uv tool install google-colab-cli`，登入用 `colab usage`（瀏覽器按允許、授權碼貼回終端機）。
  0.7.5 在 Windows 不用跑 repo 的 `colab_cli_windows_patch.py` 就能用。
- 本機 Python 3.14，只用來跑 `cloud/colab_h3.py`（只用標準函式庫）。
- 在 PowerShell 執行前先 `$env:PYTHONUTF8=1`。

## 做一支片的順序（三個人工關卡）

在 `shanshiba-workflow-32gvram-64gram/` 底下執行；新片先把 `pipeline/template_local/` 複製成 `pipeline/<片名>/` 再改 `film.json`。

1. `colab usage` 查餘額、說明費用與 H3 授權地區，由老師決定。
2. `python cloud/colab_h3.py start`：開 G4、完整安裝（約 9–10 分鐘、約 1.5 單元）。
3. `python cloud/colab_h3.py film pipeline/<片名> chars masters frames`
   → 看 `out/first/_sheet.jpg`。**關卡 1。**
4. `python cloud/colab_h3.py film pipeline/<片名> voices h3`
   → 看 `out/voice_picks.json`（聽到的與原文比對）、`out/review/clips_*.jpg`。**關卡 2。**
   念錯：`film.json` 的 `seeds` 加 `"h3_<鏡>": 新數字`，刪掉該鏡 `clip.mp4`（本機和 VM 都要刪），`$env:ONLY="<鏡>"` 再跑 `h3`。
5. `python cloud/colab_h3.py film pipeline/<片名> amb edl music ending cut review`
   → 看 `out/review/*_review.json`、`*_asr.json`、`*_pass1.jpg`。
6. `python cloud/colab_h3.py stop`，再 `colab usage` 記下用掉的單元。成片給老師看。**關卡 3。**

等老師審的時候用 `python cloud/colab_h3.py keepalive --minutes 20` 保住機器（閒置約 20 分鐘會被收回），下一段開跑前先停掉 keepalive。

## 這次改過的設定（範本片）

- `seeds` 加 `"h3_S1": 4242`：S1 第一次抽的 seed 聽寫不符，換 4242。
- S1 聽寫一直是「好，左右交上來」（0.67），老師親耳聽過確認念的是「作業」，用 `ALLOW_REVIEW=1` 放行。

## 踩坑

| 問題 | 原因 | 做法 |
|---|---|---|
| BreezyVoice 固定配音在 Colab 失敗（`BadZipFile`） | g2pW 讀音模型的官方網址 `storage.googleapis.com/esun-ai/g2pW/G2PWModel-v2-onnx.zip` 已 404，repo 沒附檔 | 只有個人上傳的鏡像，且模型裡的 `config.py` 會被執行，沒有可信來源前不用；改抽 H3 seed，或老師聽過放行 |
| 聽寫把 H3 念的「作業」聽成「左右」 | faster-whisper 誤聽 | 先把片段給老師聽，不直接判定念錯 |
| 重抽某一鏡沒有重做 | `film` 只會上傳、覆蓋，不會刪 VM 上的舊檔 | 本機和 VM 都要刪 `out/h3/<鏡>/clip.mp4` |
| `colab exec` 執行 `pkill -f make_film` 沒反應 | 樣式比對到 exec 自己，把自己砍掉 | 用 PID `kill`，再對 ComfyUI 送 `/queue {"clear": true}`、`/interrupt` |
| `colab exec` 報 `U+FEFF` 語法錯誤 | PowerShell 管線會加 BOM | 用 Bash 的 `printf ... \| colab exec` |
| VM 輸出的中文變亂碼 | Windows 主控台編碼 | 下載回本機後再用 UTF-8 讀 JSON |
| clone 下來的 repo `git status` 全部顯示刪除 | 在 Google 雲端硬碟上 clone，最後一步 `index.lock` → `index` 沒改名成功 | 確認沒有 git 在跑後把 `.git/index.lock` 改名成 `.git/index`（2026-10-23 已修好） |

## 待辦

- 下一支片：照上面的順序，從 `template_local` 複製成新片資料夾。
- 若要用 BreezyVoice 備案，先找到可信的 g2pW 模型來源。
