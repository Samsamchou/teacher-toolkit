# Ken B、水鈴、圳寶 三條路線情境句定稿（2026-11-11）

> **老師 11/11 核可**：三條新路線的情境句、選項、答案順序照這份定稿（teacher approved 11/11）。Ken A 的修改也在 11/11 同意，見最後「Ken A 修改後」。

Final scenarios for the Ken B, Shuiling and Zun-Bo routes. 來源草稿：`routes-BCD-scenarios-draft-20261111.md`；規格：`rdq/RDQ-spec-freetime-routes-BCD-20261111.md`。
遊戲資料：`godot-ershui-freetime/data/freetime_ken_b.json`、`freetime_shuiling.json`、`freetime_zunbo.json`（由同一份表產生，內容一致）。

## 這一版改了什麼 What changed

1. **露營改日也改地點**（老師 1A）Camping moved in day and place：
   - Ken B：**星期五晚上**、水心之初大草原 (Friday evening, grass park)。隔天星期六早上就在草原打棒球。
   - 水鈴：**星期日傍晚**、八堡圳公園 (Sunday evening, Babao Canal Park)。
   - 圳寶：**星期六晚上**、二八水水公園 (Saturday evening, Ershui Water Park)，媽媽騎機車從草原載過去。
   - 每條路線重新排過，星期一 → 星期日（圳寶到星期六）依時間先後，前後地點接得起來。
2. **干擾選項重新檢查** Distractor audit（33 題全部改過，規則見下）。
3. **答案位置打亂成固定順序** Fixed shuffled answer positions：每條 A／B／C 各 3–4 題、沒有連續 3 題相同。
4. 水鈴用 She／her、圳寶用 He／his，動詞第三人稱：goes, watches, studies, plays, listens, rides, surfs。
5. Ken B 的「打籃球」留在學校（東側門旁）、水鈴的也在學校；三條路線的「聽音樂」Ken B 在家、水鈴和圳寶在圖書館。

## 干擾選項的檢查規則 Audit rule

只看「星期、天氣、時間」，三個選項裡**只有一個**說得通：

| 情境 Context | 說不通的活動 Implausible | 用在 |
|---|---|---|
| 下雨 rainy | 所有戶外活動：go jogging、ride a bike、play baseball、play basketball、go camping | 答案是室內活動的題目 |
| 晚上／天黑 evening, dark | 球類：play baseball、play basketball | 答案是室內活動或露營的題目 |
| 晚上又冷又有風、隔天要上學 cold, windy, school night | go camping | 答案是室內活動的題目 |
| 很熱的下午 very hot | 戶外運動：go jogging、play basketball、play baseball | 答案是 listen to music |
| 晴朗的白天 sunny daytime（答案是戶外活動） | 另外兩個選項都給**室內活動**（或上學日的 go camping），不放另一個戶外運動 | 答案是 jogging／bike／baseball／basketball |
| 該上學了 time to go to school | watch TV、play online games | Ken B 第 3 題 |

限制（請老師知道）：室內活動（看電視、上網…）在任何天氣都「做得到」，所以答案是戶外活動的題目，錯的兩個只能做到「晴朗白天 → 該去戶外」這個課堂慣例上的不合理；真正分辨還是靠線索（兩人一組）或老師帶討論（全班分組）。答案是室內活動的 18 題，錯的兩個都是天氣／時間上做不到的戶外活動。

---

## Ken B 路線（I / my）

開場引導語：Let's guess Ken's free time again! You are Ken. Listen to my question and choose your answer.  
問句：*What do you do in your free time?*  
答案位置（固定順序）：**C A B A C B B A C A B**（A 4、B 4、C 3；沒有連續 3 題相同）

