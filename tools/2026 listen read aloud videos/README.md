# 2026 listen read aloud videos

可換單字的節奏朗讀圖卡影片 / Reusable rhythmic vocabulary-card videos.

## 目前狀態 / Current status

2026-10-02：九圖正式基準與16圖01新版均已由教師驗收通過；技能已完成、修訂及安裝。全部已指定製作工作完成，目前沒有新題組或待驗收影片。舊版本和原始素材保留。

## 正式影片 / Accepted videos

- **16張圖片01新版 v02**：`productions/sixteen-subjects-01-20261002/v02-grid4x2-lowercase/segment-01/video.mp4`；82.5秒、1080p30，兩輪各8張，01–08第一輪、09–16第二輪，允許兩輪單字及順序不同。總覽每列4張、共兩列。教師原話「驗收新版 通過」，記錄在同目錄 `TEACHER_ACCEPTANCE.json`。
  [雲端 MP4](https://drive.google.com/file/d/151kOoat5pUMy9ifw1Eifs-2ErA6X_FSq/view?usp=drivesdk)。
- **九圖正式基準 v05**：`productions/nine-subjects-20261002/v05-full-B085-clean/nine-subjects-full-B-085-clean.mp4`；90.166667秒、1080p30，同組九圖兩輪、3×3總覽。教師原話「此最新版本確認為正式版」，記錄在 `FORMAL_BASELINE.json`。
  [雲端 MP4](https://drive.google.com/file/d/1GiERGOog1qI2Sw6CxJrFOW1tJORyOfNn/view?usp=drivesdk)。

兩支影片的持久本機預覽入口為各自資料夾的 `preview.html`。歷史QA內pending是產製當時狀態；上述人類接受紀錄對應精確MP4雜湊，為現況依據。

## 已鎖定原則 / Production rules

- 每詞老師marin一次 → 兒童感coral一次；兩種聲音分別生成，朗讀0.85倍且保留音高，搭配約93.673 BPM節奏。播放器以1×播放。
- 依實際語音尾音與重音錨點安排拍數；新單字重新量測，不直接套用九圖片長。兒童感聲線是已接受的合成聲音風格。
- 朗讀時只顯示圖卡及下方英文，不增加「老師／兒童」等角色字卡。
- 每輪8張總覽為4欄×2列；9張為3×3。8張同組兩輪、16張前後各8張、32張分兩段，各段驗收後才合併。
- 一般英文字幕小寫，包含music、science；Chinese和English首字母大寫，PE保持縮寫大寫。原圖手寫文字保持原樣。
- 所有圖片直接本機處理，保留原畫、手寫及著色；只保守去噪、銳化、等比例縮放及1:1補白，不使用圖片生成API。
- 畫面修訂可沿用已接受AAC音軌，但需核對封包／時間戳與解碼樣本；不能只憑聽感聲稱音訊不變。

## 技能與接續 / Skill and continuation

- 使用 `$rhythm-vocabulary-video` 提供新素材、正式單字／圖片配對及順序。
- 個人安裝：`C:/Users/User/.codex/skills/rhythm-vocabulary-video/SKILL.md`。
- GDrive主本：`skills/rhythm-vocabulary-video/`，15檔。
- 最新完整安裝包：`skills/rhythm-vocabulary-video-20261002-v02-grid-case.zip`；舊ZIP保留。
- Git範圍另用去識別的15檔技能副本 `git-export/rhythm-vocabulary-video/`：圖片說明以student01代碼示範，其餘14檔與正式技能相同；已安裝技能及GDrive主本保留原樣。
- 技能設定引用私人本機的黑板、節拍及聲音庫。Git程式副本需取得相應GDrive材料才能重建既有影片。
- 需求規格：`rdq/RDQ-spec-rhythm-vocabulary-video-skill-20261002.md`、`rdq/RDQ-spec-sixteen-subjects-01-20261002.md`、`rdq/RDQ-spec-eight-card-layout-case-20261002.md`。

## 圖片與分析 / Image and analysis records

- 學生作品40張1024×1024正式PNG：`assets/student-art/501/batch-20261002/square/`；選圖入口為上層 `preview.html`，下載包、清單及製作QA同層保存。
- 來源分析與背景音源分離：`analysis/HWG5-U2-20261002/影片分析與重製方法.md`。
- 真實PDF檔、EXIF及失敗案例已用本機測試驗證；32圖路由測試使用8個來源重複成32個ID，不能當作32張不同學生作品驗收。
- 初始分析／製作過程保留於 `PROJECT_HANDOFF.md` 及原始資料夾，歷史狀態不覆蓋目前接受紀錄。

## 收工與同步 / Closeout

- 本次交接：`CLOSEOUT-20261002.md`。後續順序：`NEXT_TASKS.md`。
- 核對紀錄：`analysis/closeout-20261002/verification.json`，兩支MP4與15檔技能／ZIP雜湊一致。
- 16圖新版既有媒體18/18、完整靜音1×瀏覽器播放7/7、音軌保留5/5、技能回歸7/7通過，並已取得教師驗收。
- 原始素材、圖片、影片、聲音及QA保留GDrive；兩支正式MP4已讀回雲端名稱、格式、容量及所在資料夾。遠端未提供SHA，整個專案及新交接文件的服務端同步未獨立驗證。
- 沿用父層teacher-toolkit Git，main。教師已明確授權 `rdq/GIT-SCOPE-listen-read-aloud-20261002.md` 所列25檔提交／推送；實際結果在完成後更新此段與工作筆記，不建立巢狀Git。
