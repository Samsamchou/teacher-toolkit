# 西班牙站〈九點十五分的晚餐〉渲染計畫（2026-11-20）

- 場景程式：`tabletop/src/spain_dinner.py`；配音：`tabletop/src/spain_voice.py`（已產生 `audio/spain_q/a/eat/late.mp3`、`spain_words.json`）；合成：`tabletop/src/spain_compose.py`。
- 分鏡：`tabletop/spain_storyboard.md`（老師 11/20 決定：0A、1A、2B、3B 媽媽、4B 陽台）。
- 指令一律在專案根目錄 `tools/MIKE ESCPAEROOM/hwg7-u04-world-routines/` 下執行。Colab 用自己的工作階段 `wrt`，本機不開 Blender。
- **還沒有渲染過任何一格**：下面「待渲染確認」的項目要看第一批檢查圖和 log 才知道。

## 鏡頭與秒數（`DUR`／`VOICE` 與 `spain_compose.py` 的 `SHOTS` 一致，已用腳本核對）

| 鏡頭 | 秒 | 影格（偶數格） | 動作 | 配音（鏡頭內開始秒數 → 唸完） |
|---|---|---|---|---|
| SP1 | 5.6 | 68 | 全景。女主角問；女孩站在桌子後面、自己的椅子左邊，**左手**指右上 9:15 時鐘；媽媽坐在桌子右端，兩手平放 | q 0.4 → 1.97；a 2.6 → 5.18 |
| SP2 | 5.0 | 61 | 坐姿近景（腳踩地、媽媽在右）。右手拿叉子（0.9 秒碰到才拿起）→ 叉起切好的一小口（1.45）→ 從右側送到右嘴角（2.45，碰到嘴唇那一小口才消失）→ 嚼兩下 → 「with my family」看媽媽、媽媽點頭 | eat 0.5 → 3.93 |
| SP3 | 3.0 | 37 | 同一個鏡頭。叉子放回盤子右邊（0.5 秒碰到桌面才鬆手）→ 右手拿水杯（1.2）→ 從右側到下嘴唇喝一口（1.9–2.3）→ 放回（2.8 秒碰到桌面才鬆手） | （喝水聲） |
| SP4 | 7.6 | 92 | 女孩右手揮手（臉朝鏡頭、頭稍微轉向畫面左邊的女主角），左手平放；媽媽微笑；女主角在左邊回揮；右上時鐘 | late 0.5：I have dinner at nine fifteen.（0.6–3.08）／It's late!（4.07–4.85） |

合計 21.2 秒、258 格（12 fps，每格放兩次）。

## 手部檢查鏡頭（不開景深、長焦距；檢查鏡頭不放女主角，手部鏡頭藏起晚餐托盤）

| 鏡頭 | 看什麼 | 角度 |
|---|---|---|
| SP2HF／SP2HS | 右手叉子（歐式，叉齒朝下）：手心朝下；食指伸直壓在叉柄背上；**大拇指在叉柄靠身體中間那一側**；叉子從右臉頰外側斜進右嘴角，手在下巴右下方 | 前斜方（她的右前）／她的右側 |
| SP3HF／SP3HS | 右手水杯：手心朝左（朝身體中間）貼著杯子；**大拇指在靠胸口那一側**、四指在朝鏡頭那一側；杯緣碰下嘴唇、杯子在眼睛下面 | 前斜方／她的右側 |
| SP2HL／SP2HL2 | 左手平放在盤子左邊：手心朝下、手指併攏，大拇指在靠身體中間那一側，手指沒有往手背彎 | 前左方／她的左側（這兩個鏡頭藏起媽媽） |
| SP2MF／SP2MS | 媽媽兩手平放桌面（新模型，第一次用手）：手心朝下、拇指朝她身體中間、手指沒有往手背彎 | 前上方／鏡頭那一側低角度 |
| （另有）SP2C SP3C／SP2S SP3S | 近景前斜方／右側，跟台灣 B4C、B4S 一樣 | 需要時再加 |

## (a) 第一批檢查圖（light：32 樣本、50%）

分兩個指令（整批渲完才下載，斷線整批會沒了，所以拆開）：

```text
python tabletop/src/colab_run.py light spain_dinner "SP1 72" "SP2 60" "SP3 50" "SP4 72" "SP2HF 0,22,36,60,74" "SP2HS 0,22,36,60,74"
python tabletop/src/colab_run.py light spain_dinner "SP3HF 12,30,42,50,68" "SP3HS 12,30,42,50,68" "SP2HL 24" "SP2HL2 24" "SP2MF 0,84" "SP2MS 0"
```

- 影格對應：SP2 第 0 格＝手在叉子上方、22＝拿起、36＝叉起那一小口、60＝在嘴角、74＝拿著叉子停在盤子上方、84＝「with my family」媽媽點頭；
  SP3 第 12 格＝叉子放回、30＝握住水杯、42＝杯子到臉的右側、50＝喝、68＝杯子放回。
- 共 29 格，約 **0.6 單位**（light 每格約 0.02；每個鏡頭還要重新量家具，多幾分鐘）。
- 總表：`python tabletop/src/sheet4.py tabletop/qa/<資料夾>`。

