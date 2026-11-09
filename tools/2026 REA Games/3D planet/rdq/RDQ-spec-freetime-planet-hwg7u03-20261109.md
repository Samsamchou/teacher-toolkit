---
rdq_version: 1
edition: chatgpt-app
task: 二水小行星 Free Time 版（HWG7 U03 free time activities）
domain: dev
date: 2026-11-09
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 3
downstream: self
---

# RDQ 需求規格：二水小行星 Free Time 版

## 一句話任務
複製二水小行星做「Free Time 版」：Ken、水鈴、圳寶在二水各有一個家（外觀＋室內），學生看音效／3 icons／無聲影片／程式動畫猜 11 個 free time 活動，練 *I ___ in my free time.* 與 *He/She ___ in his/her free time.*，角色真的去做那個活動。

## 已確認
- 教材：HWG7 U03 11 個活動＝go jogging、listen to music、play baseball、play basketball、ride a bike、study English、surf the Internet、watch TV（課本）＋go camping、play online games、play the recorder（補充）。
- 句型：Ken＝What do you do in your free time? / I ___ in my free time.；圳寶＝What does he…? / He ___ in his free time.；水鈴＝What does she…? / She ___ in her free time.
- **4 條路線**（每條 11 題、11 個情境、路線合邏輯）：Ken A、Ken B、水鈴、圳寶。
- **4 種線索**：音效、3 icons 1 word、無聲演出影片、程式動畫；每回合隨機分配。
- **1A 兩種玩法**：個人（學號、iPad；選擇 3＋拖放 3＋AI 口說 5，沿用 Listen and Guess 的口說 AI、錄音靜音、最多 5 次）＋分組（投影；各組押注，角色演出答案，最後各組分數＋慶祝動畫）。
- **2A 動作**：Mixamo 免費動作套到 Ken／水鈴／圳寶（老師在 Chrome 登入 Adobe，我挑選下載）。
- **3A 影片**：KIE（Veo 或 Seedance）做 11 段 6–8 秒無聲肢體演出，主角用 Ken 的樣子，**先報價**。
- **4A 家**：外觀 Colab 3D 模型；室內程式蓋客廳＋書房（沙發、電視、書桌、電腦、書櫃），進門切室內鏡頭。
- 保留二水小行星架構（街道、學校、空拍、音效、存檔、教師後台…），移除「猜地點」題目；引導語改成六年級聽得懂的英文。
- 採納 ①先做 Ken A 路線試玩版再做其他 3 條 ②3 icons 用 Codex 畫黑白剪影（不用浮水印圖）③音效 KIE＋老師找的免費音效（記來源授權）④家的位置先標 3 個候選給老師選 ⑤室內進門才載入。

## 老師 11/09 修正（rev 1）
- **兩種玩法分開**：
  - **全班分組猜猜看**（投影、各組押注）：只讀英文情境，看 3 個選項猜 free time activity；角色演出答案；11 題後顯示各組分數＋慶祝。**不出現線索素材**。
  - **兩人一組線索挑戰**（2 人一組，共 10 組，iPad）：每題順序＝**先讀英文情境 → 再拿到線索**（音效、3 icons、無聲影片／程式動畫其中一種）**→ 最後答題**（選擇 3、拖放 3、AI 口說 5）→ 角色演出答案。（rev 2，老師 11/09）
- **情境選 B**：只留星期、天氣、時間（例 *Today is Sunday. It's windy.*），不放耳機、橘色球、球棒手套這類明顯提示字。
- Ken A 情境句老師已核對（資料/freetime/ken-A-scenarios-draft-20261109.md）。

## 待確認假設
- **兩人一組登入（rev 3，老師確認）**：只輸入兩人的學號連在一起，例 **6010160126**（＝60101＋60126）；成績記在兩人名下（教師後台各看得到）；AI 口說由兩人輪流錄。
- 一回合＝1 條路線 11 題（兩人一組：3 選擇＋3 拖放＋5 口說；全班分組：11 題都押注）。
- 上學方式：Ken 騎腳踏車、水鈴走路、圳寶坐家人機車（by scooter）。
- 地點：play basketball／play baseball／go camping＝水心之初大草原一帶；listen to music＝二水鄉立圖書館；ride a bike、go jogging＝從家出發到學校；watch TV、study English、surf the Internet、play online games、play the recorder＝家裡室內。
- 44 個情境句（例：Today is Monday. Time to go home. → study English）由我先寫，老師核對。
- 新專案：`3D planet/godot-ershui-freetime/`；網站 `ershui-freetime/`＋個人外框 `ershui-3d-quest-freetime/`。

## 本次不納入
- 第 2–4 條路線（等 Ken A 試玩確認後再做）。
- Tripo 加購點數。

## 一段式需求規格
複製 **godot-ershui-planet** 成 **godot-ershui-freetime**，移除猜地點題組，保留其他架構；在二水地圖選 3 戶當 Ken、水鈴、圳寶的家（先給老師 3 個候選），外觀用 Colab Hunyuan3D-2、室內用程式蓋（進門才載入）；用 Mixamo 免費動作讓 3 人做 11 個 free time 活動；4 種線索（KIE＋免費音效、Codex 黑白剪影 3 icons、KIE 無聲演出影片〔先報價〕、程式動畫）每回合隨機分配；個人模式（學號，3 選擇＋3 拖放＋5 AI 口說）與分組模式（押注、角色演出、各組分數＋慶祝）；第一階段只做 **Ken A 路線 11 題**，上預覽頻道 **ershui-preview** 給老師 iPad 試，確認後再做 Ken B、水鈴、圳寶 3 條。

## 驗收條件
- [ ] 老師核對：3 戶家的位置、Ken A 的 11 個情境句、33 張 icons、11 段音效、11 段影片。
- [ ] Ken A 路線：選對答案後 Ken 從正確地點出發、做出那個活動（室內活動進得了家）。
- [ ] 個人模式口說 AI 正常、題型 3／3／5；分組模式最後顯示各組分數＋慶祝。
- [ ] iPad 跑整回合不當機；KIE、Colab 花費在報價內。
