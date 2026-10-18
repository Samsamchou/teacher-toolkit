# How Do You Go — Suno 歌曲提示詞 / Suno Song Prompt

日期 Date：2026-10-18　狀態 Status：**提示詞已撰寫，尚未在 Suno 實測生成。** Prompt written; not yet generated in Suno.

## 依據與誠實限制 / Sources and limits

| 項目 | 來源 | 可信度 |
|---|---|---|
| 歌詞 52 行 | `output/how-do-you-go/data/lyrics-authoritative.json`（教師歌詞檔，已正式採用；括號 `(Hey!)` 是群喊） | 正式 |
| 段落標籤與演唱描述 18 行 | `data/stage-directions.json`（從歌詞檔分離出的舞台指示：[Intro]、[Female lead, clear and playful]…） | 正式 |
| 速度約 136 BPM | `data/music-candidates.json`（librosa 拍點分析，385 個拍點，全曲 172.12 秒） | **候選值，未獨立驗證**；README 另記先前 Suno 提示用 128 BPM，與實測不符 |
| 段落秒數 | 現行正式動畫的字幕與逐字時碼（`2d-v1/engine/song-data.js`） | 由成品測得，可當「長度目標」 |
| 曲風、人聲音色、編曲細節 | 依上列舞台指示與兒童英語教學用途**推論**撰寫 | 推論，需試聽調整 |

- Suno 的提示詞字數上限、可用標籤與模型版本會變動；貼上前請看介面的字數提示。下方「曲風欄」控制在約 600 字元內。
- Suno 不保證遵守 BPM、段落長度與逐字歌詞；生成後請用本專案流程重新量測（`analyze_audio.py`），不要把提示詞寫的 136 BPM 當成成品事實。
- 這份提示詞是為了**重新生成一首同風格的歌**。現有正式動畫使用的是原本那首 MP3（`sources/How Do You Go.mp3`），換歌就必須重做逐字時碼與動畫對嘴（`lipsync/song_words.py`）。

---

## 1. 曲風欄 / Style of Music（貼到 Suno「Style」）

**完整版（建議，約 560 字元）**

```
Upbeat K-pop style kids English-learning song, 136 BPM, 4/4, major key (C or D major), bright sparkling synths, punchy electronic drums with handclaps, bouncy bass, catchy sing-along hook. Clear friendly young female lead vocal with playful energy, a young male lead for call-and-response, large group chants and layered gang vocals in the choruses. Very clear English diction, simple melody, each lyric line fits two bars, rhythmic sing-talk in the bridge. Clean, polished, cheerful, school-friendly, high energy, no profanity.
```

**精簡版（字數不夠時）**

```
Upbeat K-pop kids song, 136 BPM, bright synths, handclaps, bouncy bass, clear young female lead, male call-and-response, group chants, simple catchy hook, very clear English diction
```

## 2. 排除風格 / Exclude Styles（若介面有此欄）

```
heavy metal, dubstep, rap with explicit words, sad, slow ballad, dark, auto-tune distortion, spoken word only, screaming, long guitar solo
```

## 3. 建議設定 / Suggested settings

- Vocal Gender：先選 Female（主唱），男聲部分靠歌詞標籤引導；若男聲出不來，改試 Mixed 或分次生成。
- Weirdness 偏低（約 25–40%）、Style Influence 偏高（約 65–80%）：目的是貼近兒歌、少偏離。
- 一次生成多首版本，挑「發音最清楚、副歌最好記」的；兒童英語教學以咬字清楚優先於編曲華麗。
- 若 Suno 提示歌詞過長被截斷：分段生成（Intro＋Verse＋Chorus 先做），再用 Extend 接續。

## 4. 段落結構與長度目標 / Section map（136 BPM：1 小節 ≈ 1.76 秒，8 小節 ≈ 14.1 秒）

| 段落 | 目標秒數 | 約小節數 | 說明（取自 stage-directions） |
|---|---|---|---|
| Intro | 0–14.8（≈ 15 s） | 8 | Bright synths, rhythmic vocals；前 8 秒有人聲，後面為短前奏 |
| Verse 1 | 14.8–37.1（≈ 22 s） | 12 | Female lead, clear and playful |
| Chorus 1 | 37.1–52.4（≈ 15 s） | 8 | High energy, full arrangement, group vocals；歌詞後有約 3 秒間奏 |
| Verse 2 | 52.4–69.7（≈ 17 s） | 10 | Call and response, female and male leads |
| Chorus 2 | 69.7–84.1（≈ 14 s） | 8 | High energy, group vocals；歌詞後有約 2.4 秒間奏 |
| Bridge | 84.1–105.4（≈ 21 s） | 12 | Clear rhythmic sing-talk, call and response |
| Dance Break | 105.4–126.9（≈ 21 s） | 12 | 前半口號（Car, bus, metro, train!），後半 Eight bars, sparkling synth hook, light group chants |
| Final Chorus | 126.9–148.6（≈ 22 s） | 12 | Full arrangement, layered harmonies |
| Outro | 148.6–172.1（≈ 23 s） | 13 | Gentle vocals, clean ending；歌詞唱完後約 13 秒乾淨收尾 |

