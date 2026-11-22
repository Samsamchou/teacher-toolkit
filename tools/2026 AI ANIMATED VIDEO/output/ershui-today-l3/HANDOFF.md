# 二水三景點：跟著探索隊去看看（三年級〈二水的現在〉第3節影片）交接

- 規格：`tools/localcoursesErshui/rdq/RDQ-spec-ershui-today-l3-v2-video-materials-20261122.md`（confirmed）
- 文字稿正本：Google 文件〈二水的現在 第3節｜二水三景點影片文字稿（第②b 關）〉
  https://docs.google.com/document/d/1AqPVDk1Faqdtxs337GylwET0edyQgiF0WFDAHcGugys/edit （之後只改這份）
- 台詞資料：在地課程 `10_第3節v2教案與教材_20261122/_work/video_script.py`（build_narration 直接 import）
- 教師第②b 關回覆（2026-11-22）：1b 結尾加兩句總結＋6 字圖字卡帶念（男孩女孩輪流）；2a 花旗木做 3D-B（Colab 約 6–8 單位）；3b 第 1 段加小行星空拍 3D-A；4a 字幕說話者用「男孩／女孩」。
- 第 6 個英文字 **bike path** 是我補的（原本只有 5 字），老師可換。

## 目前進度（2026-11-22）
1. ✅ 試配音 `narration/`：中文 edge-tts 曉臻／雲哲 -10%；英文女孩 en-US-AnaNeural -10%、男孩 en-US-ChristopherNeural -15% +50Hz（依共用踩坑 10.6 老師選過的男孩聲）。全長 223.0 秒（11/22 晚改句後）。試聽 `narration/旁白試聽-二水三景點-v1.mp3`、`英文單字帶念試聽-v1.mp3`。
2. ✅ 畫風樣張（待老師確認）：`art/bg/B03.png`、`B08.png`（Codex CLI），疊角色 → `art/samples/`。
3. ⏳ 老師核准畫風後：其餘 10 張背景（B01、B02、B04–B07、B09–B12）→ 逐張原尺寸檢查 → 引擎（從 jiji-line/2d-v2-extended/engine 複製）→ 段 1 試片 → 3D-A Godot 空拍、3D-B Colab 花旗木小模型（先交特寫檢查圖、開機前報單位）→ 全片 → qa_units。

## 2026-11-22 晚：老師退件兩張樣張（已改）
- 老師：二八水水公園火車頭現在**露天展示、沒有棚架**；花旗木圖要重畫（給了 Google 地點與照片）。
- 依彰化旅遊資訊網〈二八水水公園〉2024-05 照片、〈二水花旗木〉2025 照片（`art/ref/chcg_*`）重生 B03、B08；B03 太像照片，再以 B08 為畫風參考重畫成 `bg/B03s.png`。舊樣張移到 `art/_history/samples-v1-rejected-20261122/`。
- 縣府頁面更正事實：花旗木是 152 縣道源泉段、二水自行車道旁的一排行道樹，源泉車站往東到源泉派出所前約 500 公尺、60 餘株，緊靠集集線（近 S 型彎），自行車道有綠色欄杆隔開鐵道。第 19、20、24、28 句與 Kahoot Q6、Q8 已改，Google 文件同步改，重新配音 223.0 秒。
- 老師 2a（bike path）、3a（聲音可以）。

## 2026-11-22 傍晚：12 張背景＋試片
- 老師 1A 2B：畫風通過；B03 用寫實版（`bg/B03.png`；`B03s` 畫風版保留不用）。
- 其餘 10 張（B01、B02、B04–B07、B09–B12）＋B08g（綠葉版，第 23 句用）以縣府／台灣設計研究院照片當參考圖生成（`art/ref/`），逐張檢查人物與招牌留白。
- 引擎 `engine/ershui.js`＋`shots.js`＋`player.html`（Comic Relief 由 `engine/fonts/` 載入）；`narration/mix_audio.py`（叮、啵、警示音）。
- 渲染在 C 槽 `C:/Users/User/AppData/Local/Temp/ershui-l3-render/`（同結構：engine、art/bg、art/chars、narration）。
- 試片 `renders/二水三景點-試片-段1到3-720p.mp4`（0–53.2 秒）已交老師；全片逐句總表 `qa/contact-all-lines-v1.jpg`。
- 3D 尚未做：第 3 句 3D-A（小行星空拍，本機 Godot）、第 19–20 句 3D-B（Colab G4，約 6–8 單位）；目前用程式 2.5D 位置圖暫代。

## 2026-11-22 晚：3D 完成、全片 v1
- 3D-A：二水小行星 Godot（C 槽副本 `ershui-planet-film`，加 FILMCAM 模式、拿掉虛構鐵道博物館；改法存 `src/godot_film_game.gd`），172 格 → 第 3 句後段。
- 3D-B：`src/b3d_cassia.py`（程式小模型），Colab A100（G4 沒空、H100 無權限），CUDA，每格約 8 秒；實際 7.68 單位。第 19 句俯瞰、第 20 句降到自行車道。踩坑：A100 沒 RT 核心用 CUDA；Freestyle／反殼描邊都不用；`colab sessions` 才是看機器、`grep -F`；不要用 `&` 背景跑腳本（會多份同時跑）。
- 全片 v1：`renders/二水三景點-全片-v1.mp4`（1080p，3:43）＋720p；逐句總表 `qa/units-contact-二水三景點-全片-v1.jpg`。✅ 11/22 老師定案（全片 v1）；第③關教材一併驗收通過。

## 指令
```
cd narration && python -I build_narration.py          # 全部重配（edge-tts）
cd art && python -I gen_art.py B01 B02 ...           # Codex CLI 生圖（C:\Users\User\ershui-l3-work\gen 暫存，同時 3 張）
cd art && python -I compose_samples.py               # 樣張：背景＋核准透明角色
```

## 踩坑（本片）
- edge-tts 遇到「整天」固定回 NoAudioReceived → 台詞改「從早到晚」（已寫入 `tools/動畫共用踩坑規則.md` 10.5）。
- 二八水水公園火車頭外觀：Commons 2014 照片是黑色鋼架棚＋彩色柵欄；公園整建後是否仍有棚架未查到新照片，請老師確認。
- B03 小火車頭的車牌有 AI 亂畫的數字，正式畫面用程式蓋掉再寫「345」。
- 集集線延長版渲染經驗：G 槽直接開 player.html 會逾時，渲染要複製到 C 槽暫存。
