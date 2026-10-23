# HANDOFF — HWG7 U04 短片（A Day with the Elves）

最後更新：2026-10-23 收工

## 目前狀態

| 步驟 | 狀態 | 檔案 |
|---|---|---|
| 劇本 v1（24 鏡，約 2 分鐘，全英文） | ✅ 老師核准 | `劇本_v1.md`、`shots.json`（S14 拆出旁白特寫 S14a） |
| 6 位角色動漫定妝照（Codex CLI） | ✅ 老師核准 | `chars/*.png`、`chars/_sheet.jpg`、`prompts/*.txt` |
| 5 張場景母版（Codex CLI） | ✅ | `masters/*.png` |
| 24 張首幀（Codex CLI，自審重做 S09／S14a／S20／S22） | ✅ 老師核准（關卡 1） | `frames/*.png`、`frames/_sheet.jpg`、`frames/*.prompt.txt` |
| 22 句英文配音（VoxCPM2 on Colab，0.8 倍速） | ✅ 老師核准 | `voices_final/*.wav`（H3 用這個）、`voices_final/_all_lines.mp3` |
| H3 影片 24 鏡 | ⏭ 明天開始 | `h3/<鏡>/` |
| 旁白、字幕、配樂、片尾、合成 | ⏳ | |

Colab：G4 `u04` 已關機。餘額 369.35 單元（本片到目前約用 4.75 單元：完整安裝＋三輪配音）。

## 明天接著做（H3）

在本資料夾執行（PowerShell 先 `$env:PYTHONUTF8=1`）：

1. `colab usage` 查餘額；提醒 H3 授權地區（G4 會分到美國／荷蘭，老師已評估同意）。
2. `python scripts/build_specs.py` → 產生 `h3/<鏡>/spec.json`、`guide.wav`（台詞在 0.6 秒開口，沒台詞給靜音）、`first.png`（1344×768）。
3. 開機只裝 H3 就夠（配音已完成）：
   `python ../shanshiba-workflow-32gvram-64gram/cloud/colab_h3.py --name u04 start --h3-only`（約 4 分鐘）
4. `python ../shanshiba-workflow-32gvram-64gram/cloud/colab_h3.py --name u04 batch h3/S01/spec.json h3/S02/spec.json …`（24 個 spec；成品在各 `h3/<鏡>/clip.mp4`）。
   repo 規則：先跑最難的一鏡試片（建議 S23 五人飛雪橇或 S03 兩人）再整批。
5. 抽格做接觸表給老師看（關卡 2）。重抽：在 `seeds.json` 寫 `{"S05": 新數字}`，刪 `h3/S05/clip.mp4`（本機與 VM），重跑 `build_specs.py S05` 和 `batch`。
6. 合成：旁白 `voices_final/<鏡>_narr.wav` 疊在 S01／S11／S14a／S16；英文字幕（角色名＋台詞）；S16 加「The next day…」字卡；配樂；片尾（AI 生成標示）。

## 這次的決定與設定

- 生圖一律 Codex CLI（老師 2026-10-23 指定），不用 repo 的 Qwen-Image。
- 台詞用固定英文配音（不是 H3 自己念）：`voices.json` 是聲線、語氣、後製設定；`scripts/vm_voices.py`（VM 上跑）＋`scripts/colab_voices.py`（本機驅動）＋`scripts/post_voices.py`（0.8 倍速與音效）。
- 角色對應（沿用 HWG5 核准母版）：Abu＝白色機器人、Teddy＝黑髮鍋蓋頭男孩；Amber 參考課本截圖；精靈 Joy、Alan（課本叫 Leo，劇本用 Alan）。
- 配音後製：全部 `rubberband tempo=0.8`；Amber 降 4 半音、Santa 降 3 半音＋胸腔、Abu 輕微 flanger＋短回音。量到的音高：Amber 402 Hz、Joy 511 Hz、Santa 153 Hz。

## 踩坑

| 問題 | 做法 |
|---|---|
| VoxCPM2 逐句加語氣描述會把 Amber 拉高到跟 Joy 一樣（約 500 Hz） | Amber、Santa 不加逐句語氣（`line_control: false`），Amber 後製降 4 半音（formant 保留） |
| Santa 聲線太高 | `ref_pick` 試 6 個 seed 取最低（102 Hz），再降 3 半音 |
| Joy「squeaky, sparkly」＋後製升調 → 老師聽起來像機器人 | 描述改「自然、溫暖的 7 歲小女孩」，拿掉升調；舊版留在 `voices_v2_joy/` |
| 描述裡寫「giggly」→ 模型自己加「Ooh,」 | S05 語氣改「saying exactly the sentence with no extra words」，takes 5 |
| 聽寫把 seven thirty 寫成 7.30，比對分數變低 | 看 `heard` 原文判斷，數字寫法不算念錯 |
| Codex 不能寫到 G: | `scripts/gen_images.py` 在暫存資料夾生成再複製回來 |
| 同時有別的工作階段用 Colab | 本片 VM 一律用 `--name u04`，不用預設 `h3` |
