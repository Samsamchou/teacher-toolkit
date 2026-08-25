# L1｜12 張分鏡 Google Flow 動態提示詞（中英雙語 V2）

更新日期：2026-07-28
適用單元：第 1 節｜路線影片：從二水出發認識集集線
影片規格：每段 8 秒、16:9、圖片轉影片（image-to-video）

## 一、此次修正的核心原則

1. Flow **只負責動態**，不負責產生站名、標題、字幕或旁白文字。
2. 所有需要出現在成品中的文字，必須在上傳 Flow 前，先正確烘焙在靜態首幀中。
3. 路線圖只顯示四個「教學重點站」：
   - 二水｜Ershui
   - 集集｜Jiji
   - 水里｜Shuili
   - 車埕｜Checheng
4. 四站順序固定為：**二水 → 集集 → 水里 → 車埕**。
5. 這是「教學重點站簡圖」，不是完整停靠站圖。臺鐵完整集集線仍包含源泉、濁水、龍泉等站。
6. 任何路線圖都只能有四個站點；不得出現第五個站點、無名小圓點、重複站名或其他站名。
7. 站名與標題區列為「完全靜止區」：不得變形、重繪、翻譯、OCR、重新排字或產生相似字。
8. 每段維持同一場景八秒，不在片尾自動切換、溶接或變形成另一座車站、月臺或鐵軌。
9. Flow 不產生字幕、對話框、旁白、廣播內容、浮水印或任何新增文字；精確字幕與旁白一律後製。
10. 若靜態首幀未符合以上條件，**停止生成影片，先修正靜態圖**。

## 二、使用前檢查

- 分鏡 01、03、12 必須先換成「四站版」靜態首幀，不可直接使用仍有七個節點或空白文字框的舊圖。
- 所有雙語站名必須已在靜態圖中排好：
  - 中文：繁體中文、微軟正黑體。
  - 英文：Comic Sans。
- Flow 只使用一張該分鏡的乾淨首幀；若加入 Ingredient，Ingredient 只供外觀一致性參考，不可改寫首幀文字。
- 中文版與英文版提示詞二擇一貼入 Flow，不要同時貼入。

---

## 分鏡 01｜四站旅程開場

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用已修正的四站版分鏡 01 作為精確首幀。畫面是一張兒童教學用的簡化路線圖，只能有四個站點，固定由左下到右上依序為「二水 Ershui」、「集集 Jiji」、「水里 Shuili」、「車埕 Checheng」。四組站名已烘焙在首幀中，必須全程保持像素完全不變，不得生成、重寫、翻譯、移動或扭曲任何文字。紅色路線從二水開始，依序亮到集集、水里、車埕；一次只亮下一段，不可跳站、倒退或增加節點。黃色小火車只沿同一路線平滑前進，最後停在車埕。攝影機先保持全圖，接著非常緩慢地向四站路線推近。維持同一張教學地圖八秒，不切換成真實鐵軌、月臺或其他場景。只加入柔和列車鈴、低音量木琴與輕微行車聲，不要人聲、旁白或廣播。禁止新增字幕、標題、對話框、浮水印、亂碼、第五個站點、無名圓點、重複的 Jiji、重複的 Checheng、錯誤的 Jiri 或任何其他站名。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using the corrected four-station storyboard 01 as the exact first frame. The child-friendly teaching map must contain exactly four station nodes in this fixed order from lower left to upper right: 二水 Ershui, 集集 Jiji, 水里 Shuili, 車埕 Checheng. These four bilingual labels are already baked into the input image. Keep every text pixel perfectly frozen. Do not generate, rewrite, translate, move, morph, or OCR any text. Light the red route in four steps from Ershui to Jiji to Shuili to Checheng. Never skip, reverse, duplicate, or add a node. Let the small yellow train move smoothly along the same route and stop at Checheng. Begin with the full map and use only a very slow gentle push-in. Keep the same map scene for all eight seconds. Do not cut, dissolve, or morph into real tracks, a station platform, or another scene. Use only a soft train bell, quiet xylophone music, and gentle rail ambience. No speech, narration, or announcement. No subtitles, title cards, speech bubbles, watermark, gibberish, fifth node, unnamed dots, duplicate Jiji, duplicate Checheng, incorrect Jiri, or any other station name.

