> **2026-10-18 集集線五站 2D 動畫 v1 正式版，老師確認**：國小四年級本土課程，介紹二水、源泉、集集、水里、車埕；3:02，1080p／30fps，繁中字幕，edge-tts 台灣口音（曉臻、雲哲）旁白；33 張 Canva AI 圖＋程式動畫，40 個句意逐句對應畫面。成品與驗收紀錄見 [output/jiji-line/2d-v1/HANDOFF.md](output/jiji-line/2d-v1/HANDOFF.md)、`output/jiji-line/FORMAL_RELEASE.json`。Git commit／push 尚未進行。

> **2026-10-18 Every Day Is Fun 2D 全曲正式版（教師確認「Every Day Is Fun 2D v1 全曲可以，定為正式版」）**：第二首用 2D 程式動畫流程完成的歌（Suno 生成、K-pop 偶像團、約 104 BPM）。流程：本機語音辨識＋拍點 → 52 句時間表 → 每句歌詞對應動作分鏡表（教師審核）→ S01＋S04 試片（教師通過）→ 12 場景（4 場由子代理製作、主線逐張檢查）→ 全曲。英文字幕版與聽力版各 1920×1080／30 fps／5,700 格／190.0 s；兩版完整解碼 0 錯誤、原曲 10 窗相關 0.9945–0.9991 偏移 0、兩版音軌相同；52 句逐句抽格皆有對應動作。入口 [Every Day Is Fun 交接](output/every-day-is-fun/2d-v1/HANDOFF.md)；正式版指標 `output/every-day-is-fun/FORMAL_RELEASE.json`。新安裝 faster-whisper 與 librosa（本機）。未 Git commit／push；Drive 服務端同步未驗證。以下保留歷史。

> **2026-10-18 How Do You Go 2D 全曲正式版（教師確認「2D v1 全曲可以，定為正式版」）**：改為 Canvas 2D 程式動畫（Claude Code＋Playwright＋ffmpeg），不配音、全片對嘴原曲，每句歌詞都有對應畫面；英文字幕版與聽力版各 1920×1080／30 fps／5,164 格／172.133 s。兩版完整解碼 0 錯誤、原曲 10 窗相關 0.997–0.999 且偏移 0、兩版音軌相同、11 場景格數加總 5,164。本機約 15 分鐘渲染，無 RunPod、無生圖；S01 曾試用 Gemini 3.8 Flash TTS 兩句（素材保留未用）。入口 [2D 交接與工作流](output/how-do-you-go/2d-v1/HANDOFF-2D.md)；`output/how-do-you-go/FORMAL_RELEASE.json` 已改為 2D v1，V15 列為前一正式版並全部保留。未 Git commit／push；Drive 服務端同步未驗證。以下保留歷史。

> **2026-10-17 V15 全曲正式版（教師確認「V15 定為正式版」）**：1080p／**60fps**／10,328 格／172.133 秒，英文字幕版與聽力版另附 V13／V15 左右對照。本輪以程式改善動作銜接（支撐腳重心轉移、登階骨盆跟隨支撐腳高度、腿長上限平滑化、公車站姿縮窄、汽車入座轉向車門）與畫面（貼身扁平安全帶、車身藍防滑階梯、通風槽安全帽與下巴扣帶、群舞間距加大、暖膚色）。全片解碼、10窗原音（相關≥0.9938、偏移0）、52句字幕與V13相同、9個分段接縫連續、支撐腳滑動≤0.54mm均通過；教師資料夾中的三支成片已讀回雜湊比對一致。全曲於 RunPod RTX 3090 分10段平行渲染（約 US$0.62，Pod 已停止）。入口 [V15 正式版說明](output/how-do-you-go/physical-v15/README.md)；正式版指標 `output/how-do-you-go/FORMAL_RELEASE.json` 已改為 V15，V13 列為前一正式版並全部保留。本輪無新增生圖；未 Git commit／push；Drive 服務端同步未驗證。以下保留歷史。

> **2026-10-16 V14 升級試片已完成，待教師確認**：59.4 秒／1080p／60fps，含六人近景、群舞、汽車入座、公車轉身登階及機車跨腿環抱，另附 V13／V14 左右對照。媒體／10窗原音／3,204筆動作狀態／96時間點重播通過；正常與半速靜音播放均到結尾、掉格0；33張成片抽查已記錄，安全帶貼合與階梯陰影等視覺限制仍在。入口 [V14 試片說明](output/how-do-you-go/physical-v14/README.md)。依已確認 RDQ 3A，教師確認試片後才擴展全曲；目前無 V14 全曲。V13 正式片及43個來源檔保留且雜湊不變，正式版指標未更換。本輪無新增生圖／付費／Git發布；Drive服務端同步未驗證。以下保留歷史。

