---
rdq_version: 1
edition: chatgpt-app
task: 八圖兩列總覽及單字大小寫修訂
domain: video
date: 2026-10-02
status: confirmed
telemetry: {mode: lite, rounds: 0, questions: 0, revisions: 1}
downstream: rhythm-vocabulary-video
---
# RDQ需求規格：八圖排版與字幕大小寫

本次為使用者明確提出的既有成品修訂，資訊足夠，零題直接執行。

- 每輪8張總覽採4欄×2列，上列前4張、下列後4張；兩輪、片頭、輪次切換及結尾皆適用。9張維持3×3。
- 第二輪MUSIC與SCIENCE改成music、science，總覽與逐張朗讀字幕同步修改。
- 技能檢查一般單字小寫；Chinese的C大寫。沿用語言名稱與縮寫規則，English的E大寫、PE全大寫；原圖內手寫與星期保留。
- 01–16順序、兩輪不同內容、老師marin→兒童感coral、0.85語速與節奏保持；直接複製原AAC並核對封包及完整解碼音訊。
- 新片另存v02，保留v01及原始圖片；更新技能原始碼、文件、個人安裝與G槽備份，新ZIP不覆蓋舊ZIP。
- 交付新版MP4雲端連結、總覽截圖與QA。無新增API生成。

## 驗收
- [x] 每個八圖總覽都有4欄2列且順序正確；9圖排版不受影響。
- [x] music、science小寫，Chinese／English／PE例外檢查有效。
- [x] 原AAC封包與解碼音訊相同；完整MP4解碼及播放通過。
- [x] 更新後技能通過實測、安裝及備份逐檔SHA讀回。

完成證據：新版segment-01/QA-delivery.json及analysis/eight-card-layout-case-20261002/installation-manifest.json。
