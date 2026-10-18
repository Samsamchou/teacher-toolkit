# Suno 兒童英語歌提示詞 / Suno prompt template

來源：教師原有提示詞的修改版（`deliverables/16-Suno提示詞模板-兒童英語歌.md`），已用於《Every Day Is Fun》（`deliverables/17-Suno歌曲-Days-of-the-Week.md`，Suno 生成後做成 2D 動畫並驗收）。

## 使用流程
1. 向教師要：語言、主題、曲風、人聲、速度、歌長、**一定要逐字出現的句子**、要填的空格。
2. 把下方模板的 `{ }` 填好，產出「A. 歌詞」與「STYLE:」一段英文。
3. 交出前自查：指定句全部在歌詞中（用腳本逐句比對）、歌詞與 Style 沒有中文字、Style ≤ 1,000 字元（建議 ≤ 700–850）、Chorus 記憶點句重複 ≥ 2 次、固定項目（星期、學科…）都唱齊。
4. 指定句有文法問題（例：`chat with AI robot` 少冠詞）→ 照原句保留並另外提出，教師同意後才改。
5. 存成 `deliverables/NN-Suno歌曲-<主題>.md`；教師要 Word 時參考 `assets/build_suno_docx.cjs`（從 .md 讀三個程式碼區塊，每行一段落、灰底方塊，方便複製貼上）。用電腦上的 Word（COM）匯出 PDF 再用 pymupdf 轉圖檢查版面。

## 教師定案偏好（Every Day Is Fun）
- 曲風：流行 K-pop（kids dance-pop），**人聲定案為偏成人偶像團 K-pop group vocals、男女聲輪唱**（不是兒童合唱）。
- **速度中等、語速不要快**：約 104 BPM，Style 寫 relaxed mid-tempo、slow and relaxed vocal delivery、unhurried English diction、build to full energy without rushing。
- 排除風格欄：`fast rap, rushed vocals, double-time, speed-up, children's choir, heavy metal, dark, sad ballad, auto-tune distortion`。
- K-pop 加 8 小節 [Dance Break]（重複 Intro 口號）；實際 Suno 可能把它唱很多次（Every Day Is Fun 唱了 7 句），做動畫時以實唱為準。
- Suno 不保證遵守 BPM、段落長度與逐字歌詞；生成後一定要量（見 2D 動畫階段 2）。

## 模板本文（整段給 AI）
```
你是一位熟悉 Suno 的兒童英語詞曲創作者。請根據【用戶輸入】生成兩個輸出：
A. 歌詞（可直接貼進 Suno Lyrics）與 B. Style Prompt（可直接貼進 Suno Style）。
不要解釋、不要額外文字。

【用戶輸入】
語言：{English}
曲風：{kids pop}
主題：{例如 days of the week / school subjects for kids in Taiwan}
人聲偏好：{例如 kids singers；可加 girl voice and boy voice}
速度：{例如 100–120 BPM；沒填就由你依曲風決定並寫進 Style}
歌長：{例如 約 2.5–3 分鐘；歌詞 25–35 行}
一定要原樣出現在歌詞中的句子（逐字保留，不要改寫；若發現文法問題，另列在輸出之外，不要自行更改）：
{句子 1}
{句子 2}
…
需要你填入的空格：{例如 "Let's ______."，請填入適合台灣國小學生英文程度、生活化的活動，如 go to the park / visit Grandma}

【寫作規則】
1. 方括弧 [] = 舞台指示：
   - 段落結構：[Intro] [Verse] [Pre-Chorus] [Chorus] [Bridge] [Final Chorus] [Outro]
   - 演唱與編排：[Male voice] [Female voice] [Girl voice and boy voice] [Spoken-sung] [Call and response] [Low energy, sparse] [High energy, full arrangement]
   - 可單獨一行，也可穿插在段落內切換人聲或唱法。
2. 圓括弧 () = 可唱的插語或旁白，一律用「語言」欄指定的語言（英文歌就用英文，例如 (yeah!) (oh-oh-oh) (beep-boop!)），不要出現中文。
3. 適合台灣國小 3–6 年級：句子短、一句一個重點、每句約 8 個字以內、押韻簡單、單字取自課本常見字；不要髒話與不當內容。
4. 至少包含 [Verse]、[Chorus]、[Outro]，其餘段落自行決定。
5. Chorus 必須有一句會重複的記憶點句（同一句出現 2 次以上，Final Chorus 也要出現）。
6. 主題若是一組固定項目（例如星期、學科、國家、交通工具），要在歌詞中至少完整唱過一次，沒有被指定句子涵蓋的項目請自行補上。
7. 歌詞總長不要超過 Suno 歌詞欄上限（約 3,000 字元；實際以介面為準）。

【輸出 A：歌詞】
- 內容符合主題，語言符合語言欄，風格符合曲風。

【輸出 B：Style Prompt】
- 只用英文寫「一段」完整描述（不要條列），總長 ≤ 1,000 字元（實務上建議 ≤ 700）。
- 必須包含：tempo／BPM 與律動、主要樂器與音色、氛圍、主唱表現（年齡、性別、輪唱或合唱）、製作質感與結尾方式。
- 與曲風、主題一致，並呼應歌詞方括弧提示的唱法與能量。

【輸出格式】
先輸出 A（歌詞全文）
空一行
STYLE:
再輸出 B（一段英文）
```

## 範例：Every Day Is Fun 的 Style（定案版）
```
Catchy K-pop dance-pop at a relaxed mid-tempo of around 104 BPM in a steady 4/4 groove, major key, with sparkling synth hooks, a smooth electronic drum groove with finger snaps and handclaps, a warm bouncy synth bass, bright pluck and bell leads, and a spacious chant-style drop for the dance break, all glossy, polished, and school-friendly; performed by a young adult K-pop idol group of male and female vocalists trading lines in the call-and-response verses, laid-back spoken-sung rhythmic lines in the school verses, tight group chants and stacked harmonies in the choruses that build to full energy without rushing, a soft whispery bridge, slow and relaxed vocal delivery, very clear and unhurried English diction for young learners, a super catchy sing-along hook, and a clean, modern K-pop production with a crisp ending.
```
