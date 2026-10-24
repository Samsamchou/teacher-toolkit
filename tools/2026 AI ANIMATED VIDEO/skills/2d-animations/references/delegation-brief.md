# 交辦子代理範本 / Sub-agent brief template

故事場景（有特定人物、地點、道具的段落）適合交給子代理平行製作；副歌、群舞、開場、結尾自己寫（共用編舞，風格要一致）。一次交 2 個場景給一位子代理。

交辦時用 Agent 工具、背景執行，內容照下面的骨架填（括號處換成實際值）：

```
You are helping build a 2D coded song animation (Canvas 2D, rendered by Playwright to MP4) for a Taiwanese elementary English teacher. Project folder: `<…\output\<song>\2d-v1\>`. Song: `..\sources\<song>.mp3` (<秒數> s, <BPM>). Code comments in Traditional Chinese + English like the existing files. The teacher's top requirement: EVERY lyric line must visibly correspond to an action or picture, landing on the sung word.

FIRST read, fully: the approved storyboard `..\planning\01-分鏡表-每句歌詞對應動作.md` (your rows are <S..>; note the teacher's decisions at the top), the teacher-approved pilot scenes `scenes/<pilot1>.js` and `scenes/<pilot2>.js` (match their style, structure, comment density and header table exactly), and the engine: engine/engine.js, engine/cast.js, engine/group.js, engine/edif.js, engine/chorus.js, engine/song-data.js, engine/player.html, engine/render.py.

YOUR SCENES:
1. `scenes/<name>.js` — songStart <x>, dur <y>. Lines #<a>–#<b>: <歌詞與分鏡要求、誰對嘴>.
2. ...

RULES:
- `const SCENE = { dur, songStart, tag, draw(c, t) }`, t = LOCAL seconds. Print per-word times from song-data.js first; keep them in a const table (prefix S<n>), speaker windows in SING<n>.
- Lip-sync: `python -I lipsync/song_lipsync.py <scene> --start <songStart> --dur <dur> --adlibs`. Apply mouthAt/roundAt only to the character singing the line.
- Use grpPop() (E.back(0) is ~2e-16 > 0 and makes things appear early).
- DO NOT edit engine/, lipsync/, planning, or other scenes. Prefix helpers s<nn>…; never redeclare engine names.
- No cuts inside a scene. Keep y 930–1018 (lyrics) and the top-left tag clear. Characters must not be hidden.
- Verify: `python -I render.py <scene> --still <t>` at EVERY sung keyword, READ the PNGs, fix, iterate; save contact sheets to qa/.
- Motion check: read `G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI ANIMATED VIDEO\skills\2d-animations\references\character-motion-checklist.md`. For every line with a clear body action (jump, throw, wave, clap, turn, sit, point…), render stills at anticipation → start → peak/contact → settle → hold and check items 6–12 (anticipation, squash & stretch with constant volume, follow-through of hair/clothes, slow in/out spacing, arcs, key teaching pose held ≥ 8–10 frames). Report pass/fix per line; write "not checked" for anything you did not look at.
- Final: `python -I render.py <scene>` (silent) and confirm `ffmpeg -v error -i file -f null -` decodes.
- No git commits, no paid APIs, no files outside 2d-v1/scenes, renders, qa.

REPORT BACK: file paths, keyword → local time → action table, who lip-syncs which line, render/decode results, known weaknesses.
```

收到回報後：
1. 自己讀子代理的抽格總表與動作關鍵格條（不要只看文字報告），依角色動作檢查表複查。
2. 檢查畫面上有無上一首歌的殘留（人名、國旗、地名），註解裡有也要改掉。
3. 用 `render_all.py render <scenes>` 補渲染聽力版，再串接。
