---
title: HWG5 U01 Lesson 1 Vocabulary Quiz 題庫審核稿
revision: 1
data_file: HWG5-U01-L1-vocabulary-quiz-r1.json
review_status: approved_teacher_2026-09-07
question_count: 14
---

# HWG5 Unit 1 Lesson 1 Vocabulary Quiz 題庫審核稿（r1）

請逐題確認圖片／音檔、四個選項與正解。此文件中的選項順序固定，只供審核；學生正式作答時，每題四個選項才會隨機打散。

## 共通規則

- Type A 與 Type B 各 7 題，依 Sunday–Saturday 排列；正式作答先完成 Type A，再進入 Type B。
- 每題固定四個英文文字選項、唯一正解與固定 questionId。
- 圖片原檔為 1600×1151 JPG，永久保留不覆寫；Quiz 專用圖已另存為 1488×1072 JPG，完整日曆置中且未裁切。
- Quiz 專用圖已移除中文星期、左上角教材緞帶及底部教材字樣，只保留日曆日期與 Sun.–Sat. 英文縮寫，因此 Type A 是由縮寫辨識完整星期單字的題型。
- Type B 使用教師核准的 7 個原始 MP3；原檔不覆寫，網站僅另存安全檔名。若日後發現內容錯誤，會先回報，不會自行以 TTS 取代。

## 圖片編修 QA

- 編修方式：OpenAI Images API `gpt-image-2` masked edit，medium JPEG；每張均附相鄰 JSON 來源紀錄。
- 7 張均已逐張目視確認：無中文、英文縮寫正確、日期數字正確、主體完整、無裁切、兒童教學適用。
- 7 張輸出檔 SHA-256 均與相鄰 JSON 紀錄一致。

## Type A：Look and Choose（7 題）

原圖資料夾：HWG5 單字圖卡/HWG5U1

Quiz 圖片資料夾：generated-images/20260907/hwg5-u01-weekdays-no-chinese

| 題號 | questionId | 圖片檔 | 題幹 | 選項 1 | 選項 2 | 選項 3 | 選項 4 | 正解 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | hwg5-u01-l1-a01 | 01_Sunday.jpg → 01-sunday-no-chinese.jpg | Look at the picture. What day is it? | Monday | Sunday | Friday | Wednesday | Sunday |
| 2 | hwg5-u01-l1-a02 | 02_Monday.jpg → 02-monday-no-chinese.jpg | Look at the picture. What day is it? | Thursday | Saturday | Monday | Tuesday | Monday |
| 3 | hwg5-u01-l1-a03 | 03_Tuesday.jpg → 03-tuesday-no-chinese.jpg | Look at the picture. What day is it? | Tuesday | Wednesday | Sunday | Friday | Tuesday |
| 4 | hwg5-u01-l1-a04 | 04_Wednesday.jpg → 04-wednesday-no-chinese.jpg | Look at the picture. What day is it? | Monday | Thursday | Saturday | Wednesday | Wednesday |
| 5 | hwg5-u01-l1-a05 | 05_Thursday.jpg → 05-thursday-no-chinese.jpg | Look at the picture. What day is it? | Sunday | Thursday | Tuesday | Saturday | Thursday |
| 6 | hwg5-u01-l1-a06 | 06_Friday.jpg → 06-friday-no-chinese.jpg | Look at the picture. What day is it? | Wednesday | Monday | Friday | Sunday | Friday |
| 7 | hwg5-u01-l1-a07 | 07_Saturday.jpg → 07-saturday-no-chinese.jpg | Look at the picture. What day is it? | Saturday | Tuesday | Thursday | Friday | Saturday |

## Type B：Listen and Choose（7 題）

音檔來源資料夾：HWG5 單字圖卡/HWG5U1/mp3

| 題號 | questionId | 音檔 | 題幹 | 選項 1 | 選項 2 | 選項 3 | 選項 4 | 正解 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | hwg5-u01-l1-b01 | 01_Sunday.mp3 | Listen. What day do you hear? | Thursday | Tuesday | Sunday | Saturday | Sunday |
| 2 | hwg5-u01-l1-b02 | 02_Monday.mp3 | Listen. What day do you hear? | Monday | Friday | Wednesday | Sunday | Monday |
| 3 | hwg5-u01-l1-b03 | 03_Tuesday.mp3 | Listen. What day do you hear? | Saturday | Tuesday | Thursday | Monday | Tuesday |
| 4 | hwg5-u01-l1-b04 | 04_Wednesday.mp3 | Listen. What day do you hear? | Friday | Sunday | Monday | Wednesday | Wednesday |
| 5 | hwg5-u01-l1-b05 | 05_Thursday.mp3 | Listen. What day do you hear? | Thursday | Saturday | Tuesday | Wednesday | Thursday |
| 6 | hwg5-u01-l1-b06 | 06_Friday.mp3 | Listen. What day do you hear? | Sunday | Wednesday | Friday | Monday | Friday |
| 7 | hwg5-u01-l1-b07 | 07_Saturday.mp3 | Listen. What day do you hear? | Tuesday | Thursday | Sunday | Saturday | Saturday |

## 教師審核

- [x] 核准 7 張 Quiz 專用圖片
- [x] 核准 Type A 全部 7 題
- [x] 核准 Type B 全部 7 題
- 核准日期：2026-09-07
- 核准依據：教師回覆「核准 7 張圖片與 14 題題庫」。

## 網站接入與驗證

- 接入位置：HWG5 → Unit 1 → Lesson 1。
- 網站題庫：`preview/config/hwg5-u01-l1-vocabulary-quiz.json`，與本審核稿對應 JSON 的 SHA-256 完全一致。
- 網站素材：7 張圖片位於 `/assets/hwg5-u01/days/`；7 個 MP3 位於 `/assets/hwg5-u01/audio/`。
- 通過題庫與素材雜湊驗證、79 項 Node 測試、Vite 正式建置及 1920×1080 Chrome 預覽；預覽未完成作答，因此沒有送出 Firestore 成績。