### 看 log（`tabletop/qa/<資料夾>/tout/<鏡頭>.log`）

- `DESK PROBE`：桌面／兩張椅面高度、`turn`、`mirror`（媽媽那張椅子轉到右邊需不需要鏡像）、`end_face`（媽媽椅子朝向）。**有 `DESK WARN` 先處理。**
- `DESK FIT`、`DESK CHAIR pulled`（她的椅子從桌下拉出來多少）、`DESK SIT`（臀部是否在座面上、腳離地）、`DESK MUM`（媽媽臀部位置、朝向角度）。
- `DESK GRIP fork ... thumb_side`（> 0＝拇指在食指那一側＝身體中間那側，對）、`DESK GRIP glass ... thumb_y_from_glass`（> 0＝拇指在胸口那一側，對）。
- `DESK REACH`：need 要小於 arm；`CONTACT SP2 grab ... fork_jump`、`spear`、`bite`（沒有 `WARN forced` 才是真的碰到）、`CONTACT SP3 fork_release`／`glass_grab`／`glass_release`。
- `DESK VIEW`：時鐘、嘴、媽媽的頭、鞋子在畫面中的位置（x 0 左–1 右、y 0 下–1 上），時鐘要在右上（x > 0.6、y > 0.6），鞋子 y > 0。
- 引擎每格的 `GND`：坐著是負值正常；站著的女孩、女主角要接近 0。

### 待渲染確認（只能看圖才知道）

1. 餐桌椅模型轉向：她的椅子在桌子後面（+y）、媽媽那張在右端（+x）；若程式選了鏡像，看起來是否自然。
2. 她的椅子拉出來後，人坐在座面上、不在椅背後面；腳踩地。
3. 媽媽（大人比例 `MUM_K` 1.22）坐小孩椅：膝蓋高度、肚子沒有插進桌子端（`DESK WARN mum's tummy` 會提醒）、兩手平放在桌面上。
4. 叉子握法兩角度：手心朝下、拇指在內側、叉子沒有穿過手指；叉子到嘴時手不擋眼睛和嘴巴正前方。
5. 水杯握法兩角度：拇指在胸口側、四指在鏡頭側；杯緣碰下嘴唇、杯子不擋眼睛。
6. 晚餐托盤（Tripo）大小與位置、陽台（Tripo）有沒有從落地窗看到、夜景亮度；吊燈與整體光（`LAMP`、`FRONT`、`PEND`、`MOON` 預設值是猜的）。
7. 字幕位置：SP1 放上方（`SUB_POS` 240）會不會蓋到右上時鐘；SP2／SP4 放下方會不會蓋到鞋子或晚餐組。

### 常用調整值（都在 `spain_dinner.py` 開頭，改預設值；`colab_run.py` 不帶環境變數）

`LEAN`（前傾）、`SEAT_HIP`、`GAP`、`MUM_K`（媽媽身高）、`MUM_TURN`（媽媽身體轉向鏡頭幾度）、`PLATE_DX`、`FORK_L`、`FORK_OUT`、`BITE_D*`、`SIP_D*`、`SIP_TILT`、`CLOCK_Z`、`TRAY_MAX`、`LAMP`／`FRONT`／`PEND`／`MOON`。

## (b) 正式渲染（final：64 樣本、100%）——檢查圖老師說可以之後

```text
python tabletop/src/colab_run.py final spain_dinner "SP1 all" "SP2 all"
python tabletop/src/colab_run.py final spain_dinner "SP3 all" "SP4 all"
```

- 影格：SP1 68＋SP2 61＝129；SP3 37＋SP4 92＝129；共 258 格。
- 預估：英國全片 243 格＝1.46 單位（約 0.006／格；台灣 B4 8.2 秒＝0.62 也一致），西班牙多一個有骨架的人物（媽媽），約 **1.7–1.9 單位**、兩批各約 25 分鐘。

## (c) 合成

```text
python tabletop/src/spain_compose.py tabletop/qa/<SP1+SP2 資料夾> tabletop/qa/<SP3+SP4 資料夾>
```

- 輸出 `tabletop/out/spain_dinner.mp4`（1080p）＋`web/video/spain.mp4`（720p）。**老師定案前不要部署**（網站看到 `video/spain.mp4` 就會播）。
- 字幕：Comic Relief 82 px 卡拉 OK，nine fifteen 紅色，左上 Badge「Spain 9:15」，配樂 −34 LUFS；音效（叉子碰盤、放叉子、喝水、杯子放桌）用 ffmpeg 現做。
- 已在本機用假資料核對：句子時間不重疊（每句在下一句前 0.2 秒以上結束）、四種音效濾鏡都能產生。

## 預估總計

| 項目 | 單位 |
|---|---|
| 檢查圖 (a)（可能要再修一兩輪，每輪約 0.2–0.4） | 約 0.6 |
| 正式渲染 (b) | 約 1.7–1.9 |
| 合計 | 約 2.3–2.5（不含重渲） |
