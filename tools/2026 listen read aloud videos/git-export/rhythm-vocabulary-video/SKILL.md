---
name: rhythm-vocabulary-video
description: 以圖片或學生掃描作品製作節奏單字朗讀MP4，包含本機裁圖、老師與兒童感雙聲線、0.85倍自然朗讀對拍、黑板圖卡動畫及8／9／16／32張配置。用於更換單字／圖片、重製或局部修訂此類朗讀影片；歌詞MV或角色故事動畫另用相應流程。
---

# 節奏單字朗讀影片製作

將教師提供的圖片與字詞製成可驗收的MP4。正式樣式源自教師已驗收的v05九科目影片；不是把九科目、90.17秒或特定學生座標固定套到所有新案。

## 正式預設與來源

- 1920×1080、30fps、H.264／yuv420p、AAC48kHz；黑板、圖卡下落／輕擺／上退及圖下英文。朗讀畫面不加老師／兒童、輪次、速度、題號或標題。
- 每輪**8張總覽固定4欄×2列**，上列前4張、下列後4張；片頭、輪次切換、尾段及32圖各分段都適用。每輪9張才用3欄×3列。
- 配對時檢查顯示字大小寫：一般單字全小寫（music、science），Chinese的C、English的E大寫，縮寫PE全大寫。不可照抄大寫檔名；原圖內學生手寫字不改。
- 每詞老師marin一次→兒童感coral一次；每段兩輪。coral為內建合成人聲的兒童感表現，不是真實兒童錄音或官方兒童聲線標籤。
- 語音0.85倍、保留音高；原模板鼓聲約93.673469 BPM。主重音對實測鼓聲，保留弱音節／前導音及尾音，長詞增加整拍。詳細方法見[語音與節奏](references/audio.md)。
- 所有圖片在本機處理，保留學生手繪、手寫、星期與著色，不外送圖片API、不生成重畫。見[裁圖方法](references/images.md)。
- `assets/baseline-profile.json`與`accepted-voice-bank.json`指向有SHA的私人正式資產；不內嵌學生作品、金鑰或字型。載入前核對來源存在與SHA；移動資料夾時明確更新路徑並保持雜湊核驗。
- 工作根目錄由本次使用者提供或目前專案決定，傳給`--project`；輸出須在其內。個人技能安裝目錄不當作新影片工作目錄。

## 依任務選擇流程

1. **素材整理**：先讀圖／頁面，建立單字與圖片配對；掃描件先用裁圖與補白工具，現成合格圖片可直接使用。
2. **新影片**：參閱[工作流程](references/workflow.md)，準備[設定格式](references/schema.md)，用工具preflight→plan→render→verify。沿用已選聲線，不重問A/B。
3. **新字詞語音**：先查同文字／模型／聲線／指令的已驗證快取；缺少才依本次授權生成。正常速度來源只變速一次，逐詞檢查頻譜與主重音候選，再做代表試片。
4. **局部修訂**：另存版本。只改畫面且語音／節奏指紋相同時，`render --reuse-audio`複製既有AAC；修改詞語或節奏時重排受影響內容並再檢查。
5. **32張合併**：兩段各有精確檔案SHA與教師明確驗收後才`merge`。新合併片仍需檢查接點並交教師驗收。

需求已清楚或正在修訂時直接做；不為了技能流程重問已知設定。主題／配對有實際歧義才詢問，繼續不依賴答案的工作。使用者指定RDQ時按已確認規格執行，不重跑訪談。

## 圖片路由

| 張數 | 使用方式 |
|---|---|
| 8或9 | 同組圖片用於兩輪 |
| 16 | 前8張第一輪，後8張第二輪 |
| 32 | 前16張為一段、後16張另一段；每段再前後8張分兩輪 |

依檔名數字排序，不以英文字母排序；每張圖片使用明確的顯示字及發音文字。兩輪預設同詞同序，**若實際檔案不同，先列出差異；教師明確選擇依檔名／不同輪次內容時用`round_word_policy: explicit`，不得強制刪圖或替換單字。** 其他張數先釐清配對，不自行猜分組。

## 可執行工具

在有NumPy、Pillow的Python環境執行；PDF另需PyMuPDF。FFmpeg／ffprobe須可用；語音變速需FFmpeg的rubberband濾鏡。前置檢查只驗證，不自動替換字型／聲線／素材。

```text
python scripts/rhythm_video.py inventory --folder IMAGE_FOLDER
python scripts/rhythm_video.py preflight --project PROJECT --config JOB_JSON
python scripts/rhythm_video.py plan --project PROJECT --config JOB_JSON
python scripts/rhythm_video.py render --project PROJECT --config JOB_JSON --segment 1
python scripts/rhythm_video.py verify --project PROJECT --config JOB_JSON --segment 1
```

以上`PROJECT`等是使用者本次實際路徑；scripts相對於本技能。初始化作業時複製profile後填寫items、output_dir、配對確認狀態。路徑含空白時使用shell正確引號；將資料寫JSON，不拼接成shell程式。

## 檢查與交付

- 按[驗收方法](references/validation.md)檢查來源SHA、每輪圖詞、每詞兩聲、無重疊／截尾、對拍、完整解碼、實際編碼畫面及瀏覽器播放。
- `verify`的抽樣與錨點算式不是逐音節完美同步證明；新聲音仍需ASR／聽校及實測分軌對拍。不得將自動QA或模型目視當作教師接受。
- 交付MP4、預覽、配對表／時間軸、分軌、清楚節拍檢聽音、QA及安全來源紀錄。保存正式版與歷史版本，避免覆寫。
- 若需雲端連結，先保存到本次Drive同步目錄，再用Google Drive列資料夾／讀metadata核對實際MP4名稱與大小，回傳觀察到的URL。沒有遠端SHA時只報核對到的欄位；不擅改分享權限。
- 新付費語音依本次授權；此正式範例曾有的無上限預算不是永久授權。未知請求結果時不自動重送；錯誤只保存安全狀態／request ID，不寫出憑證。
- 完成後保存可接續紀錄。若既有順序是先完成技能再製作指定影片，技能驗證／安裝讀回完成後才開始新片。
