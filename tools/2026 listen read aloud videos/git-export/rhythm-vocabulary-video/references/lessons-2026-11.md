# 2026-11 工作流程與踩坑（Claude 接手後）

整理自 2026-11-13～11-28 這段時間：交接、二水小行星 12 地點、Free Time 跟讀版、Super Fun 節奏版（Ken 3D／雙圖示卡）、he/she 紅字版。
每條的格式是「現象 → 原因 → 做法」，括號裡是出處。

---

## 一、現行課堂預設（2026-11-28 起）

1. **節奏用 Super Fun 模式**（`superfun`）：128 BPM、前奏 4 小節、每張卡 2 小節（第 1 小節老師聲、第 2 小節兒童聲）、片尾總覽每拍跳出一張。
   - 老師 11/28 說 11/14 的跟讀版（老師→學生空拍→兒童→學生空拍）「跟讀效果不好」，要改成 Super Fun 單字韻文的節奏。
   - 參考片在專案 `參考/Super Fun節奏/`，分析在 `analysis/superfun-reference-20261128/`。
2. **語音原速 1.0**：0.85 倍放不進 128 BPM 的一小節（1.875 秒）。原速語音在 `prepare` 時已經產生（`NNN-normal.wav`），不用重錄。
3. **伴奏用本機 `backing.py` style 6＋換卡音效**（`card_sfx`）：老師聽過 4 首 KIE Suno 和本機版後，選本機版。
4. **音量**：整片 −14 LUFS（`target_lufs`），伴奏比人聲低 6 dB（`backing_db`），鼓 ×1.8（`drum_gain`）。老師先後嫌「整個音量太小聲」「鼓再大聲一點」，才定成這組數字。
5. **一支一種圖**：Ken 3D 一支、雙圖示卡一支（`mode: one-round`），每支 11 張，約 62 秒。
6. **字型 Comic Relief／Comic Sans 交替**：上一支用哪個記在專案 `CLAUDE.md`。
7. **第三人稱版**：字尾 -s／-es／-ies 紅字（item 加 `red_spans`），左人物＋名牌、右雙圖示，字幕和語音只有動詞片語（不唸主詞）。

---

## 二、新題組標準流程

1. **RDQ**（老師每次都會指定）：一輪最多 3 題，題目和選項都要在正文寫完整；建議另列 3–5 條。老師常用「1A 2B 3C＋貼上建議全文」回答，貼上的建議＝全部採納。
2. **找素材**：先找網站資料夾和遊戲專案，核對數量。老師說的數字可能和實際不同（說 12 個、其實 11 個），要先回報。
   - 二水小行星地點：`escape room HWG5-U01-U02/site/public/ershui-3d-quest-planetlisten/`，遊戲在 `2026 REA Games/3D planet/godot-ershui-planet/`。
   - Free Time 活動：網站 `ershui-3d-quest-freetime/`，遊戲在 `3D planet/godot-ershui-freetime/`。
   - 雙圖示：listen 版原圖 `3D planet/資料/listen-3clues/icons/`（raw 是兩個並排的原圖）；Free Time 版 `3D planet/資料/freetime/clues/icons/`（512 px，遊戲裡那份只有 256 px，不要用）。
3. **做卡片**（見第三節）→ 卡片總覽先給老師看。
4. **語音**：先查快取；缺的先報價，老師同意（可以在 RDQ 先同意）才生成 → ASR → 修音 → 錨點（見第四節）。
5. **樣本或試片**（約 20 秒，或第 1＋3 輪）→ 老師通過 → 全片。
6. **全片**：`plan → render → verify → check_preview.cjs`，量 LUFS，抽格看單張卡、總覽、最後一輪。
7. **老師說「確定為正式版」** → 寫 `TEACHER_ACCEPTANCE.json`（原話、SHA、bytes），登記 `FORMAL_BASELINE.json`，更新專案 `CLAUDE.md` 正式片表、README、記憶。
8. **收工**：只 commit 文件、`rdq/`、去識別的 `git-export/`、遊戲 `game.gd` 的測試模式；影音、語音、學生作品不入庫。

---

## 三、卡片與圖片

