# 埃及站〈看得到金字塔的早餐〉渲染計畫（2026-11-20，11/21 改用只有桌子的模型）

- 場景程式：`tabletop/src/egypt_breakfast.py`；配音：`tabletop/src/egypt_voice.py`（已產生 `audio/egypt_q/a/eat.mp3`、`egypt_words.json`）；合成：`tabletop/src/egypt_compose.py`。
- 分鏡：`tabletop/egypt_storyboard.md`（老師 11/20 決定：0A、1A、2B、3B 燉豆鍋）。
- 指令一律在專案根目錄 `tools/MIKE ESCPAEROOM/hwg7-u04-world-routines/` 下執行。Colab 用自己的工作階段 `wrt`，本機不開 Blender。
- **還沒有渲染過任何一格**：下面「待渲染確認」的項目要看第一批檢查圖和 log 才知道。
- `egypt_breakfast.py` 的共用函式（量家具、`Sit`、握法換算、`pull_chair` 等）是從 `spain_dinner.py` 原樣抽出來的（逐字相同），改一邊要記得另一邊。

## 鏡頭與秒數（`DUR`／`VOICE` 與 `egypt_compose.py` 的 `SHOTS` 一致，已用腳本核對）

| 鏡頭 | 秒 | 影格（偶數格） | 動作 | 配音（鏡頭內開始秒數 → 唸完） |
|---|---|---|---|---|
| EG1 | 5.6 | 68 | 全景。女主角問；男孩站在餐桌右邊，**左手**指右上 6:35 時鐘；窗外金字塔、流理台上銅色燉豆鍋 | q 0.4 → 2.30；a 2.6 → 5.18 |
| EG2 | 4.5 | 55 | 坐姿近景（腳踩地）。右手先碰到盤子上的口袋麵包（0.95 秒）才拿起，1.55 秒舉到胸口前；說 ful 時看前面托盤上的燉蠶豆、說 ta'ameya 時麵包在胸口前 | eat 0.5 → 2.50（ful 1.10、ta'ameya 1.67） |
| EG3 | 3.0 | 37 | 同一個鏡頭。右手把麵包從臉的右側送到右嘴角（0.95 秒），開口的上角碰到嘴唇才換成咬過的麵包，嚼兩下；左手平放 | （咬一口聲） |
| EG4 | 7.6 | 92 | 咬過的麵包放回盤子（0.8 秒碰到盤子才鬆手）；臉朝鏡頭、頭稍微轉向女主角，右手揮手；女主角在左邊回揮；右上時鐘、窗外金字塔、燉豆鍋 | a 1.2 → 3.78 |

合計 20.7 秒、252 格（12 fps，每格放兩次）。

## 手部檢查鏡頭（不開景深、長焦距；檢查鏡頭不放女主角，手部鏡頭藏起早餐托盤）

| 鏡頭 | 看什麼 | 角度 |
|---|---|---|
| EG2HF／EG2HS | 右手拿口袋麵包（開口朝上）：手心朝左（朝身體中間）偏上；**大拇指扣在靠胸口那一面**，四指在朝鏡頭那一面托住；從盤子拿起到胸口前 | 前斜方（他的右前）／他的右側 |
| EG3HF／EG3HS | 麵包從臉的右側送到右嘴角，開口上角碰嘴唇；麵包在眼睛下面、手不擋臉 | 前斜方／他的右側 |
| EG3HL／EG3HL2 | 左手平放：手心朝下、手指併攏、大拇指在靠身體中間那一側，手指沒有往手背彎 | 前左方／他的左側 |
| （另有）EG2C EG3C／EG2S EG3S | 近景前斜方／右側 | 需要時再加 |

## 11/21 改版：只用桌子的 Tripo 模型＋程式做的椅子；麵包重做

- 舊的 `egypt_table_chair` 椅子黏在桌面上、整個模型還歪 4.3 度，刪椅子在近景留下破洞（qa/1121-090851、1121-091120，`egypt_check1.jpg`）→ 改用老師同意的 **`egypt_table_only.glb`**（24,844 面，有桌裙的素面桌、沒有椅子）。
- 桌子：先放在場景外量（`probe_table`）→ 放進場景後 `level_model` 擺平（印出量到的傾斜）→ 再量桌面高度、桌面範圍、四支腳、桌裙下緣（`measure_table`）。
- **桌面＝他坐著的手肘高度**。用等比例縮放；縮完桌面不夠放道具（`NEED_W` 0.034 × `NEED_D` 0.030）時，只把長寬放大、高度不變，log 會寫是哪一種。原因：舊桌面在胸口，EG2 伸手拿麵包時手擋住嘴（EG2HF／HS 第 18 格）——手絕不能擋臉。
- 椅面＝膝蓋高 − 大腿網格厚度（`seat_under`）；椅子用 `build_code_chair`，前緣在膝蓋後 2.5 mm；椅子前緣伸進桌下時會自動變窄、穿過桌子兩支後腳之間。桌裙下緣離膝蓋的空間印在 `DESK LEGS boy`。
- **口袋麵包重做**（原本看起來像白碗）：平的半月形 pita，顏色是金黃褐色（線性色彩），兩面有幾個烤焦的深色點，厚度約高度的 1/4、中間稍微鼓起；切開的直邊朝上，有深色開口，炸豆餅和生菜、番茄從開口露出來；咬過的版本外觀一樣，只少一角（開口和生菜不會伸進咬掉的地方）。

