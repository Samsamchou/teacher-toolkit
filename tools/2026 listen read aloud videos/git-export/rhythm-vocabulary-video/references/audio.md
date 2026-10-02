# 語音與對拍 / Speech and rhythm

## 新語音生成與快取

`speech_tools.py generate --project PROJECT --manifest REQUESTS_JSON`預設只列快取命中與新請求數，不讀取金鑰、不送請求。清單格式：cache_dir、max_new_requests、本次authorization_note，以及requests[{spoken_text,role,voice?,instructions?}]。預設模型gpt-4o-mini-tts，teacher/marin及child/coral；請以當次可用性與已確認聲線為準，不靜默降級。

只有真實取得本次付費及使用既有金鑰授權後才加入`--execute --approved-paid-generation --approved-reuse-key`。旗標與JSON只是執行紀錄，不能自行產生人類授權。金鑰僅從環境或`C:/Users/User/.codex/.env.local`私有檔載入，絕不顯示或複製到技能、專案、前端及日誌。

快取鍵包含完整模型／聲線／input／instructions／WAV格式；複用前比對request與SHA。每筆每次執行最多一個請求，任何HTTP錯誤或未知網路結果停止；不自動重送可能已扣費的請求。保留attempt與安全error；教師若另授權重試，保留原attempt，最多2次額外嘗試，再失敗停止。本次實付未回傳時不把估算當帳單。

## 本機處理

`prepare --index RAW_INDEX --out NEW_DIR`需要kind=normal-speed-source、speed=1及匹配SHA的原始紀錄。明確左右平均避免浮點downmix多出增益；保留發音前80ms與後130ms，-19dBFS RMS／-2dB peak上限，4ms淡入淡出。

Rubber Band參數：tempo=0.85、pitch=1、formant=preserved、pitchq=quality；前後各補0.5秒再伸縮，依樣本數去除補白，避免視窗端點丟失。目標時長倍率1/0.85。基頻驗證應比較對應音節，不能只拿兩個整段中位數：不同片段選中不同母音會造成假性音高變化。

只針對已觀察到的問題做處理。舊math兒童音曾有低頻殘留而另用80Hz高通；這不是所有音檔的固定濾鏡。任何清理後再核對尾音，不可把低音或摩擦音當噪音裁掉。

## 錨點檢查

prepare輸出頻譜與unreviewed-bank，不能直接產片。查看每個聲線的頻譜，確認要落拍的主重音／短語起點，保留弱音節：如com-PU-ter、Chi-NESE、P.E.最後字母E；新詞不套舊詞時間窗。

錨點窗檔為`{"reviews":[{"spoken_text":"computer","role":"teacher","window_sec":[0.4,0.5],"spectrogram_reviewed":true,"syllable":"PU","note":"實際觀察","selector":"energy-edge"}]}`。時間只示範已知詞，對新來源必須重新量測。`anchor --bank ... --windows ... --out REVIEWED_BANK`在100–1200Hz母音能量窗內找上升候選；連續鼻音轉母音可使用energy-rise。碰到邊界需重看頻譜與窗，不可硬填。

排程把聲音的錨點樣本對到實際鼓聲攻擊點，而不是檔頭對格線。平均BPM相同仍可能有相位偏移，所以慢放本身不會修好舊偏移。主要錨點量測目標≤20ms；其他音節保持自然0.85朗讀，不宣稱所有音節等距或人耳完美同步。

新語音的獨立QA：逐詞聽音或本機ASR核對詞／縮寫；讀回分軌量測實際錨點與鼓聲；檢查音量、削峰、尾音及前導間距；對成品AAC附近視窗讀回確認沒有編碼位移。自動QA與教師試聽分開。
