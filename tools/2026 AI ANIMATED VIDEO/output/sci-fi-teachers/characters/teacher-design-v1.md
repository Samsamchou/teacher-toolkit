# 科幻雙老師：角色設定與 Tripo 提示詞（v1，待老師確認）

依據：`rdq/RDQ-spec-sci-fi-teachers-20261019.md`（2026-10-19 confirmed）。
用途：國小五年級英語課堂動畫兩支（星期單字／What day 句型）。風格：**3D 科幻俏皮風**。

---

## 1. 共同設計原則（為了對嘴、表情和一致性）

- **臉要完全露出**：不戴頭盔、面罩、口罩；護目鏡只能推到頭頂。嘴巴和眼睛是教學重點（嘴形 6–8 種、眼神）。
- **大眼睛、清楚的嘴唇輪廓**：Q 版但不幼兒化，頭身比約 1：5（像動畫電影的年輕老師）。
- **兩人用顏色區分**：女老師＝青藍／白，男老師＝橘／深藍。學生一眼就知道是誰在說話，字幕顏色也跟著用。
- **配件要能教學**：發光指尖、全息平板，用來指字母、在空中寫大寫字母。
- **原創造型**：不像任何既有卡通角色（例如不做太空人白色盔甲）。
- **衣服上不放字**（字一律由程式畫）；只用簡單幾何圖案。
- **台灣國小課堂可親近**：親切、活潑、有點搞笑，但不怪異、不恐怖。

---

## 2. 女老師：Ms. Nova（諾娃老師）

| 項目 | 設定 |
|---|---|
| 個性 | 活潑、愛笑、反應快；負責示範發音、帶學生跟讀，常說 "Say it with me!" |
| 年齡感 | 20 多歲的年輕老師 |
| 臉 | 圓臉偏鵝蛋、大而明亮的深棕色眼睛、淡淡雀斑、溫暖笑容、嘴唇輪廓清楚（淡珊瑚色） |
| 頭髮 | 及肩的深黑色短鮑伯頭，髮尾帶一點青藍色漸層；右側一個小小的星形髮夾（會發青光） |
| 服裝 | 白色合身科幻教師外套（短版、立領），青藍色發光線條；深灰色長褲；白色厚底運動鞋帶青藍色光條 |
| 配件 | 左手腕全息手環（可投出小螢幕）；右手食指指尖會發青光（指字母用） |
| 主色 | 白 #F4F7FB、青藍 #2EC5E8、深灰 #3A4150 |
| 聲線 | 美式女聲，清晰、略慢、上揚的語氣 |

## 3. 男老師：Mr. Cosmo（科斯莫老師）

| 項目 | 設定 |
|---|---|
| 個性 | 穩重、幽默，負責解說文法與縮寫，偶爾做誇張表情逗學生；常說 "Let's find out!" |
| 年齡感 | 20 多歲後段的年輕老師 |
| 臉 | 方中帶圓的臉、濃眉、大而溫和的深棕色眼睛、開朗笑容、嘴唇輪廓清楚 |
| 頭髮 | 黑色短髮，前面微微翹起；橘色框的護目鏡推在額頭上（**不遮眼睛**） |
| 服裝 | 深藍色科幻背心夾克，胸口一個圓形橘色發光徽章（無字）；橘色袖子；深藍長褲；橘白配色的運動鞋 |
| 配件 | 右手手套，指尖發橘光（空中寫大寫字母用）；腰間掛一個小小的圓形機器人吊飾（不會動，只是造型） |
| 主色 | 深藍 #1F3A68、橘 #FF8A3D、白 #F4F7FB |
| 聲線 | 美式男聲，沉穩、清晰、略慢 |

> 名字可改。Nova、Cosmo 都是兩個音節、五年級學生好唸，和科幻主題相關。

---

## 4. 建模策略（建議，請老師確認）

規格卡已定「**每個主要姿勢各建一個 Tripo 模型**」。為了讓 10 多個模型的臉和服裝一致，建議這樣做：

1. **先用 gpt-image-2 畫「定裝圖」**：每位老師一張正面全身、T 字或自然站姿、白底的設定圖，給你核准。（約 2–4 張，生成前報價。）
2. **Tripo 用「圖片轉 3D」（Image to 3D）**，以核准的定裝圖為輸入，而不是只用文字。純文字轉 3D 每次的臉都會不一樣，10 多個姿勢會像不同人。
3. **每個姿勢**：先用 gpt-image-2 以定裝圖為參考，畫出該姿勢的全身圖（同一個人、同一套衣服），再丟 Tripo 圖片轉 3D。
4. **渲染**：下載 GLB 模型，用程式（three.js＋Playwright，本機免費）固定燈光與鏡頭渲染成透明背景 PNG，保證所有姿勢光線一致。
5. **嘴形與眨眼**：用該姿勢的渲染圖，以 gpt-image-2 局部編輯成 6–8 種嘴形與閉眼版本，程式切換。

下面第 5 節是**文字轉 3D**提示詞（用來先試 Tripo 效果、或沒有定裝圖時使用）；第 6 節是**定裝圖**提示詞（gpt-image-2）。

---

## 5. Tripo 文字轉 3D 提示詞（英文，貼進 Tripo Text to 3D）

