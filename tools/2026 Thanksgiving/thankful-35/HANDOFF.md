# thankful-35 交接（2026-11-03 收工）

五年級版句型鷹架的 35 句感謝句（7 個對象 × 5 句原因），每句一段程式動畫。網頁播放器和 MP4 都已完成，等老師看完回饋。

## 怎麼開
- 網頁：在此資料夾執行 `python -m http.server 8735`，再開 http://localhost:8735/index.html。
  - 上方可選對象和句號，也可勾「自動下一句」或開全螢幕。
  - 鍵盤：← → 換句，空白鍵重播，F 全螢幕。
- 影片：`renders/thankful_all.mp4`（1080p，6:37，82 MB）、`renders/thankful_all_720p.mp4`（27 MB）、`renders/thankful_mom.mp4`（只有媽媽 5 句）。影片不入庫。

## 結構
- `sentences.json`：35 句和中文。對象一律用表格第一個選項：my mom、my grandma、my teacher、my friends、my dog、my school、my family。
- `scripts/make_voices.py`：用 edge-tts `en-US-AnaNeural` -20% 產生 `audio/*.mp3` 和 `data.js`（含逐字時間）。
- `scripts/make_sfx.py`：用程式合成 `sfx/*.wav`，沒有版權問題。
- `engine.js`：共用繪圖引擎。
  - 人物：`drawPerson`，可用的角色有 kid、mom、dad、sister、grandma、teacher、mia、leo。
  - 手臂：`reachL/reachR` 讓兩節手臂伸到世界座標；`itemL/R` 是拿在手上的道具，`itemAngL/R` 控制道具角度。
  - 姿勢與層次：`sit` 是坐姿，`armFrontL/R` 讓手臂畫在頭的前面。
  - 其他：drawDog、drawSchool、PROP 道具、FX 特效、BG 背景。
- `scenes_<group>.js`：每組 5 個場景，加上 `TARGETS.<group>`（開場時跳出來的對象）。家人、朋友、狗、學校、老師、奶奶這 6 組由 6 個小幫手平行製作，每個檔案自帶加前綴的 helper。
- `index.html`：播放器。
  - 句子的第一步是共用開場，對象跳出來。
  - 念到 "because" 時轉場到原因場景。
  - 場景以地面 y=790 設計，`zoom()` 放大 1.3 倍。
  - 字幕：英文大字，前半句黃色、because 後藍色的卡拉 OK，下方附中文。字幕已依老師要求上移 60 px。
- 檢查與匯出：
  - `scripts/qa_sheet.py [keys]`：每句抽 6 格。
  - `scripts/frame.py key:u`：抽 800×450 大圖。
  - `scripts/export_mp4.py [group]`：匯出 MP4。

## 老師的規則（11/03 回饋）
- 動作要合邏輯：鍋鏟要伸進鍋裡、擁抱的手不擋臉、坐姿要小腿從座墊前緣垂下。
- 交出前要抽大圖逐格檢查。
- 已寫進記憶 `code-animation-logical-poses`。

## 11/04 老師驗收 ✅（v4）
- 修正：
  - 三句擁抱（mom_2、grandma_3、family_1）改成側面面對面環抱，使用 engine.js 的 `drawHugPair`。
  - teacher_1 改成 turkey、pie 兩張圖：粉筆字逐字母出現，老師念、孩子跟讀，單字音檔由 `scripts/make_word_voices.py` 產生。
  - family_2 孩子改側面騎車，雙腳踩兩邊踏板，座墊在後輪上方。
- 新增引擎功能：
  - `drawSide`：側面人物。
  - `sideShoulder`：算出側面人物肩膀的世界座標，手臂一定從肩膀長出。
  - `drawElbowArm`、`drawWrapArm`：手臂畫法。
- 規格卡：`../rdq/RDQ-spec-thankful35-fixes-20261104.md`、`../rdq/RDQ-spec-thankful35-fixes2-20261104.md`。
- 影片：`renders/thankful_all.mp4`（6:39）、`renders/thankful_all_720p.mp4`。

## 待老師看的地方（11/03 列，部分已修）
- 家人組爸爸頭頂接近畫面上緣。
- 吃飯時筷子或湯匙到嘴邊，會短暫碰到下巴。
- 腳踏車的孩子是正面畫法，腳沒有真的踩踏板。
- 老師講故事那句的泡泡在大螢幕上偏小。
