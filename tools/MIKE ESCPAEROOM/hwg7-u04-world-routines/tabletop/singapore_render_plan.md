# 新加坡站〈九點四十五，晚安〉渲染計畫（2026-11-21，程式已寫好、還沒渲）

- 場景程式 `tabletop/src/singapore_night.py`、配音 `singapore_voice.py`（已跑，音檔在 `tabletop/audio/singapore_*.mp3`＋`singapore_words.json`）、合成 `singapore_compose.py`。
- 分鏡依 `singapore_storyboard.md`（老師 11/20 決定）：5 鏡共 24.0 秒，12 fps（只渲偶數格）。
- **還沒在 Blender 跑過**：所有 `GUESS` 數值（床的擺放、床頭櫃大小、書與燈的位置、刷牙角度）都要看第一批檢查圖和 `DESK`／`CONTACT` 量測行再調。調整值改程式開頭的預設值（`colab_run.py` 不帶環境變數）。

## 11/21 第一批檢查圖（qa/1121-103743）之後的修改

| 問題 | 原因 | 改法 |
|---|---|---|
| 床頭櫃離她 2.7 cm，書拿不到（book_jump 12 mm）、燈按鈕差 20 mm | 床兩端各有枕頭、摺好的被子，蓋滿整個床寬；程式找「沒東西的床墊邊」找到 2 cm 裡面 | 她改坐在床尾那一端（摺好的被子上，比枕頭低），屁股側邊離床尾 0.8 mm；床高照「被子頂＝膝高−大腿厚」壓；床頭櫃緊貼床尾外側，離她屁股約 4 mm |
| 床頭櫃 28 mm 寬，燈在中間太遠 | 等比例放大到腰高 | 腳印最大 24 mm（`CAB_MAX`），燈放在她肩膀前 4 mm（`LAMP_DY`），按鈕在燈座朝她那側 |
| 拿書、看書的手 98 % 手長 | 書離胸口 1.2 mm、身體太直 | `READ_GAP` 0.4 mm、`LEAN` −6 度；超過 90 % 會印 WARN |
| SG2 刷牙手在下巴前、牙刷只有 10 mm | 臉頰量錯（射線打到嘴唇後面 2.2 mm 的臉） | 從正面看的頭輪廓（臉頰＋頭髮，多深度多高度取最外側），手內緣在輪廓外 1.5 mm；牙刷長度自動算（上限 24 mm）；角度 25→12 度（從側面進） |
| SG2 拿牙刷手腕扭成麻花 | 前臂不轉，只有手轉 | 新函式 `untwist()`：前臂沿自己的軸轉手轉角的 80 %，手腕只剩 20 %（所有握法都用） |
| 刷牙／拿書抓起那格差 0.7 mm | 抓到那格已開始往上提 | 碰到後停 0.1 秒才提起（抓起那格＝真的接觸） |
| 握拳、指東西的手指可能反彎 | 共用規則 11/21 | `curl = hands.curl_hinge` |
| 關燈後燈罩變黑洞；月光不明顯 | 燈罩用純發光材質 | 燈罩改米色布料＋發光強度關掉；暖光再降、月光 ×5、鏡頭補光變暗變藍 |

重渲（所有鏡頭的位置都變了，所以整批重來；37 格，約 0.75 單位）：

```text
python tabletop/src/colab_run.py light singapore_night "SG1 72" "SG2 34" "SG3 58" "SG4 34" "SG5 24,60" "SG2HG 16,86" "SG2HG2 16,86" "SG2HF 26,34,48,62" "SG2HS 34,48,62" "SG3HF 22,30" "SG3HS 22,30" "SG3HR 38,50,58" "SG3HR2 58" "SG3L 0" "SG3L2 0" "SG4HF 32,36" "SG4HS 32,36" "SG5HF 22,26" "SG5HS 22,26" "SG5C 0,60"
```

抓起那一格：SG2 第 16 格、SG3 第 22 格（下面舊的批次 1 指令已被這條取代）。

## 11/21 第二次檢查（qa/1121-114853，畫面通過）之後的小修

