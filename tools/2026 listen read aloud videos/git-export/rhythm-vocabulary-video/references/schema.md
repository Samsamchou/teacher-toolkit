# 設定與配對 / Job schema

用`assets/baseline-profile.json`複製初始設定，再加入以下欄位。所有相對路徑相對於`--project`，絕對來源路徑亦可。`output_dir`須解析在專案內；另存版本。

```json
{
  "schema_version": 1,
  "mapping_approved": true,
  "mode": "auto",
  "round_word_policy": "same-order",
  "output_dir": "productions/theme-YYYYMMDD/v01",
  "items": [
    {"id":"card-01","word":"PE","spoken_text":"P. E.",
     "image":{"path":"assets/01 PE.png","sha256":"actual-source-sha256"}}
  ]
}
```

此片段只示範一筆，完整job需8／9／16／32筆及profile中的board、drum_bar、voice_bank、font、speech_speed、bpm、voices。不可把示範雜湊當真實值。`mapping_approved`只能反映教師明確指定的內容／順序或已確認配對，不能用來跳過真實歧義。

- `id`唯一，代表圖片實例；同詞不同圖仍各有ID。
- `word`是畫面文字，`spoken_text`是語音字串。一般顯示字小寫；Chinese、English首字母大寫、PE維持縮寫。PE讀P、E，與顯示字分開。不能照抄大寫檔名，不能把圖中星期當成要朗讀的科目。
- `display_case_exceptions`可選，用於教師指定的其他專名／縮寫，例如`{"taiwan":"Taiwan","usa":"USA"}`；只可改大小寫、不可偷換字詞。Chinese、English與PE保持標準寫法。來源檔名保留，不因字幕修正而重新命名或修改原圖。
- `mode`可為auto／repeat／two-rounds／two-segments；auto只認8、9、16、32，不猜其他張數。
- `round_word_policy`預設same-order；明確批准不同詞序／不同詞彙才用explicit。
- 可選`min_beats`為至少4的4倍數，設定某詞至少幾拍；已驗收語音庫保留原詞的拍數下限。排程仍檢查是否要加拍。
- `pilot_indices`可選第一輪的1–4個不同索引，供`plan --pilot`；選短詞、長詞及縮寫等代表，另外指定pilot輸出資料夾。
- `voice_bank`引用SHA鎖定的JSON；每個不同spoken_text需teacher及child各一筆。相同語音可供不同圖片及不同輪次重用。

語音庫每筆包含`spoken_text, role, voice, path, sha256, speed, anchor_sample, audible_last_sec, anchor_reviewed`。路徑可絕對／相對，速度需與job相同；錨點以48kHz樣本數表達。不得僅填true冒充頻譜檢查，保存anchor_review與來源接受紀錄。

`plan`輸出每段timeline、speech/background/click/mix/click-listening WAV及job.json；計畫指紋相同且所有檔案雜湊一致才允許續作。改圖片而保持聲音可新建job再使用音軌重用。

32張的驗收檔：`{"segments":[{"status":"teacher_accepted","sha256":"實際第一段SHA","user_quote":"真實教師驗收原話"},{"status":"teacher_accepted","sha256":"實際第二段SHA","user_quote":"真實教師驗收原話"}]}`。代理不得自行填寫虛構人類驗收。
