# How Do You Go — 2D 動畫版交接與工作流 / 2D Handoff & Workflow

日期 Date：2026-10-18　狀態 Status：**全曲 2D v1 已完成並由教師定為正式版（2026-10-18）。**

> **2026-10-18 正式版確認：教師確認「2D v1 全曲可以，定為正式版」。** `FORMAL_RELEASE.json` 已改指向 2D v1（英文字幕版＋聽力版，雜湊與 QA 報告一致）；V15 列為前一正式版，V15／V13 成品、程式與檢查紀錄全部保留未改。驗收紀錄 `qa/teacher-acceptance-2d-v1.json`。

> **2026-10-18 全曲 2D v1 已完成（教師指示「直接完成全曲」），待教師觀看驗收。**
> | 檔案 | 用途 | Bytes | SHA-256 前 12 碼 |
> |---|---|---|---|
> | `renders/How-Do-You-Go-2D-v1-English.mp4` | 全曲＋卡拉 OK 逐字字幕 | 149,215,002 | `247069bff594` |
> | `renders/How-Do-You-Go-2D-v1-Listening.mp4` | 聽力版（無字幕） | 142,720,135 | `3c947dc987a4` |
>
> 規格：1920×1080、30 fps、**5,164 格／172.133 s**（與 V13 同格數）、完整原曲（AAC 192k）、不配音、全片對嘴原曲。
> **檢查（`qa/final-verification-2d-v1.json`）**：兩版完整解碼 0 錯誤；原曲 10 窗零偏移相關 0.9970–0.9990、最佳偏移 0 ms；兩版音軌 md5 相同；11 個場景格數加總 = 5,164（`qa/assemble-report.json`）；全片縮圖 `qa/full-contact-2d-v1.jpg`。字幕文字直接取自已校驗的 52 句 SRT。
>
> **場景表（全曲秒）**：S00 開場 0–14.83｜S01 Taiwan 汽車 14.83–21.72｜S02 Singapore 捷運 21.72–28.98｜S03 Japan 步行 28.98–37.08｜S04 副歌一 37.08–52.38｜S05 Korea 公車 52.38–69.66｜S06 副歌二 69.66–84.06｜S07 UK 火車 84.06–91.06｜S08 USA 機車 91.06–105.44｜S09 交通口號＋舞蹈段 105.44–126.86｜S10 最終副歌＋尾奏 126.86–172.133。各場景檔開頭都有「歌詞↔畫面」對照表；場景只在段落邊界換景（符合已確認 RDQ）。
> **對嘴規則**：第一人稱的句子由該角色對嘴；第三人稱旁白句（She's / He's / Where is Alan…）角色閉嘴微笑；副歌與群唱六人一起對嘴；舞蹈段的 Friends, let's go／Ah／Ooh 也張嘴但不上字幕（`song_lipsync.py --chants`）。S05 由 JP 男孩唱提問、KR 女孩唱回答。
> **全曲架構新增**：`lipsync/song_words.py`（52 句逐字時碼＋拍點 → `engine/song-data.js`；1 句 ASR 擠壓的「Off to school—let's go!」146 s 改依字長平均分配）、`engine/cast.js`（六角色＋媽媽、正面角色 `kidFront`、12 種隨拍舞步、六國國旗）、`engine/group.js`（操場、地球、彩帶、舞台燈、六人隊形）、`engine/render.py` 改以全曲格號渲染（串接零誤差）、`engine/render_all.py`（平行渲染／串接）、`engine/qa_full.py`。S03、S05、S07、S08 由子代理依同一規格製作，我逐張抽查後納入。
> **重現**：`cd engine` → `python -I render_all.py render --jobs 8`（本機約 15 分鐘）→ `python -I render_all.py assemble` → `python -I qa_full.py`。
> **已知限制**：ASR 逐字時碼除 S01／S02 外未逐字人工聽校；側面角色轉身為 0.2 s 壓扁翻面（約 1 格很薄）；側面頭部不畫瀏海／捲髮／雀斑（正面有）；S08 媽媽全程戴安全帽，只有 Wendy 的安全帽在 "Helmet" 落下；S05 上車時人物在門口偏小；S09／S10 部分標題字卡壓到校舍招牌；無逐音素口型（以人聲能量＋圓唇近似）。未 Git commit／push；Drive 服務端同步未驗證。

