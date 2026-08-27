# HWG7 U02 內容確認稿

## 請確認的 8 個朗讀句組

| # | 英文（預計寫入版本） | 中文 | 核心評分焦點 |
|---:|---|---|---|
| 1 | Where are we? | 我們在哪裡？ | Where r、are 不省略、we 不過短、wh 問句下降 |
| 2 | You're on a boat. | 你們在船上。 | You're r、on-a 連音、boat /oʊ/ /t/、肯定下降 |
| 3 | Where are you going? | 你們要去哪裡？ | Where r、are 不省略、going /ŋ/ 不加尾音、問句下降 |
| 4 | We're going to school. | 我們要去上學。 | We're r、going /ŋ/、to 不消失、school /sk/ /uː/ /l/ |
| 5 | By boat? | 搭船嗎？ | By /aɪ/、boat /t/、確認式問句上揚 |
| 6 | Yes. How do you go to school? | 是的。你們如何上學？ | Yes /s/、How h/aʊ、do 不省略、school /sk/ /l/、兩段下降 |
| 7 | I go to school on foot. | 我走路上學。 | school /sk/ /uː/ /l/、foot 短音 /ʊ/ /t/、平穩下降 |
| 8 | He goes to school by car. | 他搭車上學。 | goes /z/、school /sk/ /l/、by /aɪ/、car r、下降 |

完整難字、重音、連音、節奏、語調與評分說明保存在 `normalized-content.json`。

## 正規化確認

- `You’re` → `You're`
- `We’re` → `We're`

## 新增字典提示候選

既有字典項目會沿用，不覆寫。以下是此單元尚未存在的 key；完整發音提示依來源分析。

| key | 建議中文 |
|---|---|
| boat | 船 |
| by | 搭乘／藉由 |
| car | 汽車 |
| foot | 腳；`on foot` 表示走路 |
| goes | 去（第三人稱） |
| how | 如何／怎麼 |
| school | 學校 |
| you're | 你／你們是、在（You are 縮寫） |

## TTS 與安全

- dry run 僅產生 8 筆純句子 SSML 預覽；未呼叫雲端 TTS，也未寫入金鑰。
- 正式寫入後仍沿用現站 App Check 保護的 Callable Function。
- 沒有修改公開站、Firebase 配額、學生紀錄或清理政策。

收到教師 `確認內容` 前，不會修改 `public/`，也不會部署。