全曲目標：**約 172 秒（2 分 52 秒）**。

## 5. 歌詞欄 / Lyrics（貼到 Suno「Lyrics」）

說明：方括號是 Suno 的結構／演唱標籤；括號 `( )` 內是群喊或和聲，保留。`—` 以連字號處理為停頓。撇號改為直撇號以免編碼問題；歌詞字句與正式歌詞檔相同。Dance Break 後半的 `Friends, let's go` 與 `Ah`／`Ooh` 是原曲舞蹈段實際出現的群唱（原歌詞檔沒有這幾行，來源為 `data/asr-focused-candidates.json`），可保留或刪除。

```
[Intro]
[Bright synths, rhythmic vocals]
Where are you from? (Hey!)
How do you go? (Let's go!)
Friends around the world,
Come and sing along!

[Verse 1]
[Female lead, clear and playful]
I'm from Taiwan. I go to school by car.
Here is my school! Here we are!
She's from Singapore. She goes to school by metro.
Ready for school? Ready, let's go!
He's from Japan. He goes to school on foot.
Step, step, step! The day feels good!

[Chorus]
[High energy, full arrangement, group vocals]
Here we go, here we go!
Tell me, tell me, how do you go?
By car, by bus, by train,
Sing it, sing it once again!
Here we go, here we go!
Off to school - let's go!

[Verse 2]
[Call and response, female and male leads]
Where are you from?
I'm from Korea.
Hello, hello!
It's nice to see you!
How do you go to school?
I go to school by bus.
The bus is here! I wave goodbye.
Let's go to school! (You and I!)

[Chorus]
[High energy, group vocals]
Here we go, here we go!
Friends around the world say hello!
By metro or on foot,
Learning with my friends feels good!
Here we go, here we go!
Off to school - let's go!

[Bridge]
[Clear rhythmic sing-talk, call and response]
Where is Alan from? He is from the UK.
How does he go to school? He goes to school by train.
She's Wendy. She's from the USA.
Does she go to school by metro?
No, she doesn't. She goes there by scooter.
With her mom, she rides to school.
Helmet on! That's really cool!

[Dance Break]
[Chant, handclaps, kids shouting]
Car, bus, metro, train! (Hey!)
On foot, scooter - say it again!
Car, bus, metro, train! (Hey!)
Let's go, let's go!
[Instrumental, eight bars, sparkling synth hook]
[Light group chants]
Friends, let's go!
Ah, ah, ah, ah, ah, ah, ah, ah!
Ooh, ooh, ooh, ooh, ooh, ooh, ooh!

[Final Chorus]
[Full arrangement, layered harmonies]
Friends around the world say hello!
Taiwan, Singapore, Japan,
Korea - come and clap your hands!
The UK, the USA,
Friends at school - hip, hip, hooray!
Here we go, here we go!
Tell me, tell me, how do you go?
Off to school - let's go!

[Outro]
[Gentle vocals, clean ending]
Different places, friends at school.
Learning together is so cool!
See you at school! (Hello!)
[Instrumental fade]
[End]
```

## 6. 生成後檢查 / After generation

1. 逐行聽歌詞是否與上方一致（尤其國名 Taiwan／Singapore／Japan／Korea、UK／USA、Alan、Wendy 的咬字）；錯字行只重生該段（Replace section）。
2. 量 BPM 與長度，目標約 136 BPM、約 172 秒；若差距大，動畫逐字時碼必須重做，不可沿用現行 `song-data.js`。
3. 兒童適用檢查：沒有髒話、沒有不當內容、咬字清楚、速度不要快到學生跟不上。
4. 使用權：確認 Suno 方案與商用／課堂使用條款，並依學校規定標示 AI 生成音樂。
5. 存檔：新 MP3 放 `sources/`，在 `qa/` 記錄生成日期、使用的提示詞版本與雜湊；仍須由教師試聽驗收。
