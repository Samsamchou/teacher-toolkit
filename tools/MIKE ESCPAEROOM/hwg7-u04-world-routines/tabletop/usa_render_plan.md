# 美國站〈校車來了〉渲染計畫（2026-11-21，程式已寫好，還沒渲染）

- 場景程式：`tabletop/src/usa_school.py`；配音：`tabletop/src/usa_voice.py`（已產生 `audio/usa_*.mp3`、`usa_words.json`）；合成：`tabletop/src/usa_compose.py`。
- 當地學生：**女生** `usa_girl.glb`（老師 11/20 決定）；旅人：`traveler_girl.glb`。**沒有用到任何新的 Tripo 模型**：校車、門廊房子、站牌與 7:35 時鐘、午餐盒、柵欄、樹、消防栓、信箱都是程式做的。
- 句子和網站一致（`functions/routines-content.json` 的 usa）：問句 What time do you go to school? → I go to school at seven thirty-five.（7:35）；延伸句 I go to school by school bus. The bus is yellow.
- 聲線和網站一致：問句 Jenny、女生 Ana，都是 −12%。whisper 核對五句都對（seven thirty-five 聽成 735，是寫法差異）。

## 鏡頭與秒數（DUR／VOICE 與 compose 的 SHOTS 一致）

| 鏡頭 | 秒數 | 影格（偶數格） | 配音（開始秒） | 內容 |
|---|---|---|---|---|
| US1 | 5.6 | 0–134，68 張 | q 0.4（1.74 秒）、a 2.45（2.82 秒） | 全景校車站。旅人在左邊發問；美國女生在右邊、站牌旁，用靠時鐘那一側的手（左手）指 7:35 的時鐘 |
| US2 | 3.8 | 0–90，46 張 | （無配音，鳥叫＋提把喀一聲） | 她家門廊：伸手到右前方的小桌，手指勾住午餐盒提把（1.45 秒才碰到）後提起來，再看鏡頭 |
| US3 | 4.2 | 0–100，51 張 | gm 0.3（3.45 秒） | 校車從畫面**左邊**開進來、減速停在站牌旁、開門；她右手提午餐盒、左手對旅人揮手：Good morning! Here comes the bus! |
| US4 | 8.8 | 0–210，106 張 | a2 0.4（2.82 秒）、bus 3.6（4.72 秒） | （切鏡頭）她已站在校車下層踏板上，左手握門邊扶手、右手提午餐盒，再說一次答句；放開扶手揮手：I go to school by school bus. The bus is yellow. 右上角是 7:35 時鐘 |
| 合計 | 22.4 | 271 張 | | |

合成時每鏡實際長度＝round(秒數×12)/12（US1 5.583、US2 3.833、US3 4.167、US4 8.833，全片 22.417 秒、538 格）。

## 檢查用鏡頭（全部不開景深、190 mm；腿部 115 mm）

| 鏡頭 | 看什麼 | 建議格 |
|---|---|---|
| US1HF／US1HS | 指時鐘的手（前斜方／側面） | 82 |
| US2HF／US2HS | 午餐盒提把勾握：手心朝她身體中線、拇指朝前、四指從下面勾住提把（前斜方／側面；門廊柱子和屋頂在這兩鏡隱藏） | 24（快碰到）、36（握住）、60（提起） |
| US3HF／US3HS | 提著午餐盒走路的手（同一種勾握） | 24 |
| US4HF／US4HS | 門邊扶手：握手式握直桿，手心朝她中線、拇指在上、四指繞到扶手外側（HS 會把校車車頭、前門柱藏起來從側面看） | 48 |
| US4L／US4L2 | 雙腳踩在下層踏板上（L：右側、踏板高度，藏起車身側板；L2：前方低角度穿過車門） | 48 |

她不坐下，所以沒有坐姿檢查；但站在門廊和校車踏板上，用 US4L／US4L2 和 `CONTACT ... sole_to_*` 量腳底。

## (a) 第一批檢查圖（light：32 樣本、50%）

```text
python tabletop/src/colab_run.py light usa_school "US1HF 82" "US1HS 82" "US2HF 24,36,60" "US2HS 24,36,60" "US3HF 24" "US3HS 24" "US4HF 48"
python tabletop/src/colab_run.py light usa_school "US4HS 48" "US4L 48" "US4L2 48" "US1 82" "US2 36" "US3 88" "US4 120"
python tabletop/src/sheet4.py tabletop/qa/<第一批資料夾>
python tabletop/src/sheet4.py tabletop/qa/<第二批資料夾>
```