> **2026-10-07 收工完成：animated-videos v2.1／規格 v4.1**：V13 正式成品為品質基準；強制新動作網路動畫影片研究、內建 Image Gen 最高可用品質。17 個來源／安裝／ZIP 檔案一致，8 章／8 頁 Markdown＋Word 已保存。[最新收工交接](CLOSEOUT-20261007-ANIMATED-V13-SKILL.md)，[v4.1 規格](deliverables/14-V13最終成品基準通用歌曲動畫規格書-v4.1確認版.md)。V13 正式影片未改；Obsidian 已讀回。未 stage／commit／push，Drive 服務端同步未驗證。以下保留歷史。

> **2026-10-07 animated-videos 已升級為 V13 基準版**：教師核准 1A／2A／3A 及全部建議。已安裝技能、保留舊版備份；新歌兩來源先分析，內建 Image Gen 加程式動畫。確認版規格見 deliverables/13-V13最終成品基準通用歌曲動畫規格書-v4確認版.md 與同名 Word；驗證見 qa/animated-videos-v13/升級與驗證紀錄.md。V13 正式影片保留。以下為歷史。

> **2026-10-07 正式版確認與收工：How Do You Go v13 全曲已由教師驗收。** 英文字幕／聽力兩支 MP4 為目前正式版，收工 SHA-256 與交付紀錄一致；原音、字幕、程式、QA 與 v11／v12 歷史版本保留。本曲無待製作或待驗收項目，下次僅依新需求接續。入口 [v13 正式版](output/how-do-you-go/physical-v13/README.md)、[本次收工交接](CLOSEOUT-20261007-V13-FINAL.md)。以下為歷史紀錄，舊待驗收狀態已由本次確認取代。

> **2026-10-07 v13 手肘與機車跨腿修正版已輸出，待教師驗收**：已修正手勢肘部方向、各角色舉手高度、機車左右踏板配對與十階段連續跨腿／入座／環抱。英文字幕與聽力全曲各 172.133333 秒、1080p／30fps；另附無音訊正常／半速動作對照。逐幀接觸、三段狀態一致性、全片解碼、原音六窗、52 句字幕與 92 格成品抽查完成。v11／v12 保留。入口 [v13 說明](output/how-do-you-go/physical-v13/README.md)。以下為歷史。

> **2026-10-07 v12 全曲優化版已完成，待教師全曲驗收**：已依「確認，開始完成全曲」延伸接受的 v12 試片，完成其他搭車動作、英文字幕／聽力兩版 MP4；各 172.133333 秒、1080p／30fps／5,164 格。全片解碼、六窗原音對齊、52 句字幕、逐幀狀態與兩處分段接縫核對通過，68 格成品抽查完成。入口 [v12 全曲說明](output/how-do-you-go/physical-v12/README.md)。v11 正式片及 v12 樣片雜湊不變；本輪無新生圖／付費，雲端遠端同步未驗證。下方為歷史。

> **最新收工 2026-10-01**：v11 已驗收；animated-videos Skill 已安裝、內建 Image Gen 路由與 v3.1 Markdown／Word 規格已完成。接續 [本次收工交接](CLOSEOUT-20261001-ANIMATED-SKILL.md)。下方保留歷史。

> **最新收工：2026-09-30 physical-v8**。六人服裝／五官與真實骨架已修改，尚非正式完整版。公車腳底支撐、媽媽立體化與自然環抱及美術 QA 待完成。下次從 [收工交接](CLOSEOUT-20260930-PHYSICAL-V8.md) 接續；沿用直接製作授權，內部 QA 全過才渲染全曲。下方為歷史。

> **2026-09-30 最新：v5 整合測試片已輸出，視覺 QA 尚未通過。** 使用者已確認 RDQ「1A、2A；建議全部採納」：段落間可換場景、單一動作內連續，先驗收 30–45 秒測試片再擴展全曲。新版入口 `output/how-do-you-go/hybrid-v5/README.md`；MP4 在 `output/how-do-you-go/hybrid-v5/renders/How-Do-You-Go-Hybrid-Pilot-English.mp4`，42.967 秒／1080p／30fps／1,289 格，完整解碼與五窗原音對齊通過，舊來源與 MP4 雜湊不變。本輪累計新增 4 張 medium gpt-image-2 圖片，metadata 與雜湊核對。人物仍是 2.5D 表面＋3D 骨架，側面、衣鞋接縫、公車透視／接地感仍有明確缺口；不得稱正式完成或教師已驗收。下一步先修視覺缺口，再由教師驗收合併測試片；不能直接擴展全曲。未發布／commit／push／Obsidian；雲端同步未驗證。以下保留歷史。

