---
rdq_version: 1
edition: chatgpt-app
task: Free Time 兩人一組「看影片」默劇加關鍵音效
domain: video
date: 2026-11-12
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: self
---

# RDQ 需求規格：Free Time 默劇影片加關鍵音效

## 一句話任務
Free Time 兩人一組 11 支「看影片」默劇線索，每支加 1–2 個最關鍵的音效（比 Listen and Guess 少），檢查圖通過後直接上正式站。

## 已知
- 遊戲 `godot-ershui-freetime`：線索 `assets/clues/video/<活動>.ogv`（11 支、在遊戲檔裡，Theora），每回合 3 題「看影片」；另有「看動畫」（程式動畫）2 題、「聽聲音」3 題。
- Free Time 已在正式站（11/12 上線）；live＝staging `C:/Users/User/AppData/Local/Temp/ershui-4sets-stage`。
- 老師規則（踩坑第六節）：不好呈現的，默劇加音效；畫面只演動作，看不見的交給聲音。

## 已確認
- 1A：只有 11 支「看影片」默劇加音效；「看動畫」程式動畫不動。
- 2B：音效用 KIE 重新生成。
- 3B：檢查圖老師通過後直接上正式站（不先上預覽、不等 iPad 試）。

## 已採納建議
- ① 每支只放 1–2 個關鍵聲，對準最關鍵的動作；檢查圖標出秒數。
- ② 不放任何說話聲。
- ③ 音量比「聽聲音」線索小（約 -20 LUFS）；兩人錄音時影片靜音。
- ④ 改完用 15 fps（模擬 iPad）再跑整回合，揭曉仍 ≤ 25 秒、不能卡。

## 待確認假設
- 費用：11 支 × 1–2 個 × 約 2.5 點 ≈ 30–55 點。
- 關鍵聲例：basketball＝運球／進籃、baseball＝球棒擊球、bike＝腳踏車鈴、camping＝營火劈啪、jogging＝跑步腳步、music＝耳機漏音的節奏（無歌詞）、games＝按鍵／過關音、internet＝鍵盤打字、english＝翻書＋鉛筆寫字、tv＝遙控器嗶＋電視聲（無人聲）、recorder＝直笛幾個音（實際活動依 data 為準）。
- 音效對準動作要從影片抽格找秒數；影片畫面不重拍。
- 上正式站前照慣例比對 live 發布時間＝staging；四條路線 A／B 整回合測試全過才部署。

## 本次不納入
- 「看動畫」程式動畫、「聽聲音」線索、題目、口說規則、影片重拍。
- Listen and Guess（另一份規格）。

## 一段式需求規格
為 godot-ershui-freetime 的 11 支「看影片」默劇線索各生成 1–2 個 KIE 關鍵音效（無說話聲、約 -20 LUFS），從抽格找出關鍵動作秒數並對準，讓影片線索播放時有聲（錄音時靜音）；出「11 支 × 音效秒數」檢查圖給老師看聽；四條路線 × A／B 一般與 15 fps 整回合測試通過後，老師通過檢查圖即重新匯出並經 staging 部署正式站（先比對 live＝staging），讀回驗證。

## 驗收條件
- [ ] 11 支影片音效對準關鍵動作、無說話聲（檢查圖＋老師看聽通過）。
- [ ] 四條路線 A／B 一般＋15 fps 整回合全過，揭曉 ≤ 25 秒。
- [ ] 正式站讀回：遊戲檔與本機一致、其他任務仍 200。
