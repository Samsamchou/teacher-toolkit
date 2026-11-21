# 西班牙站〈九點十五分的晚餐〉渲染計畫（2026-11-20，11/21 改用只有桌子的模型）

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

## 11/21 改版：只用桌子的 Tripo 模型＋程式做的椅子

- 舊的 `spain_dining_set` 桌椅黏在一起（椅背穿過桌面），刪椅子會在近景留下破洞／碎片 → 改用老師同意的 **`spain_table_only.glb`**（26,374 面，彩繪花的木桌、沒有椅子）。
- 桌子：先放在場景外量（`probe_table`）→ 放進場景後 `level_model` 擺平（印出量到的傾斜）→ 再量桌面高度、桌面範圍、四支腳、桌面下緣（`measure_table`）。長邊轉到 x 方向。
- **桌面＝她坐著的手肘高度**（`TOP = 椅面 + 手肘離椅面`）。用等比例縮放；縮完桌面不夠放道具（`NEED_W` 0.056 × `NEED_D` 0.034）時，只把長寬放大、高度不變，log 會寫是哪一種。原因：桌面在胸口時盤子在下巴下面、伸手會擋臉。
- 椅面＝膝蓋高 − 大腿網格厚度（`seat_under`）；她的椅子用 `build_code_chair`，前緣在膝蓋後 2.5 mm，椅背在 +y；椅子前緣伸進桌下時會自動變窄、穿過桌子兩支後腳之間。
- 媽媽的椅子也是程式做的，放在桌子右端（+x），跟著她轉 `MUM_F` 度（`hands.build_code_chair(..., yaw_deg=)`）；椅面＝她自己的膝蓋高 − 她自己的大腿厚度。她的膝蓋若會頂到桌子端的下緣，就往後坐、讓膝蓋留在桌子外面（log 寫 `knees outside the table end`）。

## (a) 第一批檢查圖（light：32 樣本、50%）——11/21 版

分兩個指令（整批渲完才下載，斷線整批會沒了，所以拆開）：

```text
python tabletop/src/colab_run.py light spain_dinner "SP1 72" "SP2 60" "SP3 50" "SP4 72" "SP2HF 0,22,36,60,74" "SP2HS 0,22,36,60,74"
python tabletop/src/colab_run.py light spain_dinner "SP3HF 12,30,42,50,68" "SP3HS 12,30,42,50,68" "SP2HL 24" "SP2HL2 24" "SP2MF 0,84" "SP2MS 0" "SP2L 0,60" "SP2L2 0,60"
```

- 影格對應：SP2 第 0 格＝手在叉子上方、22＝拿起、36＝叉起那一小口、60＝在嘴角、74＝拿著叉子停在盤子上方、84＝「with my family」媽媽點頭；
  SP3 第 12 格＝叉子放回、30＝握住水杯、42＝杯子到臉的右側、50＝喝、68＝杯子放回。
- 腿部鏡頭：`SP2L` 側面、座面高度；`SP2L2` 前左方低角度（大腿要平放在椅墊上、不穿過椅墊；小腿垂下、腳踩地）。
- 共 33 格，約 **0.7 單位**（light 每格約 0.02；每個鏡頭還要重新量桌子，多幾分鐘）。
- 總表：`python tabletop/src/sheet4.py tabletop/qa/<資料夾>`。

### 看 log（`tabletop/qa/<資料夾>/tout/<鏡頭>.log`）——11/21 版

- `DESK SEAT_UNDER`（她的、媽媽的大腿網格厚度）。
- `DESK LEVEL spain_table_only.glb probe ...` 與 `DESK LEVEL spain_table ...`：量到的傾斜角度（x、y 各幾度）和擺平後的桌面高度。
- `DESK TABLE spain_table uniform scale` 或 `footprint widened xN, height kept for the elbow`；`DESK TABLE ... top ... top_box ... legs ... underside ...`（桌面、四支腳、桌面下緣）。`DESK WARN ... top ... but wanted` 不能出現。
- `DESK CHAIR built herChair ...`、`DESK CHAIR built mumChair ...`＋`DESK CHAIR mumChair turned ... deg`；`DESK WARN herChair narrowed ...`（椅子為了穿過桌腳變窄）。
- `DESK FIT ... table top wanted ... got ...`（兩個數字要一樣）、`DESK LEGS girl knee top ... room ...`（膝蓋上面離桌面下緣的空間，要 > 0.5 mm）。
- `DESK MUM face ... seat ... knees under the table / outside the table end ...`、`DESK LEGS mum ...`、**`DESK REACH mum setup Right/Left need ... arm ...`**（need 要小於 arm，否則有 `WARN her hand cannot reach the table`）。
- `DESK SIT`、`DESK LEGS seat_z ...`（臀部、大腿根、膝蓋、腳的位置）、`DESK GRIP fork/glass`、每 12 格的 `DESK REACH`、`CONTACT SP2/SP3/SP4 ...`、`DESK VIEW`、`GND`（同 11/20 的說明）。

### 待渲染確認（11/21 版）

1. 桌子（新模型）擺平後四腳貼地、桌面正對鏡頭；她的手肘剛好在桌面高度，盤子不在下巴下面、伸手不擋臉。
2. 她坐在程式椅的椅墊上：大腿平放蓋住椅墊、不穿過；椅子沒有撞到桌腳；屁股和椅背之間有空隙。
3. 媽媽的程式椅轉向和她一致、她坐在椅墊上；膝蓋沒有頂到桌子；兩手平放在桌面上（看 `SP2MF`／`SP2MS`）。
4. 叉子、水杯握法兩角度（同 11/20 的說明）；手和叉子、杯子都不擋臉。
5. 晚餐托盤、陽台、夜景亮度、吊燈；字幕位置（同 11/20）。

### 常用調整值（都在 `spain_dinner.py` 開頭，改預設值；`colab_run.py` 不帶環境變數）

`LEAN`（前傾）、`GAP`、`DESK_K`（桌面高度＝手肘 × 這個倍數）、`NEED_W`／`NEED_D`（道具需要的桌面大小）、`GIRL_DX`、`MUM_K`（媽媽身高）、`MUM_TURN`、`MUM_DY`、
`PLATE_DX`、`FORK_L`、`FORK_OUT`、`BITE_D*`、`SIP_D*`、`SIP_TILT`、`CLOCK_Z`、`TRAY_MAX`、`LAMP`／`FRONT`／`PEND`／`MOON`。

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
| 檢查圖 (a)（11/21 版 33 格；可能要再修一兩輪，每輪約 0.2–0.4） | 約 0.7 |
| 正式渲染 (b) | 約 1.7–1.9 |
| 合計 | 約 2.4–2.6（不含重渲） |
