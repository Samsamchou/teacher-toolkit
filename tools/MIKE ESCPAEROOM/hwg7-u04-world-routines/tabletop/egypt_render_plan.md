# 埃及站〈看得到金字塔的早餐〉渲染計畫（2026-11-20）

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

## (a) 第一批檢查圖（light：32 樣本、50%）

```text
python tabletop/src/colab_run.py light egypt_breakfast "EG1 72" "EG2 48" "EG3 24" "EG4 96" "EG2HF 0,18,24,32,48" "EG2HS 0,18,24,32,48"
python tabletop/src/colab_run.py light egypt_breakfast "EG3HF 0,18,24,28,40" "EG3HS 0,18,24,28,40" "EG3HL 24" "EG3HL2 24"
```

- 影格對應：EG2 第 0 格＝手在麵包旁、18＝手指張開靠近、24＝握住、32＝舉起中、48＝在胸口前（ta'ameya）；
  EG3 第 0 格＝胸口前、18＝到臉的右側、24＝碰到嘴角（咬）、28＝咬過的麵包、40＝回到胸口前。
- 共 26 格，約 **0.5 單位**。總表：`python tabletop/src/sheet4.py tabletop/qa/<資料夾>`。

### 看 log（`tabletop/qa/<資料夾>/tout/<鏡頭>.log`）

- `DESK PROBE`、`DESK FIT`、`DESK CHAIR pulled`（椅子從桌下拉出來多少）、`DESK SIT`（臀部是否在座面上、`DESK WARN hips behind ...` 不能出現）。
- `DESK GRIP bread ... thumb_y ... fingers_y`：拇指要在麵包平面的胸口側（thumb_y > 0）、手指在鏡頭側（fingers_y < 0）；出現 `WARN thumb not on the chest side` 就要改 `G_BREAD` 或校正用的手心方向。
- `DESK REACH`（need < arm）、`CONTACT EG2 grab ... bread_jump`、`CONTACT EG3 bite ... corner_to_lips`（沒有 `WARN forced`）、`CONTACT EG4 release ... bread_bottom_above_plate`。
- `DESK BREAKFASTSET`（托盤大小、位置）、`DESK FULPOT`（燉豆鍋大小）、`DESK VIEW`（時鐘右上、燉豆鍋與窗戶在畫面內、鞋子 y > 0）。

### 待渲染確認

1. 小方桌＋椅子模型：椅子拉出後人坐在座面上、不在椅背後面；腳踩地、桌下是空的。
2. 口袋麵包握法兩角度（手心、拇指那一面）；麵包立在盤子上的樣子是否自然（稍微往後靠，`ZB`）。
3. 咬一口：開口上角真的碰到右嘴角才換成咬過的；麵包在眼睛下面、不擋眼睛。
4. 窗格、椰棗樹、金字塔、晨光天空的亮度與構圖；流理台與燉豆鍋在 EG1、EG4 畫面裡（右上時鐘下方）。
5. 字幕位置：EG1 放上方（240）會不會蓋到時鐘；EG2／EG4 放下方會不會蓋到鞋子或托盤。

### 常用調整值（`egypt_breakfast.py` 開頭，改預設值）

`LEAN`、`SEAT_HIP`、`GAP`、`PLATE_DX`、`BREAD_R`、`BITE_D*`、`CLOCK_Z`、`TRAY_MAX`、`POT_H`、`LAMP`／`FRONT`／`OUT`／`SUN`。

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
| 檢查圖 (a)（可能要再修一兩輪，每輪約 0.2–0.4） | 約 0.5 |
| 正式渲染 (b) | 約 1.5–1.7 |
| 合計 | 約 2.0–2.2（不含重渲） |
