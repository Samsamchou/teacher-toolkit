---
name: "growkaz-cutout-tales"
description: "Make narrated 2D cutout/puppet-style story scenes (flat vector adult characters, layered dusk sets, slow camera push-ins, pop-in name tags, stamps, star ratings, speech bubbles) rendered to MP4 for Grow With Kaz."
---

# GrowKaz Cutout Tales

## 共用踩坑規則（老師 2026-11-20 指定：所有動畫影片與動畫程式）
- **有動作的畫面先上網查真實姿勢**（老師 11/21）：運動、樂器、工具等動作，開工前搜尋教學資料、把檢查點寫進規格卡，照檢查點做，先給關鍵姿勢檢查圖；側身的運動不用正面人偶硬演，球要飛向目標。
- 完整清單（15 類、174 條，11/20 擴充 9–11 月全部動畫專案）：`G:\我的雲端硬碟\teacher-toolkit\tools\動畫共用踩坑規則.md`。**開工前讀和這支片有關的類別；踩到新坑當天補進那份檔案（現象 → 原因 → 規則＋出處），再把這段短版同步到 15 份影片 skill。**
- 動作鏡頭（11/21 動詞片）：KIE 720p 是重新生成，拍好要重新抽格量事件秒數；要出現的東西寫「全程在畫面裡」、鏡頭寫 LOCKED-OFF；字卡放在動作不經過的角落；畫面上移補底邊用素色不拉長；子代理等第一段通過才分、不准花錢、各用自己的 ledger。
- 動作先查真實做法再擺：拿東西、握筆、樂器、騎車、球類先查、寫成表（哪隻手／手心朝向／拇指位置／接觸點／怎麼到嘴）；左右手是鏡像（Mixamo `PALM_SIGN` 右 −1、左 +1）；動詞照字面演；每個效果要有起因（碰到才動、接觸成立才算完成），接觸用數字驗（手到物 ≤2 cm、輪胎 ±1 cm、2D 0–1 px）。
- 人物不浮、不陷、不背對：量真實地面（3D `ground_z`；2D 新背景先疊格線量地面）；坐姿大腿蓋住椅墊、小腿在椅面前垂下（椅面＝膝高 − 大腿厚度）；說話時身體不上下彈（只留約 3 px 呼吸；What if 系列例外，問的人說話時輕彈）；手和道具不擋臉；車頭朝前進方向、騎乘用坐姿；鏡頭在主角右前方 3/4。
- 檢查圖先交：第一批固定有手部特寫（兩角度、不開景深）與腿部鏡頭；3D 鏡頭先交特寫檢查圖、2D 每段先出 4×4 總表；動作的開始／中間／結束都抽格，原尺寸放大看手和頭頸。
- 對嘴依畫風：AI／點陣角色不用程式畫嘴（生同角度張嘴圖、只貼回嘴部小塊）；全向量剪紙可程式嘴；精準對嘴用 wav2vec2 強制對齊（edge-tts 逐字時間早約 0.16 秒）；說話句用中景；歌曲片對嘴原曲、不另配 TTS。
- 配音：顯示文字和送 TTS 的文字分開（`TTS_FIX`），台詞不放「／」和音標；發音教學只用老師錄音或 Wikimedia；edge-tts 60 秒逾時＋重試 10 次；已變速的音檔不再變速；whisper 只抓時間，字幕照劇本，念錯與否給老師聽。
- 生圖：Codex CLI prompt 走 stdin（`codex exec ... -s workspace-write -i ref.png - < prompt.txt`），先輸出到 C 槽再複製，同時最多 3 張；圖上不放字（字、國旗、月曆用程式疊或 Commons SVG）；付費 API 先報價、老師同意上限。
- AI 短片：H3 照明只寫正向描述、要避免的東西連字都不寫；Seedance／KIE 只寫身體動作與空手、另列不准出現的東西、鏡頭固定；多出的片長用剪的不重生；KIE 先 480p 試 1 鏡，錯誤碼看 body 的 `code`。
- Blender：用座標改模型前 `view_layer.update()`；材質色是線性色彩；`transform_apply(location=False, rotation=False, scale=True)`；拼接物件合成單一網格（Freestyle 才不閃）；Tripo 家具黏住就換程式家具；Tripo 抓檔先 `--mark` 再按 Export、用三角面數核對；>15 萬面先 predecimate＋`use_persistent_data`；燈光換場景重調。
- Colab：Blender 只在 Colab；exec 只跑立刻返回的指令、渲染用分離執行、每 50 秒短 exec 保持連線、一鏡一批、渲完立刻下載；先建資料夾再上傳、上傳前 `ast.parse`；給老師看之前先停機；開機前報預估、做完報實際；不手改 `colab_usage.log`。
- 合成：不用 `-shortest`（先接無聲畫面再配完整音軌＋`apad`）；ffmpeg 9.0.1 不用 `-loop 1`、不用 `drawtext`、加 `-nostdin`；舊 .ogg 用 soundfile 解碼；配樂說話時比人聲低 18 dB、無配音段 1/4、整片 −16 LUFS（有閃避的混音不用 loudnorm）；前一句字幕早 0.2 秒結束；重點物件不放畫面下方 1/4。
- 交件：分鏡 → 試片 → 全片，每關等老師；改版只重做改到的段落、先交段落預覽、定案資料夾不動；聽力版只拿掉卡拉 OK 字幕；只交 1080p＋720p（720p 維持原畫質，不為 30 MB 壓縮）；自己先抽格，把可能被抓的地方先說出來，附用量與未驗證項目。
- 檔案：大量 PNG／影格／建置放 C 槽暫存，不放 G 槽；用腳本改字串先 `assert count == 1`、改完 `ast.parse`；不用 heredoc 寫程式；反斜線路徑會被吃成 tab 或響鈴字元，寫完讀回檢查。

