# HWG7-SU 題庫內容審核

## 目標與閘門

- 模式：`extend-existing`
- 目標專案：`hwg5-su-to-u04-story`
- 正式網址：`https://hwg5-su-to-u04-story.web.app`
- 題庫 key：`HWG7-SU`（現站尚不存在）
- 句數：6
- 用量估算：26 人 × 6 句 × 每句 3 次＝每日理論上限 468 次
- 目前狀態：`DRY_RUN_ONLY`；未修改網站來源、未部署

## 逐句回讀

### 1. Would you like some beef sandwiches?

- 中文：你想要一些牛肉三明治嗎？
- 難字：Would `/d/`、like `/k/`、some `/səm/`、beef `/iː/ /f/`、sandwiches `/tʃ/ /ɪz/`
- 重音：Would、like、beef、sandwiches
- Chunk：Would you / like some / beef sandwiches?
- 連音：Would-you；like-some，但 `/k/` 要保留；beef sandwiches 要清楚
- 語調：禮貌 yes/no question，句尾上揚
- 評分焦點：字尾、長音、複數與問句上揚
- SSML：自動純文字推導 `<speak>Would you like some beef sandwiches?</speak>`，尚未人工聽讀

### 2. Yes, please.

- 中文：好，麻煩了。
- 難字：Yes `/s/`、please `/pl/ /iː/ /z/`
- 重音：Yes、please
- Chunk：Yes, / please.
- 連音：可連成 Yes-please，但兩個字尾都要清楚
- 語調：兩個詞都下降，溫和有禮貌
- 評分焦點：兩個字尾、pl 與禮貌下降語調
- SSML：自動純文字推導 `<speak>Yes, please.</speak>`，尚未人工聽讀

### 3. I'd like some cheeseburgers.

- 中文：我想要一些起司漢堡。
- 正規化：教師已同意 `I’d` → `I'd`
- 難字：I'd `/d/`、like `/k/`、some `/səm/`、cheeseburgers `/tʃ/ /z/ /r/ /z/`
- 重音：I'd、like、cheeseburgers 核心音節
- Chunk：I'd like / some cheeseburgers.
- 連音：I'd-like；like-some，但 `/k/` 不可消失
- 語調：清楚肯定，句尾下降
- 評分焦點：縮寫、字尾、弱讀與 cheeseburgers 的 ch/r/z
- SSML：自動純文字推導 `<speak>I'd like some cheeseburgers.</speak>`，尚未人工聽讀

### 4. Whose soda is that on the chair?

- 中文：椅子上是誰的汽水？
- 難字：Whose `/huːz/`、soda long o、is `/z/`、that/the 有聲 th、chair `/tʃ/ + air`
- 重音：Whose、soda、that、chair
- Chunk：Whose soda / is that / on the chair?
- 連音：Whose-soda-is、that-on、on-the-chair；Whose `/z/` 與 the 不可消失
- 語調：wh-question，句尾下降
- 評分焦點：Whose、th/ch、連音與下降語調
- SSML：自動純文字推導 `<speak>Whose soda is that on the chair?</speak>`，尚未人工聽讀

### 5. It's my soda.

- 中文：它是我的汽水。
- 正規化：教師已同意 `It’s` → `It's`
- 難字：It's `/ts/`、my `/aɪ/`、soda long o
- 重音：It's、my、soda
- Chunk：It's / my soda.
- 連音：It's-my，但 `/ts/` 不可吞掉
- 語調：明確回答所有權但不生氣，句尾下降
- 評分焦點：縮寫、所有格重點與下降語調
- SSML：自動純文字推導 `<speak>It's my soda.</speak>`，尚未人工聽讀

### 6. Watch out!

- 中文：小心！
- 難字：Watch `/tʃ/`、out `/aʊ/ /t/`
- 重音：Watch、out
- Chunk：Watch / out!
- 連音：Watch-out，但兩個字尾都要聽得到
- 語調：短促、有力的警告，out 下降
- 評分焦點：字尾、連音與警告語氣
- SSML：自動純文字推導 `<speak>Watch out!</speak>`，尚未人工聽讀

## 新字典候選（尚未寫入）

以下 7 個字已存在現站字典並沿用：`yes`、`is`、`that`、`the`、`it's`、`watch`、`out`。

以下 12 個新字的中文提示是依教師確認的句子翻譯整理的候選值，需與整份內容一起確認：

| 字詞 | 候選中文提示 |
|---|---|
| would | 願意／會（禮貌邀請） |
| like | 想要／喜歡 |
| some | 一些 |
| beef | 牛肉 |
| sandwiches | 三明治（複數） |
| please | 請／麻煩了 |
| i'd | 我想要（I would 的縮寫） |
| cheeseburgers | 起司漢堡（複數） |
| whose | 誰的 |
| soda | 汽水 |
| chair | 椅子 |
| my | 我的 |

## 確認效果

回覆 `確認內容` 代表教師同意：

1. 上述 6 句英文、中文、順序與發音分析。
2. `I'd / It's` 使用直引號。
3. 12 個新字典候選中文提示。
4. 先以純文字 SSML 建立本機版，並在部署前完成人工聽讀與必要調整。

這只允許寫入並測試本機網站來源，不代表正式部署或 GitHub push。
