---
rdq_version: 1
edition: claude-code
task: 第 3、4、6 段最後一句改成動作動畫
domain: video
date: 2026-11-15
status: confirmed
telemetry: { mode: lite, rounds: 1, questions: 3, q4_adopted: 4, revisions: 0 }
downstream: self
---

# RDQ 需求規格：第 3、4、6 段動作鏡頭（全片 v1 → v2）

## 已確認（老師 11/15：1C、第 2 題改用網站動畫、3A、建議全採）
- 第 3 段 He plays the guitar…：**Codex 動作圖＋程式 2.5D**（坐著彈吉他、刷弦兩格交替、分層視差、鏡頭推近）。
- 第 4 段 She watches TV…：直接用 **Free Time 網站的水鈴 watch TV 動畫**（`whatif-shuiling-freetime/renders/mime/tv`，145 格）。
- 第 6 段 They walk their dog…：**KIE Seedance**，2D 畫面當首幀，爺爺奶奶牽狗走出家門、沿田邊小路，鏡頭跟拍。**開拍前先報點數、先試拍 480p**。
- 建議全採：①先做爸爸彈吉他試片；②程式音效（刷弦、卡通笑聲、腳步＋狗叫）；③三個鏡頭都 5.8 秒；④只把改的段落剪成約 1 分鐘預覽片，通過才重出全片。

## 規則
- 吉他姿勢照正確持琴：琴身放右大腿、琴頸朝左上、左手手指按在指板、拇指在琴頸後、右前臂靠在琴身上緣、右手在音孔上方刷弦。
- 手要張開、不握拳；道具要真的拿住。

## 驗收條件
- [x] 爸爸彈吉他試片老師通過
- [x] 三個鏡頭都有動作，名牌 his／her／their free time 照舊
- [x] 預覽片通過後才重出全片（字幕版＋聽力版）
