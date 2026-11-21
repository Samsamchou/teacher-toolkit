# 肯亞站〈天還沒亮就起床〉渲染計畫（2026-11-21）

- 場景程式：`tabletop/src/kenya_morning.py`；配音：`tabletop/src/kenya_voice.py`（**已產生** `audio/kenya_q/a/dark/gm/tea/tea1/tea2/yawn.mp3`、`kenya_words.json`）；合成：`tabletop/src/kenya_compose.py`。
- 分鏡：`tabletop/kenya_storyboard.md`（老師 11/20：1A 睡衣、2B 喝奶茶＋程式琺瑯杯、0A 全英文；11/20 深夜 1B：第二句改「I drink tea and eat mandazi.」）。
- 指令一律在 `tools/MIKE ESCPAEROOM/hwg7-u04-world-routines/` 下執行。Colab 工作階段 `wrt`，本機不開 Blender。
- **還沒有渲染過任何一格**，程式只做過 ASCII／語法檢查；下面「待確認」要看第一批檢查圖和 log。

## KE4 句子和動作的順序（老師 1B 的做法）

句子「I drink tea and eat mandazi.」照句子順序**先喝茶、再吃 mandazi**（分鏡原本是先吃再喝）。
配音整句只生成一次（語調自然），在 tea 和 and 之間的停頓切成兩段：`tea1`「I drink tea」從 2.7 秒開始（drink 2.99–3.49、tea 3.50–3.89，杯緣在嘴唇 2.65–3.95），`tea2`「and eat mandazi.」從 6.3 秒開始（mandazi 6.73–7.65，碰到嘴角咬 6.9）。
字幕仍是**一整行**，卡拉 OK 在 tea 和 and 之間停住等動作。

## 鏡頭與秒數（`DUR`／`VOICE` 與 `kenya_compose.py` 的 `SHOTS` 一致，已用腳本核對）

| 鏡頭 | 秒 | 渲染格（偶數格） | 動作 | 配音（鏡頭內開始 → 唸完） |
|---|---|---|---|---|
| KE1 | 5.6 | 68 | 全景。睡衣女孩坐在床邊（大腿在床墊上、小腿垂在床前、拖鞋踩地），毯子在床尾她旁邊；女主角在左邊問；女孩**左手**指右上 5:40 時鐘 | 雞啼 0.0；q 0.5 → 1.89；a 2.6 → 4.55 |
| KE2 | 3.8 | 46 | 站在床頭前：雙手往兩側平舉（不舉過頭）、手心朝前、頭和胸稍往後仰＋呵欠聲、放下 | 呵欠 1.0；dark 2.3 → 3.33 |
| KE3 | 3.0 | 37 | 右邊小凳上的太陽能燈：**右手食指**碰到按鈕才亮（程式判斷接觸，預計 1.0 秒），房間藍→暖黃 | 喀 1.0；gm 1.5 → 2.53 |
| KE4 | 9.0 | 109 | 窗邊小木桌：① 琺瑯杯（食指中指穿把手、拇指壓把手、手心朝身體中間），從臉右側到下嘴唇，喝一口（頭微後仰），4.95 秒杯底碰桌才放手；② mandazi（拇指在胸口側、食中指在鏡頭側，捏一角旁邊），從臉右側送到右嘴角，6.9 秒碰到才換咬過的、點頭兩下，8.25 秒放回盤子才放手。窗外地平線越來越橘，右上時鐘 | a 0.3 → 2.25；tea1 2.7 → 3.89；tea2 6.3 → 7.65；喝 2.9、放杯 4.95、咬 6.9、放回 8.25 |

合計 21.42 秒、257 格（12 fps）。正式渲染格數 68＋46＋37＋109＝260。

## 檢查鏡頭（手部不開景深、長焦距；檢查鏡頭都不放女主角）

