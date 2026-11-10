# Segment brief (shared by every scene agent)

Project: `G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI ANIMATED VIDEO\output\free-time-guess\`
A Taiwanese elementary-school English teacher's "watch the animation, guess the sentence" videos.
Each segment: icon-style silhouette animation acts out a free-time phrase (~10–11 s), then the
shared engine shows a 3-second countdown, then fills `I ________ in my free time.` with the answer.
Two segments are finished and approved by the teacher — READ THEM FIRST, they are the quality bar
and the code pattern to copy:
- `engine/seg_baseball.js` (Q1 play baseball)
- `engine/seg_camping.js` (Q10 go camping)  ← best template (walk/kneel/sit/IK hand targets, props, night)
- Shared engine `engine/core.js` (read it; DO NOT edit it), `engine/player.html` (already loads your file; DO NOT edit),
  `engine/render.py` (DO NOT edit).

## Your job
Write ONLY `engine/seg_<id>.js`, defining `SEGMENTS.<id> = (() => { ... return { act, answer, draw }; })();`
- `act`: seconds of action (10 or 11). Total video = act + 6.
- `answer`: array like `[{ w: 'watch', verb: true }, { w: 'TV' }]` (verb gold, other words red — engine handles it).
- `draw(ctx, t)`: draw the scene at time t (t runs to act+6; after `act` keep the final state calm and readable,
  small idle motion OK). Each frame must depend only on t (deterministic; use FT.rng for randomness).
- Clip/draw in scene coordinates 0..1920 × 0..905 (`FT.SCENE_H`). Copy camping's pattern:
  `ctx.save(); ctx.beginPath(); ctx.rect(0,0,1920,FT.SCENE_H); ctx.clip(); ...camera zoom... ctx.restore();`
  The engine shifts the scene up 70 px, so scene y < ~120 is cut off at the top — keep important things below y≈130.
  During the countdown a circle covers screen-center top (scene x 800–1120, y 150–470): nothing essential there at the end.

## Look (style G, teacher-approved — match baseball/camping exactly)
- Flat vector, Kurzgesagt-like: night/dusk purple-blue palette (FT.C colors), soft glows (FT.glow), no outlines, no gradients
  except sky/ground like the examples, no textures.
- People: single-colour SILHOUETTES drawn with `FT.figure(pose, S, 'hero'|'npc', extras)` (S≈1.55 like the examples,
  or bigger with a camera zoom like camping). Hero = light lavender-white; extra people 'npc' purple. Add small
  shape accessories via `extras.head/front/behind` (caps, headphones, helmet…) like the examples.
- Props: refined flat shapes with 2–3 tones (wood, teal, mustard, purple-grey). Make them detailed enough to be
  instantly recognisable (the teacher asked for 精緻 — refined, not crude).
- ONE red accent only (#e8433a = FT.C.red): reserved for the key object/effect if any (baseball trail, campfire).
  Avoid red elsewhere. Gold FT.C.gold for highlights is fine.
- NO text, letters or numbers inside the scene EXCEPT where the phrase itself needs it (e.g. "ABC" in an English book).
  NO brand logos (no Facebook, YouTube, Nike…). Fonts are handled by the engine (Comic Relief); if you ever need
  text in-scene use `"700 40px 'Comic Relief'"`.

## Motion logic (teacher is strict — this is the most important part)
- The story must follow real-life order and cause→effect (e.g. pick up remote → sit → press button → TV turns on).
- Hands must actually touch what they operate (use IK hand targets `h1x/h1y`, `h2x/h2y`, see camping `withHands`).
  Tools/objects point at their target. Hands never cover the face. Arms grow from shoulders.
- Sitting: bottom on the seat, lower legs hang down from the seat front (use FT.SIT pattern); never cover legs with the seat.
- Walking uses FT.walk with phase from distance travelled (no foot sliding); facing left = FT.mirror(pose).
- People never pass through other people or furniture; vehicles face their direction of travel; on a bicycle the rider sits on the
  saddle and both feet are on the pedals, pedals rotate with the crank, wheels spin.
- Ease every move (FT.E / FT.prog), small anticipation & settle. ~10–11 s of action, readable at classroom distance.

## Check your work (required) — don't stop at the first draft
Render stills: `cd engine && python render.py <id> --still 1 2 3 ... --out ../qa/<id>` (≈16 times spread over 0..act+6),
then build a contact sheet with PIL (see how the examples were checked: 4×4 grid of 480×270) and LOOK at it with the Read tool.
Also open 2–3 full-size frames at key moments. Fix anything illogical or ugly, re-render, repeat until it would pass a picky
teacher (compare side by side with `qa/Q01*`/`qa/camp/` frames for style consistency). Check the browser console errors that
render.py prints. Do NOT render the full video or run ffmpeg encodes — the lead does that.

## Report back (short)
File written, act length, answer array, the beat-by-beat timeline (time → action), anything you were unsure about.
Write in English or Traditional Chinese.
