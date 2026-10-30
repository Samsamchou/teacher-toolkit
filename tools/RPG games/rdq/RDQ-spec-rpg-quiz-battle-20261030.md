---
rdq_version: 1
edition: claude-code
task: 題庫→RPG 答題戰鬥網站＋可重用 skill，部署 Firebase
domain: dev
date: 2026-10-30
status: confirmed
telemetry:
  mode: full
  rounds: 2
  questions: 7
  q4_adopted: 5
  revisions: 0
downstream: self（完成後另建 skill：rpg-quiz-battle）
---

# RDQ 需求規格：RPG 答題戰鬥（HWG5 U01–U02 首發）

## 一句話任務
把 **HWG5 U01–U02** 題庫做成有真 4×4 精靈幀動畫的回合制 RPG 答題網站，部署到 Firebase 獨立網站，保存學生成績與遊戲紀錄，並整理成可重複使用的 skill。

## 已確認
- 題庫：`escape room HWG5-U01-U02\HWG5 U01 + U02 題目與答案表.docx`
- 動畫：真 4×4 精靈幀（4 種動作 × 4 幀：待機、攻擊、受傷、勝利或倒下），以 CSS steps() 逐格播放
- 部署：Firebase 專案 **g6-english-online-learning**，另開獨立 Hosting site（暫定 **rpg-quiz-battle**），不影響 hwg5-clock-tower
- 身分：5 碼學號（格式 `^[3-6]\d{2}(0[1-9]|[12]\d|30)$`），去識別化
- 成績：每份試題滿分 **100**，每題均分；成績取**最高分**；每次作答都留下紀錄
- 遊戲紀錄（輸贏、連擊、大招、通關、用時）和成績分開存
- 採納建議：①固定引擎模板＋只換題庫和圖 ②玩法自寫原創，不沿用對方程式與 SKILL.md ③英語讀題按鈕 ④老師端紀錄與匯出 ⑤本機 rembg 去背
- 生圖一律用 Codex CLI（`codex exec`）；每張圖都給老師看

## 待確認假設
- 題目要全部轉成 4 選 1；拼字或拖放題改成「選出正確拼法或句子」→ 轉換表先給老師核對
- 讀題 → edge-tts 預先錄好英文 MP3（en-US，0.85 倍），不在學生端呼叫 AI
- 老師後台 → 只有 **u9431818@gmail.com** 能用 Google 登入；可依班級和座號看成績、每題錯誤率、遊戲紀錄，並匯出 CSV
- Firestore 規則：學生只能寫自己的紀錄，不能讀別人的；正式部署前先用模擬器測試
- 怪物數量 → 3 隻（2 隻一般怪＋1 隻 Boss）；畫風 → 奇幻勇者 Q 版、明亮
- 精靈幀先做主角＋1 隻怪物的樣張，老師點頭後才做其他角色
- 先部署到預覽頻道，老師用 iPad 和教室電腦實測後，才上正式站

## 本次不納入
- HWG7 與其他科目的題庫（skill 完成後再套用）
- 角色養成商店的花費數值平衡（先做簡單版）

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\RPG games** 建立原創的回合制 RPG 答題戰鬥網站。玩法、程式碼與提示詞都自己寫，不沿用 ijun-ai 的 SKILL.md。首發題庫是 **HWG5 U01 + U02 題目與答案表.docx**，題目統一轉成 4 選 1 並附解析。主角和 **3 隻**怪物使用 Codex CLI 生成的 **4×4 精靈圖**（4 種動作 × 4 幀），用 rembg 去背、切格對齊後，以 CSS steps() 播放。答對時主角攻擊，答錯時怪物反擊，並跳出解題秘笈。音效用 Web Audio 合成；每題有 edge-tts 讀題按鈕。學生以 **5 碼學號**進入。每份試題滿分 **100**，每題均分，成績取**最高分**；每次作答與遊戲紀錄都存進 Firestore。老師端可用 **u9431818** 帳號登入查看與匯出 CSV。網站部署在 Firebase 專案 **g6-english-online-learning** 新開的 Hosting site **rpg-quiz-battle**：先上預覽頻道，老師確認後才上正式站。最後把「固定引擎模板＋題庫轉換＋生圖切幀」整理成 Claude Code skill **rpg-quiz-battle**。

## 驗收條件
- [ ] 主角與怪物的 4×4 精靈幀樣張經老師確認，四種動作播放時角色外型一致、不跳動
- [ ] 用測試學號 **69930** 玩完一輪：分數正確算到 100 分制、取最高分；Firestore 有成績與遊戲紀錄
- [ ] 老師後台能看到該筆紀錄並匯出 CSV；學生帳號讀不到別人的資料（已用模擬器驗證）
- [ ] iPad 與教室電腦在預覽頻道都能順利遊玩，讀題音檔能播放