> **How Do You Go 收工，尚未驗收**：兩版全曲已保存並再次核對雜湊。下次先看全曲、確認動作與字幕修正；最新接續以 `CLOSEOUT-20260929-HOW-DO-YOU-GO.md` 為準。此次收工不代表影片驗收，以下舊狀態保留作歷史。

# 2026 AI ANIMATED VIDEO
> **2026-09-29 通用規格 v2 與上學交通附錄完成**：教師已回覆「照這份開始」，RDQ 為 confirmed。`deliverables/07-通用歌曲動畫製作流程與規格書-v2.docx`／同名 Markdown（14頁、16節、12表），以及 `deliverables/08-各國學生上學動畫專用附錄.docx`／同名 Markdown（6頁、8節、5表）已完成文字比對及20頁視覺檢查，待教師內容審閱。下一步接收新歌MP3、正式歌詞、目標學生、用途及畫風，填入角色所在地、分鏡與時碼；Image 2.5與既有gpt-image-2管道差異、費用另確認。本輪未生成新歌素材或影片；原版規格與Seven Days正式影片雜湊不變。

> **2026-09-29 正式驗收收工 / Accepted final**：教師已明確確認 `Seven-Days-palm-clap-final.mp4` 為正式版本。下次僅確認 `deliverables/06-歌曲動畫製作流程與規格書.docx` 與同名 Markdown；規格書尚未確認。最新交接以專案根目錄 `CLOSEOUT-20260929-FINAL.md` 為準；下方待驗收敘述均為歷史。

> **2026-09-29 拍手修正與規格書完成**：最新影片 `output/7 days-full-natural/renders/Seven-Days-palm-clap-final.mp4`，僅修掌心相向拍手；其他細節已由教師驗收。規格書在 `deliverables/06-歌曲動畫製作流程與規格書.docx` 與同名 Markdown。新拍手待教師觀看確認。以下保留歷史。
> **2026-09-29 截圖回饋修正版已完成**：抬手拍合、向上放風箏、水平指示與 English／Art 科目卡已修正。最新影片為 `output/7 days-full-natural/renders/Seven-Days-arms-revised.mp4`；[修正版交接](output/7%20days-full-natural/PROJECT_HANDOFF.md)。舊版保留；本版仍待教師觀看驗收，以下均為歷史紀錄。
> **2026-09-29 全曲已輸出**：29秒試片已獲使用者驗收；全曲130.8秒／1080p／37句字幕已完成兩輪修正與技術檢查，待全曲觀看驗收。最新入口：[全曲動畫交接](output/7%20days-full-natural/PROJECT_HANDOFF.md)。
> **2026-09-29 人物動作重製**：已重建人物比例、骨架、傳接球與課表插圖；最新 29 秒試片及檢查見 [自然動作重製交接](output/7%20days-natural-motion/PROJECT_HANDOFF.md)。以下是先前版本紀錄；全曲重製尚未完成。
> **2026-09-29最新製作狀態**：已依確認的1A路線生成4張素材，完成29秒程式動畫試片及兩輪修正。全曲必要QA尚未通過，詳見 [程式動畫交接](output/7%20days-coded-3d/PROJECT_HANDOFF.md) 與 [QA報告](output/7%20days-coded-3d/qa/final-report.md)。以下舊入口保留作歷史。
> **最新入口 / Resume**：[3D樣片收工交接](CLOSEOUT-20260928-3D-PILOT.md)。已轉為核准的3D童趣手繪路線，8秒樣片完成，待教師觀看。舊純程式全曲保留；以下文件階段紀錄為歷史，請勿當作最新生成狀態。


## 目標 / Goal
研究同一首歌曲的程式動畫：比較 Opus 5.5 與 GPT-6 Astra 示範的視覺、歌詞敘事、節奏與製作流程。模型名稱沿用使用者及講者標示，不作為獨立效能認證。
Study coded music animation, distinguishing model effects from production workflow effects.

## 來源 / Sources
- YouTube：https://www.youtube.com/watch?v=oeDGjIW_bUM
- Padlet：https://padlet.com/mathruffian/ai-s023yw2lmypyx5edv0tz
- Opus 示範入口：37:35（2255 秒）。
- Astra 初版入口：約 26:03（1563 秒）；修改版入口：約 50:04（3004 秒）。這些是展示入口，不是逐幀量測的音樂起點。

