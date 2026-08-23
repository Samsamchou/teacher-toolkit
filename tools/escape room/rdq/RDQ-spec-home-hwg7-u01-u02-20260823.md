---
rdq_version: 1
edition: chatgpt-app
task: 建立主頁與HWG7 U01+02情境任務
domain: dev
date: 2026-08-23
status: confirmed
telemetry:
  mode: full
  rounds: 2
  questions: 7
  q4_adopted: 4
  revisions: 0
downstream: self
---

# RDQ 需求規格：國小英語情境任務網站首站

## 一句話任務
建立「國小英語情境任務網站」主頁，並以二水國際交流日接駁系統故障為故事，完成第一套 HWG7 U01+02 十八題情境任務。

## 已確認
- 主頁上方固定顯示學號輸入；右上角顯示教師後台；任務卡未登入也看得到。
- 任務目錄共 8 張卡：HWG7 U01+02（開放）、HWG7 U03+04、HWG5 U01+02、HWG5 U03+04、HWG8 U01+02、HWG8 U03+04、HWG6 U01+02、HWG6 U03+04（後七張顯示「即將開放」且不可進入）。
- 學號驗證後，第一張卡顯示「開始任務」；每次從主頁開始都建立新 attempt，教師後台保留歷次成績；同一 attempt 因重新整理、旋轉或短暫斷線時必須恢復。
- 第一套採 6 個 Mission × 3 題，共 18 題；每組前兩題為辨認／應用，第三題為 Power Question。
- 11 個教師句型項目各自成為一題；另有 6 題 Power Question 與 1 題單字／證據銜接題。9 個國家與 9 個交通詞各綁定一個評量項目。
- 正解形式必須混合單字／片語、完整答句與完整問句；只要理解目標詞才能選出正確問句、答句或判斷 Yes／No，即算該詞已接受評量。
- U01 六項核准問答：Where are you from? I’m from [country].；Where is Andy from? He is from [country].；Where is Amy from? She is from [country].；Is she from India? Yes, she is.／No, she isn’t. She’s from [country].；Is he from Taiwan? Yes, he is.／No, he isn’t. He’s from [country].；Are they from [country]? Yes, they are.／No, they aren’t.
- U02 五項核准問答：How do you go to school? I go to school [transport].；Does Alan go to school by bus? Yes, he does.／No, he doesn’t. He goes to school on foot.；Does Amy go to school by car? Yes, she does.／No, she doesn’t. She goes to school by scooter.；How does Lynn go to school? She goes to school [transport].；Do you go to school by train? Yes, I do.／No, I don’t. I go to school by metro.

## 待確認假設
- 六區暫定為「國際來賓資料站、人物身分核對、團隊報到閘門、上學路線控制台、接駁名單查核、最終接駁調度」；詳細名稱可在題目審核時微調。
- 保留 Andy、Amy、Alan、Lynn，並加入完成 18 題所需的原創虛構交流學生；虛構身分不宣稱是真實國際交流資料。
- 第一版沿用 Energy 50、首次答對 +10、第二次 +5、其後 +2、錯答 −3；試玩後可校準但不因歸零阻止作答。
- 正式 Firebase 專案、學號名冊、六碼教師通行碼與資料保留期限於部署階段由教師提供／設定；開發期只用測試資料。

## 已採納建議
- 任務目錄資料驅動；保留指定人物並可加原創線索人物；任務／題目／重要線索提供經 QA 的美式點讀；報表分開標示 11 個核心句型題、Power Question 與銜接題。

## 本次不納入
- 不製作後七套任務內容；不複製 6 Powers, 7 Up! 的角色、圖片、題目、故事或程式；本輪不正式部署、不設定秘密資料、不加入錄音或 AI 口說評分。

## 一段式需求規格
在 **G:\我的雲端硬碟\teacher-toolkit\tools\escape room** 建立 iPad Safari 橫向優先的「**國小英語情境任務網站**」主頁與第一套「**HWG7 U01+02 情境任務**」。主頁頂部提供白名單學號輸入、右上角六碼教師後台入口，並以資料驅動卡片列出 8 套指定任務，只有 HWG7 U01+02 可開始。首套故事為「二水國際交流日接駁系統故障」，玩家依序修復 6 個 Mission；每區 3 題且第三題為 Power Question，共 18 題。U01 評量 Australia、India、Japan、Taiwan、the USA、the UK、Spain、Singapore、Korea，以及 Where are you from? I’m from [country].、Where is Andy／Amy from? He／She is from [country].、Is she from India?、Is he from Taiwan?、Are they from [country]? 的完整肯定與否定答句；U02 評量 by scooter、by car、by bus、by bike、on foot、by train、by taxi、by metro、by boat，以及 How do you go to school? I go to school [transport].、Does Alan go to school by bus?、Does Amy go to school by car?、How does Lynn go to school?、Do you go to school by train? 的完整肯定與否定答句。每個項目都轉成必須讀取二水情境證據才能選出正確單字、完整問句或完整答句的任務，附 3–6 個不洩題中英難字、合理干擾項、兩級提示、答對解析、點讀與可見故事狀態改變；正式寫入網站前先交付完整 18 題「來源—改寫—證據—選項—提示—解析—狀態」表供教師確認。每次由主頁開始建立新 attempt；同一 attempt 可在重新整理、旋轉或短暫斷線後恢復；Firebase 保存逐題紀錄，教師報表保留歷次成績並分開統計題目角色。

## 驗收條件
- [ ] 主頁名稱、學號框、教師按鈕、8 張任務卡、開放／鎖定狀態及新 attempt 規則均與規格一致。
- [ ] 18 題覆蓋 11 個句型項目、9 個國家、9 個交通詞與三種正解形式，每題均通過既有八層設計檢核並經教師逐題核准。
- [ ] 六區故事能從修復資料推進到完成最終接駁，答錯可重試、答對會教學並改變故事狀態。
- [ ] iPad 橫向觸控／滑鼠、點讀、同次作答恢復、Firebase 紀錄與教師歷次報表均通過實測。
