# 國小英語情境任務網站｜RDQ 需求規格卡

> 狀態：已確認｜ImageGen 步驟 1–4 共 51／60 張生成及批次視覺 QA 完成｜版本：2.0｜日期：2026-08-24

## 1. 專案目標

建立一個原創、iPad 橫向優先的國小英語情境任務網站。教師提供的題庫是分析與改寫依據，不直接照抄為網站題目；每次先拆解題庫中的溝通功能、句型、單字、能力與常見錯誤，再把內容轉化為彰化縣二水鄉的文化、環境或氣候任務。學生必須依序閱讀簡短英文情境、閱讀情境式問題、選出答案、取得新線索並過關，最後解開終極任務；英文是改變故事狀態的必要工具，而不是換皮選擇題。

## 2. 使用者與情境

- 學生：國小五、六年級混合程度；弱生可用提示，程度較高者有 Bonus 挑戰。
- 學生登入：只輸入學號（例如 60101）；僅接受教師預先建立的學號名冊。
- 教師：輸入六碼通行碼進入後台查看成績。通行碼由教師本人於 Firebase Console 或安全終端提示中設定，不貼在對話、不寫入前端或 Git。
- 裝置：學校 iPad，Safari 橫向使用；同時支援觸控與外接滑鼠。

## 3. MVP 交付範圍

- 第一套「HWG7 U01+02 情境任務」固定 18 題，依教師核准的 11 個句型項目、9 個國家及 9 個交通詞配置。
- 首套採六個功能區；二水車站／集集線、八堡圳／田野、自行車道等真實地景只在有語意關係時使用，不硬塞情境。
- 一個原創二水守護角色、任務地圖、關卡解鎖、提示、Bonus、答對解析與完成畫面。
- Firebase 保存學生進度及作答紀錄。
- 教師後台：全班完成度、學生歷程、第一次答對率、最終完成率、常錯題／標籤、未完成名單及 CSV 匯出。
- 題庫與程式採資料分離設計，後續可加入新批次句型、單字及任務。

## 4. 題庫製作與內容閘門

1. 教師提供：原始題庫、核准句型、核准單字、年級／難度、正確答案及不接受用法。原始題庫只作為分析與情境化改寫依據。
2. 先分析並標記：溝通功能、核心句型、核心單字、先備能力、常見錯誤、可用線索及難度；不按照課本單元或原題順序直接搬題。
3. 先產出可審核題庫表：原始題目／教材內容、分析標籤、二水場景、玩家目標、任務文字、情境問題、答案、干擾選項與衝突線索、答對解析、提示、故事狀態變化、難度、文化事實來源。
4. 同時提供「原題／來源重點—情境化改寫」對照，讓教師確認教學重點沒有漂移。
5. 教師確認題庫後才寫入網站；不自行擴增未核准核心句型與單字。
6. 每題必須符合「閱讀簡短英文情境 → 閱讀情境式問題 → 選出答案 → 回饋／重試 → 取得線索或解鎖 → 推進終極任務」。
7. 地方文化與環境敘述採政府或其他可靠來源；虛構故事須與事實清楚區隔。
8. 僅參考原作者的教學設計邏輯；不複製 6 Powers, 7 Up!、Fatbat、原作者角色、名稱、圖片、音訊、關卡文字或故事內容。

## 5. 學習與遊戲規則

- 答錯可重新觀察與再試；第二次提供適量提示，不因能量歸零而禁止學習。
- 系統同時保存「第一次是否答對」與「最終是否完成」，兼顧診斷與精熟學習。
- 答對後顯示正確句型、關鍵單字／拼字及判斷理由。
- 基礎路線降低閱讀負荷；Bonus 使用多線索、音檔、圖表或推論提高挑戰。
- 不以餵食、接近或干擾野生獼猴作為正向遊戲行為。

### 5.1 Mission 英文與難字表規則

- Mission 說明以簡短英文句子為主；每句約 4–10 個英文單字、一次只表達一個意思，符合國小五、六年級可閱讀程度。中文只作必要輔助，不取代學生閱讀英文。
- 每個 Mission 下方固定提供 3–6 個難字的中英對照，例如：down｜壞掉了、故障了；field｜田野；falling｜落下，此處指雨正在下。
- 難字表的中文意思須符合當題語境，不只列字典中的第一個意思。
- 第一次作答前，難字表不得直接透露目標句型或正確答案。若目標字本身就是答案，第一次只提供理解情境所需的非答案難字；答錯提示可逐步補線索，答對解析再完整顯示目標字、拼字或判斷理由。
- 虛構任務範例：「The weather signal is down. Dark clouds cover the sky. Rain is falling on the fields. Choose the right gear for the water team.」玩家必須判斷天氣並替八堡圳水路守護隊選出裝備。

### 5.2 新版八層任務設計規則（逐題強制）