後製字幕：從二水出發，認識集集線
後製旁白：今天，我們從二水出發，沿著四個教學重點站認識集集線。

---

## 分鏡 02｜二水車站照片尋線索

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用分鏡 02 作為精確首幀，保留二水車站正面、列車與月臺照片的原始三區構圖。二水車站建築、站名字樣、月臺標示及照片邊框全部視為鎖定區，八秒內不可改字、變形、翻譯或換成其他車站。攝影機先非常緩慢推近主站體，再輕微平移到列車與月臺小圖；只做自然的樹葉、遠方列車與候車人物微動。不得讓人物越過安全線或進入軌道。畫面若有小路線圖，只能顯示四個教學重點站「二水、集集、水里、車埕」，並且只讓二水節點柔和發光；若首幀沒有小路線圖，不得自行新增。維持同一組照片八秒，不切換成其他站房或空白鐵軌。只加入鳥鳴、微風與低音量車站環境聲，不要可辨識廣播、人聲或旁白。禁止新增字幕、對話框、浮水印、亂碼、虛構站名或任何額外文字。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using storyboard 02 as the exact first frame. Preserve the original three-part composition of the Ershui Station facade, train, and platform photographs. Treat the station architecture, every existing station sign, platform marking, and photo border as locked areas. Do not rewrite, distort, translate, or replace them with another station. Use a very slow push toward the main facade, followed by a subtle pan toward the train and platform insets. Add only slight leaf movement, distant train motion, and gentle natural motion from waiting passengers. Keep every person behind the safety line and away from the tracks. If a small route map already exists in the input, it may show only the four teaching focus stations Ershui, Jiji, Shuili, and Checheng, with only Ershui glowing. If no small map exists, do not add one. Keep the same photo collage for all eight seconds. Do not cut to another station building or empty railway tracks. Use birds, light wind, and quiet station ambience only. No intelligible announcement, speech, or narration. No subtitles, speech bubbles, watermark, gibberish, invented station names, or additional text.

後製字幕：二水站：找找看站名牌、鐵軌、月臺
後製旁白：這是二水站。你找到三個火車站線索了嗎？

---

## 分鏡 03｜從二水辨認集集線方向

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用已修正的四站版分鏡 03 作為精確首幀。灰色縱貫線保持完全靜止；紅色集集線從二水交會點向右上延伸。路線圖只能有四個標示節點，順序固定為「二水 Ershui → 集集 Jiji → 水里 Shuili → 車埕 Checheng」。四組雙語站名與北向箭頭已烘焙在首幀中，必須全程保持清楚、靜止且逐字不變。先讓二水交會點發光，再讓紅線依序通過集集、水里，最後抵達車埕。黃色列車圖示從灰線平滑轉入紅線，不能瞬移、跳站或倒退。採固定俯視鏡頭，只做很小幅的沿線平移。維持同一張教學簡圖八秒，不變形成田野、月臺或其他路線圖。只加入輕微紙張展開聲與柔和提示音，不要人聲。禁止新增任何站名、節點、字幕、對話框、浮水印或亂碼。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using the corrected four-station storyboard 03 as the exact first frame. Keep the gray western main line completely still. The red Jiji branch begins at the Ershui junction and extends toward the upper right. The map must contain exactly four labeled nodes in this fixed order: 二水 Ershui, 集集 Jiji, 水里 Shuili, 車埕 Checheng. The four bilingual labels and north arrow are already baked into the input image. Keep them perfectly sharp, static, and unchanged. Make the Ershui junction glow first, then light the red line through Jiji and Shuili, and finally reach Checheng. Let the yellow train icon turn smoothly from the gray line onto the red line. No teleporting, skipping, reversing, or extra stops. Use a fixed top-down view with only a very small pan following the route. Keep the same teaching diagram for all eight seconds. Do not morph into fields, a platform, or another map. Use only a soft paper-opening sound and gentle cue tones. No speech. No new station names, nodes, subtitles, speech bubbles, watermark, or gibberish.

後製字幕：二水是集集線的起點
後製旁白：二水是集集線的起點，火車從這裡轉進山谷。

---