- 共 18 張；兩批各約 7 個工作，每個工作 Blender 都要重新建場景、算完整段動作。
- 預估：約 0.02 單位／張＋每個工作建場景的時間，兩批合計**約 0.4–0.6 單位**（參考：西班牙 light 6 個工作 14 張 0.44 單位；英國 light 4–6 個工作約 0.16 單位）。
- 交給老師前先看 log 的量測行：
  - `DESK BODY`（她的身高、膝高、肩寬、手臂長）、`DESK BUS`（踏板高、車門寬、扶手位置）、`DESK DOOR`、`DESK PORCH ... TABLE`（小桌高度、桌邊到她身體的距離）、`DESK GRIP`、`DESK REACH`（need 要小於 arm）。
  - `CONTACT US2 ... fingers_to_handle`（1.45 秒前逐漸變成約 0）、`box_jump_at_grab`（要接近 0）、`box_clear_of_body`（不能是負的）。
  - `CONTACT US3 wheel_bottom_to_road`（0）、`box_bottom_above_pavement`（要大於 0）。
  - `CONTACT US4 rail_grip_to_rail`（放手前約 0）、`sole_to_step`（約 0，±1 mm）、`CHK`／`GND`（引擎自動印）。
- 逐項看：手心方向、拇指位置、手指真的勾住；午餐盒只有手碰到才動、不浮空、不穿腿；指時鐘和揮手的手不擋臉；校車車頭朝前（往右開）、輪子貼地；腳踩地／踩踏板；7:35 時鐘在右上看得清楚；字幕帶以上看得到她的腳。

## (b) 正式渲染（final：64 樣本、100%）——檢查圖老師說可以才跑

```text
python tabletop/src/colab_run.py final usa_school "US1 all" "US2 all"
python tabletop/src/colab_run.py final usa_school "US3 all" "US4 all"
python tabletop/src/usa_compose.py tabletop/qa/<US1US2 資料夾> tabletop/qa/<US3US4 資料夾>
```

- 影格：US1 68＋US2 46＝114 張；US3 51＋US4 106＝157 張；共 271 張。
- 預估：英國 final 243 張約 1.5 單位（1.46／1.62）→ 美國 271 張**約 1.7–1.8 單位**（兩批約 0.75＋1.0）。一批只放 2 鏡（中途斷線整批會沒有）。
- 輸出：`tabletop/out/usa_school.mp4`（1080p）、`web/video/usa.mp4`（720p，crf 20 原畫質）。**未定案前不部署**。
- 只改一鏡時只重渲那一鏡，合成時把新資料夾放在最後（後面的蓋過前面的）。
- 合成會印出：每秒人聲／配樂分貝表、`MIX talking ... 18 dB`、`quiet parts ... -12 dB`、`film -16 LUFS`、`SUB` 每句字幕時間、兩支 mp4 的格數（要等於 538）。11/21 先用 `--audio-only` 試混：說話時配樂低 18.0 dB、無配音段 −12.0 dB（1/4）、全片 −16.1 LUFS、峰值 −2.9 dBFS。

## 已知風險（第一批檢查圖要特別看）

1. 這支是第一次用 `usa_girl`：手部 PALM_SIGN 用共用值（右 −1、左 +1），要看兩角度特寫確認。
2. 她的頭髮是兩大團髮球：身高正規化含頭髮，身體可能比其他站的學生小一點；髮球可能擋到側面鏡頭的臉。
3. 午餐盒掛在她右腿旁：`box_clear_of_body` 若是負的，就把 `CARRY_DIR` 的 x（往外）加大。門廊小桌高度由她提著的位置往下 6.5 mm 推算（`HOME_OFF`，GUESS）。
4. 校車是程式做的玩具校車（外掛輪子、沒有輪拱）；車門寬、踏板高由她的肩寬和膝高算出。
5. US4 是切鏡頭直接站在踏板上（不演爬上車，避免背對鏡頭）；揮手的左手在車門前柱旁，要看有沒有穿進門柱。
6. US4 字幕在下方：腳底大約在字幕帶上緣附近，若被蓋到就把 `usa_compose.py` 的 `SUB_POS['US4']` 改掉或鏡頭再往下帶。
7. 燈光（太陽 1.4、門廊補光 0.3、車內燈 0.06）是第一次設，可能偏暗或偏亮。