> 本版規則由 82 張截圖的時間序列、2026-08-23 現行公開網站的 HTML／前端內容，以及教師指定的原作者八層邏輯交叉整理。只借用教學設計原理，不複製角色、名稱、圖片、音訊、題目或故事。

每一道正式題目都必須同時通過以下八層；缺少任一層即退回改寫。

#### 第一層｜先建 Language Map，不按課本目次搬題

- **規則：**先從原始題庫抽出「學生要完成的溝通功能」，再整理核心句型、核心單字、先備能力與常見錯誤。課本冊次與單元只保留為來源追溯，不作為任務順序。
- **必填證據：**sourceQuestionId、grade／book／unit、communicativeFunction、targetPattern、targetVocabulary、prerequisite、commonError。
- **設計問題：**學生答對時，證明的是會使用哪一種英語能力，而不只是認得哪一個單字？
- **退件條件：**只把原題換成二水圖片、只改人物名稱、或仍可看出原課本題序。

#### 第二層｜從故事狀態反向設計，讓英文成為行動工具

- **規則：**先決定任務開始前哪裡出問題、玩家要完成什麼行動、成功後世界會如何改變，再選擇完成行動不可缺少的句型與單字。
- **必填證據：**beforeState、playerGoal、requiredEnglish、playerDecision、afterState。
- **設計問題：**如果拿掉目標英文，玩家能否只看顏色、圖案或常識直接過關？
- **退件條件：**英文只出現在裝飾文字；選答案只加分，卻沒有修復、找到、選配、排序、開鎖、救援或取得線索。

#### 第三層｜建立雙重難度階梯，而不是平均分散題目

- **規則：**同一 Mission 內採三步遞進：Trial 1 單一明示線索與辨認；Trial 2 兩條線索的應用；Trial 3／Power Question 整合多句、音檔、圖片、表格、順序、否定條件或跨資料推論。跨 Mission 再由單一功能進展到功能整合與新情境遷移。
- **建議四級標籤：**L1 Recognize、L2 Apply、L3 Integrate、L4 Transfer／Power Question。
- **必填證據：**difficultyLevel、clueCount、evidenceTypes、reasoningSteps、previousKnowledge。
- **退件條件：**三題只是換名詞重複同一操作；後一關沒有增加線索數、推理步驟或遷移距離；Bonus 反而卡住基礎路線。

#### 第四層｜熟悉語言提供安全感，二水情境負責遷移

- **規則：**每題至少保留一個學生已學過的語言錨點，再把它放進二水車站、集集線、八堡圳、田野氣候、登廟步道、生態或虛構守護任務。陌生的是使用情境，不是同時塞入大量陌生英文。
- **Mission 文字：**以 4–10 字的短英文句為主，一句一意；中文只提供必要背景。每題附 3–6 個符合當下語境的難字。
- **難字防洩題：**第一次作答前只解釋理解情境所需的字；目標答案字、關鍵拼字或判斷規則留到提示或答對解析。
- **必填證據：**familiarAnchor、transferContext、missionEnglish、glossary、answerLeakCheck。
- **退件條件：**中文已把答案說完、圖片直接畫出唯一答案、難字表翻出正確選項，或英文字量超過目標學生可負荷範圍。

#### 第五層｜每個干擾選項都必須與某條證據衝突

- **規則：**錯誤選項要「局部看似合理、整體卻不符合任務」。可使用人物、地點、時間、順序、數量、條件或語意角色的部分吻合，但必須能指出它違反哪一條線索。
- **品質要求：**選項使用相近語法形式、長度與視覺重量；正解位置需輪替；不得用文法錯誤、荒謬內容、字數特別長或圖片亮度提示答案。
- **必填證據：**每個選項的 distractorType、plausibleReason、conflictingClue、misconceptionTag。
- **退件條件：**教師說不出每個錯項為何可能被選；學生不讀情境就能排除；兩個選項都可由現有線索合理成立。

#### 第六層｜獎勵要改變故事狀態，並服務終極任務

- **規則：**答對後取得的鑰匙、裝備、路線、修復零件、資料卡或通行碼，必須和剛完成的語言行動有語意關係，且在地圖、下一題或終極任務中真的被使用。
- **雙層狀態：**微觀上，每題改變一個可見狀態；宏觀上，每個 Mission 提供終極任務缺少的一部分。
- **必填證據：**rewardObject、immediateStateChange、laterUse、finalMissionContribution。
- **退件條件：**成功只顯示分數、煙火或能量；拿到的物品後續沒有用途；各題故事可任意交換仍不影響邏輯。

#### 第七層｜答錯與答對後都要繼續教

