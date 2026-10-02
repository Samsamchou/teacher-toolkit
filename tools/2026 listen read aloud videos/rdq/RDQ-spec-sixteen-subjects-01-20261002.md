---
rdq_version: 1
task: 16張圖片01雙聲線節奏朗讀完整版
date: 2026-10-02
status: confirmed
downstream: rhythm-vocabulary-video
---
# 16張圖片01製作規格

教師確認原話：「直接依 01–16 順序製作，允許兩輪單字與順序不同」。沿用已確認正式樣式，不重問聲線、語速或試片選擇。

來源：`參考/HWG5/16張圖片 01`，16個檔案依數字排列，不以字母重排。

- 第一輪01–08：PE、English、Chinese、music、math、art、science、social studies。
- 第二輪09–16：PE、MUSIC、math、SCIENCE、English、Chinese、computer、social studies。
- 顯示字沿用檔名大小寫；MUSIC及SCIENCE朗讀仍是一般單字，PE讀P、E。圖中的星期及手寫字不另作朗讀。
- 每張老師marin一次、兒童感coral一次，共32次；16張分兩輪，允許不同詞序／內容。
- 所有圖片本機處理，保留來源、手繪、手寫及色彩；沿用已完成圖卡，不重畫。08與16為同一張social studies圖片，兩輪皆保留。
- 0.85倍且保留音高，約93.673469 BPM。18段既有正式語音可完整覆蓋九種詞語；本次新增API請求0次。
- 依每段自然發音及已檢查重音重新排拍；預計82.5秒、2475格，驗證以成片實際數值為準。
- 黑板、圖卡下落／輕擺／上退與下方英文；不增加老師、兒童、輪次、速度或題號字卡。
- 1080p／30fps、H.264／yuv420p、AAC48kHz；片頭、輪次間與尾段沿用正式圖卡總覽。
- 交付完整MP4、預覽、配對表、時間軸、分軌、節拍檢聽及QA；保存於G槽新版本。雲端讀回確認名稱、格式及大小後提供連結，保持既有權限。

驗收：實際編碼32個朗讀畫面、兩輪來源／詞序、每詞兩聲、音訊讀回對拍、無截尾／重疊／削峰、完整解碼、實際1×全片瀏覽器播放及16次跳轉。自動檢查與教師視聽驗收分開，新片完成後仍交教師驗收。

設定與配對：`analysis/sixteen-subjects-01-20261002/job-config.json`及`image-word-mapping.csv`。
輸出：`productions/sixteen-subjects-01-20261002/v01-B085-clean/segment-01/`。
