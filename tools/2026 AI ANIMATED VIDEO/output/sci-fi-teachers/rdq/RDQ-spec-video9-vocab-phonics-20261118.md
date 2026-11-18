---
rdq_version: 1
edition: claude-code
task: 影片 9 單字教學段：規則字教發音、其他字教音節
domain: video
date: 2026-11-18
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: 3d-teacher-lesson-video
---

# RDQ 需求規格（confirmed 2026-11-18 老師「照這份開始」）：影片 9 單字教學段（9 個地點字）

## 一句話任務
影片 9 開頭的單字段：Nova／Cosmo 教 9 個地點字，有規則的字教發音規則，沒有規則的字教音節、節拍和重音。

## 已確認
- 單字 9 個：課本 8 個＋ **train station**（3A）。
- **規則字**：bank（短母音 a）、park（ar）、supermarket（er＋ar）、bookstore（只教 book 的 oo /ʊ/，store 不教規則，1C）、
  **hospital**（短母音 o、i：hos·pi·tal，2B）、train station（ai 唸 long a、-tion 唸 /ʃən/）。
- **音節字**：museum（mu·SE·um）、library（LI·brar·y）、post office（POST OF·fice）。
- 發音示範：short a、er 用老師錄音；ar /ɑ/、oo /ʊ/、短 o、短 i、long a 用老師錄音或 Wikimedia Commons（4A：老師沒錄的音用 Commons，不用 TTS）。
- 建議①–⑤全採：每個規則配 2 個例字、先規則字後音節字再快速複習、音節拍手（重音大聲）、post 補「ost 小家族」、規則字母三色標示。

## 待確認假設
- 2B 讓 hospital 變成規則字，所以順序調成：bank → park → supermarket → bookstore → hospital → train station → museum → library → post office → 9 字複習。
- 例字（之後可換）：bank → cat、hat；park → car、star；super**er** → sister、brother（影片 4 學過）；mark**ar** → car；book → look、cook；
  hos → hot、dog；pi → sit、pig；train → rain、wait；-tion 只示範 station，不另舉例；ost 家族 → most、host。
- 顏色：ar 紅、er 藍、oo 綠、短母音橘、ai 紫、-tion 粉紅。
- 每個規則字約 35–45 秒、音節字約 25 秒，單字段約 5–6 分鐘；整支影片可能 12 分鐘以上。
- 帶唸方式照影片 1：發音念 2 次，留 2 秒讓學生跟唸，再念整個字 2 次。

## 本次不納入
- store 的 ore 規則；tea shop、restaurant 兩個補充字。

## 一段式需求規格
在科幻雙老師**影片 9** 開頭做單字教學段，教 **9 個地點字**。順序是先教規則字：**bank**（短 a）、**park**（ar）、**supermarket**（er＋ar）、**bookstore**（只教 book 的 oo）、**hospital**（短 o、短 i）、**train station**（ai＝long a、-tion）。每個規則字都要把規則字母用顏色標出來，發音念 2 次、停 2 秒讓學生跟唸，舉 2 個例字，最後整個字念 2 次。接著教音節字 **museum、library、post office**，拍手打節拍，重音那一拍比較大聲；post 要補「ost 小家族 post、most、host」。最後 9 個字快速複習一次。發音示範的聲音用老師的錄音，老師沒錄的音用 Wikimedia Commons，不用 TTS。英文字一律用 Comic Relief。

## 驗收條件
- [ ] 9 個字都有教，每個規則字的顏色標示、發音音檔、2 個例字都正確。
- [ ] 音節字的拍數和重音正確：mu·SE·um 3 拍、LI·brar·y 3 拍、POST OF·fice 3 拍、HOS·pi·tal 3 拍。
- [ ] 先給老師看腳本（Google 文件）和配音，通過後才渲染。