- **錯答第一層：**不公布答案，提醒重新觀察並指出要回看的線索類型，例如人物、時間、天氣或順序。
- **錯答第二層：**再次錯誤才增加關鍵字、局部高亮、重播音檔或排除一項；仍保留學生完成推理的機會。
- **答對解析：**同時呈現正確答案、決定性線索、句型／拼字／phonics 規則，以及故事因此發生的改變。
- **學習紀錄：**保存 attemptCount、firstTryCorrect、hintUsed、finalCorrect；評量報表分開顯示首次理解與最終精熟。
- **可調計分：**可參考「首次答對高分、重試仍有分、錯答小幅扣分」的精神，但不得因能量歸零停止學習。
- **退件條件：**只顯示紅色錯誤或綠色正確；提示直接給答案；答對後沒有說明為什麼。

#### 第八層｜SEL 必須藏在玩家行為與重試循環中

- **Curiosity：**玩家主動找線索、提出好問題並驗證猜想。
- **Connection：**玩家閱讀不同人物的需要與能力，配對互補角色，而不是把差異當成錯誤。
- **Challenge：**玩家在錯答後重新觀察、調整策略、重播或重試，最後完成任務。
- **Reflection：**Mission 結束時用一句短回顧指出「我用了哪一條線索／哪個英文工具」，不另設說教頁。
- **必填證據：**selAction、retryBehavior、reflectionPrompt、nonPunitiveSupport。
- **退件條件：**SEL 只存在標題、口號或結尾標語；遊戲鼓勵亂猜；錯答羞辱學生或永久阻斷進度。

每題的最終檢核句為：

1. **這一題是否真的改變故事狀態？**
2. **學生是否必須理解或使用目標英文，才能造成這個改變？**
3. **錯答後是否知道要重新觀察哪一條證據？**
4. **答對後是否比作答前多學到一個可說明的語言重點？**

四題任一答案為否，即退回重新設計。

### 5.3 任務的雙迴圈結構

**大迴圈／故事層：**

「在地事件或設備異常 → 宣布終極目標 → 進入數個 Mission → 每關取得有用途的線索／物件 → 組合成果 → 解開終極任務 → 短反思」。

**小迴圈／逐題層：**

「短英文 Mission → 3–6 個不洩題難字 → 情境證據／音檔／圖片／表格 → 情境式問題 → 選擇 → 錯答重新觀察或答對解析 → 故事狀態改變 → 下一條線索」。

兩個迴圈必須相扣；不能把彼此無關的選擇題排成一串後稱為 Escape Room。

### 5.4 二水任務範例骨架：八堡圳氣象訊號

- **beforeState：**八堡圳水路守護站收不到氣象訊號，隊員不知道該帶什麼裝備。
- **Mission English：**The weather signal is down. Dark clouds cover the sky. Rain is falling on the fields. Help the water team.
- **Glossary：**signal｜訊號；down｜壞掉了、故障了；field｜田野；falling｜落下，此處指雨正在下。
- **Evidence：**烏雲、雨、田野與守護隊需求；圖片不得直接把正確裝備放大或發光。
- **Contextual question：**What should the water team take?
- **選項原則：**三個選項都要像戶外裝備；錯項分別與「正在下雨」或「需要保持乾燥」的線索衝突。
- **第一次錯答提示：**Look at the clouds and the rain again.
- **答對解析：**It is raining. The team needs a raincoat. Raincoat has the word rain.
- **afterState：**守護隊穿上雨衣，取得第一段水路密碼並恢復一座感測站。
- **終極任務貢獻：**多座感測站恢復後，玩家才能判斷八堡圳是否需要啟動防雨與巡水流程。
- **SEL 行為：**觀察天氣、修正判斷、替守護隊做安全決定；不另外插入說教文字。

### 5.5 正式題目設計卡必填欄位

每題在進入程式前，至少完成以下欄位：

1. 來源追溯：sourceQuestionId、冊次／單元、原題重點。
2. 語言地圖：communicativeFunction、targetPattern、targetVocabulary、prerequisite、commonError。
3. 故事狀態：missionZone、beforeState、playerGoal、afterState、finalMissionContribution。
4. 學生文字：missionEnglish、glossary、contextualQuestion。
5. 證據設計：clues、evidenceTypes、clueCount、reasoningSteps、answerLeakCheck。
6. 選項設計：choices、correctAnswer，以及每個錯項的 plausibleReason、conflictingClue、misconceptionTag。
7. 教學回饋：firstHint、secondHint、correctExplanation、languageTakeaway。
8. 遊戲結果：rewardObject、immediateStateChange、laterUse。
9. 難度與 SEL：difficultyLevel、selAction、retryBehavior、reflectionPrompt。
10. 紀錄欄位：attemptCount、firstTryCorrect、hintUsed、finalCorrect、contentTags。

題目卡未填完整、教師尚未確認，或任一退件條件成立時，不得寫入正式網站。

### 5.6 現行參考網站機制盤點（2026-08-23 基線）

本節是依檔名時間由最早到最晚逐張核對 82 張截圖，再讀取現行公開網站 HTML 與公開前端程式後建立的「參考基線」。它用來判斷哪些機制應採用、改造或排除；不是複製作者網站，也不代表本專案已完成這些功能。現行公開程式檔 SHA-256 為 889D7E1DAE04B61D405B4D15537F72A7C79681EAC3F8ECC864FE596A1363B798，日後網站更新時須重新盤點，不可把本節當成永久不變的事實。

