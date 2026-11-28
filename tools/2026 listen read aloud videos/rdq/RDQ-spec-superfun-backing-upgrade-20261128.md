---
rdq_version: 1
edition: claude-code
task: Super Fun 節奏版伴奏升級（AI＋本機樣本比較）
domain: video
date: 2026-11-28
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: rhythm-vocabulary-video
---

# RDQ 需求規格：伴奏更好聽、更吸引學生

## 一句話任務
做 **AI 音樂**和**加強版本機伴奏**兩種 20 秒樣本給老師比較，選定後用在 Free Time 兩支 Super Fun 節奏短片。

## 已確認
- 兩種都做樣本，老師聽了再選（1C）。
- 風格：**活潑兒歌流行**，鐘琴、拍手、烏克麗麗，像 Super Fun（2A）。
- 換卡時加一聲輕快音效（「咻」或「叮」）提醒學生看下一張（3A）。
- 不變：128 BPM、每張卡 2 小節（老師聲→兒童聲，對齊第 1 拍）、原速語音、兩支短片、Comic Sans。
- 建議 ①–④ 全採納：
  - ① AI 音樂量拍點、必要時微調速度，讓人聲落在拍上；差太多就重做。
  - ② 音樂分段：前奏 → 卡片段 → 片尾總覽變熱鬧。
  - ③ 兩支影片用同一首伴奏。
  - ④ 伴奏比人聲小 6 dB，整片 −14 LUFS。

## 費用（AI 音樂）
- KIE Suno「Generate Music」**每次 12 點（約 US$0.06）**，一次約出 2 首。官方範例是 2 首，文件沒有保證。
- 計畫送 **2 次**（約 4 首）＝24 點，約 US$0.12。**上限 48 點（約 US$0.24）**，包含速度不準時重做；超過就停下來先問老師。
- 模型用 V6，純音樂（instrumental）、custom mode。要求長度約 75 秒（兩支各約 62 秒，取同一段用）。

## 待確認假設
- AI 提示詞（英文）：「upbeat children's pop, 128 BPM, 4/4, glockenspiel, ukulele, hand claps, bright bass, playful, catchy simple melody, classroom chant backing, instrumental, no vocals」。不提任何真實歌名或歌手。
- 本機加強版：加上 8 小節主旋律（鐘琴）、木琴點綴、每 4 張卡一次鼓花、片尾總覽加厚和弦和拍手。
- 兩種樣本都用同一段：前奏＋watch TV、study English、go camping，約 22 秒，換卡音效相同。
- AI 伴奏如果有旋律太搶、蓋過人聲，人聲出現時把伴奏壓低 3 dB（ducking）。

## 本次不納入
- 卡拉版；換 BPM；用參考片的原配樂；AI 版人聲。

## 一段式需求規格
在 **`productions/freetime-activities/v03-superfun/`** 做兩種伴奏的 22 秒樣本。
- **A＝KIE Suno V6 純音樂**：兒歌流行、128 BPM，送 2 次，上限 48 點。量拍點後必要時用 rubberband 微調到 128 BPM，從第 1 個強拍開始對齊。
- **B＝本機 backing.py 加強版**：加鐘琴主旋律、木琴、鼓花、片尾變熱鬧。

兩種樣本都加換卡音效，伴奏比人聲低 6 dB，整片 −14 LUFS。老師選定後，Ken 3D、雙圖示卡兩支全片用同一首伴奏，verify 加查人聲落在拍上，老師驗收後再登記。

## 驗收條件
- [ ] 兩種樣本（至少 1 首 AI＋1 首本機）交給老師，老師選定一種。
- [ ] AI 音樂拍點和 128 BPM 網格的誤差 ≤ 30 ms，人聲仍落在每小節第 1 拍。
- [ ] 兩支全片 verify 和瀏覽器檢查都通過，老師明確驗收。