## 分鏡 04｜列車離開二水進入田野

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用分鏡 04 作為精確首幀，完整保留黃色列車、稻田、灌溉水圳、遠山與軌道的相對位置。以低角度側向跟拍黃色列車平穩向右行駛，稻葉與遠處樹木只做輕柔風動，雲層緩慢移動。列車車身比例、車窗數量、黃色塗裝與軌道結構全程一致，不得增加車廂、改變車頭或生成第二列車。這一鏡不顯示站名；若首幀已含小路線圖，只能保留四個教學重點站「二水、集集、水里、車埕」，並讓二水至集集方向的第一段柔和發光，不能新增中間站。維持田野場景八秒，不切換、不溶接、不變形成河谷或月臺。只加入柔和輪軌聲、風聲與田野蟲鳴，不要人聲、字幕、浮水印或亂碼。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using storyboard 04 as the exact first frame. Preserve the relative positions of the yellow train, rice fields, irrigation channel, distant mountains, and track. Use a low side-tracking camera as the train moves smoothly to the right. Rice plants and distant trees move gently in the breeze, and clouds drift slowly. Keep the train proportions, number of windows, yellow livery, and track structure consistent. Do not add cars, change the train front, or create a second train. Show no station names in this shot. If a small route map is already baked into the input, it may contain only the four teaching focus stations Ershui, Jiji, Shuili, and Checheng, with the first section from Ershui toward Jiji softly glowing. Do not add intermediate stations. Keep the same field scene for all eight seconds. No cut, dissolve, or morph into a river valley or platform. Use soft rail rhythm, wind, and field insects only. No speech, subtitles, watermark, or gibberish.

後製字幕：支線連接車站、田野與聚落
後製旁白：列車離開二水，把車站、田野和聚落連起來。

---

## 分鏡 05｜沿濁水溪谷前進

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用分鏡 05 作為精確首幀，保持河道、河岸平原、低山、彎曲軌道與黃色列車的位置關係。採穩定的高處斜俯視鏡頭，緩慢向右平移並跟隨列車沿河谷彎線前進；河面只做細微反光，山林與草木只做自然微風。不得高速俯衝、旋轉、拉伸河道或把列車移到水中。這一鏡不新增站名；若首幀有小路線圖，只能有二水、集集、水里、車埕四個節點，並以無文字的進度光點往集集方向前進。維持河谷場景八秒，不切換或變形成綠色隧道。只加入遠方水聲、柔和行車聲與低音量音樂，不要旁白、字幕、浮水印、亂碼或額外圖示。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using storyboard 05 as the exact first frame. Preserve the spatial relationship among the river channel, river plain, low mountains, curved track, and yellow train. Use a stable high oblique view with a slow rightward pan that follows the train through the valley curve. Add only subtle water reflections and gentle natural movement in trees and grass. Do not dive, spin, stretch the river, or place the train in the water. Add no station names in this shot. If a small route map already exists, it may contain only four nodes for Ershui, Jiji, Shuili, and Checheng, with an unlabeled progress light moving toward Jiji. Keep the same river-valley scene for all eight seconds. Do not cut or morph into a green tunnel. Use distant water, soft rail sounds, and quiet music only. No narration, subtitles, watermark, gibberish, or extra icons.

後製字幕：沿著濁水溪谷前進
後製旁白：集集線沿著濁水溪谷前進，窗外有河流和山。

---

## 分鏡 06｜綠色隧道與地方運輸

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用分鏡 06 作為精確首幀，保留黃色列車、軌道、樹木形成的綠色隧道、道路與角落的既有圖示。攝影機以穩定的前側方跟拍方式緩慢前進，陽光在葉片間柔和閃動，列車保持在軌道上。角落中原本已存在的材料與農產品圖示只能各自輕微放大一次，不得重畫、增加文字或變成其他物品。這一鏡不新增站名；若首幀有路線進度，只能由二水往集集方向前進，且不得出現其他站名。維持同一個綠色隧道場景八秒，不掀開樹冠、不切換到集集車站。只加入樹葉聲、柔和輪軌聲與兩聲木塊提示音，不要人聲、字幕、浮水印或亂碼。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using storyboard 06 as the exact first frame. Preserve the yellow train, railway track, tree tunnel, road, and existing corner icons. Use a stable front-side tracking camera moving slowly forward while sunlight flickers gently through the leaves and the train remains on the track. Any material and farm-product icons already present in the corner may pulse once very slightly. Do not redraw them, add text, or turn them into different objects. Add no station names in this shot. If a route progress mark already exists, it may move only from Ershui toward Jiji and may not create another station name. Keep the same green-tunnel scene for all eight seconds. Do not lift the canopy, cut, or morph into Jiji Station. Use leaves, soft rail sounds, and two gentle wooden cue sounds only. No speech, subtitles, watermark, or gibberish.