#### A. 內容拓撲與題量

- 六個 Power 分頁中，目前可玩的是 Curiosity、Connection、Challenge；Joy、Confidence、Reflection 顯示 Coming Soon。
- Curiosity 有 6 個城市疑問詞任務與 3 個 Bonus Worlds，共 9 題；先收集 What、Who、Where、When、Why、How 六把 Key，再完成動漫美食祭、像素電玩商店、好友球場尋寶。
- Connection 有 6 個 Mission，每個 3 題，共 18 題：PACK FOR SPACE、TEAM UP!、MY SPACE TREASURES、ZERO-GRAVITY TRAINING、SPACE TRIP、ALIEN FRIENDSHIP CODE。
- Challenge 有 6 個 Mission，每個 3 題，共 18 題：STORM SIGNAL、ALIEN CLINIC、SUBJECT LOCK、SOUND CRYSTALS、ZERO-WASTE PLANET、DREAM JOB CONSTELLATION；每組第三題是整合線索的 Power Question。
- 現行可辨識總題量為 45 題（9＋18＋18）。公開程式另可辨識 36 筆 prompt、9 筆 question、36 筆 tip、15 筆 story 與 41 筆 correct 類資料；這些是程式欄位出現量，不等同 45 題都各自擁有一筆同名欄位。

#### B. Word Bank 精確盤點

- 公開程式有 **18 筆結構化 bank 資料**，均位於 Challenge 的 18 題。原始程式文字 WORD BANK 共出現 19 次，其中包含介面呈現／標籤用字，因此不得誤寫成 19 組不同題庫。
- 18 筆內容依題序為：
  1. signal｜訊號；station｜觀測站
  2. tower｜塔；monitor｜監視畫面
  3. volcano｜火山；melt｜融化；signal｜警報
  4. patient｜病人；scan｜掃描圖
  5. supply box｜補給箱；scanner｜掃描器
  6. translator｜翻譯器；match｜符合
  7. history｜歷史；opens｜開啟
  8. instrument｜樂器；light up｜亮起
  9. low gravity｜低重力；crew｜隊員
  10. sound pod｜聲音艙；same｜相同的
  11. engine｜引擎；pair｜一組
  12. crystal gate｜水晶門；in order｜依序
  13. supply kit｜補給組；less trash｜較少垃圾
  14. base｜基地；reduce｜減少；reuse｜再使用；recycle｜回收
  15. leaves｜出發
  16. alien animal｜外星動物；veterinarian｜獸醫
  17. newly discovered｜新發現的；artist｜藝術家
  18. crew｜隊員；designs｜設計；fixes｜修理
- 本專案採用「每個 Mission 顯示 3–6 個真正影響理解、但不洩漏答案的中英對照難字」原則，不受參考網站 18 筆配置限制；每批內容仍依教師提供的句型、單字與二水情境重做。

#### C. 作答、能量與計分

- 每一關開始時 Energy 設為 50；每題獨立記錄本題嘗試次數。
- 首次答對 +10、第二次答對 +5、第三次起答對 +2；每次錯答 −3，最低為 0。公開程式未將答對後的 Energy 強制封頂為 100。
- 題目答對後設為完成，重按正確選項不會重複加分；進到下一題時重設該題嘗試次數。
- 關卡結算標籤依 Energy 判定：90 以上為 PERFECT POWER、70–89 為 STRONG POWER、50–69 為 POWER RESTORED、49 以下為 MISSION COMPLETED。
- 本專案是否沿用同一數值，須在內容試玩後校準；必須保留「首次觀察較高獎勵、錯後仍可修正並完成」的教學意義，且教師報表不得只看總分，還要看嘗試次數、首次答對與提示使用。

#### D. 提示與答對後教學

- 錯答會立刻扣 Energy、保留在同一題並顯示提示；Curiosity 使用任務專屬線索與 “Look again. You can do it!”，Connection／Challenge 使用 “Check every clue and try again.”，同時搭配該題 tip 指向尚未被注意的線索。
- 提示不是直接公布答案，而是要求玩家重新查看人物資料、天氣、時間線、圖像差異、聲音、否定條件或線索順序。
- 答對後會反白正確選項、顯示正確英文、關鍵拼字、phonics 規則、3R 定義或推論理由，再改變任務狀態。答對不是單純跳下一題。
- 本專案將提示改成兩級：第一次只指向證據，第二次才縮小推論範圍；仍不直接說出正解。報表保存 attemptCount、firstTryCorrect、hintUsed、finalCorrect 與 contentTags。

#### E. 完成狀態與進度流程

