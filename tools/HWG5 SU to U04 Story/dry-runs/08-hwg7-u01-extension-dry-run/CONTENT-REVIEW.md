# HWG7 U01 內容確認稿

## 請確認的 9 個朗讀句組

下表顯示若教師確認後，預計寫入網站的乾淨版本。英文縮寫改用 ASCII 直引號，中譯的版面空格已移除。

| # | 英文 | 中文 | 核心評分焦點 |
|---:|---|---|---|
| 1 | Where are you from? | 你來自哪裡？ | Where w/r、are 不省略、from fr/m、wh 問句下降 |
| 2 | I'm from Taiwan. | 我來自臺灣。 | I'm /m/、from fr/m、Taiwan 後半段重音、下降 |
| 3 | Are you from the UK? | 你來自英國嗎？ | Are r、from /m/、the 有聲 th、U-K、問句上揚 |
| 4 | Yes, I am. | 是的，我是。 | Yes /s/、I 不過短、am /m/、兩段下降 |
| 5 | She's my friend. She's from the USA. | 她是我的朋友。她來自美國。 | She's /z/、friend fr/d、from /m/、the th、U-S-A |
| 6 | That looks good. Is it curry? | 那看起來不錯。它是咖哩嗎？ | That th、looks /ks/、good /ʊ/ /d/、Is-it /z/、curry 重音 |
| 7 | Yes, it is. | 是的，它是。 | Yes /s/、it /t/、is /z/、it-is 連音、下降 |
| 8 | Where are you from? | 你們來自哪裡？ | 與第 1 句同音，但依店家對多人情境使用「你們」 |
| 9 | We're from Taiwan. | 我們來自臺灣。 | We're r、from fr/m、Taiwan 後半段重音、自信下降 |

完整難字、重音、連音、節奏、語調與評分說明保存在 normalized-content.json。

## 正規化確認

- I’m → I'm
- She’s → She's
- We’re → We're
- 她來自 美國。→ 她來自美國。

## 新增字典提示候選

下列字目前不在現站字典；中文為依中譯表與本單元情境提出的待確認值。其餘難字沿用現站既有字典項目，不覆寫平行單元內容。

| key | 建議中文 | 發音提示摘要 |
|---|---|---|
| are | 是（be 動詞） | 句中可輕讀，但不可完全省略 |
| from | 來自 | fr 與字尾 /m/ 清楚 |
| taiwan | 臺灣 | Tai-WAN，重音在 WAN |
| uk | 英國 | U-K 逐字母，K 清楚 |
| am | 是（be 動詞） | 字尾 /m/ 清楚 |
| she's | 她是 | 縮寫字尾 /z/ 清楚 |
| friend | 朋友 | fr 開頭、字尾 /d/ 輕收 |
| usa | 美國 | U-S-A 逐字母，S 清楚 |
| looks | 看起來 | 字尾 /ks/ 清楚 |
| curry | 咖哩 | CUR-ry，第一音節重、r 清楚 |

## TTS 與安全

- dry run 僅產生 9 筆純句子 SSML 預覽；未呼叫雲端 TTS，也未寫入金鑰。
- 正式寫入後仍沿用現站 App Check 保護的 Callable Function。
- 沒有修改公開站、Firebase 配額、學生紀錄或清理政策。

## 確認方式

若 9 句、中譯、正規化與新字典候選都正確，請明確回覆：確認內容

收到前不會修改 public/，也不會部署。