後製字幕：以前運材料和農產品，今天也服務旅遊
後製旁白：這條鐵路以前運送材料和農產品，今天也陪旅客看風景。

---

## 分鏡 07｜抵達集集站

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用分鏡 07 作為精確首幀，依首幀保留集集車站建築、站名字樣、黃色列車、月臺與學生位置。所有站名牌與建築文字都列為完全靜止區，不得重寫、扭曲、翻譯或產生相似假字。採月臺安全區側向鏡頭，黃色列車由左側緩慢進站並平穩停靠；學生只做輕微揮手或指向動作，始終站在安全線後。若畫面含路線進度，只能有二水、集集、水里、車埕四個節點，並讓集集節點發光；不得增加其他站點。維持同一個集集站場景八秒，不切換成小鎮拼貼或另一座車站。只加入減速輪軌聲、短鈴與低音量人群環境聲，不要可辨識廣播、旁白、字幕、浮水印或亂碼。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using storyboard 07 as the exact first frame. Preserve the Jiji Station architecture, existing station sign, yellow train, platform, and student positions exactly as shown. Treat every station sign and building text as a fully frozen region. Do not rewrite, distort, translate, or invent similar-looking characters. Use a side view from the safe platform area. Let the yellow train enter slowly from the left and stop smoothly. Students may wave or point gently but must remain behind the safety line. If a route progress map is already visible, it may contain only four nodes for Ershui, Jiji, Shuili, and Checheng, with Jiji glowing. Do not add any other station. Keep the same Jiji Station scene for all eight seconds. Do not cut to a town collage or another station. Use slowing rail sounds, one short bell, and quiet crowd ambience only. No intelligible announcement, narration, subtitles, watermark, or gibberish.

後製字幕：集集站：車站連接小鎮生活
後製旁白：這是集集站。車站連接小鎮生活，也迎接旅客。

---

## 分鏡 08｜集集小鎮景觀

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用分鏡 08 作為精確首幀，完整保留四格觀察版面的邊框、比例與內容：田野、綠色樹蔭、集集車站與小鎮街道。四格不得合併、交換位置或生成第五格。攝影機保持正面，以極慢速度由四格中心小幅推近。只讓田野稻葉、樹葉、車站旗幟與街道人物做細微自然動作；不得新增著名地標、車站或文字。若首幀含路線提示，只能有二水、集集、水里、車埕四個節點，並保持集集發光。維持同一張四格學習卡八秒，不切換到水里或其他場景。只加入一聲自行車鈴、鳥鳴與低音量街道環境聲，不要旁白、字幕、分類文字、浮水印或亂碼。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using storyboard 08 as the exact first frame. Preserve the four-panel observation layout, borders, proportions, and content: fields, green tree shade, Jiji Station, and the town street. Never merge, swap, or create a fifth panel. Keep a straight-on camera and use only an extremely slow push from the center. Add subtle natural movement to rice plants, leaves, station flags, and people in the street. Do not add famous landmarks, stations, or text. If a route cue is already present, it may contain only four nodes for Ershui, Jiji, Shuili, and Checheng, with Jiji remaining highlighted. Keep the same four-panel learning card for all eight seconds. Do not cut to Shuili or another scene. Use one bicycle bell, birds, and quiet street ambience only. No narration, subtitles, category labels, watermark, or gibberish.

後製字幕：找一找：自然景觀和人文景觀
後製旁白：在集集，你看見哪些自然景觀？哪些是人們建造的？

---

