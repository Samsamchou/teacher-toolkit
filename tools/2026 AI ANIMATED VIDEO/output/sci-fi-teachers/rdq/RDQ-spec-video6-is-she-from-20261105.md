# RDQ 規格卡｜影片 6〈Is she from India?〉（confirmed）

- 日期：2026-11-05
- 狀態：**confirmed**（2026-11-05 老師三題都選建議：he＋she 都教、Amy 問 Ben 答＋照片卡、國旗＋地標插圖）
- 出處：翰林 HWG7（六年級上學期）U01 Target Language（老師上課截圖兩張，含手寫註記）
- 程式起點：複製 `video5-whos-he/`（接力 relay、縮寫合併、問句箭頭、多角色對話、半提示字卡）

## 目標

學生聽完能：
1. 說出 10 個國家名稱（課本 8 個＋老師補充 Korea、Vietnam），知道國名開頭大寫、the UK／the USA 要加 the。
2. 用 **Is she from ___?** 問，並用 **Yes, she is.**／**No, she isn't. She's from ___.** 回答。
3. 看懂 isn't = is not、She's = She is，以及 Is 從句中移到句首（老師截圖上畫的 Is → is 箭頭）。

## 教學內容（依老師截圖）

| 類別 | 內容 |
|---|---|
| 國家（8＋2） | Australia, India, Japan, Singapore, Spain, Taiwan, the UK, the USA；補充 Korea 韓國、Vietnam 越南 |
| 補充說明 | the USA = the United States of America（老師手寫）；the UK = the United Kingdom（建議一起帶，待確認） |
| 句型 | Is she from India? → Yes, she is. ／ No, she isn't. She's from the UK. |
| 文法重點 | Is 移到句首（swap 動畫）、句尾 ↗、isn't = is not（merge 動畫）、She's = She is、Yes／No 後面的逗號 |

## 建議段落（約 10–12 分鐘，沿用影片 5 節奏）

1. 開場：Nova、Cosmo 接力唸 10 個國家（國旗＋代表地標插圖）
2. 國家單字：大寫字母亮起、the UK／the USA 的 the、全名 United States of America；Repeat after me 兩輪
3. 問句：She is from India. → Is she from India?（Is 跳到前面、句尾 ↗）
4. 答句：Yes, she is.／No, she isn't.（is not 合併成 isn't）＋ She's from the UK.
5. 老師示範問答
6. 三部學生對話（聽兩次：無字幕 → 有字幕；再跟唸）
7. Game time：看國旗與人物猜（學生先問再答，半提示字卡）
8. 複習

## 待老師決定

- **Q1 句型範圍**：只教 she，還是 he／she 都教？（建議：都教，接續影片 5 的 he＝他、she＝她）
- **Q2 對話角色**：三部對話怎麼演？（建議：Amy 問、Ben 答，看「國際日」照片牆上的外國朋友；外國朋友用 Codex 生 3–4 張小朋友照片卡，不做完整剪紙動畫，0 元）
- **Q3 國家圖卡**：國旗用程式畫＋每國一張地標插圖（Codex，無文字，約 10 張，0 元）？還是只用國旗？（建議：國旗＋地標）

## 限制與規則

- 沿用 Nova／Cosmo、Amy／Ben（不需 Tripo 新模型，0 元）；生圖用 Codex CLI。
- 語速 0.8×；"Repeat after me."；AI 圖不能有字；國旗由程式畫，確保正確。
- 全部本機渲染；每關先給老師看；影音不入庫、不 push。

## 驗收

- 腳本（Google 文件）→ 配音 → 插圖總表 → 試片 → 全片 v1 → 老師說「定案」。

## 進度

- 2026-11-05：資料夾 `video6-isfrom/`（複製 video5 程式）；腳本 `script_v1.py`（183 筆，推估約 12 分鐘）。
  設計調整：國旗＋地標合成為「十位朋友站在自己國家地標前」的照片卡（10 張 Codex 圖，0 元），國旗程式畫。
  對話後的「跟著 Amy 和 Ben 唸」拿掉以控制片長。
  Google 文件腳本：1xObpQ05Aj89d6NNzR-dhnTRV6CEIlPv4Oxa60uwxNvc — **等老師看腳本**。
- 2026-11-05 晚：老師說「開始下一步」＝腳本通過。插圖 13 張（`gen_art6.py`，Codex 0 元）→ `video6-isfrom/art-review-v1.jpg` 已傳。
  配音 v1 11:35（`voice_v1.mp3` 已傳）；whisper 125 句只剩拼法差異。踩坑：雲哲（zh-TW-YunJheNeural）時好時壞、edge-tts 曾卡 18 分鐘
  → 每句 60 秒逾時＋重試 10 次；Amy（Ana）把 "Is she from the UK/USA?" 的 Is 吞掉 → TTS_FIX 加逗號。**等老師看插圖、聽配音**。
- 2026-11-05 晚：老師「通過」插圖與配音。國旗改用 Wikimedia Commons 官方 SVG（`fetch_flags.py`，公有領域，片尾註明）。
  新程式 `world_board.py`、`board_v6`（render_v1.py）、`talk_shots.py`／`talk_deluxe.py`（Amy 問、Ben 答、右側照片卡）。
  試片 `renders/video6-pilotA-v1.1-720p.mp4`（0–90 秒）、`video6-pilotB-v1.1-720p.mp4`（對話 1）已傳。**等老師看試片**。
  試片自修：老師指的手擋十人總覽、答句擠一行、✘ 與男女圖示重疊、Ben show＝抱吉他、字幕「」」落行首、第二遍 Amy 不見、問答照片太小。
- 2026-11-05 晚：試片 A v1.1（0:00–1:30）、B v1.1（對話 1）720p 已傳。修正：字幕收尾標點不落行首；Amy 只在第一遍走進來；
  問答停在 Ben＋照片近景；答句分兩行；✔✘與男女圖示並排；國旗改 Wikimedia 官方 SVG。**等老師看試片**。
  影片 7（國家單字）排在影片 6 之前 → 影片 6 開場改「Remember our ten friends?」、from 段縮短（老師採納建議①②）。
- 2026-11-05 22:07：老師「通過，渲染全片」。全片 v1 `video6-isfrom/renders/video6-isfrom-v1.mp4`（11:43，1080p，8 段 62 分鐘）＋ 720p（28 MB）已傳。
  抽 24 格：3:45 Lily 那句中文說明字幕排三行，蓋到答句字卡下半（待老師回饋一起改：縮短中文 → 重配音 → 全片重渲）。**等老師看全片 v1**。
- 2026-11-05 23:09：**定案 v1.1**（老師「修 3:45 後定案」）。`video6-isfrom/renders/video6-isfrom-v1.1.mp4`（11:43，21079 格）＋ 720p 已傳。紀錄見 `video6-isfrom/FINAL.md`。
