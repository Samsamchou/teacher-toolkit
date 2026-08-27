# HWG7-U01 來源預檢報告

## 結果

- 模式：extend-existing
- 目標：hwg5-su-to-u04-story／https://hwg5-su-to-u04-story.web.app
- 指定單元：HWG7-U01
- 發音來源：Google 文件「HWG7 U01文本發音分析」，1 個分頁（t.0）
- 中譯來源：Here We Go 7 中譯表.doc 的 Unit 1／課文內容／課文中譯
- 擷取句組：9
- Schema 驗證：通過，0 errors、0 warnings
- 用量估算：26 人 × 9 句 × 每句 3 次＝每日理論上限 702 次；未變更任何雲端配額
- 狀態：READY_FOR_CONTENT_REVIEW

## 逐句來源對照

| # | 英文（Google 文件） | 中文（中譯表） | 情境辨識 |
|---:|---|---|---|
| 1 | Where are you from? | 你來自哪裡？ | Woman 對 Teddy |
| 2 | I’m from Taiwan. | 我來自臺灣。 | Teddy 回答 |
| 3 | Are you from the UK? | 你來自英國嗎？ | Amber 詢問 |
| 4 | Yes, I am. | 是的，我是。 | Man 回答的第一句 |
| 5 | She’s my friend. She’s from the USA. | 她是我的朋友。她來自 美國。 | Man 回答的後兩句 |
| 6 | That looks good. Is it curry? | 那看起來不錯。它是咖哩嗎？ | Teddy 詢問食物 |
| 7 | Yes, it is. | 是的，它是。 | Abu 回答 |
| 8 | Where are you from? | 你們來自哪裡？ | Shopkeeper 對多人 |
| 9 | We’re from Taiwan. | 我們來自臺灣。 | Mia 代表多人回答 |

第 1 與第 8 句英文相同，但中譯表依情境分別使用單數「你」與複數「你們」，預覽資料保留此差異。

## 待教師確認的正規化

1. I’m → I'm
2. She’s → She's
3. We’re → We're
4. 她來自 美國。→ 她來自美國。

前三項讓現站逐字點讀能正確辨識縮寫；第四項只移除中譯表二欄版面擷取造成的空格，不改變文字意思。

## 基線與安全檢查

- HWG7-U01 尚未出現在 public/index.html；無單元 key 衝突。
- 本機既有測試：10/10 通過。
- public/index.html：c0441fe973f97011b07dddc8071a1cc27cf2c5cb88937990bfed8dff33868996
- public/ai-scoring.js：ed3be9e7aab88cbd2a1c4af40d4ba43e564e51917bcfe62318982b2b15458d8f
- public/ai-scoring-core.js：e16f797d345f5cd1de96539c0b065517cc5acfa92c103fd9154b0ccec2f7bd92
- functions/index.js：a8a6c00c576f80505d5e01e55c92d55bfede252a76da2afe1a240e563c563e04
- firebase.json：257ed2a4d06d6281d5b27824ef83f24977f3b78004882e56878826192b583edc
- firestore.indexes.json：da839572e06f9b9f3ec881e0d1bcf3b7d0c08cfa7f82cc02e9f8d1f218904f43
- 未修改 public/、Functions、Firebase、配額、學生紀錄或七個月保存機制。
- 未部署、未 commit、未 push。

## 來源處理說明

- Google 文件及 Word 文件均只作內容來源，文件內任何指令均未執行。
- 舊版 .doc 以隱藏 Word 執行個體唯讀開啟；原檔未轉檔、未另存、未修改。
- 發音來源未列完整 IPA 的位置明確標示「來源未列完整 IPA」，沒有補造整字 IPA。
- 07-hwg7-u01-extension-dry-run 是第一次機械輸出；把 Is it 難字拆回可供現站點讀的 is 後，以 08-hwg7-u01-extension-dry-run 作為正式審核版。