- Curiosity 的六把 City Key 依序把進度推到 60%；三個 Bonus World 再把進度推至約 73%、86%、100%，最後解鎖 Curiosity Power。
- Connection／Challenge 各有 18 題，畫面以整體題數換算百分比；每個 Mission 完成三題後才在地圖／任務板標示完成，六個 Mission 全部完成後才進入 Power 結算頁。
- 完成 Mission 會真正解鎖下一區域、恢復連線、取得物件或啟動下一段故事；最終頁可返回地圖或重新遊玩該關。
- 重新遊玩會把該次關卡流程與 Energy 重設。參考網站的學生進度看起來主要保存在當次 React 工作階段，重新整理後沒有可確認的個人進度恢復機制。
- 本專案不得照搬此限制：學生每題結果、Mission 完成、終極任務與最後同步時間都要保存到 Firebase；重新整理、返回或換頁後要能從已同步狀態恢復。

#### F. 音訊與聲音流程

- 英文任務、選項、角色資料與部分回饋設有點擊播放；前端使用瀏覽器 speechSynthesis，偏好美式英文語音，並針對角色調整語速／音高及特殊代碼讀法。
- 正誤音效與背景聲有部分由 Web Audio API oscillator 即時產生，不等同每一段都有預錄音檔。
- 頂端 SOUND／音樂開關會停止目前語音；唯一可確認寫入 localStorage 的鍵是 fatbat-sound，只保存 on／off，不保存學生學習進度。
- iPad Safari 必須先有使用者點擊才啟動音訊；本專案要提供明確的播放／重播按鈕、播放中狀態、停止前一段再播放下一段，以及音訊失敗時的英文文字替代。若正式使用預錄音檔，仍需另做真人感、語速、口音與版權 QA。

#### G. 事件、保存與報表差距

- 參考網站會向 /api/play-count 傳送六種彙總事件：level1_start、level1_complete、level2_start、level2_complete、level3_start、level3_complete，並讀取整體啟動／解鎖次數。
- 目前未在公開前端確認學生登入、Firebase、個人跨工作階段進度、逐題成績、教師後台或 CSV 報表；不得把彙總 play-count 說成個別學生學習紀錄。
- 本專案須新增學號驗證、Firebase 個人進度、逐題作答事件、六碼教師後台、班級／學生／任務統計及 CSV；這是本專案相對參考網站的核心擴充，不是作者網站現成功能。

#### H. 採用／改造／排除決策

- **採用：**地圖—任務—三階題組—狀態改變—Power 結算的節奏；證據型提示；答對後教學；圖文聲多模態；SEL 藏在重試與合作行為。
- **改造：**將宇宙題材換成彰化縣二水鄉文化、環境與氣候；以教師題庫為唯一語言來源；採二級提示；加入 Firebase 與教師報表；以 iPad 橫向為第一驗收裝置。
- **排除：**複製作者角色、圖片、故事文字、題目、程式、介面資產或品牌；也不把單純計分、華麗插圖或串接選擇題視為 Escape Room。
- 每個功能開發前均須在設計紀錄標示 adopt、adapt 或 reject，並寫出教育理由與本專案驗收方式。

### 5.7 已確認的主頁與首套任務

- **全站名稱：**國小英語情境任務網站；「二水英語情境任務」是其中的任務內容方向，不是全站名稱。
- **主頁配置：**上方固定顯示學號輸入，右上角顯示教師後台；未登入也能看見任務目錄。
- **任務目錄：**HWG7 U01+02 開放；HWG7 U03+04、HWG5 U01+02、HWG5 U03+04、HWG8 U01+02、HWG8 U03+04、HWG6 U01+02、HWG6 U03+04 先顯示「即將開放」且不可進入。
- **開始與紀錄：**學號驗證後，第一張卡顯示「開始任務」；每次從主頁開始建立新 attempt，教師後台保留歷次成績。同一 attempt 因重新整理、旋轉 iPad 或短暫斷線時必須恢復。
- **首套故事：**二水國際交流日接駁系統故障；六個 Mission 各 3 題，第三題為 Power Question，共 18 題。角色、國籍、通學方式與接駁紀錄均為虛構；二水車站、集集線、自行車道、八堡圳及田野背景須有來源。
- **題目角色：**11 題 core、6 題 power、1 題 bridge；每個國家與交通詞各有一個主要評量項目，正解混合單字／片語、完整問句、完整答句與完整問答。
- **已確認規格：**rdq/RDQ-spec-home-hwg7-u01-u02-20260823.md；狀態為 confirmed。
- **內容閘門：**question-bank/HWG7-U01-U02-18題情境任務設計表-v0.2.md 的 Q1–Q18 與 3 個圖片子題已由教師確認；加入步驟 1–4 產圖清冊後的文件 SHA-256 為 `043890CDCA061A3D1756BEF9961BFB6C7BAF38A11C7A8DF7176DABE02B2CD12E`。本次未改動已確認題目內容；後續若題目內容改動，須重新確認。

### 5.8 v0.3 題目修正與多模態規格

