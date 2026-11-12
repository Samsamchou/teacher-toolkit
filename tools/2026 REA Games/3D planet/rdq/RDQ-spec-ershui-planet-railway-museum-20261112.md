---
rdq_version: 1
edition: chatgpt-app
task: 二水小行星逛街版新增虛構地點「二水鐵道博物館 museum」
domain: dev
date: 2026-11-12
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: subagent
---

# RDQ 需求規格：二水鐵道博物館（虛構地點）

## 一句話任務
在逛街版加一個二水沒有的虛構地點「二水鐵道博物館（Railway Museum）」，放在二水車站旁，全班分組、個人模式、Listen and Guess 都能出題。

## 已知
- 遊戲 `3D planet/godot-ershui-planet/`（OSM 真實路網、21 個以上地點、地標模型 `assets/models/bld_<id>.glb`）；地標作法＝Codex 參考圖 → Colab G4 Hunyuan3D-2 → `tools/shrink_glb_texture.py`（見 HANDOFF v4、`新地點小行星製作手冊.md`）。
- 二水車站＝集集線起點；車站附近有第七號官舍（鐵路宿舍）、公園火車頭。
- Listen and Guess 新版（10 地點、三種線索、口說新規則）正在預覽頻道等老師 iPad 試玩；博物館要改同一個遊戲。

## 已確認
- 1B：加到全班分組（押分）、個人模式（學號 12 題）、Listen and Guess（第 11 個地點：環境音、2 個無字圖示、默劇影片＋對準動作音效、口說規則同現行）。
- 2A：位置＝二水車站旁的舊鐵道空地，出站就看得到。
- 3A：外觀＝紅磚扇形車庫造型、門前一台蒸汽火車頭、屋頂「MUSEUM」字樣。

## 已採納建議
- ① 招牌英文「Railway Museum」、中文「二水鐵道博物館」；教師說明註明「虛構地點」。
- ② 新句子語音（Where's the museum? / I'm going to the museum. / It's on __ Road.）用現有 edge-tts 流程。
- ③ 上預覽前出檢查圖：地圖位置、角色走到博物館、外觀特寫（＋Listen 三種線索列）。
- ④ 先上預覽 → iPad 試 → 和 Listen and Guess 一起上正式站（只上傳一次）。

## 待確認假設
- 建築用 Colab Hunyuan3D-2（約 1 個 Colab 單位）；火車頭可沿用公園火車頭模型。
- Listen and Guess 加第 11 個地點後，每回合仍 10 題（從 11 個抽 10 個），題型 5／3／2 不變。
- Listen 博物館素材：環境音（KIE，約 25 點）、默劇（480p 8 秒，約 30 點）、音效（約 8 點）；合計約 65 點，重拍另計。
- 博物館默劇例：買票 → 安靜看展品、指著看 → 拍照（喀嚓聲）；環境音：導覽輕聲、腳步、蒸汽汽笛展示聲（無說話字句）。
- 全班分組／個人模式：博物館加入題組地點池，題目文字照現有句型；不改其他地點。
- 正式站成績沿用現有任務代號，不改 firestore.rules。

## 本次不納入
- 其他新地點、現有地點外觀、Free Time 版。

## 一段式需求規格
在 godot-ershui-planet 加虛構地點「二水鐵道博物館 Railway Museum」：位置在二水車站旁舊鐵道空地（不壓路、不擋路線、到達鏡頭不被擋），外觀紅磚扇形車庫＋門前蒸汽火車頭＋屋頂 MUSEUM（Codex 參考圖 → Colab Hunyuan3D-2 → 縮貼圖），招牌英中文＋教師說明註明虛構；加入全班分組與個人模式題組，補 edge-tts 語音；Listen and Guess 加為第 11 地點（環境音、2 圖示、默劇＋音效，每回合 10 題 5／3／2），口說規則照現行；出檢查圖（地圖位置、走到博物館、外觀特寫、Listen 三種線索）給老師看，整回合測試通過後上預覽 ershui-preview，老師 iPad 試過後與 Listen and Guess 一起上正式站。

## 驗收條件
- [ ] 檢查圖老師通過（位置、外觀、走路、到達鏡頭、Listen 三種線索）。
- [ ] 全班分組、個人模式、Listen and Guess 整回合測試通過；博物館題會出現。
- [ ] 預覽 iPad 試玩通過後，與 Listen and Guess 一起上正式站。
