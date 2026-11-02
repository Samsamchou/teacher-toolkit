---
rdq_version: 1
edition: claude-code
task: 影片 3 句型篇 Is it ___ today? Yes/No
domain: video
date: 2026-11-02
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 0
downstream: 3d-teacher-lesson-video
---

# RDQ 需求規格：影片 3〈Is it ___ today?〉

## 一句話任務
沿用科幻雙老師與 Amy／Ben，做 10–12 分鐘的 HWG5 U02 P.13 句型教學片：Is it ___ today? → Yes, it is. / No, it isn't. It's ___.

## 已確認
- 長度 **10–12 分鐘**（1A）；五年級；單字 Sunday–Saturday。
- 教學重點：It is ↔ Is it 對調、句號 ↔ 問號；Yes／No 回答；**isn't = is not**。
- **3 部華麗版 Amy／Ben 對話**，每部都有 Yes／No 問答；新增點頭／搖頭等姿勢與斜臉嘴型（2A）。
- 對話流程沿用影片 2：第 1 遍無字幕 → 第 2 遍有字幕 → 老師問 Is it ___ today? → 3 秒 → 揭曉答句 → Repeat after me 一次；對話畫面不出現星期提示。
- 最後猜猜看 **3 題**（3A）。
- 沿用：Nova／Cosmo、Amy／Ben 聲音與 0.8 倍語速；"Repeat after me."；Codex 生圖；本機渲染；不 push。

## 待確認假設
- 三部對話文字稿以本卡附錄為初稿 → 老師確認後才配音。
- 新圖約 **4 個新姿勢**（Amy 點頭、Amy 搖頭、Ben 點頭、Ben 搖頭）×（姿勢＋閉嘴版＋4 嘴型）約 **24 張**，加新場景 **1 張**（籃球場）→ 全用 Codex，不另計費。
- 老師角色不新建 3D 模型（沿用現有 10 個姿勢）。
- 腳本放新的 Google 文件「影片 3」，之後都改同一份。

## 已採納建議
- ① 句型變形動畫（It is Monday today. → Is it Monday today?）
- ② isn't = is not 合併動畫
- ③ 開場約 30 秒回顧影片 2，對比「問星期幾」與「問是不是星期幾」
- ④ Yes 綠色＋✔、No 紅色＋✘
- ⑤ 問句句尾 ↗ 上揚語調提示

## 一段式需求規格
用 skill **3d-teacher-lesson-video**，複製 **video2-whatday** 為 **video3-isit**，製作 **10–12 分鐘**的影片 3〈**Is it ___ today?**〉（**HWG5 U02 P.13**）：開場回顧影片 2 → 句型變形動畫 → Yes／No 回答（綠✔／紅✘、↗ 語調）→ isn't = is not 合併動畫 → 情境練習與帶唸 → **3 部** Amy／Ben 華麗版對話（附錄文字稿，新增點頭／搖頭姿勢與斜臉嘴型）→ **3 題**猜猜看 → 片尾；每一關給老師確認。

## 驗收條件
- [ ] 腳本與三部對話文字稿老師通過後才配音；whisper 核對無誤。
- [ ] 句型變形、isn't 合併、✔／✘、↗ 都出現在畫面上且由程式寫字。
- [ ] 對話畫面沒有星期提示；嘴型跟著斜臉；全片 10–12 分鐘。

## 附錄：三部對話文字稿（初稿）
**對話 1｜教室早上（答案 Monday）**
Ben: Good morning, Amy! Is it Sunday today?
Amy: No, it isn't. It's Monday.
Ben: Oh, no! I'm so sleepy.
Amy: Look! We have P.E. class today.
Ben: P.E. class? Yay! Let's go!
→ 老師問：Is it Monday today? → **Yes, it is.**

**對話 2｜籃球場放學（答案 Friday）**
Amy: Ben, is it Friday today?
Ben: Yes, it is!
Amy: Great! Let's play basketball after school.
Ben: Sure! I love Fridays!
→ 老師問：Is it Thursday today? → **No, it isn't. It's Friday.**

**對話 3｜走廊（答案 Tuesday）**
Ben: Amy, is it Wednesday today? I have my crayons.
Amy: No, it isn't. It's Tuesday.
Ben: Tuesday? Oh, no! No art class today.
Amy: That's OK. We have music class today. Let's sing!
Ben: Ha ha! OK!
→ 老師問：Is it Wednesday today? → **No, it isn't. It's Tuesday.**
