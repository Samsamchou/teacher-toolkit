---
rdq_version: 1
edition: chatgpt-app
task: 修正全班 iPad 影片載入與續播失敗
domain: dev
date: 2026-09-20
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: self
---

# RDQ 需求規格：iPad 播放復原

## 一句話任務
修正正式歌曲聽力網站在全班 iPad 同時使用時無法啟用、播放停住及必須重新整理的問題。

## 已確認
- 現場為 **2026-09-14、19 台 iPad**；7 台失敗、5 台重新整理後恢復、2 台持續失敗。
- 影片失敗時先自動重試，仍失敗就切換較小且相容舊款 iPad 的影片，保留畫面與聲音。
- 中斷後保留學生作答進度，從當題原句句首恢復。
- 教師後台保存最小診斷：歌曲、失敗階段、錯誤代碼、iPadOS／Safari 大版本；不保存 IP 或 Cookie，保存 14 個月。
- 本機測試通過後，依既有授權部署正式 Firebase。

## 已採納建議
- 製作 H.264／AAC 輕量網路影片並保留原影片備援。
- 處理 waiting、stalled、網路切換及播放承諾失敗，避免整頁重新整理。
- 補齊舊版 Safari API 相容處理。
- 模擬至少 20 個同時影片連線，並保留實體 iPad 最終驗收項目。

## 本次不納入
- 不保存 IP、Cookie、完整 User-Agent 或其他可跨站追蹤資料。
- 不更改 15 題與 16 題題庫、配分、兩次作答及既有保存政策。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\English songs listening quiz** 修正正式網站的 iPad 播放流程：San Francisco 優先使用適合舊款 iPad 與全班 Wi-Fi 的 H.264／AAC 輕量影片，啟用或播放停滯時自動重試並在需要時切換備援；學生按恢復時保留學號、答案、分數與作答次數，從當題原句句首播放；加入 Safari 相容處理與清楚狀態提示；把不含 IP、Cookie、完整 User-Agent 的最小故障診斷保存至 Firebase，教師後台可依日期查閱，且依練習開始時間於 14 個月後清除；完成本機、自動化、20 路 Range 請求與正式站讀回驗證後部署。

## 驗收條件
- [ ] 啟用、開始、答題後續播與停滯恢復不需重新整理，恢復時從當題原句句首播放且作答次數不變。
- [ ] 輕量影片可由舊款 iPad 相容格式分段載入，20 路 Range 測試通過。
- [ ] 教師可看最小診斷，學生不能讀取他人成績或診斷；資料在 14 個月後清除。
- [ ] 正式 Hosting／Firestore／清除函式部署後，來源與正式站讀回一致；實體 iPad 複驗另列為現場驗收。
