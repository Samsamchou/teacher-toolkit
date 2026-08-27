# HWG5 U04 內容確認稿

## 請確認的 9 個朗讀句組

| # | 英文（預計寫入版本） | 中文 | 核心評分焦點 |
|---:|---|---|---|
| 1 | How many zebras are there? | 有幾隻斑馬？ | How h、many 第一音節、zebras z/複數 z、are 不消失、there th/r、下降 |
| 2 | One, two, three! | 一、二、三！ | One /w/、two /uː/、three /θ/ 與 r、三段節奏、three 下降 |
| 3 | There are three zebras. | 有三隻斑馬。 | There th/r、are 不消失、three /θ/、zebras 複數 /z/、肯定下降 |
| 4 | Bye, zebras. | 再見，斑馬們。 | Bye /aɪ/、停頓、zebras z/複數 z、友善下降 |
| 5 | Take care! | 保重！ | Take /k/、care k/r、Take-care 連音、溫暖下降 |
| 6 | This lion is hungry! | 這隻獅子餓了！ | This /ð/、lion 兩音節、is /z/、hungry h 與第一音節、緊張下降 |
| 7 | Rocky doesn't like tigers. | Rocky 不喜歡老虎。 | Rocky r、doesn't z/t、like /k/、tigers 複數 /z/、下降 |
| 8 | Does he like lions? | 他喜歡獅子嗎？ | Does /z/、he /iː/、like /k/、lions /z/、yes/no 問句上揚 |
| 9 | No, he doesn't, I guess. | 不，我猜他不喜歡。 | No 短清楚、he /iː/、doesn't z/t、I /aɪ/、guess g/s、三段下降 |

完整難字、重音、連音、節奏、語調與評分說明保存在 `normalized-content.json`。

## 正規化確認

- 第 7、9 句：`doesn’t` → `doesn't`

## 新增字典提示候選

| key | 建議中文 |
|---|---|
| bye | 再見 |
| care | 保重／照顧 |
| doesn't | 不（第三人稱否定） |
| guess | 猜 |
| how | 如何／多少（依句意） |
| hungry | 餓的 |
| lion | 獅子 |
| lions | 獅子（複數） |
| many | 許多／幾 |
| one | 一 |
| take | 拿；`Take care` 表示保重 |
| this | 這／這隻 |
| three | 三 |
| tigers | 老虎（複數） |
| two | 二 |
| zebras | 斑馬（複數） |

## TTS 與安全

- dry run 僅產生 9 筆純句子 SSML 預覽；未呼叫雲端 TTS，也未寫入金鑰。
- 正式寫入後仍沿用現站 App Check 保護的 Callable Function。
- 沒有修改公開站、Firebase 配額、學生紀錄或清理政策。

收到教師 `確認內容` 前，不會修改 `public/`，也不會部署。
