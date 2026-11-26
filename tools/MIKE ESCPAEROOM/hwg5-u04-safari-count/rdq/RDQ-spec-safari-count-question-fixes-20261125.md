---
rdq_version: 1
edition: chatgpt-app
task: Safari Count 單數句、like 依據、數數圖三項修正
domain: dev
date: 2026-11-25
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: self
---

# RDQ 需求規格：Safari Count 題目修正（台灣先做，規則套六國）

## 一句話任務
單數句改 There is、like 題給學生判斷依據、數動物改看動畫截圖。

## 已確認
- 1A 單數拖放＝There **is** one ___.（兩格 is、one；'s 當干擾字）；口說 There's／There is 都算對。
- 2C like 依據兩處都放：情境動畫裡旅伴說一句＋表情；like 題畫面再放旅伴對話泡泡＋❤️／❌ 小圖。
- 3A 數數圖＝從已渲染的動畫截一格（無旁白、無字幕、無紅字），動畫仍在作答後播。
- 本機預覽，不部署、不 commit。

## 待確認假設
- 旅伴會因主角選男／女而變成 she／he → like 線索做**男女兩版**（配音＋動畫結尾小段），網站依主角選版本。
- 動畫裡的 like 線索＝在原動畫最後加約 3 秒「旅伴頭像卡＋一句話＋❤️」（合成時疊上，不重渲 3D，不花 Colab）。
- 台灣線索句：girl 版「I love pandas!」、boy 版同句；No 站（日本、印度）＝「I like horses／monkeys!」，那兩站拖放題之後另做（現在只有台灣開放）。
- 數數圖用 qa/1125-124153/tout 既有畫格（TW1、TW2），不重渲。

## 已採納建議
- ① 肯亞 RHINO、澳洲 LION 也改 There is one ___.；對話稿、配音、台灣動畫答句旁白一起重配（TW1 重新合成）。
- ② 干擾字不放和答案相同的字（修掉重複的 are）。
- ③ 旅伴那句加進 like 題的 🔊 Listen。
- ④ 數數圖先給老師看檢查圖（動物不互擋、一眼數得清）。
- ⑤ 數數畫面加「Look at the picture and count. 看圖數一數。」

## 本次不納入
- 另渲 3D 靜態情境圖（3C）、數數前先播無聲動畫（3B）。
- 日本、印度 No 答案的拖放題型（等那兩站開放再做）。

## 一段式需求規格
修改 **hwg5-u04-safari-count** 與網站 **monster-in-my-mind-site** 的 Safari Count：題庫 `functions/safari-content.json` 單數題改 slots **["is","one"]**、spoken **There is one panda.**，干擾字去掉與答案相同者並加入 **'s**；`spokenCountCheck` 維持 is／'s 都接受；重產 `-a-*.mp3` 答句配音與 TW1 旁白並重新合成 **taiwan_panda.mp4**；新增旅伴線索配音（boy／girl）與動畫結尾 3 秒線索卡，like 題畫面加旅伴泡泡＋❤️／❌＋🔊；從 **TW1／TW2** 既有畫格截乾淨數數圖（**taiwan-panda-count.jpg／taiwan-bears-count.jpg**）先交檢查圖，老師同意後讓伺服器 scene 帶圖片網址取代 emoji，數數畫面加提示句；對話稿 v1 更新單數句與線索句。

## 驗收條件
- [ ] 拖放答案 There is one panda. 過關、There 's one 不過；字卡無重複；口說 There's／There is 都過（測試）。
- [ ] like 題畫面與動畫結尾都看得到／聽得到旅伴喜好線索（男女兩版）。
- [ ] 數數圖檢查圖老師通過，網站數數畫面顯示圖片＋提示句。
- [ ] tsc、eslint、函式測試全過；walk（含遊戲）0 錯誤，截圖給老師。