A Grow With Kaz video style: "What if you were born as…" storybook explainers in flat-vector **cutout / puppet animation**. Characters are layered rigs that barely move, and the camera and overlays carry the energy. Everything is drawn in code (Python + pycairo) and piped to ffmpeg, so it renders locally with no assets.

Use it when the user asks for a GrowKaz cutout scene, a "born as" style story, a western, crime or historical life story in this look, or to recreate the 20-second Silas scene.

## Bundled files (use these instead of writing from scratch)
- `scripts/engine.py`: the core kit. Drawing helpers, the parametric character rig (`CAST`, `POSES`, `EXPR`, `character()`), modern sets (apartment, office, street, dinner, stage, rooftop), western accessories (stetson, bandana, holster, sheriff star), icons and every overlay (tag, stamp, bubble, caption, card, counter, bigword, arrow_label).
- `scripts/scene.py`: the original 20s Silas western scene, plus the western buildings, mountains and silhouette horse rider.
- `scripts/align.py`: `python3 align.py script.txt part1.mp3 [part2.mp3 ...]` makes `timing.json` (sentence start and end times found from pauses in the audio). Use it when Whisper is unavailable.
- `scripts/sfx.py`: builds `sfx.wav` automatically by scanning a shot list for overlay events (pop, thud, whoosh, typing ticks, dings, coins, boom) and adds a quiet room tone.
- `examples/money_explainer.py`: a full narrated explainer (two voiceover parts, about 45 shots), with a `Shot` class driven by `timing.json`, `C()` character placement, gestures, talking mouths and `speech()` bubbles. Run `TIMING=timing.json python3 money_explainer.py 1 qc|full`.
- `examples/dustwater_western.py`: a 30s multi-character western with sound effects built in. Run `python3 dustwater_western.py qc|full`.
- Requirements: `pip install pycairo numpy pillow` and ffmpeg. Default font is **Comic Relief** Bold (teacher rule 2026-11-10, confirmed 11-20 for this skill too: all on-screen English uses Comic Relief; font file `C:\Users\User\AppData\Local\Microsoft\Windows\Fonts\ComicRelief-Bold.ttf`).