## 分鏡 09｜經過水里進入山城

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用分鏡 09 作為精確首幀，保留水里站、黃色列車、山谷、河流、聚落與月臺的原始構圖。水里站現有站名牌列為完全靜止區，不得改寫、翻譯、變形或換成其他站名。攝影機從山谷全景非常緩慢下降到車站中景，同時跟隨黃色列車平穩通過水里站；列車與月臺保持正確距離，人物不得進入軌道。若首幀含路線進度，只能顯示二水、集集、水里、車埕四站，依序讓集集到水里的線段發光，水里節點只放大一次。維持同一個水里山城場景八秒，不切換或變形成車埕。只加入山谷風聲、柔和輪軌聲與低音量車站環境聲，不要旁白、字幕、浮水印、亂碼或額外站名。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using storyboard 09 as the exact first frame. Preserve the original composition of Shuili Station, the yellow train, valley, river, settlement, and platform. Treat the existing Shuili station sign as a fully frozen area. Do not rewrite, translate, distort, or replace it with another station name. Lower the camera very slowly from the valley view toward a medium station view while the yellow train passes smoothly through Shuili. Keep a safe distance between train and platform, and keep all people off the tracks. If a route progress map already exists, it may show only Ershui, Jiji, Shuili, and Checheng. Light the segment from Jiji to Shuili in that order and pulse the Shuili node once. Keep the same Shuili mountain-town scene for all eight seconds. Do not cut or morph into Checheng. Use valley wind, soft rail sounds, and quiet station ambience only. No narration, subtitles, watermark, gibberish, or additional station names.

後製字幕：水里是沿線的重要車站
後製旁白：列車經過水里，山谷中的聚落和交通在這裡相遇。

---

## 分鏡 10｜抵達車埕終點

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用分鏡 10 作為精確首幀，保留車埕車站木造建築、黃色列車、月臺、終點止衝擋、山林與學生位置。車站標示與所有既有文字列為完全靜止區，不得重寫、翻譯、變形或出現假字。攝影機沿軌道方向非常緩慢推近，黃色列車低速進站並在止衝擋前安全停穩；學生只在安全區輕微揮手。若首幀含路線進度，只能有二水、集集、水里、車埕四個節點，依序讓水里到車埕的最後一段發光，車埕節點以既有雙圈亮起。維持同一個車埕站場景八秒，不切換到木業展示或其他月臺。只加入減速聲、短鈴、鳥鳴與柔和完成音，不要旁白、字幕、浮水印、亂碼或其他站名。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using storyboard 10 as the exact first frame. Preserve the wooden Checheng Station building, yellow train, platform, end-of-line buffer stop, forest, and student positions. Treat every station sign and existing text as a fully frozen region. Do not rewrite, translate, distort, or invent text. Use a very slow push along the track. Let the yellow train enter at low speed and stop safely before the buffer stop. Students may wave gently only from the safe area. If a route progress map already exists, it may contain only four nodes for Ershui, Jiji, Shuili, and Checheng. Light the final segment from Shuili to Checheng and make the existing double-ring Checheng node glow. Keep the same Checheng Station scene for all eight seconds. Do not cut to a timber exhibit or another platform. Use slowing rail sounds, one short bell, birds, and a soft completion tone only. No narration, subtitles, watermark, gibberish, or other station names.

後製字幕：車埕站：集集線的終點
後製旁白：這是車埕站，也是集集線的終點。

---

## 分鏡 11｜車埕木業與山林景觀

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用分鏡 11 作為精確首幀，保留車埕的木造展示空間、歷史照片框、大型木材、山林、教師與學生。歷史照片與任何既有文字全程鎖定，不得生成新照片、重畫文字或讓照片內容變形。攝影機先由木造展示空間緩慢橫移到教師與學生，再停在大型木材；教師只做一次指向動作，學生輕微靠近觀察但不觸碰危險設施。若畫面含路線提示，只能有二水、集集、水里、車埕四個節點，車埕保持發光；不得顯示其他站名。維持同一個木業文化場景八秒，不切換成路線圖或其他車站。只加入林間風聲、鳥鳴與柔和木琴，不要電鋸聲、旁白、字幕、浮水印或亂碼。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using storyboard 11 as the exact first frame. Preserve the wooden heritage exhibit, historic photo frames, large log, forest, teacher, and students at Checheng. Lock every historic photograph and all existing text. Do not generate new photos, redraw text, or morph the photo content. Move the camera slowly from the wooden exhibit toward the teacher and students, then settle on the large log. The teacher points once, and students lean slightly closer to observe without touching unsafe equipment. If a route cue is present, it may contain only four nodes for Ershui, Jiji, Shuili, and Checheng, with Checheng remaining highlighted. Do not display another station name. Keep the same heritage scene for all eight seconds. Do not cut to a route map or another station. Use forest wind, birds, and gentle xylophone only. No chainsaw sound, narration, subtitles, watermark, or gibberish.

