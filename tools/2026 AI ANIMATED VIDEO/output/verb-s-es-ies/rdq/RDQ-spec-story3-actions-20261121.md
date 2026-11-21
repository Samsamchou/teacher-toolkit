---
rdq_version: 1
edition: claude-code
task: 故事 3（＋ies：Zun-Bo 的風箏）動作鏡頭：先查真實姿勢再畫（放風箏、風箏卡樹、安全取下、跑步）
domain: video
date: 2026-11-21
status: confirmed
telemetry: { mode: lite, rounds: 0, questions: 0, q4_adopted: 0, revisions: 0 }
downstream: self
---

# RDQ 需求規格（草稿）：故事 3 動作檢查點

沿用故事 1 的規則（`RDQ-spec-story1-actions-20261121.md`）：有動作的畫面先上網查真實姿勢；動作鏡頭用 KIE Seedance（首幀 Codex 畫）；開拍前先報點數、先 480p 試拍；倒數 4 秒；字卡不擋臉。
**本檔是 sub-agent 準備的草稿，還沒問老師；KIE 一點都還沒花。**

## 查到的正確做法（做動畫時照這些檢查點）

### 放風箏（單線風箏）
- **背對風站**：風從背後吹來，風箏在人的前方、下風處的高空。（畫面設定：風從左往右吹 → 人站左邊、面向右、風箏在右上方。）
- **雙手拿線軸**，手在胸前、手肘彎，手臂在身體前面（不是高舉過頭）；**抬頭看風箏**。
- **線一定連著**：線從線軸斜斜往上、往下風處延伸到風箏，有一點弧度；線拉緊風箏才會升。
- 起飛：手舉風箏（或請朋友在下風處拿著）→ 風來時放手、一邊**慢慢放線**；風箏往上指時輕輕收線讓它爬高；高處風比較穩。
- 風箏往下栽或打轉：放一點線讓它重新吃到風。風箏歪掉、亂晃是新手常見狀況（C05 圳寶「tries」就演這個）。
- 場地：空曠草地，遠離樹、電線、馬路；不在雨天或打雷時放。→ 畫面**不畫電線**。

### 風箏怎麼卡到樹上
- 陣風或風突然變小、風箏不穩往下繞圈，飄得離樹太近就被樹枝勾住（樹附近的風本來就亂）。→ C05–C06：風箏高度掉下來、歪斜亂晃，往下風處（右邊）的大樹飄，卡在樹冠左下的**矮樹枝**。

### 安全把風箏拿下來
- **不爬樹、不用梯子**；先確認旁邊**沒有電線**（有電線就不要碰，找大人／電力公司）。
- 先**放鬆線**（不要硬拉，硬拉會扯破或纏更緊），輕輕拉看看會不會鬆開。
- 卡在矮處時，**站在地上**用長竿（竹竿、掃把）輕輕把風箏挑下來，注意不要讓它砸到人。
- → help 鏡頭：水鈴雙腳站在草地上，雙手拿長竹竿往上輕挑；圳寶拿線軸、線是鬆的、不拉。

### 跑步（側面，水鈴跑來幫忙）
- **手腳相反**（左膝往前抬時右手往前）；**手肘彎約 90 度**；手臂**前後擺**、不橫過身體中線；手放鬆張開、不握拳。
- 身體微微前傾、膝蓋往前抬、後腳蹬地、腳落在身體下方。

## 來源
- 放風箏：https://nationalkitemonth.org/how-to-fly-a-kite/ （背對風、放線、收線爬高、場地與安全）
- 放風箏（兒童版）：https://rangerrick.org/nature/learn-how-to-fly-a-kite/ （背對風拿線軸、朋友幫忙起飛、慢慢放線、往下栽就放線）
- 放風箏：https://best-breezes.squarespace.com/how-to-fly-a-kite/
- 風箏卡樹的原因與處理（放鬆線、輕拉）：https://my-best-kite.com/kite-eating-tree.html
- 不爬樹、長竿從地面挑：https://www.instructables.com/How-to-Get-a-Drone-Out-of-a-Tree 、https://www.bartlett.com/blog/?p=2970
- 風箏安全（不爬樹、遠離電線、卡電線就放手）：https://www.grc.nasa.gov/WWW/K-12/VirtualAero/BottleRocket/airplane/kitesafe.html 、https://www.nkm.kite.org/kite-safety/ 、https://kua.com/blog/kite-flying-safety-5-important-rules/
- 跑步姿勢：https://www.hss.edu/health-library/move-better/proper-running-form 、https://run.outsideonline.com/training/getting-started/the-basics-of-arm-form-for-runners/ 、https://runningmagazine.ca/?p=78687

## 分鏡（草稿）
| 句 | 做法 | 內容 | 預計秒數 |
|---|---|---|---|
| C01–C03 | 程式人偶 | 圳寶拿英文書自我介紹 → Ken 拿風箏走進來介紹圳寶 → SUNDAY＋風圖示月曆卡（放左上，不擋臉） | 約 21 |
| C04 | KIE `s3_fly` | Ken 背對風、雙手拿線軸、抬頭看；風箏在右上高空；圳寶在旁邊看 | 5 |
| C05＋C06 | KIE `s3_try`（一鏡到底） | 圳寶接手，風箏歪斜亂晃、掉高度，飄進右邊大樹卡住 | 6（成片放慢成約 9 秒） |
| C07 | 程式人偶特寫 | 圳寶哭（cast expr='sad'＋掉眼淚），背景看得到卡在樹上的風箏，線還連著 | 約 3.5 |
| C08 | KIE `s3_hurry` | 水鈴側面從左邊跑進來（手腳相反、手肘 90 度） | 5 |
| （無台詞） | KIE `s3_help`（可省） | 水鈴站在地上用長竹竿把風箏輕輕挑下來；圳寶線放鬆 | 5 |
| C09 | KIE `s3_happy` | 圳寶雙手拿線軸放風箏、開心；Ken 和水鈴在後面歡呼 | 5 |

- 左右安排：風從左往右。放風箏的人在左、面向右；風箏在右上；大樹在右邊。水鈴從左邊跑進來。左上角天空留空放動詞字卡。
- `s3_help` 沒有對應台詞，是為了讓「跑來幫忙 → 風箏又飛起來」合邏輯才加的；要省點數可以拿掉（`story3.py` 的 `USE_HELP = False`）。

## 待老師決定
1. C07 哭用程式人偶特寫（免費）還是也拍 KIE？
2. 要不要 `s3_help`（竹竿取風箏）這一鏡？
3. KIE 報價：見主對話。

## 驗收條件
- [x] 姿勢檢查圖 `renders/costume/pose_check_s3.jpg` 老師通過
- [x] KIE 480p 試拍通過 → 720p
- [x] 故事 3 試片老師通過

## 老師決定（2026-11-21）
- 竹竿鏡頭 `s3_help` 保留（`USE_HELP = True`）。
- C07「Zun-Bo cries.」改用 KIE 鏡頭 `s3_cry`（首幀 `assets/firstframes/ff3_cry.png`），不用程式人偶特寫。
- 鏡頭順序：s3_fly → s3_try → s3_cry → s3_hurry → s3_help → s3_happy，共 6 鏡 31 秒（480p 約 118 點、720p 約 254 點）。
- 進度：6 鏡 480p 試拍 → 720p → 試片 v1 通過 → 全片 v1 定案（2026-11-21）。KIE 372 點。