## (a) 第一批檢查圖（light：32 樣本、50%）——11/21 版

```text
python tabletop/src/colab_run.py light egypt_breakfast "EG1 72" "EG2 48" "EG3 24" "EG4 96" "EG2HF 0,18,24,32,48" "EG2HS 0,18,24,32,48"
python tabletop/src/colab_run.py light egypt_breakfast "EG3HF 0,18,24,28,40" "EG3HS 0,18,24,28,40" "EG3HL 24" "EG3HL2 24" "EG2L 0,48" "EG2L2 0,48"
```

- 影格對應：EG2 第 0 格＝手在麵包旁、18＝手指張開靠近（**這一格以前手擋住嘴，要特別看**）、24＝握住、32＝舉起中、48＝在胸口前（ta'ameya）；
  EG3 第 0 格＝胸口前、18＝到臉的右側、24＝碰到嘴角（咬）、28＝咬過的麵包、40＝回到胸口前。
- 腿部鏡頭：`EG2L` 側面、座面高度；`EG2L2` 前左方低角度。
- 共 30 格，約 **0.6 單位**。總表：`python tabletop/src/sheet4.py tabletop/qa/<資料夾>`。

### 看 log（`tabletop/qa/<資料夾>/tout/<鏡頭>.log`）——11/21 版

- `DESK SEAT_UNDER`、`DESK LEVEL egypt_table_only.glb probe ...`／`DESK LEVEL egypt_table ...`（量到的傾斜，應該接近 0；舊模型是 4.3 度）。
- `DESK TABLE egypt_table uniform scale` 或 `footprint widened ...`；`DESK TABLE ... top_box ... legs ... underside ...`；`DESK WARN ... but wanted` 不能出現。
- `DESK CHAIR built hisChair ...`（`DESK WARN hisChair narrowed ...`＝為了穿過桌腳變窄）、`DESK FIT ... wanted ... got ...`、`DESK LEGS boy knee top ... room ...`（要 > 0.5 mm，桌裙不能壓到膝蓋）、`DESK LEGS seat_z ...`、`DESK SIT`。
- `DESK GRIP bread ... thumb_y ... fingers_y`、每 12 格的 `DESK REACH`、`CONTACT EG2 grab`、`CONTACT EG3 bite`、`CONTACT EG4 release`、`DESK VIEW`、`GND`（同 11/20 的說明）。

### 待渲染確認（11/21 版）

1. 新桌子擺平、四腳貼地；桌面在他手肘高度；EG2 第 18 格伸手時手不擋嘴和臉。
2. 他坐在程式椅的椅墊上：大腿平放、不穿過椅墊；桌裙沒有壓到大腿／膝蓋；椅子沒有撞到桌腳。
3. 新麵包：看得出是扁扁的半月形口袋餅（不是碗）、開口朝上、露出炸豆餅和生菜；兩角度看握法（拇指在胸口那一面）。
4. 咬一口、放回盤子、窗外景色、字幕位置（同 11/20）。

### 常用調整值（`egypt_breakfast.py` 開頭，改預設值）

`LEAN`、`GAP`、`DESK_K`（桌面高度＝手肘 × 這個倍數）、`NEED_W`／`NEED_D`、`PLATE_DX`、`BREAD_R`（厚度自動＝高度的 1/4）、`BITE_D*`、`CLOCK_Z`、`TRAY_MAX`、`POT_H`、`LAMP`／`FRONT`／`OUT`／`SUN`。

## (b) 正式渲染（final）——檢查圖老師說可以之後

```text
python tabletop/src/colab_run.py final egypt_breakfast "EG1 all" "EG2 all"
python tabletop/src/colab_run.py final egypt_breakfast "EG3 all" "EG4 all"
```

- 影格：EG1 68＋EG2 55＝123；EG3 37＋EG4 92＝129；共 252 格。
- 預估：英國全片 243 格＝1.46 單位（約 0.006／格），埃及約 **1.5–1.7 單位**、兩批各約 23–25 分鐘。

## (c) 合成

```text
python tabletop/src/egypt_compose.py tabletop/qa/<EG1+EG2 資料夾> tabletop/qa/<EG3+EG4 資料夾>
```

- 輸出 `tabletop/out/egypt_breakfast.mp4`（1080p）＋`web/video/egypt.mp4`（720p）。**老師定案前不要部署**。
- 字幕：Comic Relief 82 px 卡拉 OK，six thirty-five 紅色，Badge「Egypt 6:35」，配樂 −34 LUFS；音效（拿起麵包、咬一口、放回盤子）用 ffmpeg 現做。
- 已在本機用假資料核對：句子時間不重疊、三種音效濾鏡都能產生。

## 預估總計

| 項目 | 單位 |
|---|---|
| 檢查圖 (a)（11/21 版 30 格；可能要再修一兩輪，每輪約 0.2–0.4） | 約 0.6 |
| 正式渲染 (b) | 約 1.5–1.7 |
| 合計 | 約 2.1–2.3（不含重渲） |
