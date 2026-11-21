---
rdq_version: 1
edition: claude-code
task: 故事 2（＋es：Shuiling 的慢跑星期六）動作鏡頭：先查真實姿勢 → 首幀 → KIE Seedance（還沒拍）
domain: video
date: 2026-11-21
status: confirmed
downstream: self
---

# RDQ 需求規格：故事 2 動作鏡頭（照故事 1 v2 的規則）

## 已知
- 故事 1 v2 已通過；老師規則：**有動作的畫面先上網查真實姿勢**、關鍵姿勢檢查圖先給老師、KIE 開拍前先報點數、先 480p 試拍。
- 故事 2 英文稿 7 句（B01–B07）＋3 題三選一；紅色字尾：goes、passes、watches、does 的 **es**。
- 配音已做：`audio/story/B01–B07、BQ1、BQ2`＋`manifest_s2.json`（AQ0「Which word?」沿用故事 1）。

## 鏡頭表
| 鏡頭 | 句子 | 做法 | 預計長度 | 首幀／影片 |
|---|---|---|---|---|
| 片頭卡 | Story 2／verb + es | 程式 | 2.4 秒 | — |
| 介紹 1 | B01 Hi! I'm Shuiling. I go jogging… | 程式人偶：水鈴站著揮手、對嘴；「go」字卡（不加火苗） | 約 8.7 秒 | — |
| 介紹 2 | B02 She's Shuiling. She goes jogging… | 程式人偶：Ken 從左邊走進來、手比向水鈴、對嘴；「goes」字卡＋火苗 | 約 6 秒 | — |
| 介紹 3 | B03 Today is Saturday. It's cloudy. | 程式：SATURDAY 月曆卡＋雲圖示（放左上，不擋臉） | 約 4.4 秒 | — |
| 動作 1 jog | B04 She goes jogging by the river. | KIE（跟拍側面慢跑） | 4.3 秒（影片 5 秒） | `ff2_jog.png` |
| 動作 2 station | B05 She passes the old train station. Toot, toot! | KIE（跟拍；火車停著，第 3.5 秒左右冒兩團白煙） | 6.0 秒（影片 6 秒） | `ff2_station.png` |
| 動作 3 tv | B06 At home, she watches TV. Ha ha! | KIE（固定鏡頭；第 3 秒左右大笑） | 5.8 秒（影片 6 秒） | `ff2_tv.png` |
| 動作 4 homework | B07 She does her homework, too. | KIE（固定鏡頭；鉛筆在紙上寫） | 4.8 秒（影片 5 秒） | `ff2_homework.png` |
| 三選一 ×3 | passes／watches／does | 程式，倒數 4 秒 | 約 28 秒 | — |

全片佔位版 70.9 秒（`renders/story2-placeholder-v1.mp4`）。

## 查到的正確姿勢（檢查點）
### 慢跑（鏡頭 1、2；側面）
- 手腳相反：左腳往前時右手往前（對側手腳同相）。
- 兩手手肘彎約 90 度；手臂從肩膀前後擺，**不橫過胸前**；手放鬆、不握拳（本片再加：手指張開看得到）。
- 身體挺直、只從腳踝微微前傾（不是彎腰）；肩膀放鬆放低；頭抬起、眼睛看前方。
- 腳落在身體（臀部）正下方，不往前跨太大步；膝蓋微彎、不抬太高（慢跑不是衝刺）。
- 來源：
  - https://www.hss.edu/health-library/move-better/proper-running-form
  - https://www.allinahealth.org/healthysetgo/move/running-form-101-eight-simple-steps
  - https://www.dickssportinggoods.com/protips/sports-and-activities/running/guide-to-proper-running-form.html
  - https://www.healthline.com/health/exercise-fitness/proper-running-form
  - https://www.active.com/running/articles/why-your-arms-are-an-important-part-of-your-running-form （手腳相反的原因）
  - https://gaitguys.squarespace.com/thedailyblog/arm-swing-in-gait-and-running-part-1-there-is

