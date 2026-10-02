# 圖片擷取 / Local student-art preparation

逐頁目視找出學生手繪、手寫及旁邊星期所構成的完整區域。示範學生作品的五個框僅為規格範例，不是所有學生頁面座標。保留原紅框；沒有紅框的來源不另加。未著色保持未著色；不修正文句、不補畫缺失人物、不用字型取代手寫。

工具`crop_images.py --project PROJECT --manifest REGIONS_JSON`使用像素框，JPG／PNG為EXIF轉正後座標，PDF為指定頁以指定DPI渲染後座標。先核對原檔SHA、預期尺寸、頁碼、DPI、所有框是否越界與ID重複，再寫任何產物。

```json
{
  "schema_version":1,
  "output_dir":"assets/crops/v01",
  "regions":[{
    "id":"student01-03",
    "source":"scans/student01.jpg",
    "source_sha256":"actual-source-sha256",
    "expected_page_dimensions":[2000,3000],
    "bbox_xyxy_exclusive":[100,200,900,1200],
    "weekday":"Wednesday"
  }]
}
```

PDF另加`pdf_page_1based`及`render_dpi`（例如300）。上面數值是格式示範，不可套用其他來源。PDF需PyMuPDF；加密PDF未解鎖先停止。座標超界、來源變更或已有輸出都保留原件並明確回報。

原始裁切與來源紀錄在raw與crop-manifest.json。再用`prepare_cards.py --project PROJECT --manifest CROP_MANIFEST --out SQUARE_DIR`做1024×1024白底等比例補白及輕度銳化；預設不去噪以保住淡鉛筆。需要去噪時比較處理前後圖，確認弱筆畫無損，保存方法。

命名按教師指定規則；本範例去識別學生代碼＋Monday至Friday序01–05（student01-03為Wednesday）。不因視覺星期文字存在就把它當成影片要朗讀的字。先看裁圖總覽，讓教師從中選正式題組；抽圖全部完成不表示已自動選定影片題材。
