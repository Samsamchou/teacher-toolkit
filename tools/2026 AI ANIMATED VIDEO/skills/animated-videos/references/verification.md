# 驗證與工具

## 設定與事件

使用 `assets/project-template.json` 建立新專案設定。填寫 sources 的專案相對檔案及 SHA-256；實測 duration_sec、fps。cues 是逐句歌詞；events 涵蓋整個音長，每筆有可辨識 visual 描述、人物／物件／場景、action 及需測量的 contact_conditions。例子或無音檔的試跑使用 --plan-only，輸出永遠不是成品通過。

`python scripts/project_check.py project.json --stage plan` 檢查來源與時間表；`--stage full` 額外檢查規格接受及試片接受／明確略過證據。這些欄位只能依實際教師授權填寫，不能為了讓程式通過自行勾選。自動檢查只驗證資料一致性，不能證明教師說過，也不能判斷圖像真的符合歌詞。

## 接觸控制

schema_version=2 的事件須含 action、start_state、end_state、camera、verification。全曲階段另外要求 internal_sample_qa.passed 與 report；教師略過試片等待不代表略過內部檢查。工具只檢查欄位，不能驗證報告內每一個美術主張，必須讀取實際證據。

`node scripts/test_contact.mjs` 測試時間不足、缺支撐、丟失接觸、時間倒退等行為。新案以自己的測量值及條件名稱配置 ContactController；檢查完後才用 allowed 決定後續狀態。接觸容差與穩定時間需依比例及幀率校準。

## 成品

教師正式接受時使用 `assets/teacher-acceptance-template.json`，將原話與實際交付檔案綁定；不得把規格確認當成影片驗收。

verify_video.py 使用傳入或 PATH 上可用的 ffprobe、ffmpeg；不安裝工具。核對解析度、幀率、時長、存在音軌與完整解碼，回傳非零表示失敗。使用 --output 將 JSON 保存於 qa；不覆寫既有報告。

另外必須核對原 MP3 雜湊、字幕來源、全局幀序、分段接合與音訊起中尾對齊；比較多時間窗聲波時，記錄偏移／相關值與方法。全片解碼不能取代同步檢查。

正常速度觀看全曲與高風險慢速檢查，逐項記錄：完整手腳、衣物、徽章、掌向、座位、足底、手物接觸、時間連續、歌詞圖卡、文字清晰。

角色動作品質另依 [角色動畫 12 原則檢查表](character-motion-checklist.md)：每句一格檢查演出清楚、立體感、誇張、吸引力、次要動作；有明顯肢體動作的句子抽動作關鍵格條，檢查預備、擠壓伸展（體積守恆）、跟隨／重疊、緩入緩出、弧線與教學姿勢停格時間。擠壓與回彈只能在接觸閘門成立後發生。結果寫 `qa/motion-principles-<版本>.md`；沒看過格條的項目記「未檢查」。教師接受是獨立文件，包含版本、日期、原話和實際成品雜湊。

## 驗證範圍

Skill 格式驗證、工具單元測試、小案例規格試跑皆不能宣稱新歌影片已完成。依賴、角色幾何、美術、歌曲對齊、動作自然度和教師驗收仍是每個專案必做工作。輸出清楚列出已測與未測。
