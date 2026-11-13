# What if you were Ken in Ershui?（Free Time 版）｜交接

照 skill `whatif-situation-video`（範本 `output/whatif-ken-ershui/`）。規格卡 `rdq/RDQ-spec-whatif-ken-freetime-20261113.md`（confirmed）。

## 目前進度（2026-11-13）
- 路線 A 11 題（`godot-ershui-freetime/data/freetime_ken_a.json`），Ken 第一人稱；爸媽輪流問；默劇 6 秒＋音效（720p 原檔 `3D planet/資料/freetime/clues/video/raw/`，用遊戲最後採用的版本）；加時間句；3D＝Ken 在真實地點做活動。
- 故事稿 v1 老師核准（11/13）。樣張 `style-sample/`；老師 11/13 挑：**媽媽 A＋爸爸 B、媽媽聲音 A（Aria）＋爸爸聲音 A（Andrew）**（film.js PAR、voices.json 已改；配音 40 句已生成）。11 張串場插圖 `assets/link_s01–s11.png`（Codex，手部已查）。結尾一週回顧＝11 個默劇小格（f0036）。全片 2D 已排好約 6:13，只差 3D。默劇：`mime/<act>.mp4`（720p 原檔）＋`.ogg` 音效 → `renders/mime/<act>/f0001–0145.jpg`。

## 下一步
1. **11/14 老師已同意開 Colab（約 2–3 單位）**：第 1 段試片（Monday 讀英文）的 3D 鏡——Ken 房間書桌＋Mixamo writing（先在 Colab 測 FBX 匯入套到 ken_openhand、雙臂方向、手部特寫）→ `python src/render.py preview` 出第 1 段給老師看。
2. 3D：先查小行星室內（`godot-ershui-freetime/data/interior/*.tscn` 是 Godot 場景，Blender 要另外組）與 Mixamo FBX（`assets/anims/mx_*.fbx`）能不能在 Blender 直接套到 ken_openhand；開 Colab 前報單位＋當天用量（11/13 已用約 34，3D 明天以後再渲）。