- `brush head deeper than 2 mm` 是誤報：牙刷還躺在洗手台或正在拿起時，刷頭離嘴角很遠，投影長度被當成「深度」。現在只在刷頭離嘴角 4 mm 內才檢查；深度也加了 1.8 mm 上限（實際最深 1.7 mm）。SG2 不用重渲。
- SG4 書放回時一半懸在櫃子前緣外 → 書改成放在櫃面「頂面範圍」內（前後各留 0.8 mm），印 `DESK BOOK spot`。
- 手長 95–105 %：拿書時手腕在書下面約 2.5 mm（手心朝上托書），看書時手腕在書下方 4–5 mm → 櫃面再高 2 mm（`CAB_DZ` 5 mm）、身體前傾 −10 度、兩手改拿書外側邊的中段偏下（`GR_LOC`／`GL_LOC` 0.42）、手指往內多一點；放在腿上的手往後 2 mm。

重渲（23 格，約 0.45 單位）：

```text
python tabletop/src/colab_run.py light singapore_night "SG1 72" "SG3 22,58" "SG4 34,40" "SG5 26,60" "SG3HF 22,30" "SG3HS 22,30" "SG3HR 38,50,58" "SG3HR2 58" "SG3L 0" "SG4HF 32,40" "SG4HS 32,40" "SG5HF 22,26" "SG5C 60"
```

## 鏡頭與時間（`DUR`／`VOICE` 和 compose 的 `SHOTS` 一致，已用腳本核對）

| 鏡 | 秒 | 格數(偶數格) | 動作 | 配音（開始秒） |
|---|---|---|---|---|
| SG1 | 5.6 | 68 | 臥室全景，站在床前，左手指右上 9:45 時鐘 | q 0.4（到 1.98）、a 2.6（到 5.29） |
| SG2 | 4.0 | 49 | 浴室洗手台：右手拿牙刷(0.6 碰到才拿)→右側水平進右嘴角(1.4，最多進 1.7 mm)→刷 3 下→2.8 拿出→3.55 放回台面才鬆手 | teeth 1.1（"I brush my teeth" 到 2.58） |
| SG3 | 3.8 | 46 | 坐床邊：右手拿書(0.85)→1.6 到下巴下→1.75–2.35 封面往左翻開→2.45 左手拿住另一角→低頭看書 | book 0.4（"…and read a book." 到 1.43） |
| SG4 | 3.0 | 37 | 左手把書闔上(0–0.45)→右手放回床頭櫃(1.35 碰到才鬆手)→1.55 起右手揮手 | gn 1.6（"Good night!" 到 2.45） |
| SG5 | 7.6 | 92 | 右手食指按燈座按鈕(約 0.95–1.05 碰到→燈熄)→藍色月光＋窗外燈光→微笑 | a 1.6（到 4.29） |
| 合計 | 24.0 | 292 | | |

字幕：「I brush my teeth and read a book.」是一整行，從 SG2 顯示到 SG3 結束（唸到哪亮到哪）。

## 檢查鏡頭（場景名＋後綴；前三字母決定動作）

| 後綴 | 看什麼 |
|---|---|
| SG2HG / SG2HG2 | 拿起、放回牙刷的握法（前右斜／她右側） |
| **SG2HF / SG2HS** | **刷牙：正面特寫（整張臉看得到、手在右臉頰外側）／她右側（刷頭從側面進右嘴角）** |
| SG3HF / SG3HS | 從床頭櫃拿書（前右斜／左上方往下看） |
| SG3HR / SG3HR2 | 兩手拿打開的書（正面／上方：大拇指在書頁上） |
| SG4HF / SG4HS | 書放回床頭櫃、鬆手 |
| SG5HF / SG5HS | 食指按燈座按鈕 |
| SG3L / SG3L2 | 腿：左前方座高（大腿壓在床墊上）／前方低角度（小腿垂下、拖鞋踩地） |
| SG1C / SG5C | 臉部近景（SG5C 0 格＝開燈、60 格＝關燈後臉要看得清楚） |

## 第一批 light 檢查圖（先報老師預估單位再開機）

批次 1：每鏡 1 格＋全部手部／腿部／臉部檢查鏡頭（34 格，約 0.7 單位）

```text
python tabletop/src/colab_run.py light singapore_night "SG1 72" "SG2 34" "SG3 58" "SG4 34" "SG5 24" "SG2HG 14,86" "SG2HG2 14,86" "SG2HF 34,48,62" "SG2HS 34,48,62" "SG3HF 20,30" "SG3HS 20,30" "SG3HR 38,58" "SG3HR2 58" "SG3L 0" "SG3L2 0" "SG4HF 32,36" "SG4HS 32,36" "SG5HF 22,26" "SG5HS 22,26" "SG5C 0,60"
python tabletop/src/sheet4.py tabletop/qa/<這批資料夾>
```