### 坐在沙發看電視（鏡頭 3）
- 正對電視坐；屁股坐到底、背靠椅背、上身挺直。
- 兩腳平放在地板上；膝蓋彎、約和臀部同高或略低（小孩：手肘、臀、膝都約 90 度）。
- 本片再加：遙控器握在一隻手、放在腿上（拇指在上、四指在下托住），另一隻手張開放在坐墊上；眼睛看電視；腳不縮到沙發上。
- 來源：
  - https://mstrust.org.uk/a-z/understanding-and-improving-your-posture/how-have-a-good-posture-when-sitting-a-sofa
  - https://www.furniturechoice.co.uk/inspiration/the-best-way-to-sit-on-your-sofa-to-avoid-back-pain/
  - https://www.hss.edu/health-library/move-better/sitting-posture-for-kids
  - https://www.rch.org.au/uploadedFiles/Main/Content/ortho/factsheets/GOOD-POSTURE.pdf

### 坐在書桌前寫功課（鏡頭 4；右手寫字）
- 坐姿：臀、膝、腳踝約 90 度，**兩腳平放地板**；桌面約在手肘下方 5 公分；前臂放桌上。
- 握筆（動態三指握法）：拇指、食指、中指三指；拇指和食指指腹捏住筆，筆靠在中指側面；捏在離筆尖約 1–3 公分；手呈圓弧、手指微彎；筆桿躺在拇指和食指之間的虎口。
- 筆的方向：筆尾（橡皮擦）**朝向寫字那隻手的肩膀**（「順著手臂往上指，不是指天花板」），不朝臉。
- 另一隻手（非寫字手）壓住紙、讓紙不動；紙可以稍微斜放。
- 來源：
  - https://www2.hse.ie/babies-children/disabilities/handwriting/posture-pencil-grasp/ （坐姿、三指握法、筆靠虎口、紙的斜度）
  - https://www.luriechildrens.org/en/specialties-conditions/pediatric-occupational-therapy/resources/handwriting-tips/ （橡皮擦朝肩膀）
  - https://swindon.gov.uk/download/downloads/id/10251/section_12_-_improving_handwriting.pdf （筆的角度順著手臂）
  - https://www.nhsfife.org/media/33251/handwriting-for-high-school.pdf （非寫字手壓紙）
  - https://www.leicspart.nhs.uk/wp-content/uploads/2020/06/417-help-with-handwriting-2.pdf （捏在離筆尖 1–3 公分）
  - https://abuhb.nhs.wales/files/childrens-ot/school-based-occupation/developing-a-tripod-grasp-advice-pdf/

## 首幀（Codex，免費；工作夾 `C:\Users\User\whatif-verbs-work\ff2\`）
- 定案 4 張在 `assets/firstframes/ff2_*.png`；檢查圖 `renders/costume/pose_check_s2.jpg`。
- 重畫紀錄：慢跑第 1 張後手幾乎伸直 → 重畫（b）；車站第 1 張有木偶關節圓點、第 2 張變成走路 → 把慢跑定案圖當第三張參考重畫（c）；看電視第 1 張臉朝鏡頭 → 重畫成臉轉向電視（b）；寫功課前 3 張握拳式握筆、筆尾朝外 → 提示詞寫明「筆和右前臂同方向、筆尾朝右肩」重畫（d），再縮小上移讓腳在字幕上方（f）。
- 已知不完美：寫功課首幀的手很小，只看得出「拇指食指捏在筆尖上方、筆尾朝右肩、左手張開壓紙」，三指細節看不清；KIE 動起來後握法可能走樣，480p 試拍要每秒抽 3–4 格看手。

## 待確認（主對話問老師）
1. 姿勢檢查圖 `pose_check_s2.jpg` 是否通過。
2. KIE 報價（Seedance 2.0 Mini；4 鏡頭共 22 秒）：480p 試拍約 84 點（3.8 點／秒）、720p 約 180 點（8.2 點／秒），各拍 1 次合計約 264 點；重拍另計。
3. 車站要不要改成更像二水車站的樣子（現在是一般的日式木造小站，沒有站名牌）。

## 驗收條件
- [x] 姿勢檢查圖老師通過
- [x] KIE 報價老師同意 → 480p 試拍 → 720p
- [x] 故事 2 試片老師通過

## 老師決定與進度（2026-11-21）
- 車站改成像二水車站（照小行星的車站模型，無字）；寫功課改近鏡頭、動態三指握筆；慢跑改成前手胸前、後手在身後。
- 480p 試拍後車站、寫功課重拍（提示詞 v2：背景只慢慢移、鏡頭鎖死）→ 720p → 試片 v1 通過 → 全片 v1 定案。KIE 305.8 點。