| 鏡頭 | 看什麼 | 影格 |
|---|---|---|
| KE1L／KE1L2 | 坐姿腿：從她左側略高／前方右低角度。大腿平放在床墊上（壓進約 1 mm）、沒有穿過床墊；小腿在床前垂下、拖鞋踩地 | 72 |
| KE3HF／KE3HS | 右手食指按燈座按鈕：手心朝下、食指彎下去指尖碰按鈕、其他指收起、拇指貼中指 | 20、24、28 |
| KE4HF／KE4HS | 右手在杯把：食指＋中指穿過把手、拇指在把手上、手心朝她身體中間（+x）、手背朝畫面左邊 | 30、36、40 |
| KE4HF2／KE4HS2 | 喝一口：杯子在臉的右側、杯緣碰下嘴唇、杯子在眼睛下面、手在下巴右下方 | 64、72、84 |
| KE4HF3／KE4HS3 | 捏 mandazi：拇指在上（靠胸口那面）、食中指在下（另一面）、捏在盤緣突出那一角旁邊 | 134、138、142 |
| KE4HF4／KE4HS4 | 咬：mandazi 另一角碰右嘴角、在眼睛下面、手和食物在臉的右側不擋臉 | 160、166、170 |

## (a) 第一批檢查圖（light：32 樣本、50%）

```text
python tabletop/src/colab_run.py light kenya_morning "KE1 72" "KE1L 72" "KE1L2 72" "KE2 36" "KE3 0,48" "KE3HF 20,24,28" "KE3HS 24"
python tabletop/src/colab_run.py light kenya_morning "KE4 0,72,168" "KE4HF 30,36,40" "KE4HS 36" "KE4HF2 64,72,84" "KE4HS2 72" "KE4HF3 134,138,142" "KE4HS3 138" "KE4HF4 160,166,170" "KE4HS4 166"
```

- 共 29 格、17 次開 Blender（每鏡要量床、桌、身體）。依英國／西班牙紀錄，兩批約 **0.6–0.8 單位**。總表：`python tabletop/src/sheet4.py tabletop/qa/<資料夾>`。
- KE3 第 0 格＝開燈前（月光）、48＝開燈後（暖光）：老師要先看亮度（分鏡要求）。

### 看 log（`tabletop/qa/<資料夾>/tout/<鏡頭>.log`）

- `DESK BODY`、`DESK SEAT_UNDER`、`DESK BEDPROBE`（床墊高度、可坐的區段）、`DESK BED fit ... heights x?`（床只壓高度、不縮面積）、`DESK BED check`（座位下床墊高度＝想要的座高）、`DESK SIT`／`DESK LEGS`（大腿在床墊上幾 mm、腳離地）。
- `DESK TABLEPROBE`（桌面傾斜 slope、盤子位置、轉了幾度）、`DESK TABLE`、`DESK LAYOUT`（`WARN cup handle hangs over` 不能出現）。
- `DESK GRIP cup thumb_above_fingers`（>0 拇指在把手上）、`DESK GRIP mandazi thumb_to_fingers`（不能有 WARN）、`DESK GRIP button`。
- `DESK REACH need < arm`；`CONTACT KE3 lamp ON t=`（約 1.0；不能是 WARN forced）；`CONTACT KE4 cup grab ... cup_jump`、`cup down ... cup_bottom_above_table`、`mandazi grab ... piece_jump`、`bite ... corner_to_mouth_corner`（沒有 WARN forced）、`mandazi down ... above_pile`；每 4 格的 `cup_top_below_eyes`、`mz_top_below_eyes` 要 > 0。
- `DESK VIEW`：時鐘在右上（KE1、KE4 的 clock x > 0.6、y > 0.6）、拖鞋 y > 0。
- **合成時音效時間要對**：`CONTACT` 的實際接觸秒數（開燈、放杯、咬、放回）若和 `EVENTS` 差超過 0.1 秒，改 `kenya_compose.py` 的 `SFX` 秒數。