> **2026-10-18 S01 教師確認可以；S02 Singapore 捷運已完成，待教師確認。** `renders/pilot-s02-singapore-metro.mp4`（歌曲 21.72–28.98 s、7.26 s、1080p／30fps、原曲音軌、完整解碼通過）；另有 `renders/pilot-s01-s02-joined.mp4`（14.26 s，兩場景接續，原曲連續不中斷）。
> - 歌詞↔畫面：She's → 女孩向鏡頭揮手；Singapore → 新加坡國旗泡泡；She goes to school → 列車在月台門後減速駛入，車頭「➜ SCHOOL」在 "school" 亮起；by metro → 月台門與車門滑開＋「by metro」字卡；Ready for school? → 歪頭＋問號泡泡，"school" 時車頭再亮；Ready, let's go! → 握拳舉高小跳，"let's go" 走進車廂。
> - **對嘴取捨**：第一句是第三人稱旁白（She's from Singapore…），女孩不開口、只微笑；第二句（Ready… let's go!）才跟原曲對嘴。
> - 引擎新增 `raise`（單手握拳舉高）與 `alpha`；`wordCard`／`burst`／`star` 移到 `engine.js` 共用。

> **2026-10-18 最新（教師指示）：本版不配音，對嘴原曲；動畫必須逐句對應歌詞內容。** 新試片 `renders/pilot-s01-lyric-lipsync-v2.mp4`（7.000 s、1080p／30fps、只有原曲 14.83–21.83 s，完整解碼通過）。
> - **對嘴原曲**：`lipsync/song_lipsync.py` 以 `data/asr-candidates.json` 的逐字時碼（本段 16 字與正式歌詞一致）為開合窗，乘上原曲中央聲道 300–3000 Hz 的人聲能量起伏；字間閉嘴，o/u 音給圓唇。輸出 `scenes/s01-taiwan-car.lipsync.js`。實測：字內平均開口 0.42、最大 0.94；字外最大 0.00。車窗內與下車後的嘴型都用這組資料。
> - **歌詞↔畫面**：Taiwan → 國旗泡泡；by car → 車在 "car" 前停穩並彈一下＋「by car」字卡；Here is my school → 轉身指向學校，學校在 "school" 彈跳發光；Here we are → 駕駛家長在 "we" 揮手，女孩 Y 字歡呼並在 "are" 跳起＋星星。字幕改為卡拉 OK 逐字變色。
> - 引擎新增：`point`／`cheer`／`hop`／圓唇嘴型、`drawKaraoke()`、`mouthAt()` 優先讀 `LIPSYNC`；車門窗改為鏤空玻璃，看得到後座女孩。
> - TTS 素材保留未用：`tts/wav/`、`tts/s01-taiwan-car-voice.wav`，TTS 口型資料移到 `tts/archive/`。
> - 已知限制：ASR 逐字時碼為自動辨識，其他段落套用前要先核對；人聲能量含伴奏殘留；歡呼手臂畫在頭後方以免擋臉。

> **2026-10-18 更新：S01 TTS 已生成並接上口型。** 教師確認後以 `--go` 呼叫 `gemini-3.8-flash-tts`（Leda）生成 2 句：S01-L1 3.88 s、S01-L2 2.36 s（`tts/wav/`、`tts/timings.json`）。`tts/build_voice.py` 依 `lines.json` 的 `at`（0.15 s／4.20 s）排軌，輸出 `tts/s01-taiwan-car-voice.wav` 及 `scenes/s01-taiwan-car.voice.js`（60 Hz RMS 口型包絡＋依實測秒數的字幕時碼）；`engine.js` 新增 `mouthAt(t)`，場景嘴型與字幕改由 TTS 驅動。新試片：`renders/pilot-s01-tts-A-song.mp4`（模式 A：TTS＋原曲 0.3 倍音量）與 `renders/pilot-s01-tts-B-voice-only.mp4`（模式 B：只有 TTS）；兩支各 7.000 s、1080p／30fps、AAC 48 kHz 立體聲，完整解碼通過；A 版峰值 −2.7 dB。**已知問題：A 版裡 TTS 與原曲同時說唱同一句，可能互相干擾，需教師試聽判斷。** 金鑰未寫入任何檔案。
>
> **2026-10-18 update:** S01 TTS (Leda, 2 lines) generated; lip-sync now driven by a waveform RMS envelope; two pilot mixes (A: TTS + song at 0.3, B: TTS only) rendered and decode-checked.

