# 〈Birds〉3D 場景交辦說明書（s03–s08）

> 給做場景的子代理。**先完整讀完再寫程式。** 已核准的範本是 `scenes/s01.js`、`scenes/s02.js`（老師 11/05 核准試片 v3）。
> 專案根：`G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI ANIMATED VIDEO\output\birds\`（以下路徑都相對 `3d/`）。

## 1. 這是什麼
Imagine Dragons〈Birds〉（3:42）改編成國小五六年級課堂動畫。畫風 B 電影光影＋C 灰轉彩（四季顏色主線）＋E 3D 世界（Three.js）。
故事：原創母女。童年和媽媽一起飛 → 上學被排擠 → 媽媽飛走（過世）→ 長大的女兒孤單、在月光與暴風中掙扎 → 紀念十字架前，羽毛化成白鳥 → 她自己長出翅膀飛上金色雲海 → 長大的她牽著自己的小孩回到開場森林。
**逐句的劇情、改編動作、季節顏色在 `../planning/01-逐句分析表.md`（每句一列，一定要照做）**；詞義圖卡在 `../planning/02-詞義畫面表.md`（圖卡是播放頁自動畫的，你不用畫，但構圖要讓位）。

## 2. 你只能動的檔案
- 只寫你負責的 `scenes/s0X.js`；可以在 `scenes/` 新增 `s0X_*.js` 小工具。
- **不要改** `engine/*`（world.js、cards.js、player.html、render.py…）。需要共用功能就在你的場景檔內自己寫，或在回報裡說明。

## 3. 場景檔規格（照 s01.js／s02.js）
```js
export async function setup({ renderer }) { ... return { dur, songStart, frame(t, st), keys: [...], cardGray?(st), overlay?(c,t,st) } }
```
- `songStart`＝場景開始的全曲秒數，`dur`＝長度；`frame(t, st)` 的 `st`＝全曲秒數，**每一格只由 st 決定**（不准 Math.random、Date）。
- `keys`：這個場景要紅字＋左上角跳字的學習單關鍵字（見分析表「跳字」欄，例：'seasons','grow','cry','temporary','love','fly','directions','again','hard','moon','light','shadow','fly high'）。
- `cardGray(st)`（選用）：回傳 0–1，讓圖卡變灰（第二段副歌冬灰段用 .8，結尾顏色回來時回到 0）。
- 用 `engine/world.js` 的工具：`makePost`（後製：景深、光暈、調色 sat/tint、暗角、fade）、`makeChar`（多姿勢角色；`setPose('D13A')`、`setPose(null)` 隱藏）、`loadModel`、`skyDome/setSky`、`cloudField`、`hills/groundY`、`tree`、`mountain`（不好看，**不要用**）、`motes`、`feather`、`pendantGlow`、`umbrella`、`camAt`、`valAt`、`lightRig`。
- **鏡頭一律用 `camAt(cam, keys, st)`**，換鏡頭用 `'cut'` 標記（見 s01）。camAt 會依「這個鏡頭有沒有圖卡」自動把畫面整鏡往右平移 20%，所以**角色擺在畫面中間偏左即可，不要自己再往左擠**。
- **臉部補光**：每個鏡頭 camAt 之後放 `L.fill`（跟著鏡頭的點光，見 s02 的 `fill(L, cam, k)`），否則逆光時臉會黑。
- **羽毛閃光**：女孩若在畫面中且胸前有項鍊，加 `pendantGlow(char, y, z)` 並每格 `glow.set(window.FEATHER || 0)`（7 歲 y .79，13 歲約 y 1.08，30 歲約 y 1.2，z .12；自己抽格確認位置）。

## 4. 角色與模型（`../../models/*.glb`，靜態姿勢，換姿勢＝換模型）
| 代號 | 是誰／姿勢 | 建議身高 |
|---|---|---|
| M1 / M2 / M3 | 媽媽：站立／張開雙臂（裝翅膀＝飛）／單膝跪下張手 | 1.65 / 1.65 / 1.17 |
| D7A / D7B / D7C / D7D | 7 歲女兒：站立／舉手牽大人走路／張開雙臂飛／抱膝坐 | 1.17 / 1.24 / 1.17 / .66 |
| D13A / D13B / D13C / D13D | 13 歲：站立／坐木椅低頭（含椅子）／跪著捧羽毛／站直雙臂平舉（飛） | 1.55 / 1.25 / 1.05 / 1.55 |
| A30 | 30 歲：牽小孩的手走路 | 1.66 |
| C1 | 她的小孩（黃雨衣）：伸手要牽 | 1.0 |
| WINGS | 一對白色翅膀（道具）| 媽媽寬 2.6、13 歲 1.9、7 歲 1.5 |
| BIRD | 發光白鳥 | .6–1.0 |
- 模型正面朝 +Z。飛行＝`rotation.set(-傾角, Math.PI, 0)` 朝 −Z 飛（見 s02 #12–#16）。
- **翅膀一定長在上背部（老師要求）**：`loadModel(WINGS, 寬, {axis:'xz'})` 後呼叫 `centerPivot`（把支點移到翅膀中心：`h.children[0].position.y -= h.userData.size.y/2`），再 `char.add(wing)`，位置 `(0, 肩胛骨高, -.11~-.15)`：媽媽 1.32、13 歲約 1.22、7 歲 .9。抽格確認翅膀從背上長出、不在頭頂。
- 同學沒有模型：用簡單的膠囊身體＋球頭（低多邊形、柔和顏色；灰色世界時就是灰色剪影）自己做，**不要複製主角模型當同學**。
- 媽媽照片（紀念十字架用）：`../../characters/mom.png` 左半是媽媽站姿，裁頭肩當貼圖；做木頭相框。

## 5. 畫面原則（老師已確認）
- 故事全螢幕演出，照分析表；**每句都要有能看懂的動作或畫面**，詞義圖卡會自動出現在右上角（約畫面寬 40%），右上角不要放重要東西。
- 季節顏色照分析表：秋橘 → 灰 → 冬灰 → 冬夜藍 → 黑 → 灰綠 → 淡綠 → 春綠＋日出金。用 `post.set({ sat, tint })`＋場景光、霧、天空顏色一起轉。
- 喪親段照原作：#43 空餐桌、#45–#46 草地上的紀念十字架＋媽媽照片＋紫色花。溫柔、不可怕。
- 字幕在畫面下方 y 900 以下，角色的臉不要放到那裡。跳字在左上角（x≈470,y≈110），臉也不要放那裡。
- 已知陷阱：夕陽在角色頭正後方會洗白臉（太陽放側邊）；鏡頭不能鑽進雲片（雲頂約 size×.55/2）；正對太陽全白；`Object.assign` 不能改 three 物件 position；補光要在 camAt 之後；程式做的錐形山很假（不要用）；同一個角色物件只能放在一個 Scene。
- 換姿勢是「喀」一下直接換（定格感），這是老師核准的做法。

## 6. 指令與檢查（一定要做）
在 `3d/engine/` 執行：
```bash
python -I render.py player.html --query scene=s0X --stills 1.0,3.5,...      # 抽格（本地秒），存到 ../renders/qa/player-scenes0X-*.png
python -I qasheet.py ../renders/qa player-scenes0X- ../renders/qa/s0X-v1.jpg 4
python -I render.py player.html --query scene=s0X --fps 24                   # 全段 MP4（約 15 分鐘），產生 ../renders/player-scenes0X-silent.mp4
```
1. 每句至少抽 1 格（句子中間），用 Read 看總表；修到沒有問題：臉沒被擋、沒有全白／全黑、翅膀位置對、角色沒穿模、每句看得懂。
2. **換句處連抽 8 格動態**（`--stills` 給 8 個相隔 1/24 秒的時間，跨過兩個換句點），確認同一個鏡頭內畫面沒有晃動。
3. 臉部特寫抽一張（臉要亮、清楚）。
4. 抽格前先刪掉舊的 `player-scenes0X-*.png`，再跑一次。
5. 全部 OK 再渲染 MP4。**一次只跑一個 render 指令。**

## 7. 回報
用繁體中文回報：做了哪些鏡頭（逐句一行）、抽格總表路徑、換句 8 格檢查結果、MP4 路徑與格數、已知小問題、你在程式裡踩到的新坑。
