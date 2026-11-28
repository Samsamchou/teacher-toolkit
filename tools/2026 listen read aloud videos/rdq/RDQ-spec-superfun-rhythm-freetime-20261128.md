---
rdq_version: 1
edition: claude-code
task: Free Time 跟讀版改成 Super Fun 節奏
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

# RDQ 需求規格：Super Fun 節奏版（Free Time 11 個活動）

## 一句話任務
刪除「老師→空拍→兒童→空拍」的跟讀節奏，照 **Super Fun 單字韻文**的節奏，把 Free Time 11 個活動重做成 **2 支短片**。

## 已確認
- 參考片：`參考/Super Fun節奏/` 3 支（SF3 T2 L3、SF3 T2 L4、SF2 T2 L3 卡拉版）。分析紀錄在 `analysis/superfun-reference-20261128/`。
- 節奏照參考片：約 **128 BPM**，前奏約 8 秒（4 小節），每張卡 **2 小節**，每小節開頭唸一次。換卡時有約半拍的空白再跳入；片尾所有卡片一張一張跳出成總覽，再放音樂收尾。
- 每張卡：**第 1 小節老師聲、第 2 小節兒童聲**（1A）。
- 只做**有聲版**，不做卡拉版（2B）。
- 拆成 **2 支短片**（3B）：
  - 影片 1：Ken 3D 11 張
  - 影片 2：雙圖示卡 11 張
  - 順序都是 watch TV、study English、go camping、go jogging、play online games、surf the Internet、listen to music、play the recorder、play baseball、play basketball、ride a bike。
- 建議 ①–④ 全部採納：
  - ① 語音改用**原速 1.0 倍**（已錄好，不再花錢）。
  - ② 先做約 **20 秒節奏樣本**（前奏＋3 張卡）給老師聽。
  - ③ 舊跟讀模式留在 skill；Free Time 舊跟讀正式片另存，不刪除。
  - ④ 整片 **−14 LUFS**、鼓明顯。

## 待確認假設
- 伴奏用程式在本機新做，128 BPM、輕快流行風（鼓、拍手、貝斯、簡單和弦）。不使用參考片的配樂（有版權）。
- 保留黑板畫面風格；換卡跳入動畫和片尾逐張總覽參考 Super Fun。11 張的總覽排 4＋4＋3。
- 字型用 **Comic Sans Bold**（輪替規則）。
- 每支約 **55 秒**：前奏 8 秒＋11 × 3.75 秒＋片尾總覽約 8 秒。
- 原速語音要重新做錨點檢查；放不進一小節的片語只剪中間的靜音，不加快語速。
- 沒有麥克風圖示、沒有學生空拍。

## 本次不納入
- 卡拉版；4 輪結構；重新生成語音；複製參考片的配樂或畫面素材。

## 一段式需求規格
在 **`productions/freetime-activities/v03-superfun/`** 用 rhythm-vocabulary-video，加上新的「Super Fun 節奏模式」，做 **2 支** 1080p MP4（Ken 3D 11 張、雙圖示卡 11 張），字型 Comic Sans Bold。節奏：128 BPM、前奏 4 小節、每張卡 2 小節（老師聲對齊第 1 小節第 1 拍、兒童聲對齊第 2 小節第 1 拍）、換卡半拍空白跳入、片尾逐張總覽加音樂收尾。語音用 v01 已錄好的**原速**音檔，重新做錨點。伴奏本機合成，整片 −14 LUFS、鼓明顯。先交約 20 秒樣本，老師通過後做兩支全片。舊 v02 跟讀正式片保留另存。

## 驗收條件
- [ ] 20 秒樣本：老師覺得速度和伴奏跟 Super Fun 接近。
- [ ] 每張卡老師聲、兒童聲各一次，落在小節第 1 拍附近；語音沒有被截掉。
- [ ] 兩支全片 verify 和瀏覽器檢查都通過；老師明確驗收。
