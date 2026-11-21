# 印度站〈兩點四十，嘟嘟車來了〉渲染計畫（2026-11-21）

- 場景程式：`tabletop/src/india_home.py`；配音：`tabletop/src/india_voice.py`（**已產生** `audio/india_q/a/empty/comes/by.mp3`、`india_words.json`）；合成：`tabletop/src/india_compose.py`。
- 分鏡：`tabletop/india_storyboard.md`（老師 11/20：2B 三輪嘟嘟車、IN4「I go home by auto-rickshaw.」；11/20 深夜：不做司機、IN3「Here it comes!」）。
- 指令一律在 `tools/MIKE ESCPAEROOM/hwg7-u04-world-routines/` 下執行。Colab 工作階段 `wrt`，本機不開 Blender。
- **還沒有渲染過任何一格**，程式只做過 ASCII／語法檢查。

## 不做司機：怎麼讓空的駕駛座不出現

- 模型量過：車頭在 −x（車從畫面右邊開進來、車頭朝前進方向）；乘客開口在兩側；**駕駛艙的 −y 側（朝鏡頭那側）是實心板**，從正面看不到駕駛座。
- IN3、IN4 的鏡頭都放在**右前方**（約 20–30°）：車子一直在鏡頭左邊，擋風玻璃朝左、背對鏡頭，所以開進來時也看不到空駕駛座。
- 程式每個 IN3／IN4 主鏡頭印 `DESK VIEW ... driver_seat t=... in_picture ... hidden_by ...`：在畫面內又沒被擋住會印 `WARN the empty driver seat can be seen`。

## 鏡頭與秒數（`DUR`／`VOICE` 與 `india_compose.py` 的 `SHOTS` 一致，已用腳本核對）

| 鏡頭 | 秒 | 渲染格 | 動作 | 配音（鏡頭內開始 → 唸完） |
|---|---|---|---|---|
| IN1 | 5.6 | 68 | 校門全景，右門柱上 2:40 時鐘（右上）。男孩站在右門柱前的人行道上，**右手**手心朝上托著不鏽鋼便當盒在腰側，回答時**左手**指時鐘；女主角在左邊問 | 鐘聲 0.0；q 0.5 → 2.04；a 2.6 → 4.44 |
| IN2 | 3.8 | 46 | 半身：右手把便當盒托到胸口（下巴下面）；左手手心朝下、拇指在靠胸口那側、手指在鏡頭側扣住蓋子邊（1.25 秒碰到才拿起），拿到他左邊胸口高度；盒子往鏡頭傾 25°，看得到是空的 | 叮 1.25；empty 1.7 → 3.64 |
| IN3 | 3.0 | 37 | 蓋子壓回盒子（0.65 秒碰到才放手），盒子回腰側；嘟嘟車從右邊開進來（0.15 → 1.7 秒停，整台平移、輪子貼路面），開口側朝鏡頭，停在他身後；左手揮手 | 引擎 0.0、煞車 1.4、蓋上 0.65；comes 1.0 → 2.19 |
| IN4 | 7.6 | 92 | 切鏡頭：他站在嘟嘟車入口踏板上面向鏡頭，左手握入口的鍍鉻扶手桿（程式做、固定在車上），右手托便當盒；4.9 秒放開扶手、揮手；最後 0.8 秒淡出 | 怠速引擎；a 0.5 → 2.34；by 2.75 → 4.83 |

合計 20.0 秒、240 格（12 fps）。正式渲染格數 68＋46＋37＋92＝243。

## 檢查鏡頭（手部不開景深、長焦距；檢查鏡頭不放女主角）

| 鏡頭 | 看什麼 | 影格 |
|---|---|---|
| IN1HF／IN1HS | 右手托便當盒：手心朝上、四指在盒底、拇指在盒子外側（他的右邊） | 0、72 |
| IN2HF／IN2HS | 左手拿蓋子：手心朝下、拇指扣在靠胸口那側、手指扣在鏡頭那側；碰到才拿起 | 26、30、36 |
| IN2HF2／IN2HS2 | 右手托盒在胸口、盒子往鏡頭傾；盒頂在下巴下面 | 56 |
| IN3HF／IN3HS | 蓋子對準盒口壓下，碰到才放手 | 12、16 |
| IN4HF／IN4HS | 左手握扶手桿：手心朝左（朝扶手）、手指包住桿子、拇指位置（log 有 `thumb_side_y`）；IN4HS 從左上方看（左側被車身擋住） | 0、48 |
| IN4L／IN4L2 | 雙腳踩在踏板上（不懸浮、不陷進去） | 0 |

## (a) 第一批檢查圖（light：32 樣本、50%）

```text
python tabletop/src/colab_run.py light india_home "IN1 72" "IN1HF 0,72" "IN1HS 72" "IN2 30,56" "IN2HF 26,30,36" "IN2HS 30" "IN2HF2 56" "IN2HS2 56"
python tabletop/src/colab_run.py light india_home "IN3 0,24,40,60" "IN3HF 12,16" "IN3HS 16" "IN4 0,48,150" "IN4HF 0,48" "IN4HS 48" "IN4L 0" "IN4L2 0"
```