## 目錄 / Folders
- sources/：來源索引與取得狀態 / Source inventory.
- research/：有證據層級的初步筆記 / Evidence notes.
- rdq/：已確認需求規格 / Confirmed specification.
- deliverables/：分析報告、舊版試片提示詞、測試方案及新版全曲提示詞 / Four completed documents.
- qa/：文件讀回驗證與交付雜湊 / Document checks and hashes.

## 現況 / Status
2026-09-28：使用者確認 RDQ（1A、2A、建議全採納及「照這份開始」），三份文件已完成並讀回驗證。首次已讀取 YouTube 字幕、Padlet 模板與三版畫面抽查；本輪瀏覽器重連及音樂／歌詞附件下載未成功。原音長、句界與拍點未量測，沒有動畫程式或自製 MP4。
Analysis, reusable prompt, and test protocol delivered. No video production or audio synchronization measurement performed.

## 同步 / Sync
Git 根目錄為 G:/我的雲端硬碟/teacher-toolkit；沿用現有儲存庫，本次沒有 commit/push。GDrive 掛載寫入不代表已驗證雲端同步。父專案 Obsidian 筆記位於 G:/我的雲端硬碟/secondbrain/teacher-toolkit/工作筆記.md，本次僅讀取，未寫入。
No publishing, deployment, paid generation, or authentication changes performed.

## 交付文件 / Deliverables
1. deliverables/01-動畫比較分析報告.md：三個問題、八個時間碼證據點、四層品質比較及推論限制。
2. deliverables/02-Astra純程式動畫提示詞.md：八步驟主提示詞及第二輪定點修正提示；未執行。
3. deliverables/03-30秒測試與驗收方案.md：素材鎖定、對照設計、時間座標、九項驗收與空白紀錄表；未執行試片。

本次約定的文件工作已完成。若日後實作，先取得可讀原音檔及正式歌詞，按提示詞填入來源與輸出路徑，再另指定試作範圍。

## 新歌曲全曲提示詞 / New-song full workflow — 2026-09-28
使用者已確認新版 RDQ；新增 deliverables/04-Astra新歌曲全曲動畫完整提示詞.md（v1.0）。
包含六項改善路線、16 個主提示詞模組、定點修正與中斷接續。適用不同歌曲及歌詞；填入原音檔、正式歌詞與輸出位置後，可交給具執行能力的 Astra 使用。
流程為代表性試片自檢修正通過後自動完成全曲，風格依新歌決定。約 30 秒是試片長度，不是全曲上限。這次只製作 Markdown；改善效果及新歌影片尚未實測。
新版 QA 與雜湊見 qa/astra-new-song-prompt-manifest.json；先前三份交付雜湊未變。

## 第三節動態品質加強版 / Master prompt v2
2026-09-28：重新抽查 Opus 示範 38:02 至 40:06 附近畫面，詳見 research/Opus動態品質再分析-20260928.md。新增 deliverables/05-Astra第三節主提示詞_動態品質加強版.md 與同名 .docx。完整替換舊第三節，保留 16 個模組，新增 10 個動態品質細節段落。兩格式內容逐段讀回一致，Word 含 5 個原生可編輯表格，舊文件保留。Word 渲染器缺少 soffice.exe，未完成逐頁視覺驗收；新歌影片仍未製作。QA 見 qa/astra-prompt-v2-manifest.json。


## 收工狀態 / Closeout 2026-09-28
最新狀態以 CLOSEOUT-20260928.md 為準。六份交付檔案雜湊核對通過；Obsidian 指定工作筆記四區已更新並讀回。GDrive 雲端同步、Word 分頁及新歌影片品質仍未驗證。共用 main 混有其他專案變更，本次未 stage／commit／push。電腦維持運作。


## Seven Days 歌曲動畫 / Song animation — 2026-09-28
使用者提供提示詞、正式歌詞與 MP3，已輸出 `output/7 days/renders/full/final-v2.mp4`：130.8 秒、1080p、30 fps、11 場景與37字幕事件。來源原音130.7735秒，保留完整內容。原始三檔及副本雜湊一致。全幀解碼、字幕原文、安全區、音軌三窗偏移檢查通過；人聲句首精度、真實節拍與教師完整聽看仍待驗證，狀態 `rendered_pending_checks`。入口 `output/7 days/review.html`；接續須先讀 `output/7 days/PROJECT_HANDOFF.md` 與 `qa/final-report.md`。未付費生成、發布、commit/push 或更新 Obsidian。
