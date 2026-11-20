# 世界作息之旅：「旅程完成」畫面設計稿（只是設計，網站還沒改）

示意圖：`finish_mock.png`（Codex 生成，提示詞 `prompt.txt`）。圖裡的問題見最下面。

## 什麼時候出現
- 第 10 站（Australia）蓋章後按「Back to the map」→ 地圖上主角坐玩具飛機從澳洲飛回台灣（沿用現有的飛行動畫，字幕 Going home to Taiwan by plane…）→ 自動打開完成畫面。
- 之後每次進地圖，上方工具列多一個「🏆 My Trip」按鈕，可以再打開。取代現在地圖中間那個小框（`.wr-finish`）。

## 畫面上有什麼（英文用 Comic Relief，中文只當小字說明）
1. 大標題：**You travelled around the world!**＋彩帶（CSS 動畫）。
2. 左：學生選的主角（女生或男生）回到台灣。
3. 中：打開的護照，10 個紅色墨水章（國名＋時間，和現在蓋章畫面同一種章），下面是總星數 **27 / 30 ★**。
4. 右：10 句作息句子，時間用紅字，每句前面一個 🔊 按鈕，另加小字國名（避免兩句早餐分不清）。
5. 下：**My Certificate 我的證書**、**Back to the map 回地圖**。
6. 證書（另一頁，可列印也可截圖）：Certificate of Travel／Student No. 60101／10 個章＋星數／完成日期／一句話 *has visited 10 countries and learned 10 daily routines.* **不放姓名**，只放學號；按 Print 用瀏覽器列印（A4 橫式），iPad 就截圖。

## 學生可以做什麼
點 🔊 重聽那一站的答句；（可選）Play all 依序播 10 句；打開證書、列印；回地圖。

## 沿用的資料與檔案
- 站別：`functions/routines-content.json` 的 `stations[].id / order / country / display / hour / code`。
- 學生進度：`routinesState` 回傳的 `stations[id].gameDone`、`stars`（每站 0–3，總和上限 30）。完成畫面出現的條件＝10 站 `gameDone` 都是 true（地圖已經這樣算）。
- 語音：`public/world-routines/audio/<id>-a.mp3`（10 個，已有，就是各站當地學生說的答句）。
- 圖：`art3d/hero_<girl|boy>.png`、`art3d/hero_<hero>_plane.png`、`art/passport.png`、`art/world_map.jpg`；字型 `fonts/ComicRelief-*.ttf`；樣式 `.wr-ink`、`.wr-big`、`.wr-chip`；主角選擇在 localStorage `wr-hero`。
- 要補的小程式：① 學號目前只在登入畫面，要留在 `RoutinesApp` 狀態裡給證書用；② 完成日期：學生端拿不到 `gameDoneAt`，要嘛用裝置今天的日期，要嘛 `routinesState` 多回傳第 10 站的 `gameDoneAt`（要重新部署函式）。`gameScore`、`minutes` 只在老師後台，完成畫面不用。

## 需要的新素材
- 主角回到台灣的 3D 圖（女、男各一，拿護照揮手）：用現有模型在 Colab 渲染 `portraits.py`，約 0.4 單位，不用 Tripo；或先沿用 `hero_<hero>.png`（0 成本）。
- 完成音效：先沿用 `music/opening.mp3`（0 成本），或另做 2–3 秒歡呼音效。
- 證書邊框：純 CSS 即可；想要華麗一點就 Codex 生一張底圖。不需要新的英文語音。

## 請老師決定
1. 右邊標題：示意圖寫 *My Day Around the World*，但 10 句是 10 位不同國家小朋友的作息（早餐出現兩次）——要改成 *Friends Around the World* 嗎？
2. 星數顯示「27 / 30」還是只顯示「27 ★」（沒滿分的學生會不會在意）？
3. 時間要不要標 a.m./p.m. 或小太陽／月亮（4:30、9:15 是下午晚上；資料裡有 24 小時制可自動判斷）？
4. 證書放哪些：學號＋日期＋星數就好，還是加班級、稱號（World Traveller）？要列印還是截圖就夠？
5. 主角回家圖要新渲（約 0.4 Colab 單位）還是沿用現有？
6. 要不要「Play all 播全部」按鈕？

## 示意圖和實際設計不同的地方
上方紅點只有 9 個（應該 10 個）；句子沒有標國名、沒有中文小字；每個章都畫小飛機（日本、澳洲其實是坐船、西班牙坐火車）；台灣小島和木牌是 AI 畫的，不是現有素材；27 / 30 是舉例的數字。其他英文拼字和 10 個時間都對，圖裡沒有時鐘。