- **人物上限：**首套任務固定 8 位原創虛構人物，恰好 4 位男生與 4 位女生：Andy、Alan、Ken、Wei、Amy、Lynn、Maya、Mina；不得為單題再新增一次性角色。
- **固定資料：**Maya／Australia／by bike、Andy／India／by train、Ken／Japan／by bus、Amy／Spain／by scooter、Lynn／the USA／by taxi、Mina／the UK／by boat、Alan／Singapore／on foot、Wei／Singapore／by metro。Taiwan、Korea、by car 以錯誤標記或否定問句評量。
- **國家證據禁洩題：**答題前的 missionText、clueText、glossary、圖片內文字、檔名與 alt 不得出現正解英文、中文、縮寫、國籍形容詞或會洩題的城市文字；改用無文字地標、食物、動物、城市景觀或國旗，且每題至少兩項互相支持。
- **圖像化證據：**每條虛構文字線索必須有 evidenceId、imageSpecId 與對應精美插圖／圖示；正式產圖前 imageAssetId 保持空白。
- **全英文點讀：**所有 Mission English、難字英文、人物卡、證據文字、情境問題、A／B／C、提示、答對解析、狀態、按鈕與結尾均登錄 englishSegments 並有唯一 audioId。
- **OpenAI TTS：**模型鎖定 gpt-4o-mini-tts，apiSpeed 0.8；暫定 cedar 為男性呈現角色、marin 為女性呈現角色，正式產檔前由教師試聽。OpenAI 未將 voice 官方標成性別，本案只作專案角色映射。
- **受控 SSML：**保存完整 speak 根元素與核准標籤，再由編譯器把 prosody rate 80% 映射為 API speed 0.8、break 映射為分段靜音、emphasis 映射為 instructions；原始 SSML 不直接送入 API，不宣稱 OpenAI 原生解析 SSML。網頁 playbackRate 維持 1.0，避免二次降速。
- **語音安全與揭露：**OpenAI API 金鑰不得進入瀏覽器；正式音檔保存 model、voice、speed、instructions、source hash、SHA-256 與人工發音 QA。介面顯示「本網站英語音訊為 AI 生成語音，非真人錄音」。
- **圖片子題：**U01-M1-Q1（Australia）、U02-M4-Q1（by bike）及教師指定的 U02-M6-Q3（by boat）各緊接一個三圖辨識子題。3 個子題均為 `countsTowardMain18: false`、`affectsEnergy: false`，保存嘗試／提示且必須通過才給故事獎勵。
- **答案分布：**18 個主題題的正解 A／B／C 各 6 題；仍為 11 core、6 power、1 bridge。
- **Google 文件：**教師審閱版先前已更新於 https://docs.google.com/document/d/1ZT1vkSXhEySs--UxgI-odV6TsVrTZHrXqZjF2x1_RjA/edit?tab=t.0；依教師指示，本次 Q18 子題與 ImageGen 清單只更新兩個 Markdown 檔，不再同步 Google 文件。
- **Firebase 候選目標：**hwg8-starter-listen-speak；目前只登錄 Console 連結，不執行 login、project binding、Firestore 寫入、Rules 發布或 deploy。
- **ImageGen 閘門：**教師已於 2026-08-23 回覆「確認產圖」；60 張核准清單已完成第 01–51 項，狀態為 `imagegen_assets_generated_51｜batch_visual_qa_passed｜remaining_9_pending`。依教師電量指示，第 52–60 項延至下次。
- **目前狀態：**Q1–Q18、3 個圖片子題與 60 張 ImageGen 清單均已確認；Q18 子題答對後直接完成終極任務。`assets/imagegen/masters/` 已讀回 51 張 PNG，批次接觸表與尺寸／唯一性 QA 已完成；Google 文件保留上一次快照，不含本次產圖清冊。

### 5.9 Q18 圖片子題與 ImageGen 清單確認結果