Pipeline for a narrated video: align the voiceover → write a shot list modeled on `money_explainer.py` → QC contact sheet → full render → `sfx.py` → mix (SFX at about 0.45 under the voice; music 18 dB under the voice while someone speaks and 1/4 in parts with no voice; whole film at −16 LUFS: measure loudness, apply one gain to the whole film, then `alimiter=level=false`. Do not run dynamic `loudnorm` on a ducked mix. Teacher decision 2026-11-20.)

## Rules
- **Original characters only.** Never draw a game, film or TV character (no Arthur Morgan, CJ and so on). Invent a character with the same archetype (drifter cowboy, street kid, gang boss) and an original name.
- Default output: 1920x1080, 30fps, H.264 CRF 18 `-preset veryfast`, yuv420p. For 9:16, set W=1080, H=1920 and re-frame the character at about 60% height.
- Always render QC stills (a 2x2 contact sheet) and look at them before the full render. Fix overlaps and off-screen elements, then render.

## Style bible
**Characters (adults)**
- About 7 heads tall, with the head slightly oversized. Mitten hands (circles).
- Outline is dark brown `(0.17,0.11,0.09)` at about 3.2px, never pure black. Round joins.
- Each part is a base fill plus ONE hard-edged shadow tone, clipped to the shape on the side away from the light. No gradients and no textures on characters.
- Face: jaw curve, almond eyes with dark pupils, HEAVY brows (thick round-cap strokes, which carry the emotion), nose as a shadow wedge, a translucent stubble patch, a mustache stroke.
- Detail comes from costume construction: vest, satchel strap, belt with a gold buckle, holster, bandana, a hat as its own layer with a band.
- Every character needs a unique silhouette (hat shape, build, signature color).
- Kids are optional chibi versions: big round head, dot eyes, tiny body.

**Rig layers (draw order):** legs and boots → back arm (shoulder, elbow) → torso shirt → vest panels → strap and belt and holster → neck and bandana → head (ears, face, stubble, nose, eyes, brows, mouth, hair) → hat → front arm. Arms are two segments: `rotate(a1)` at the shoulder, then translate by the upper-arm length and `rotate(a2)` at the elbow. Poses are dicts of angles keyframed with smoothstep.

**Idle motion (always on):** breathing via torso scale `1 + sin(t*2.1)*0.012`, head bob of about 1.6px, a slow head sway of about 0.025 rad, blinks of 0.14s every 3–4s, and a short glance with a brow raise when an overlay appears. Gestures (hat tip, point, wave) take 0.45s to ease in, hold, then 0.45s to ease out.

**Sets:** a sky gradient (3 stops), a sun or moon with a big radial bloom, soft clouds made from circle clusters, 2 mountain ridges, a midground set (false-front western buildings with lit yellow windows, porches and signs), a gradient ground with grass tufts, and a prop or two (barrel, crate).
Mood palettes:
- Dusk: `#3d2a5c → #c4566a → #f6a65a`, mountains `#7d4a72` / `#a65a6a`.
- Night: navy `#141a3a → #2b3566`, a moon, yellow windows, campfire glow.
- Day: `#7fb6e6 → #cfe6f5`, white clouds, green or tan ground.
- Interior: warm browns with a lamp bloom.
Always add drifting dust particles (about 90, alpha pulsing) and a vignette (radial, 0.55–0.7).

**Camera:** every shot has a slow push-in (zoom 1.0→1.13 with smoothstep across the shot) plus a slight drift. Parallax: wrap each layer in `layer(depth, fn)`, which scales by `1+(z-1)*depth` around a focus point and offsets x by `t*6*depth`. Use depth 0.05 for stars, 0.1 for sun, 0.15 for clouds, 0.25 and 0.4 for mountains, 0.6 for town, 0.85 for ground, 1.0 for the character.

**Overlays (the explainer layer):** all pop in with back-out easing (`c=2.2`, about 0.28s), slightly rotated (±0.03–0.08 rad), with a soft drop shadow, in Comic Relief Bold.
- **Name tag:** a white rounded rect, a 4px outline, a bold 38px title and a grey 20px subtitle ("SILAS / the drifter"). Place it beside the character, not on the face.
- **Stamp:** red double-border box on a cream fill ("BOUNTY $2,500", "SAVED", "ROBBED").
- **Stat rating:** white label plus 5 gold stars that pop in one by one 0.12s apart ("GRIT RATING").
- **Speech bubble:** a white pill with a tail pointing at the mouth and typewriter text over 1s. It shrinks out at the end.
- **Year or age tag:** "1899", "ABOUT 14".
- Also available: hand-drawn arrows with labels, chalkboards, parchment notes, maps, polaroids, a viewer comment box.
- Make sure overlays never overlap each other or the character's head; check this in QC.

