# Tripo 製作設定與小樣本紀錄（2026-10-21）

## 帳號現況（在 Chrome 已登入的 Tripo Studio 讀到）
- 方案 Pro（3000 點／月），到期 2027-03-24。
- 剩餘 2045 點（小樣本後）；其中大部分在 **2026-10-24** 到期。你說已加購，但我查看時餘額還沒增加（仍是 2100），可能尚未入帳。
- 圖生 3D 每個模型 55 點；這是 HD Model、Ultra Mesh、4K PBR 貼圖的設定。

## 製作流程（已驗證可用）
1. **Tripo Studio → Image**：用英文提示詞生成單棟建築參考圖（模型 Nano Banana，每次出 4 張，**不扣點**，介面顯示 0 點，Free 計數 4/100）。
2. 挑一張，按「Generate HD Model」。
3. 設定（Geometry & Texture）：Ultra Mesh 開、Texture 開 4K、PBR 開、Topology 選 Triangle、**Polycount 改成 5000**（預設是 2,000,000，不能用於網頁遊戲）。
4. **Privacy 改成 Private**（預設是 Sharing Only）。
5. Generate（55 點，約 2 分鐘）。
6. 滿意後匯出 GLB，匯入 Godot。

## 小樣本：第一味（TEA TOP）
- 提示詞重點：窄長兩層透天、一樓開放式飲料櫃檯、上方紅色大招牌 TEA TOP、藍色布旗、橘色櫃檯、兩台冷氣；單棟、淺灰背景、左前 3/4 視角、無人無街道。
- 結果：4 張參考圖都能用，第 3 張最接近。模型 **3840 三角面、3226 頂點**，招牌文字清楚，正面形狀合理。
- 還沒檢查：側面與背面、頂部貼圖品質、匯入 Godot 後的樣子。
- 花費：55 點。

## 批次生成紀錄（2026-10-21，全部私人、面數 5000、4K PBR）
已在 Tripo 帳號完成 14 個模型（每個 55 點，共 770 點；剩 1330 點）：
第一味、二水火車站、二水郵局、二水鄉立圖書館、二水超市、全聯、二水國小、7-ELEVEN、大盟書局、八堡圳農情館、二八水驛站，
以及二八水水公園的蒸汽火車頭、戰鬥機展示、遊樂設施。
- **水心之初大草原**：不用 Tripo。AI 把「水心之初」四個字生成錯了（變成「冰心之助」），改在 Godot 用 3D 文字（TextMesh）＋草地＋白色底座做出來。
- 所有招牌上的中文字，AI 生成的字形不可靠，進 Godot 後用 Label3D 重疊正確文字。
- 主角：Tripo 帳號裡已有 10/20 做好的 Ken 造型模型，之後直接使用。
- Godot 4.7.2 穩定版已下載解壓到 `C:\Users\User\Godot\`。

## GLB 匯出與 Godot 匯入（2026-10-21）
- 14 個 GLB（2k 貼圖，每個 1.3–2.0 MB，合計約 23 MB）在 `godot-ershui-quest/assets/models/`，檔名：train_station、teatop、post_office、library、market、pxmart、school、seven_eleven、bookstore、farm_centre、station_inn、steam_locomotive、fighter_jet、playground。
- 匯出不扣點。Chrome 一開始擋掉連續下載，允許後檔案會以 `.tmp` 形式落在 Downloads，我再複製改名；已清掉那些 .tmp。
- Godot 4.7.2 匯入正常，貼圖與顏色正確。**所有模型都被 Tripo 正規化成約 1 個單位寬**，在遊戲裡要依真實比例逐一縮放（例如學校、全聯要比第一味大很多）。
- 檢查場景：`godot-ershui-quest/scenes/model_gallery.tscn`（執行後產生 gallery.png）。
- 模型內建招牌的中文字不可靠，正式版用 Label3D 疊正確的字。

## 主角 Ken（2026-10-21）
- 帳號裡原有的 Ken 模型是 195 萬面，太重。用 Tripo「Retopology」（三角面、1 萬面、35 點）減面為約 9400 三角面，貼圖保留，匯出 `ken.glb`（約 8.8 MB）。Tripo 餘額 1295。

## Godot 街道場景（godot-ershui-quest）
- 主場景 `scenes/main.tscn`、腳本 `scripts/world.gd`。路網與 13 個地點的位置依 `二水街道圖icons.png` 寫成簡圖像素座標。
- 玩法：點建築或底部按鈕 → Ken 沿路網（Dijkstra）走到門口 → 彈出題目視窗（目前是佔位）。11 個一般地點通關後才解鎖兩個魔王區。
- 自動測試：`Godot_v4.7.2-stable_win64_console.exe --path . -- --test` 會截圖 `test_*.png`。

## 答題系統（2026-10-21）
- 題庫：沿用 HWG5 U01+U02 的 32 題（11 題拼字、21 題拖放），由 `godot-ershui-quest/tools/build_quiz_data.py` 從 HWG5 網站資料轉出 `data/questions.json`，並複製題目圖片（assets/questions）與 Tick 的回饋語音（assets/audio/feedback，共約 6.8 MB）。
- 題目配置 `data/quiz_plan.json`：11 個一般地點各 2 題（1 拼字＋1 拖放）；二八水水公園 4 題；水心之初大草原 6 題（整句回答）。加入 16 題聽力後變成一般 3 題×11、水公園 7、草原 8，共 48 題。
- 規則沿用 HWG5：答對品質 = max(1, 5 − 嘗試次數)（★）；答錯一次出提示 1、兩次以上出提示 2；答對後要聽 Tick 語音才能按下一題。作答結果存在 `user://hwg5_results.json`（目前只存本機，尚未接教師後台）。
- 程式：`scripts/quiz.gd`（答題畫面）、`quiz_tile.gd`／`quiz_slot.gd`／`quiz_bank.gd`（點擊＋拖放）、`clock_overlay.gd`（Q01 的時鐘指針）。
- 已用 `--test` 自動跑過：時鐘題、答錯提示、答對回饋、拼字題、完成畫面、兩個魔王區的題目畫面。**沒有測試到**：真人用滑鼠／手指拖曳、語音實際播放。