---

## 1. 專案交接 / Project handoff

**專案**：`tools/2026 AI ANIMATED VIDEO`（教師：國小英語 3–6 年級；檔案用繁中＋英文）。
**歷程**：Seven Days（2D 程式動畫→驗收）→ How Do You Go（v1–v15，從 2D 立繪一路改成 Three.js 3D 蒙皮骨架＋AI 插畫背景）。
**目前正式版**：V15（2026-10-17 教師確認）。`output/how-do-you-go/FORMAL_RELEASE.json` 指向 V15。V13 及更早版本、來源檔全部保留。**本次未修改任何舊檔。**

### V15 成品分析 / Analysis of `How-Do-You-Go-Full-v15-English.mp4`
| 項目 | 數值 |
|---|---|
| 規格 | 1920×1080、60 fps、172.133 秒、10,328 格、H.264＋AAC 48 kHz 立體聲、100 MB |
| 音訊 | 原曲 `sources/How Do You Go.mp3`（K-POP 風、女聲主唱＋群唱），完整保留 |
| 字幕 | 52 句英文，`renders/How-Do-You-Go-English.srt/.ass`；時碼已校驗 |
| 結構 | 開場群舞(0–14s)→**Taiwan 汽車**(14.8)→**Singapore 捷運**(21.7)→**Japan 步行**(28.9)→副歌群舞→**Korea 公車**(52–69)→副歌→**UK 火車**(84)→**USA 機車**(91–105)→舞蹈段(~106–126)→尾段副歌／拍手各國(126–158)→結尾 See you at school |
| 角色 | 6 人：TW 女、SG 女、JP 男、KR 女、UK 男 Alan、US 女 Wendy ＋ Wendy 媽媽（`data/characters-v2.json`） |
| 美術 | 動漫風 AI 背景插畫（gpt-image-2）＋ 3D 蒙皮人物＋ 60 fps 程式動作 |
| 品質 | 全片解碼／10 窗原音對齊／52 句字幕／9 個渲染接縫／腳滑≤0.54 mm 均通過 |
| 限制 | 無逐音素口型；車輛是插畫圖層＋接觸代理；人物偏 3D 人偶感；渲染需 RunPod（約 40 分鐘、US$0.62） |
| 沒有 | 角色對白配音（全片只有歌曲人聲）、真正的 2D 手繪感 |

**為何要改 2D**：V15 的 3D 骨架管線很重（Pod 渲染、數千行接觸／IK 程式），卻仍有「人偶感」。2D 向量／剪紙動畫更貼近國小學生喜愛的繪本感、輕量、可在本機 35 秒渲染 7 秒，且易於逐句配音。

---

