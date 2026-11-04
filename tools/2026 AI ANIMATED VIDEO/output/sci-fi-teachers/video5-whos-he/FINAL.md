# 影片 5〈Who's he? Who's she?〉定案紀錄

- 2026-11-04 老師「兩支都定案」：正式版 `renders/video5-whos-he-v1.1.mp4`（10:36，1080p）＋`video5-whos-he-v1.1-720p.mp4`（26.7 MB）。影音檔與圖片不進 Git。
- 出處 SF3 U01 句型（課本 p.29，四年級）；規格卡 `rdq/RDQ-spec-video5-whos-he-20261104.md`；腳本 Google 文件 1EzjLiWoEWgfHcDm-EGt3p-qPFh66xhRLHjEDy81v9h8。
- 段落：01 開場（接力唸六位家人）→ 02 he＝他、she＝她（藍／粉圖示、He or she? 四題）→ 03 縮寫合併 He's／She's／Who's（`merge_is`）→ 04 問句 Who's he?／Who's she?（句尾 ↘ `fall_arrow`）與答句 → 05 老師示範 → 06 三部對話（Amy 問、Emma 答；學校門口 father／mother、公園 grandfather／grandmother、生日派對 sister／brother；聽兩次 → 老師指家人問答 → 跟著 Amy 和 Emma 唸）→ 07 Game time 六題（學生先問再答）→ 08 複習。
- 程式：以影片 4 為底（接力 relay、Emma 一家），`render_v1.py` 新增 `board_v5`；對話用影片 3 的 `talk_deluxe.py` 改寫：Amy＋Emma＋右側兩位家人（`talk_shots.py` 加 focus 欄位、`fam` 鏡頭、`EXTRA_X`）；被問到的家人＝沿輪廓黃色亮邊＋箭頭、其他人 RGB 變暗；跟唸段 `pass:3` 用 `idx_map` 對回鏡頭表。
- 新素材（Codex，0 元）：scene-schoolgate／park／party、amy-ask（指向右側）＋4 張斜臉嘴型（`gen_scenes5.py`、`mouth_variants.py`，手動嘴位 [299,257,53]）。
- 聲音：Amy＝en-US-AnaNeural；Emma＝en-US-AriaNeural +35Hz（老師試聽 4 選 1，Jenny 和 Ana 聽不出差別）。
- 老師回饋與修正：跟唸時看不到句子 → 跟唸段加句子字卡、字幕顯示該句；Game time 加半提示（Who's ___? ＋男女圖示／He's my ___.）；Game time 字卡擋住前排 Emma、姊姊、弟弟 → 全家福整體上移、縮小約 10%（v1.1，影片 4 同步 v1.3）。
- 試片自修：大光暈讓畫面泛黃、家人半透明像鬼影、近景切到半個 Amy、Your turn 壓字卡；第一次全片渲染因 he＝他／she＝她 雙行卡（兩個 =）出錯 → 專用畫法，並逐句試畫 201 格後再渲染。
