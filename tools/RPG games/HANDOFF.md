# RPG 答題戰鬥（時鐘塔答題大作戰）交接

最後更新：2026-10-30

## 是什麼
參考 ijun-ai「回合制 RPG 答題戰鬥 Skill」的玩法概念（只參考機制，程式與提示詞全部自寫）。
把題庫做成回合制 RPG：答對 Ken 攻擊、答錯怪物反擊並跳出解題秘笈；每份 100 分取最高分；雲端留紀錄。
需求規格：`rdq/RDQ-spec-rpg-quiz-battle-20261030.md`（confirmed）。可重用流程：`~/.claude/skills/rpg-quiz-battle/SKILL.md`。

## 對方 skill 的分析結論（2026-10-30）
- 它是給 Google Antigravity 的 SKILL.md 提示詞檔；用 `generate_image` 生 4 張圖＋rembg 去背，輸出 `output/index.html`＋`assets/images/`。
- 宣傳寫「4×4 精靈圖連續幀」，但示範遊戲實際是單張立繪＋CSS keyframes（呼吸、突進、受傷、大招）。我們這版才是真的 4×4 逐格動畫。

## 資料夾
- `content/hwg5-u01-u02/`：轉換後題庫 bank.json、老師核對表 review.md、題目圖
- `art/prompts/`：生圖提示詞；`art/raw/`（原圖，不入庫）；`art/check/`（檢查圖，不入庫）
- `tools/`：build_bank_hwg5.py、make_quiz.py、gen_image.py、process_sheet.py
- `site/`：Firebase hosting（site **rpg-quiz-battle**，專案 g6-english-online-learning），`public/` 是網站

## 目前狀態
- 首發題組 HWG5 U01–U02：32 題，**沿用原本的拼字（11）＋拖放（21）題**（10/30 老師改口：不要選擇題），每題 3.125 分，第一次送出全對才得分。
- 精靈幀：Ken、齒輪小怪、發條兔兔、Boss 時間吞噬者，全部 4×4（老師 10/30 同意樣張畫風）。
- **正式站 https://rpg-quiz-battle.web.app**（2026-10-30 老師 iPad 測完後上線）；老師後台 /teacher/。預覽頻道 preview 到 11/13。
- Firestore 規則：template 已加 `rpgAttempts` 區塊，模擬器 54/54 通過；2026-10-30 老師同意後已部署正式。
  預覽站實測：學生寫入成功（synced），匿名裝置讀取 rpgAttempts 被拒（permission-denied）。
- 老師後台 `/teacher/` 沿用闖關任務的老師帳號（6 位數通行碼），不是 Google 登入（規格卡原本寫 Google，這裡改為沿用現有帳號）。

- **只支援 iPad**（10/30 老師：不需要手機版）：橫向 1024×768、直向 768×1024（直向圖在上、作答在下）32 題都不用捲動；1280×720 投影也可。

## 待辦
1. （無）之後新增題組照 skill rpg-quiz-battle：先預覽頻道，老師確認再上正式。

## 踩坑
- Claude 預覽窗格在背景時會把 CSS 動畫放慢（1 秒只跑 0.28 秒），怪物看起來很晚才出現；真瀏覽器正常。本機用 `tools/serve.py`（不快取，port 5179），`?seg=2` 可直接從 Boss 段開始（只在 localhost）。
- Codex `-s workspace-write` 寫不進 G 槽 → gen_image.py 在暫存資料夾跑再複製。
- 生成的精靈格子光效會越界到鄰格 → process_sheet 刪碰邊碎片＋邊緣漸隱；不要逐格硬對齊所有列（會吃掉衝刺位移）。
- RGBA 直接縮圖會讓半透明光效發灰 → 先轉 RGBa（預乘）。
- 原闖關題目有程式疊的星期條與時鐘指針，是答題線索，轉換時一定要帶過來。
