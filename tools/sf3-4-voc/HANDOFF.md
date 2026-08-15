# SF3–SF4 單字練習網站交接紀錄

最後更新：2026-08-10 15:02（Asia/Taipei）
專案路徑：`C:\firebase-deploy\SF3-4 VOC`
目前階段：已部署至 Firebase；OpenAI TTS、匿名登入與 App Check 已完成正式站驗證。

## 上次做到哪

- 使用者已確認單字內容，可以繼續建置；`site/config/build-manifest.json` 的 `sourceConfirmed` 為 `true`。
- 已依 Elementary Vocabulary Site Builder 建立完整本機網站。
- Firebase 正式部署已獲使用者授權並完成；Functions 與 Hosting 均已更新。
- Firebase 專案是 `sf3sf4voc`，正式網址是 `https://sf3sf4voc.web.app`。

## 已完成內容

- 2 冊、8 課、63 個單字。
- 63 張 640×640 progressive JPEG 單字圖片，均小於 320,000 bytes。
- 51 個原始 MP3；12 個單字使用後端 TTS 備援。
- 16 張參考／生成圖片 contact sheets，已完成視覺檢查。
- 使用者指定新增的 driver、yard、study、frog、table、bag、forty-five、fifty、rice、tea 均已納入。
- SF3 Lesson 1 保留固定規則：男性只問 `Who's he?`，女性只問 `Who's she?`。
- SF3 Lesson 2、SF3 Lesson 4 各有 4 句否定答句；SF4 Lesson 4 為 4 句否定、5 句肯定。
- SF3 Lesson 3、SF4 Lesson 2、SF4 Lesson 3 的人物、物品與時間問答均已分散，避免重複。
- 除 SF3 Lesson 1 固定句型外，各課沒有重複的完整問句；所有課別沒有重複的完整答句。
- 問答多樣化與 Yes/No 肯否平衡原則已寫入 `Elementary Vocabulary Site Builder` 技能。

## 驗證結果

- 設定驗證：通過。
- Functions lint：通過。
- 專案完整性：2 冊、8 課、63 個單字、63 張圖片、51 個 MP3、12 個 TTS 備援；錯誤 0、警告 0。
- 本機瀏覽器 E2E：25 通過、20 依裝置／專案設計略過、0 失敗。
- 正式站匿名登入＋App Check：桌機通過。
- 正式站 OpenAI TTS：桌機通過 1 次；缺少 App Check 的請求正確被拒絕。
- 舊專案殘留字串：0 筆。
- 專案原始碼金鑰／私鑰：0 筆。
- 觸控與麥克風為 Chromium 模擬；正式測試的 iPad／手機案例依測試設計略過，尚未在實體裝置與真實學生語音上測試。

## Firebase 目標

| 項目 | 值 |
|---|---|
| Project ID | `sf3sf4voc` |
| Web App ID | `1:351311660417:web:372546105037d5eb5e9480` |
| Functions region | `asia-east1` |
| Storage bucket | `sf3sf4voc.firebasestorage.app` |
| Hosting URL | `https://sf3sf4voc.web.app` |
| Billing | Blaze |

Firebase Authentication、Cloud Firestore、Storage、Functions、Hosting 與 App Check 均已啟用；`OPENAI_API_KEY` Secret 版本 2 已綁定並套用至語音 Functions。教師登入所需的 `Service Account Token Creator` 最小 IAM 權限已授予 Functions 執行服務帳號，等待正式站重新測試 custom-token claim；配額與預算警示已檢視。

## 後續可選工作

先讀本檔與下列兩份報告，不要重新生成已完成的圖片或音訊：

- `site/audit/CONTENT_EXAMPLE_QA.md`
- `site/audit/DEPLOYMENT_REVIEW.md`

1. 等待 IAM 權限傳播後，在正式站重新測試教師 custom-token claim。
2. 若需要，開啟 App Check 服務層 enforcement，先觀察正式站流量。
3. 在實體 iPad／手機與真實學生語音上補做裝置測試。

## 同步狀態

- Git：此專案不是 Git repository，未建立 commit，也未推送 GitHub。
- Obsidian：既有交接紀錄曾搜尋 `SF3-4 VOC`、`sf3sf4voc`、`SF3 SF4`，未找到既有專案 driver/cockpit note；本次連接器基於私人 vault 安全限制拒絕重新搜尋，因此未建立新筆記。
- Google Drive：專案沒有指定同步目標，已略過。
- Firebase：Web App、服務初始化、Secret、Functions 與 Hosting 均已完成；正式站 TTS／App Check smoke test 已通過。

## 2026-08-10 收工補充

- 全域 `Elementary Vocabulary Site Builder` 已檢查；目前已涵蓋 SF3–SF4 本次要求的固定問句、多樣化問答、單課完整問答不可重複，以及 Yes/No 肯定／否定答句平衡原則。
- 本次已直接更新全域 `Elementary Vocabulary Site Builder`：補上教師 custom-token 的 IAM `Service Account Token Creator` 與權限傳播重測、Secret 版本更新後的 Functions 重部署／smoke test、問答重複與肯否比例自動化驗證，以及 Windows 部署腳本路徑與暫存輸出處理。
- 新部署閘門會要求上述 IAM／Secret 證據欄位；現有正式站 preflight 未回填未重新驗證的欄位，下一次正式部署前須完成證據記錄，不得以推測填值。
- 教師登入的 custom-token claim 仍待 IAM 權限傳播後於正式站重測；其餘正式部署與 TTS／App Check 驗證已記錄於本檔。

## 重要檔案

- 原始資料：`C:\firebase-deploy\SF3-4 VOC\單字資料`
- 根目錄 canonical source：`C:\firebase-deploy\SF3-4 VOC\site-source.json`
- 網站 canonical source：`C:\firebase-deploy\SF3-4 VOC\site\config\site-source.json`
- 部署 manifest：`C:\firebase-deploy\SF3-4 VOC\site\config\build-manifest.json`
- Firebase preflight：`C:\firebase-deploy\SF3-4 VOC\site\config\firebase-preflight.json`
- 完整驗證報告：`C:\firebase-deploy\SF3-4 VOC\site\audit\verify-project.json`
- 圖片 prompt 紀錄：`C:\firebase-deploy\SF3-4 VOC\site\audit\IMAGE_PROMPT_LOG.md`
