# 參考提示詞：皮影戲書店廣告（品質標竿）/ Prompt benchmark: Shadow Puppet Theater

記錄日期：2026-10-25。來源：教師貼入的一份「用程式做動畫」的提示詞，要求 AI 以 SVG＋CSS 製作 3840×2160、60 fps、20 秒、無聲的剪紙皮影戲書店廣告。教師指示「記錄下來，作為 2D 動畫的參考」。
**這是參考，不是待辦：** 沒有要求現在製作這支影片，也不是我們的產出。我們的管線是 Canvas 2D＋Playwright＋ffmpeg（見 `pipeline.md`），這份提示詞的價值在於它的**結構與檢查表**。

---

## 1. 提示詞原文（逐字保存）

```
Build an animation: 3840x2160, 60 fps, 20 seconds, silent. SHADOW PUPPET THEATER: a commercial for an invented independent bookstore, "LANTERN & LEAF BOOKS".

THE BAR
It should look like a famous animation studio's signature style come to life: a real, crafted, different world. The goal is a viewer saying "wait, that was made with code?" Build everything in SVG and CSS. No photos, no 3D library.

THE STYLE
Silhouette animation inspired by 1920s cut-paper animation and Indonesian shadow theater:
- A backlit translucent paper screen glowing warm amber to rose, framed by a carved wooden theater stage and velvet curtains that open.
- Intricately cut black silhouette puppets with lace-like cut-outs and visible joint pivots.
- Thin control rods held from below.
- Colored gel layers (translucent teal or rose cut-paper scenery) for depth.
- Puppets move with jointed limbs on hinges.
Pay homage to the style only. Never copy an existing character.

THE STORY
1. A traveler opens a giant book.
2. A filigree forest grows out of the pages.
3. A dragon made of lace cut-outs coils through the trees.
4. A ship sails on cut-paper waves.
MONEY SHOT: the book's pages flip and each page launches a new silhouette world rising up (castle, ocean, stars), with the camera pushing through the layers.
END CARD: the curtains close partway, and "LANTERN & LEAF BOOKS" with the tagline "EVERY STORY STARTS HERE" is cut into a silhouette banner glowing on the screen.

THE CHECKLIST
1. MONEY SHOT. Design the money shot first and build the film around it. Give it at least 2 seconds and the biggest scale.
2. HOOK. Something striking moves in the first frame, and the first wow lands within about a second.
3. DEPTH. At least 3 parallax layers, plus a foreground element that passes close to the camera. One consistent light source and crisp shadows.
4. SCALE. The main subject fills 40 to 70% of the frame. No tiny scenes and no big empty areas.
5. MOTION. Something new happens every third of a second. Smooth camera drifts and pushes, no sudden zooms. Natural follow-through: overshoot, squash, settle.
6. TEXT. Large and easy to read. Every word fits fully inside its container and never overlaps other text or artwork.
7. FINALE. A big branded end card with the name and tagline that keeps moving until the last frame.
8. CLEAN LOOK. No blur, no flashes, no confetti, no cross-fades. Use wipes, irises, page turns or curtain moves between scenes. No real brands or logos.

PROCESS
Before building, write a 10-line shot list with timestamps that marks the money shot. Then build, check stills across the whole film against the checklist, and fix anything that fails before the final render.
```

## 2. 這份提示詞為什麼值得參考（結構分析）

| 部分 | 做法 | 對我們的意義 |
|---|---|---|
| THE BAR | 一句話定目標觀感：「看的人會說『這是用程式做的？』」 | 每支影片開工時先寫一句「這支片要讓人說什麼」 |
| THE STYLE | 用具體的媒材與工藝名詞（背光半透明紙幕、鏤空黑色剪影、關節樞紐、控制桿、彩色膠片層）描述，而不是形容詞 | 畫風用**可以畫出來的零件**描述；我們的 B／C 畫風文件也照這個寫法 |
| 「Pay homage to the style only. Never copy an existing character.」 | 只致敬風格、不抄角色 | 與我們對 Ifverse／Day One 的原則相同：學做法、不抄角色與品牌 |
| THE STORY | 4 個一句話的故事拍點＋一個「MONEY SHOT」＋結尾字卡 | 先決定最大的那個畫面，再把影片圍著它建 |
| THE CHECKLIST | 8 條**可檢查**的條件，多數有數字（≥2 秒、40–70% 畫面、≥3 層視差、每 1/3 秒有新事件） | 可直接當驗收項目；見下節 |
| PROCESS | 先寫 10 行含時間碼的分鏡（標出 money shot）→ 建 → 逐段抽格對照檢查表 → 修 → 才做最後渲染 | 與我們「先分鏡表、再試片、再全曲、逐句抽格」同構；多了「對照檢查表修正後才最終渲染」 |