### 待確認（第一批圖）

1. 床：壓低高度後床頭板、床尾板的比例好不好看；她坐的位置沒有坐到枕頭或毯子上。
2. 小木桌：Tripo 桌面約有 2° 傾斜（量到的 slope），杯子和 mandazi 都用光線量的高度放，看會不會浮起或陷進去。
3. 桌面高度用「臀部＋0.3×(肩－臀)」（腰和胸口之間，Q 版手臂才搆得到嘴）；分鏡寫「腰的高度」，若老師要更低，改 `TABLE_K`。
4. 盤子模型位置固定，所以她站在盤子右邊一點，杯子在盤子右邊、她右手前面。
5. 呵欠聲是 edge-tts 念「Haaaah」剪 0.85 秒，請老師聽；不好就把 `SFX` 的 yawn 拿掉。
6. 「mandazi」的念法請老師聽（TTS 新字）。

### 常用調整值（`kenya_morning.py` 開頭，改預設值）

`BED_K`、`SINK`、`KNEE_OUT`、`TABLE_K`、`TABLE_BACK_Y`、`GAP`、`LEAN`、`CUP_DY`、`CUP_GAP`、`HANDLE_R`、`SIP_D*`、`SIP_TILT`、`MZ_S`、`MZ_T`、`BITE_D*`、`X_MOUTH`、`EYE_DZ`、`NIGHT_LAMP`／`ON_LAMP`、`CLOCK_Z`、`WIN_X`、`BED_X`；握法 `G_PRESS`、`G_MUG`、`G_PINCH`。

## (b) 正式渲染（final）——檢查圖老師說可以之後

```text
python tabletop/src/colab_run.py final kenya_morning "KE1 all" "KE2 all"
python tabletop/src/colab_run.py final kenya_morning "KE3 all" "KE4 all"
```

- 影格：KE1 68＋KE2 46＝114；KE3 37＋KE4 109＝146；共 260 格。
- 預估：英國 243 格＝1.46–1.62 單位（約 0.006／格）→ 肯亞約 **1.6–1.7 單位**，兩批各約 20–26 分鐘（一批只放 2 鏡，斷線才不會全沒）。

## (c) 合成

```text
python tabletop/src/kenya_compose.py tabletop/qa/<KE1+KE2 資料夾> tabletop/qa/<KE3+KE4 資料夾>
python tabletop/src/kenya_compose.py --audio-only <輸出.wav>      # 只混音檢查（不需要影格）
```

- 輸出 `tabletop/out/kenya_morning.mp4`（1080p）＋`web/video/kenya.mp4`（720p，`-crf 20`）。**老師定案前不要部署**。
- 字幕：Comic Relief 82 px 卡拉 OK，five forty 紅色，下方 MarginV 174（KE1 放上方 240，要看會不會蓋到時鐘）；每句在下一句出現前 0.2 秒結束；Badge「Kenya 5:40」。
- 聲音（共用規則 6.4／13，11/20 決定）：每句人聲同音量；說話時配樂比人聲低 18 dB（每秒 RMS 量）；沒配音段配樂＝人聲的 1/4（−12 dB）；整支一次增益到 −16 LUFS，再 `alimiter level=false`，不用 loudnorm。
- 11/21 已用 `--audio-only` 實測：整片 **−16.0 LUFS**；說話時配樂比人聲低 18.8–21.1 dB；無配音段配樂 −11 到 −15 dB；長度 21.417 秒＝257 格。
- 合成後自動用 ffprobe 核對 1080p／720p 的格數（應為 514 格）。

## 預估總計

| 項目 | 單位 |
|---|---|
| 檢查圖 (a)（可能要再修一兩輪，每輪約 0.2–0.4） | 約 0.6–0.8 |
| 正式渲染 (b) | 約 1.6–1.7 |
| 合計 | 約 2.2–2.5（不含重渲） |