| # | 情境（英文） | 選項 | 答案 | 從哪到哪、怎麼去、做什麼 |
|---|---|---|---|---|
| 1 | Today is Monday. It's rainy after school. | A. I ride a bike in my free time.<br>B. I play basketball in my free time.<br>C. I play the recorder in my free time. | **C** play the recorder | 二水國小東側門 (school, east gate) → Ken 家 (Ken's home)（走路）：下雨天放學，Ken 走路回家，在房間練直笛。 |
| 2 | It's Monday evening. It's cold and windy. | A. I surf the Internet in my free time.<br>B. I play baseball in my free time.<br>C. I go camping in my free time. | **A** surf the Internet | Ken 家 (Ken's home) → Ken 家 (Ken's home)（原地）：晚上又冷又有風，Ken 在家用電腦上網。 |
| 3 | Today is Tuesday. It's sunny and windy. Time to go to school. | A. I watch TV in my free time.<br>B. I ride a bike in my free time.<br>C. I play online games in my free time. | **B** ride a bike | Ken 家 (Ken's home) → 二水國小東側門 (school, east gate)（騎腳踏車）：早上迎著風，Ken 騎腳踏車上學。 |
| 4 | It's Tuesday afternoon. School is over. It's sunny. | A. I play basketball in my free time.<br>B. I go camping in my free time.<br>C. I surf the Internet in my free time. | **A** play basketball | 二水國小東側門 (school, east gate) → 二水國小東側門 (school, east gate)（原地）：放學後天氣晴朗，Ken 留在學校旁投籃。 |
| 5 | It's Wednesday evening. It's rainy outside. | A. I go jogging in my free time.<br>B. I play baseball in my free time.<br>C. I watch TV in my free time. | **C** watch TV | Ken 家 (Ken's home) → Ken 家 (Ken's home)（原地）：下雨的晚上，Ken 坐在沙發上看電視。 |
| 6 | Today is Thursday. School is over. It's cold and rainy. | A. I go camping in my free time.<br>B. I study English in my free time.<br>C. I go jogging in my free time. | **B** study English | 二水國小東側門 (school, east gate) → Ken 家 (Ken's home)（走路）：又冷又下雨，Ken 放學走路回家，坐在書桌前讀英文。 |
| 7 | It's Friday evening. It's cool. The sky is clear. | A. I play baseball in my free time.<br>B. I go camping in my free time.<br>C. I play basketball in my free time. | **B** go camping | Ken 家 (Ken's home) → 水心之初大草原 (grass park)（走路）：星期五晚上天空很清，Ken 和家人走到水心之初大草原搭帳篷露營。 |
| 8 | Today is Saturday. It's a warm, sunny morning. | A. I play baseball in my free time.<br>B. I surf the Internet in my free time.<br>C. I play the recorder in my free time. | **A** play baseball | 水心之初大草原 (grass park) → 水心之初大草原 (grass park)（原地）：露營隔天早上，爸爸在大草原投球，Ken 揮棒打棒球。 |
| 9 | It's Saturday afternoon. It's very hot. | A. I go jogging in my free time.<br>B. I play basketball in my free time.<br>C. I listen to music in my free time. | **C** listen to music | 水心之初大草原 (grass park) → Ken 家 (Ken's home)（走路）：下午太熱了，Ken 走回家，戴耳機聽音樂。 |
| 10 | Today is Sunday. It's a cool, sunny morning. | A. I go jogging in my free time.<br>B. I study English in my free time.<br>C. I play online games in my free time. | **A** go jogging | Ken 家 (Ken's home) → 八堡圳公園 (Babao Canal Park)（慢跑）：星期天清爽的早晨，Ken 從家裡沿街慢跑到八堡圳公園。 |
| 11 | It's Sunday evening. It's dark and cold. | A. I ride a bike in my free time.<br>B. I play online games in my free time.<br>C. I play basketball in my free time. | **B** play online games | Ken 家 (Ken's home) → Ken 家 (Ken's home)（原地）：星期天晚上又黑又冷，Ken 在家玩線上遊戲。 |

---

## 水鈴 路線（She / her）

開場引導語：Let's guess Shuiling's free time! Listen to my question and choose the answer.  
問句：*What does she do in her free time?*  
答案位置（固定順序）：**B C A C A B A C B A C**（A 4、B 3、C 4；沒有連續 3 題相同）

| # | 情境（英文） | 選項 | 答案 | 從哪到哪、怎麼去、做什麼 |
|---|---|---|---|---|
| 1 | Today is Monday. School is over. It's cool and sunny. | A. She watches TV in her free time.<br>B. She goes jogging in her free time.<br>C. She surfs the Internet in her free time. | **B** go jogging | 二水國小 (school) → 二八水水公園 (Ershui Water Park)（慢跑）：放學後天氣涼爽，水鈴沿街慢跑到二八水水公園。 |
| 2 | It's Monday evening. It's cold and windy. | A. She plays baseball in her free time.<br>B. She goes camping in her free time.<br>C. She plays the recorder in her free time. | **C** play the recorder | 水鈴家 (Shuiling's home) → 水鈴家 (Shuiling's home)（原地）：晚上又冷又有風，水鈴在房間吹直笛。 |
| 3 | Today is Tuesday. It's rainy after school. | A. She studies English in her free time.<br>B. She rides a bike in her free time.<br>C. She plays basketball in her free time. | **A** study English | 二水國小 (school) → 水鈴家 (Shuiling's home)（走路）：下雨天放學，水鈴走路回家，在書桌前讀英文。 |
| 4 | It's Tuesday evening. It's still rainy outside. | A. She goes jogging in her free time.<br>B. She plays baseball in her free time.<br>C. She watches TV in her free time. | **C** watch TV | 水鈴家 (Shuiling's home) → 水鈴家 (Shuiling's home)（原地）：晚上還在下雨，水鈴坐在沙發上看電視。 |
| 5 | It's Wednesday afternoon. School is over. It's very hot. | A. She listens to music in her free time.<br>B. She plays basketball in her free time.<br>C. She goes jogging in her free time. | **A** listen to music | 二水國小 (school) → 二水鄉立圖書館 (library)（走路）：放學後太熱了，水鈴走到隔壁圖書館，戴耳機聽音樂。 |
| 6 | It's Wednesday evening. It's cloudy and cold. | A. She goes camping in her free time.<br>B. She surfs the Internet in her free time.<br>C. She plays basketball in her free time. | **B** surf the Internet | 二水鄉立圖書館 (library) → 水鈴家 (Shuiling's home)（走路）：晚上又陰又冷，水鈴從圖書館走回家，用電腦上網。 |
| 7 | It's Thursday evening. It's rainy and windy. | A. She plays online games in her free time.<br>B. She rides a bike in her free time.<br>C. She goes jogging in her free time. | **A** play online games | 水鈴家 (Shuiling's home) → 水鈴家 (Shuiling's home)（原地）：風雨交加的晚上，水鈴在家玩線上遊戲。 |
| 8 | Today is Friday. School is over. It's sunny. | A. She plays the recorder in her free time.<br>B. She plays online games in her free time.<br>C. She plays basketball in her free time. | **C** play basketball | 二水國小 (school) → 二水國小 (school)（原地）：星期五放學天氣晴朗，水鈴留在學校旁投籃。 |
| 9 | Today is Saturday. It's a sunny, windy morning. | A. She listens to music in her free time.<br>B. She rides a bike in her free time.<br>C. She studies English in her free time. | **B** ride a bike | 水鈴家 (Shuiling's home) → 水心之初大草原 (grass park)（騎腳踏車）：星期六早上，水鈴迎著風騎腳踏車到水心之初大草原。 |
| 10 | It's Saturday afternoon. It's warm and sunny. | A. She plays baseball in her free time.<br>B. She watches TV in her free time.<br>C. She surfs the Internet in her free time. | **A** play baseball | 水心之初大草原 (grass park) → 水心之初大草原 (grass park)（原地）：下午又暖又晴，水鈴在大草原和朋友打棒球。 |
| 11 | It's Sunday evening. It's cool. The sky is clear. | A. She plays basketball in her free time.<br>B. She plays baseball in her free time.<br>C. She goes camping in her free time. | **C** go camping | 水鈴家 (Shuiling's home) → 八堡圳公園 (Babao Canal Park)（走路）：星期天傍晚天空很清，水鈴和家人走到八堡圳公園搭帳篷露營。 |

---

## 圳寶 路線（He / his）

開場引導語：Let's guess Zun-Bo's free time! Listen to my question and choose the answer.  
問句：*What does he do in his free time?*  
答案位置（固定順序）：**A C B B A C A B C C A**（A 4、B 3、C 4；沒有連續 3 題相同）

| # | 情境（英文） | 選項 | 答案 | 從哪到哪、怎麼去、做什麼 |
|---|---|---|---|---|
| 1 | Today is Monday. It's an early, sunny morning. | A. He goes jogging in his free time.<br>B. He watches TV in his free time.<br>C. He plays online games in his free time. | **A** go jogging | 圳寶家 (Zun-Bo's home) → 二八水水公園 (Ershui Water Park)（慢跑）：星期一清晨，圳寶從家裡慢跑到旁邊的二八水水公園。 |
| 2 | It's Monday afternoon. It's rainy after school. | A. He rides a bike in his free time.<br>B. He goes jogging in his free time.<br>C. He surfs the Internet in his free time. | **C** surf the Internet | 二水國小 (school) → 圳寶家 (Zun-Bo's home)（媽媽騎機車載）：下雨天放學，媽媽騎機車載圳寶回家，圳寶用電腦上網。 |
| 3 | It's Monday evening. It's dark and cold. | A. He plays baseball in his free time.<br>B. He plays the recorder in his free time.<br>C. He plays basketball in his free time. | **B** play the recorder | 圳寶家 (Zun-Bo's home) → 圳寶家 (Zun-Bo's home)（原地）：晚上又黑又冷，圳寶在房間吹直笛。 |
| 4 | It's Tuesday afternoon. School is over. It's very hot. | A. He goes jogging in his free time.<br>B. He listens to music in his free time.<br>C. He plays basketball in his free time. | **B** listen to music | 二水國小 (school) → 二水鄉立圖書館 (library)（走路）：放學後太熱了，圳寶走到隔壁圖書館，戴耳機聽音樂。 |
| 5 | It's Tuesday evening. It's rainy outside. | A. He watches TV in his free time.<br>B. He goes camping in his free time.<br>C. He rides a bike in his free time. | **A** watch TV | 二水鄉立圖書館 (library) → 圳寶家 (Zun-Bo's home)（媽媽騎機車載）：下雨的晚上，媽媽騎機車到圖書館接圳寶回家，圳寶坐在沙發上看電視。 |
| 6 | It's Wednesday afternoon. It's sunny and windy. | A. He studies English in his free time.<br>B. He plays online games in his free time.<br>C. He rides a bike in his free time. | **C** ride a bike | 圳寶家 (Zun-Bo's home) → 二八水水公園 (Ershui Water Park)（騎腳踏車）：星期三下午，圳寶迎著風騎腳踏車到二八水水公園。 |
| 7 | It's Wednesday evening. It's cloudy and cold. | A. He studies English in his free time.<br>B. He goes camping in his free time.<br>C. He plays baseball in his free time. | **A** study English | 二八水水公園 (Ershui Water Park) → 圳寶家 (Zun-Bo's home)（走路）：晚上又陰又冷，圳寶走回家，坐在書桌前讀英文。 |
| 8 | It's Thursday evening. It's cold and rainy. | A. He goes jogging in his free time.<br>B. He plays online games in his free time.<br>C. He plays basketball in his free time. | **B** play online games | 圳寶家 (Zun-Bo's home) → 圳寶家 (Zun-Bo's home)（原地）：又冷又下雨的晚上，圳寶在家玩線上遊戲。 |
| 9 | Today is Saturday. It's a sunny morning. | A. He watches TV in his free time.<br>B. He plays the recorder in his free time.<br>C. He plays basketball in his free time. | **C** play basketball | 圳寶家 (Zun-Bo's home) → 水心之初大草原 (grass park)（媽媽騎機車載）：星期六早上，媽媽騎機車載圳寶到水心之初大草原，圳寶在籃球架下投籃。 |
| 10 | It's Saturday afternoon. It's cool and sunny. | A. He surfs the Internet in his free time.<br>B. He listens to music in his free time.<br>C. He plays baseball in his free time. | **C** play baseball | 水心之初大草原 (grass park) → 水心之初大草原 (grass park)（原地）：下午涼爽晴朗，圳寶在大草原和爸爸打棒球。 |
| 11 | It's Saturday evening. It's cool. The sky is clear. | A. He goes camping in his free time.<br>B. He plays basketball in his free time.<br>C. He plays baseball in his free time. | **A** go camping | 水心之初大草原 (grass park) → 二八水水公園 (Ershui Water Park)（媽媽騎機車載）：星期六晚上天空很清，媽媽騎機車載圳寶到二八水水公園，一家人搭帳篷露營。 |

---
## Ken A 建議修改（待老師決定）

> 11/11 更新：老師已決定**全部採用**，修改後的版本在下一節「Ken A 修改後」。這一節保留當作修改理由的紀錄。

Ken A 是老師 11/09 已核可的版本，寫這一節時還沒有改（11/11 老師同意後才改，見下一節）。用上面同一套規則檢查，11 題裡有 10 題至少有一個錯的選項「也說得通」。下面是建議，老師決定要不要改；要改的話語音只需要重做有改情境句的那幾題（選項句的語音不用動）。

Ken A was already approved, so nothing was changed. These are suggestions only.

| # | 現在的情境與選項 | 問題 Why | 建議 Suggestion |
|---|---|---|---|
| 1 | Today is Monday. School is over. Time to go home.<br>A watch TV／**B study English**／C play online games | 沒有天氣；三個都是在家做的事，一樣說得通。All three are indoor and equally plausible. | 情境加 *It's rainy.*；A、C 換成 ride a bike、play basketball。 |
| 2 | It's Monday evening. It's rainy outside.<br>**A watch TV**／B ride a bike／C play basketball | 沒問題 OK。 | 不用改。 |
| 3 | Today is Tuesday. It's a cool, sunny morning. Time to go to school.<br>A ride a bike／B watch TV／**C go jogging** | A「騎腳踏車上學」完全合理（Ken 平常就騎車）。Riding a bike to school is just as plausible. | A 換成 play online games（該上學了，不會打電動）。 |
| 4 | It's Tuesday afternoon. School is over. It's very hot.<br>**A listen to music**／B study English／C play basketball | B 讀英文也是吹冷氣可以做的事。Studying is plausible too. | B 換成 go jogging（很熱不會去慢跑）。 |
| 5 | It's Tuesday evening. Time to go home.<br>A surf the Internet／**B play the recorder**／C play basketball | 沒有天氣；A 上網和吹直笛一樣說得通。 | A 換成 play baseball（晚上天黑）；或情境加 *It's dark.* |
| 6 | It's Wednesday evening. It's cloudy and cold.<br>A watch TV／B study English／**C play online games** | 三個都是室內活動。All three indoor. | A、B 換成 play basketball、go camping（晚上、又冷）。 |
| 7 | Today is Thursday. It's rainy after school.<br>**A surf the Internet**／B play online games／C go camping | B 打電動和上網一樣說得通。 | B 換成 ride a bike（下雨）。 |
| 8 | Today is Saturday. It's sunny and windy.<br>A go jogging／**B ride a bike**／C play baseball | 三個都是晴天的戶外活動。All three are fine on a sunny day. | A、C 換成室內活動，例如 watch TV、study English。 |
| 9 | It's Saturday afternoon. It's sunny.<br>A play baseball／B go camping／**C play basketball** | A 打棒球一樣合理；B 週六下午去露營也說得通。 | A、B 換成室內活動，例如 surf the Internet、play the recorder。 |
| 10 | It's Saturday evening. The sky is clear.<br>**A go camping**／B play basketball／C watch TV | C 晚上看電視很合理。 | C 換成 play baseball（晚上天黑不打球）。 |
| 11 | Today is Sunday. It's a sunny morning.<br>A play basketball／**B play baseball**／C go jogging | 三個都是晴天早上的戶外活動。 | A、C 換成室內活動，例如 play online games、listen to music。 |

另外：Ken A 的答案位置是 **B A C A B C A B C A B**，第 3 題以後幾乎是 A→B→C 輪流（學生可能看出規律）。建議也改成打亂的固定順序，例如 **B A C A C B A B C A B**（只要調換選項順序，句子和語音都不用改）。

## Ken A 修改後（老師 11/11 同意，已做進遊戲）

老師 11/11 決定：上面「Ken A 建議修改」全部採用。活動（答案）、線索、演出都沒變；只改了干擾選項、選項順序，第 1 題情境句加 *It's rainy.*（只有這一題重做語音）。  
答案位置（固定順序）：**B A C A C B A B C A B**（A 4、B 4、C 3；沒有連續 3 題相同）

| # | 情境（英文） | 選項 | 答案 | 改了什麼 |
|---|---|---|---|---|
| 1 | Today is Monday. School is over. It's rainy. Time to go home. | A. I ride a bike in my free time.<br>B. I study English in my free time.<br>C. I play basketball in my free time. | **B** study English | 情境句加 It's rainy.（語音重做）；選項 watch TV、play online games → ride a bike、play basketball |
| 2 | It's Monday evening. It's rainy outside. | A. I watch TV in my free time.<br>B. I ride a bike in my free time.<br>C. I play basketball in my free time. | **A** watch TV | 沒改 |
| 3 | Today is Tuesday. It's a cool, sunny morning. Time to go to school. | A. I play online games in my free time.<br>B. I watch TV in my free time.<br>C. I go jogging in my free time. | **C** go jogging | 選項 ride a bike → play online games |
| 4 | It's Tuesday afternoon. School is over. It's very hot. | A. I listen to music in my free time.<br>B. I go jogging in my free time.<br>C. I play basketball in my free time. | **A** listen to music | 選項 study English → go jogging |
| 5 | It's Tuesday evening. Time to go home. | A. I play baseball in my free time.<br>B. I play basketball in my free time.<br>C. I play the recorder in my free time. | **C** play the recorder | 選項 surf the Internet → play baseball；答案位置 B → C |
| 6 | It's Wednesday evening. It's cloudy and cold. | A. I play basketball in my free time.<br>B. I play online games in my free time.<br>C. I go camping in my free time. | **B** play online games | 選項 watch TV、study English → play basketball、go camping；答案位置 C → B |
| 7 | Today is Thursday. It's rainy after school. | A. I surf the Internet in my free time.<br>B. I ride a bike in my free time.<br>C. I go camping in my free time. | **A** surf the Internet | 選項 play online games → ride a bike |
| 8 | Today is Saturday. It's sunny and windy. | A. I watch TV in my free time.<br>B. I ride a bike in my free time.<br>C. I study English in my free time. | **B** ride a bike | 選項 go jogging、play baseball → watch TV、study English |
| 9 | It's Saturday afternoon. It's sunny. | A. I surf the Internet in my free time.<br>B. I play the recorder in my free time.<br>C. I play basketball in my free time. | **C** play basketball | 選項 play baseball、go camping → surf the Internet、play the recorder |
| 10 | It's Saturday evening. The sky is clear. | A. I go camping in my free time.<br>B. I play basketball in my free time.<br>C. I play baseball in my free time. | **A** go camping | 選項 watch TV → play baseball |
| 11 | Today is Sunday. It's a sunny morning. | A. I play online games in my free time.<br>B. I play baseball in my free time.<br>C. I listen to music in my free time. | **B** play baseball | 選項 play basketball、go jogging → play online games、listen to music |

## 狀態 Status（11/11 更新）

1. 三條新路線的情境句、選項、答案：**老師 11/11 核可**（上面三張表就是遊戲裡的內容）。
2. 水鈴的露營在**星期日傍晚**（隔天要上學）——這是老師指定的日子；所以其他題目用「隔天要上學所以不露營」當理由時，都另外加了「又冷又有風／下雨」讓它更明顯。
3. 圳寶四趟機車（第 2、5、9、11 題）：已換上 Tripo 的媽媽（`zunbo_mom_rigged.glb`）和機車（`scooter_A.glb`），圳寶坐後座戴安全帽。檢查圖：`zunbo-scooter-ride-check-v2.png`。
4. 戶外演出的位置（情境句不變）：
   - **露營一定在公園的草地上**（不能在馬路上）：圳寶在二八水水公園的草地、水鈴在八堡圳公園的草地；遊戲在公園綠地裡找一塊人、營火、帳篷都放得下、沒有被模型擋住的空位。坐機車來的時候，機車停在路邊，人走到草地上。
   - 慢跑、騎腳踏車、投籃、聽音樂：鏡頭被地點模型或街屋擋住時，改在地點旁邊的街上做（例如在二八水水公園旁的街上慢跑、騎車；在學校旁的街上投籃）。
   - Ken 的露營在水心之初大草原門口（老師 11/10 看過的位置）；地圖資料裡大草原沒有畫綠地範圍，所以還在原來的位置，沒有搬。