後製字幕：車站會保存地方故事
後製旁白：車埕的木造景觀，讓我們看見地方過去的故事。

---

## 分鏡 12｜四站回顧與出口說準備

### 中文版 Flow 動態提示詞

生成一段 8 秒、16:9 的圖片轉影片。使用已修正的四站版分鏡 12 作為精確首幀。畫面只能有四個站點與四張對應照片，固定依序為「二水 Ershui」、「集集 Jiji」、「水里 Shuili」、「車埕 Checheng」。四組雙語站名、四張照片邊框與下方空白回答區都已烘焙在首幀中，必須全程保持像素完全不變；空白回答區必須維持空白。紅色路線依序從二水亮到集集、水里、車埕，每張站景照片只放大百分之三一次，再回到原尺寸。攝影機保持正面固定，不裁切任何站名或照片。第五秒後保持完整四站畫面靜止，供教師暫停提問。維持同一張四站教學卡八秒，不切換成真實車站或鐵軌。加入四次柔和閃卡音與最後一聲完成鈴即可，不要人聲。禁止新增 What is this、字幕、對話框、答案、浮水印、亂碼、第五個站點、無名圓點或其他站名。

### English Flow motion prompt

Create one 8-second 16:9 image-to-video clip using the corrected four-station storyboard 12 as the exact first frame. The image must contain exactly four station nodes and four matching photographs in this fixed order: 二水 Ershui, 集集 Jiji, 水里 Shuili, 車埕 Checheng. The four bilingual labels, four photo borders, and the empty answer area are already baked into the input image. Keep every text pixel and border perfectly unchanged, and keep the answer area completely blank. Light the red route from Ershui to Jiji to Shuili to Checheng. Pulse each station photograph once by only three percent, then return it to the original size. Keep a fixed straight-on camera and do not crop a station label or photo. After five seconds, hold the complete four-station card still so the teacher can pause and ask a question. Keep the same teaching card for all eight seconds. Do not cut to a real station or railway track. Use four soft flash-card sounds and one final completion bell only. No speech. Do not add What is this, subtitles, speech bubbles, answers, watermark, gibberish, a fifth node, unnamed dots, or another station name.

後製字幕：二水—集集—水里—車埕　What’s this?
後製旁白：二水、集集、水里、車埕。你能依序說出四個站名嗎？

---

## 三、Flow 輸出驗收表

每段影片下載前逐項檢查：

- [ ] 片長 8 秒、16:9。
- [ ] 全片只有原分鏡場景，沒有片尾自動換景。
- [ ] 沒有 Flow 自行生成的中文字、英文字、字幕、對話框或廣播文字。
- [ ] 所有已烘焙文字完全沒有變形或漂移。
- [ ] 路線圖若出現，只含二水、集集、水里、車埕四站。
- [ ] 四站順序為二水 → 集集 → 水里 → 車埕。
- [ ] 沒有重複 Jiji、重複 Checheng、錯誤 Jiri 或遺漏 Shuili。
- [ ] 沒有第五個節點、無名小圓點或其他站名。
- [ ] 人物未進入軌道，列車未離開鐵軌。
- [ ] 音訊沒有可辨識錯誤旁白或真實廣播。

只要任一項不合格，就不進入後製，先修正首幀或重新生成。

## 四、資料查證

- 臺鐵官方「集集線」順序：二水、源泉、濁水、龍泉、集集、水里、車埕。
  https://www.railway.gov.tw/tra-tip-web/tip/tip00H/tipH21/query?ratraClass=8a8183195ca5257a015ca527a8930000&ratraSecondClass=2c948a825ce2f2c3015ce3d1f4950013
- 本教材依教學需求只顯示四個重點站：二水、集集、水里、車埕；需標明為「教學重點站簡圖」。
- 臺鐵官方英文拼寫：Ershui、Jiji、Shuili、Checheng。
  https://www.railway.gov.tw/tra-tip-web/tip/tip00H/tipH21/view?tripNo=ffa30e4213cb4f179a7dfab5604eb0c9
