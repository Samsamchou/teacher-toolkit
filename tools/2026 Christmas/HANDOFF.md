# 2026 Christmas｜方塊體素聖誕繪本 HANDOFF

## 規格
- RDQ 規格卡（confirmed 2026-11-27）：`rdq/RDQ-spec-christmas-voxel-storybook-20261127.md`
- 3D 版：新畫風 K 方塊體素繪本（畫風 E Three.js 引擎＋程式方塊拼人物場景，不用 Tripo），英文配音 0.8 倍＋卡拉 OK＋單字大圖卡，字幕版＋聽力版。
- 2D 版：同模型做平面畫面，只卡拉 OK、無配音；網頁播放器（空白鍵換句）＋MP4。全校朗讀 12/19–12/25，12/18 前交件。
- 禁用：Steve、Alex、苦力怕、地獄門、Minecraft 名稱／材質。

## 來源
- 網站 https://kingwolfe01-hub.github.io/hess_Christmas_code/ 的 `js/story.js`（8 幕對白）。
- 錄影 `參考/麥塊繪本.mp4`（2:28）；截圖總表 `research/recording-contact-sheet.jpg`。

## 進度
- 2026-11-27 故事稿 v1：`script/story_v1.json`（正本）＋`script/story_v1.html`；
  Google 文件「聖誕方塊繪本｜Ken and Shuiling Save Christmas 故事稿 v1」
  https://docs.google.com/document/d/1NSR0G87ZmSr0IwAkIv1iITTgYYUYmf-ZPTELcCiKIvY/edit
  24 句、219 字；單字檢查通過（每字只在一句：2 Santa、5 candy cane、8 star、12 snowman、15 gift、16 reindeer、21 stocking、24 Christmas tree）。
- 2026-11-27 老師核准故事稿 v1。
- 2026-11-27 參考研究：`research/方塊風3D動畫參考分析.md`（20 個參考；冷藍戶外／暖橘室內、只讓發光物泛光、冰門不可像地獄門）。
- 2026-11-27 畫風 K 引擎 `engine/`：`voxel.js`（像素貼圖、方塊零件、InstancedMesh）、`chars.js`（Ken、水鈴、Santa、馴鹿、雪人，12 px 大頭 Q 版、臉部表情貼圖）、`props.js`（雪地、松樹、月亮、燈籠、木屋、壁爐火、聖誕襪、禮物、聖誕樹彩燈）、`kit.js`（GTAO＋Bloom＋暗角＋SMAA、夜空、極光、可重現下雪、卡拉 OK 字幕、單字卡、iconOf 模型圖示）、`render.py`（Playwright 逐格；4 秒 96 格約 38 秒）。
  樣張 `engine/sample.html?shot=lineup|forest|cabin` → `renders/sample-shot*-still-1.00.png`、動態測試 `renders/sample-shotforest.mp4`。
  踩坑：雪地太亮會讓 Bloom 把下半身洗白 → threshold 1.6、雪頂色 #e4ebf6，發光物件 emissive 要 ≥2；單字卡長字要自動縮字。
- 2026-11-27 老師核准畫風 K 樣張。
- 2026-11-27 配音：`engine/make_voices.py` → `audio/lines/L01–L24.wav`＋`manifest.json`（edge-tts −20%、WordBoundary 逐字時間；旁白 Jenny、Ken Guy +18Hz、水鈴 Ana、Santa／信 Christopher −12Hz；24 句共 115.9 秒）。
- 2026-11-27 第 1 幕試片 v1：`renders/s01-pilot-v1.mp4`（21.6 秒 1080p）＋`-720p.mp4`。
  架構：`timeline/sXX.json`（句子起點、配樂、音效）→ `scenes/sXX.js`（setup 回傳 frame／cards／title）→ `engine/film.html?scene=sXX[&nosub=1]`（卡拉 OK 依逐字時間、單字卡唸到該字才跳出）→ `engine/mix.py sXX`（公版 Jingle Bells 音樂盒程式合成、配樂 −18 dB、音效程式合成、ffmpeg ebur128 量測＋alimiter 到 −16 LUFS）→ `engine/render.py film.html --query scene=sXX --audio ../audio/mix/sXX.wav`（518 格約 4 分鐘）。
  踩坑：過肩鏡頭會穿進頭裡 → 讀信改第一人稱（該鏡頭藏 Ken 的 neck）；信紙背面要另做一片（DoubleSide 會鏡像）；兩人沿同一條線走會互相擋 → 並肩朝鏡頭走；校名牌被屋簷擋、字要自動縮。