## 2. YouTube 教學影片分析 / Tutorial analysis
影片：「Claude Opus 5.5 + JavaScript = INSANE 2D Animations (Full Tutorial)」(https://youtu.be/MPDhk385gSg，約 14 分；逐字稿已取得)。以下「講者陳述」與「本專案推論」分開。

**講者陳述 Presenter claims**
1. 動畫全由 JavaScript 逐格畫出，不用影片生成模型或動畫軟體；配音用 **Gemini Flash 3.8 TTS**，背景音樂由 Opus 用 **Python 程式合成**。
2. 三個層級：**L1** 一句話（「用 JS 動畫黑洞」）→結果隨機不穩；**L2** 結構化提示＋風格參考影片＋節奏指示，可接 HyperFrames／Remotion 渲染框架，並要求 Opus 自行作曲／音效 → 穩定專業；**L3** 加 MCP（B-roll、旁白、音樂）＋ HyperFrames 時間軸面板。
3. L3 仍需**人提供三樣東西**：劇本／構想、**參考影片**、**節奏（pacing）研究**；模型自己做不好。
4. 設定：Claude Code＋Opus 5.5，effort 用 high／extra（max 少用）；把模型限制在工作資料夾；強調「達到參考影片品質前不准停」。
5. 已知弱點：L2 範例「偏平、沒有景深」→ 要再迭代加層次；Sonnet 5.5 也能做，但 Opus 更精緻。

**本專案推論 Our inference**
- 你已有比講者更強的資產：**172 秒完整歌曲、52 句時碼、角色設定、分鏡、已驗收的 V15 當動作參考影片、RunPod／Playwright 渲染經驗**。缺的只有「2D 美術語彙」和「對白配音」。
- 講者的 Level 2（結構化提示＋參考影片＋自製渲染框架）最適合本案；Level 3 的 MCP 並非必要——TTS 直接呼叫 Gemini API 即可。
- HyperFrames／Remotion 是選配；本專案採**自建 Canvas 引擎＋Playwright＋ffmpeg**（已驗證可用，無新依賴）。

## 3. Gemini 3.8 Flash TTS 規格（官方文件已查）
來源：[模型頁](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash-tts)、[語音生成指南](https://ai.google.dev/gemini-api/docs/speech-generation)。
- 模型 ID `gemini-3.8-flash-tts`；輸入文字≤8,192 token；輸出 WAV **24 kHz／mono／16-bit**；130+ 語言自動偵測。
- 30 個預設聲線（Leda 年輕、Puck 活潑、Zephyr 明亮、Aoede 輕快、Charon 資訊感、Sulafat 溫暖、Achird 友善…）；另有 Extended Voice Library、Voice design、Voice replication。
- **多人對話**單次請求最多 **2 位**說話者、僅預設聲線；超過就分句生成。
- 語氣寫在每輪 `speech_metadata.style`；瞬間事件用 `<short pause>`、`<laugh>`、`<sigh>`、`<breath>`；**文字欄位會被逐字朗讀**，不可混入舞台指示。
- **沒有**逐字時間戳或口型資料 → 時間軸以生成後 ffprobe 實測長度為準，口型用音量包絡（見下）。
- 需 `google-genai >= 2.25.0`（本機已裝 2.31.0）。金鑰：本機環境已有 Gemini 金鑰變數；**不得寫入 repo**。定價頁面未取得，費用請教師在 AI Studio 確認。

---

## 4. 最佳工作流 / Recommended workflow（Opus 5.5 寫程式 × Gemini 3.8 Flash TTS）

```
  ① 導演包 Direction pack（人做，一次）        參考：V15 影片、角色表、SRT
  ② 腳本表 lines.json（誰、說什麼、語氣）──► ③ TTS：tts_gemini.py ──► wav/*.wav + timings.json（實測秒數）
  ④ 場景程式 scenes/sNN-*.js（Opus 寫）◄── timings.json 驅動口型/動作/字幕時碼
  ⑤ 預覽：render.py --still t（單格，數秒）──► Opus 看圖自我批評 ──► 改程式（迴圈 3–5 次）
  ⑥ 試片整段 render.py（每 7 秒≈35 秒）──► 教師驗收（RDQ 停點）
  ⑦ 全曲：逐場景渲染 → ffmpeg 串接 → 混音（原曲／TTS／音效）→ QA（解碼、波形對齊、字幕、抽格）
```
**關鍵設計決策**
1. **純函式引擎** `renderFrame(t)`：同一 t 永遠同一格 → 可平行、可只重畫一個場景、可 diff、可重播。（對應講者建議的「固定步進＋逐格截圖＋ffmpeg」。）
2. **TTS 先行，動畫跟著聲音**：先生成 wav 並實測秒數，再把 `timings.json` 灌進場景；口型 = 對 wav 取 30 Hz RMS 包絡→嘴張合 0–1（無需口型模型）。
3. **角色一次定義、全片共用**：`CH_*` 調色盤＋同一個 `kid()` 骨架（兩段肢體＋圓端＋墨線）→ 6 人一致；表情／眨眼／馬尾擺動全程式化。
4. **手繪感**：固定 12 fps 的線條「boil」抖動（決定性亂數）＋粗墨線＋平塗；背景視差慢移、雲／樹微擺，避免「偏平」（講者指出的缺點）。
5. **分層景深**：天空→遠景→樹→人行道→主體→前景，各層不同視差速度；陰影、煞車下沉、輪子依位移旋轉。
6. **音訊兩種模式（待教師選）**：**A 保留原曲**（TTS 只加角色對白／旁白，原曲壓到 −5 dB 作底）；**B 純 TTS 版**（改編為可朗讀的對話式動畫，無歌曲，適合課堂聽力）。預設建議 A，並另出 B 的聽力版。
7. **每步驗收**：沿用本專案 QA：全片解碼、波形對齊、字幕與 SRT 逐字相同、場景接縫連續、抽格目視；產出 `qa/` JSON。
8. **費用**：2D 全程本機渲染（≈14 分鐘／全曲），**不需 RunPod**；唯一付費為 TTS（約 50 行短句，請先確認價格）。不需新生圖。

### 場景對照表 / Scene map（時碼取自 V15 SRT）
| # | 歌曲時碼 | 內容 | 2D 製作重點 |
|---|---|---|---|
| S00 | 0–14 | 開場 Where are you from? 六人群舞 | 6 人同框、手腳節拍、舉手 |
| **S01** | **14.8–21.7** | **Taiwan 汽車** | **已完成試片** |
| S02 | 21.7–28.9 | Singapore 捷運 | 月台＋列車進站、感應門、入座 |
| S03 | 28.9–37 | Japan 步行 | 側向走路循環、視差街道 |
| S04 | 37–52 | 副歌＋群舞 | 群舞 8 拍動作庫 |
| S05 | 52–69 | Korea 公車 | 公車進站、登階、揮手 |
| S06 | 69–84 | 副歌（metro／on foot） | 圖卡 pop-up |
| S07 | 84–91 | UK 火車 | 車廂窗外視差風景 |
| S08 | 91–105 | USA 機車＋媽媽 | 戴安全帽、後座、環抱（2D 側視比 3D 簡單） |
| S09 | 105–126 | 交通工具節奏＋舞蹈段 | 6 種交通圖示節拍 |
| S10 | 126–158 | 各國拍手、副歌、結尾 | 國旗、群像、See you at school |

---

## 5. 本次建立的檔案 / Files created (`output/how-do-you-go/2d-v1/`)
| 路徑 | 用途 |
|---|---|
| `engine/engine.js` | 引擎：補間、決定性抖動、角色 `kid()`、字幕、標籤 |
| `engine/player.html` | 載入場景並暴露 `renderFrame(t)` |
| `engine/render.py` | Playwright 逐格截圖→ffmpeg；`--still t` 單格、`--song`／`--audio` 混音 |
| `scenes/s01-taiwan-car.js` | 場景 01（車入場煞車、開門、下車、揮手、字幕） |
| `tts/tts_gemini.py`、`tts/lines.json` | TTS 產生器（預設 dry-run，`--go` 才付費呼叫） |
| `renders/pilot-s01-taiwan-car.mp4` | 7 秒試片（1080p／30fps、原曲 14.83–21.83 s 音軌） |
| `qa/pilot-stills-contact.jpg` | 三格抽樣 |

重現：`cd engine && python -I render.py s01-taiwan-car --song "../../sources/How Do You Go.mp3" --out ../renders/pilot-s01-taiwan-car.mp4`

## 6. 已知缺口 / Known gaps（誠實列出）
- 試片只有 1 個場景、1 位角色；嘴型目前是 `Math.sin` 假張合，尚未接 TTS 波形包絡。
- 下車動作簡化：車門以 scaleX 模擬、角色直接出現在車前；沒有「從座位站起」。
- 角色是 chibi 比例（比車高），風格與 V15 動漫寫實風不同——需教師確認是否接受「繪本平塗風」。
- 字幕字型用 Inter／系統字型；未與 V13／V15 字幕樣式逐一比對。
- 試片音軌為原曲，未含 TTS；全曲未製作；未 Git commit／push；Drive 服務端同步未驗證。

## 7. 待教師決定 / Decisions needed
1. **畫風**：平塗繪本（試片這種）／加紙張紋理剪紙風（講者 L3 範例）／更接近 V15 動漫風？
2. **音訊模式**：A 保留原曲＋TTS 對白，或 B 純 TTS 聽力版，或兩者都出。
3. **TTS 授權**：確認先生成 S01 兩句（約數 cents）試聽 Leda 等聲線；再決定全曲約 50 行。
4. 是否全曲逐場景擴展（建議：教師看過 S01 試片＋TTS 試聽後再做，維持 RDQ 驗收停點）。
