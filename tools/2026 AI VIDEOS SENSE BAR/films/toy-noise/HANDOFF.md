# The Noisy Toy Pig（oy／oi，六年級，B4 phonics-story-video）交接

2026-11-11。規格卡 `rdq/RDQ-spec-toy-noise-20261111.md`（confirmed）；劇本 `劇本_v1.md`；分鏡 `shots.json`。

## 已完成
- 角色（老師選）：男孩 v1、媽媽 v2、小豬撲滿 v1 → `chars/boy.png`、`mom.png`、`pig.png`；場景 `masters/room.png`
- 首幀 `frames/S01–S06.png`（S04 重畫成只有小豬，舊版 `frames/old/`）
- Seedance 720p：S03 用 `first_2`，其餘 `first_1`；KIE **330 點**（上限 550，`seedance/ledger.json`）
- Colab：配音 narC（沿用 Poe 的 `ref_narC.wav`）7 句＋12 單字、配樂 s7；2.91 單位（第一次 G4 Service Unavailable，自動重試第 1 次成功）
- v1 成片 `final/The-Noisy-Toy-Pig-English.mp4`、`-Listening.mp4`（＋720p），3:29；抽格 `final/_qa_sheet.jpg`

## v2 修正（11/11，規格卡 `rdq/RDQ-spec-toy-noise-v2-fixes-20261111.md`）
- S06 字幕移到上方（`SUB_TOP = {"S06"}`）：牡蠣不再被擋
- S03 重畫首幀（媽媽站近中間、全身入鏡、下方淨空）＋ Seedance 鏡頭固定重拍 → `seedance/S03/first_3.mp4`（57.4 點；KIE 累計 **387.4**）
- 只重渲 S03、S06、story 段；抽格 `final/_qa_sheet_v2.jpg`

## ✅ 2026-11-11 老師驗收通過（v2）
- 定案檔 `final/The-Noisy-Toy-Pig-English.mp4`、`-Listening.mp4`（＋720p），3:29
- 之後要改：`python scripts/build_film.py render <段落前綴>` 只重做那段
