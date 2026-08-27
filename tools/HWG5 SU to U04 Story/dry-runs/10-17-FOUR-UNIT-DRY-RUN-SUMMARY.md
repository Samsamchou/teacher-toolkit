# HWG7 U02–U04 與 HWG5 U04 四單元 dry run 摘要

日期：2026-08-27

## 產物與結果

| 單元 | 句數 | 來源預檢 | 隔離 dry run | 理論每日評分上限 | 驗證 |
|---|---:|---|---|---:|---|
| HWG7 U02 | 8 | `10-hwg7-u02-source-preflight` | `11-hwg7-u02-extension-dry-run` | 624 | 0 error、0 warning |
| HWG7 U03 | 8 | `12-hwg7-u03-source-preflight` | `13-hwg7-u03-extension-dry-run` | 624 | 0 error、0 warning |
| HWG7 U04 | 9 | `14-hwg7-u04-source-preflight` | `15-hwg7-u04-extension-dry-run` | 702 | 0 error、0 warning |
| HWG5 U04 | 9 | `16-hwg5-u04-source-preflight` | `17-hwg5-u04-extension-dry-run` | 702 | 0 error、0 warning |

總計 34 句。用量估算採 26 人、每題每日最多計分 3 次；這只是理論上限，未變更任何 Firebase 配額。

## 待教師確認的正規化

- HWG7 U02：`You’re` → `You're`、`We’re` → `We're`
- HWG7 U03：無
- HWG7 U04：第 2、7 句 `o’clock` → `o'clock`
- HWG5 U04：第 7、9 句 `doesn’t` → `doesn't`

正規化是為了符合現站逐字點讀 tokenizer；來源文字仍保存在 source preflight JSON 中。

## read-back QA

- 10–17 號 dry-run 產物共 28 個 JSON，全部可解析。
- 4 個目標 key 均未與現有題庫碰撞：`HWG7-U02`、`HWG7-U03`、`HWG7-U04`、`HWG5-U04`。
- 4 份 change plan 均為 `sourceModified=false`、`deployed=false`。
- 7 個正式來源／測試設定檔的 SHA-256 與 dry run 前相同。
- 既有站測試以 Node 同程序模式執行，12/12 通過。
- 10–17 號產物未偵測到 API key、private key 或 App Check debug token。

## 閘門

本輪沒有修改 `public/`、沒有部署、沒有推送 GitHub、沒有改動 Firebase 配額或保存政策。教師確認四份 `CONTENT-REVIEW.md` 後，明確回覆 `確認內容`，才可開始本機來源實作；正式部署仍需另行確認。