### Ms. Nova — base model
```
A full-body 3D character of a friendly young female English teacher in a playful sci-fi style, stylized Pixar-like proportions (about 5 heads tall), standing in a relaxed A-pose facing the camera. Round soft face, big bright dark-brown eyes, light freckles, warm smile with clearly defined coral lips, face fully visible. Shoulder-length black bob haircut with cyan gradient tips and a small glowing star-shaped hair clip on the right side. Short white fitted sci-fi teacher jacket with stand-up collar and glowing cyan line accents, dark grey trousers, chunky white sneakers with cyan light strips. Holographic bracelet on the left wrist, right index fingertip glowing cyan. Clean smooth materials, bright cheerful colors, no text, no logos, no helmet, no mask.
```

### Mr. Cosmo — base model
```
A full-body 3D character of a cheerful young male English teacher in a playful sci-fi style, stylized Pixar-like proportions (about 5 heads tall), standing in a relaxed A-pose facing the camera. Rounded square face, thick eyebrows, big kind dark-brown eyes, bright open smile with clearly defined lips, face fully visible. Short black hair slightly spiked at the front, orange-framed goggles pushed up on the forehead (not covering the eyes). Navy blue sci-fi vest jacket with orange sleeves and a round glowing orange badge on the chest with no text, navy trousers, orange and white sneakers. Right hand wears a glove with a glowing orange fingertip, a small round robot charm hanging at the belt. Clean smooth materials, bright cheerful colors, no text, no logos, no helmet, no mask.
```

### 共用負面提示（Tripo 若有 negative prompt 欄位才填）
```
helmet, mask, visor covering eyes, text, letters, logo, realistic photo skin, creepy, horror, extra fingers, distorted face, armor, weapon
```

---

## 6. 定裝圖提示詞（gpt-image-2，用來做 Tripo 圖片轉 3D 的輸入）

### Ms. Nova — character sheet
```
Character design reference for 3D modeling: a friendly young female English teacher in a playful sci-fi style, stylized 3D animated-film look, about 5 heads tall. Full body, front view, standing in a relaxed A-pose, arms slightly away from the body, plain pure white background, even soft studio lighting, no shadows on the background. Round soft face, big bright dark-brown eyes, light freckles, warm closed-mouth smile, clearly defined coral lips. Shoulder-length black bob with cyan gradient tips, small glowing star hair clip on the right. Short white fitted sci-fi jacket with stand-up collar and glowing cyan lines, dark grey trousers, chunky white sneakers with cyan light strips, holographic bracelet on left wrist, right index fingertip glowing cyan. No text, no logos, no helmet, no mask, whole body visible including feet.
```

### Mr. Cosmo — character sheet
```
Character design reference for 3D modeling: a cheerful young male English teacher in a playful sci-fi style, stylized 3D animated-film look, about 5 heads tall. Full body, front view, standing in a relaxed A-pose, arms slightly away from the body, plain pure white background, even soft studio lighting, no shadows on the background. Rounded square face, thick eyebrows, big kind dark-brown eyes, friendly closed-mouth smile, clearly defined lips. Short black hair slightly spiked at the front, orange-framed goggles pushed up on the forehead not covering the eyes. Navy sci-fi vest jacket with orange sleeves, round glowing orange chest badge with no text, navy trousers, orange and white sneakers, right glove with glowing orange fingertip, small round robot charm at the belt. No text, no logos, no helmet, no mask, whole body visible including feet.
```

---

## 7. 主要姿勢清單（每位老師各 10 個，對應教學用途）

| # | 姿勢 | 教學用途 | Nova | Cosmo |
|---|---|---|---|---|
| P01 | 正面自然站姿（基礎） | 講解、對嘴主畫面 | ✔ | ✔ |
| P02 | 揮手打招呼 | 開場、結尾 Bye | ✔ | ✔ |
| P03 | 側身用發光指尖指向畫面右側 | 指單字、字母卡 | ✔ | ✔ |
| P04 | 側身指向畫面左側 | 兩側都有板子時 | ✔ | ✔ |
| P05 | 雙手攤開說明 | 解釋規則（大寫、縮寫） | ✔ | ✔ |
| P06 | 手托下巴思考 | "What day is it?" 提問 | ✔ | ✔ |
| P07 | 豎大拇指稱讚 | "Great job!" | ✔ | ✔ |
| P08 | 手放耳邊聆聽 | "Say it with me!" 等學生跟讀 | ✔ | ✔ |
| P09 | 舉起發光指尖在空中寫字 | 寫大寫字母、縮寫的點 | ✔ | ✔ |
| P10 | 驚喜雙手張開 | 揭曉答案、語境轉場 | ✔ | ✔ |

- 共 20 個 Tripo 模型（2 人 × 10）。姿勢可以刪減；最少建議保留 P01、P03、P05、P07、P08、P09。
- 每個姿勢渲染正面與 3/4 側面兩個角度，表情與嘴形用編輯圖做，不另建模型。

---

## 8. 下一步（每步都先給老師看）

1. 老師確認角色設定（名字、外觀、顏色、姿勢清單）。
2. 我到 Tripo 查剩餘點數與每個模型的消耗，連同 gpt-image-2 定裝圖費用一起報價。
3. 你同意後：先做 **Ms. Nova 的定裝圖 → Tripo P01 模型 → 渲染試看**（規格卡的「1 位老師 1 場景試片」），通過再做其他姿勢和 Mr. Cosmo。
