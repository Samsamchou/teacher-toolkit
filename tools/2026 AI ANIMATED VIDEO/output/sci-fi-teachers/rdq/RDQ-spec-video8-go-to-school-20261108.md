# RDQ 規格卡｜影片 8〈I go to school by bus.〉（confirmed）

- 日期：2026-11-08
- 狀態：**confirmed**（2026-11-08 老師 1A 2A 3B 4B、建議①–⑤全採；「照這份開始」；Tripo 點數已購買；Colab 沒有每日上限）
- 出處：翰林 HWG7（六年級上）U02 Listen, Say, and Number「Transportation」＋ p.29 文法表（老師截圖）；老師 Canva〈HWG7 u02 He goes to school 文法〉9 頁
- 程式起點：複製 `video7-countries/`（十位朋友、各自聲音、拍音節、board_v7）；情境動畫用畫風 H（`tools/2026 Thanksgiving/classroom-tabletop/` 引擎）

## 目標

學生看完能：
1. 唸出 11 個單字（by bike／bus／car／metro·MRT／scooter／taxi／train、on foot、school＋補充 by boat、by plane），拍出音節。
2. 分清 by 和 on foot；中文「騎」（bike、scooter）和「搭」（其他）。
3. 說 I go to school ___.，並用 He／She goes to school ___. 介紹別人（He／She／人名 → goes）。

## 段落（約 10–12 分鐘）

1. 開場：Mr. Chou 本人照片（Canva 第 2 頁，車＋老師，無字）— Nova：This is Mr. Chou. He goes to school by car.
2. 11 個單字：Codex 交通工具圖卡（無字）＋ Repeat after me 兩輪；by／on 字卡差別、騎／搭
3. 拍音節：例 met-ro、M-R-T、scoo-ter、tax-i（音節照字典核對）
4. 文法：I → go；He／She／人名 → goes（3B：不提 We／They）；go → goes 變身動畫（es 飛入發光）、唸法 /goʊ/ vs /goʊz/
5. I go to school ___.：十位朋友各自說（照片卡換成「朋友＋交通工具」新圖），學生跟唸；Now you!
6. He／She goes to school ___.：老師指著朋友介紹（男藍 He、女粉 She）
7. **情境動畫（畫風 H 桌上微縮，約 2.5–3 分鐘）**：桌上小鎮的早晨，朋友們搭不同交通工具到紙箱學校；每段朋友說 I go…，老師旁白 He／She goes…
8. Game time：看情境動畫猜交通工具（4 題）＋聽句子選 go／goes（4 題）
9. 複習＋片尾

## 待確認假設（請特別看）

- **情境動畫的人物做法（成本關鍵）**：建議朋友用**紙片立牌**（Codex 全身圖貼在卡紙上，桌上微縮風很搭，0 元）；交通工具用 Tripo 3D。
  若要朋友也做成 3D 會動的人偶，10 位約 550 點以上，暫不建議。
- **Tripo 點數**：沿用 bus、school、stop 三個舊模型；新做 bike、car、metro、scooter、taxi、train、boat、plane 8 個 × 約 55 點 ≈ 440 點；老師 2026-11-08 已購買點數。
- **Colab 單位**：情境動畫 2.5–3 分鐘約 30–35 單位；老師 2026-11-08：Colab 沒有每日上限。
- 開場用 Canva 第 2 頁老師照片（我從 Canva 匯出，你已同意用本人照片）。配音不模仿你的聲音，由 Nova 介紹。
- 名人（藝人、運動員、動漫角色）不放進影片。
- 朋友的國籍、聲音沿用影片 7；每位朋友分配一種交通工具（10 位配 10 種，on foot 也算一種）。

## 限制與規則

- 語速 0.8×；Repeat after me.；AI 圖不能有字；生圖用 Codex（0 元）。
- 2D 部分本機渲染（一律 `--segdir`）；Blender 只在 Colab。每關先給老師看；影音不入庫。

## 進度

