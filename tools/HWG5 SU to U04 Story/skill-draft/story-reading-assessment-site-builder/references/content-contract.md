# 內容契約

所有輸入以 UTF-8 JSON 儲存。`schemaVersion` 目前固定為 `1.0`。

## 共通結構

```json
{
  "schemaVersion": "1.0",
  "mode": "extend-existing",
  "site": {
    "name": "網站名稱",
    "slug": "new-site-only",
    "targetProjectId": "hwg5-su-to-u04-story",
    "productionUrl": "https://hwg5-su-to-u04-story.web.app"
  },
  "teacherApproval": {
    "contentBankConfirmed": false,
    "installSkillConfirmed": false,
    "productionDeployConfirmed": false
  },
  "policy": {
    "classSize": 26,
    "maxScoredAttemptsPerItemPerDay": 3,
    "recordRetentionCalendarMonths": 7
  },
  "units": []
}
```

`mode` 只能是 `extend-existing` 或 `new-site`。新站需有小寫連字號 `site.slug`，且 `targetProjectId` 必須是 `null`；擴增站需指定既有專案 ID 與正式網址。

## 單元與句子

```json
{
  "theme": "HWG5",
  "unit": "U04",
  "label": "HWG5 Unit 4",
  "items": [
    {
      "id": "u04_1",
      "text": "The story sentence.",
      "translation": "故事句子的中文。",
      "pronunciation": {
        "difficultWords": [
          {
            "word": "story",
            "ipa": "/ˈstɔːri/",
            "tip": "第一音節重；st 開頭要連續。"
          }
        ],
        "stress": "說明句重音。",
        "linking": "說明連音；若無，明寫『無特別連音』。",
        "rhythm": "說明節奏與意群。",
        "intonation": "說明句尾升降與語氣。",
        "scoringFocus": "給 AI 評分使用的一段精簡指示。"
      },
      "tts": {
        "ssml": "<speak>The <emphasis level='strong'>story</emphasis> sentence.</speak>"
      }
    }
  ]
}
```

## 驗證規則

- theme、unit、item ID 只用英數、底線或連字號；每個層級不可重複。
- `text`、`translation`、六項發音分析不可空白。
- `difficultWords` 必須是陣列。沒有難字時可為空陣列，但仍要完成其餘分析。
- `tts.ssml` 可省略；若提供，必須是完整 `<speak>...</speak>`。省略時 dry run 只建立安全的純文字 SSML 預覽，教師仍須聽讀校準。
- 輸入不可含 Firebase `apiKey`、reCAPTCHA key、debug token、服務帳戶私鑰或其他秘密。
- dry run 樣本不得冒充教師正式題庫；`teacherApproval.contentBankConfirmed` 必須保持 `false`。

## 教師回讀格式

確認前至少顯示：網站名稱、模式、theme/unit、句數、每句英文、中文、難字與評分焦點。任何自動正規化或 SSML 推導都要明確標示。
