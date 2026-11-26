# Animal Basketball 3D 試片 / Basketball 3D pilot（2026-11-26）

規格：`rdq/RDQ-spec-basketball-bowling-spectacle-20261126.md`、`rdq/RDQ-spec-basketball-power-cards-20261126.md`（都已確認）。本檔記錄 Basketball 試片的做法、驗證與未完成事項。**尚未接進正式的 `BasketballGame.jsx`，規則檔也還沒改，尚未部署。**

## 怎麼看試片 / How to view

- 執行 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/bowling3d-preview.ps1`，開啟 <http://127.0.0.1:5221/basket3d-pilot.html>。
- 左邊選動物、分值（1／2／3）、進球或不進的方式，按 **SHOOT · HIT** 或 **SHOOT · MISS**；下方八個功能卡按鈕（Hit or Miss 分 HIT／MISS，Steal 分有分可偷／沒分可偷）。卡片揭曉後按畫面上的 **OKAY**。
- 右上角的 TEAM 1／TEAM 2／SHOTS 是示範用計分板。試片頁不會進正式建置。

## 做法 / How it works

| 檔案 | 用途 |
|---|---|
| `src/basket3d/shots.mjs` | 投籃規劃：結果（進／不進）由規則先決定，這裡只決定怎麼進或怎麼不進，用拋物線逐格算出球的路徑。進球三種（空心、擦板、彈框進），不進四種（彈框出、打板、涮框而出、籃外空心），另有灌籃 |
| `src/basket3d/stage.js` | 球場、籃板籃框、會晃動的籃網、動物角色（沿用現有 2D 圖集的四個姿勢）、觀眾、燈光 |
| `src/basket3d/director.js` | 導播：蓄力、跟球鏡頭、進球定格與震動、籃下仰角慢動作重播、慶祝、灌籃的助跑起跳 |
| `src/basket3d/cards.js` | 六張功能卡的資料與四張效果卡的演出（Extra Shot、Double Points、Swap Points、Steal）；Slam Dunk 與 Hit or Miss 是投籃類，由導播播放 |
| `src/basket3d/audio.js` | 球場音效（彈地、入網、撞框、打板），其餘與 Bowling 共用 |
| `src/basket3d/Basket3DPilot.jsx` | 試片頁 |

與 Bowling 共用（新抽出的 `src/game3d/`）：`stage3d.js`（渲染、光暈、解析度上限與自動降級）、`camera-rig.js`（鏡頭平滑與震動）、`crowd.js`（觀眾）、`card-kit.js`（卡片飛出翻面、金幣、分數對調）。Bowling 的 `stage.js`、`director.js`、`cards3d.js`、`textures.js` 已改成使用這些共用模組，行為不變（改完後 Bowling 試片頁重測：全倒 7.55 秒、Double 6.67、Swap 6.88、No Shot 6.48，與改前相同）。

## 六張卡在試片裡的演出

| 卡片 | 演出 | 實測長度 |
|---|---|---|
| Hit or Miss（進，+4） | 球在空中紅綠閃爍加鼓聲，到籃框前才定色，空心入網，含重播 | 7.68 秒 |
| Hit or Miss（不進） | 最後定紅色，彈框而出 | 6.0 秒 |
| Slam Dunk（+3） | 動物助跑、起跳、灌籃，籃板震動、地面衝擊波，含重播 | 7.58 秒 |
| Extra Shot | 兩顆發光籃球從天而降彈到動物手上，再飛向投籃次數，+2 SHOTS | 6.2 秒 |
| Double Points | 籃框變金色並多出第二個金框、噴金幣，分數翻倍 | 6.63 秒 |
| Swap Points | 漩渦中兩組分數牌對調 | 6.72 秒 |
| Steal | 光球從對方分數牌飛到本組，+2／−2；對方 0 分時顯示 NOTHING TO STEAL | 6.5／6.2 秒 |

一般投籃 3.35–3.92 秒；三分球命中（含重播）7.38–7.72 秒。減少動態版：固定鏡頭、無慢動作與重播，2.6–3.4 秒。

## 聲音 / Sound

- 教師 2026-11-26 同意後下載 9 個 CC0 來源檔（約 1.3 MB，Freesound 試聽版 7 個、BigSoundBank 2 個）到 `qa/basket3d-audio-20261126/source/`。
- `node scripts/prepare-bowling3d-audio.mjs`（同一支腳本的 Basketball 段落）剪成 15 個球場音檔加 8 句播報，共 23 個檔、910 KB，放在 `public/basket3d/audio/`；`manifest.json` 記錄來源網址、授權、處理與 SHA-256。
- 真實錄音：球彈地、入網 3 種、撞框 3 種、打板、球鞋摩擦 4 種、蜂鳴器、球場觀眾歡呼大／小。入網、撞框、摩擦每次隨機挑一種。
- 沒採用的來源：`fs-716930`（另一個入網聲）、`fs-788259`（鐵鍊籃網）。蜂鳴器已剪好但試片還沒用到，留給正式遊戲的終場。
- 其餘（嘆氣、重播、煙火、卡片效果音、背景音樂）與 Bowling 共用 `/bowling3d/audio/`。仍是合成音：蓄力、出手、起跳、灌籃的低音。
- 播報 8 句（One／Two／Three／Four points、Slam dunk、Steal、On fire、So close）用 edge-tts，和 Bowling 同一個聲音。

## 已驗證 / Verified

- `npm run test:basket3d` 6／6：進球一定穿過籃框、不進一定不穿過、球不會穿過籃板或地板、同種子重播一致、灌籃。
- `npm test` 116／116、`npm run test:bowling` 15／15、`npm run test:bowling3d` 8／8；`npx vite build` 成功。
- 本機瀏覽器（內建瀏覽器，逐格模式，1280×720）：9 種投籃與 8 種功能卡情境全部播放完成，無 console error；47 個音檔載入。

## 接進正式遊戲（2026-11-26，同日 21:08 已部署）

教師 2026-11-26 指示「3D 和六張卡接進正式的 Basketball」。教師確認後已部署為 `2026.11.26-basketball-3d.1`，紀錄在 `DEPLOYMENT-BASKETBALL-3D-20261126.md`。

- **規則**（`src/basketball-model.mjs`，存檔版本 3）：取消 Focus／Long shot 與 4 分球按鈕。每回合 70% 機率在 1／2／3 分其中一個按鈕出現「+1」，投那個分值（進不進都算）拿一張卡，每組最多 2 張。按 POWER UP 依設定的開關與比例抽一張，取代這回合的投籃：Extra Shot（同組多投 2 球，這 2 球不出代幣、不能再用卡）、Double Points、Swap Points（兩組自動、三組以上教師選）、Slam Dunk（必進 3 分）、Steal（從最高分的另一組拿 2 分，同分由教師選，對方不足就拿到 0 為止）、Hit or Miss（一半機會 4 分）。Swap／Steal 的分數移動記在該筆紀錄的 `target`／`transfer`，總分一律由紀錄重算。舊版（版本 2）未打完的存檔不能續玩。
- **畫面**（`src/BasketballGame.jsx`）：球場換成 `src/basket3d/Basket3DLane.jsx`（three.js 另外延後載入，不會拖慢首頁）；沒有 WebGL 2 或載入失敗時自動退回原本的 2D 球場，卡片在 2D 只顯示卡名與結果。記分板顯示各組持有的卡數（⚡），左上角顯示 BONUS SHOTS，結果列顯示「+1 POWER CARD!」。
- **設定頁**：Power cards 總開關，底下六張卡各有開關與比例滑桿，右邊顯示實際抽中機率；比賽開始後鎖定。3D 模式只有 Music 與 Effects 兩條音量（舊的合成環境聲只在 2D 備援使用）。
- **Unscramble 的 Basketball 獎勵**：改用 3D，沒有代幣與卡片，投完約 1.8 秒自動返回。
- **Phonics 接入版**：用同一個元件，有卡片；答題關卡（`beforeTurn`）的接法沒有改。
- 兩款共用的畫面疊層抽成 `src/game3d/ShowOverlays.jsx`，`Bowling3DLane.jsx` 也改用它。

### 這次的驗證

- 單元測試：`npm test` 127／127（含籃球規則 27 項：代幣、持卡上限、六張卡、多投兩球、偷分、交換、抽卡比例、存檔重播、竄改與舊版存檔拒絕）、`test:bowling` 15／15、`test:bowling3d` 8／8、`test:basket3d` 6／6；`npx vite build` 成功（`Basket3DLane` 獨立一包 35 kB，three.js 與 Bowling 共用）。`test:phonics` 24 過、2 個失敗是暫存副本沒有複製「參考遊戲」音檔，與這次改動無關；其中籃球那一項通過。
- 本機瀏覽器（內建瀏覽器、逐格模式、1280×720，沒有 console error）：
  - 一般投籃：不進 3.6 秒、進球 3.5–4.0 秒；投「+1」的分值後記分板出現 ⚡1。
  - 六張卡各跑一次，分數與紀錄正確：Swap（兩組自動；三組先選對象，1-3-2 → 3-1-2）、Double（1 → 2）、Steal（1-3-2 → 3-1-2；同分時選對象；對方 0 分時直接顯示 NOTHING TO STEAL，不問對象）、Slam Dunk（+3，有慢動作重播）、Hit or Miss（抽到進球 +4，有重播）、Extra Shot（之後連投 2 球，投完才換組）。含翻卡約 7–9 秒。
  - 投籃途中離開再按 Resume：同一球重播後結果不變。打完最後一球出現結算畫面。
  - Reduce motion：一般 2.5 秒、卡片 3.5–3.8 秒。
  - 關掉 WebGL 2：退回 2D 球場，卡片與一般投籃都能完成。
  - Unscramble 獎勵試玩頁：籃球 3D 投一球後自動返回；Bowling 獎勵（共用疊層改動後）投一球正常。

## 未驗證／未完成 / Not done

- 登入後的正式站畫面沒有實測（沒有代填教師通行碼）；以下驗證都在本機開發伺服器。
- Phonics 接入版只跑了單元測試，沒有在瀏覽器實際走一遍。
- **聲音未經人耳驗收**：只確認 62 個音檔全部載入、有輸出。逐格測試時灌籃的瞬間峰值偏高，已把灌籃低音與球場歡呼調小，實際音量仍要教師聽過。
- 即時流暢度、教室電腦、投影機、iPad 都沒有實測（內建瀏覽器在背景時只有每秒 2 格）。
- Slam Dunk 用的是現有的投籃姿勢圖，沒有專屬的灌籃姿勢；要新圖需另外報價。
- 動物是平面圖片，鏡頭只從球場同一側拍。

## 注意：Bowling 的已部署檔案有變動

為了共用，`bowling3d/` 的 `stage.js`、`director.js`、`cards3d.js`、`textures.js`、`bowling3d.css`、`Bowling3DLane.jsx` 在部署後又改過，和上一版 `public/release.json` 記錄的雜湊不同。準備部署時已把清單更新成 `2026.11.26-basketball-3d.1`（加入 `basketball-model.mjs`、`basketball.css`、`src/game3d/`、`src/basket3d/` 等 14 個檔案），發版檢查通過，Bowling 也重測過。正式站目前仍是 `2026.11.26-bowling-3d.1`，沒有受影響。
