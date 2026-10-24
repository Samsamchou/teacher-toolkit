---
rdq_version: 1
edition: claude-code
task: HWG7 U04 動作鏡頭用 Seedance、靜態用 Colab H3
domain: video
date: 2026-10-24
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 1
downstream: self
---

# RDQ 需求規格：HWG7 U04 混合生成（Seedance 2.0 Mini＋Colab H3）

## 一句話任務
HWG7 U04 的 24 鏡中，8 個動作鏡頭用 KIE AI 的 Seedance 2.0 Mini 生成，16 個靜態鏡頭用 Colab H3 生成，最後合成一支片。

## 已確認
- 動作鏡頭（Seedance）：**S01、S03、S09、S11、S14a、S16、S19、S23**；靜態鏡頭（Colab H3）：**S02、S04–S08、S10、S12–S15、S17、S18、S20–S22**（1A）。
- 有台詞的動作鏡頭只有 **S03、S09**：先用 S03 試做「參考模式（首幀＋定妝照當參考圖、英文配音當參考音訊）」與「首幀模式（不傳音訊）」，比較後再決定（2C）。
- 旁白不傳給 Seedance，後製疊上（3A）。
- 成片配音：H3 靜態鏡頭用核准的英文配音（`voices_final/`）。**Seedance 動作鏡頭改用 Seedance 參考模式自己生成的聲音**（老師 2026-10-24 看 S03 試片後選 A，取代原本的 4A）。
- 老師說「先這樣，直接開始」：採用全部建議選項。

## 已採納建議
- ① 先試做 S03 再整批。② 720p。③ Seedance 每鏡最多重抽 2 次，總花費上限約 **1,500 credits**，超過先問。④ 參考圖同時給首幀與角色定妝照。⑤ Colab 靜態鏡頭照舊提醒 H3 授權地區（老師已評估同意）。

## 待確認假設
- 配音短於 2 秒（Seedance 下限）時補靜音到 2.5 秒。
- Seedance 輸出 1280×720，合成時與 H3（1344×768）一起統一放大到 1080p。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\HWG 7 U04 FILM** 中，用 KIE AI 的 **bytedance/seedance-2-mini**（720p、16:9）生成動作鏡頭 **S01、S03、S09、S11、S14a、S16、S19、S23**，先以 **S03** 試做參考模式與首幀模式並給老師比較後再整批，參考圖用 `frames/<鏡>.png` 與 `chars/<角色>.png`，有台詞的鏡頭（S03、S09）視試片結果以 `voices_final/<鏡>.wav`（補到至少 2 秒）作為參考音訊，旁白不傳，花費上限約 **1,500 credits**、每鏡最多重抽 2 次；其餘 16 個靜態鏡頭用 Colab（`--name u04`）的 MiniMax H3 依 `scripts/build_specs.py` 生成；H3 鏡頭用核准的英文配音，Seedance 動作鏡頭（參考模式）保留 Seedance 自己生成的聲音，旁白一律後製疊上。

## 驗收條件
- [x] S03 兩種模式試片給老師看過，選定模式：參考模式＋Seedance 原聲（A）。
- [x] 8 個 Seedance 鏡與 16 個 H3 鏡都生成完畢，接觸表給老師審（關卡 2，2026-10-24 通過）。
- [x] Seedance 花費 500.2 credits（上限約 1,500）。
- [x] 成片老師驗收通過（2026-10-24）。