- 共 26 格、16 次開 Blender。約 **0.5–0.7 單位**。總表：`python tabletop/src/sheet4.py tabletop/qa/<資料夾>`。
- IN3 第 0 格＝車還在畫面外、24＝開進來中、40＝停好、60＝揮手；IN4 150＝揮手中。

### 看 log

- `DESK GATEPROBE`（右門柱）、`DESK RICKPROBE`（nose at -x、opening -y 有數字、step、roof_under）、`DESK RICK height ... head room on the step`（要 > 0）、`DESK LAYOUT`。
- `DESK GRIP box palm`（z > 0.8＝手心朝上）、`DESK GRIP lid thumb_to_fingers`（不能有 WARN）、`DESK GRIP pole ... thumb_side_y`。
- `DESK STEP feet_above_step`（約 0）、`head_room`（> 0，頭不撞車頂）、`entry width` vs `shoulders`（入口夠不夠寬）。
- `DESK REACH need < arm`；`CONTACT IN2 lid grab ... lid_jump`、`CONTACT IN3 lid on ... lid_to_box_rim`（沒有 WARN）；`box_top_below_mouth` > 0；`CONTACT IN4 palm_to_pole`（約 0–0.5 mm）。
- `DESK VIEW`：時鐘右上（clock x > 0.6、y > 0.6，IN4 要在車頂上方看得到）、`driver_seat`（不能有 WARN）。
- check 模式的 `GND` 行：IN4 他站在踏板上，`GND` 會是踏板高度、撞到 `india_auto_rickshaw`，這是正常的。

### 待確認

1. 嘟嘟車大小：為了讓男孩站在踏板上頭不撞車頂，程式會自動把車放大（至少 1.3 倍學生身高）；看起來會不會太大。
2. 入口寬度：Q 版頭很大，站在入口可能碰到入口兩側的柱子（log 的 entry width）。
3. 車子開進來的速度（`RICK_RUN` 0.30 m、1.55 秒，減速停下）和輪子不轉看不看得出來。
4. 校門放大到學生身高 2 倍，時鐘才能在 IN4 從車頂上方露出來；門柱比例請老師看。
5. 嘟嘟車停在校門前的車道上（他在人行道上等，車停在他身後）；IN4 是切鏡頭直接站在踏板上。
6. 扶手桿是程式加的鍍鉻直桿（真的嘟嘟車入口常有），請老師看可不可以。

### 常用調整值（`india_home.py` 開頭／內文，改預設值）

`GATE_K`、`RICK_MIN_K`、`OPEN_LEFT`、`RICK_RUN`、`BOX_WAIST`（`BW_*`）、`BOX_CHEST`（`BC_*`）、`LID_SIDE`（`LS_*`）、`BOX_TILT`、`LID_R`、`STEEL_METAL`、`SUN`／`FRONT`／`LAMP`；握法 `G_TRAY`、`G_LID`、`G_WRAP`。

## (b) 正式渲染（final）

```text
python tabletop/src/colab_run.py final india_home "IN1 all" "IN2 all"
python tabletop/src/colab_run.py final india_home "IN3 all" "IN4 all"
```

- 影格：IN1 68＋IN2 46＝114；IN3 37＋IN4 92＝129；共 243 格（和英國全片一樣）。
- 預估約 **1.5–1.6 單位**，兩批各約 20–23 分鐘。

## (c) 合成

```text
python tabletop/src/india_compose.py tabletop/qa/<IN1+IN2 資料夾> tabletop/qa/<IN3+IN4 資料夾>
python tabletop/src/india_compose.py --audio-only <輸出.wav>
```

- 輸出 `tabletop/out/india_home.mp4`（1080p）＋`web/video/india.mp4`（720p，`-crf 20`）。**老師定案前不要部署**。
- 字幕：Comic Relief 82 px 卡拉 OK，two forty 紅色，下方 MarginV 174（IN1 放上方 240）；Badge「India 2:40」；最後 0.8 秒畫面和聲音一起淡出。
- 聲音標準同肯亞站；11/21 `--audio-only` 實測：**−16.0 LUFS**；說話時配樂比人聲低 17.8–21.9 dB（只有 1 秒是 15.3 dB）；無配音段 −12 到 −15 dB；長度 20.000 秒＝240 格。
- 音效（numpy 現做）：放學電鈴、拿開蓋子叮一聲、蓋上、嘟嘟車引擎（開進來→怠速）、煞車聲；**請老師聽**。

## 預估總計

| 項目 | 單位 |
|---|---|
| 檢查圖 (a)（可能要再修一兩輪） | 約 0.5–0.7 |
| 正式渲染 (b) | 約 1.5–1.6 |
| 合計 | 約 2.0–2.3（不含重渲） |
