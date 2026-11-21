---
rdq_version: 1
edition: claude-code
task: 所有格 my/your/his/her/our/their 文法教學動畫
domain: video
date: 2026-11-15
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 4
  revisions: 0
downstream: whatif-situation-video（畫風 I 引擎）
---

# RDQ 需求規格：所有格文法動畫（HWG7 U03 Free Time）

## 一句話任務
做一支給**國小六年級**的文法教學動畫：先講 **I→my、you→your、he→his、she→her、we→our、they→their** 六種變化，再用 6 段情境動畫（每段 **5 句**）演出每個所有格。

## 已確認
- 來源：課本兩個答句 `I go jogging in my free time.`、`She watches TV in her free time.`（重點只在所有格）。
- 參考片 `Video_261115084255.mp4`：對照表逐行出現＋人物圖示，`This is ___ book.` 把 my 拖進空格。
- 1A：**畫風 I**（2D＋2.5D 視差為主），每段 **1 個 Blender 3D 鏡頭**（Colab G4，約 **12–15 單位**，每鏡渲染前先報用量）。
- 2A：文法講解用**英文配音＋中文小卡**（我的、你的、他的、她的、我們的、他們的）。
- 3A：角色＝Ken（I）、媽媽（your）、**爸爸（his）**、水鈴（her）、Ken＋水鈴（our）、**爺爺奶奶（their）**。
- 4C：每段播 2 次（正常速度→慢速＋跟讀倒數），再加填空小測驗。
- 英文稿 v1：老師改第 1 段（**baseball**）、第 5 段（**Class 601、Ms. Yeh、basketball court、play basketball**）；檔案 `情境英文稿-draft-20261115.md`。
- 字體 Comic Relief；1080p＋720p，不做手機版；英文字幕不加中文字幕（中文只在講解小卡）。

## 已採納建議
- ① 每段結尾填空：三個選項飛進空格（參考片的拖拉感）。
- ② 全片配色固定：主詞**藍**、所有格**紅**。
- ③ 說到所有格時，從人物拉虛線到物品，物品貼上紅色名牌（my、your…）。
- ④ 加約 1 分鐘的快速判斷：his 和 her、our 和 their。

## 待確認假設
- 片長約 **9–10 分**（講解 1.5＋6 段×約 70 秒＋對比 1＋回顧 0.5）。
- 配音 edge-tts：Ken 男童聲、媽媽 Aria、爸爸 Andrew（沿用 Free Time 片）；水鈴、爺爺奶奶、Ms. Yeh 試聽後再定。
- 3D 鏡頭用小行星現成 Ken／水鈴模型；爸爸、爺爺奶奶沒有 3D 模型 → 他們那幾段的 3D 鏡頭拍物品（吉他、房子、狗），不拍人。
- 先做**第 1 段（I→my）試片**，含講解開頭＋1 個 3D 鏡頭。
- 字幕版＋聽力版兩種。

## 一段式需求規格
用 **whatif-situation-video** 的畫風 I 引擎（Canvas＋Playwright＋ffmpeg，2D 扁平紫藍色調＋多層視差 2.5D），在 `output/possessive-adjectives/` 做一支約 **9–10 分**的國小六年級所有格文法動畫。片頭依參考片的方式講解：對照表逐行出現，配人物圖示，用英文配音＋中文小卡，主詞藍、所有格紅，示範 `This is ___ book.` 填入 my。接著照 `情境英文稿-draft-20261115.md` v1 演 6 段情境（每段 5 句）；每句台詞都有對應動作，說到所有格時從人物拉虛線到物品，並貼上紅色名牌。每段播 2 次：正常速度一次，慢速＋跟讀倒數一次；結尾做三選一填空；每段配 1 個 Colab G4 Blender 3D 鏡頭（總共約 **12–15 單位**，先報再渲）。最後加 his／her、our／their 快速判斷約 1 分鐘，片尾回到課本兩個答句。字體 Comic Relief，輸出字幕版＋聽力版的 1080p 和 720p。先交第 1 段試片給老師核准，再做全片。

## 驗收條件
- [x] 六種變化講解完整，配色一致（主詞藍、所有格紅），有中文小卡
- [x] 6 段情境每句台詞都有對應動作；說到所有格時虛線＋名牌指到正確物品
- [x] 每段播 2 次＋填空；his／her、our／their 對比段正確
- [x] 第 1 段試片老師核准後才做全片；Colab 用量每次先報
