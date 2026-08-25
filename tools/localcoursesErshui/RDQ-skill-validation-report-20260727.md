# RDQ Skill 安裝與正式驗證報告

- 日期：2026-07-27
- 使用者確認：`照這份開始`
- 來源：`C:\Users\User\Downloads\rdq-skill-chatgpt-app-main\rdq-skill-chatgpt-app-main\skills\rdq`
- Codex 安裝位置：`C:\Users\User\.codex\skills\rdq`
- ChatGPT 安裝位置：ChatGPT Skills（Installed／Created by me）
- 內容修改：無
- Git 操作：無 commit、無 push

## 一、安裝結果

| 項目 | 結果 | 證據 |
|---|---|---|
| 來源技能正式驗證 | 通過 | 官方 `quick_validate.py` 回傳 `Skill is valid!` |
| Codex 本機安裝 | 通過 | 官方安裝程式回傳 `Installed rdq to C:\Users\User/.codex/skills/rdq` |
| 安裝後正式驗證 | 通過 | 安裝目標再次回傳 `Skill is valid!` |
| 檔案完整性 | 通過 | 來源與安裝目標皆為 5 個檔案；逐檔 SHA-256 全部一致 |
| ChatGPT Skills 上傳 | 通過 | ChatGPT 顯示 `Skill uploaded`；`rdq` 同時出現在 Installed 與 Created by me |

## 二、逐檔完整性

| 檔案 | SHA-256 | 一致 |
|---|---|---|
| `SKILL.md` | `B55A09C0C0006B5F7E7CA99BB2A6C2965B3205D27506FFAF4081CE72C512BCD7` | 是 |
| `agents/openai.yaml` | `42EF474901003B3EC896715299FB0C402F54A32BD61608F071EC1DD2E71E4918` | 是 |
| `references/method-positioning.md` | `18B396C13CCD6E83AAD2228CCAB3225C8D41D6D2B3641993A86104C9AFC56433` | 是 |
| `references/question-bank.md` | `BE44727677E18DE894BC5B773C6ECEF502BAFABBD3985D31F97BB2FA1443E393` | 是 |
| `references/spec-template.md` | `2F1E3ECAB7837313FAA0D7AC4BA82A1B34030EC94ADCE99C284E79482A6C036D` | 是 |

## 三、ChatGPT 行為驗證

### 正確啟用方式

目前確認可可靠啟用技能的路徑是：

1. 開啟 ChatGPT 的 **Skills**。
2. 選擇 **rdq**。
3. 按 **Try in chat**。
4. ChatGPT 切換到 **Work**，輸入框及 Sources 顯示真正的 `rdq` 技能標籤。

在一般 Chat 輸入框只輸入 `@rdq`，目前不會解析成技能標籤；僅輸入「用 RDQ」也不保證套用完整技能規則。

### 正式測試矩陣

| 測試 | 輸入摘要 | 預期 | 實際結果 | 判定 |
|---|---|---|---|---|
| 應觸發 | 四年級跨領域在地課程，要求先依 RDQ 釐清 | 擷取 Known Knowns、至多 3 題、同訊息提供象限Ⅳ建議、不製作成品 | 真正啟用 RDQ，完成已知資訊摘要且未製作成品；但判為 Full、提出 4 題，象限Ⅳ延至下一輪 | 部分通過 |
| 不應觸發 | 用一句話解釋形成性評量 | 直接回答，不啟動 RDQ | 回覆一個句子，沒有訪談 | 通過 |
| 直接執行 | 把「明天交報告」改寫為正式提醒句，不要訪談 | 停止訪談並直接改寫 | 回覆「提醒您，請於明日完成並繳交報告。」 | 通過 |
| 零問題收斂 | 對象、格式、節數、時間、語言、欄位與限制均已完整，要求直接產出規格卡 | 0 題，產出 `draft` 規格卡，停在確認點 | 回報資訊足夠；telemetry 為 `rounds: 0`、`questions: 0`；產出完整 `draft` 規格卡並要求「照這份開始」 | 通過 |

## 四、額外啟用測試

| 方式 | 結果 |
|---|---|
| 一般 Chat 輸入「用 RDQ 幫我先釐清……」 | 未完整套用技能：只做單題一般訪談，且額外搜尋網路 |
| 一般 Chat 輸入純文字 `@rdq` | 未轉換為技能標籤，等同一般文字 |
| Skills → rdq → Try in chat | 成功載入 RDQ；Work 的 Sources 顯示 `rdq` |

## 五、結論

RDQ 已完成 Codex 本機安裝、ChatGPT Skills 上傳、結構驗證與逐檔完整性驗證。四項正式行為測試中，三項通過、一項部分通過。主要限制是 ChatGPT 目前必須透過 **Skills → rdq → Try in chat** 可靠啟用；啟用後的訪談仍出現「4 題、象限Ⅳ延後」的行為差異。

Codex 需重新啟動，才會在新工作階段中重新掃描並自動發現剛安裝的本機技能。