## 3. 轉成我們 2D 動畫的「品質檢查表」（可選用；用在試片與全曲抽格時）

教師的歌曲動畫一直有「每句歌詞都對應動作」這條硬規則；下面這些是**額外的畫面品質**檢查，適合在畫風 B（電影光影）或要做「讓人驚豔的片段」時使用。數字是這份提示詞的標準，不是教師已確認的硬規則，用不用請問教師。

1. **Money shot**：全片最大、最華麗的一個畫面（例：Every Day Is Fun 的星期卡彩虹、最終副歌煙火），至少 2 秒、畫面尺度最大；先設計它，再配其他段落。
2. **Hook**：第一格就有東西在動，約 1 秒內出現第一個亮點（我們的開場已有七張星期卡掉入）。
3. **Depth**：至少 3 層視差（近、中、遠）＋一個從鏡頭前掠過的前景物件；單一光源方向、陰影一致（B 畫風的邊緣光方向要全片一致）。
4. **Scale**：主體占畫面 40–70%，不要小場景或大片空白。
5. **Motion**：約每 1/3 秒有新事件；鏡頭用緩慢漂移或推進，不要突然變焦；動作要有預備、過衝、擠壓、回穩（已有 `character-motion-checklist.md`）。
6. **Text**：字大、易讀；每個字完整放在框內，不與其他字或圖重疊（我們的 `qa_lines.py` 逐句抽格可順便檢查）。
7. **Finale**：大型品牌結尾卡（片名＋一句標語），持續動到最後一格（我們的 Outro 已有，最後 1 秒淡出；若要「動到最後一格」則改為不淡出）。
8. **Clean look**：不要模糊、閃光、紙花、交叉淡化；轉場用劃入、光圈、翻頁、布幕。
   ⚠️ **與我們現有做法的差異**（教師已驗收的歌曲動畫有紙花 `grpConfetti`、結尾 1 秒淡出、畫風 B 的遠景 `blur`）：這條屬於該提示詞的風格要求，**不要套用到已驗收的作品**；新片要不要採用，問教師。

## 4. 若要用我們的管線做這類「剪紙皮影」風格
（目前沒有任何製作計畫；以下只是可行性筆記）
- Canvas 2D 可做：背光紙幕（線性＋徑向漸層）、剪影人偶（`kidFront` 改成黑色填色＋鏤空圖樣）、關節樞紐點、控制桿（從下方伸入的細線）、彩色膠片層（半透明 `multiply`／`screen` 疊色）、布幕開合（兩片梯形漸層）、翻書（`scaleX` 壓扁翻面，已用於角色轉身）。
- 規格：3840×2160／60 fps 是我們目前 1080p／30 fps 的 8 倍像素、2 倍格數；20 秒＝1,200 格，單機渲染可行，但要先確認是否真的需要 4K。
- 該提示詞要求 SVG＋CSS；我們沿用 Canvas 並不違反精神（程式繪製、無相片、無 3D 函式庫）。

## 5. 使用方式
- 想讓畫面更有電影感、或教師要做「宣傳片／品牌片／預告片」時，讀本檔第 3 節做抽格檢查。
- 想寫新的「用程式做動畫」提示詞給別的 AI 時，可照第 2 節的結構：一句目標觀感、用工藝零件描述畫風、拍點＋money shot、可量化的檢查表、先分鏡後建置。
