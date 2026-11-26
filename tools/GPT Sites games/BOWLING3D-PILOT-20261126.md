# Bowling 3D 試片 / Bowling 3D pilot（2026-11-26）

規格：`rdq/RDQ-spec-basketball-bowling-spectacle-20261126.md`（已確認）。本檔記錄 Bowling 試片的做法、驗證與未完成事項。**尚未接進正式遊戲，尚未部署。**

## 怎麼看試片 / How to view

- 執行 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/bowling3d-preview.ps1`，開啟 <http://127.0.0.1:5221/bowling3d-pilot.html>。
- 左邊選球瓶配置、這一球要倒幾瓶、瞄準區、球與主題，按 **ROLL!**；「Play demo reel」連播六球（+7、補中、兩次全倒、洗溝、第三次全倒）。
- 試片頁只在本機預覽存在，不會進正式建置（`vite build` 只打包 `index.html`）。

## 做法 / How it works

| 檔案 | 用途 |
|---|---|
| `src/bowling3d/physics.mjs` | Rapier 物理：球道、溝、球瓶（凸包）、球；錄下每一格位置 |
| `src/bowling3d/planner.mjs` | 依遊戲規則已決定的瓶數，找一球真實物理結果：查表 → 隨機搜尋 → 固定／輕推少數球瓶（保證瓶數相同） |
| `src/bowling3d/shot-table.json` | 十瓶與五瓶滿架、各種瓶數的入射參數（`scripts/build-bowling3d-shots.mjs` 產生） |
| `src/bowling3d/plan-worker.js`、`plan-client.js` | 物理搜尋放在 Web Worker，不卡畫面 |
| `src/bowling3d/stage.js`、`textures.js`、`fx.js` | Three.js 場景、程式繪製貼圖、粒子／彩紙／衝擊波 |
| `src/bowling3d/director.js` | 導播：蓄力、跟球鏡頭、撞擊定格與震動、慢動作重播、慶祝 |
| `src/bowling3d/audio3d.js` | 每次球瓶碰撞各自發聲；目前是合成音，之後換成真實錄音 |
| `src/bowling3d/Bowling3DPilot.jsx`、`pilot.css` | 試片頁 |

分數不受物理影響：瓶數仍由 `bowling-model.mjs` 決定，3D 只負責演出同樣瓶數；接進遊戲時把 `plan.fallenPins` 換成物理結果的球瓶編號即可（瓶數相同）。

## 已驗證 / Verified

- `npm run test:bowling3d`：6／6（88 個情境瓶數完全相同、同種子重播一致、洗溝、與既有計分銜接）。
- `npm test` 116／116、`npm run test:bowling` 15／15（在 C 槽完整暫存副本執行）。
- Node 另測 200 個隨機情境：200／200 瓶數正確，9 個需要輔助，平均規劃 58 ms，最慢 461 ms。
- 本機瀏覽器（內建瀏覽器，Intel UHD 內顯，1280×720）：十種情境瓶數正確；一般球 3.7–3.9 秒、特殊球（全倒／補中／功能卡）7.6–7.7 秒、洗溝約 3.2 秒；無 console error。
- 每格繪製約 12.7 ms（1200×900）；繪圖解析度上限約 1500×850，慢於 25 fps 持續一秒會自動關閉光暈與陰影。

## 聲音 / Sound（2026-11-26 教師同意下載後換成真實錄音）

- 來源檔 14 個（教師同意的清單，約 4.2 MB）在 `qa/bowling3d-audio-20261126/source/`，另有 6 個 edge-tts 播報語音（en-US-GuyNeural）。
- `node scripts/prepare-bowling3d-audio.mjs` 剪成 26 個遊戲用音檔（2.4 MB）到 `public/bowling3d/audio/`；`manifest.json` 記錄每個檔的來源網址、授權、處理方式與 SHA-256。
- 錄音全部是 CC0：BigSoundBank（歡呼、咻聲、鞭炮）、OpenGameArt〈Funked Up〉（背景音樂）、Freesound 試聽版 MP3（滾球、全倒、球瓶互撞、重低音、觀眾嘆氣）。Freesound 原始 WAV 需登入，未下載。
- 真實錄音：滾球（循環）、全倒撞擊、中等撞擊、6 種單瓶敲擊（每次物理碰撞隨機挑一個）、大／小歡呼、嘆氣、重播咻聲、慢動作重低音、煙火與爆裂、背景音樂、6 句播報。
- 仍是合成音：蓄力、出手、洗溝、球落坑、銅管短樂句（找不到合適的 CC0 洗溝錄音）。
- 重播時背景音樂自動壓低。下載的 `fs-655944`、`fs-870630` 兩個檔沒有採用。
- 瀏覽器實測：26 個音檔全部載入，全倒／6 瓶／洗溝三球的音效輸出峰值 0.77／0.41／0.54，音樂峰值 0.17。

## 功能卡 / Power cards（規格 `rdq/RDQ-spec-bowling3d-power-cards-20261126.md`，已確認）

- **規則修改**：Extra Shot 由多 5 次改為多 2 次（`EXTRA_SHOTS=2`，`src/bowling-model.mjs`；卡面、畫面文字、設定頁說明、測試一併更新）。已發出的額外投球不回收。
- 試片頁左邊「Power-up cards」有七個按鈕（Hit or Miss 分 HIT 與 MISS）。流程：卡片從球飛出翻面 → 播報卡名 → 按畫面上的 **OKAY** → 專屬花樣的球滾出 → 效果。
- 程式：`src/bowling3d/cards3d.js`（卡片、道具、六張卡的時間軸）、`director.js`（`revealCard()`、`play()` 的 `card` 選項、`cardEffect` 階段）、`planner.mjs` 的 `cardRollRecording()`（球停在球瓶前，球瓶不會動）。
- 演出：Hit or Miss 紅綠閃爍加鼓聲，最後才定色（全倒含重播／偏進球溝）；Extra Shot 分裂成 2 顆光球飛向投球次數；No Shot 撞上落下的禁止標誌後洩氣；Lose Points 掉進地洞；Double Points 穿過 ×2 光門變兩顆並噴金幣；Swap Points 漩渦中兩組分數牌對調。
- 試片頁右上角的 TEAM 1／TEAM 2／SHOTS 是示範用計分板，接進正式遊戲時改用真實組別。
- 實測長度（逐格模式）：Extra 6.5、No Shot 6.5、Lose 6.5、Double 6.7、Swap 6.9、Hit 7.7、Miss 約 6.2 秒。減少動態版：五張無球瓶卡 4.4–4.6 秒，Hit or Miss 2.4 秒（固定鏡頭、無慢動作與重播）。
- 聲音：卡名播報 6 句（edge-tts，同一個聲音）。教師 2026-11-26 同意後下載 16 個 CC0 來源檔（約 2.5 MB，BigSoundBank 7 個、Freesound 試聽版 9 個），剪成 16 個 `fx-*.wav`：翻卡、魔法聲、鐘聲、鼓聲循環、鼓邊一擊、叮、蜂鳴、彈跳、洩氣、滑哨、碎裂、漩渦、驚呼、小朋友笑聲、標誌落地（鐵鎚＋木頭悶響混合）、金幣雨（七段疊合）。`audio.fx(name)` 優先用 `fx_<name>` 錄音。
- 仍是合成音：卡片吸入的閃亮聲、分裂的啵聲、地洞打開、球在洞邊搖晃。
- 目前共 48 個遊戲用音檔（4.3 MB），來源、授權、處理與 SHA-256 都在 `public/bowling3d/audio/manifest.json`。瀏覽器實測 48 個全部載入；即時播放 Miss 6.2、Double 6.7、No Shot 6.55 秒，音效輸出峰值 0.55–0.67。
- 測試：`npm run test:bowling3d` 8／8（新增功能卡滾球與 Extra Shot +2）、`npm test` 116／116、`npm run test:bowling` 15／15。

## 接進正式遊戲 / Integration（2026-11-26 教師指示「要接進正式遊戲」；**尚未部署**）

- `src/bowling3d/Bowling3DLane.jsx`：可重用的 3D 球道元件（畫布、導播、規劃 Worker、標語／重播／OKAY 等疊層）。`ref.shoot({plan,...})` 播放規則已決定的一球並回傳倒下的球瓶；`setup()` 擺好等待畫面與瞄準區。
- `src/BowlingGame.jsx`：`runShot()` 在可用 3D 時改走 `runShot3D()`；計分仍用 `commitBowlingShot()`，一般球與 Hit or Miss 只把 `fallenPins` 換成物理結果（數量相同），其餘卡片照原計畫。首頁 Bowling、Unscramble 單次獎勵（`solo`）、Phonics（`beforeTurn`）共用這個元件，所以一起換成 3D。
- 瞄準：彩色 1–5 區與「+1」標記畫在 3D 球道上，下方一排大按鈕選區（鍵盤左右鍵與空白鍵照舊）。
- 聲音：投球與功能卡用 `Bowling3DAudio`（含新背景音樂）；按鈕聲、瞄準聲、收集 +1、Winner 樂句仍用原 `BowlingAudio`。兩個音訊在同一次點擊中解鎖。
- **2D 備援**：瀏覽器沒有 WebGL 2 或 3D 啟動失敗時（`canUse3D()`、`onError`），自動使用原本的 2D 球道與原音效，程式碼完整保留。
- 連續全倒（DOUBLE／TURKEY）以每組為單位記在記憶體，重新整理後歸零。
- QA 開關：`window.__bowling3dQA.manual=true` 後用 `engine().step(秒)` 逐格播放。

### 整合驗證（本機 dev 伺服器，內建瀏覽器，逐格模式）

- 正式 Bowling 兩組連續 10 球：一般球、收集 +1、Hit or Miss（全倒 +10）、Extra Shot（之後確實多 2 球）、補中；每球的事件、分數與 localStorage 紀錄一致，兩組總分 21／24 等於各球得分總和 45。
- Unscramble 單次獎勵預覽頁：投一球（+8，3.6 秒）後自動返回「已完成一次」。
- `npm test` 116／116、`npm run test:bowling` 15／15、`npm run test:bowling3d` 8／8；`npx vite build` 成功（BowlingGame 區塊 653 kB，只在進 Bowling 時載入；首頁主檔不變）。
- **未個別測試**：Phonics 接入版（只確認它用的是同一個元件與未改動的 `beforeTurn` 流程）、Swap／Lose／Double／No Shot 在正式遊戲內的抽卡（試片頁已測）、Winner 結算畫面、2D 備援路徑、即時 60 fps。
- **發版準備（2026-11-26，尚未部署）**：`public/release.json` 已更新為 `2026.11.26-bowling-3d.1`（基準 `2026.10.14-game-entry.1`），`sources` 增列 `bowling-model.mjs` 與 13 個 `bowling3d/` 檔案，另加 `bowling3d` 區塊。部署前讀回正式站仍是 `2026.10.14-game-entry.1`（Last-Modified 2026-10-14 15:50 台北時間），且 10/14 之後本機只有這次的檔案有變動。在 C 槽隔離副本 `npm run build` 通過（發版檢查＋Vite），成品 500 檔 173.7 MB；清單與雜湊在 `qa/bowling3d-production-20261126/`。只需部署 Hosting；Functions、Firestore／Storage 規則都沒有改。

## 未驗證／未完成 / Not done

- **聲音尚未經人耳驗收**：我只能確認音檔載入、有輸出音量、觸發時間對，聽感與各聲音的相對音量要由教師判斷。
- 未在教室投影機、教室電腦或 iPad 實測；內建瀏覽器上限 30 fps，無法確認 60 fps。
- 15 顆球的 3D 貼圖是程式重畫的近似版，與原 2D 圖不完全相同。
- Basketball 尚未開始。

## 依賴 / Dependencies

新增 `three@^0.180.0`、`@dimforge/rapier3d-compat@^0.19.3`（已寫入 `package.json`、`package-lock.json`）。物理引擎約 2.2 MB，只在 Worker 中載入。