**Transitions:** 0.4s fade through black between shots, a 0.5s fade-in at the start and 0.6s fade-out at the end. Silhouette shots (a near-black `(0.08,0.05,0.1)` figure against a giant sun) work for dramatic beats and endings.

## Core helpers (implement these first)
```python
def ease(t): t=clamp(t); return t*t*(3-2*t)
def back_out(t): t=clamp(t); c=2.2; return 1+(c+1)*(t-1)**3+c*(t-1)**2
# scale guard: cairo errors on scale 0 -> c.scale(max(s,0.001), max(s,0.001))
def shade(c, path_fn, shadow_fn, base, dark):
    path_fn(); c.set_source_rgba(*base); c.fill_preserve()
    c.save(); c.clip(); shadow_fn(); c.set_source_rgba(*dark); c.fill(); c.restore()
    path_fn(); c.set_source_rgb(*LINE); c.set_line_width(3.2); c.stroke()
```
Colors are RGBA tuples from a `hexc()` helper. Always use `set_source_rgba(*col)` for them (`set_source_rgb` with 4 values throws).

Frame loop: build a `cairo.ImageSurface(FORMAT_RGB24, W, H)` per frame and write `surf.get_data()` to an ffmpeg stdin pipe using `-f rawvideo -pix_fmt bgra -s WxH -r 30 -i -`. Add a stills mode (`python3 scene.py x 3 8 12.5 17`) that writes PNGs for QC. A 20s 1080p render takes about 50s.

## Workflow
1. **Intake:** get the character concept, setting, length (default 20s), aspect ratio, and any narration script or voiceover file. If a voiceover is given, transcribe it for timestamps and cut the shots to the sentences.
2. **Shot list:** 3–8s per shot. For each shot write the set, mood palette, character pose and gesture, overlays with their pop times, and the transition. Classic arc: epic silhouette open → name tag intro → stat or stamp jokes → speech bubble line → silhouette ride-off.
3. **Build** `scene.py` in the working directory from the style bible and helpers above: palette, `character(c,t,blink,pose)`, set functions, overlay functions, `pose_at(t)`, one `shotN(c,t)` per shot, and `frame(i)` with fades.
4. **QC:** render 4 stills into a 2x2 contact sheet, view it, and fix scale, placement and overlaps.
5. **Render** the MP4. If there's a voiceover or music, mux it with `ffmpeg -i video.mp4 -i audio.m4a -c:v copy -af apad -t <frames/fps> -c:a aac` (never `-shortest`: it drops 1–3 frames), with music ducked 18 dB under the voice and the whole film at −16 LUFS (teacher decision 2026-11-20).
6. **Deliver** with SendUserFile and a one-line caption (resolution, fps, length, audio or no audio).

## Reference scene: "Silas" (20s)
- **0–15s, dusk western town.** Hotel, Saloon, Bank and General buildings. Silas is centered at scale 1.45 with his feet at y=1045. He keeps hands on hips (back arm 0.38/-1.25, front arm -0.38/1.25).
  - 1.2s: name tag "SILAS / the drifter" at (560,380).
  - 4.0s: stamp "BOUNTY $2,500" at (1430,300), with a glance and brow raise from 3.8 to 5.6s.
  - 5.3s: "GRIT RATING" and 5 stars at (1500,160).
  - 7.2–9.3s: hat tip (front arm to -2.5/0.55, hat rotates -0.13, smile).
  - 10.6–14.4s: speech bubble "This town ain't big enough." at (560,150), with stern brows.
- **15–20s:** silhouette rider on a walking horse (sine-driven legs, body bob) crossing in front of a giant setting sun, with fence posts scrolling past, a "1899" tag, and a fade-out.