- 2026-11-27 老師要求每句都有動作／插圖 → RDQ `rdq/RDQ-spec-christmas-shot-routing-20261127.md`（confirmed）：每句 2 鏡、說話句 6／11／23 用 Colab H3（先試 23，上限 10 單位）、每 2 幕交逐句抽格表。分類表 `script/逐句分鏡分類_v1.md`；姿勢查證 `research/動作姿勢查證_s01-s03.md`（第 8 句改成踩冰方塊、不踩肩膀）。
- 2026-11-27 第 1 幕 v2（每句 2 鏡）`renders/s01-v2.mp4`、第 2 幕 v1 `renders/s02-v1.mp4`；預覽 `renders/preview-s01-s02-720p.mp4`（39 秒）；逐句抽格表 `renders/review-s01-s02.jpg`（`engine/line_sheet.py`）。嘴型 3 段＝`engine/voice_env.py` 音量曲線＋`kit.js mouthAt()`。
  踩坑：背包太大會擋住手的動作 → 縮 0.7 放桌邊；道具靜止位置＝接觸那一刻的手（在 setup 先算該時間的姿勢再取手的位置）；舉手要舉靠鏡頭那一側，不然被頭擋住。
- 2026-11-27 H3 第 23 句試鏡素材：`h3/L23/first.png`、`last.png`（1536×864，`scenes/h3l23.js`）、`L23_guide.wav`（8 秒、話 0.5–7.1 秒）、`spec.json`（方塊造型鎖）。Colab 餘額 94.14 單位，尚未開機。
- 2026-11-27 老師回饋：單字卡擋臉；第 3 句只有配音聽不懂；map、candy cane 要慢動作特寫；其他句比照 → RDQ `rdq/RDQ-spec-christmas-phrase-visuals-20261127.md`（confirmed）：句子間留 2–3 秒慢動作（全片約 5 分鐘）、23 個關鍵字特寫、抽象片語 3D 動作＋2D 箭頭、H3 改為第 3、6、11、23 句（上限 10 單位）。片語表 `script/逐句片語畫面_v2.md`。
- 引擎新功能：timeline `beats`（慢動作）＋`spotlightFX`（壓暗、金框、標籤）＋`ding` 音效；單字卡在 film.html 先試算整段時間窗、挑不擋臉／不擋重點物件的角落（scene 提供 faces()、avoidObjs()、beatObj()）；同字卡片合併；`arrow2d`、`windLines`。第 1 幕加北極院子（NX=200）暴風雪漩渦、聖誕物品被吹走、小 Santa 從蠟封冒出；第 2 幕慢動作展示物件放在鏡頭前、依大小算距離、depthTest 關閉永遠在最上層。時間對應用 TA(t)（慢動作時演出定住）。
- 2026-11-27 Colab G4 開機兩次都 503 Service Unavailable（不扣單位，餘額 94.14），17:40 左右再試一次。
- 踩坑：Bash heredoc 寫含引號的 Python 會 EOF 失敗 → 改寫成 scratchpad 檔再執行；看門狗要等開機完成再開（先開會立刻回報機器不在）。
- 2026-11-27 老師核准第 1–2 幕新版（s01-v3、s02-v2）。
- 2026-11-27 第 3 幕 `scenes/s03.js`（冰門 DZ=-32，在校舍後 18 格；樓梯＝前一階＋門前兩格高柱；星星凹槽在門正面 DZ+1；紫光用 shader 金白中心＋紫色光束，不做旋渦）、第 4 幕 `scenes/s04.js`（隧道 70 圈方塊、instanceColor 換色、慢動作時速度 0.4；降落森林在 x=300、雪人轉身）。
  踩坑：冰門離校舍太近，鏡頭往後拉會跑進建築物裡（整片灰）；門內光太強會整片白、看不出紫色 → 光照 7、光束不透明度 0.05、顏色偏紫；隧道方塊 HDR 倍率太高會洗白；說話與手部近景的鏡頭要跟著頭／手的世界座標算。