- 2026-11-08：資料夾 `video8-gotoschool/`（複製影片 7 程式、國旗、朋友圖）；腳本 `script_v1.py`（178 筆，推估 11.5 分鐘，實際約 12 分鐘）。
  Google 文件腳本：1afoYC7gyvSXW2hhvsMuXqTBsQU3TYoeOvyG4FjKycgc。
- 2026-11-08 晚：老師「腳本通過」。配音 v1 10:46（`voice_v1.mp3` 已傳；whisper 102 句，24 句不一致多為同音，待聽：Lily 名字、Cosmo By plane、Go. Goes.）。
  插圖 22 張（`gen_art8.py` Codex 0 元＋Canva 匯出老師照片 `art/photo-chou.png`）→ `art-review-v1.jpg` 已傳。
- 2026-11-08 晚：老師「都通過」（配音＋插圖）。桌上微縮：Codex 參考圖（`tabletop/gen_refs.py`）→ Tripo Studio 8 個交通工具（440 點，剩 700；
  帳本 `tabletop/tripo-ledger.json`；Chrome 下載卡 .tmp → `grab_glb.py` 檢查 glTF 檔頭直接收）；朋友紙片立牌（去背全身圖）。
  場景 `tabletop/src/scenes8.py`（星狀十條路通到紙箱學校；騎乘類立牌跟著走、車廂類跳進去再跳出來）、`colab_run8.py`。
  踩坑：Tripo 首頁生成的腳踏車 190 萬面（工作區生成約 2.8 萬）→ Blender Decimate；模型車頭方向各不同 → `src/yaw.json`（LINEUP 俯視檢查）；
  鏡頭側邊的房子／別台車會擋 → 依角度藏起來。Colab 測試約 7 單位。2D 白板 `ride_board.py`（board_v8）＋ render_v1.py 情境段全螢幕。
  縮圖總表 `tabletop/tabletop-review-v1.jpg`、`renders/stills-sheet-v1.jpg` 已傳。
- 2026-11-08 深夜：老師「都通過」（縮圖）。試片 A（6:15–7:35，`renders/video8-pilotA-v1-720p.mp4`）已傳，等回饋。
  桌上微縮正式渲染 `colab_run8.py final "OPEN all" … "END all"`（22:03 開始）**中途斷線**：Colab 工作階段消失、`colab exec` 卡住，
  沒有下載任何圖（`tabletop/renders/` 不存在）；11/09 00:50 手動結束本機指令，Colab 已確認關閉。
  **下一步**：重跑正式渲染（約 1.5 小時；建議分 2–3 批跑，每批下載後再跑下一批，避免一次斷線全沒）→ 合成試片 B（情境段約 454.7–555 秒）→ 老師看 A、B → 全片。
- 2026-11-09 早：`colab_run8.py` 改成一段一段跑、跑完就下載（已完成段落自動跳過）。OPEN、Mia 15 秒/格，太慢；老師「這段跑完就先停」。
  根因：bike、bus 各 194 萬面，Decimate 每格重算＋每格重建場景 → `src/predecimate.py` 預先簡化（原檔 `props-orig/`）＋`use_persistent_data` → **1.6 秒/格**，畫面逐像素幾乎相同。
  踩坑已記到 skill `3d-teacher-lesson-video/references/pitfalls.md` 最後一節與記憶 `colab-tabletop-render-efficiency`。
- 2026-11-09 下午：老師看試片 B 回饋「不能倒車、不能站在車上」→ 修正規格 `rdq/RDQ-spec-video8-tabletop-logic-fix-20261109.md`，桌上微縮重渲。
  老師「通過，渲染全片」→ 全片 v1 `renders/video8-v1.mp4`（19,634 格、10:54；預覽 `video8-v1-720p-small.mp4` 已傳），等老師說「定案」。

## 驗收

規格卡 → 腳本（Google 文件）→ 配音試聽 → 插圖總表 → Tripo 報價與 3D 道具 → 情境動畫縮圖總表 → 試片 → 全片 v1 → 老師說「定案」。
