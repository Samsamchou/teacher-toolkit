# HWG7-SU 來源預檢報告

## 結果

- 模式：`extend-existing`
- 目標：`hwg5-su-to-u04-story`／`https://hwg5-su-to-u04-story.web.app`
- 指定單元：`HWG7-SU`
- Google 文件：`HWG7 SU文本發音分析`
- 文件分頁：1（`t.0`）
- 擷取句數：6
- 用量估算：26 人 × 6 句 × 每句 3 次＝每日理論上限 468 次；目前不變更任何雲端配額。
- 來源已提供：英文文本、困難音、重音、連音、chunk／節奏、語調與情境。
- 必要缺口：6 句皆缺少教師確認的正式中文翻譯。
- 狀態：`BLOCKED_BEFORE_DRY_RUN`

## 題庫回讀

| # | 英文文本 | 中文翻譯 | 主要難字／音 | 評分焦點摘要 |
|---:|---|---|---|---|
| 1 | Would you like some beef sandwiches? | **未提供** | Would /d/、like /k/、some /səm/、beef /iː/ /f/、sandwiches /tʃ/ /ɪz/ | 字尾、長音、複數與 yes/no 問句上揚 |
| 2 | Yes, please. | **未提供** | Yes /s/、please /pl/ /iː/ /z/ | 兩個字尾與禮貌下降語調 |
| 3 | I’d like some cheeseburgers. | **未提供** | I’d /d/、like /k/、some /səm/、cheeseburgers ch/r/z | 縮寫、字尾、弱讀與肯定下降語調 |
| 4 | Whose soda is that on the chair? | **未提供** | Whose /huːz/、soda、is /z/、that/the 有聲 th、chair /tʃ/ | 連音、th/ch 與 wh-question 下降語調 |
| 5 | It’s my soda. | **未提供** | It’s /ts/、my /aɪ/、soda | 縮寫、所有格重點與下降語調 |
| 6 | Watch out! | **未提供** | Watch /tʃ/、out /aʊ/ /t/ | 字尾、連音與短促有力的警告語氣 |

## 待教師確認

1. 請提供以上 6 句的正式中文翻譯。
2. 是否同意將彎引號 `I’d / It’s` 正規化為直引號 `I'd / It's`？這能讓現站逐字點讀正確辨識縮寫，不改變句子字詞。

## 安全與變更狀態

- 現站已有 `HWG7` 主題按鈕與 `SU` 單元按鈕，但題庫中尚無 `HWG7-SU` key。
- 沒有修改 `public/`、Functions、Firebase 設定、學生紀錄、配額或七個月保存機制。
- 沒有產生 SSML；待內容確認後才依教師發音分析建立並回讀。
- 沒有執行正式 dry run、部署、Git commit 或 GitHub push。

收到完整翻譯與引號決定後，才會生成可通過 schema 的內容檔並執行 `dry-run-extend`。dry run 通過後仍需教師回覆 `確認內容`，才可寫入本機網站來源。