## 第二輪：打怪、畫面優化、車站重建（2026-10-21 下午）
- 二水車站依 2025-12 整修完成後的外觀重建（單層白牆＋芥末黃線條、白色列柱門廊、站名在屋頂右側、前方寬階梯）。參考來源：台灣設計研究院〈A Better City：以設計延續百年車站的時光與記憶〉（2026-01-09）。
- 新怪物（全部原創）：一般 6 種＝墨水史萊姆、齒輪小妖、珍奶怪、鉛筆小鬼、粉筆幽靈、稻田蛙；魔王＝蒸汽鐵龍（水公園）、水圳龍王（水心之初大草原）。
- 鉛筆小鬼第一版手拿像劍的尺 → 依「不出現武器」規則，改用 ChatGPT API（gpt-image-2，medium，1024×1024）重畫成抱大橡皮擦的版本再建模。
- 街道擺設：樹（Tripo 生圖）、路燈／機車／汽車（ChatGPT API 生圖 → Tripo 建模）。Tripo 免費生圖額度已用完（之後每次 40 點），所以改用 ChatGPT API 生參考圖。
- ChatGPT API 圖片：`generated-images/20261021/`，每張旁邊有 .json 紀錄（模型、提示詞、SHA-256），已逐一核對 SHA-256。
- Tripo 餘額：525 點。
- 字型：英文 Comic Relief（OFL 授權，`assets/fonts/`），中文用系統字型備援。**網頁版要另外打包中文字型**。
- 地點標示：中文＋簡單英文（例：第一味 tea shop、八堡圳農情館 coffee shop）。大盟書局改到郵局旁邊。
- 打怪：每答對一題 Ken 發出一次非暴力攻擊（泡泡、光束、棒球、籃球、星星），怪物少一顆愛心，最後一題是最後一擊並顯示「勝利！ Victory!」；怪物被打倒時化成星光飄走。一般地點隨機 2 隻、魔王區各 1 隻。
- 模型資料夾約 91 MB（含 Godot 匯入時拆出的貼圖），網頁版前要壓縮。