- **Q18 流程：**主題題答對並閱讀解析 → `U02-M6-Q3-A｜by boat 圖片辨識` → 選出 Mina 搭乘客船的圖片 → 立即插入水路鑰匙 → `9/9 ROUTE CHECKS COMPLETE` → 組成 Final Welcome Pass → 開啟 Welcome Gate 並完成任務；不再增加其他題目。
- **子題規格：**正解 B；干擾圖為火車與汽車；三圖均使用 Mina、相同視角與相近構圖，`countsTowardMain18: false`、`affectsEnergy: false`。
- **真實／虛構邊界：**客船場景只使用虛構島嶼與一般水面，不得使用八堡圳、水圳或二水真實地景暗示在地搭船通學。
- **圖片總數：**60 張＝1 風格參考＋8 人物錨點＋5 吉祥物姿勢＋4 首頁資產＋6 Mission 場景＋18 題證據板＋9 子題選項＋9 獎勵／終極狀態。
- **尺寸基線：**背景主檔 2048×1536 並輸出 1024×768／2048×1536 WebP srcset；任務縮圖 1024×768→512×384；證據板 1280×960→960×720 且 CSS 顯示寬度不超過 640 px；人物 1024×1536 透明；吉祥物／獎勵與子題選項 1024×1024，另輸出 256／384／512 px WebP。
- **日式動漫風格：**原創日式電視動畫感、乾淨賽璐璐上色與清楚線稿；不得模仿具名藝術家、動畫作品、工作室或現有吉祥物。
- **角色一致性：**已完成風格參考、8 位角色錨點與 MASCOT-01；後續 50 張中的人物場景與 MASCOT-02–05 必須引用這批 canonical 主檔，不得改臉、髮型、服裝、配色或比例。
- **文字與洩題：**ImageGen 不產英文、數字、國名或介面標籤；文字由 HTML／CSS 疊字並提供 TTS。國家題使用不透明檔名與不洩題 alt；Q18 證據板答題前不得出現船。
- **清單位置：**完整 `imageSpecId`、用途、精簡提示詞、尺寸、生成順序與 QA 規則，收錄於題目設計表第 11 節。
- **文件範圍：**本次只更新 `RDQ-需求規格卡.md` 與題目設計表 Markdown；不修改 Google 文件。
- **產圖閘門：**教師已回覆「確認產圖」；第 01–51 項共 51／60 張已生成並通過人工視覺 QA。錨點清冊、批次數量、尺寸、接觸表、腳本與誠實邊界記錄於題目設計表第 11.10–11.11 節。
- **透明 QA：**8 位人物原始輸出實際是烙入棋盤格的 RGB，不被冒充為透明；原始與 rejected 版本均留存，canonical 人物以可重現腳本建立真 alpha，並在深色底接觸表檢查手腳、髮型、服裝與白邊。
- **誠實邊界：**REF-01 原生為 1672×941，只作內部風格基準；目前 51 張主檔不等於完整網站。`ITEM-01–07`、`FINALE-01–02`、全批 OCR／檔名／alt 洩題自動掃描、WebP／srcset、網站整合、TTS、Firebase、部署及 iPad 實機均未執行。

## 6. 資料、安全與權限

- 學生資料預設只保存學號，不保存姓名。
- 學生端使用 Firebase Anonymous Auth 綁定裝置工作階段與名冊學號；學生不得讀取其他學生資料。
- 只輸入學號無法完全防止同學冒用他人學號，此為教師已知並接受的低摩擦登入限制；未來可升級班級碼或個人 PIN。
- 六碼教師通行碼只在伺服器端驗證，以加鹽雜湊／Firebase Secret 保存，具失敗次數限制、暫時鎖定及限時後台工作階段。
- 不在瀏覽器、原始碼、Firestore 公開文件、Git 或對話中保存原始通行碼。
- Firestore 規則禁止未授權讀取全班成績；教師後台取得最小必要權限。
- 安全六碼驗證可能需要 Cloud Functions／Blaze 方案；未經教師明確授權，不升級方案、不產生付費服務、不部署。

## 7. 建議資料欄位

studentId、missionId、sourceSentenceId、contentTags、attemptCount、firstTryCorrect、finalCorrect、hintUsed、startedAt、completedAt、lastSeenAt、progressPercent。

## 8. iPad 與無障礙限制

- 最低基準：iPad Safari 橫向 1024×768。
- 觸控目標至少約 48×48 px；不依賴 hover，不使用只能拖曳的操作。
- 音訊在第一次使用者點擊後啟動；音檔失敗時提供重播與文字替代。
- 圖片壓縮並分批預載；重新整理、返回、旋轉或短暫離線後不得遺失已同步進度。
- 不只靠顏色傳達正誤；維持可讀字級、對比、焦點與觸控回饋。

## 9. 驗收條件

- 教師核准的句型與單字均可追溯到題庫表，未核准內容不得成為核心考點。
- 首套任務固定 18 個主題題，全部具有二水情境、任務目的、有效線索、合理干擾項及教學解析；3 個圖片子題不計入 18 題。
- 每題均能追溯原始題庫的溝通功能、句型與單字，並有原題／改寫對照及八層設計檢核紀錄。
- 每題完整填寫正式題目設計卡；八層必填證據齊全，且沒有任何退件條件。
- 現行參考網站機制盤點已完成逐項 adopt／adapt／reject 決策；不得把參考網站未具備的 Firebase、個人保存或教師報表宣稱為既有功能。
- 每個 Mission 至少呈現 L1 辨認、L2 應用、L3 整合的遞進；重要任務再加入 L4 Transfer／Power Question。
- 每個錯誤選項都能指出合理誘因與衝突線索；正解無法由選項長度、位置、顏色或圖片亮度猜出。
- 每次正解都產生 immediateStateChange，且每個 Mission 的成果會投入終極任務。
- 錯答提示不直接洩題；答對解析同時包含正解、決定性線索、語言重點及故事結果。
- 每個 Mission 以短英文句為主，附 3–6 個符合語境且不洩題的中英難字對照。
- 學生可完成「情境 → 問題 → 作答 → 回饋／重試 → 新線索 → 過關 → 終極任務」完整故事流程。
- 完成正解、錯解、重試、提示、Bonus、解鎖、返回、重新整理及同步失敗恢復測試。
- 學號名冊驗證、進度保存、報表統計與 CSV 欄位讀回正確。
- 未授權使用者無法讀取全班資料；前端與版本庫中找不到教師原始通行碼。
- 在實際學校 iPad Safari 橫向完成學生流程；觸控及外接滑鼠皆可操作。
- 視覺 QA 確認圖片不直接洩漏答案、按鈕不被裁切、文字不溢出。