批次 2（批次 1 通過、數值調好後）：每鏡的準備／接觸／動作中／結束（26 格，約 0.5 單位）

```text
python tabletop/src/colab_run.py light singapore_night "SG1 0,96,130" "SG2 0,14,48,80,92" "SG3 0,20,38,44,50,74,90" "SG4 0,10,22,44,62" "SG5 0,20,26,32,90,170"
```

先看的量測行（`tabletop/qa/<批次>/tout/<鏡>.log`）：

- `DESK BODY`、`DESK SEAT_UNDER`、`DESK BED PROBE / placed`（床墊高＝膝高−大腿厚、床壓扁倍數 0.35–1.6 以外會 WARN、她坐的位置旁邊有沒有枕頭）、`DESK LEGS`。
- `DESK CAB placed`（櫃面在她腰高、櫃子到她屁股側的距離；> 6 mm 會 WARN 搆不到）、`DESK LAMP`（按鈕、燈罩下緣到按鈕的空間 > 2.2 mm）、`DESK BOOK`（書和燈座有沒有重疊）。
- `DESK BRUSH`（牙刷長度：依臉頰外緣自動算，手要在臉頰外 2.2 mm）、`DESK GRIP brush`（大拇指在刷柄上、朝刷頭，兩數字都要 > 0）、`DESK GRIP book right/left`（大拇指在書頁那面 > 0、其他手指在書背 < 0）。
- `CONTACT SG2 … tip_into_corner`（0–0.0018，> 0.0021 會 WARN）、`hand_outside_cheek`（> 0）、`handle_to_face`（> 0，刷柄沒穿進臉）、`brush_jump`（< 0.0006）。
- `CONTACT SG3/SG4 book_jump / release / book_top_below_chin`（> 0：書在下巴下面）、`CONTACT SG5 lamp off t=`（記下這個時間，合成時「喀」聲對齊它）。
- `DESK REACH … need … arm`：need 大於 arm 就是手搆不到。

可以調的預設值（`singapore_night.py` 開頭）：`HX`（她坐的位置）、`BED_L`、`HIP_HALF`、`CAB_DZ`／`CAB_MIN`／`CAB_GAP`／`CAB_DY`、`BOOK_DY`、`OVERHANG`、`READ_GAP`、`CHIN_DZ`、`BRUSH_YAW`／`BRUSH_RISE`／`HAND_CLEAR`、`CORNER_DX/DY/DZ`、`LAMP_W`、`CLOCK_Z`、`WIN_DX`。

## 正式渲染（檢查圖老師說可以之後；一批只放 2 鏡）

```text
python tabletop/src/colab_run.py final singapore_night "SG1 all" "SG2 all"
python tabletop/src/colab_run.py final singapore_night "SG3 all" "SG4 all"
python tabletop/src/colab_run.py final singapore_night "SG5 all"
```

- 292 格；英國片 243 格約 1.5 單位 → **新加坡約 1.8 單位**（三批各約 0.6）。加上兩批檢查圖約 1.2 單位，全部約 3 單位（分鏡估的 3.6＋0.3 以內）。
- 單位數是 `colab_usage.log` 前後餘額相減，只能說「約」。

## 合成

```text
python tabletop/src/singapore_compose.py tabletop/qa/<SG1+SG2> tabletop/qa/<SG3+SG4> tabletop/qa/<SG5>
```

- 輸出 `tabletop/out/singapore_night.mp4`（1080p）＋`web/video/singapore.mp4`（720p）。**老師定案前不要部署**（`web/video/` 裡有檔就會被 publish 帶上網站）。
- 加 `--test` 只留在暫存資料夾（11/21 已用假畫面試跑：576 格＝24 秒×24、整片 −16.0 LUFS、說話時配樂比人聲低約 17–20 dB、沒有配音的段落再低約 12 dB）。
- 合成前改 `SFX`：`('SG5', 1.00, 'click', …)` 改成 `CONTACT SG5 lamp off t=` 的時間；`SUB_POS` 看完整片再調（SG1 放上方 240 px；SG5 若字幕蓋到腳或床，改 `-96` 或上方）。
