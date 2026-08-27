# HWG7 U04 內容確認稿

## 請確認的 9 個朗讀句組

| # | 英文（預計寫入版本） | 中文 | 核心評分焦點 |
|---:|---|---|---|
| 1 | What time do you get up, Joy? | Joy，你幾點起床？ | What /t/、time /aɪ/ /m/、do 不省略、get-up /t/、Joy /dʒ/、下降 |
| 2 | I get up at eight o'clock. | 我八點起床。 | I /aɪ/、get-up、at-eight、eight /t/、clock /k/、下降 |
| 3 | What do you do after breakfast? | 你早餐之後做什麼？ | do 不省略、after 第一音節、breakfast /br/ /f/ /st/、下降 |
| 4 | I make a snowman. | 我堆雪人。 | make /eɪ/ /k/、make-a、snowman sn 與第一音節重、下降 |
| 5 | I walk the reindeer. | 我遛馴鹿。 | walk 的 l 不發音與 /k/、the th、reindeer r/deer、下降 |
| 6 | What time does Santa go home? | 耶誕老人幾點回家？ | time /aɪ/ /m/、does /z/、Santa 重音、home h/oʊ、下降 |
| 7 | He goes home at twelve o'clock. | 他十二點回家。 | goes /z/、home h/oʊ、twelve /tw/ /v/、clock /k/、下降 |
| 8 | What does he do in his free time? | 他休閒時間做什麼？ | does /z/、he /iː/、his 不消失、free fr、time /aɪ/ /m/、下降 |
| 9 | He takes an ice bath. | 他泡冰浴。 | takes /ks/、an-ice、ice /s/、bath /θ/、驚訝但清楚下降 |

完整難字、重音、連音、節奏、語調與評分說明保存在 `normalized-content.json`。

## 正規化確認

- 第 2、7 句：`o’clock` → `o'clock`

## 新增字典提示候選

| key | 建議中文 |
|---|---|
| after | 之後 |
| bath | 浴／洗澡 |
| breakfast | 早餐 |
| eight | 八 |
| free | 空閒的 |
| get | 起身；`get up` 表示起床 |
| goes | 去／回去（第三人稱） |
| his | 他的 |
| home | 家／回家 |
| joy | Joy（人名） |
| make | 製作／堆 |
| o'clock | 點鐘 |
| reindeer | 馴鹿 |
| santa | 耶誕老人 |
| snowman | 雪人 |
| takes | 做／進行（第三人稱） |
| twelve | 十二 |
| walk | 走；此處為遛 |

## TTS 與安全

- dry run 僅產生 9 筆純句子 SSML 預覽；未呼叫雲端 TTS，也未寫入金鑰。
- 正式寫入後仍沿用現站 App Check 保護的 Callable Function。
- 沒有修改公開站、Firebase 配額、學生紀錄或清理政策。

收到教師 `確認內容` 前，不會修改 `public/`，也不會部署。