## 10. 不在本階段範圍

- 公開發布、Firebase 正式部署或付費方案升級。
- 學生姓名、密碼、錄音、AI 口說評分及跨校帳號系統。
- 一次完成六種 Powers／七大關或複製原作者網站。

## 11. 下一個內容閘門與仍需提供

- 第一批 HWG7 U01+02 句型與單字、固定 8 人的 v0.4 十八題設計表、3 個圖片子題與 60 張 ImageGen 清單均已確認；第 01–51 項已完成，第 52–60 項是下一個美術批次，本次不再同步 Google 文件。
- MVP 學號名冊（可先用不具真實身分的測試學號）。
- 全站名稱已確認；原創視覺角色與美術方向可在題庫確認後定案。
- 部署階段才需：Firebase 專案、資料保留期限、是否授權 Blaze／Cloud Functions；所有登入與秘密設定均由教師本人完成。

## 確認方式

教師已回覆精確文字「確認規格」、「確認圖片清單」與「確認產圖」；本規格卡目前為 v2.0。Q1–Q18、3 個圖片子題與 60 張 ImageGen 清單已確認，第 01–51 項已生成並完成批次視覺 QA；這不等於第 52–60 項、全批 OCR／洩題自動掃描、網站、音訊、Firebase、部署、付費或正式通行碼已完成。後續若修改核心流程、資料、安全或內容範圍，須再更新規格並由教師確認；教師已要求在步驟 4 後收工並關機，依專案收工流程同步既有 Git 遠端後執行。

## 版本紀錄

- v1.0：確認二水在地情境、iPad 橫向、學號登入、Firebase 進度與六碼教師後台方向。
- v1.1：確認由每批句型與單字反向設計二水文化、環境與氣候任務。
- v1.2：納入教師題庫作為分析與改寫依據、短英文 Mission、難字中英對照、逐題情境流程、終極任務，以及八層強制設計邏輯。
- v1.3：重新逐張視覺核對 82 張截圖並讀取現行公開網站，將八層邏輯改寫為逐題可執行規則；新增必填證據、設計問題、退件條件、雙迴圈、八堡圳範例、正式題目設計卡與驗收條件。
- v1.4：加入現行參考網站可量測機制基線，完整記錄 45 題內容拓撲、18 筆結構化 Word Bank（及 19 次字樣出現的差異）、逐次計分、提示、正解教學、完成與重玩狀態、音訊、彙總事件、保存限制，以及本專案的採用／改造／排除決策。
- v1.5：新增「國小英語情境任務網站」主頁、8 張任務卡、學生開始／新 attempt／同次恢復規則，以及首套 HWG7 U01+02 的六區 18 題 confirmed 架構；連結已確認子規格與待教師逐題審核的題目設計表。
- v1.6：固定 8 位人物（4 男、4 女），新增國家證據禁洩題、虛構證據全面圖像化、全英文 OpenAI TTS、0.8 語速、受控 SSML 編譯、兩個詞彙圖片子題、Firebase 候選目標及題目確認後的日式動漫風 ImageGen 清單閘門。
- v1.7：確認 Q1–Q18；Q18 新增 `by boat` 三圖辨識子題並於答對後直接完成任務。圖片子題總數改為 3，完成 60 張日式動漫風資產、精簡提示詞與尺寸清單，且本次只更新兩個 Markdown、不再同步 Google 文件。
- v1.8：教師回覆「確認圖片清單」，60 張 ImageGen 清單進入 `imagegen_list_approved`；尚未授權產圖，等待獨立的「確認產圖」。
- v1.9：教師回覆「確認產圖」；完成 REF-01、8 位人物透明母圖與 MASCOT-01 共 10 張首批錨點，保存 raw／rejected／QA 證據，記錄尺寸與 SHA-256；其餘 50 張、網站整合、OCR／洩題掃描與 Firebase 仍未執行。
- v2.0：完成 ImageGen 步驟 1–4，累計 51／60 張主檔；新增 4 個吉祥物姿勢、4 個首頁資產、6 個 Mission 場景、18 張證據板與 9 張圖片子題選項，完成接觸表、尺寸與選項雜湊唯一性 QA。依教師電量指示，第 52–60 項及網站工作延至下次，本輪收工並關機。