| 現象 | 原因 | 做法 |
|---|---|---|
| 遊戲的抵達截圖人物或建築太小、被房子擋、有半透明方塊 | 抵達鏡頭是為遊戲設計的 | 在遊戲 `game.gd` 加測試專用 `CARDS=1` 模式：藏 UI（`ui.visible=false`）和浮動地名（billboard `Label3D`），每個地點拍 3 個角度 × 2 個距離，用 `--resolution 2560x1440` 拍，留裁切空間（二水 11/13、Free Time 11/14） |
| Free Time 一回合裡人物不全是 Ken | 預設路線混用 Ken／水鈴／圳寶 | `ROUTE=ken_a OUTTAG=<名稱>` 跑完整回合，在 `_4act` 之後拍（Free Time 11/14） |
| GDScript `var bm := (...)/2.0` 解析錯誤 | 型別推斷不出來 | 寫明型別 `var bm: Vector2 = ...`（二水 11/13） |
| 測試截圖留在遊戲資料夾 `res://test_*.png` | `_shot` 存在專案裡 | 拍完立刻搬到 `productions/.../source/`，刪掉 `test_card_*` 和 `.import`；跑完確認遊戲自己的 TEST SUMMARY 沒有失敗 |
| 老師嫌部分 3D 模型醜（超市、公園） | 模型本身就不好看，換角度救不回來 | Codex `codex exec -i ref.png -` 以截圖當參考重畫，保留外型、加用途線索和**英文招牌**，每張 2 版給老師挑；美化圖和遊戲截圖畫風會混搭，要先告訴老師（二水 11/13） |
| 第 12 個地點沒有圖示 | 網站只有 11 個 | 用同一套 STYLE 提示詞，以 Codex 新生成雙圖示（便利商店：飯糰＋泡麵）（二水 11/13） |
| 雙圖示要合成一張卡 | — | 兩個圖示裁邊後各縮到約 400 px，左右並排在 1024 白底上；skill 的 `card()` 會自己加白框，不要再畫框 |
| he/she 版要人物 | 專案只有 Andy | Andy 用 HWG7 `CHAR-06-Andy.png`；Mandy、he、she 用 Codex 以 Andy 當畫風參考新畫，三人髮型、衣服顏色要明顯不同，先給老師看（11/28） |
| 合成卡上的名牌、紅字 | — | 名牌是圓角色塊＋Comic Relief；紅字色 `(255,96,84)`，`label(..., red=[[起,迄]])` 用前綴寬度定位重畫 |
| 抽象的總覽版型 | skill 原本只支援 1–10 張 | 已加 5 張（上 3 下 2）、11 張（4＋4＋3）。**特殊張數的分支要寫在「1–9 張」範圍檢查之前**，否則會先被擋掉（11/28） |

---

## 四、語音

| 現象 | 原因 | 做法 |
|---|---|---|
| 24 段一次送出被擋：「Conservative per-request reserve exceeds current task budget」 | `speech_tools` 每段保守預留 US$0.02 | 分成兩批，每批 `budget_usd` 0.15，總額仍在老師同意的上限內（二水 11/13） |
| 第二批跑完寫 index 失敗：「Cache index belongs to another request set」 | index 綁定第一批的清單 | 把舊 index 改名，用完整清單再跑一次 `generate --execute`，全部命中快取、0 個新請求，重建 index |
| 只想先看要送幾個請求，`generate`（不加 `--execute`）被自動模式擋下 | 付費 API 相關的指令會被當成高風險 | 老師同意前不要跑 `generate`；直接數清單就好 |
| ASR 把 tea shop 聽成 T-Shop、convenience 聽成 convenient | tiny.en 太小 | 用本機 **small.en** 複核（medium.en 快取缺 `model.bin`，不能用） |
| ASR 把 plays 聽成 praise、goes 聽成 those，換模型、聽 API 原始檔都一樣 | TTS 真的唸不清楚 | 回報老師，同意後重生該段，instructions 加「Articulate the first word very clearly…」（he/she 11/28） |
| 兒童聲 supermarket 開頭 /s/ 拖了 1 秒 | TTS 偶發 | 在嘶聲中段剪掉，15 ms 交叉淡化，bank 換新路徑與 SHA（二水 11/13） |
| 老師聲 watch TV 唸成「watch… T… V」 | TTS 把縮寫拆開唸 | 只剪靜音中段，聲音不動（Free Time 11/14） |
| 一句太長放不進一小節（兒童聲 plays online games 1.95 秒） | 128 BPM 一小節只有 1.875 秒 | 先剪中間靜音；還是太長就請老師同意重生，instructions 加「in one breath with no pauses, at a brisk natural pace」（11/28） |
| 舊錨點（句尾名詞的重音）讓片語提早開始，蓋到前一格 | 舊模式是把重音對在拍上 | 格子式的節奏（跟讀、Super Fun）改用**第一個母音起音**對齊格子開頭，整句要放得進自己的格子 |
| 11 張連排時相鄰音檔重疊，verify `no_overlap` 失敗 | 音檔頭尾留了靜音 | 每段裁到起音前 30 ms、尾音後 50 ms（5 ms 淡入淡出）；`no_overlap` 門檻改成 ≥ 30 ms |
| 卡片在最長那句還沒唸完就離場（`cards_out_after_tail` 失敗） | 離場時間固定 | 離場時間改成「人聲結束後才開始」 |

