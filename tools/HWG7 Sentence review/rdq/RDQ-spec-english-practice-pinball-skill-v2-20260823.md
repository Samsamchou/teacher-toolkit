---
rdq_version: 1
edition: chatgpt-app
task: 升級英語練習彈珠台技能
domain: dev
date: 2026-08-23
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 5
  revisions: 1
downstream: skill-creator
---

# RDQ 需求規格：英語練習彈珠台技能 v2

## 一句話任務
將本 Session 驗證過的口說評測、彈珠流程、安全與 QA 經驗，整理成可擴充多種英語練習的既有技能新版。

## 已確認
- 原地升級 **english-practice-pinball-builder**，不另建競爭技能。
- 採通用「練習轉接器」架構；第一版完整涵蓋聽力／文字圖片選擇、朗讀、問答口說。
- 輸入、排序、配對與拖放先保留轉接契約，取得真實題庫後才實作互動細節。
- 每種練習可自訂完成與發射條件：選擇題答對才發射；口說達標即可發射，三次未達標則顯示示範、記錄未達標但仍可發射。
- 同一技能同時支援「既有網站新增單元」與「複製為新網站」，每次由教師指定。
- 通用彈珠規則、題型轉接器、HWG7 案例、學習結果與遊戲進度須分層記錄。
- 納入教材內容、遊戲流程、裝置版面、Firebase／AI 安全四層 QA。
- 本 Session 的完整經驗整理為可重用規則與案例，不製作逐訊息對話紀錄。
- HWG7 案例以需求決策表、建置生命週期、踩坑與驗證證據保存：涵蓋題圖置頂、答句鷹架、問句不錄、短答／完整答、縮寫等值、Comic Relief、0.8 倍速美式 AI 語音、逐回合題型交換、未達標續玩、受保護錄音回放、六題平均、彈珠總分、資料不完整、橫式等寬版面及線上讀回。
- 保留既有技能名稱、安裝路徑與自動觸發政策，不改為 explicit-only。
- **SKILL.md** 維持精簡路由；詳細契約、口說流程、HWG7 案例與授權矩陣放入 references。
- 不內嵌容易過時的完整網站快照；執行時一律先讀實際最新可部署專案。

## 已採納建議
- 建立 practice-adapter 契約，統一定義題面、作答、完成、發射、紀錄與教師摘要。
- 將通用規則與 **HWG7 Sentence review** 實證案例分開。
- 建立教材、流程、裝置、安全四層 QA 矩陣。
- 將學習結果與遊戲是否繼續拆成不同狀態。
- 建立本機實作、Hosting、Functions／Rules、Secret、計費、新 Firebase 專案的分級授權矩陣。

## 本次不納入
- 不修改或重新部署目前的學生網站、Firebase Functions、Rules、Secret 或正式資料。
- 不替尚無真實題庫的輸入、排序、配對、拖放題型製作網站元件。
- 不把 API 金鑰、教師通行碼、學生錄音或可識別資料寫入技能。
- 不把一次實作或部署授權解讀成日後外部變更的永久授權。

## 一段式需求規格
使用 **skill-creator** 原地升級 **C:\Users\User\.codex\skills\english-practice-pinball-builder**：保留既有雙人輪流、等量回合、Matter.js 彈珠、總結與教師紀錄基線，將題目呈現、作答輸入、完成判定、發射解鎖、學習結果及紀錄欄位抽象成 practice-adapter；完整納入本 Session 已驗證的朗讀／問答口說流程、答案等值正規化、**80 分**門檻、最多 **3 次**、未達標仍可繼續、AI 示範語音、圖片題幹、題型交替、教師六題平均、彈珠總分、受保護錄音播放、iPad 橫式投影、Firebase Secret／App Check／資料規則、部署讀回與收工證據。技能須把通用規則與 **HWG7 Sentence review** 案例分開，支援擴充既有站或複製新站，並在所有外部變更前依授權矩陣重新取得明確同意。

## 驗收條件
- [ ] **SKILL.md** 能清楚路由選擇題、朗讀、問答口說及尚未實作的新互動題型，且不再假設所有題目都有 `correctOption`。
- [ ] references 完整保存 practice-adapter、口說評測、HWG7 案例、四層 QA 與分級授權，內部連結均可解析且沒有重複規則。
- [ ] 以既有聽力選擇題、HWG7 口說題、未來排序題三個情境做桌面推演，均能得到正確的規格與停點。
- [ ] `quick_validate.py` 通過；讀回檔案數與內容，確認無秘密資料、無網站或 Firebase 外部變更。