- 2026-11-27 Colab G4 第 4 次也 503（17:45），餘額 94.14，未花費。
- 2026-11-27 第 3 幕 v2：behind the school 改右上角俯視小地圖；purple light 只框門內上半部光（lightMark）。預覽 `renders/preview-s03-s04-v2-720p.mp4`。
- 2026-11-27 KIE 只有 H3 圖片、沒有 H3 影片 → 老師同意說話鏡改 KIE Seedance 2.0 Mini 參考模式、上限 450 點。`engine/seedance_talk.py`（參考圖＝本機首幀＋角色一覽 sample-shotlineup；參考音＝配音前加 0.3 秒；generate_audio 開、成片換回原配音；帳本 `h3/kie_ledger.json`）。第 23 句 480p 試鏡 30.4 點（`h3/L23/seedance_480p_1.mp4`、換回原配音 `L23_seedance_480p_1_review.mp4`）：方塊造型、像素臉保住，Santa 鬍子裡的嘴有開合；畫面比首幀稍微拉近、兩邊小孩被切一點，小孩偶爾也張嘴。
- 2026-11-27 老師核准第 3、6、11、23 句 Seedance；RDQ `rdq/RDQ-spec-christmas-seedance-more-20261127.md`（confirmed）：再加 10 句動作鏡（12、13、15、17、18、19、20、21、22、24）當第 3 鏡、總上限 1400 點。候選表 `script/Seedance候選_v1.md`。
- 2026-11-27 說話 4 句 720p 完成（`h3/L03|L06|L11|L23/seedance_720p_1.mp4`），KIE 累計 336.0 點。已接進 timeline `clips`（s01 19.3、s02 20.1、s04 7.5；from＝鏡頭起點−句子起點＋0.3）。film.html 支援 `clips`（async renderFrame，video seek 後畫進 overlay；檔案不存在就用 3D 佔位）、`&clean=1`（首幀用，不畫疊字）、`&cam=x,y,z,lx,ly,lz`。
- 2026-11-27 第 5 幕 `scenes/s05.js`（深雪層 0.45、loud 聲波、deep 雙箭頭、everywhere 光圈、挖雪方塊、紅緞帶禮物）、第 6 幕 `scenes/s06.js`（主角松樹、馴鹿發抖記號、側面餵糖、馴鹿 deerWalk 帶路、cabinExterior）；共用 `engine/forest.js`。卡拉 OK 太長自動分兩行。
  踩坑：part() 的貼圖繪圖函式要用傳進來的 W、H 畫滿（只畫 16×16 其他是黑的）；大方塊雪層關陰影；餵食鏡頭要從兩人連線的側面拍。
- 動作鏡 480p（13、15、17、18）`engine/seedance_talk.py 480p act …`（首幀模式、不送聲音、鏡頭鎖定；首幀 `h3/<id>/act_first.png` 用 clean＋cam 截）。
- 2026-11-27 老師退件 3 處（第 13 句腳不見、走去木屋穿過樹、餵食看不懂）→ 規格卡 `rdq/RDQ-spec-christmas-s05s06-fixes-20261127.md`（confirmed，1C 2A 3C＋建議 1234）：
  - s05：deep 箭頭與 deep snow 慢動作時雪地剖面（`cutaway()`，雪層切成 4 塊＋雪層貼圖切面＋雪面虛線）；第 13 句 Seedance take 3 提示詞改「每一步整隻腳拔出雪面」。
  - s06 v3（舊版 `scenes/s06_v2_backup.js`）：水鈴轉身、背包甩到胸前拿糖（第 5 句放進她的背包）；餵食接觸點用二分搜尋算（馴鹿脖子角度＋水鈴站位，糖尾端剛好在嘴上，一格一格吃掉）；
    「a sweet treat」慢動作重播（TA() 在 28.9–31.5 演 23.8–24.84 的 0.4 倍）；小路 CatmullRom 繞開樹、腳印、兩人並排；走路先後面跟拍再側拍；L18 句子起點 22.8、整幕 39.0 秒。
    第 18 句 Seedance 改成餵食特寫（首幀 23.4 秒 clean，舊首幀在 `h3/L18/old/`），clip 23.4–25.6。
  - 新工具：`engine/check.py`（穿模／鏡頭在物件裡／臉被擋／contacts 間隙）、`engine/stills.py`（一次抽多張總表）。報告 `renders/check-report-v1.md`（第 1–6 幕）、`renders/check-report-s05s06-v2.md`。
  - 踩坑寫進 `tools/動畫共用踩坑規則.md` 第 20 類，11 份影片 skill 已同步短版。
  - KIE 累計 533.6 點（上限 1400）。
- 2026-11-27 晚：老師核准 720p → `h3/<id>/act_720p.mp4`（L13、L15、L17、L18；L15 只用前 5.4 秒，後面跳鏡）；第 18 句餵食提前 0.4 秒（OFFER 22.6），Seedance 23.0–26.0，走路配「and he takes them」。KIE 累計 746.8 點。
  第 2 幕跑出教室改成先往後退、走桌子旁走道、門洞正中一前一後；第 3 幕起點移出校舍、先排到台階前再直走、水鈴扶台階站位外移、跳下弧線加高、門開時冰台階沉進地面。檢查報告 `renders/check-report-s02s03-v2.md`。
  渲染：s01-v4、s02-v3、s03-v3、s04-v2、s05-v5、s06-v4；預覽 `renders/preview-s01-s06-v1-720p.mp4`（180 秒，−16.3 LUFS）；抽格表 review-s01-s02-v3、review-s03-s04-v2、review-s05-s06-v3。
- **下一步**：老師看第 1–6 幕預覽 → 第 7–8 幕（第 19–24 句）。
  L17 首幀已用新站位重截（14.6 秒，餵食同一側鏡頭；舊的在 `h3/L17/old/`），720p 會用新首幀重新生成。
- 影音不入庫。