---

## 五、節奏、伴奏與音量

| 現象 | 原因 | 做法 |
|---|---|---|
| 老師說「跟讀效果不好」 | 空拍等學生的節奏太慢 | 改用 Super Fun 節奏；跟讀模式留在 skill 裡但不再當預設（11/28） |
| 參考片的配樂不能用 | 有版權 | 只復刻節奏結構，伴奏自己做 |
| 整片太小聲（−20 LUFS） | 伴奏只比人聲低 12 dB、沒做響度正規化 | `target_lufs` −14＋`backing_db` −6 |
| 拉到 −14 LUFS 後 true peak +1.2 dBFS | 響度提高後峰值超過 | 軟限幅上限改成 −3 dBFS，成品約 −2 dBFS |
| 計畫時寫檔失敗「Audio clipping」 | `wav()` 不准寫 ≥ 1 的樣本；鼓加大後伴奏分軌、響度量測用的暫存檔都超過 | 伴奏分軌寫檔前縮放；響度量測前先把混音縮到峰值 0.98 |
| 鼓要更大但貝斯、叮聲不要變 | 伴奏是整體正規化 | `drum_gain` 只放大鼓組；正規化基準用「沒放大鼓的版本」 |
| KIE Suno 做出來的速度是 128.7–138 BPM，拍點還會飄 25–50 ms | AI 音樂不會剛好照指定速度 | `warp_suno.py`：librosa 抓拍點、低頻能量找第一拍，**逐小節** rubberband 伸縮到剛好 1.875 秒再接起來；對齊後 p95 誤差 17–25 ms |
| KIE 費用 | — | Suno「Generate Music」每次 12 點（約 US$0.06），一次約 2 首，現在要用 V6（V4–V5.5 已停用） |
| `kie.py post /api/v1/...` 出現「URL can't contain control characters…/Program Files/Git/api…」 | Git Bash 把開頭是 `/` 的參數轉成 Windows 路徑 | 前面加 `MSYS_NO_PATHCONV=1`；這次請求其實沒送出、沒扣點 |
| Windows 上 ffmpeg 的 stderr 用 `text=True` 讀到解碼錯誤（`NoneType has no attribute splitlines`） | 預設編碼是 cp950 | `encoding='utf-8', errors='replace'` |

---

## 六、檢查

| 現象 | 原因 | 做法 |
|---|---|---|
| 瀏覽器檢查 `all_word_jumps` 失敗，但 22 個跳轉其實都對 | `check_preview.cjs` 用「朗讀次數 ÷ 2」算按鈕數；有一輪只有兒童聲 | 改用字卡場景數 |
| 改 skill 後不確定舊片會不會受影響 | — | 每次改完，用三支舊正式片（HWG7、二水、Free Time）重新排時間軸，比對片長與朗讀次數完全一樣 |
| 自動檢查全過，老師還是會挑聲音 | 機器無法判斷自然度 | 交件時點名最可能有問題的段落（最長、重生過的那幾句），請老師特別聽 |

---

## 七、Git 與檔案

| 現象 | 原因 | 做法 |
|---|---|---|
| 改了 11 行，git 顯示整份 SKILL.md 都改過 | repo 裡是 CRLF，`core.autocrlf=true` 加入時轉成 LF | 檔案轉回 CRLF 後用 `git -c core.autocrlf=false add` |
| push 時出現「AUTO_MERGE.lock: File exists」 | 10/25 留下的空鎖檔，電腦上還有其他 git 程式 | commit 和 push 仍然成功；不要自己刪鎖檔 |
| bash heredoc 裡的 Python 有引號就壞掉 | shell 引號跳脫 | 長一點的 Python 用 Write 寫成 `.py` 檔再執行 |
| Python 字串裡的 Windows 路徑反斜線被吃掉 | `'\'` 跳脫 | 用 `Path.as_posix()` 或正斜線 |
| 改 skill 前沒有備份 | — | 先 zip 備份到專案 `skills/`；改完同步三份：`~/.claude/skills/`、專案 `skills/`（G 槽主本）、`git-export/`（去識別副本） |
